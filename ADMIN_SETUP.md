# Admin Panel Setup Instructions

## IMPORTANT: Firebase Authentication Setup

The admin panel now uses Firebase Authentication for secure access. The admin user must be created in Firebase Authentication.

### Step 1: Create Admin User

Run the setup script to create the admin user in Firebase Authentication:

```bash
npm run setup-admin
```

This will create a user with the credentials from your `.env` file:
- `ADMIN_EMAIL=admin@abhirajcourses.com`
- `ADMIN_PASSWORD=Admin@123456`

### Step 2: Update Firestore Security Rules

Update your Firestore security rules in the Firebase Console to only allow the admin user to write to courses:

1. Go to Firebase Console → Firestore Database → Rules
2. Replace with the content from `firestore.rules` file
3. Click "Publish"

### Step 3: Environment Variables

Make sure your `.env` file contains the admin credentials for the setup script:

```env
# Admin Configuration (for setup script only)
ADMIN_EMAIL=admin@abhirajcourses.com
ADMIN_PASSWORD=Admin@123456
```

**Security Notes:**
- Change the default password to something secure
- Never commit your `.env` file to version control
- Use a strong password with at least 12 characters, including uppercase, lowercase, numbers, and special characters
- The admin credentials are only used during setup; authentication uses Firebase Auth

## Admin Panel Features

### Access
- Admin Login: `http://localhost:3001/admin/login`
- Admin Dashboard: `http://localhost:3001/admin/dashboard`
- Course Management: `http://localhost:3001/admin/courses`

### Features Implemented
1. **Secure Admin Authentication**
   - Environment variable-based credentials
   - Session management with 24-hour expiry
   - Protected admin routes

2. **Admin Dashboard**
   - Total courses count
   - Published courses count
   - Total users count
   - Total purchases count
   - Revenue overview

3. **Course Management**
   - Add new courses with full details
   - Edit existing courses
   - Delete courses (with safety checks)
   - Publish/Unpublish functionality
   - Search and filter courses
   - Status management (Published/Draft)

4. **Course Fields**
   - Title and subtitle
   - Description
   - Pricing (price, original price, discount)
   - Category and instructor
   - Duration
   - Thumbnail URL
   - Course details and access information
   - SEO metadata (title, description)
   - Publish status

## Integration with Existing System

### Payment System
- The admin panel integrates with your existing Razorpay payment system
- Dynamic courses from Firestore can be purchased
- Legacy courses (internships, testing) continue to work
- Course access is granted through the existing Firebase Firestore system

### Email System
- Your existing Brevo email integration continues to work
- Purchase confirmation emails are sent after successful payments
- No changes to the email workflow

### User Authentication
- Your existing Firebase authentication remains unchanged
- User login/signup flow is not affected
- Course access for users is preserved

## Testing the Admin Flow

1. **Setup Environment Variables**
   - Add `ADMIN_EMAIL` and `ADMIN_PASSWORD` to your `.env` file
   - Restart the development server

2. **Test Admin Login**
   - Navigate to `http://localhost:3001/admin/login`
   - Enter your admin credentials
   - You should be redirected to the dashboard

3. **Test Course Creation**
   - Go to Courses page
   - Click "Add Course"
   - Fill in course details
   - Publish the course
   - Check if it appears on the main website

4. **Test Course Management**
   - Edit an existing course
   - Toggle publish status
   - Try deleting a course (with confirmation)

5. **Verify Public Website**
   - Go to `http://localhost:3001`
   - Check if dynamic courses appear in the "More Courses" section
   - Test purchase flow for dynamic courses

## Firestore Structure

The admin panel uses the following Firestore collections:

### `courses` collection
```javascript
{
  id: string,
  title: string,
  subtitle: string,
  description: string,
  price: number,
  originalPrice?: number,
  discount?: number,
  thumbnail?: string,
  category: string,
  instructor: string,
  duration: string,
  status: "published" | "draft",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  details?: string,
  accessInfo?: string,
  metaTitle?: string,
  metaDescription?: string
}
```

### Existing collections (unchanged)
- `courseAccess` - User course access records
- `enrollments` - Course enrollment records

## Security Considerations

1. **Admin Credentials**
   - Stored in environment variables, not in code
   - Never exposed to frontend
   - Session tokens expire after 24 hours

2. **Route Protection**
   - All admin routes are protected
   - Redirects to login if not authenticated
   - Session validation on each admin page

3. **API Protection**
   - Admin server functions verify admin session
   - Cannot be called from frontend without authentication
   - Proper error handling for unauthorized access

4. **Course Deletion Safety**
   - Cannot delete courses with existing purchases
   - Confirmation dialog before deletion
   - Preserves user access and payment history

## Troubleshooting

### Admin login not working
- Check that `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set in `.env`
- Restart the development server after adding environment variables
- Clear browser localStorage if session issues persist

### Courses not appearing on website
- Ensure course status is "Published" (not "Draft")
- Check browser console for errors
- Verify Firestore rules allow public read access

### Payment flow issues
- Dynamic courses use Firestore data for pricing
- Legacy courses use hardcoded pricing
- Check browser console for Razorpay errors
- Verify course ID is correctly passed to payment system

## Next Steps

1. Set up your admin credentials in `.env`
2. Test the complete admin flow
3. Create your first dynamic course
4. Verify it appears on the public website
5. Test the purchase flow for the new course

The admin panel is now fully integrated with your existing course-selling website!