-- ============================================================================
-- Fix: Allow Public Access to Published Properties
-- ============================================================================
-- This policy allows anyone (including unauthenticated users) to view published properties.
-- This is necessary for the property details page to work when accessed from the public marketplace.
--
-- Without this policy, when an unauthenticated user clicks "View Details" on a property
-- from the homepage marketplace, they get a "Property not found" error because the
-- fetchPropertyById() function is blocked by RLS on the properties table.
--
-- The public_property_listings view works because the units table has a policy:
-- "Tenants can view public listings" which allows SELECT on units with is_public_listing = TRUE
--
-- However, when PropertyDetails component directly queries the properties table,
-- it needs this additional policy to allow public access.
-- ============================================================================

-- Add RLS policy to allow anyone to view published properties
CREATE POLICY "Anyone can view published properties" ON public.properties
    FOR SELECT USING (is_published = TRUE);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'properties' 
AND policyname = 'Anyone can view published properties';

