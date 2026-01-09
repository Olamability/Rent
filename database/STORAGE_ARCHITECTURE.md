# 📊 Storage Buckets Architecture Diagram

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RENTFLOW STORAGE                             │
│                    (8 Supabase Storage Buckets)                     │
└─────────────────────────────────────────────────────────────────────┘
           │
           ├── PUBLIC BUCKETS (2) ─────────────────┐
           │   ├── property-images                 │ Anyone can VIEW
           │   │   └── 5MB, Images only            │ Landlords can UPLOAD
           │   │                                    │
           │   └── avatars                         │ Anyone can VIEW
           │       └── 2MB, Images only            │ Users can UPLOAD own
           │                                        │
           └── PRIVATE BUCKETS (6) ────────────────┤
               │                                    │ Owner + Related + Admins
               ├── documents                       │
               │   └── 10MB, Images + PDFs         │ User-owned files
               │                                    │
               ├── maintenance-media               │
               │   └── 20MB, Images + Videos       │ Tenant + Landlord + Admin
               │                                    │
               ├── receipts                        │
               │   └── 5MB, Images + PDFs          │ Tenant + Landlord + Admin
               │                                    │
               ├── agreements                      │
               │   └── 10MB, PDFs only             │ Both parties + Admin
               │                                    │
               ├── applications                    │
               │   └── 10MB, Images + PDFs         │ Applicant + Landlord + Admin
               │                                    │
               └── support-attachments             │
                   └── 10MB, Images + PDFs + Videos│ Creator + Assigned Admin
```

## Bucket Details

### 1. property-images (PUBLIC)
```
┌─────────────────────────────────────────┐
│  property-images/                       │
│  ├── {propertyId}/                      │
│  │   ├── 1704672000000-0.jpg           │  5MB max
│  │   ├── 1704672000000-1.jpg           │  JPEG, PNG, WebP, GIF
│  │   └── 1704672000000-2.jpg           │  
│  │                                       │
│  └── {propertyId2}/                     │  PUBLIC READ
│      └── ...                            │  LANDLORDS UPLOAD
└─────────────────────────────────────────┘
```

### 2. documents (PRIVATE)
```
┌─────────────────────────────────────────┐
│  documents/                              │
│  ├── landlord-verification/             │
│  │   ├── {userId}/                      │  10MB max
│  │   │   ├── idCard-timestamp.pdf      │  JPEG, PNG, WebP, PDF
│  │   │   ├── proofOfOwnership.pdf      │
│  │   │   └── businessReg.pdf           │  OWNER + ADMINS
│  │   │                                  │
│  └── tenant-verification/               │
│      └── {userId}/                      │
│          └── nationalId.pdf             │
└─────────────────────────────────────────┘
```

### 3. avatars (PUBLIC)
```
┌─────────────────────────────────────────┐
│  avatars/                                │
│  ├── {userId}/                          │  2MB max
│  │   └── profile.jpg                    │  JPEG, PNG, WebP
│  │                                       │
│  ├── {userId2}/                         │  PUBLIC READ
│  │   └── profile.jpg                    │  USER CAN UPLOAD OWN
│  │                                       │
│  └── {userId3}/                         │
│      └── profile.jpg                    │
└─────────────────────────────────────────┘
```

### 4. maintenance-media (PRIVATE)
```
┌─────────────────────────────────────────┐
│  maintenance-media/                      │
│  ├── {tenantId}/                        │  20MB max
│  │   ├── {requestId}/                   │  JPEG, PNG, WebP
│  │   │   ├── photo-1.jpg               │  MP4, QuickTime, AVI
│  │   │   ├── photo-2.jpg               │
│  │   │   └── video-1.mp4               │  TENANT + LANDLORD
│  │   │                                  │  + ADMINS
│  └── {tenantId2}/                       │
│      └── {requestId}/                   │
│          └── ...                        │
└─────────────────────────────────────────┘
```

### 5. receipts (PRIVATE)
```
┌─────────────────────────────────────────┐
│  receipts/                               │
│  ├── {tenantId}/                        │  5MB max
│  │   ├── {paymentId}/                   │  PDF, JPEG, PNG
│  │   │   └── receipt.pdf                │
│  │   │                                  │  TENANT + LANDLORD
│  │   └── {paymentId2}/                  │  + ADMINS
│  │       └── receipt.pdf                │
│  │                                       │
│  └── {tenantId2}/                       │
│      └── ...                            │
└─────────────────────────────────────────┘
```

### 6. agreements (PRIVATE)
```
┌─────────────────────────────────────────┐
│  agreements/                             │
│  ├── {tenantId}/                        │  10MB max
│  │   ├── {agreementId}/                 │  PDF only
│  │   │   └── lease-agreement.pdf        │
│  │   │                                  │  BOTH PARTIES
│  │   └── {agreementId2}/                │  + ADMINS
│  │       └── lease-agreement.pdf        │
│  │                                       │
│  └── {tenantId2}/                       │
│      └── ...                            │
└─────────────────────────────────────────┘
```

### 7. applications (PRIVATE)
```
┌─────────────────────────────────────────┐
│  applications/                           │
│  ├── {tenantId}/                        │  10MB max
│  │   ├── {applicationId}/               │  PDF, JPEG, PNG, WebP
│  │   │   ├── proof-of-income.pdf       │
│  │   │   ├── bank-statement.pdf        │  APPLICANT + LANDLORD
│  │   │   ├── references.pdf            │  + ADMINS
│  │   │   └── previous-lease.pdf        │
│  │   │                                  │
│  └── {tenantId2}/                       │
│      └── ...                            │
└─────────────────────────────────────────┘
```

### 8. support-attachments (PRIVATE)
```
┌─────────────────────────────────────────┐
│  support-attachments/                    │
│  ├── {userId}/                          │  10MB max
│  │   ├── {ticketId}/                    │  PDF, JPEG, PNG
│  │   │   ├── screenshot.png            │  WebP, MP4
│  │   │   └── error-log.pdf             │
│  │   │                                  │  CREATOR + ASSIGNED
│  │   └── {ticketId2}/                   │  ADMIN
│  │       └── ...                        │
│  │                                       │
│  └── {userId2}/                         │
│      └── ...                            │
└─────────────────────────────────────────┘
```

## Access Control Matrix

| Bucket | Public Read | Owner Upload | Landlord Access | Tenant Access | Admin Access |
|--------|-------------|--------------|-----------------|---------------|--------------|
| property-images | ✅ Yes | Landlord | ✅ Own props | ❌ No | ✅ All |
| documents | ❌ No | ✅ Own | ❌ No | ❌ No | ✅ All |
| avatars | ✅ Yes | ✅ Own | ❌ No | ❌ No | ✅ All |
| maintenance-media | ❌ No | Tenant | ✅ Own props | ✅ Own requests | ✅ All |
| receipts | ❌ No | System/Tenant | ✅ Own props | ✅ Own | ✅ All |
| agreements | ❌ No | System/Landlord | ✅ Own | ✅ Own | ✅ All |
| applications | ❌ No | Tenant | ✅ Related props | ✅ Own | ✅ All |
| support-attachments | ❌ No | ✅ Own | ❌ No | ❌ No | ✅ All |

## Folder Naming Patterns

### Pattern 1: User-Owned (Simple)
```
{bucket}/{userId}/{filename}
```
**Example:** `avatars/123e4567-e89b-12d3-a456-426614174000/profile.jpg`

**Used by:** documents, avatars

### Pattern 2: User + Relationship
```
{bucket}/{ownerId}/{relationId}/{filename}
```
**Example:** `maintenance-media/tenant-id/request-id/photo-1.jpg`

**Used by:** maintenance-media, receipts, agreements, applications, support-attachments

### Pattern 3: Property-Based
```
{bucket}/{propertyId}/{timestamp}-{index}.{ext}
```
**Example:** `property-images/prop-id/1704672000000-0.jpg`

**Used by:** property-images

## Security Flow

```
┌─────────────┐
│  User       │
│  Uploads    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  1. Authentication Check    │  ◄── Supabase Auth
│     auth.uid() exists?      │
└──────┬──────────────────────┘
       │ ✅ Authenticated
       ▼
