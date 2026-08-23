import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { COURSE_ID, COURSE_PRICE_INR, COURSE_TITLE } from "@/lib/course";

const RAZORPAY_API = "https://api.razorpay.com/v1";

const customerSchema = z.object({
  courseId: z.literal(COURSE_ID),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
});

const paymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
};

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return { keyId, keySecret };
}

function basicAuthHeader(keyId: string, keySecret: string) {
  const raw = `${keyId}:${keySecret}`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw).toString("base64")
      : btoa(raw);
  return `Basic ${encoded}`;
}

async function razorpayFetch(path: string, init: RequestInit) {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    const description =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "description" in payload.error
        ? String((payload.error as { description?: unknown }).description)
        : `Razorpay request failed (${response.status}).`;
    throw new Error(description);
  }

  return payload;
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .validator(customerSchema)
  .handler(async ({ data }) => {
    const { keyId } = getRazorpayCredentials();
    const amountPaise = COURSE_PRICE_INR * 100;

    const order = (await razorpayFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `course_${Date.now()}`.slice(0, 40),
        notes: {
          courseId: data.courseId,
          courseTitle: COURSE_TITLE,
          customerName: data.name,
          customerEmail: data.email,
        },
      }),
    })) as RazorpayOrder;

    if (!order?.id) {
      throw new Error("Razorpay did not return an order id.");
    }

    return {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .validator(paymentSchema)
  .handler(async ({ data }) => {
    const { keySecret } = getRazorpayCredentials();
    const expectedAmountPaise = COURSE_PRICE_INR * 100;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${data.orderId}|${data.paymentId}`),
    );
    const expectedSignature = Array.from(new Uint8Array(signature), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    if (expectedSignature !== data.signature) {
      throw new Error("Razorpay payment verification failed.");
    }

    const payment = (await razorpayFetch(`/payments/${encodeURIComponent(data.paymentId)}`, {
      method: "GET",
    })) as RazorpayPayment;

    if (!payment?.id || payment.order_id !== data.orderId) {
      throw new Error("Payment does not belong to this order.");
    }

    if (payment.currency !== "INR" || payment.amount !== expectedAmountPaise) {
      throw new Error("Payment amount or currency does not match the order.");
    }

    if (!(payment.captured === true || payment.status === "authorized")) {
      throw new Error(`Payment is not successful yet (status: ${payment.status}).`);
    }

    const order = (await razorpayFetch(`/orders/${encodeURIComponent(data.orderId)}`, {
      method: "GET",
    })) as RazorpayOrder;

    if (!order?.id || order.amount !== expectedAmountPaise || order.currency !== "INR") {
      throw new Error("Order details do not match expected course price.");
    }

    return {
      verified: true as const,
      orderId: data.orderId,
      paymentId: data.paymentId,
    };
  });
