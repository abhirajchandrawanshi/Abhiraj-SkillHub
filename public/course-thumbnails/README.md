# Course Thumbnails

This directory contains optimized WebP course thumbnails served by Vercel CDN.

These are NOT served from Supabase Storage — they are static assets served directly
from the frontend, eliminating Supabase cached egress.

## Naming Convention
- Files are named: `<courseId>.webp`
- Max width: 600px
- Format: WebP, ~80% quality
- Target size: 50-250 KB per image

## How to Add New Thumbnails
1. Optimize the image to WebP format (max 600px width)
2. Name it `<courseId>.webp`  
3. Place it in this directory
4. Set the course's `thumbnail` field in Firestore to `/course-thumbnails/<courseId>.webp`

## Migration
Run `npx tsx scripts/migrate-thumbnails.ts` to migrate existing Supabase thumbnails.
