# 🗄️ RentFlow Storage Buckets Setup Guide

Complete guide for setting up Supabase storage buckets for file uploads in the RentFlow property management platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Bucket Structure](#bucket-structure)
- [Storage Policies](#storage-policies)
- [Usage Patterns](#usage-patterns)
- [Folder Naming Conventions](#folder-naming-conventions)
- [File Size Limits](#file-size-limits)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The RentFlow application requires 8 distinct storage buckets to handle different types of file uploads:

1. **property-images** - Property and unit photographs
2. **documents** - Verification documents (ID, ownership proof, business registration)
3. **avatars** - User profile pictures
4. **maintenance-media** - Maintenance request photos and videos
5. **receipts** - Payment receipts (generated or uploaded)
6. **agreements** - Lease agreement PDF documents
7. **applications** - Tenant application documents (proof of income, bank statements)
8. **support-attachments** - Support ticket attachments

## 🚀 Quick Start

### Step 1: Run the Setup Script

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `storage-buckets-setup.sql`
5. Run the script
6. Verify success message and bucket creation

### Step 2: Verify Buckets

Navigate to **Storage** in your Supabase Dashboard. You should see 8 buckets created:

```
✓ property-images     (PUBLIC)
✓ documents           (PRIVATE)
✓ avatars             (PUBLIC)
✓ maintenance-media   (PRIVATE)
✓ receipts            (PRIVATE)
✓ agreements          (PRIVATE)
✓ applications        (PRIVATE)
✓ support-attachments (PRIVATE)
```

### Step 3: Test Upload

The existing application code is already configured to use these buckets. Test by:

1. Login as a landlord
2. Navigate to Properties
3. Try uploading a property image
4. Verify the image appears correctly

## 📦 Bucket Structure

### 1. property-images 📷

**Purpose:** Store property and unit photos for listings

**Access Level:** Public (anyone can view)

**File Types:**
- `image/jpeg`, 
- `image/png`
- `image/webp`
- `image/gif`

**Max File Size:** 5 MB

**Folder Structure:**
```
property-images/
  ├── {propertyId}/
  │   ├── {timestamp}-0.jpg
  │   ├── {timestamp}-1.jpg
  │   └── ...
```

**Who Can Upload:**
- Landlords (for their properties)
- Admins/Super Admins

**Code Usage:**
```typescript
// Example: Upload property image
import { uploadPropertyImages } from '@/services/propertyService';

const imageUrls = await uploadPropertyImages(propertyId, files);
```

---

### 2. documents 📄

**Purpose:** Store verification documents (ID cards, proof of ownership, business registration)

**Access Level:** Private (owner + admins only)

**File Types:**
- `image/jpeg`, 
- `image/png`
- `image/webp`
- `application/pdf`

**Max File Size:** 10 MB

**Folder Structure:**
```
documents/
  ├── landlord-verification/
  │   ├── {userId}/
  │   │   ├── idCard-{timestamp}.pdf
  │   │   ├── proofOfOwnership-{timestamp}.pdf
  │   │   └── businessRegistration-{timestamp}.pdf
  ├── tenant-verification/
  │   ├── {userId}/
  │   │   └── nationalId-{timestamp}.pdf
```

**Who Can Upload:**
- Users (to their own folder)
- Admins can view all

**Code Usage:**
```typescript
// Example: Upload verification document
const filePath = `landlord-verification/${userId}/idCard-${Date.now()}.pdf`;

const { error } = await supabase.storage
  .from('documents')
  .upload(filePath, file);
```

---

### 3. avatars 👤

**Purpose:** User profile pictures

**Access Level:** Public (anyone can view)

**File Types:**
- `image/jpeg`, 
- `image/png`
- `image/webp`

**Max File Size:** 2 MB

**Folder Structure:**
```
avatars/
  ├── {userId}/
  │   └── profile.jpg
```

**Who Can Upload:**
- Users (their own avatar only)

**Code Usage:**
```typescript
// Example: Upload user avatar
const filePath = `${userId}/profile.jpg`;

const { error } = await supabase.storage
  .from('avatars')
  .upload(filePath, file, { upsert: true });
```

---

### 4. maintenance-media 🔧

**Purpose:** Photos and videos for maintenance requests

**Access Level:** Private (requester + property landlord + admins)

**File Types:**
- `image/jpeg`, , `image/png`, `image/webp`
- `video/mp4`, `video/quicktime`, `video/x-msvideo`

**Max File Size:** 20 MB (to accommodate videos)

**Folder Structure:**
```
maintenance-media/
  ├── {tenantId}/
  │   ├── {requestId}/
  │   │   ├── photo-1.jpg
  │   │   ├── photo-2.jpg
  │   │   └── video-1.mp4
```

**Who Can Upload:**
- Tenants (for their maintenance requests)
- Landlords (for updates)

**Code Usage:**
```typescript
// Example: Upload maintenance photo
const filePath = `${tenantId}/${requestId}/photo-${Date.now()}.jpg`;

const { error } = await supabase.storage
  .from('maintenance-media')
  .upload(filePath, file);
```

---

### 5. receipts 🧾

**Purpose:** Payment receipts (generated PDFs or uploaded images)

**Access Level:** Private (tenant + landlord + admins)

**File Types:**
- `application/pdf`
- `image/jpeg`, , `image/png`

**Max File Size:** 5 MB

**Folder Structure:**
```
receipts/
  ├── {tenantId}/
  │   ├── {paymentId}/
  │   │   └── receipt.pdf
```

**Who Can Upload:**
- System (auto-generated receipts)
- Tenants (manual upload)

**Code Usage:**
```typescript
// Example: Generate receipt
const filePath = `${tenantId}/${paymentId}/receipt.pdf`;

const { error } = await supabase.storage
  .from('receipts')
  .upload(filePath, pdfBlob);
```

---

### 6. agreements 📋

**Purpose:** Lease agreement PDF documents

**Access Level:** Private (tenant + landlord + admins)

**File Types:**
- `application/pdf`

**Max File Size:** 10 MB

**Folder Structure:**
```
agreements/
  ├── {tenantId}/
  │   ├── {agreementId}/
  │   │   └── lease-agreement.pdf
```

**Who Can Upload:**
- System (auto-generated agreements)
- Landlords (manual upload)

**Code Usage:**
```typescript
// Example: Generate agreement
const filePath = `${tenantId}/${agreementId}/lease-agreement.pdf`;

const { error } = await supabase.storage
  .from('agreements')
  .upload(filePath, agreementPdf);
```

---

### 7. applications 📝

**Purpose:** Tenant application documents (proof of income, bank statements, references)

**Access Level:** Private (applicant + property landlord + admins)

**File Types:**
- `application/pdf`
- `image/jpeg`, , `image/png`, `image/webp`

**Max File Size:** 10 MB

**Folder Structure:**
```
applications/
  ├── {tenantId}/
  │   ├── {applicationId}/
  │   │   ├── proof-of-income.pdf
  │   │   ├── bank-statement.pdf
  │   │   ├── references.pdf
  │   │   └── previous-lease.pdf
```

**Who Can Upload:**
- Tenants (for their applications)

**Code Usage:**
```typescript
// Example: Upload application document
const filePath = `${tenantId}/${applicationId}/proof-of-income.pdf`;

const { error } = await supabase.storage
  .from('applications')
  .upload(filePath, file);
```

---

### 8. support-attachments 💬

**Purpose:** Attachments for support tickets

**Access Level:** Private (ticket creator + assigned admin)

**File Types:**
- `application/pdf`
- `image/jpeg`, , `image/png`, `image/webp`
- `video/mp4`

**Max File Size:** 10 MB

**Folder Structure:**
```
support-attachments/
  ├── {userId}/
  │   ├── {ticketId}/
  │   │   ├── screenshot.png
  │   │   └── error-log.pdf
```

**Who Can Upload:**
- Users (to their tickets)
- Admins (to any ticket)

**Code Usage:**
```typescript
// Example: Upload support attachment
const filePath = `${userId}/${ticketId}/attachment-${Date.now()}.png`;

const { error } = await supabase.storage
  .from('support-attachments')
  .upload(filePath, file);
```

## 🔒 Storage Policies

All buckets have Row Level Security (RLS) policies configured to ensure data privacy and security.

### Policy Principles

1. **Ownership-Based Access**: Users can only access files in their own folders
2. **Role-Based Access**: Admins have broader access for moderation
3. **Relationship-Based Access**: Landlords can access files related to their properties
4. **Public vs Private**: Only property images and avatars are publicly accessible

### Policy Summary by Bucket

| Bucket | Public Read | Authenticated Upload | Admin Full Access |
|--------|-------------|---------------------|-------------------|
| property-images | ✅ Yes | Landlords only | ✅ Yes |
| documents | ❌ No (owner only) | Users | ✅ Yes |
| avatars | ✅ Yes | Users | ✅ Yes |
| maintenance-media | ❌ No (related users) | Tenants/Landlords | ✅ Yes |
| receipts | ❌ No (parties only) | System/Tenants | ✅ Yes |
| agreements | ❌ No (parties only) | System/Landlords | ✅ Yes |
| applications | ❌ No (parties only) | Tenants | ✅ Yes |
| support-attachments | ❌ No (related users) | Users | ✅ Yes |

## 📝 Usage Patterns

### Pattern 1: User-Owned Files (Simple)

**Buckets:** `documents`, `avatars`

**Pattern:**
```
{bucketName}/{userId}/{filename}
```

**Access:** User can only access files in their own folder

**Example:**
```typescript
// Upload
const filePath = `${auth.uid()}/profile.jpg`;
await supabase.storage.from('avatars').upload(filePath, file);

// Retrieve
const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
```

### Pattern 2: Relationship-Based Access

**Buckets:** `maintenance-media`, `receipts`, `agreements`, `applications`

**Pattern:**
```
{bucketName}/{ownerId}/{relationId}/{filename}
```

**Access:** Owner + related parties (landlord/tenant) + admins

**Example:**
```typescript
// Upload maintenance photo
const filePath = `${tenantId}/${requestId}/photo-1.jpg`;
await supabase.storage.from('maintenance-media').upload(filePath, file);
```

### Pattern 3: Property-Related Files

**Buckets:** `property-images`

**Pattern:**
```
{bucketName}/{propertyId}/{timestamp}-{index}.{ext}
```

**Access:** Public read, landlord write

**Example:**
```typescript
// Upload property image
const filePath = `${propertyId}/${Date.now()}-0.jpg`;
await supabase.storage.from('property-images').upload(filePath, file);
```

## 📏 File Size Limits

| Bucket | Max Size | Reason |
|--------|----------|--------|
| property-images | 5 MB | High-quality property photos |
| documents | 10 MB | Scanned documents may be larger |
| avatars | 2 MB | Profile pictures should be optimized |
| maintenance-media | 20 MB | Videos require more space |
| receipts | 5 MB | PDF receipts |
| agreements | 10 MB | Multi-page PDF contracts |
| applications | 10 MB | Multiple scanned documents |
| support-attachments | 10 MB | Various file types |

## 🛡️ Security Considerations

### 1. File Validation

**Client-Side:**
- Validate file types before upload
- Check file size limits
- Preview images before upload

**Server-Side:**
- Bucket MIME type restrictions enforced by Supabase
- File size limits enforced by Supabase
- Additional validation in Edge Functions if needed

### 2. Access Control

**Folder Structure:**
- First folder level should be user ID for owner-based access
- RLS policies enforce access based on auth.uid()
- Admins have override access for moderation

**URL Security:**
- Private buckets require authenticated requests
- Public URLs expire based on Supabase configuration
- Signed URLs can be used for temporary access

### 3. Data Privacy

**PII Protection:**
- Verification documents are private
- Application documents contain sensitive information
- Only authorized users can access

**GDPR Compliance:**
- Users can delete their own files
- Admins can delete files for compliance
- File deletion cascades when user is deleted

## 🔧 Troubleshooting

### Error: "Bucket not found"

**Cause:** Storage bucket hasn't been created

**Solution:**
1. Run `database/storage-buckets-setup.sql` in Supabase SQL Editor
2. Verify buckets exist in Storage dashboard

### Error: "Permission denied"

**Cause:** User doesn't have access to upload/view file

**Solution:**
1. Check user is authenticated: `supabase.auth.getUser()`
2. Verify file path follows naming convention (starts with user ID)
3. Check user role matches bucket policy requirements
4. Review RLS policies in SQL script

### Error: "File size exceeds limit"

**Cause:** File is larger than bucket's max file size

**Solution:**
1. Compress/resize image before upload
2. For videos, use lower resolution or shorter clips
3. Split large documents into multiple files

### Error: "Invalid MIME type"

**Cause:** File type not allowed in bucket

**Solution:**
1. Convert file to allowed format
2. Check `allowed_mime_types` in bucket configuration
3. Use appropriate bucket for file type (e.g., PDFs in `documents`, not `property-images`)

### Upload succeeds but file not accessible

**Cause:** Missing public URL retrieval or incorrect path

**Solution:**
```typescript
// For public buckets
const { data } = supabase.storage
  .from('property-images')
  .getPublicUrl(filePath);

// For private buckets (requires auth)
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

### Files not appearing in application

**Cause:** Database record not updated with file URL

**Solution:**
```typescript
// After upload, update database
const { data: uploadData } = await supabase.storage
  .from('property-images')
  .upload(filePath, file);

const { data: { publicUrl } } = supabase.storage
  .from('property-images')
  .getPublicUrl(filePath);

// Update property record
await supabase
  .from('properties')
  .update({ images: [...existingImages, publicUrl] })
  .eq('id', propertyId);
```

## 📚 Additional Resources

### Related Files
- `storage-buckets-setup.sql` - SQL script to create buckets and policies
- `schema.sql` - Main database schema
- `src/services/propertyService.ts` - Property image upload implementation
- `src/pages/landlord/Profile.tsx` - Document upload implementation

### Supabase Documentation
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage Best Practices](https://supabase.com/docs/guides/storage/best-practices)

### Testing Checklist

- [ ] Run storage-buckets-setup.sql
- [ ] Verify 8 buckets created in dashboard
- [ ] Test property image upload as landlord
- [ ] Test document upload on profile page
- [ ] Test avatar upload
- [ ] Verify private bucket access control
- [ ] Test file deletion
- [ ] Check file size limits work correctly
- [ ] Verify MIME type restrictions

## 🎉 Success!

Once setup is complete, your RentFlow application will have a fully functional, secure, and organized file storage system. All existing code references to storage buckets will work seamlessly.

For questions or issues, please refer to the troubleshooting section or contact support.
