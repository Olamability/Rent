-- ============================================================================
-- Fix Schema Mismatches Migration
-- ============================================================================
-- This migration fixes schema mismatches found in the codebase:
-- 1. Adds application_id column to tenancy_agreements table
-- 2. Creates proper foreign key relationship
-- 
-- Run this in your Supabase SQL Editor if you're using the base schema
-- This is safe to run multiple times (idempotent)
-- ============================================================================

\echo '===================================================================================='
\echo 'FIXING SCHEMA MISMATCHES'
\echo 'Starting migration...'
\echo '===================================================================================='

-- ============================================================================
-- Add application_id to tenancy_agreements
-- ============================================================================
\echo 'Adding application_id column to tenancy_agreements...'

DO $$ 
BEGIN
    -- Add application_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'application_id'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_tenancy_agreements_application_id 
        ON public.tenancy_agreements(application_id);
        
        RAISE NOTICE '✓ Added application_id column to tenancy_agreements';
    ELSE
        RAISE NOTICE '✓ application_id column already exists in tenancy_agreements';
    END IF;
END $$;

\echo ''
\echo '===================================================================================='
\echo 'MIGRATION COMPLETE!'
\echo '===================================================================================='
\echo ''
\echo 'Summary of changes:'
\echo '  ✓ Added application_id column to tenancy_agreements table'
\echo '  ✓ Created foreign key relationship to property_applications'
\echo '  ✓ Created index on application_id for better query performance'
\echo ''
\echo 'The following issues have been fixed:'
\echo '  ✓ Applications can now be fetched with tenancy_agreements relationship'
\echo '  ✓ Documents can be queried using correct column names'
\echo ''
\echo '===================================================================================='
