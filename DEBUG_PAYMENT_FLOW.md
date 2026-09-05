# Payment Flow Debugging Guide

## Current Setup Status

✅ **Environment Variables Configured:**
- Razorpay Key ID: rzp_live_TSwQ4Mx15y6vlY (PRODUCTION MODE)
- Razorpay Key Secret: ZVoVt9TaGFBeZzkwhz66MMAD
- Brevo API Key: Configured
- Firebase: Configured
- Website URL: http://localhost:5174 (⚠️ Should be http://localhost:3001)

## Important: Production vs Test Mode

You are using **PRODUCTION** Razorpay credentials (`rzp_live_`). This means:
- Real payments will be processed
- Real money will be charged
- Cannot use test mode without test credentials

## Recommended Changes

### 1. Update Website URL
Change in `.env` file:
```env
WEBSITE_URL=http://localhost:3001
```

### 2. Consider Using Test Mode for Development
For development/testing, get test credentials from Razorpay:
- Go to Razorpay Dashboard → Settings → API Keys
- Switch to Test Mode
- Use test credentials (start with `rzp_test_`)

## Common Payment Failure Causes

### 1. Website URL Mismatch
- Email templates use WEBSITE_URL for links
- Current: localhost:5174 (wrong)
- Should be: localhost:3001 (current dev server)

### 2. Production Mode in Development
- Using live credentials means real charges
- Test payments won't work in production mode
- Need test credentials for development

### 3. Firebase Security Rules
- Check if admin has proper access to courses collection
- Verify payment verification can access course data

### 4. Course Data Issues
- Dynamic courses must have proper pricing
- Course status must be "published" for payments
- Course must exist in Firestore

## Debugging Steps

### Step 1: Check Console Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Try to make a payment
4. Look for error messages

### Step 2: Check Server Logs
1. Look at terminal where dev server is running
2. Check for Razorpay credential loading
3. Look for course data fetching errors
4. Check for email sending errors

### Step 3: Test with Legacy Course First
Test payment with legacy courses first:
- Testing Course (₹1)
- Internships (₹5)
- OmniRoute (₹9)

If these work, then issue is specific to dynamic courses.

### Step 4: Check Course Data
Verify dynamic course in Firestore has:
- ✅ Proper price (number, not string)
- ✅ Status: "published"
- ✅ Valid course ID
- ✅ All required fields

## Payment Flow Verification

### Expected Flow:
1. User clicks "Buy Now" → Opens checkout dialog
2. User enters email → Clicks payment button
3. Server creates Razorpay order → Opens Razorpay checkout
4. User completes payment → Razorpay returns success
5. Server verifies payment → Grants access
6. Email sent → User receives resources

### Check Each Step:
1. **Checkout Dialog Opens:** ✅ Should work
2. **Order Creation:** Check server logs for "Creating Razorpay order"
3. **Razorpay Checkout:** Should open payment modal
4. **Payment Success:** Check for "Payment verified successfully"
5. **Access Granting:** Check for "Access granted successfully"
6. **Email Sending:** Check for "Email sent successfully via Brevo"

## Immediate Fix Needed

Update your `.env` file:
```env
WEBSITE_URL=http://localhost:3001
```

Then restart the dev server.