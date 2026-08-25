# Testing Checklist for Deployment

## Environment Configuration
- [x] Razorpay API keys configured (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
- [x] Firebase configuration set (VITE_FIREBASE_*)
- [x] Brevo API key configured (BREVO_API_KEY)
- [x] Email configuration set for testing (sender email in Brevo)
- [x] Website URL configured (WEBSITE_URL)

## Features to Test

### 1. Authentication Flow
- [ ] User can sign up with email/password
- [ ] User can log in with email/password
- [ ] User can sign in with Google
- [ ] User can sign in with phone OTP
- [ ] Password reset functionality works
- [ ] User session persists across page refreshes
- [ ] User can log out successfully

### 2. Razorpay Payment Integration
- [ ] Order creation works for Python Notes (₹1)
- [ ] Order creation works for Internships (₹1)
- [ ] Payment popup loads correctly
- [ ] Payment can be completed successfully
- [ ] Payment verification works on server
- [ ] Failed payments show appropriate error messages
- [ ] Payment status is correctly tracked

### 3. Access Control
- [ ] User gets immediate access after successful payment
- [ ] Access is stored in localStorage
- [ ] Access check works correctly
- [ ] Python Notes unlock after payment
- [ ] Internships list unlock after payment
- [ ] Access persists across page refreshes
- [ ] Firestore fallback works if permissions fail

### 4. Email Service (Brevo)
- [ ] Email is sent after successful Python Notes purchase
- [ ] Email is sent after successful Internships purchase
- [ ] Email contains correct user details
- [ ] Email contains access links
- [ ] Email template renders correctly
- [ ] Email sending doesn't fail payment flow
- [ ] Error handling works if email fails

### 5. User Interface
- [ ] Landing page loads correctly
- [ ] Both products are displayed
- [ ] Checkout dialog opens correctly
- [ ] Form validation works
- [ ] Loading states display correctly
- [ ] Success messages show correctly
- [ ] Error messages are helpful
- [ ] Navigation works properly

### 6. End-to-End Flows
- [ ] Complete purchase flow for Python Notes
- [ ] Complete purchase flow for Internships
- [ ] User can access purchased content immediately
- [ ] Email arrives with access details
- [ ] User can return and access content later

## Deployment Checklist
- [ ] All environment variables are set for production
- [ ] Firebase security rules are configured
- [ ] Razorpay account is in live mode (if needed)
- [ ] Brevo sender email is verified (or using default)
- [ ] Build process completes successfully
- [ ] Application runs without errors
- [ ] All features work in production environment

## Known Issues & Notes
- Firebase Firestore permissions may need adjustment for production
- Brevo sender email should be verified before production
- Razorpay test keys should be replaced with live keys for production
- WEBSITE_URL should be updated to production domain