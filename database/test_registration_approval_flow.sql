-- ============================================================================
-- Test Script for User Registration and Approval Flow
-- ============================================================================
-- This script tests the triggers and functions that enforce the approval workflow
-- Run this in your Supabase SQL Editor to verify the implementation
-- ============================================================================

-- ============================================================================
-- SETUP: Create a test user for testing
-- ============================================================================

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Create a test user in auth.users (simulating registration)
    -- Note: In real scenario, Supabase Auth handles this
    -- For testing, we'll just work with the public.users table
    
    -- Generate a unique test user ID
    test_user_id := gen_random_uuid();
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Testing User Registration and Approval Flow';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Test User ID: %', test_user_id;
    RAISE NOTICE '';
    
    -- Create test user with incomplete profile
    INSERT INTO public.users (
        id, 
        email, 
        name, 
        role, 
        phone,
        profile_complete,
        profile_completeness,
        account_status
    ) VALUES (
        test_user_id,
        'test_' || test_user_id || '@example.com',
        'Test User',
        'tenant',
        '+1234567890',
        false,
        0,
        'pending'
    );
    
    RAISE NOTICE '✓ Step 1: Test user created with incomplete profile';
    RAISE NOTICE '  - account_status: pending';
    RAISE NOTICE '  - profile_complete: false';
    RAISE NOTICE '  - profile_completeness: 0';
    RAISE NOTICE '';
    
    -- ========================================================================
    -- TEST 1: Try to approve user with incomplete profile (should FAIL)
    -- ========================================================================
    
    BEGIN
        UPDATE public.users
        SET account_status = 'approved'
        WHERE id = test_user_id;
        
        -- If we reach here, the trigger didn't work
        RAISE EXCEPTION 'TEST FAILED: Trigger did not prevent approval of incomplete profile';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Cannot approve account%' THEN
                RAISE NOTICE '✓ Test 1 PASSED: Cannot approve account with incomplete profile';
                RAISE NOTICE '  Error message: %', SQLERRM;
                RAISE NOTICE '';
            ELSE
                -- Re-raise if it's a different error
                RAISE;
            END IF;
    END;
    
    -- ========================================================================
    -- TEST 2: Complete the profile (should set status to pending)
    -- ========================================================================
    
    UPDATE public.users
    SET 
        profile_complete = true,
        profile_completeness = 100
    WHERE id = test_user_id;
    
    -- Check if status is still pending
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = test_user_id 
        AND account_status = 'pending'
        AND profile_complete = true
        AND profile_completeness = 100
    ) THEN
        RAISE NOTICE '✓ Test 2 PASSED: Profile completed, status remains pending';
        RAISE NOTICE '  - profile_complete: true';
        RAISE NOTICE '  - profile_completeness: 100';
        RAISE NOTICE '  - account_status: pending (maintained)';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Status not maintained as pending after profile completion';
    END IF;
    
    -- ========================================================================
    -- TEST 3: Approve user with complete profile (should SUCCEED)
    -- ========================================================================
    
    UPDATE public.users
    SET account_status = 'approved'
    WHERE id = test_user_id;
    
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = test_user_id 
        AND account_status = 'approved'
    ) THEN
        RAISE NOTICE '✓ Test 3 PASSED: User with complete profile approved successfully';
        RAISE NOTICE '  - account_status: approved';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Could not approve user with complete profile';
    END IF;
    
    -- ========================================================================
    -- TEST 4: Try to set profile_complete to false on approved account
    -- ========================================================================
    
    UPDATE public.users
    SET 
        profile_complete = false,
        profile_completeness = 50
    WHERE id = test_user_id;
    
    -- Check that status remains approved (trigger should not change approved status)
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = test_user_id 
        AND account_status = 'approved'
    ) THEN
        RAISE NOTICE '✓ Test 4 PASSED: Approved status maintained when profile modified';
        RAISE NOTICE '  - account_status: approved (not changed by trigger)';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION 'TEST FAILED: Status changed when it should not';
    END IF;
    
    -- ========================================================================
    -- CLEANUP: Remove test user
    -- ========================================================================
    
    DELETE FROM public.users WHERE id = test_user_id;
    
    RAISE NOTICE '✓ Test user cleaned up';
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ALL TESTS PASSED ✓';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '1. ✓ Cannot approve account with incomplete profile';
    RAISE NOTICE '2. ✓ Profile completion maintains pending status';
    RAISE NOTICE '3. ✓ Can approve account with complete profile';
    RAISE NOTICE '4. ✓ Approved status not affected by profile changes';
    RAISE NOTICE '';
    RAISE NOTICE 'The User Registration and Approval Flow is working correctly!';
    
END $$;

-- ============================================================================
-- VERIFICATION: Check that triggers and functions exist
-- ============================================================================

SELECT 
    'Triggers and Functions Status:' as status,
    '' as empty_line;

SELECT 
    'Function: validate_profile_completion_before_approval' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_profile_completion_before_approval')
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status;

SELECT 
    'Function: auto_update_account_status_on_profile_complete' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_update_account_status_on_profile_complete')
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status;

SELECT 
    'Trigger: validate_approval_requires_complete_profile' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_approval_requires_complete_profile')
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status;

SELECT 
    'Trigger: auto_set_pending_on_profile_complete' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auto_set_pending_on_profile_complete')
        THEN '✓ EXISTS' 
        ELSE '✗ MISSING' 
    END as status;

-- ============================================================================
-- MANUAL TEST: Create a real test scenario
-- ============================================================================

-- Uncomment the following to create a real test user for manual testing:

/*
-- Create test tenant user
INSERT INTO public.users (
    id, 
    email, 
    name, 
    role, 
    phone,
    profile_complete,
    profile_completeness,
    account_status
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test.tenant@rentflow.test',
    'Test Tenant',
    'tenant',
    '+1234567890',
    false,
    0,
    'pending'
) ON CONFLICT (id) DO NOTHING;

-- Create tenant profile
INSERT INTO public.tenant_profiles (user_id)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid)
ON CONFLICT (user_id) DO NOTHING;

-- To test approval of incomplete profile (should fail):
-- UPDATE public.users SET account_status = 'approved' WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- To complete the profile:
-- UPDATE public.users SET profile_complete = true, profile_completeness = 100 WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- To approve after completion (should succeed):
-- UPDATE public.users SET account_status = 'approved' WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Cleanup:
-- DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
*/
