-- ============================================================================
-- RentFlow Database Optimization - Master Script
-- ============================================================================
-- This script runs all database optimizations in the correct order:
-- 1. Security Hardening (CRITICAL)
-- 2. Performance Optimization (HIGH PRIORITY)
-- 3. Schema Analysis (REVIEW ONLY)
--
-- IMPORTANT: This script is safe to run but will make permanent changes
-- BACKUP YOUR DATABASE BEFORE RUNNING!
--
-- Supabase Backup Instructions:
-- 1. Go to Supabase Dashboard → Database → Backups
-- 2. Create a manual backup
-- 3. Wait for completion
-- 4. Then run this script
-- ============================================================================

\set ON_ERROR_STOP on

-- Display banner
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  RentFlow Database Optimization - Master Script                      ║';
    RAISE NOTICE '║  This will fix 374+ database issues and optimize performance         ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Make sure you have a database backup before proceeding!';
    RAISE NOTICE '';
    RAISE NOTICE 'This script will:';
    RAISE NOTICE '  1. Fix all SECURITY DEFINER function vulnerabilities';
    RAISE NOTICE '  2. Add missing indexes for performance';
    RAISE NOTICE '  3. Run analysis to identify unused objects';
    RAISE NOTICE '';
    RAISE NOTICE 'Estimated time: 5-10 minutes';
    RAISE NOTICE '';
    RAISE NOTICE 'Starting in 5 seconds...';
    RAISE NOTICE '';
    
    PERFORM pg_sleep(5);
END $$;

-- ============================================================================
-- PHASE 1: SECURITY HARDENING (CRITICAL)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'PHASE 1: SECURITY HARDENING';
    RAISE NOTICE 'Fixing SECURITY DEFINER functions...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

\i database/security-hardening-fixes.sql

-- ============================================================================
-- PHASE 2: PERFORMANCE OPTIMIZATION (HIGH PRIORITY)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'PHASE 2: PERFORMANCE OPTIMIZATION';
    RAISE NOTICE 'Adding missing indexes...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

\i database/performance-optimization-indexes.sql

-- ============================================================================
-- PHASE 3: SCHEMA CLEANUP ANALYSIS (REVIEW ONLY)
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'PHASE 3: SCHEMA CLEANUP ANALYSIS';
    RAISE NOTICE 'Analyzing unused objects (READ-ONLY)...';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;

\i database/schema-cleanup-analysis.sql

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
    sec_def_funcs INT;
    secured_funcs INT;
    total_indexes INT;
    missing_fks INT;
BEGIN
    -- Count SECURITY DEFINER functions
    SELECT COUNT(*) INTO sec_def_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND prosecdef = true;
    
    -- Count secured functions
    SELECT COUNT(*) INTO secured_funcs
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND prosecdef = true
    AND (pg_get_functiondef(p.oid) LIKE '%SET search_path%' 
         OR pg_get_functiondef(p.oid) LIKE '%set_config(''search_path''%');
    
    -- Count indexes
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count missing FK indexes
    SELECT COUNT(*) INTO missing_fks
    FROM (
        SELECT c.conrelid
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
        LEFT JOIN pg_index i ON i.indrelid = c.conrelid 
            AND a.attnum = ANY(i.indkey)
        WHERE c.contype = 'f'
            AND c.connamespace = 'public'::regnamespace
            AND i.indexrelid IS NULL
        GROUP BY c.conrelid, c.confrelid, c.conname
    ) missing;
    
    RAISE NOTICE '';
    RAISE NOTICE '╔═══════════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                     OPTIMIZATION COMPLETE!                            ║';
    RAISE NOTICE '╚═══════════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '=== SECURITY STATUS ===';
    RAISE NOTICE 'SECURITY DEFINER functions: %', sec_def_funcs;
    RAISE NOTICE 'Secured functions: %', secured_funcs;
    IF secured_funcs = sec_def_funcs THEN
        RAISE NOTICE '✅ ALL FUNCTIONS SECURED!';
    ELSE
        RAISE WARNING '⚠️  % functions still need attention', sec_def_funcs - secured_funcs;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== PERFORMANCE STATUS ===';
    RAISE NOTICE 'Total indexes: %', total_indexes;
    RAISE NOTICE 'Missing FK indexes: %', missing_fks;
    IF missing_fks = 0 THEN
        RAISE NOTICE '✅ ALL FOREIGN KEYS INDEXED!';
    ELSE
        RAISE WARNING '⚠️  % foreign keys still need indexes', missing_fks;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== RECOMMENDED NEXT STEPS ===';
    RAISE NOTICE '1. Run application tests to verify functionality';
    RAISE NOTICE '2. Monitor Supabase metrics for performance improvements';
    RAISE NOTICE '3. Review cleanup recommendations:';
    RAISE NOTICE '   SELECT * FROM public.function_analysis;';
    RAISE NOTICE '   SELECT * FROM public.unused_indexes;';
    RAISE NOTICE '   SELECT * FROM public.rls_policy_analysis;';
    RAISE NOTICE '';
    RAISE NOTICE '=== PERFORMANCE ANALYSIS ===';
    RAISE NOTICE 'Run these queries to analyze improvements:';
    RAISE NOTICE '  SELECT * FROM public.index_usage_stats;';
    RAISE NOTICE '  SELECT * FROM public.analyze_index_performance();';
    RAISE NOTICE '';
    RAISE NOTICE 'Thank you for optimizing RentFlow! 🚀';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- End of Master Optimization Script
-- ============================================================================
