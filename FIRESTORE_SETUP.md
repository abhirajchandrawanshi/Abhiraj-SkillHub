# Firestore Security Rules Setup Guide

## Issue
The application is showing "Missing or insufficient permissions" errors when trying to fetch published courses from Firestore.

## Solution
You need to deploy the Firestore security rules to your Firebase project.

## Steps to Deploy Firestore Rules

### Option 1: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `abhiraj-skillsup`
3. Navigate to **Firestore Database** → **Rules** tab
4. Replace the existing rules with the following:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow public read access to published courses
    match /courses/{courseId} {
      allow read: if resource.data.status == 'published' || resource.data.published == true;
      allow write: if false; // No public write access
    }
    
    // Allow read access to courseAccess for authenticated users
    match /courseAccess/{accessId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false; // No public write access
    }
    
    // Allow read access to enrollments for authenticated users
    match /enrollments/{enrollmentId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow write: if false; // No public write access
    }
    
    // Admin users collection - restricted access
    match /adminUsers/{userId} {
      allow read, write: if false; // No direct access, managed via Firebase Console
    }
  }
}
```

5. Click **Publish** to deploy the rules

### Option 2: Using Firebase CLI

If you have Firebase CLI installed:

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## What These Rules Do

- **Public Read Access**: Anyone can read courses with `status: "published"` or `published: true`
- **No Public Write Access**: Public users cannot write to any collection
- **User Access**: Authenticated users can read their own course access and enrollment records
- **Admin Protection**: Admin users collection is completely restricted

## After Deployment

Once the rules are deployed:

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. The permission errors should be resolved

3. Test the admin panel:
   - Navigate to `http://localhost:3001/admin/login`
   - Login with: `admin@abhirajcourses.com` / `Admin@123456`
   - Go to `http://localhost:3001/admin/courses` to manage courses

## Testing Course Management

### Add a Course
1. Click "Add Course" button
2. Fill in course details:
   - Title, subtitle, description
   - Price, original price, discount
   - Category, instructor, duration
   - Thumbnail URL
   - Toggle "Publish immediately" to make it visible
3. Click "Create Course"

### Update a Course
1. Click the menu (three dots) on a course row
2. Select "Edit"
3. Modify course details
4. Click "Update Course"

### Delete a Course
1. Click the menu (three dots) on a course row
2. Select "Delete"
3. Confirm deletion (only allowed if no purchases exist)

### Publish/Unpublish
1. Click the menu (three dots) on a course row
2. Select "Publish" or "Unpublish" to toggle visibility

## Troubleshooting

If you still see permission errors after deploying rules:

1. Clear browser cache and localStorage
2. Check Firebase Console → Firestore Database → Rules to confirm rules are published
3. Verify your Firebase project ID matches in `.env` file
4. Check browser console for specific error messages
