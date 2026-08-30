import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { COURSE_ID, INTERNSHIP_ID, COURSE_TITLE, INTERNSHIP_TITLE, TESTING_ID, TESTING_TITLE, OMNIROUTE_ID } from "@/lib/course";

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

function createCourseEmailTemplate(userEmail: string, userName: string) {
  const subject = `🎉 Your Python Notes - Access Granted!`;
  const websiteUrl = getWebsiteUrl();
  const pdfUrl = `${websiteUrl}/python-interview-questions.pdf`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Python Notes Access</title>
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
          <p>Your Python Notes are now unlocked</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your purchase! Your payment for <strong>Python Notes</strong> has been successfully processed.</p>
          
          <h2>📚 What You Get:</h2>
          <ul>
            <li>Complete Python Notes from basics to advanced</li>
            <li>Well-structured content for easy learning</li>
            <li>Lifetime access to all materials</li>
            <li>Downloadable PDF format</li>
          </ul>
          
          <p>You can access your Python Notes PDF directly here:</p>
          <a href="${pdfUrl}" class="button">Download Python Notes PDF</a>
          
          <p><strong>Login Details:</strong></p>
          <p>Email: ${userEmail}</p>
          
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

function createInternshipEmailTemplate(userEmail: string, userName: string) {
  const subject = `🎉 Your 100+ Paid Internships List - Access Granted!`;
  const internshipSheetUrl = "https://docs.google.com/spreadsheets/d/14YFhJa9aGHbBhCmY2cI5YtOGs3NBO1n3DT0fTVwc_DM/edit?usp=drivesdk";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Internships List Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>Your 100+ Paid Internships List is now unlocked</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your purchase! Your payment for <strong>100+ Paid Internships</strong> has been successfully processed.</p>
          
          <h2>💼 What You Get:</h2>
          <ul>
            <li>Curated list of 100+ paid internship opportunities</li>
            <li>Company details and contact information</li>
            <li>Stipend information for each position</li>
            <li>Direct application links</li>
            <li>Regular updates with new opportunities</li>
          </ul>
          
          <p>You can access the complete internships list directly here:</p>
          <a href="${internshipSheetUrl}" class="button">Access Internships List (Google Sheets)</a>
          
          <p><strong>Login Details:</strong></p>
          <p>Email: ${userEmail}</p>
          
          <p>Featured opportunities include positions at companies like Faabit Designs, Nsse Fab, DeepThought CultureTech, and many more!</p>
          
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          
          <p>Best of luck with your applications! 🚀</p>
          
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

function createTestingEmailTemplate(userEmail: string, userName: string) {
  const subject = `🧪 Testing Course Access Granted`;
  const websiteUrl = getWebsiteUrl();
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Testing Course Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧪 Testing Course Access Granted</h1>
          <p>Payment & Access Testing Course - ₹1 Test</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for testing the payment system! Your ₹1 test payment for the <strong>Payment & Access Testing Course</strong> has been successfully processed.</p>
          
          <div class="warning">
            <p><strong>⚠️ REMINDER:</strong> This is a testing course only. The ₹1 payment was for testing purposes to verify the complete payment and access flow.</p>
          </div>
          
          <h2>🧪 What Was Tested:</h2>
          <ul>
            <li>Razorpay payment integration (₹1 test payment)</li>
            <li>Server-side payment verification</li>
            <li>Firestore purchase recording</li>
            <li>Course access restoration</li>
            <li>Email delivery system</li>
            <li>Access persistence (refresh/login/logout)</li>
          </ul>
          
          <p>Your access to the testing course is now active. You can test the complete flow including:</p>
          <ul>
            <li>Page refresh access persistence</li>
            <li>Login/logout access behavior</li>
            <li>Guest vs authenticated user access</li>
          </ul>
          
          <p><strong>Login Details:</strong></p>
          <p>Email: ${userEmail}</p>
          
          <p>This test confirms that the production payment and access system is working correctly.</p>
          
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

function createOmnirouteEmailTemplate(userEmail: string, userName: string) {
  const subject = `🎉 Your OmniRoute Setup Guide - Access Granted!`;
  const driveUrl = "https://drive.google.com/file/d/1FgyD5AFVnuVEGp7XqiE3H5DlAkLEYKPB/view?usp=sharing";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>OmniRoute Setup Access</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 15px 30px; background: #0d9488; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Successful!</h1>
          <p>Your OmniRoute Setup Guide is now unlocked</p>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for your purchase! Your payment for <strong>OmniRoute Setup for Free Claude Tokens</strong> has been successfully processed.</p>
          
          <h2>🤖 What You Get:</h2>
          <ul>
            <li>Easy 4 step setup guide</li>
            <li>Get 1.5 Billion AI tokens each month completely FREE</li>
            <li>Direct access to the setup resource</li>
          </ul>
          
          <p>You can access the setup guide directly here:</p>
          <a href="${driveUrl}" class="button">Access Setup Guide (Google Drive)</a>
          
          <p><strong>Login Details:</strong></p>
          <p>Email: ${userEmail}</p>
          
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          
          <p>Happy prompting! 🚀</p>
          
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
    
    if (data.courseId === COURSE_ID) {
      emailTemplate = createCourseEmailTemplate(data.email, data.name);
    } else if (data.courseId === INTERNSHIP_ID) {
      emailTemplate = createInternshipEmailTemplate(data.email, data.name);
    } else if (data.courseId === TESTING_ID) {
      emailTemplate = createTestingEmailTemplate(data.email, data.name);
    } else if (data.courseId === OMNIROUTE_ID) {
      emailTemplate = createOmnirouteEmailTemplate(data.email, data.name);
    } else {
      console.error("Unknown courseId:", data.courseId);
      return { success: false, error: "Unknown course ID" };
    }

    const result = await sendEmail(data.email, emailTemplate.subject, emailTemplate.html);
    return result;
  });
