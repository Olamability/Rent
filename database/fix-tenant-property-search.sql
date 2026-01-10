-- ============================================================================
-- Fix: Tenant Property Search - Property Data Missing Error
-- ============================================================================
-- This script fixes the error "Property data missing for unit" that occurs
-- when tenants try to view the property search/marketplace page.
--
-- The issue stems from two missing RLS policies:
-- 1. No policy allowing tenants to view the properties table for public listings
-- 2. Policy on units table was too restrictive (only 'available', not 'applied'/'rented')
--
-- According to the marketplace visibility requirements, tenants should be able to:
-- - View all marketplace properties (available, applied, and rented)
-- - See status badges indicating property availability
-- - Maintain visibility of properties throughout the application journey
--
-- Without these policies:
-- - The query `units.select(properties(...))` returns null for properties data
-- - This causes the "Property data missing for unit" error
-- - Tenants cannot browse the marketplace
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add policy to allow tenants to view published properties
-- ============================================================================

-- Drop the old restrictive policy if it exists
DROP POLICY IF EXISTS "Tenants can view public listings" ON public.units;

-- Add policy allowing anyone to view published properties
-- This allows the units->properties join to return data for tenants
DO $$
BEGIN
    -- Check if policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'properties' 
        AND policyname = 'Anyone can view published properties'
    ) THEN
        -- Create the policy
        EXECUTE 'CREATE POLICY "Anyone can view published properties" ON public.properties
            FOR SELECT USING (is_published = TRUE)';
        
        RAISE NOTICE 'Created policy: Anyone can view published properties';
    ELSE
        RAISE NOTICE 'Policy "Anyone can view published properties" already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update units policy to allow viewing marketplace statuses
-- ============================================================================

-- Create or replace the policy to allow tenants to view marketplace listings
-- This aligns with the marketplace visibility requirements that tenants
-- should see properties with status 'available', 'applied', OR 'rented'
DO $$
BEGIN
    -- Drop old policy if it exists (we already did this above, but being safe)
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'units' 
        AND policyname = 'Tenants can view public listings'
    ) THEN
        DROP POLICY "Tenants can view public listings" ON public.units;
        RAISE NOTICE 'Dropped old policy: Tenants can view public listings';
    END IF;
    
    -- Check if new policy already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'units' 
        AND policyname = 'Tenants can view marketplace listings'
    ) THEN
        -- Create the new policy
        EXECUTE 'CREATE POLICY "Tenants can view marketplace listings" ON public.units
            FOR SELECT USING (listing_status IN (''available'', ''applied'', ''rented''))';
        
        RAISE NOTICE 'Created policy: Tenants can view marketplace listings';
    ELSE
        RAISE NOTICE 'Policy "Tenants can view marketplace listings" already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Verify the policies were created
-- ============================================================================

-- Display current policies on properties table
RAISE NOTICE '============================================';
RAISE NOTICE 'Current RLS Policies on properties table:';
RAISE NOTICE '============================================';
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'properties'
ORDER BY policyname;

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'Current RLS Policies on units table:';
RAISE NOTICE '============================================';
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'units'
ORDER BY policyname;

COMMIT;

-- ============================================================================
-- Expected Result
-- ============================================================================
-- After running this script:
-- 1. Tenants can view properties table data for published properties
-- 2. Tenants can view units with listing_status 'available', 'applied', OR 'rented'
-- 3. The property search page will display all marketplace properties with badges
-- 4. No more "Property data missing for unit" errors
-- ============================================================================
