-- ============================================================================
-- RentFlow Database Schema Enhancement Migration - ROLLBACK
-- Version: 1.0
-- Date: 2026-01-07
-- Description: Rollback script for schema enhancements
-- ============================================================================
-- WARNING: This will remove all enhancements added by the migration
-- Only run this if you need to revert the changes
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_unit_occupancy ON public.tenancy_agreements;
DROP TRIGGER IF EXISTS trigger_update_unit_on_application ON public.property_applications;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.update_unit_occupancy();
DROP FUNCTION IF EXISTS public.update_unit_on_application_approval();

-- ============================================================================
-- 2. DROP VIEWS
-- ============================================================================

DROP VIEW IF EXISTS public.occupied_units_view;
DROP VIEW IF EXISTS public.applications_full_view;

-- ============================================================================
-- 3. REMOVE COLUMNS FROM PROPERTY_APPLICATIONS
-- ============================================================================

ALTER TABLE public.property_applications 
  DROP COLUMN IF EXISTS property_id,
  DROP COLUMN IF EXISTS personal_info,
  DROP COLUMN IF EXISTS employment_info,
  DROP COLUMN IF EXISTS emergency_contact,
  DROP COLUMN IF EXISTS refs,
  DROP COLUMN IF EXISTS previous_landlord,
  DROP COLUMN IF EXISTS pets,
  DROP COLUMN IF EXISTS vehicles,
  DROP COLUMN IF EXISTS occupants,
  DROP COLUMN IF EXISTS documents,
  DROP COLUMN IF EXISTS credit_check_consent,
  DROP COLUMN IF EXISTS background_check_consent,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS current_address;

-- ============================================================================
-- 4. REMOVE COLUMNS FROM SUPPORT_TICKETS
-- ============================================================================

ALTER TABLE public.support_tickets 
  DROP COLUMN IF EXISTS category;

-- ============================================================================
-- 5. REMOVE COLUMNS FROM UNITS
-- ============================================================================

ALTER TABLE public.units 
  DROP COLUMN IF EXISTS is_occupied,
  DROP COLUMN IF EXISTS current_tenant_id;

-- ============================================================================
-- 6. RESTORE ORIGINAL RLS POLICIES
-- ============================================================================

-- Restore original tenant policy
DROP POLICY IF EXISTS "Tenants can view their own applications" ON public.property_applications;
CREATE POLICY "Tenants can view their own applications" ON public.property_applications
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Restore original landlord view policy
DROP POLICY IF EXISTS "Landlords can view applications for their units" ON public.property_applications;
CREATE POLICY "Landlords can view applications for their units" ON public.property_applications
  FOR SELECT
  USING (landlord_id = auth.uid());

-- Restore original landlord update policy
DROP POLICY IF EXISTS "Landlords can update applications for their units" ON public.property_applications;
CREATE POLICY "Landlords can update applications for their units" ON public.property_applications
  FOR UPDATE
  USING (landlord_id = auth.uid());

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After rollback, verify that columns are removed:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name IN ('property_applications', 'support_tickets', 'units')
-- ORDER BY table_name, ordinal_position;
-- ============================================================================
