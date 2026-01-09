-- ============================================================================
-- RentFlow Database Schema Cleanup Analysis
-- ============================================================================
-- This script identifies unused database objects for potential removal
-- DO NOT RUN THIS SCRIPT DIRECTLY - It's for analysis only!
-- Review each recommendation carefully before taking action
-- ============================================================================

-- ============================================================================
-- SECTION 1: Unused Tables Analysis
-- ============================================================================

-- Check if 'profiles' table exists and is unused
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count BIGINT;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.profiles' INTO row_count;
        
        RAISE NOTICE '';
        RAISE NOTICE '=== PROFILES TABLE ANALYSIS ===';
        RAISE NOTICE 'Table exists: YES';
        RAISE NOTICE 'Row count: %', row_count;
        RAISE NOTICE 'Status: ❓ POTENTIALLY REDUNDANT';
        RAISE NOTICE 'Reason: Not referenced in application code';
        RAISE NOTICE 'Recommendation: Role-specific profiles (landlord_profiles, tenant_profiles, admin_profiles) are used instead';
        
        IF row_count = 0 THEN
            RAISE NOTICE 'Action: ✅ SAFE TO DROP (empty table)';
            RAISE NOTICE 'Command: DROP TABLE IF EXISTS public.profiles CASCADE;';
        ELSE
            RAISE WARNING 'Action: ⚠️  REVIEW REQUIRED - Table contains % rows', row_count;
            RAISE WARNING 'Backup data before dropping!';
        END IF;
    ELSE
        RAISE NOTICE 'PROFILES TABLE: Not found - already cleaned up';
    END IF;
END $$;

-- Check if 'invite_codes' table exists and is unused
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count BIGINT;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'invite_codes'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.invite_codes' INTO row_count;
        
        RAISE NOTICE '';
        RAISE NOTICE '=== INVITE_CODES TABLE ANALYSIS ===';
        RAISE NOTICE 'Table exists: YES';
        RAISE NOTICE 'Row count: %', row_count;
        RAISE NOTICE 'Status: ❓ POTENTIALLY UNUSED';
        RAISE NOTICE 'Reason: Not referenced in application code';
        RAISE NOTICE 'Note: Similar functionality exists in admin_codes table';
        
        IF row_count = 0 THEN
            RAISE NOTICE 'Action: ✅ SAFE TO DROP (empty table)';
            RAISE NOTICE 'Command: DROP TABLE IF EXISTS public.invite_codes CASCADE;';
        ELSE
            RAISE WARNING 'Action: ⚠️  REVIEW REQUIRED - Table contains % rows', row_count;
            RAISE WARNING 'Check if this is a legacy feature that can be migrated to admin_codes';
        END IF;
    ELSE
        RAISE NOTICE 'INVITE_CODES TABLE: Not found - already cleaned up';
    END IF;
END $$;

-- Check if 'admin_audit_logs' table exists and is unused
DO $$
DECLARE
    table_exists BOOLEAN;
    row_count BIGINT;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_audit_logs'
    ) INTO table_exists;
    
    IF table_exists THEN
        EXECUTE 'SELECT COUNT(*) FROM public.admin_audit_logs' INTO row_count;
        
        RAISE NOTICE '';
        RAISE NOTICE '=== ADMIN_AUDIT_LOGS TABLE ANALYSIS ===';
        RAISE NOTICE 'Table exists: YES';
        RAISE NOTICE 'Row count: %', row_count;
        RAISE NOTICE 'Status: ❓ POTENTIALLY REDUNDANT';
        RAISE NOTICE 'Reason: Not referenced in application code';
        RAISE NOTICE 'Note: Main audit_logs table is actively used';
        
        IF row_count = 0 THEN
            RAISE NOTICE 'Action: ✅ SAFE TO DROP (empty table)';
            RAISE NOTICE 'Command: DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;';
        ELSE
            RAISE WARNING 'Action: ⚠️  REVIEW REQUIRED - Table contains % rows', row_count;
            RAISE WARNING 'Consider migrating data to audit_logs table before dropping';
        END IF;
    ELSE
        RAISE NOTICE 'ADMIN_AUDIT_LOGS TABLE: Not found - already cleaned up';
    END IF;
END $$;

-- ============================================================================
-- SECTION 2: Duplicate/Unused Functions Analysis
-- ============================================================================

-- List all user-defined functions
CREATE OR REPLACE VIEW public.function_analysis AS
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    CASE 
        WHEN p.prosecdef THEN '🔒 SECURITY DEFINER'
        ELSE 'INVOKER'
    END as security_type,
    l.lanname as language,
    pg_size_pretty(pg_relation_size(p.oid)) as size,
    obj_description(p.oid, 'pg_proc') as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE n.nspname = 'public'
AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;

-- Analyze potentially duplicate admin code functions
DO $$
DECLARE
    func_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== DUPLICATE FUNCTION ANALYSIS ===';
    
    -- Check for handle_admin_code
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'handle_admin_code'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'handle_admin_code() - ❓ POTENTIALLY DUPLICATE';
        RAISE NOTICE '  Similar to: validate_admin_registration() and apply_admin_role_from_code()';
        RAISE NOTICE '  Recommendation: Review and consolidate admin code handling logic';
    END IF;
    
    -- Check for apply_admin_role_from_code
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'apply_admin_role_from_code'
    ) INTO func_exists;
    
    IF func_exists THEN
        RAISE NOTICE 'apply_admin_role_from_code() - ❓ POTENTIALLY DUPLICATE';
        RAISE NOTICE '  Similar to: validate_admin_registration()';
        RAISE NOTICE '  Recommendation: Consolidate into single admin verification flow';
    END IF;
