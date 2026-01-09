-- ============================================================================
-- RentFlow Database Security & Performance Optimization
-- APPLICATION-ALIGNED VERSION
-- ============================================================================
-- This script contains ONLY the changes that are:
-- 1. Actually needed by the RentFlow application
-- 2. Used in RLS policies or triggers
-- 3. Directly referenced in application code
-- 4. Critical for security and performance
--
-- Based on analysis of actual application usage patterns
-- ============================================================================

\set ON_ERROR_STOP on

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'RentFlow Database Optimization - Application-Aligned Version';
    RAISE NOTICE 'This script fixes ONLY the issues that affect the running application';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: CRITICAL SECURITY FIXES
-- These functions are used in RLS policies - MUST be secured
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'PART 1: Securing RLS Policy Functions (CRITICAL)';
    RAISE NOTICE '-----------------------------------------------------';
END $$;

-- Function: is_admin() - Used in 20+ RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    );
END;
$function$;

-- Function: is_super_admin() - Used in admin-only RLS policies
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$function$;

-- Function: is_landlord() - Used in landlord RLS policies
CREATE OR REPLACE FUNCTION public.is_landlord()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'landlord'
    );
END;
$function$;

-- ============================================================================
-- PART 2: TRIGGER FUNCTION SECURITY FIXES
-- These functions are used in database triggers - MUST be secured
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'PART 2: Securing Trigger Functions (HIGH PRIORITY)';
    RAISE NOTICE '-----------------------------------------------------';
END $$;

-- Function: handle_new_user() - Auth trigger (already has SET search_path in live DB)
-- Verify it has the fix:
DO $$
DECLARE
    func_def TEXT;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace;
    
    IF func_def LIKE '%SET search_path%' THEN
        RAISE NOTICE '✅ handle_new_user() - Already secured';
    ELSE
        RAISE WARNING '⚠️  handle_new_user() - Needs manual fix (critical auth function)';
    END IF;
END $$;

-- Function: update_updated_at_column() - Used in 15+ triggers (already has SET search_path in live DB)
DO $$
DECLARE
    func_def TEXT;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
    AND pronamespace = 'public'::regnamespace;
    
    IF func_def LIKE '%SET search_path%' OR func_def LIKE '%set_config%' THEN
        RAISE NOTICE '✅ update_updated_at_column() - Already secured';
    ELSE
        RAISE WARNING '⚠️  update_updated_at_column() - Needs manual fix';
    END IF;
END $$;

-- ============================================================================
-- PART 3: APPLICATION-CALLED FUNCTION SECURITY FIXES
-- These are directly called by the application via RPC
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'PART 3: Securing Application RPC Functions (HIGH PRIORITY)';
    RAISE NOTICE '-----------------------------------------------------';
END $$;

-- Function: generate_admin_code() - Called by super admin dashboard
-- Already has some security checks, add SET search_path
CREATE OR REPLACE FUNCTION public.generate_admin_code(p_role text DEFAULT 'admin'::text, p_expires_in interval DEFAULT '24:00:00'::interval)
RETURNS TABLE(code text, role text, expires_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_code TEXT;
    new_code_id UUID;
    current_user_role TEXT;
BEGIN
    -- Security check: Only super admins can generate codes
    SELECT u.role INTO current_user_role
    FROM public.users u
    WHERE u.id = auth.uid();

    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can generate admin verification codes';
    END IF;

    IF p_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin or super_admin';
    END IF;

    -- Generate secure random code (32 hex characters)
    new_code := encode(gen_random_bytes(16), 'hex');

    -- Insert the new code and get its ID
    INSERT INTO public.admin_codes (code, role, created_by, expires_at)
    VALUES (new_code, p_role, auth.uid(), NOW() + p_expires_in)
    RETURNING id INTO new_code_id;

    -- Audit logging
    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id, changes, created_at
    )
    VALUES (
        auth.uid(),
        'generate_admin_code',
        'admin_codes',
        new_code_id,
        jsonb_build_object('role', p_role, 'expires_in', p_expires_in::TEXT, 'timestamp', NOW()),
        NOW()
    );

    RETURN QUERY SELECT new_code, p_role, NOW() + p_expires_in, NOW();
END;
$function$;

-- ============================================================================
-- PART 4: PERFORMANCE - CRITICAL INDEXES ONLY
-- Add only the indexes that directly improve application queries
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'PART 4: Adding Critical Performance Indexes';
    RAISE NOTICE '-----------------------------------------------------';
END $$;

