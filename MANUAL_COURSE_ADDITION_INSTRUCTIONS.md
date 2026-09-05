# Manual Course Addition Instructions

Since the Firebase Admin SDK environment variables are not configured, you'll need to add the initial courses manually via Firebase Console. After this, the admin UI will work for creating/editing courses.

## Steps to Add Courses via Firebase Console

### 1. Go to Firebase Console
Navigate to: https://console.firebase.google.com/project/abhiraj-skillsup/firestore/data

### 2. Add Python Complete Course

Click "Start collection" or "Add document" in the `courses` collection:

**Document ID:** `python-complete-course`

**Fields:**
```json
{
  "title": "Python Complete Course",
  "subtitle": "Complete Python programming from basics to advanced",
  "description": "Master Python programming with comprehensive coverage of fundamentals, data structures, OOP, and advanced concepts. Perfect for beginners and intermediate learners.",
  "price": 999,
  "originalPrice": 2999,
  "discount": 67,
  "category": "Programming",
  "instructor": "Abhiraj Chandrawanshi",
  "duration": "40 hours",
  "status": "published",
  "thumbnail": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=400&fit=crop",
  "details": "This course covers Python fundamentals, data structures, object-oriented programming, file handling, databases, web development with Flask/Django, and more.",
  "accessInfo": "Lifetime access with video lectures, code examples, and projects.",
  "metaTitle": "Python Complete Course - Learn Python Programming",
  "metaDescription": "Master Python programming from basics to advanced concepts with hands-on projects and real-world examples.",
  "createdAt": "2026-09-02T10:00:00.000Z",
  "updatedAt": "2026-09-02T10:00:00.000Z"
}
```

### 3. Add DSA Complete Course

Click "Add document" in the `courses` collection:

**Document ID:** `dsa-complete-course`

**Fields:**
```json
{
  "title": "DSA Complete Course",
  "subtitle": "Data Structures and Algorithms for interviews",
  "description": "Comprehensive DSA course covering arrays, linked lists, trees, graphs, sorting, searching, dynamic programming, and more. Essential for coding interviews.",
  "price": 1499,
  "originalPrice": 4999,
  "discount": 70,
  "category": "Computer Science",
  "instructor": "Abhiraj Chandrawanshi",
  "duration": "60 hours",
  "status": "published",
  "thumbnail": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&h=400&fit=crop",
  "details": "Master data structures and algorithms with practical implementations and interview preparation. Includes arrays, linked lists, stacks, queues, trees, graphs, sorting algorithms, and dynamic programming.",
  "accessInfo": "Lifetime access with video lectures, coding practice, and interview preparation materials.",
  "metaTitle": "DSA Complete Course - Data Structures and Algorithms",
  "metaDescription": "Master data structures and algorithms for coding interviews with comprehensive coverage and practical implementations.",
  "createdAt": "2026-09-02T10:00:00.000Z",
  "updatedAt": "2026-09-02T10:00:00.000Z"
}
```

## Important Notes

- **Field Types:** Ensure `price`, `originalPrice`, and `discount` are set as **number** type, not string
- **Status:** Set `status` as **string** with value "published"
- **Timestamps:** The `createdAt` and `updatedAt` should be **timestamp** type or **string** (ISO format)

## After Adding Courses

Once you've added these courses:
1. The admin UI at `/admin/courses` will allow you to create/edit/delete courses
2. The main page will display these courses in the "More Courses" section
3. Regular users will be able to see and purchase these courses

## Why Manual Addition?

The Firestore security rules are correctly configured to allow `admin@abhirajcourses.com` to write to the courses collection. However, to add the initial courses, we need either:
- Firebase Admin SDK with service account credentials (not configured)
- Manual addition via Firebase Console (owner access)

After the initial courses are added, the admin UI will work perfectly for all future course management.
