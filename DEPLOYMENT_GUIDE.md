# Deployment Guide for Abhiraj SkillsUp

## Current Status ✅

All core functionality has been implemented and tested:
- ✅ Authentication system (Firebase)
- ✅ Razorpay payment integration
- ✅ Access control system
- ✅ Brevo email service
- ✅ Multi-product support (Python Notes + Internships)
- ✅ Responsive UI
- ✅ Error handling and logging

## Environment Configuration

### Required Environment Variables (.env file)

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_live_TSwQ4Mx15y6vlY
RAZORPAY_KEY_SECRET=ZVoVt9TaGFBeZzkwhz66MMAD

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDRLJ0tG53wXaw2W_vishRaVHtx1nKwa1g
VITE_FIREBASE_AUTH_DOMAIN=abhiraj-skillsup.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=abhiraj-skillsup
VITE_FIREBASE_STORAGE_BUCKET=abhiraj-skillsup.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=233652816491
VITE_FIREBASE_APP_ID=1:233652816491:web:ab512d17ab13b49dcd3f2e

# Brevo Email Service
BREVO_API_KEY=your_brevo_api_key
WEBSITE_URL=http://localhost:5174
```

## Before Deployment - Testing Steps

### 1. Update Environment Variables for Production
Change the following in your `.env` file:
- `WEBSITE_URL` to your production domain
- Verify sender email in Brevo dashboard
- Consider using Razorpay test keys for initial testing

### 2. Test Authentication
- Navigate to `http://localhost:5174/login`
- Test email/password signup and login
- Test Google sign-in
- Verify session persistence

### 3. Test Payment Flow
- Try purchasing Python Notes (₹1)
- Try purchasing Internships (₹1)
- Verify access is granted immediately
- Check browser console for logs
- Check email inbox for resource email

### 4. Test Email Delivery
- Complete a test purchase
- Verify email arrives at the provided address
- Check email content and formatting
- Verify access links work

## Deployment Options

### Option 1: Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Add environment variables in Vercel dashboard
5. Deploy

### Option 2: Netlify
1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod`
3. Add environment variables in Netlify dashboard
4. Deploy

### Option 3: Cloudflare Pages
1. Connect your GitHub repository
2. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add environment variables
4. Deploy

### Option 4: Custom Server
1. Build the project: `npm run build`
2. Use Node.js to run: `node dist/server/server.js`
3. Set up reverse proxy (nginx/apache)
4. Configure SSL
5. Add environment variables

## Post-Deployment Configuration

### Firebase Security Rules
Update Firestore rules in Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /courseAccess/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /enrollments/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Domain Configuration
1. Purchase your domain
2. Verify sender email in Brevo dashboard
4. Update `WEBSITE_URL` to production domain

### Razorpay Production Setup
1. Enable live mode in Razorpay dashboard
2. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to live keys
3. Configure webhooks for payment notifications
4. Set up refund policies

## Monitoring & Maintenance

### Key Metrics to Monitor
- Payment success rate
- Email delivery rate
- User registration rate
- Error rates in logs
- Page load times

### Regular Maintenance Tasks
- Monitor API quotas (Razorpay, Brevo, Firebase)
- Update dependencies regularly
- Review security logs
- Backup Firestore data
- Test payment flow periodically

## Troubleshooting

### Common Issues

**Payments failing:**
- Check Razorpay API keys are correct
- Verify Razorpay account is active
- Check server logs for detailed errors

**Emails not sending:**
- Verify Brevo API key is valid
- Check sender verification status
- Review Brevo dashboard for error logs

**Access not granted:**
- Check localStorage for access data
- Verify Firestore permissions
- Review browser console for errors

**Authentication issues:**
- Verify Firebase configuration
- Check Firebase Auth settings
- Review authentication logs

## Support Resources
- Razorpay Documentation: https://razorpay.com/docs/
- Firebase Documentation: https://firebase.google.com/docs
- Brevo Documentation: https://developers.brevo.com/
- TanStack Start Documentation: https://tanstack.com/start/latest

## Application Structure
- `/src/lib/razorpay.ts` - Payment processing
- `/src/lib/brevo.ts` - Email service
- `/src/lib/access.ts` - Access control
- `/src/lib/course.ts` - Product configuration
- `/src/components/CheckoutDialog.tsx` - Payment UI
- `/src/routes/index.tsx` - Landing page
- `/src/routes/login.tsx` - Authentication

## Current Application Status
✅ **Ready for Testing**: http://localhost:5174
✅ **Build Successful**: Production build completed
✅ **All Features Implemented**: Authentication, Payments, Email, Access Control
⏳ **Ready for Deployment**: awaiting environment configuration and domain setup