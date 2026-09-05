# Manual Course Addition Instructions

Since Firebase rules cannot be deployed automatically, here are the manual steps to add the courses:

## Step 1: Update Firestore Rules in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `abhiraj-skillsup`
3. Navigate to **Firestore Database → Rules**
4. Replace the existing rules with this content:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow public read access to published courses
    match /courses/{courseId} {
      allow read: if resource.data.status == 'published' || resource.data.published == true;
      // TEMPORARY: Allow write access for development to add courses
      // WARNING: This is not secure for production! Admin needs to be authenticated
      allow write: if true;
    }
    
    // Allow read access to courseAccess for authenticated users and admin
    match /courseAccess/{accessId} {
      // Allow users to read their own access records
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || resource.data.email == request.auth.token.email);
      // Allow admin user to read all access records for dashboard statistics
      allow read: if request.auth != null && request.auth.token.email == 'admin@abhirajcourses.com';
      // Allow write access for authenticated users (for migration and access granting)
      allow write: if request.auth != null;
    }
    
    // Allow read access to enrollments for authenticated users and admin
    match /enrollments/{enrollmentId} {
      // Allow users to read their own enrollment records
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || resource.data.userId == request.auth.token.email);
      // Allow admin user to read all enrollment records for dashboard statistics
      allow read: if request.auth != null && request.auth.token.email == 'admin@abhirajcourses.com';
      // Allow write access for authenticated users
      allow write: if request.auth != null;
    }
    
    // Admin users collection - restricted access
    match /adminUsers/{userId} {
      allow read, write: if false; // No direct access, managed via Firebase Console
    }
  }
}
```

5. Click **"Publish"**

## Step 2: Add Courses via Admin Panel

1. Navigate to `http://localhost:3001/admin/login`
2. Login with admin credentials:
   - Email: `admin@abhirajcourses.com`
   - Password: `Admin@123456`
3. Go to **Courses** page
4. Click **"Add Course"**
5. Add the following courses:

### Course 1: Python Complete Course
- **Title**: Python Complete Course
- **Subtitle**: Complete Python programming from basics to advanced
- **Description**: Master Python programming with comprehensive coverage of fundamentals, data structures, OOP, and advanced concepts. Perfect for beginners and intermediate learners.
- **Price**: 999
- **Original Price**: 2999
- **Discount**: 67
- **Category**: Programming
- **Instructor**: Abhiraj Chandrawanshi
- **Duration**: 40 hours
- **Status**: Published
- **Thumbnail**: https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=400&fit=crop
- **Details**: This course covers Python fundamentals, data structures, object-oriented programming, file handling, databases, web development with Flask/Django, and more.
- **Access Info**: Lifetime access with video lectures, code examples, and projects.
- **Meta Title**: Python Complete Course - Learn Python Programming
- **Meta Description**: Master Python programming from basics to advanced concepts with hands-on projects and real-world examples.

### Course 2: DSA Complete Course
- **Title**: DSA Complete Course
- **Subtitle**: Data Structures and Algorithms for interviews
- **Description**: Comprehensive DSA course covering arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, and more. Essential for coding interviews.
- **Price**: 1499
- **Original Price**: 4999
- **Discount**: 70
- **Category**: Computer Science
- **Instructor**: Abhiraj Chandrawanshi
- **Duration**: 60 hours
- **Status**: Published
- **Thumbnail**: https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&h=400&fit=crop
- **Details**: Master data structures and algorithms with practical implementations and interview preparation. Includes arrays, linked lists, stacks, queues, trees, graphs, sorting algorithms, and dynamic programming.
- **Access Info**: Lifetime access with video lectures, coding practice, and interview preparation materials.
- **Meta Title**: DSA Complete Course - Data Structures and Algorithms
- **Meta Description**: Master data structures and algorithms for coding interviews with comprehensive coverage and practical implementations.

## Step 3: Verify Courses on Website

1. Navigate to `http://localhost:3001`
2. Scroll to the **"More Courses"** section
3. You should see both Python Complete Course and DSA Complete Course displayed

## Step 4: Restore Security Rules (IMPORTANT)

After adding the courses, update the Firestore rules back to secure settings:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow public read access to published courses
    match /courses/{courseId} {
      allow read: if resource.data.status == 'published' || resource.data.published == true;
      // Allow write access for authenticated admin users
      allow write: if request.auth != null && request.auth.token.email == 'admin@abhirajcourses.com';
    }
    
    // Allow read access to courseAccess for authenticated users and admin
    match /courseAccess/{accessId} {
      // Allow users to read their own access records
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || resource.data.email == request.auth.token.email);
      // Allow admin user to read all access records for dashboard statistics
      allow read: if request.auth != null && request.auth.token.email == 'admin@abhirajcourses.com';
      // Allow write access for authenticated users (for migration and access granting)
      allow write: if request.auth != null;
    }
    
    // Allow read access to enrollments for authenticated users and admin
    match /enrollments/{enrollmentId} {
      // Allow users to read their own enrollment records
      allow read: if request.auth != null && (resource.data.userId == request.auth.uid || resource.data.userId == request.auth.token.email);
      // Allow admin user to read all enrollment records for dashboard statistics
      allow read: if request.auth != null && request.auth.token.email == 'admin@abhirajcourses.com';
      // Allow write access for authenticated users
      allow write: if request.auth != null;
    }
    
    // Admin users collection - restricted access
    match /adminUsers/{userId} {
      allow read, write: if false; // No direct access, managed via Firebase Console
    }
  }
}
```

This will restore proper security while allowing the admin user to manage courses.