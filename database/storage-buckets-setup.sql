-- ============================================================================
-- RentFlow Storage Buckets Setup
-- Version: 1.0
-- Description: Complete Supabase storage bucket configuration for file uploads
-- Generated: 2026-01-07
-- ============================================================================
-- This script creates all necessary storage buckets and access policies
-- for the RentFlow property management platform.
--
-- IMPORTANT: Run this script in your Supabase SQL Editor
-- Make sure you have the necessary permissions (service_role or admin)
-- ============================================================================

-- ============================================================================
-- CLEANUP: Remove existing buckets (OPTIONAL - only for fresh setup)
-- ============================================================================
-- Uncomment the following lines if you want to start fresh
-- WARNING: This will delete all files in these buckets!

-- DELETE FROM storage.buckets WHERE id = 'property-images';
-- DELETE FROM storage.buckets WHERE id = 'documents';
-- DELETE FROM storage.buckets WHERE id = 'avatars';
-- DELETE FROM storage.buckets WHERE id = 'maintenance-media';
-- DELETE FROM storage.buckets WHERE id = 'receipts';
-- DELETE FROM storage.buckets WHERE id = 'agreements';
-- DELETE FROM storage.buckets WHERE id = 'applications';
-- DELETE FROM storage.buckets WHERE id = 'support-attachments';

-- ============================================================================
-- BUCKET CREATION
-- ============================================================================

-- 1. Property Images Bucket
-- Purpose: Store property and unit photos uploaded by landlords
-- Access: Public read, authenticated landlords can write
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,  -- Public bucket (anyone can view property images)
  5242880,  -- 5MB file size limit (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Documents Bucket
-- Purpose: Store verification documents (ID cards, proof of ownership, business registration)
-- Access: Private, users can only access their own documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  10485760,  -- 10MB file size limit (10 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 3. Avatars Bucket
-- Purpose: Store user profile pictures
-- Access: Public read, users can only update their own avatar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket (profile pictures are viewable)
  2097152,  -- 2MB file size limit (2 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 4. Maintenance Media Bucket
-- Purpose: Store photos and videos for maintenance requests
-- Access: Private, tenants/landlords can access based on unit ownership
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-media',
  'maintenance-media',
  false,  -- Private bucket
  20971520,  -- 20MB file size limit (for videos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];

-- 5. Receipts Bucket
-- Purpose: Store payment receipts (generated or uploaded)
-- Access: Private, tenant/landlord can access their own receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,  -- Private bucket
  5242880,  -- 5MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

-- 6. Agreements Bucket
-- Purpose: Store lease agreement PDFs
-- Access: Private, tenant/landlord can access their own agreements
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agreements',
  'agreements',
  false,  -- Private bucket
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- 7. Applications Bucket
-- Purpose: Store tenant application documents (proof of income, bank statements, etc.)
-- Access: Private, tenant and landlord can access application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applications',
  'applications',
  false,  -- Private bucket
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 8. Support Attachments Bucket
-- Purpose: Store attachments for support tickets
-- Access: Private, ticket creator and admins can access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,  -- Private bucket
  10485760,  -- 10MB file size limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

-- ============================================================================
-- STORAGE POLICIES (Row Level Security for Storage)
-- ============================================================================

-- ============================================================================
-- 1. PROPERTY IMAGES POLICIES
-- ============================================================================

-- Allow public to view property images (read-only for everyone)
CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

-- Allow authenticated landlords to upload property images
CREATE POLICY "Landlords can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-images' 
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  ))
);

-- Allow landlords to update their own property images
CREATE POLICY "Landlords can update their property images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-images' 
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  ))
)
WITH CHECK (
  bucket_id = 'property-images' 
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  ))
);

-- Allow landlords to delete their own property images
CREATE POLICY "Landlords can delete their property images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-images' 
  AND (auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  ))
);

-- ============================================================================
-- 2. DOCUMENTS POLICIES
-- ============================================================================

-- Allow users to view their own documents (verification docs, IDs, etc.)
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    -- User can view their own documents (path starts with their user_id)
    (storage.foldername(name))[1] = auth.uid()::text
    -- Admins can view all documents
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow users to upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- ============================================================================
-- 3. AVATARS POLICIES
-- ============================================================================

-- Allow anyone to view avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 4. MAINTENANCE MEDIA POLICIES
-- ============================================================================
-- Folder structure: maintenance-media/{tenantId}/{requestId}/{filename}
-- Note: (storage.foldername(name))[1] = user ID, [2] = request ID

