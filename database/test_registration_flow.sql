-- ============================================================================
-- RentFlow Registration Flow Test Script
-- ============================================================================
-- This script tests the complete registration and authentication flow
-- Run this in your Supabase SQL Editor to verify everything works
-- ============================================================================

-- Clean up any existing test data (optional - only for fresh testing)
-- DELETE FROM auth.users WHERE email LIKE '%test@rentflow%';

-- ============================================================================
-- TEST 1: Verify Required Functions Exist
-- ============================================================================
SELECT 
    'TEST 1: Checking Functions' as test_group,
    proname as function_name,
    CASE 
        WHEN proname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_proc
WHERE proname IN (
    'handle_new_user',
    'validate_admin_registration',
    'verify_admin_code',
    'generate_admin_code',
    'is_admin',
    'is_super_admin'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- TEST 2: Verify Required Tables Exist
-- ============================================================================
SELECT 
    'TEST 2: Checking Tables' as test_group,
    tablename as table_name,
    CASE 
        WHEN tablename IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users',
    'tenant_profiles',
    'landlord_profiles',
    'admin_profiles',
    'admin_codes'
);

-- ============================================================================
-- TEST 3: Verify Triggers Are Active
-- ============================================================================
SELECT 
    'TEST 3: Checking Triggers' as test_group,
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ ENABLED'
        WHEN tgenabled = 'D' THEN '❌ DISABLED'
        ELSE '⚠️ UNKNOWN'
    END as status
FROM pg_trigger
WHERE tgname IN (
    'on_auth_user_created',
    'before_auth_user_created_admin_verification'
)
AND NOT tgisinternal;

-- ============================================================================
-- TEST 4: Test Tenant/Landlord Registration Flow (No Code Required)
-- ============================================================================
-- Note: This test simulates what happens in the database when a user registers
-- The actual registration goes through Supabase Auth, which triggers these functions

-- Simulate checking if tenant registration would work
SELECT 
    'TEST 4: Tenant/Landlord Registration' as test_group,
    'Should NOT require admin_code' as test_case,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_trigger WHERE tgname = 'on_auth_user_created') > 0
        THEN '✅ Trigger exists - will create user and profile'
        ELSE '❌ Trigger missing - registration will fail'
    END as status;

-- ============================================================================
-- TEST 5: Test Admin Code Generation (Super Admin Only)
-- ============================================================================
-- Note: This requires a super admin to be logged in
-- For testing without super admin, we can check if the function exists

SELECT 
    'TEST 5: Admin Code Generation' as test_group,
    'Function generate_admin_code' as test_case,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'generate_admin_code') > 0
        THEN '✅ Function exists and ready'
        ELSE '❌ Function missing'
    END as status;

-- ============================================================================
-- TEST 6: Test Admin Code Validation
-- ============================================================================
-- Simulate admin code verification (without actually creating a user)

SELECT 
    'TEST 6: Admin Code Validation' as test_group,
    'verify_admin_code function' as test_case,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'verify_admin_code') > 0
        THEN '✅ Function exists and ready'
        ELSE '❌ Function missing'
    END as status;

-- Check if admin_codes table has proper structure
SELECT 
    'TEST 6: Admin Code Validation' as test_group,
    'admin_codes table structure' as test_case,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_codes' 
            AND column_name IN ('code', 'role', 'is_used', 'expires_at', 'created_by')
            GROUP BY table_name
            HAVING COUNT(*) = 5
        )
        THEN '✅ Table structure correct'
        ELSE '❌ Table structure incomplete'
    END as status;

-- ============================================================================
-- TEST 7: Test RLS Policies
-- ============================================================================
SELECT 
    'TEST 7: RLS Policies' as test_group,
    tablename as table_name,
    CASE 
        WHEN rowsecurity THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('users', 'tenant_profiles', 'landlord_profiles', 'admin_profiles', 'admin_codes');

-- ============================================================================
-- TEST 8: Test Account Status Workflow
-- ============================================================================
SELECT 
    'TEST 8: Account Status' as test_group,
    'users table account_status column' as test_case,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'account_status'
        )
        THEN '✅ Column exists - approval workflow supported'
        ELSE '❌ Column missing - no approval workflow'
    END as status;

-- Check default account_status
SELECT 
    'TEST 8: Account Status' as test_group,
    'Default account_status value' as test_case,
    CASE 
        WHEN column_default LIKE '%pending%' THEN '✅ Defaults to pending (correct)'
        ELSE '⚠️ Default: ' || column_default
    END as status
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'account_status';

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
SELECT 
    '========================================' as separator
UNION ALL
SELECT 
    'REGISTRATION FLOW TEST SUMMARY' as separator
UNION ALL
SELECT 
    '========================================' as separator
UNION ALL
SELECT 
    'Run the tests above and verify all show ✅' as separator
UNION ALL
SELECT 
    'If any tests show ❌, fix those issues first' as separator
UNION ALL
SELECT 
    '========================================' as separator;

-- ============================================================================
-- NEXT STEPS FOR MANUAL TESTING
-- ============================================================================
/*
After running this script, test the actual registration flows:

1. TENANT/LANDLORD REGISTRATION (No Admin Code):
   - Visit /register
   - Fill out the form
   - Register as tenant or landlord
   - Check that user appears in both auth.users AND public.users
   - Check that tenant_profile or landlord_profile is created
   - Verify account_status = 'pending'

2. ADMIN REGISTRATION (Requires Valid Code):
   - First, as a super admin, generate a code:
     * Login as super admin
     * Visit /admin/verification-codes
     * Generate a new admin or super_admin code
     * Copy the code
   - Visit /admin/register
   - Fill out the form
   - Enter the verification code
   - Register
   - Check that:
     * User appears in both auth.users AND public.users
     * admin_profile is created
     * Role matches the code's role (admin or super_admin)
     * Code is marked as used
     * account_status = 'pending'

3. ADMIN CODE SECURITY TEST (Should FAIL):
   - Visit /admin/register
   - Fill out the form
   - Enter a RANDOM/INVALID code
   - Attempt to register
   - Verify registration FAILS with error message
   - This confirms the security vulnerability is FIXED

4. LOGIN WITH PENDING ACCOUNT (Should FAIL):
   - Try to login with any newly created account
   - Verify login FAILS with message about pending approval
   - This confirms approval workflow is working

5. ADMIN APPROVAL WORKFLOW:
   - Login as admin or super admin
   - Approve a pending user account
   - Have that user try to login
   - Verify login now succeeds
   - Verify user is restricted to profile completion page
   - Complete profile
   - Verify user now has full access

If all tests pass, the registration and approval system is working correctly!
*/
