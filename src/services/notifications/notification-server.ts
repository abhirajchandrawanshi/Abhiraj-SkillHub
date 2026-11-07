import { createServerFn } from "@tanstack/react-start";
import { getAdminFirestore } from "@/services/database/admin-firestore";
import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────
const DAILY_PROMO_LIMIT = 70;      // Max promotional emails per day
const DAILY_TRANSACTIONAL_RESERVE = 30; // Reserved for transactional emails
const DAILY_TOTAL_LIMIT = 100;     // Brevo free plan daily limit
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // UTC+5:30

// ─── Firebase Admin ───────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns current date string in IST as YYYY-MM-DD */
function getTodayIST(): string {
  const now = new Date(Date.now() + IST_OFFSET_MS);
  return now.toISOString().slice(0, 10);
}

/** Brevo send — reused from brevo.ts pattern, self-contained here for server isolation */
async function sendBrevoEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env["BREVO_API_KEY"]?.trim();
  if (!apiKey) return { success: false, error: "BREVO_API_KEY not configured" };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        sender: { name: "Abhiraj Academy", email: "abhirajvermen1@gmail.com" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, error: `Brevo error ${response.status}: ${JSON.stringify(err)}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/** Build the course announcement email HTML */
function buildCourseAnnouncementEmail(course: {
  title: string;
  description?: string;
  thumbnail?: string;
  price: number;
}): { subject: string; html: string } {
  const websiteUrl = process.env["WEBSITE_URL"]?.trim() || "https://abhiajacademy.com";
  const subject = `🚀 New Course Available — ${course.title}`;

  const thumbnailHtml = course.thumbnail
    ? `<img src="${course.thumbnail}" alt="${course.title}" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:20px;" />`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
  <style>
    body{margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;line-height:1.6;color:#333}
    .wrap{max-width:600px;margin:0 auto;padding:24px 16px}
    .card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:32px 28px;text-align:center;color:#fff}
    .header h1{margin:0 0 6px;font-size:26px;font-weight:800}
    .header p{margin:0;font-size:14px;opacity:.85}
    .body{padding:28px}
    .cta{display:inline-block;margin:20px 0;padding:14px 32px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px}
    .price{font-size:22px;font-weight:800;color:#d97706;margin:12px 0}
    .footer{text-align:center;font-size:12px;color:#9ca3af;padding:16px 28px;border-top:1px solid #f3f4f6}
    .unsubscribe{color:#9ca3af;font-size:11px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <h1>🚀 New Course Available!</h1>
        <p>AbhiAcademy — New Learning Content</p>
      </div>
      <div class="body">
        ${thumbnailHtml}
        <p style="margin-top:0">Hey there!</p>
        <p>We've just added new learning content to <strong>AbhiAcademy</strong> that might be helpful for your learning journey.</p>
        <p>Check out the latest course and see if it matches your goals.</p>
        <h2 style="margin:16px 0 4px;font-size:20px;color:#1f2937">${course.title}</h2>
        ${course.description ? `<p style="color:#6b7280;font-size:14px;margin:4px 0 12px">${course.description}</p>` : ""}
        <div class="price">₹${course.price}</div>
        <a href="${websiteUrl}" class="cta">Explore New Course →</a>
        <p style="margin-top:24px;font-size:14px;color:#6b7280">
          We don't want to bother you with unnecessary emails. If you prefer not to receive these updates,
          you can turn off course notifications anytime from the <strong>Profile</strong> section of our website.
        </p>
        <p style="font-size:14px">Happy Learning! 🎓<br><strong>Team AbhiAcademy</strong></p>
      </div>
      <div class="footer">
        <p>© 2026 AbhiAcademy by Abhiraj Chandrawanshi. All rights reserved.</p>
        <p class="unsubscribe">
          You received this because you opted into new course alerts.<br>
          <a href="${websiteUrl}/profile" style="color:#9ca3af">Manage notification preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Daily Quota Manager ──────────────────────────────────────────────────────

/**
 * Get remaining promotional email budget for today (IST).
 * Uses a Firestore document keyed by date for cross-instance consistency.
 */
async function getPromoEmailsRemaining(db: FirebaseFirestore.Firestore): Promise<number> {
  const today = getTodayIST();
  const ref = db.collection("emailDailyUsage").doc(today);
  const snap = await ref.get();
  const data = snap.data() || { promotionalSentCount: 0, transactionalSentCount: 0 };
  const promoUsed = (data["promotionalSentCount"] as number) || 0;
  return Math.max(0, DAILY_PROMO_LIMIT - promoUsed);
}

/**
 * Atomically increment the promotional sent counter for today.
 * Returns false if the limit would be exceeded.
 */
async function claimPromoQuota(
  db: FirebaseFirestore.Firestore,
  count: number,
): Promise<boolean> {
  const today = getTodayIST();
  const ref = db.collection("emailDailyUsage").doc(today);

  let claimed = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || { promotionalSentCount: 0, transactionalSentCount: 0 };
    const promoUsed = (data["promotionalSentCount"] as number) || 0;
    if (promoUsed + count > DAILY_PROMO_LIMIT) {
      claimed = false;
      return;
    }
    tx.set(
      ref,
      {
        date: today,
        promotionalSentCount: promoUsed + count,
        transactionalSentCount: (data["transactionalSentCount"] as number) || 0,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    claimed = true;
  });
  return claimed;
}

/**
 * Increment the transactional sent counter (used by payment confirmation emails etc.)
 */
export async function recordTransactionalEmailSend(count = 1): Promise<void> {
  const db = await getAdminFirestore();
  const { FieldValue } = await import("firebase-admin/firestore");
  const today = getTodayIST();
  const ref = db.collection("emailDailyUsage").doc(today);
  await ref.set(
    {
      date: today,
      transactionalSentCount: FieldValue.increment(count),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

// ─── Campaign & Queue Management ──────────────────────────────────────────────

/**
 * Called when a new PAID course is published.
 * Creates a campaign and enqueues all opted-in subscribers.
 * Idempotent: no-op if campaign for this courseId already exists.
 */
export const createNotificationCampaign = createServerFn({ method: "POST" })
  .validator(z.object({ courseId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = await getAdminFirestore();

    // ── Idempotency: one campaign per course ──────────────────────────────────
    const existingSnap = await db
      .collection("notificationCampaigns")
      .where("courseId", "==", data.courseId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      console.log(`[NotifQueue] Campaign already exists for course ${data.courseId}`);
      const existingDoc = existingSnap.docs[0]!;
      return { success: true, campaignId: existingDoc.id, alreadyExists: true };
    }

    // ── Fetch course details ──────────────────────────────────────────────────
    const courseSnap = await db.collection("courses").doc(data.courseId).get();
    if (!courseSnap.exists) {
      return { success: false, error: "Course not found" };
    }
    const course = courseSnap.data() as any;

    // Only queue campaigns for paid, published courses
    if (course["status"] !== "published") {
      return { success: false, error: "Course is not published" };
    }
    if (course["isFree"] === true || (course["price"] ?? 0) === 0) {
      return { success: false, error: "Skipped: free course" };
    }

    // ── Fetch all opted-in subscribers ───────────────────────────────────────
    const profilesSnap = await db
      .collection("userProfiles")
      .where("notificationsEnabled", "==", true)
      .get();

    const recipients = profilesSnap.docs
      .map((d) => ({ uid: d.id, email: d.data()["email"] as string | undefined }))
      .filter((r) => !!r.email);

    // ── Create campaign document ──────────────────────────────────────────────
    const campaignRef = db.collection("notificationCampaigns").doc();
    const now = new Date().toISOString();
    await campaignRef.set({
      courseId: data.courseId,
      courseTitle: course.title || "",
      status: "pending",
      createdAt: now,
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
    });

    // ── Batch-write queue entries (Firestore batch max = 500) ─────────────────
    const BATCH_SIZE = 400;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      for (const r of chunk) {
        // Idempotent ID: campaignId_userId prevents duplicate queue entries
        const queueRef = db
          .collection("notificationQueue")
          .doc(`${campaignRef.id}_${r.uid}`);
        batch.set(queueRef, {
          campaignId: campaignRef.id,
          courseId: data.courseId,
          userId: r.uid,
          userEmail: r.email,
          status: "pending",
          createdAt: now,
          scheduledDate: getTodayIST(),
          sentAt: null,
          retryCount: 0,
          lastError: null,
        });
      }
      await batch.commit();
    }

    console.log(
      `[NotifQueue] Campaign ${campaignRef.id} created with ${recipients.length} recipients for course "${course.title}"`,
    );
    return { success: true, campaignId: campaignRef.id, recipientCount: recipients.length };
  });

// ─── Queue Processor ─────────────────────────────────────────────────────────

/**
 * Process the notification queue: sends up to 70 promotional emails today.
 * Safe to call multiple times (idempotent per recipient).
 * Call this from an admin action or external cron endpoint.
 */
export const processNotificationQueue = createServerFn({ method: "POST" })
  .validator(z.object({ dryRun: z.boolean().optional() }).optional())
  .handler(async ({ data }) => {
    const isDryRun = data?.dryRun === true;
    const db = await getAdminFirestore();

    const remaining = await getPromoEmailsRemaining(db);
    if (remaining <= 0) {
      return {
        success: true,
        message: `Daily promotional quota (${DAILY_PROMO_LIMIT}) exhausted for ${getTodayIST()}. Resuming tomorrow.`,
        sent: 0,
        remaining: 0,
      };
    }

    const limit = Math.min(remaining, 70);

    // Fetch pending queue items
    const pendingSnap = await db
      .collection("notificationQueue")
      .where("status", "==", "pending")
      .limit(limit)
      .get();

    if (pendingSnap.empty) {
      return { success: true, message: "No pending notifications.", sent: 0, remaining };
    }

    if (isDryRun) {
      return {
        success: true,
        message: `[DRY RUN] Would send ${pendingSnap.size} emails.`,
        sent: 0,
        remaining,
        wouldProcess: pendingSnap.size,
      };
    }

    // Pre-fetch courses for this batch (group by courseId)
    const courseIds = [...new Set(pendingSnap.docs.map((d) => d.data()["courseId"] as string))];
    const courseCache: Record<string, any> = {};
    await Promise.all(
      courseIds.map(async (cid) => {
        const snap = await db.collection("courses").doc(cid).get();
        if (snap.exists) courseCache[cid] = snap.data();
      }),
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const campaignCounters: Record<string, { sent: number; failed: number; skipped: number }> = {};

    for (const qDoc of pendingSnap.docs) {
      const q = qDoc.data();
      const campaignId = q["campaignId"] as string;
      if (!campaignCounters[campaignId]) {
        campaignCounters[campaignId] = { sent: 0, failed: 0, skipped: 0 };
      }

      // ── Re-check user preference before sending ───────────────────────────
      const profileSnap = await db.collection("userProfiles").doc(q["userId"]).get();
      const profile = profileSnap.data();
      if (!profile || profile["notificationsEnabled"] !== true) {
        // User opted out since campaign was created — skip silently
        await qDoc.ref.update({ status: "skipped", processedAt: new Date().toISOString() });
        campaignCounters[campaignId].skipped++;
        skipped++;
        continue;
      }

      const course = courseCache[q["courseId"] as string];
      if (!course) {
        await qDoc.ref.update({
          status: "failed",
          lastError: "Course not found in cache",
          retryCount: (q["retryCount"] || 0) + 1,
        });
        campaignCounters[campaignId].failed++;
        failed++;
        continue;
      }

      // Mark as processing (prevents double-send if worker restarts mid-batch)
      await qDoc.ref.update({ status: "processing" });

      // ── Claim quota before sending ────────────────────────────────────────
      const claimed = await claimPromoQuota(db, 1);
      if (!claimed) {
        // Quota hit mid-batch — revert status and stop
        await qDoc.ref.update({ status: "pending" });
        break;
      }

      const { subject, html } = buildCourseAnnouncementEmail(course);
      const result = await sendBrevoEmail(q["userEmail"] as string, subject, html);

      if (result.success) {
        await qDoc.ref.update({ status: "sent", sentAt: new Date().toISOString() });
        campaignCounters[campaignId].sent++;
        sent++;
      } else {
        const retryCount = ((q["retryCount"] as number) || 0) + 1;
        // After 3 retries mark as permanently failed
        await qDoc.ref.update({
          status: retryCount >= 3 ? "failed" : "pending",
          lastError: result.error,
          retryCount,
        });
        // Also release the claimed quota since it didn't actually send
        await db.runTransaction(async (tx) => {
          const today = getTodayIST();
          const usageRef = db.collection("emailDailyUsage").doc(today);
          const snap = await tx.get(usageRef);
          const current = (snap.data()?.["promotionalSentCount"] as number) || 0;
          tx.set(usageRef, { promotionalSentCount: Math.max(0, current - 1) }, { merge: true });
        });
        campaignCounters[campaignId].failed++;
        failed++;
      }
    }

    // ── Update campaign aggregate counters ────────────────────────────────────
    const { FieldValue } = await import("firebase-admin/firestore");
    for (const [cid, counts] of Object.entries(campaignCounters)) {
      const campaignRef = db.collection("notificationCampaigns").doc(cid);
      await campaignRef.update({
        sentCount: FieldValue.increment(counts.sent),
        failedCount: FieldValue.increment(counts.failed),
        skippedCount: FieldValue.increment(counts.skipped),
        updatedAt: new Date().toISOString(),
      });

      // Mark campaign complete if nothing pending remains
      const stillPending = await db
        .collection("notificationQueue")
        .where("campaignId", "==", cid)
        .where("status", "==", "pending")
        .limit(1)
        .get();
      if (stillPending.empty) {
        await campaignRef.update({ status: "completed" });
      } else {
        await campaignRef.update({ status: "processing" });
      }
    }

    const newRemaining = await getPromoEmailsRemaining(db);
    return {
      success: true,
      sent,
      failed,
      skipped,
      remaining: newRemaining,
      message: `Processed: ${sent} sent, ${failed} failed, ${skipped} skipped. Remaining today: ${newRemaining}.`,
    };
  });

// ─── Campaign Stats (for Admin Dashboard) ────────────────────────────────────

export const getCampaignStats = createServerFn({ method: "GET" }).handler(async () => {
  const db = await getAdminFirestore();
  const today = getTodayIST();

  // Recent campaigns (last 10)
  const campaignsSnap = await db
    .collection("notificationCampaigns")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Today's usage
  const usageSnap = await db.collection("emailDailyUsage").doc(today).get();
  const usage = usageSnap.data() || {
    promotionalSentCount: 0,
    transactionalSentCount: 0,
  };

  // Pending queue size
  const pendingSnap = await db
    .collection("notificationQueue")
    .where("status", "==", "pending")
    .get();

  return {
    campaigns,
    todayUsage: {
      date: today,
      promotionalSent: (usage["promotionalSentCount"] as number) || 0,
      transactionalSent: (usage["transactionalSentCount"] as number) || 0,
      promotionalRemaining: Math.max(
        0,
        DAILY_PROMO_LIMIT - ((usage["promotionalSentCount"] as number) || 0),
      ),
      dailyLimit: DAILY_TOTAL_LIMIT,
      promoLimit: DAILY_PROMO_LIMIT,
    },
    pendingQueueSize: pendingSnap.size,
  };
});

// ─── Ensure User Profile Exists (called on sign-up / first login) ─────────────

/**
 * Creates a default user profile with notificationsEnabled=true if it doesn't exist.
 * NEVER overwrites an existing profile's notification preference.
 */
export const ensureUserProfileExists = createServerFn({ method: "POST" })
  .validator(z.object({ uid: z.string().min(1), email: z.string().email() }))
  .handler(async ({ data }) => {
    const db = await getAdminFirestore();
    const ref = db.collection("userProfiles").doc(data.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      // New user — set defaults with notifications enabled
      await ref.set({
        uid: data.uid,
        email: data.email,
        notificationsEnabled: true, // Default: opt-in
        createdAt: new Date().toISOString(),
      });
      console.log(`[UserProfile] Created default profile for ${data.email} (notifications=true)`);
      return { created: true };
    }

    // Existing user: only update email if changed, never touch notificationsEnabled
    const existing = snap.data()!;
    if (existing["email"] !== data.email) {
      await ref.update({ email: data.email });
    }
    return { created: false };
  });