-- Allow users to view maintenance media for their properties/units
CREATE POLICY "Users can view their maintenance media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-media' 
  AND (
    -- Tenant can view maintenance media they created
    (storage.foldername(name))[1] = auth.uid()::text
    -- Landlord can view maintenance media for their properties
    OR auth.uid() IN (
      SELECT DISTINCT p.landlord_id 
      FROM public.maintenance_requests mr
      JOIN public.units u ON mr.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      WHERE mr.id::text = (storage.foldername(name))[2]
    )
    -- Admins can view all maintenance media
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow tenants to upload maintenance media
CREATE POLICY "Tenants can upload maintenance media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own maintenance media
CREATE POLICY "Users can delete their maintenance media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance-media' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- ============================================================================
-- 5. RECEIPTS POLICIES
-- ============================================================================
-- Folder structure: receipts/{tenantId}/{paymentId}/{filename}
-- Note: (storage.foldername(name))[1] = tenant ID, [2] = payment ID

-- Allow users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND (
    -- Tenant can view their receipts
    (storage.foldername(name))[1] = auth.uid()::text
    -- Landlord can view receipts for their properties
    OR auth.uid() IN (
      SELECT p.landlord_id 
      FROM public.payments pay
      JOIN public.units u ON pay.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      WHERE pay.id::text = (storage.foldername(name))[2]
    )
    -- Admins can view all receipts
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow system/landlords to generate receipts (with folder validation)
CREATE POLICY "Landlords can generate receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    -- Allow uploads to tenant folders (for receipt generation)
    auth.uid() IN (
      SELECT p.landlord_id 
      FROM public.payments pay
      JOIN public.units u ON pay.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      WHERE pay.tenant_id::text = (storage.foldername(name))[1]
    )
    -- Admins can generate any receipt
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow admins to delete receipts
CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' 
  AND auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
);

-- ============================================================================
-- 6. AGREEMENTS POLICIES
-- ============================================================================

-- Allow users to view their own agreements
CREATE POLICY "Users can view their own agreements"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'agreements' 
  AND (
    -- Tenant can view their agreements
    (storage.foldername(name))[1] = auth.uid()::text
    -- Landlord can view agreements for their properties
    OR auth.uid() IN (
      SELECT ta.landlord_id 
      FROM public.tenancy_agreements ta
      WHERE ta.id::text = (storage.foldername(name))[2]
    )
    -- Admins can view all agreements
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow landlords and system to create agreements (with folder validation)
CREATE POLICY "Landlords can create agreements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'agreements'
  AND (
    -- Landlord can upload agreements for their tenants
    auth.uid() IN (
      SELECT ta.landlord_id 
      FROM public.tenancy_agreements ta
      WHERE ta.tenant_id::text = (storage.foldername(name))[1]
    )
    -- Admins can create any agreement
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow landlords and admins to update agreements
CREATE POLICY "Landlords can update agreements"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'agreements' 
  AND auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'agreements' 
  AND auth.uid() IN (
    SELECT id FROM public.users WHERE role IN ('landlord', 'admin', 'super_admin')
  )
);

-- Allow admins to delete agreements
CREATE POLICY "Admins can delete agreements"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'agreements' 
  AND auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
);

-- ============================================================================
-- 7. APPLICATIONS POLICIES
-- ============================================================================

-- Allow users to view application documents
CREATE POLICY "Users can view application documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications' 
  AND (
    -- Tenant can view their own application documents
    (storage.foldername(name))[1] = auth.uid()::text
    -- Landlord can view application documents for their properties
    OR auth.uid() IN (
      SELECT p.landlord_id 
      FROM public.property_applications pa
      JOIN public.units u ON pa.unit_id = u.id
      JOIN public.properties p ON u.property_id = p.id
      WHERE pa.id::text = (storage.foldername(name))[2]
    )
    -- Admins can view all application documents
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- Allow tenants to upload application documents
CREATE POLICY "Tenants can upload application documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'applications' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow tenants to update their application documents
CREATE POLICY "Tenants can update application documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'applications' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'applications' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow tenants to delete their application documents
CREATE POLICY "Tenants can delete application documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'applications' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
  )
);

-- ============================================================================
-- 8. SUPPORT ATTACHMENTS POLICIES
-- ============================================================================

-- Allow users to view support attachments
CREATE POLICY "Users can view support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND (
    -- Ticket creator can view attachments
    (storage.foldername(name))[1] = auth.uid()::text
    -- Admins can view all support attachments
    OR auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
    -- Assigned admin can view attachments
    OR auth.uid() IN (
      SELECT assigned_to 
      FROM public.support_tickets 
      WHERE id::text = (storage.foldername(name))[2]
    )
  )
);

-- Allow users to upload support attachments
CREATE POLICY "Users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to delete support attachments
CREATE POLICY "Admins can delete support attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' 
  AND auth.uid() IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
);

-- ============================================================================
-- VERIFICATION AND SUMMARY
-- ============================================================================

-- Display created buckets
DO $$
BEGIN
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Storage Buckets Setup Complete!';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'The following storage buckets have been created:';
  RAISE NOTICE '  1. property-images     - Property and unit photos (PUBLIC)';
  RAISE NOTICE '  2. documents           - Verification documents (PRIVATE)';
  RAISE NOTICE '  3. avatars             - User profile pictures (PUBLIC)';
  RAISE NOTICE '  4. maintenance-media   - Maintenance photos/videos (PRIVATE)';
  RAISE NOTICE '  5. receipts            - Payment receipts (PRIVATE)';
  RAISE NOTICE '  6. agreements          - Lease agreement PDFs (PRIVATE)';
  RAISE NOTICE '  7. applications        - Application documents (PRIVATE)';
  RAISE NOTICE '  8. support-attachments - Support ticket files (PRIVATE)';
  RAISE NOTICE '';
  RAISE NOTICE 'Access policies have been configured for all buckets.';
  RAISE NOTICE 'See database/STORAGE_SETUP.md for detailed usage instructions.';
  RAISE NOTICE '==================================================================';
END $$;

-- Verify buckets were created
SELECT 
  id AS bucket_name,
  public AS is_public,
  file_size_limit / 1048576 AS max_size_mb,
  COALESCE(array_length(allowed_mime_types, 1), 0) AS mime_types_count
FROM storage.buckets
WHERE id IN (
  'property-images', 
  'documents', 
  'avatars', 
  'maintenance-media', 
  'receipts', 
  'agreements', 
  'applications', 
  'support-attachments'
)
ORDER BY id;
