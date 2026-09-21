import fs from 'fs/promises';
import path from 'path';

const SRC = path.join(process.cwd(), 'src');

const moveMap = {
  // Features - Auth
  'src/hooks/auth-provider.tsx': 'src/features/auth/auth-provider.tsx',
  'src/hooks/use-auth.tsx': 'src/features/auth/use-auth.tsx',
  'src/hooks/use-admin-auth.tsx': 'src/features/auth/use-admin-auth.tsx',
  // Features - Courses
  'src/hooks/use-course-access.ts': 'src/features/courses/use-course-access.ts',
  'src/hooks/use-dynamic-course-access.ts': 'src/features/courses/use-dynamic-course-access.ts',
  // Features - Cart
  'src/hooks/use-cart.tsx': 'src/features/cart/use-cart.tsx',

  // Services - Database
  'src/firebase.ts': 'src/services/database/firebase.ts',
  'src/lib/firebase-admin.ts': 'src/services/database/firebase-admin.ts',
  'src/lib/firebase-courses.ts': 'src/services/database/firebase-courses.ts',
  'src/lib/admin.ts': 'src/services/database/admin.ts',
  // Services - Storage
  'src/lib/supabase-server.ts': 'src/services/storage/supabase-server.ts',
  'src/lib/supabase-storage.ts': 'src/services/storage/supabase-storage.ts',
  // Services - Payments
  'src/lib/razorpay.ts': 'src/services/payments/razorpay.ts',
  'src/lib/load-razorpay.ts': 'src/services/payments/load-razorpay.ts',
  // Services - Email
  'src/lib/brevo.ts': 'src/services/email/brevo.ts',
  // Services - Access
  'src/lib/access.ts': 'src/services/access/access.ts',
  'src/lib/courseAccess.ts': 'src/services/access/courseAccess.ts',
  'src/lib/admin-server.ts': 'src/services/access/admin-server.ts',

  // Components - Layout
  'src/components/SiteHeader.tsx': 'src/components/layout/SiteHeader.tsx',
  'src/components/SiteFooter.tsx': 'src/components/layout/SiteFooter.tsx',
  'src/components/AdminShell.tsx': 'src/components/layout/AdminShell.tsx',
  // Components - Course
  'src/components/CourseFormDialog.tsx': 'src/components/course/CourseFormDialog.tsx',
  'src/components/CartDrawer.tsx': 'src/components/course/CartDrawer.tsx',
  'src/components/CheckoutDialog.tsx': 'src/components/course/CheckoutDialog.tsx',
};

const importReplacements = [
  // Features
  { from: '@/hooks/auth-provider', to: '@/features/auth/auth-provider' },
  { from: '@/hooks/use-auth', to: '@/features/auth/use-auth' },
  { from: '@/hooks/use-admin-auth', to: '@/features/auth/use-admin-auth' },
  { from: '@/hooks/use-course-access', to: '@/features/courses/use-course-access' },
  { from: '@/hooks/use-dynamic-course-access', to: '@/features/courses/use-dynamic-course-access' },
  { from: '@/hooks/use-cart', to: '@/features/cart/use-cart' },

  // Services
  { from: '@/firebase', to: '@/services/database/firebase' },
  { from: '@/lib/firebase-admin', to: '@/services/database/firebase-admin' },
  { from: '@/lib/firebase-courses', to: '@/services/database/firebase-courses' },
  { from: '@/lib/admin', to: '@/services/database/admin' },
  { from: '@/lib/supabase-server', to: '@/services/storage/supabase-server' },
  { from: '@/lib/supabase-storage', to: '@/services/storage/supabase-storage' },
  { from: '@/lib/razorpay', to: '@/services/payments/razorpay' },
  { from: '@/lib/load-razorpay', to: '@/services/payments/load-razorpay' },
  { from: '@/lib/brevo', to: '@/services/email/brevo' },
  { from: '@/lib/access', to: '@/services/access/access' },
  { from: '@/lib/courseAccess', to: '@/services/access/courseAccess' },
  { from: '@/lib/admin-server', to: '@/services/access/admin-server' },

  // Components - Layout
  { from: '@/components/SiteHeader', to: '@/components/layout/SiteHeader' },
  { from: '@/components/SiteFooter', to: '@/components/layout/SiteFooter' },
  { from: '@/components/AdminShell', to: '@/components/layout/AdminShell' },

  // Components - Course
  { from: '@/components/CourseFormDialog', to: '@/components/course/CourseFormDialog' },
  { from: '@/components/CartDrawer', to: '@/components/course/CartDrawer' },
  { from: '@/components/CheckoutDialog', to: '@/components/course/CheckoutDialog' },
];

async function updateFileImports(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let newContent = content;
    
    for (const { from, to } of importReplacements) {
      const regex = new RegExp(`['"]${from}['"]`, 'g');
      newContent = newContent.replace(regex, `"${to}"`);
    }
    
    // Fix relative import inside firebase-courses.ts pointing to firebase
    if (filePath.endsWith('firebase-courses.ts') || filePath.endsWith('admin.ts')) {
      newContent = newContent.replace(/['"]\.\.\/firebase['"]/g, '"@/services/database/firebase"');
    }

    if (content !== newContent) {
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`Updated imports in ${filePath}`);
    }
  } catch (err) {
    console.error(`Error updating imports in ${filePath}:`, err);
  }
}

async function scanAndProcess(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await scanAndProcess(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      await updateFileImports(fullPath);
    }
  }
}

async function run() {
  console.log("Creating new directories...");
  const dirs = [
    'src/features/auth',
    'src/features/courses',
    'src/features/cart',
    'src/services/database',
    'src/services/storage',
    'src/services/payments',
    'src/services/email',
    'src/services/access',
    'src/components/layout',
    'src/components/course'
  ];
  for (const d of dirs) {
    await fs.mkdir(path.join(process.cwd(), d), { recursive: true });
  }

  console.log("Moving files...");
  for (const [src, dest] of Object.entries(moveMap)) {
    try {
      await fs.rename(path.join(process.cwd(), src), path.join(process.cwd(), dest));
      console.log(`Moved ${src} to ${dest}`);
    } catch (e) {
      console.log(`Could not move ${src}`);
    }
  }

  console.log("Updating imports...");
  await scanAndProcess(SRC);
  
  console.log("Done refactoring.");
}

run();
