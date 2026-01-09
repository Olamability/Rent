-- ============================================================================
-- Database Schema Verification and Fix Script
-- Date: January 6, 2026
-- Purpose: Verify database schema matches expected structure and apply fixes
-- ============================================================================

-- ============================================================================
-- PART 1: VERIFICATION QUERIES
-- ============================================================================
-- Run these first to see what needs fixing

-- Check platform_announcements columns
SELECT 'platform_announcements columns:' as check_type;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'platform_announcements'
ORDER BY ordinal_position;
-- EXPECTED: content (TEXT), author_id (UUID)
-- IF YOU SEE: message or created_by, continue to PART 2

-- Check subscriptions columns
SELECT 'subscriptions columns:' as check_type;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'subscriptions'
AND column_name IN ('plan', 'subscription_plan', 'status', 'subscription_status');
-- EXPECTED: subscription_plan, subscription_status
-- IF YOU SEE: plan or status (without subscription_ prefix), column names are wrong

-- Check maintenance_requests columns
SELECT 'maintenance_requests columns:' as check_type;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'maintenance_requests'
AND column_name IN ('status', 'request_status');
-- EXPECTED: request_status
-- IF YOU SEE: status, column name is wrong

-- Check payments columns
SELECT 'payments columns:' as check_type;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
AND column_name IN ('status', 'payment_status', 'paid_at', 'paid_date');
-- EXPECTED: status, paid_at
-- IF YOU SEE: payment_status or paid_date, column names are wrong

-- Check if tenancies table exists (it should NOT)
SELECT 'tenancies table check:' as check_type;
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tenancies'
  ) THEN 'ERROR: tenancies table exists but should be tenancy_agreements'
  ELSE 'OK: No tenancies table found'
END as status;

-- Check tenancy_agreements table
SELECT 'tenancy_agreements columns:' as check_type;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'tenancy_agreements'
AND column_name LIKE '%status%';
-- EXPECTED: agreement_status

-- Check admin_profiles RLS policies
SELECT 'admin_profiles RLS policies:' as check_type;
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'admin_profiles'
ORDER BY policyname;
-- EXPECTED: Multiple policies including ones for admins (not just super_admins)

-- ============================================================================
-- PART 2: APPLY FIXES (Only if Part 1 shows issues)
-- ============================================================================

-- ============================================================================
-- FIX 1: Platform Announcements Column Names
-- ============================================================================
-- Rename message to content if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'platform_announcements' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE public.platform_announcements RENAME COLUMN message TO content;
    RAISE NOTICE 'Renamed platform_announcements.message to content';
  ELSE
    RAISE NOTICE 'platform_announcements.content already exists - no change needed';
  END IF;
END $$;

-- Rename created_by to author_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'platform_announcements' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.platform_announcements RENAME COLUMN created_by TO author_id;
    RAISE NOTICE 'Renamed platform_announcements.created_by to author_id';
    
    -- Update index
    DROP INDEX IF EXISTS idx_platform_announcements_created_by;
    CREATE INDEX IF NOT EXISTS idx_platform_announcements_author_id 
      ON public.platform_announcements(author_id);
    RAISE NOTICE 'Updated index for author_id';
  ELSE
    RAISE NOTICE 'platform_announcements.author_id already exists - no change needed';
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Payments Column Names  
-- ============================================================================
-- Rename payment_status to status if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN payment_status TO status;
    RAISE NOTICE 'Renamed payments.payment_status to status';
  ELSE
    RAISE NOTICE 'payments.status already exists - no change needed';
  END IF;
END $$;

-- Rename paid_date to paid_at if it exists and convert to TIMESTAMPTZ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'payments' 
    AND column_name = 'paid_date'
  ) THEN
    ALTER TABLE public.payments RENAME COLUMN paid_date TO paid_at;
    ALTER TABLE public.payments ALTER COLUMN paid_at TYPE TIMESTAMPTZ 
      USING paid_at::TIMESTAMPTZ;
    RAISE NOTICE 'Renamed and converted payments.paid_date to paid_at (TIMESTAMPTZ)';
  ELSE
    RAISE NOTICE 'payments.paid_at already exists - no change needed';
  END IF;
END $$;

-- Update status constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_status_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments 
  ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'paid', 'failed', 'overdue', 'partial'));

-- Recreate index
DROP INDEX IF EXISTS idx_payments_status;
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- ============================================================================
-- FIX 3: Ensure Correct Table Names
-- ============================================================================
-- Note: We do NOT create a tenancies table
-- The correct table is tenancy_agreements which should already exist
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'tenancy_agreements'
  ) THEN 'OK: tenancy_agreements table exists'
  ELSE 'ERROR: tenancy_agreements table missing - run schema.sql'
END as tenancy_check;

-- ============================================================================
-- FIX 4: Admin Profiles RLS Policies
-- ============================================================================
-- Drop and recreate policies for admin_profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can view all admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can manage all admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can view all admin profiles" ON public.admin_profiles;

-- Recreate with correct permissions
-- Policy 1: Admins can view own profile (already exists, keep it)
-- Policy 2: Admins can update own profile (already exists, keep it)

-- Policy 3: Admins can view ALL admin profiles (for collaboration)
CREATE POLICY "Admins can view all admin profiles" 
ON public.admin_profiles 
FOR SELECT
USING (public.is_admin());

-- Policy 4: Super admins have full access to all admin profiles
CREATE POLICY "Super admins can manage all admin profiles" 
ON public.admin_profiles 
FOR ALL
USING (public.is_super_admin());

-- Policy 5: Service role can insert admin profiles (already exists, keep it)
-- Policy 6: Admins can view own profile (already exists, keep it)
-- Policy 7: Admins can update own profile (already exists, keep it)

-- ============================================================================
-- PART 3: FINAL VERIFICATION
-- ============================================================================

-- Verify all columns are correct
SELECT 'FINAL VERIFICATION' as check_type;

SELECT 
  'platform_announcements' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'platform_announcements' 
      AND column_name = 'content'
    ) THEN '✓ has content column'
    ELSE '✗ missing content column'
  END as content_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'platform_announcements' 
      AND column_name = 'author_id'
    ) THEN '✓ has author_id column'
    ELSE '✗ missing author_id column'
  END as author_id_check;

SELECT 
  'payments' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'status'
    ) THEN '✓ has status column'
    ELSE '✗ missing status column'
  END as status_check,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'payments' 
      AND column_name = 'paid_at'
      AND data_type = 'timestamp with time zone'
    ) THEN '✓ has paid_at (TIMESTAMPTZ) column'
    ELSE '✗ missing or wrong type paid_at column'
  END as paid_at_check;

SELECT 
  'subscriptions' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'subscriptions' 
      AND column_name = 'subscription_plan'
    ) THEN '✓ has subscription_plan column'
    ELSE '✗ missing subscription_plan column'
  END as plan_check;

SELECT 
  'maintenance_requests' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'maintenance_requests' 
      AND column_name = 'request_status'
    ) THEN '✓ has request_status column'
    ELSE '✗ missing request_status column'
  END as status_check;

-- Verify RLS policies
SELECT 
  'admin_profiles RLS' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✓ Has expected policies'
    ELSE '✗ Missing some policies'
  END as policy_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'admin_profiles';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Schema verification and fixes completed!';
  RAISE NOTICE 'Review the output above to confirm all checks passed.';
  RAISE NOTICE 'If any checks show ✗, please review the errors and consult';
  RAISE NOTICE 'the CRITICAL_SCHEMA_FIXES.md document for troubleshooting.';
  RAISE NOTICE '============================================================';
END $$;