┌─────────────────────────────┐
│  2. Bucket Check            │
│     Public or Private?      │
└──────┬──────────────────────┘
       │
       ├─► PUBLIC ──────────────┐
       │                        │
       └─► PRIVATE             │
            │                   │
            ▼                   ▼
    ┌───────────────┐   ┌──────────────┐
    │  3. RLS       │   │  3. Direct   │
    │     Policy    │   │     Access   │
    │     Check     │   │              │
    └───────┬───────┘   └──────────────┘
            │
            ├─► Owner? ──────────► ✅ Allow
            ├─► Related Party? ──► ✅ Allow
            ├─► Admin? ──────────► ✅ Allow
            └─► Other ───────────► ❌ Deny
```

## File Size Limits Summary

```
┌────────────────────────────────────────┐
│  2MB  │ avatars                        │  Small, optimized
├────────────────────────────────────────┤
│  5MB  │ property-images, receipts      │  High-quality images
├────────────────────────────────────────┤
│ 10MB  │ documents, agreements,         │  Multi-page PDFs
│       │ applications, support-attach.  │
├────────────────────────────────────────┤
│ 20MB  │ maintenance-media              │  Videos (short clips)
└────────────────────────────────────────┘
```

## Quick Code Reference

### Upload Pattern
```typescript
// 1. Construct file path
const filePath = `${userId}/${subfolder}/${filename}`;

// 2. Upload file
const { error } = await supabase.storage
  .from('bucket-name')
  .upload(filePath, file);

// 3. Get URL
const { data: { publicUrl } } = supabase.storage
  .from('bucket-name')
  .getPublicUrl(filePath);  // For public buckets

// OR for private buckets:
const { data, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl(filePath, 3600);  // 1 hour expiry
```

### Delete Pattern
```typescript
await supabase.storage
  .from('bucket-name')
  .remove([filePath]);
```

## Implementation Checklist

- [ ] Run `storage-buckets-setup.sql` in Supabase SQL Editor
- [ ] Verify 8 buckets appear in Storage dashboard
- [ ] Check each bucket has correct:
  - [ ] Public/Private setting
  - [ ] File size limit
  - [ ] Allowed MIME types
- [ ] Test upload to public bucket (property-images)
- [ ] Test upload to private bucket (documents)
- [ ] Verify RLS policies block unauthorized access
- [ ] Test file deletion
- [ ] Update application code to use buckets

## See Also

- **[STORAGE_SETUP.md](./STORAGE_SETUP.md)** - Complete implementation guide
- **[STORAGE_QUICK_REF.md](./STORAGE_QUICK_REF.md)** - Quick reference
- **[storage-buckets-setup.sql](./storage-buckets-setup.sql)** - SQL setup script
- **[README.md](./README.md)** - Database documentation

---

**Version:** 1.0  
**Last Updated:** January 7, 2026
