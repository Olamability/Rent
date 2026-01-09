-- ============================================================================
-- User Registration and Approval Flow Enhancement
-- ============================================================================
-- This script implements the complete user registration and approval workflow:
-- 1. Users register and confirm email (handled by Supabase Auth)
-- 2. Upon login, users must complete their profile
-- 3. After profile completion, account status is automatically set to 'pending'
-- 4. Admins review and approve accounts
-- 5. Only users with complete profiles can be approved
-- 6. Users with pending status cannot access restricted features
-- ============================================================================

-- ============================================================================
-- FUNCTION: Validate profile completion for account approval
-- ============================================================================
-- This function checks if a user's profile is complete before allowing approval
-- It prevents approval of accounts with incomplete profiles

CREATE OR REPLACE FUNCTION public.validate_profile_completion_before_approval()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when changing status to 'approved'
    IF NEW.account_status = 'approved' AND OLD.account_status != 'approved' THEN
        -- Check if profile is marked as complete
        IF NEW.profile_complete IS NOT TRUE THEN
            RAISE EXCEPTION 'Cannot approve account: Profile must be completed before approval. Please ensure the user has filled in all mandatory profile fields.';
        END IF;
        
        -- Additional check: profile completeness should be 100%
        IF NEW.profile_completeness IS NULL OR NEW.profile_completeness < 100 THEN
            RAISE EXCEPTION 'Cannot approve account: Profile completeness is %. Profile must be 100%% complete before approval.', COALESCE(NEW.profile_completeness, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Auto-update account status when profile is completed
-- ============================================================================
-- This function automatically sets account_status to 'pending' when a user
-- completes their profile (profile_complete = true and profile_completeness = 100)

CREATE OR REPLACE FUNCTION public.auto_update_account_status_on_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
    -- When profile_complete is set to true and completeness is 100%, set status to pending
    IF NEW.profile_complete IS TRUE 
       AND NEW.profile_completeness = 100 
       AND (OLD.profile_complete IS NOT TRUE OR OLD.profile_completeness < 100) THEN
        -- Only update to pending if current status allows it
        -- Don't change status if already approved, suspended, or banned
        IF NEW.account_status = 'pending' OR OLD.account_status = 'pending' THEN
            NEW.account_status := 'pending';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS validate_approval_requires_complete_profile ON public.users;
DROP TRIGGER IF EXISTS auto_set_pending_on_profile_complete ON public.users;

-- Trigger to validate profile completion before approval
-- This runs BEFORE UPDATE to enforce the constraint
CREATE TRIGGER validate_approval_requires_complete_profile
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (NEW.account_status = 'approved' AND OLD.account_status IS DISTINCT FROM 'approved')
    EXECUTE FUNCTION public.validate_profile_completion_before_approval();

-- Trigger to automatically set account status to pending when profile is completed
-- This runs BEFORE UPDATE to ensure the status change happens atomically
CREATE TRIGGER auto_set_pending_on_profile_complete
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    WHEN (NEW.profile_complete IS TRUE AND NEW.profile_completeness = 100)
    EXECUTE FUNCTION public.auto_update_account_status_on_profile_complete();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON FUNCTION public.validate_profile_completion_before_approval() IS 
'Validates that a user profile is complete before allowing account approval. 
Prevents approval of accounts with incomplete profiles at the database level.';

COMMENT ON FUNCTION public.auto_update_account_status_on_profile_complete() IS 
'Automatically sets account_status to pending when a user completes their profile.
This ensures the approval workflow is triggered after profile completion.';

COMMENT ON TRIGGER validate_approval_requires_complete_profile ON public.users IS
'Enforces profile completion requirement before account approval';

COMMENT ON TRIGGER auto_set_pending_on_profile_complete ON public.users IS
'Automatically updates account status to pending when profile is completed';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the triggers and functions are installed correctly

DO $$
BEGIN
    -- Check if functions exist
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_profile_completion_before_approval') THEN
        RAISE NOTICE '✓ Function validate_profile_completion_before_approval created successfully';
    ELSE
        RAISE WARNING '✗ Function validate_profile_completion_before_approval NOT found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_update_account_status_on_profile_complete') THEN
        RAISE NOTICE '✓ Function auto_update_account_status_on_profile_complete created successfully';
    ELSE
        RAISE WARNING '✗ Function auto_update_account_status_on_profile_complete NOT found';
    END IF;
    
    -- Check if triggers exist
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'validate_approval_requires_complete_profile') THEN
        RAISE NOTICE '✓ Trigger validate_approval_requires_complete_profile created successfully';
    ELSE
        RAISE WARNING '✗ Trigger validate_approval_requires_complete_profile NOT found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'auto_set_pending_on_profile_complete') THEN
        RAISE NOTICE '✓ Trigger auto_set_pending_on_profile_complete created successfully';
    ELSE
        RAISE WARNING '✗ Trigger auto_set_pending_on_profile_complete NOT found';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'User Registration and Approval Flow Setup Complete';
    RAISE NOTICE '============================================';
END $$;
