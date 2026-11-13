import "./lib/error-capture";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__filename = __filename;
  (globalThis as any).__dirname = __dirname;
}

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// In-memory cache for ultra-fast (1ms) thumbnail responses
const thumbnailMemoryCache = new Map<
  string,
  { buffer: Buffer; contentType: string }
>();

async function handleThumbnailRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/thumbnail/")) {
    return null;
  }

  const thumbId = url.pathname.replace("/api/thumbnail/", "").split("?")[0]?.trim();
  if (!thumbId) {
    return new Response("Thumbnail ID required", { status: 400 });
  }

  // 1. Serve from in-memory cache if available
  const cached = thumbnailMemoryCache.get(thumbId);
  if (cached) {
    return new Response(new Uint8Array(cached.buffer), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": cached.buffer.length.toString(),
      },
    });
  }

  // 2. Fetch from Firestore
  try {
    const { getAdminFirestore } = await import("./services/database/admin-firestore");
    const db = await getAdminFirestore();
    const docSnap = await db.collection("thumbnails").doc(thumbId).get();

    if (!docSnap.exists) {
      return new Response("Thumbnail not found", { status: 404 });
    }

    const docData = docSnap.data();
    const base64Str = docData?.base64;
    const contentType = docData?.contentType || "image/webp";

    if (!base64Str) {
      return new Response("Thumbnail content empty", { status: 404 });
    }

    const buffer = Buffer.from(base64Str, "base64");

    // Cache in RAM (up to 200 recent thumbnails)
    if (thumbnailMemoryCache.size > 200) {
      const firstKey = thumbnailMemoryCache.keys().next().value;
      if (firstKey) thumbnailMemoryCache.delete(firstKey);
    }
    thumbnailMemoryCache.set(thumbId, { buffer, contentType });

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[Thumbnail Endpoint] Error loading thumbnail:", err);
    return new Response("Error loading thumbnail", { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Direct high-performance thumbnail serving (zero CORS, zero external dependency)
      const thumbResponse = await handleThumbnailRequest(request);
      if (thumbResponse) {
        return thumbResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
