# 📦 Storage Buckets Quick Reference

Quick reference for RentFlow storage buckets. For detailed documentation, see [STORAGE_SETUP.md](./STORAGE_SETUP.md).

## 🚀 Setup

```bash
# 1. Open Supabase SQL Editor
# 2. Run: database/storage-buckets-setup.sql
# 3. Verify buckets created in Storage dashboard
```

## 📋 Bucket Summary

| Bucket | Public? | Max Size | Use Case | Who Can Upload |
|--------|---------|----------|----------|----------------|
| `property-images` | ✅ Yes | 5MB | Property photos | Landlords, Admins |
| `documents` | ❌ No | 10MB | Verification docs | Users (own folder) |
| `avatars` | ✅ Yes | 2MB | Profile pictures | Users (own) |
| `maintenance-media` | ❌ No | 20MB | Maintenance photos/videos | Tenants, Landlords |
| `receipts` | ❌ No | 5MB | Payment receipts | System, Tenants |
| `agreements` | ❌ No | 10MB | Lease PDFs | System, Landlords |
| `applications` | ❌ No | 10MB | Application docs | Tenants |
| `support-attachments` | ❌ No | 10MB | Support files | Users, Admins |

## 💻 Code Examples

### Upload to Property Images (Public)

```typescript
import { supabase } from '@/lib/supabase';

// Upload
const fileName = `${propertyId}/${Date.now()}-0.jpg`;
const { error } = await supabase.storage
  .from('property-images')
  .upload(fileName, file);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('property-images')
  .getPublicUrl(fileName);
```

### Upload to Documents (Private)

```typescript
// Upload verification document - follows user-owned pattern
// First folder level MUST be userId for RLS policies to work
const fileName = `${userId}/landlord-verification/idCard-${Date.now()}.pdf`;
const { error } = await supabase.storage
  .from('documents')
  .upload(fileName, file, { upsert: true });

// Get URL (for authenticated users)
const { data } = supabase.storage
  .from('documents')
  .getPublicUrl(fileName);
```

### Upload Avatar

```typescript
const fileName = `${userId}/profile.jpg`;
const { error } = await supabase.storage
  .from('avatars')
  .upload(fileName, file, { upsert: true });

const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(fileName);
```

### Upload Maintenance Media

```typescript
const fileName = `${tenantId}/${requestId}/photo-${Date.now()}.jpg`;
const { error } = await supabase.storage
  .from('maintenance-media')
  .upload(fileName, file);
```

### Delete File

```typescript
await supabase.storage
  .from('property-images')
  .remove([fileName]);
```

## 📁 Folder Structure Patterns

### User-Owned Files
```
{bucket}/{userId}/{filename}
```
**Example:** `avatars/123e4567-e89b-12d3-a456-426614174000/profile.jpg`

### Relationship Files
```
{bucket}/{ownerId}/{relationId}/{filename}
```
**Example:** `maintenance-media/tenant-id/request-id/photo-1.jpg`

### Property Files
```
{bucket}/{propertyId}/{timestamp}-{index}.{ext}
```
**Example:** `property-images/prop-id/1704672000000-0.jpg`

## 🎨 Allowed MIME Types

### Images Only
- `avatars`: JPEG, PNG, WebP

### Images + PDF
- `documents`: JPEG, PNG, WebP, PDF
- `applications`: JPEG, PNG, WebP, PDF
- `receipts`: JPEG, PNG, PDF

### Images + Video
- `maintenance-media`: JPEG, PNG, WebP, MP4, QuickTime, AVI
- `support-attachments`: JPEG, PNG, WebP, PDF, MP4

### PDF Only
- `agreements`: PDF

## ⚠️ Common Errors

### "Bucket not found"
→ Run `storage-buckets-setup.sql`

### "Permission denied"
→ Check user auth and file path starts with user ID

### "File size exceeds limit"
→ Compress file or use different bucket

### "Invalid MIME type"
→ Convert to allowed format

## 🔒 Security Notes

1. **Private buckets** require authentication
2. **First folder** should be user ID for owner-based access
3. **Admins** can access all files
4. **Landlords** can access files for their properties
5. **Public buckets** (property-images, avatars) are world-readable

## 🧪 Testing Checklist

- [ ] Property image upload (landlord)
- [ ] Document upload (profile page)
- [ ] Avatar upload
- [ ] Maintenance photo upload
- [ ] File deletion
- [ ] Access control (can't view other user's files)
- [ ] File size limits
- [ ] MIME type restrictions

## 📚 Full Documentation

See [STORAGE_SETUP.md](./STORAGE_SETUP.md) for:
- Detailed usage patterns
- Complete policy explanations
- Troubleshooting guide
- Security considerations

## 🔗 Related Files

- `storage-buckets-setup.sql` - Setup script
- `src/services/propertyService.ts` - Property images
- `src/pages/landlord/Profile.tsx` - Document upload
- `src/components/shared/FileUploadDialog.tsx` - Upload UI
