import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";



// Initialize Firebase Admin SDK for server-side Firestore access
function getAdminFirestore() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error("Firebase Admin credentials not configured");
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  });

  const db = getFirestore(app);
  try { db.settings({ preferRest: true }); } catch (e) {}
  return db;
}

// Server-side course fetch using Admin SDK
async function getCourseByIdServer(courseId: string) {
  const db = getAdminFirestore();
  const docRef = db.collection("courses").doc(courseId);
  const snap = await docRef.get();

  if (!snap.exists) {
    return null;
  }

  return {
    id: snap.id,
    ...snap.data(),
  } as any;
}

const emailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  html: z.string(),
});

function getBrevoApiKey() {
  const apiKey = process.env['BREVO_API_KEY']?.trim();
  if (!apiKey) {
    console.error("BREVO_API_KEY environment variable is not set or empty.");
    console.error("Please add BREVO_API_KEY to your .env file or Vercel environment variables.");
    return null;
  }
  return apiKey;
}

function getWebsiteUrl() {
  const websiteUrl = process.env['WEBSITE_URL']?.trim() || "http://localhost:5174";
  return websiteUrl;
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    console.error("Email sending FAILED - BREVO_API_KEY not configured in environment variables");
    return { 
      success: false, 
      error: "BREVO_API_KEY not configured. Please add BREVO_API_KEY to your .env file or Vercel environment variables." 
    };
  }

  try {
    console.log("Attempting to send email to:", to, "with subject:", subject);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "Abhiraj Courses",
          email: "abhirajvermen1@gmail.com",
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", JSON.stringify(result, null, 2));
      console.error("Response status:", response.status, response.statusText);
      
      // Specific error handling for 401 Unauthorized
      if (response.status === 401) {
        return { 
          success: false, 
          error: "Brevo API key is invalid or expired. Please generate a new API key in Brevo dashboard (Account → SMTP & API → API Keys) and update BREVO_API_KEY in your environment variables." 
        };
      }
      
      return { success: false, error: `Brevo API error: ${JSON.stringify(result)}` };
    }

    console.log("Email sent successfully via Brevo:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred while sending email",
    };
  }
}



function createCourseSection(course: any, websiteUrl: string) {
  let resourceUrl = course.accessInfo;
  if (resourceUrl && resourceUrl.startsWith('/')) {
    resourceUrl = `${websiteUrl}${resourceUrl}`;
  }
  const isResourceLink = resourceUrl && (resourceUrl.startsWith('http') || resourceUrl.startsWith('/'));

  return `
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 8px 0;color:#1f2937;font-size:16px;">📚 ${course.title}</h3>
      ${course.description ? `<p style="margin:0 0 12px 0;color:#6b7280;font-size:14px;">${course.description}</p>` : ''}
      ${course.pdfPath 
        ? `<p style="margin:0 0 8px 0;font-size:14px;">✅ Includes a PDF resource — <a href="${websiteUrl}" style="color:#667eea;">log in to access it</a></p>` 
        : ''}
      ${isResourceLink 
        ? `<a href="${resourceUrl}" style="display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;font-size:14px;margin-top:8px;">Access Resource →</a>` 
        : (course.accessInfo ? `<p style="margin:8px 0 0 0;font-size:14px;"><strong>Access Info:</strong> ${course.accessInfo}</p>` : '')}
    </div>
  `;
}

function createMultiCourseEmailTemplate(userEmail: string, userName: string, courses: any[]) {
  const websiteUrl = getWebsiteUrl();
  const isSingle = courses.length === 1;
  const subject = isSingle
    ? `🎉 Your ${courses[0].title} - Access Granted!`
    : `🎉 Your ${courses.length} Courses - Access Granted!`;

  const courseSections = courses.map((c) => createCourseSection(c, websiteUrl)).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Course Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>${isSingle ? `Your ${courses[0].title} is now unlocked` : `Your ${courses.length} courses are now unlocked`}</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your purchase! ${isSingle ? 'Your course has' : 'All your courses have'} been successfully unlocked.</p>
          
          <h2 style="margin-bottom:16px;">Your Purchased Courses:</h2>
          ${courseSections}
          
          <p style="margin-top:24px;">You can access all your courses by logging into your account:</p>
          <a href="${websiteUrl}" style="display:inline-block;padding:15px 30px;background:#667eea;color:white;text-decoration:none;border-radius:5px;margin:16px 0;">Go to Website</a>
          
          <p style="color:#6b7280;font-size:14px;">Email on file: ${userEmail}</p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Happy learning! 🚀</p>
          
          <div class="footer">
            <p>© 2026 Abhiraj Courses. All rights reserved.</p>
            <p>This is an automated email, please do not reply.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

// Legacy single-course template (kept for backward compat)
function createDynamicCourseEmailTemplate(userEmail: string, userName: string, course: any) {
  return createMultiCourseEmailTemplate(userEmail, userName, [course]);
}

export const sendResourceEmail = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    name: z.string(),
    // Accept either a single courseId (legacy) or an array of courseIds
    courseId: z.string().optional(),
    courseIds: z.array(z.string()).optional(),
  }))
  .handler(async ({ data }) => {
    const ids: string[] = data.courseIds?.length
      ? data.courseIds
      : data.courseId
        ? [data.courseId]
        : [];

    console.log("Preparing to send resource email via Brevo:", { email: data.email, courseIds: ids });
    
    if (ids.length === 0) {
      return { success: false, error: "No course IDs provided" };
    }

    try {
      // Fetch all courses in parallel
      const courseResults = await Promise.all(ids.map((id) => getCourseByIdServer(id)));
      const courses = courseResults.filter(Boolean);

      if (courses.length === 0) {
        console.error("No courses found for IDs:", ids);
        return { success: false, error: "Course(s) not found" };
      }

      const emailTemplate = createMultiCourseEmailTemplate(data.email, data.name, courses);
      const result = await sendEmail(data.email, emailTemplate.subject, emailTemplate.html);
      return result;
    } catch (error) {
      console.error("Error sending resource email:", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
    }
  });
