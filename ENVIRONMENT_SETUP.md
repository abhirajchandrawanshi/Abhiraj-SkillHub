# Environment Variables Setup Guide

## Required Environment Variables

You need to configure the following environment variables for the payment and email system to work properly:

### Razorpay Configuration
```
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

**How to get Razorpay credentials:**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to Settings → API Keys
3. Copy your Key ID and Key Secret
4. Add them to your `.env` file

### Brevo Email Service Configuration
```
BREVO_API_KEY=your_brevo_api_key
WEBSITE_URL=http://localhost:3001
```

**How to get Brevo API Key:**
1. Go to [Brevo Dashboard](https://app.brevo.com/)
2. Navigate to Account → SMTP & API → API Keys
3. Generate a new API key
4. Add it to your `.env` file

### Firebase Configuration (Already configured)
```
VITE_FIREBASE_API_KEY=AIzaSyDRLJ0tG53wXaw2W_vishRaVHtx1nKwa1g
VITE_FIREBASE_AUTH_DOMAIN=abhiraj-skillsup.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=abhiraj-skillsup
VITE_FIREBASE_STORAGE_BUCKET=abhiraj-skillsup.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=233652816491
VITE_FIREBASE_APP_ID=1:233652816491:web:ab512d17ab13b49dcd3f2e
```

## Setup Instructions

1. **Create `.env` file** in the project root (if it doesn't exist)
2. **Copy the template** from `.env.example`
3. **Fill in your actual credentials** for Razorpay and Brevo
4. **Restart the development server** after making changes

## Testing the Setup

After configuring the environment variables:

1. **Test Razorpay:** Try making a test payment (₹1 testing course)
2. **Test Email:** Check if resource emails are sent after successful payment
3. **Test Access:** Verify that course access is granted properly

## Common Issues

### Payment Fails
- Check that `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are correct
- Ensure your Razorpay account is in test mode for development
- Check browser console for specific error messages

### Email Not Sending
- Verify `BREVO_API_KEY` is valid and not expired
- Check that the sender email `abhirajvermen1@gmail.com` is verified in Brevo
- Look at server logs for Brevo API errors

### Access Not Granted
- Check Firestore security rules are properly deployed
- Verify Firebase authentication is working
- Check browser console for permission errors

## Deployment

For production deployment (Vercel, etc.), add these environment variables in your deployment platform's settings:
- Razorpay production keys (not test keys)
- Brevo production API key
- Production website URL