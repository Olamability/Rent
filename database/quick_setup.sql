-- ============================================================================
-- Quick Setup Script for RentFlow Testing
-- ============================================================================
-- Run this script after schema.sql to set up test environment
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Initial Super Admin
-- ============================================================================
-- ⚠️ IMPORTANT: Replace 'admin@example.invalid' with your actual email address
-- ⚠️ WARNING: This user must already exist in auth.users (register first via UI)
-- ⚠️ SECURITY: Never commit this file with real credentials to version control

-- Update an existing user to super admin
UPDATE public.users 
SET 
    role = 'super_admin',
    account_status = 'approved',
    is_verified = TRUE
WHERE email = 'admin@example.invalid';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- Verify the update
SELECT 
    id,
    email,
    name,
    role,
    account_status,
    is_verified,
    created_at
FROM public.users
WHERE email = 'admin@example.invalid';  -- ⚠️ CHANGE THIS TO YOUR EMAIL

-- Create admin profile if it doesn't exist
INSERT INTO public.admin_profiles (user_id, is_super_admin, created_at)
SELECT 
    id,
    TRUE,
    NOW()
FROM public.users
WHERE email = 'admin@example.invalid'  -- ⚠️ CHANGE THIS TO YOUR EMAIL
  AND role = 'super_admin'
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_profiles WHERE user_id = users.id
  );

-- ============================================================================
-- STEP 2: Generate Test Admin Codes
-- ============================================================================
-- This will only work if you're logged in as the super admin created above

-- Generate an admin code (expires in 30 days for testing)
-- SELECT * FROM generate_admin_code('admin', '30 days');

-- Generate a super_admin code (expires in 30 days for testing)
-- SELECT * FROM generate_admin_code('super_admin', '30 days');

-- Note: Uncomment the lines above and run after logging in as super admin

-- ============================================================================
-- STEP 3: View Current Admin Codes
-- ============================================================================
-- Check all admin codes and their status
SELECT 
    id,
    code,
    role,
    is_used,
    used_by,
    expires_at,
    CASE 
        WHEN is_used THEN 'USED'
        WHEN expires_at < NOW() THEN 'EXPIRED'
        ELSE 'ACTIVE'
    END as status,
    created_at
FROM public.admin_codes
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 4: View All Users and Their Status
-- ============================================================================
SELECT 
    id,
    email,
    name,
    role,
    account_status,
    is_verified,
    profile_complete,
    created_at,
    last_login
FROM public.users
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 5: View Pending Users (Awaiting Approval)
-- ============================================================================
SELECT 
    id,
    email,
    name,
    role,
    account_status,
    created_at
FROM public.users
WHERE account_status = 'pending'
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 6: Manually Approve a User (If Needed for Testing)
-- ============================================================================
-- Replace 'user-email@example.com' with the user's email
-- UPDATE public.users 
-- SET account_status = 'approved'
-- WHERE email = 'user-email@example.com';

-- ============================================================================
-- STEP 7: Test Code Generation (Must be logged in as super admin)
-- ============================================================================
-- This tests that the generate_admin_code function works
-- Must be executed while logged in as super admin

-- Test generating admin code
-- SELECT * FROM public.generate_admin_code('admin', '1 hour');

-- Test generating super_admin code
-- SELECT * FROM public.generate_admin_code('super_admin', '7 days');

-- ============================================================================
-- STEP 8: Verify Triggers Are Active
-- ============================================================================
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ ENABLED'
        WHEN tgenabled = 'D' THEN '❌ DISABLED'
        ELSE '⚠️ UNKNOWN'
    END as status,
    tgtype as trigger_type
FROM pg_trigger
WHERE tgname IN (
    'on_auth_user_created',
    'before_auth_user_created_admin_verification'
)
AND NOT tgisinternal
ORDER BY tgname;

-- ============================================================================
-- STEP 9: Verify Functions Exist
-- ============================================================================
SELECT 
    proname as function_name,
    pronargs as arg_count,
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
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ============================================================================
-- STEP 10: Clean Up Test Data (OPTIONAL - Use with Caution!)
-- ============================================================================
-- Use this to clean up test users and codes during development
-- WARNING: This will delete data permanently!

-- Delete test admin codes (keeps used ones for audit trail)
-- DELETE FROM public.admin_codes 
-- WHERE is_used = FALSE 
--   AND code LIKE '%test%';

-- Delete test users (be very careful with this!)
-- DELETE FROM public.users 
-- WHERE email LIKE '%test@%' 
--   OR email LIKE '%example.com%';

-- ============================================================================
-- TESTING CHECKLIST
-- ============================================================================
/*
After running this script, verify:

1. ✅ Super admin user exists and is approved
2. ✅ Super admin can login successfully
3. ✅ Super admin can access /admin/verification-codes
4. ✅ Can generate admin codes via UI
5. ✅ Tenant registration works without code
6. ✅ Landlord registration works without code
7. ✅ Admin registration fails with invalid code
8. ✅ Admin registration succeeds with valid code
9. ✅ Used codes cannot be reused
10. ✅ Expired codes are rejected
11. ✅ Pending accounts cannot login
12. ✅ Approved accounts can login
13. ✅ Profile completion is enforced

For detailed testing procedures, see:
- /database/test_registration_flow.sql
- /docs/AUTHENTICATION_FIX_GUIDE.md
- /TASK_IMPLEMENTATION_SUMMARY.md
*/

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Check if a user exists in both auth.users and public.users
-- SELECT 
--     'auth.users' as table_name,
--     id,
--     email,
--     created_at
-- FROM auth.users
-- WHERE email = 'user@example.com'
-- UNION ALL
-- SELECT 
--     'public.users' as table_name,
--     id,
--     email,
--     created_at
-- FROM public.users
-- WHERE email = 'user@example.com';

-- Check user's profile tables
-- SELECT 
--     'users' as table_name,
--     u.id,
--     u.email,
--     u.role,
--     u.account_status
-- FROM public.users u
-- WHERE u.email = 'user@example.com'
-- UNION ALL
-- SELECT 
--     'tenant_profiles' as table_name,
--     tp.user_id,
--     u.email,
--     'tenant' as role,
--     '' as account_status
-- FROM public.tenant_profiles tp
-- JOIN public.users u ON u.id = tp.user_id
-- WHERE u.email = 'user@example.com'
-- UNION ALL
-- SELECT 
--     'landlord_profiles' as table_name,
--     lp.user_id,
--     u.email,
--     'landlord' as role,
--     '' as account_status
-- FROM public.landlord_profiles lp
-- JOIN public.users u ON u.id = lp.user_id
-- WHERE u.email = 'user@example.com'
-- UNION ALL
-- SELECT 
--     'admin_profiles' as table_name,
--     ap.user_id,
--     u.email,
--     CASE WHEN ap.is_super_admin THEN 'super_admin' ELSE 'admin' END as role,
--     '' as account_status
-- FROM public.admin_profiles ap
-- JOIN public.users u ON u.id = ap.user_id
-- WHERE u.email = 'user@example.com';

-- View audit logs for user approvals
-- SELECT 
--     al.created_at,
--     al.action,
--     u.email as performed_by,
--     al.changes->>'user_email' as affected_user,
--     al.changes->>'account_status' as status_change
-- FROM public.audit_logs al
-- LEFT JOIN public.users u ON u.id = al.user_id
-- WHERE al.action = 'approve_user'
-- ORDER BY al.created_at DESC
-- LIMIT 20;

-- ============================================================================
-- END OF QUICK SETUP SCRIPT
-- ============================================================================