-- Foreign key indexes for most queried tables
-- Payments (30 queries) - tenant and landlord lookups
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON public.payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Property Applications (9 queries) - tenant and unit lookups  
CREATE INDEX IF NOT EXISTS idx_property_applications_tenant_id ON public.property_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_unit_id ON public.property_applications(unit_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_status ON public.property_applications(application_status);

-- Units (17 queries) - property and landlord lookups
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_landlord_id ON public.units(landlord_id);
CREATE INDEX IF NOT EXISTS idx_units_listing_status ON public.units(listing_status);

-- Properties (10 queries) - landlord lookups
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);

-- Tenancy Agreements (18 queries) - tenant and landlord lookups
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_tenant_id ON public.tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_landlord_id ON public.tenancy_agreements(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_status ON public.tenancy_agreements(agreement_status);

-- Maintenance Requests (13 queries) - tenant and landlord lookups
-- Already has idx_maintenance_requests_tenant_id and idx_maintenance_requests_landlord_id

-- Notifications (7 queries) - user lookups with unread filter
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);

-- Support Tickets (13 queries) - user and assigned lookups
-- Already has idx_support_tickets_user_id and idx_support_tickets_assigned_to

-- RLS policy support indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role) WHERE role IN ('admin', 'super_admin');

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    sec_def_critical_funcs INT := 0;
    secured_critical_funcs INT := 0;
    total_indexes INT;
BEGIN
    -- Check critical RLS functions
    SELECT COUNT(*) INTO sec_def_critical_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND prosecdef = true
    AND p.proname IN ('is_admin', 'is_super_admin', 'is_landlord', 'generate_admin_code');
    
    -- Check if they're secured
    SELECT COUNT(*) INTO secured_critical_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND prosecdef = true
    AND p.proname IN ('is_admin', 'is_super_admin', 'is_landlord', 'generate_admin_code')
    AND pg_get_functiondef(p.oid) LIKE '%SET search_path%';
    
    -- Count indexes
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'OPTIMIZATION COMPLETE - VERIFICATION';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'Critical RLS Functions: %', sec_def_critical_funcs;
    RAISE NOTICE 'Secured Functions: %', secured_critical_funcs;
    RAISE NOTICE 'Total Indexes: %', total_indexes;
    RAISE NOTICE '';
    
    IF secured_critical_funcs = sec_def_critical_funcs THEN
        RAISE NOTICE '✅ All critical functions are secured!';
    ELSE
        RAISE WARNING '⚠️  % critical functions still need manual review', sec_def_critical_funcs - secured_critical_funcs;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test user login and role checks';
    RAISE NOTICE '2. Test admin code generation';
    RAISE NOTICE '3. Verify dashboard performance';
    RAISE NOTICE '4. Check application logs for errors';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ANALYSIS: What we DID NOT include and why
-- ============================================================================

/*
FUNCTIONS NOT INCLUDED (and why):

1. can_raise_maintenance() - Used in application but only for validation
   - Not in RLS policies
   - Already schema-qualified in code
   - LOW RISK - Can be fixed later if needed

2. can_make_payment() - Used for validation
   - Not in active RLS policies based on complete schema
   - LOW RISK - Not critical path

3. can_generate_agreement() - Used for validation
   - Not in active RLS policies
   - LOW RISK - Not critical path

4. can_apply_for_unit() - Used for validation
   - Not in active RLS policies
   - LOW RISK - Not critical path

5. handle_admin_code(), validate_admin_registration(), apply_admin_role_from_code()
   - These are authentication trigger functions
   - Already have SET search_path in the live database (per complete schema.md)
   - No need to redefine

6. refresh_user_auth_metadata() - Admin utility function
   - Rarely called
   - Not in critical path
   - MEDIUM RISK - Can be fixed in maintenance window

7. update_unit_on_application_approved() - Trigger function
   - Already has proper schema qualification in table references
   - MEDIUM RISK - Can be fixed in maintenance window

8. handle_tenancy_termination() - Trigger function
   - Similar to above
   - MEDIUM RISK - Can be fixed in maintenance window

INDEXES NOT INCLUDED:
- Full-text search indexes (not used in current app)
- Partial indexes for uncommon filters
- Indexes on low-traffic tables
- Redundant composite indexes

RATIONALE:
This optimized script focuses on:
✅ Functions used in RLS policies (security critical)
✅ Functions directly called by app (functionality critical)
✅ Indexes on heavily queried tables (performance critical)
✅ Minimal, focused changes (risk minimization)

Everything else can be addressed in future maintenance windows if needed.
*/

-- ============================================================================
-- End of Application-Aligned Optimization
-- ============================================================================
