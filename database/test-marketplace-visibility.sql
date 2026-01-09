-- ============================================================================
-- Test Script: Marketplace Visibility Fix
-- ============================================================================
-- This script tests the automatic marketplace visibility functionality
-- Run this AFTER applying fix-marketplace-visibility.sql
-- ============================================================================

-- Set up test data and verify triggers work correctly

BEGIN;

-- ============================================================================
-- STEP 1: Clean up any existing test data
-- ============================================================================
DO $$
BEGIN
    -- Delete test data if it exists
    DELETE FROM public.units WHERE property_id IN (
        SELECT id FROM public.properties WHERE name LIKE 'TEST_%'
    );
    DELETE FROM public.properties WHERE name LIKE 'TEST_%';
    
    RAISE NOTICE '✓ Cleaned up any existing test data';
END $$;

-- ============================================================================
-- STEP 2: Get a test landlord (or create one if needed)
-- ============================================================================
DO $$
DECLARE
    test_landlord_id UUID;
BEGIN
    -- Try to find an existing landlord
    SELECT id INTO test_landlord_id
    FROM public.users
    WHERE role = 'landlord' AND account_status = 'approved'
    LIMIT 1;
    
    -- If no landlord exists, we'll show instructions
    IF test_landlord_id IS NULL THEN
        RAISE NOTICE '⚠ No approved landlord found in the system.';
        RAISE NOTICE '  Please create a landlord account first, or use an existing one.';
        RAISE NOTICE '  Skipping automatic tests, but you can manually test by:';
        RAISE NOTICE '  1. Creating a property as a landlord';
        RAISE NOTICE '  2. Adding a unit with listing_status = "available"';
        RAISE NOTICE '  3. Checking public_property_listings view';
    ELSE
        RAISE NOTICE '✓ Found test landlord: %', test_landlord_id;
        
        -- Store for next steps
        CREATE TEMP TABLE IF NOT EXISTS test_context (
            landlord_id UUID
        );
        INSERT INTO test_context (landlord_id) VALUES (test_landlord_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create test property (only if we have a landlord)
-- ============================================================================
DO $$
DECLARE
    test_landlord_id UUID;
    test_property_id UUID;
BEGIN
    -- Get landlord ID
    SELECT landlord_id INTO test_landlord_id FROM test_context LIMIT 1;
    
    IF test_landlord_id IS NOT NULL THEN
        -- Create test property
        INSERT INTO public.properties (
            landlord_id,
            name,
            property_type,
            address,
            city,
            state,
            zip_code,
            description,
            images,
            amenities
        ) VALUES (
            test_landlord_id,
            'TEST_Property_MarketplaceVisibility',
            'apartment',
            '123 Test Street',
            'Test City',
            'Test State',
            '12345',
            'Test property for marketplace visibility',
            '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"]'::jsonb,
            '["parking", "wifi", "pool"]'::jsonb
        ) RETURNING id INTO test_property_id;
        
        -- Store property ID
        UPDATE test_context SET landlord_id = test_property_id;
        
        RAISE NOTICE '✓ Created test property: %', test_property_id;
        RAISE NOTICE '  Property should be UNPUBLISHED (no units yet)';
        
        -- Check property status
        IF EXISTS (SELECT 1 FROM public.properties WHERE id = test_property_id AND is_published = FALSE) THEN
            RAISE NOTICE '  ✓ PASS: Property is correctly unpublished';
        ELSE
            RAISE WARNING '  ✗ FAIL: Property should be unpublished but is_published = TRUE';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Add unit with 'draft' status - should NOT be public
-- ============================================================================
DO $$
DECLARE
    test_property_id UUID;
    test_unit_id UUID;
BEGIN
    SELECT landlord_id INTO test_property_id FROM test_context LIMIT 1;
    
    IF test_property_id IS NOT NULL THEN
        INSERT INTO public.units (
            property_id,
            unit_number,
            bedrooms,
            bathrooms,
            rent_amount,
            deposit,
            square_feet,
            listing_status
        ) VALUES (
            test_property_id,
            'UNIT-001',
            2,
            1.5,
            1500.00,
            3000.00,
            850,
            'draft'
        ) RETURNING id INTO test_unit_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✓ Created draft unit: %', test_unit_id;
        RAISE NOTICE '  Testing: Draft unit should NOT be public';
        
        -- Check unit status
        IF EXISTS (SELECT 1 FROM public.units WHERE id = test_unit_id AND is_public_listing = FALSE) THEN
            RAISE NOTICE '  ✓ PASS: Unit is correctly NOT public (is_public_listing = FALSE)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Draft unit should NOT be public but is_public_listing = TRUE';
        END IF;
        
        -- Check property is still unpublished
        IF EXISTS (SELECT 1 FROM public.properties WHERE id = test_property_id AND is_published = FALSE) THEN
            RAISE NOTICE '  ✓ PASS: Property is correctly still unpublished (no available units)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Property should be unpublished (no available units)';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update unit to 'available' - should become public
-- ============================================================================
DO $$
DECLARE
    test_property_id UUID;
    test_unit_id UUID;
BEGIN
    SELECT landlord_id INTO test_property_id FROM test_context LIMIT 1;
    
    IF test_property_id IS NOT NULL THEN
        -- Get the draft unit
        SELECT id INTO test_unit_id FROM public.units 
        WHERE property_id = test_property_id AND unit_number = 'UNIT-001';
        
        -- Update to available
        UPDATE public.units
        SET listing_status = 'available'
        WHERE id = test_unit_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✓ Updated unit to "available"';
        RAISE NOTICE '  Testing: Available unit should be PUBLIC and property should be PUBLISHED';
        
        -- Small delay to let triggers complete
        PERFORM pg_sleep(0.1);
        
        -- Check unit is now public
        IF EXISTS (SELECT 1 FROM public.units WHERE id = test_unit_id AND is_public_listing = TRUE) THEN
            RAISE NOTICE '  ✓ PASS: Unit is correctly public (is_public_listing = TRUE)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Available unit should be public';
        END IF;
        
        -- Check property is now published
        IF EXISTS (SELECT 1 FROM public.properties WHERE id = test_property_id AND is_published = TRUE) THEN
            RAISE NOTICE '  ✓ PASS: Property is correctly published (has available unit)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Property should be published when it has available units';
        END IF;
        
        -- Check if it appears in marketplace view
        IF EXISTS (SELECT 1 FROM public.public_property_listings WHERE unit_id = test_unit_id) THEN
            RAISE NOTICE '  ✓ PASS: Unit appears in public_property_listings view (visible on homepage!)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Unit should appear in public_property_listings view';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Update unit to 'rented' - should become private
-- ============================================================================
DO $$
DECLARE
    test_property_id UUID;
    test_unit_id UUID;
BEGIN
    SELECT landlord_id INTO test_property_id FROM test_context LIMIT 1;
    
    IF test_property_id IS NOT NULL THEN
        SELECT id INTO test_unit_id FROM public.units 
        WHERE property_id = test_property_id AND unit_number = 'UNIT-001';
        
        -- Update to rented
        UPDATE public.units
        SET listing_status = 'rented'
        WHERE id = test_unit_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✓ Updated unit to "rented"';
        RAISE NOTICE '  Testing: Rented unit should NOT be public and property should be UNPUBLISHED';
        
        PERFORM pg_sleep(0.1);
        
        -- Check unit is now private
        IF EXISTS (SELECT 1 FROM public.units WHERE id = test_unit_id AND is_public_listing = FALSE) THEN
            RAISE NOTICE '  ✓ PASS: Unit is correctly not public (is_public_listing = FALSE)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Rented unit should not be public';
        END IF;
        
        -- Check property is now unpublished (no available units)
        IF EXISTS (SELECT 1 FROM public.properties WHERE id = test_property_id AND is_published = FALSE) THEN
            RAISE NOTICE '  ✓ PASS: Property is correctly unpublished (no available units)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Property should be unpublished when all units are rented';
        END IF;
        
        -- Check it does NOT appear in marketplace
        IF NOT EXISTS (SELECT 1 FROM public.public_property_listings WHERE unit_id = test_unit_id) THEN
            RAISE NOTICE '  ✓ PASS: Unit does NOT appear in marketplace (correctly hidden)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Rented unit should NOT appear in public_property_listings';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Add second available unit - should re-publish property
-- ============================================================================
DO $$
DECLARE
    test_property_id UUID;
    test_unit_id UUID;
BEGIN
    SELECT landlord_id INTO test_property_id FROM test_context LIMIT 1;
    
    IF test_property_id IS NOT NULL THEN
        INSERT INTO public.units (
            property_id,
            unit_number,
            bedrooms,
            bathrooms,
            rent_amount,
            deposit,
            square_feet,
            listing_status
        ) VALUES (
            test_property_id,
            'UNIT-002',
            1,
            1.0,
            1200.00,
            2400.00,
            650,
            'available'
        ) RETURNING id INTO test_unit_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '✓ Added second unit with "available" status';
        RAISE NOTICE '  Testing: Property should be RE-PUBLISHED';
        
        PERFORM pg_sleep(0.1);
        
        -- Check new unit is public
        IF EXISTS (SELECT 1 FROM public.units WHERE id = test_unit_id AND is_public_listing = TRUE) THEN
            RAISE NOTICE '  ✓ PASS: New unit is public';
        ELSE
            RAISE WARNING '  ✗ FAIL: New available unit should be public';
        END IF;
        
        -- Check property is published again
        IF EXISTS (SELECT 1 FROM public.properties WHERE id = test_property_id AND is_published = TRUE) THEN
            RAISE NOTICE '  ✓ PASS: Property is re-published (has available unit again)';
        ELSE
            RAISE WARNING '  ✗ FAIL: Property should be published when it has available units';
        END IF;
        
        -- Check it appears in marketplace
        IF EXISTS (SELECT 1 FROM public.public_property_listings WHERE unit_id = test_unit_id) THEN
            RAISE NOTICE '  ✓ PASS: New unit appears in marketplace';
        ELSE
            RAISE WARNING '  ✗ FAIL: Available unit should appear in marketplace';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Display summary
-- ============================================================================
DO $$
DECLARE
    test_property_id UUID;
    total_units INTEGER;
    public_units INTEGER;
    marketplace_units INTEGER;
BEGIN
    SELECT landlord_id INTO test_property_id FROM test_context LIMIT 1;
    
    IF test_property_id IS NOT NULL THEN
        SELECT COUNT(*) INTO total_units 
        FROM public.units WHERE property_id = test_property_id;
        
        SELECT COUNT(*) INTO public_units 
        FROM public.units WHERE property_id = test_property_id AND is_public_listing = TRUE;
        
        SELECT COUNT(*) INTO marketplace_units 
        FROM public.public_property_listings WHERE property_id = test_property_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'TEST SUMMARY';
        RAISE NOTICE '============================================';
        RAISE NOTICE 'Test Property ID: %', test_property_id;
        RAISE NOTICE 'Total Units: %', total_units;
        RAISE NOTICE 'Public Units: %', public_units;
        RAISE NOTICE 'Units in Marketplace: %', marketplace_units;
        RAISE NOTICE '============================================';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: Clean up test data
-- ============================================================================
DO $$
DECLARE
    deleted_units INTEGER;
    deleted_properties INTEGER;
BEGIN
    DELETE FROM public.units WHERE property_id IN (
        SELECT id FROM public.properties WHERE name LIKE 'TEST_%'
    );
    GET DIAGNOSTICS deleted_units = ROW_COUNT;
    
    DELETE FROM public.properties WHERE name LIKE 'TEST_%';
    GET DIAGNOSTICS deleted_properties = ROW_COUNT;
    
    RAISE NOTICE '';
    RAISE NOTICE '✓ Cleaned up test data';
    RAISE NOTICE '  Deleted % units', deleted_units;
    RAISE NOTICE '  Deleted % properties', deleted_properties;
    
    DROP TABLE IF EXISTS test_context;
END $$;

COMMIT;

-- ============================================================================
-- FINAL VERIFICATION: Check production data
-- ============================================================================
RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'PRODUCTION DATA VERIFICATION';
RAISE NOTICE '============================================';

DO $$
DECLARE
    total_properties INTEGER;
    published_properties INTEGER;
    total_units INTEGER;
    available_units INTEGER;
    public_units INTEGER;
    marketplace_listings INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_properties FROM public.properties;
    SELECT COUNT(*) INTO published_properties FROM public.properties WHERE is_published = TRUE;
    SELECT COUNT(*) INTO total_units FROM public.units;
    SELECT COUNT(*) INTO available_units FROM public.units WHERE listing_status = 'available';
    SELECT COUNT(*) INTO public_units FROM public.units WHERE is_public_listing = TRUE;
    SELECT COUNT(*) INTO marketplace_listings FROM public.public_property_listings;
    
    RAISE NOTICE 'Total Properties: %', total_properties;
    RAISE NOTICE 'Published Properties: %', published_properties;
    RAISE NOTICE 'Total Units: %', total_units;
    RAISE NOTICE 'Available Units: %', available_units;
    RAISE NOTICE 'Public Units: %', public_units;
    RAISE NOTICE 'Marketplace Listings: %', marketplace_listings;
    RAISE NOTICE '';
    
    IF marketplace_listings > 0 THEN
        RAISE NOTICE '✓ SUCCESS: Properties are appearing in the marketplace!';
    ELSE
        RAISE NOTICE '⚠ No properties in marketplace. This is normal if:';
        RAISE NOTICE '  1. No properties have been created yet, OR';
        RAISE NOTICE '  2. All units are in draft/rented/maintenance status';
    END IF;
    
    RAISE NOTICE '============================================';
END $$;

-- Show a sample of what's in the marketplace
SELECT 
    property_name,
    city,
    state,
    unit_number,
    bedrooms,
    bathrooms,
    rent_amount,
    unit_featured,
    property_featured
FROM public.public_property_listings
ORDER BY property_featured DESC, unit_featured DESC, created_at DESC
LIMIT 10;
