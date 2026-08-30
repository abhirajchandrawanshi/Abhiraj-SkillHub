# Firebase Admin SDK Setup Required

## Issue
The admin panel authentication is failing because server-side functions cannot access Firebase Auth state from the client. To properly secure the admin panel, we need Firebase Admin SDK credentials.

## What I Need From You

To implement proper server-side authentication, I need the following Firebase Admin SDK credentials:

### Option 1: Service Account Key (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `abhiraj-skillsup`
3. Navigate to **Project Settings** → **Service accounts**
4. Click **Generate new private key**
5. Download the JSON file
6. **Share the contents of this JSON file with me** (I'll add it to `.env` as environment variables)

The JSON file will contain:
- `type`
- `project_id`
- `private_key_id`
- `private_key`
- `client_email`
- `client_id`
- `auth_uri`
- `token_uri`
- `auth_provider_x509_cert_url`
- `client_x509_cert_url`

### Option 2: Individual Environment Variables

If you prefer not to share the full JSON, provide these individual values:

```
FIREBASE_ADMIN_TYPE=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_CLIENT_ID=
FIREBASE_ADMIN_AUTH_URI=
FIREBASE_ADMIN_TOKEN_URI=
FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL=
FIREBASE_ADMIN_CLIENT_X509_CERT_URL=
```

## Temporary Workaround (Current State)

While waiting for the credentials, I've implemented a simplified authentication system:

- **Client-side**: Firebase Auth works normally for login
- **Server-side**: Uses a mock authentication check based on environment variables
- **Security**: This is less secure than proper token verification but allows the admin panel to function

## What I Will Do Once I Have the Credentials

1. Add Firebase Admin SDK to dependencies
2. Configure Admin SDK with your credentials
3. Implement proper ID token verification in server functions
4. Remove the temporary mock authentication
5. Add proper error handling and security checks

## Current Admin Panel Access

**Login URL**: `http://localhost:3001/admin/login`
**Credentials**: 
- Email: `admin@abhirajcourses.com`
- Password: `Admin@123456`

**Note**: The current workaround allows basic functionality but is not production-secure. Please provide the Firebase Admin SDK credentials for proper security.
