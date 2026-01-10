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

-- Drop old policy if it exists (using IF EXISTS for idempotency)
DROP POLICY IF EXISTS "Tenants can view public listings" ON public.units;

DO $$
BEGIN
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
-- STEP 3: Verify the policies were created (optional - for review only)
-- ============================================================================

-- Note: You can uncomment and run these separately after the migration to verify
-- 
-- SELECT 
--     policyname,
--     cmd,
--     qual
-- FROM pg_policies 
-- WHERE tablename = 'properties'
-- ORDER BY policyname;
-- 
-- SELECT 
--     policyname,
--     cmd,
--     qual
-- FROM pg_policies 
-- WHERE tablename = 'units'
-- ORDER BY policyname;

-- ============================================================================
-- STEP 4: Update trigger functions to publish properties with marketplace units
-- ============================================================================

-- Update the function to consider 'available', 'applied', and 'rented' units
CREATE OR REPLACE FUNCTION public.update_property_published()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_published on the parent property
    -- A property should be published when it has at least one marketplace unit
    -- (available, applied, or rented status)
    IF EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = NEW.property_id
        AND listing_status IN ('available', 'applied', 'rented')
        LIMIT 1
    ) THEN
        -- Property has marketplace units, ensure it's published
        UPDATE public.properties
        SET is_published = TRUE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = FALSE;
    ELSE
        -- No marketplace units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_property_published() IS 
'Automatically publishes properties when they have marketplace units (available, applied, or rented) and unpublishes when they have none.';

-- Update the delete trigger function as well
CREATE OR REPLACE FUNCTION public.update_property_published_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a unit is deleted, check if the property still has marketplace units
    IF NOT EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = OLD.property_id
        AND listing_status IN ('available', 'applied', 'rented')
        AND id != OLD.id
        LIMIT 1
    ) THEN
        -- No more marketplace units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = OLD.property_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE 'Updated trigger functions to consider all marketplace statuses';

-- ============================================================================
-- STEP 5: Update existing property published status
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Publish properties that have any marketplace units (available, applied, or rented)
    UPDATE public.properties p
    SET is_published = TRUE,
        updated_at = NOW()
    WHERE is_published = FALSE
    AND EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.property_id = p.id
        AND u.listing_status IN ('available', 'applied', 'rented')
        LIMIT 1
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Published % properties that have marketplace units', updated_count;
END $$;

COMMIT;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '
============================================
Migration completed successfully!
============================================

Changes applied:
1. Added policy: Anyone can view published properties
2. Updated policy: Tenants can view marketplace listings
3. Updated trigger: update_property_published()
4. Updated trigger: update_property_published_on_delete()
5. Published properties with marketplace units

Next steps:
- Test tenant property search page
- Verify no "Property data missing" errors
- Confirm status badges display correctly
';
END $$;

-- ============================================================================
-- Expected Result
-- ============================================================================
-- After running this script:
-- 1. Tenants can view properties table data for published properties
-- 2. Tenants can view units with listing_status 'available', 'applied', OR 'rented'
-- 3. The property search page will display all marketplace properties with badges
-- 4. No more "Property data missing for unit" errors
-- ============================================================================