END $$;

-- ============================================================================
-- SECTION 3: Unused Indexes Analysis
-- ============================================================================

-- Find indexes that have never been used
CREATE OR REPLACE VIEW public.unused_indexes AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find redundant indexes (covering same columns)
CREATE OR REPLACE VIEW public.redundant_indexes AS
SELECT
    a.schemaname,
    a.tablename,
    a.indexname as index1,
    b.indexname as index2,
    a.indexdef as def1,
    b.indexdef as def2,
    pg_size_pretty(pg_relation_size(a.indexrelid) + pg_relation_size(b.indexrelid)) as total_size
FROM pg_indexes a
JOIN pg_indexes b ON a.schemaname = b.schemaname 
    AND a.tablename = b.tablename
    AND a.indexname < b.indexname
WHERE a.schemaname = 'public'
AND a.indexdef = b.indexdef;

-- ============================================================================
-- SECTION 4: Column Usage Analysis
-- ============================================================================

-- This query helps identify columns that might be unused
-- Note: This only checks for NULL values, doesn't guarantee the column is unused
CREATE OR REPLACE FUNCTION public.analyze_null_columns(p_table_name TEXT)
RETURNS TABLE(
    column_name TEXT,
    null_count BIGINT,
    total_count BIGINT,
    null_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    col_name TEXT;
    query TEXT;
BEGIN
    FOR col_name IN 
        SELECT column_name::TEXT
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = p_table_name
        AND is_nullable = 'YES'
    LOOP
        query := format('
            SELECT 
                %L::TEXT,
                COUNT(*) FILTER (WHERE %I IS NULL)::BIGINT,
                COUNT(*)::BIGINT,
                ROUND((COUNT(*) FILTER (WHERE %I IS NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2)
            FROM public.%I',
            col_name, col_name, col_name, p_table_name
        );
        
        RETURN QUERY EXECUTE query;
    END LOOP;
END;
$$;

-- ============================================================================
-- SECTION 5: RLS Policy Analysis
-- ============================================================================

-- View all RLS policies
CREATE OR REPLACE VIEW public.rls_policy_analysis AS
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual LIKE '%true%' THEN '⚠️  Permissive (true)'
        ELSE '✅ Restrictive'
    END as policy_type,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Find overly permissive policies
DO $$
DECLARE
    policy_record RECORD;
    permissive_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== OVERLY PERMISSIVE RLS POLICIES ===';
    
    FOR policy_record IN
        SELECT schemaname, tablename, policyname, qual
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual LIKE '%true%' OR qual LIKE '%1=1%')
    LOOP
        permissive_count := permissive_count + 1;
        RAISE WARNING '⚠️  %.%: % - USING (%)', 
            policy_record.schemaname,
            policy_record.tablename,
            policy_record.policyname,
            policy_record.qual;
    END LOOP;
    
    IF permissive_count = 0 THEN
        RAISE NOTICE '✅ No overly permissive policies found';
    ELSE
        RAISE WARNING 'Found % overly permissive policies - review for security', permissive_count;
    END IF;
END $$;

-- ============================================================================
-- SECTION 6: Cleanup Recommendations Summary
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CLEANUP RECOMMENDATIONS SUMMARY ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. TABLES TO REVIEW:';
    RAISE NOTICE '   - profiles (if empty and unused)';
    RAISE NOTICE '   - invite_codes (if superseded by admin_codes)';
    RAISE NOTICE '   - admin_audit_logs (if redundant with audit_logs)';
    RAISE NOTICE '';
    RAISE NOTICE '2. FUNCTIONS TO REVIEW:';
    RAISE NOTICE '   - Consolidate duplicate admin code handling functions';
    RAISE NOTICE '   - Remove unused helper functions';
    RAISE NOTICE '';
    RAISE NOTICE '3. INDEXES TO REVIEW:';
    RAISE NOTICE '   - Run: SELECT * FROM public.unused_indexes;';
    RAISE NOTICE '   - Run: SELECT * FROM public.redundant_indexes;';
    RAISE NOTICE '';
    RAISE NOTICE '4. RLS POLICIES TO REVIEW:';
    RAISE NOTICE '   - Run: SELECT * FROM public.rls_policy_analysis;';
    RAISE NOTICE '   - Review any policies with USING (true)';
    RAISE NOTICE '';
    RAISE NOTICE '5. NEXT STEPS:';
    RAISE NOTICE '   - Export data from unused tables before dropping';
    RAISE NOTICE '   - Test application thoroughly after cleanup';
    RAISE NOTICE '   - Monitor performance after index changes';
    RAISE NOTICE '   - Update documentation';
    RAISE NOTICE '';
    RAISE NOTICE 'For detailed analysis, run:';
    RAISE NOTICE '  SELECT * FROM public.function_analysis;';
    RAISE NOTICE '  SELECT * FROM public.unused_indexes;';
    RAISE NOTICE '  SELECT * FROM public.redundant_indexes;';
    RAISE NOTICE '  SELECT * FROM public.rls_policy_analysis;';
END $$;

-- ============================================================================
-- End of Schema Cleanup Analysis
-- ============================================================================
