# Firebase Authentication for Admin Panel

## Overview

The admin panel has been upgraded to use Firebase Authentication instead of custom environment variable authentication. This provides proper security and integrates with Firebase's authentication system.

## What Changed

### Before (Custom Auth)
- Used environment variables (`VITE_ADMIN_EMAIL`, `VITE_ADMIN_PASSWORD`)
- Stored sessions in localStorage
- No actual Firebase Authentication
- Firestore rules couldn't properly authenticate the admin

### After (Firebase Auth)
- Uses real Firebase Authentication
- Sessions managed by Firebase
- Proper Firebase Auth tokens
- Firestore rules can verify admin identity
- Production-ready security

## Setup Instructions

### 1. Create Admin User

Run the setup script to create the admin user in Firebase Authentication:

```bash
npm run setup-admin
```

This will:
- Create a user in Firebase Authentication with your admin credentials
- Create an admin document in Firestore (for future extensibility)
- Use credentials from your `.env` file (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)

### 2. Update Firestore Rules

Update your Firestore security rules in the Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `abhiraj-skillsup`
3. Navigate to **Firestore Database → Rules**
4. Replace the existing rules with the content from your `firestore.rules` file
5. Click **"Publish"**

The updated rules will:
- Allow public read access to published courses
- Allow write access ONLY to the authenticated admin user (`admin@abhirajcourses.com`)
- Protect other collections appropriately

### 3. Environment Configuration

Make sure your `.env` file contains:

```env
# Admin Configuration (for setup script only)
ADMIN_EMAIL=admin@abhirajcourses.com
ADMIN_PASSWORD=Admin@123456

# Firebase Configuration (required)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## Usage

### Admin Login

1. Start your development server: `npm run dev`
2. Navigate to: `http://localhost:3000/admin/login`
3. Enter your admin credentials (email and password)
4. Firebase Authentication will verify your credentials
5. If successful, you'll be redirected to the admin dashboard

### Admin Logout

The admin panel uses Firebase's sign-out functionality, which properly terminates the session.

## Password Management

### Reset Admin Password

If you need to reset the admin password:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `abhiraj-skillsup`
3. Navigate to **Authentication → Users**
4. Find the admin user (`admin@abhirajcourses.com`)
5. Click **"Reset Password"**
6. Follow the email instructions

### Change Admin Email

To change the admin email:

1. Update the `.env` file with the new email
2. Run `npm run setup-admin` (it will create/update the user)
3. Update the email in `firestore.rules` file
4. Update the email in `src/hooks/use-admin-auth.tsx`
5. Deploy the updated Firestore rules

## Security Benefits

1. **Proper Authentication**: Uses Firebase's secure authentication system
2. **Token-based Security**: Firestore rules can verify actual Firebase Auth tokens
3. **Session Management**: Firebase handles session security and expiration
4. **Password Security**: Passwords are securely hashed by Firebase
5. **Audit Trail**: Firebase provides authentication logs and monitoring
6. **Production Ready**: Follows Firebase security best practices

## Troubleshooting

### "Email already in use" during setup

This means the admin user already exists in Firebase Authentication. You can either:
- Use the existing user and try logging in
- Delete the user from Firebase Console and run the setup script again

### "Missing or insufficient permissions" error

This means your Firestore rules haven't been updated. Make sure to:
1. Update the rules in Firebase Console with the content from `firestore.rules`
2. Click "Publish" to deploy the rules

### Admin login not working

1. Verify the admin user exists in Firebase Console → Authentication → Users
2. Check that your credentials are correct
3. Ensure Firestore rules are updated and published
4. Check browser console for Firebase Auth errors
5. Verify Firebase configuration in `.env` file

### Can't access admin panel

1. Make sure you're using the correct admin email: `admin@abhirajcourses.com`
2. Check that you're authenticated (look for Firebase Auth state)
3. Verify the user email matches what's in the Firestore rules
4. Clear browser localStorage and try logging in again

## Code Changes Summary

### Modified Files

1. **`src/hooks/use-admin-auth.tsx`**
   - Replaced custom auth with Firebase Authentication
   - Uses `signInWithEmailAndPassword` and `signOut` from Firebase Auth
   - Validates admin email against hardcoded admin email
   - Uses `onAuthStateChanged` for session management

2. **`src/routes/admin/login.tsx`**
   - Updated error handling for Firebase Auth errors
   - Added specific error messages for auth failures

3. **`firestore.rules`**
   - Updated to use Firebase Auth token verification
   - Only allows write access to authenticated admin user
   - Maintains public read access for published courses

4. **`ADMIN_SETUP.md`**
   - Updated documentation for Firebase Auth setup
   - Removed references to custom environment variable auth

5. **`.env.example`**
   - Removed client-side admin credentials
   - Kept only setup script credentials

## Future Enhancements

Potential improvements for the admin panel:

1. **Multiple Admin Users**: Extend to support multiple admin users with different roles
2. **Custom Claims**: Use Firebase custom claims for role-based access control
3. **Admin Activity Logging**: Track admin actions in Firestore
4. **Two-Factor Authentication**: Add 2FA for enhanced security
5. **Session Management**: Implement session timeout and activity monitoring

## Support

If you encounter issues:

1. Check Firebase Console for authentication logs
2. Review Firestore rules in Firebase Console
3. Check browser console for Firebase Auth errors
4. Verify environment variables are set correctly
5. Ensure Firebase project configuration is correct

## Migration from Old System

If you were using the old custom auth system:

1. **No data migration needed**: The authentication system is completely separate
2. **User sessions**: Old localStorage sessions won't work - users need to login again
3. **Password**: If you forgot the admin password, reset it via Firebase Console
4. **Environment variables**: Remove `VITE_ADMIN_EMAIL` and `VITE_ADMIN_PASSWORD` from `.env`

The admin panel is now properly secured with Firebase Authentication! 🔐