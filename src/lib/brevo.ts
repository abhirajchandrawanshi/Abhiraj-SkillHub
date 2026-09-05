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

  return getFirestore(app);
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



function createDynamicCourseEmailTemplate(userEmail: string, userName: string, course: any) {
  const subject = `🎉 Your ${course.title} - Access Granted!`;
  const websiteUrl = getWebsiteUrl();
  
  // Create a proper resource URL if it's a relative path (like /python-interview-questions.pdf)
  let resourceUrl = course.accessInfo;
  if (resourceUrl && resourceUrl.startsWith('/')) {
    resourceUrl = `${websiteUrl}${resourceUrl}`;
  }
  
  const isResourceLink = resourceUrl && (resourceUrl.startsWith('http') || resourceUrl.startsWith('/'));
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${course.title} Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>Your ${course.title} is now unlocked</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your purchase! Your payment for <strong>${course.title}</strong> has been successfully processed.</p>
          
          <h2>📚 Course Details:</h2>
          <ul>
            <li><strong>Course:</strong> ${course.title}</li>
          </ul>
          
          <p><strong>Description:</strong></p>
          <p>${course.description}</p>
          
          ${course.pdfPath 
            ? `<p>Your course includes a PDF resource. You can access it by logging into your account at:</p><a href="${websiteUrl}" class="button">Access Course Resource</a>` 
            : ''}
          ${isResourceLink 
            ? `<p>You can also access your external resource directly here:</p><a href="${resourceUrl}" class="button">External Resource Link</a>` 
            : (course.accessInfo ? `<p><strong>Access Information:</strong></p><p>${course.accessInfo}</p>` : '')}
          
          <p><strong>Login Details:</strong></p>
          <p>Email: ${userEmail}</p>
          
          <p>You can also access your course by logging into your account at:</p>
          <a href="${websiteUrl}" class="button">Go to Website</a>
          
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          
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

export const sendResourceEmail = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    name: z.string(),
    courseId: z.string(),
  }))
  .handler(async ({ data }) => {
    console.log("Preparing to send resource email via Brevo:", { email: data.email, courseId: data.courseId });
    
    let emailTemplate;
    
    // Handle dynamic courses - fetch course data from Firestore using Admin SDK
    try {
      console.log("Fetching dynamic course data for email:", data.courseId);
      const course = await getCourseByIdServer(data.courseId);
      if (!course) {
        console.error("Failed to fetch course data for email:", data.courseId);
        return { success: false, error: "Course not found" };
      }
      emailTemplate = createDynamicCourseEmailTemplate(data.email, data.name, course);
    } catch (error) {
      console.error("Error fetching dynamic course for email:", error);
      return { success: false, error: "Failed to fetch course data" };
    }

    const result = await sendEmail(data.email, emailTemplate.subject, emailTemplate.html);
    return result;
  });
