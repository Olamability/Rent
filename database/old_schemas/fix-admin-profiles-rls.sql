-- ============================================================================
-- Fix Admin Profiles RLS Policies
-- Date: January 6, 2026
-- Description: Add missing RLS policy for admins to view all admin profiles
-- This is needed for proper admin management functionality
-- ============================================================================

-- Drop existing overly restrictive policy for viewing all admin profiles
DROP POLICY IF EXISTS "Super admins can view all admin profiles" ON public.admin_profiles;

-- Recreate with correct permissions for both SELECT and other operations
-- Super admins need full access to all admin profiles for management
CREATE POLICY "Super admins can view all admin profiles" 
ON public.admin_profiles 
FOR SELECT
USING (public.is_super_admin());

-- Add policy for admins to view other admin profiles (for collaboration)
-- This allows admins to see each other but not modify each other's profiles
CREATE POLICY "Admins can view all admin profiles" 
ON public.admin_profiles 
FOR SELECT
USING (public.is_admin());

-- Ensure the existing "FOR ALL" policy is properly configured
-- This policy already exists but let's ensure it covers all operations for super admins
DROP POLICY IF EXISTS "Super admins can manage all admin profiles" ON public.admin_profiles;

CREATE POLICY "Super admins can manage all admin profiles" 
ON public.admin_profiles 
FOR ALL
USING (public.is_super_admin());

-- Verify the policies are correctly set up
-- You can run this query after applying the migration to check:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'admin_profiles'
-- ORDER BY policyname;
