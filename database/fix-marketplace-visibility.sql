-- ============================================================================
-- Fix: Properties Not Showing on Marketplace/Homepage
-- ============================================================================
-- This script fixes the issue where listed properties don't appear on the
-- public marketplace or home page. The problem stems from:
-- 1. Mismatch between schema and code listing_status values
-- 2. Missing automatic setting of is_public_listing flag
-- 3. Missing automatic setting of is_published flag on properties
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix listing_status constraint to match application code
-- ============================================================================

-- Drop the old constraint
ALTER TABLE public.units
DROP CONSTRAINT IF EXISTS units_listing_status_check;

-- Add the correct constraint matching the TypeScript types
-- Code uses: 'available', 'applied', 'rented', 'unlisted'
ALTER TABLE public.units
ADD CONSTRAINT units_listing_status_check 
CHECK (listing_status IN ('available', 'applied', 'rented', 'unlisted'));

-- Change default from 'draft' to 'unlisted' to match code expectations
ALTER TABLE public.units
ALTER COLUMN listing_status SET DEFAULT 'unlisted';

-- Update any existing non-standard values to 'unlisted'
-- This ensures data consistency with the application
UPDATE public.units
SET listing_status = 'unlisted'
WHERE listing_status NOT IN ('available', 'applied', 'rented', 'unlisted');

COMMENT ON COLUMN public.units.listing_status IS 
'Status of unit listing: available (ready for applications and publicly listed), applied (has pending applications), rented (occupied by tenant), unlisted (not publicly listed)';

-- ============================================================================
-- STEP 2: Create trigger function to auto-manage is_public_listing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_unit_public_listing()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_public_listing based on listing_status
    -- A unit should be publicly listed when:
    -- 1. Status is 'available' (ready for applications)
    -- 2. The parent property is published (we'll check this separately)
    
    IF NEW.listing_status = 'available' THEN
        NEW.is_public_listing := TRUE;
    ELSE
        -- For 'applied', 'rented', or 'unlisted' status
        -- the unit should not be publicly listed
        NEW.is_public_listing := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_unit_public_listing ON public.units;

-- Create trigger that fires before insert or update
CREATE TRIGGER trigger_update_unit_public_listing
    BEFORE INSERT OR UPDATE OF listing_status
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_unit_public_listing();

COMMENT ON FUNCTION public.update_unit_public_listing() IS 
'Automatically sets is_public_listing flag based on listing_status. Units with status "available" are made public, all others (applied, rented, unlisted) are not publicly listed.';

-- ============================================================================
-- STEP 3: Create trigger function to auto-manage property is_published
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_property_published()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_published on the parent property
    -- A property should be published when it has at least one available unit
    
    -- Check if the property has any available units
    IF EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = NEW.property_id
        AND listing_status = 'available'
        LIMIT 1
    ) THEN
        -- Property has available units, ensure it's published
        UPDATE public.properties
        SET is_published = TRUE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = FALSE;  -- Only update if not already published
    ELSE
        -- No available units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = TRUE;  -- Only update if currently published
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_property_published ON public.units;

-- Create trigger that fires after insert or update
CREATE TRIGGER trigger_update_property_published
    AFTER INSERT OR UPDATE OF listing_status
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_published();

COMMENT ON FUNCTION public.update_property_published() IS 
'Automatically publishes properties when they have available units and unpublishes when they have none. This ensures properties appear in the public marketplace only when they have rentable units.';

-- ============================================================================
-- STEP 4: Also handle unit deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_property_published_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a unit is deleted, check if the property still has available units
    IF NOT EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = OLD.property_id
        AND listing_status = 'available'
        AND id != OLD.id  -- Exclude the unit being deleted
        LIMIT 1
    ) THEN
        -- No more available units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = OLD.property_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_property_published_on_delete ON public.units;

-- Create trigger that fires after delete
CREATE TRIGGER trigger_update_property_published_on_delete
    AFTER DELETE
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_published_on_delete();

-- ============================================================================
-- STEP 5: Fix existing data - Update all current units and properties
-- ============================================================================

-- First, update all units to set is_public_listing correctly
UPDATE public.units
SET is_public_listing = TRUE
WHERE listing_status = 'available'
AND is_public_listing = FALSE;

-- Then, publish properties that have available units
UPDATE public.properties p
SET is_published = TRUE,
    updated_at = NOW()
WHERE is_published = FALSE
AND EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.property_id = p.id
    AND u.listing_status = 'available'
    AND u.is_public_listing = TRUE
    LIMIT 1
);

-- Unpublish properties that have no available units
UPDATE public.properties p
SET is_published = FALSE,
    updated_at = NOW()
WHERE is_published = TRUE
AND NOT EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.property_id = p.id
    AND u.listing_status = 'available'
    AND u.is_public_listing = TRUE
    LIMIT 1
);

-- ============================================================================
-- STEP 6: Verification queries
-- ============================================================================

-- Display summary of changes
DO $$
DECLARE
    total_units INTEGER;
    available_units INTEGER;
    public_units INTEGER;
    total_properties INTEGER;
    published_properties INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_units FROM public.units;
    SELECT COUNT(*) INTO available_units FROM public.units WHERE listing_status = 'available';
    SELECT COUNT(*) INTO public_units FROM public.units WHERE is_public_listing = TRUE;
    SELECT COUNT(*) INTO total_properties FROM public.properties;
    SELECT COUNT(*) INTO published_properties FROM public.properties WHERE is_published = TRUE;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Marketplace Visibility Fix - Summary';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Total Units: %', total_units;
    RAISE NOTICE 'Available Units: %', available_units;
    RAISE NOTICE 'Publicly Listed Units: %', public_units;
    RAISE NOTICE 'Total Properties: %', total_properties;
    RAISE NOTICE 'Published Properties: %', published_properties;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Properties will now automatically appear on the marketplace when:';
    RAISE NOTICE '1. They have at least one unit with status "available"';
    RAISE NOTICE '2. The unit is automatically marked as is_public_listing = TRUE';
    RAISE NOTICE '3. The property is automatically marked as is_published = TRUE';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries (run these separately after migration)
-- ============================================================================

-- View all properties that should now be visible in marketplace
-- SELECT 
--     p.id,
--     p.name,
--     p.city,
--     p.state,
--     p.is_published,
--     COUNT(u.id) as total_units,
--     COUNT(u.id) FILTER (WHERE u.listing_status = 'available') as available_units,
--     COUNT(u.id) FILTER (WHERE u.is_public_listing = TRUE) as public_units
-- FROM public.properties p
-- LEFT JOIN public.units u ON u.property_id = p.id
-- GROUP BY p.id, p.name, p.city, p.state, p.is_published
-- ORDER BY p.is_published DESC, p.name;

-- View the public_property_listings view (what appears on homepage)
-- SELECT 
--     property_name,
--     city,
--     state,
--     unit_number,
--     bedrooms,
--     bathrooms,
--     rent_amount
-- FROM public.public_property_listings
-- ORDER BY property_name, unit_number;
