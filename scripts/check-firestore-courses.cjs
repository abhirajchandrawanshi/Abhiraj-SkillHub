/**
 * Script to check and fix Firestore course IDs
 * Usage: node scripts/check-firestore-courses.cjs
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Firebase Admin
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

console.log('Checking environment variables:', {
  hasPrivateKey: !!privateKey,
  hasProjectId: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
  hasClientEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
});

if (!privateKey || !process.env.FIREBASE_ADMIN_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
  console.error('❌ Firebase Admin credentials not configured in .env');
  console.error('Required env vars:');
  console.error('  - FIREBASE_ADMIN_PRIVATE_KEY');
  console.error('  - FIREBASE_ADMIN_PROJECT_ID');
  console.error('  - FIREBASE_ADMIN_CLIENT_EMAIL');
  process.exit(1);
}

console.log('Initializing Firebase Admin SDK...');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  }),
});

console.log('Firebase Admin SDK initialized successfully');

const db = admin.firestore();

async function checkCourses() {
  console.log('🔍 Checking Firestore courses collection...\n');
  
  try {
    const coursesSnapshot = await db.collection('courses').get();
    
    if (coursesSnapshot.empty) {
      console.log('❌ No courses found in Firestore');
      return;
    }
    
    console.log(`✅ Found ${coursesSnapshot.size} courses:\n`);
    
    coursesSnapshot.forEach((doc) => {
      const course = doc.data();
      console.log('📚 Course:', {
        id: doc.id,
        title: course.title,
        price: course.price,
        status: course.status,
        hasRequiredFields: !!(course.title && course.price),
      });
    });
    
    console.log('\n✅ All courses checked successfully');
  } catch (error) {
    console.error('❌ Error checking courses:', error);
    process.exit(1);
  }
}

async function findCourseByTitle(title) {
  console.log(`🔍 Searching for course with title: "${title}"\n`);
  
  try {
    const coursesSnapshot = await db.collection('courses').get();
    
    let foundCourse = null;
    coursesSnapshot.forEach((doc) => {
      const course = doc.data();
      if (course.title === title) {
        foundCourse = {
          id: doc.id,
          ...course,
        };
      }
    });
    
    if (foundCourse) {
      console.log('✅ Course found:', {
        id: foundCourse.id,
        title: foundCourse.title,
        price: foundCourse.price,
        status: foundCourse.status,
      });
      return foundCourse;
    } else {
      console.log('❌ Course not found');
      return null;
    }
  } catch (error) {
    console.error('❌ Error finding course:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // List all courses
    await checkCourses();
  } else if (args[0] === 'find' && args[1]) {
    // Find specific course by title
    await findCourseByTitle(args[1]);
  } else {
    console.log('Usage:');
    console.log('  node scripts/check-firestore-courses.cjs              # List all courses');
    console.log('  node scripts/check-firestore-courses.cjs find <title>  # Find course by title');
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
