-- ============================================================================
-- RentFlow Database Schema Enhancement Migration
-- Version: 1.0
-- Date: 2026-01-07
-- Description: Add missing fields to improve features and UX
-- ============================================================================
-- This migration adds:
-- 1. property_id FK to property_applications
-- 2. Extended JSONB fields to property_applications for rich application data
-- 3. category field to support_tickets
-- 4. is_occupied and current_tenant_id fields to units
-- 5. Indexes for performance
-- 6. Triggers for automatic occupancy management
-- ============================================================================

-- Start transaction
BEGIN;

-- ============================================================================
-- 1. ENHANCE PROPERTY_APPLICATIONS TABLE
-- ============================================================================

-- Add property_id foreign key column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'property_id'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE;
    
    -- Populate property_id from existing unit relationships
    UPDATE public.property_applications pa
    SET property_id = u.property_id
    FROM public.units u
    WHERE pa.unit_id = u.id
    AND pa.property_id IS NULL;
    
    -- Create index for property_id
    CREATE INDEX idx_property_applications_property_id 
    ON public.property_applications(property_id);
  END IF;
END $$;

-- Add JSONB fields for extended application data
DO $$ 
BEGIN
  -- Personal information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'personal_info'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN personal_info JSONB;
  END IF;

  -- Employment information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'employment_info'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN employment_info JSONB;
  END IF;

  -- Emergency contact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'emergency_contact'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN emergency_contact JSONB;
  END IF;

  -- References
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'refs'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN refs JSONB DEFAULT '[]'::JSONB;
  END IF;

  -- Previous landlord reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'previous_landlord'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN previous_landlord JSONB;
  END IF;

  -- Pet information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'pets'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN pets JSONB;
  END IF;

  -- Vehicle information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'vehicles'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN vehicles JSONB;
  END IF;

  -- Occupants information
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'occupants'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN occupants JSONB;
  END IF;

  -- Documents/attachments
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'documents'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN documents JSONB DEFAULT '{}'::JSONB;
  END IF;

  -- Consent fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'credit_check_consent'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN credit_check_consent BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'background_check_consent'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN background_check_consent BOOLEAN DEFAULT FALSE;
  END IF;

  -- Notes fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN notes TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'admin_notes'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN admin_notes TEXT;
  END IF;

  -- Current address
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'property_applications' 
    AND column_name = 'current_address'
  ) THEN
    ALTER TABLE public.property_applications 
    ADD COLUMN current_address JSONB;
  END IF;
END $$;

-- Add comment to document the structure
COMMENT ON COLUMN public.property_applications.personal_info IS 
'JSONB: {firstName, lastName, dateOfBirth, phone, email, nationalId}';

COMMENT ON COLUMN public.property_applications.employment_info IS 
'JSONB: {employer, position, income, employmentDuration, employerPhone}';

COMMENT ON COLUMN public.property_applications.emergency_contact IS 
'JSONB: {name, relationship, phone, email}';

COMMENT ON COLUMN public.property_applications.refs IS 
'JSONB Array: [{name, phone, email, relationship}]';

COMMENT ON COLUMN public.property_applications.previous_landlord IS 
'JSONB: {name, phone, address, rentalDuration}';

COMMENT ON COLUMN public.property_applications.pets IS 
'JSONB: {hasPets, petDetails}';

COMMENT ON COLUMN public.property_applications.vehicles IS 
'JSONB: {hasVehicle, vehicleDetails}';

COMMENT ON COLUMN public.property_applications.occupants IS 
'JSONB: {numberOfOccupants, occupantDetails}';

COMMENT ON COLUMN public.property_applications.documents IS 
'JSONB: {idCard, proofOfIncome, refs, bankStatement, previousLeaseAgreement}';

COMMENT ON COLUMN public.property_applications.current_address IS 
'JSONB: {street, city, state, zipCode, duration}';

-- ============================================================================
-- 2. ENHANCE SUPPORT_TICKETS TABLE
-- ============================================================================

-- Add category field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'support_tickets' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.support_tickets 
    ADD COLUMN category TEXT CHECK (category IN ('technical', 'billing', 'general', 'maintenance', 'feature_request', 'complaint'));
    
    -- Set default category for existing tickets
    UPDATE public.support_tickets 
    SET category = 'general' 
    WHERE category IS NULL;
    
    -- Create index for category
    CREATE INDEX idx_support_tickets_category 
    ON public.support_tickets(category);
  END IF;
END $$;

-- ============================================================================
-- 3. ENHANCE UNITS TABLE
-- ============================================================================

-- Add is_occupied field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'units' 
    AND column_name = 'is_occupied'
  ) THEN
    ALTER TABLE public.units 
    ADD COLUMN is_occupied BOOLEAN DEFAULT FALSE;
    
    -- Populate is_occupied based on existing tenancy agreements
    UPDATE public.units u
    SET is_occupied = TRUE
    WHERE EXISTS (
      SELECT 1 FROM public.tenancy_agreements ta
      WHERE ta.unit_id = u.id
      AND ta.start_date <= CURRENT_DATE
      AND ta.end_date >= CURRENT_DATE
      AND ta.agreement_status = 'active'
    );
    
    -- Create index for is_occupied
    CREATE INDEX idx_units_is_occupied 
    ON public.units(is_occupied);
  END IF;
END $$;

-- Add current_tenant_id field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'units' 
    AND column_name = 'current_tenant_id'
  ) THEN
    ALTER TABLE public.units 
    ADD COLUMN current_tenant_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    
    -- Populate current_tenant_id based on active tenancy agreements
    UPDATE public.units u
    SET current_tenant_id = (
      SELECT ta.tenant_id 
      FROM public.tenancy_agreements ta
      WHERE ta.unit_id = u.id
      AND ta.start_date <= CURRENT_DATE
      AND ta.end_date >= CURRENT_DATE
      AND ta.agreement_status = 'active'
      ORDER BY ta.start_date DESC
      LIMIT 1
    );
    
    -- Create index for current_tenant_id
    CREATE INDEX idx_units_current_tenant_id 
    ON public.units(current_tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE TRIGGERS FOR AUTOMATIC OCCUPANCY MANAGEMENT
-- ============================================================================

-- Function to update unit occupancy when tenancy agreement changes
CREATE OR REPLACE FUNCTION public.update_unit_occupancy()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new tenancy agreement is created or updated to active
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.agreement_status = 'active' THEN
    -- Check if the agreement is currently active (within date range)
    IF NEW.start_date <= CURRENT_DATE AND NEW.end_date >= CURRENT_DATE THEN
      UPDATE public.units
      SET 
        is_occupied = TRUE,
        current_tenant_id = NEW.tenant_id,
        listing_status = 'rented'
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  -- When a tenancy agreement is terminated or expires
  -- Note: Condition 'end_date < CURRENT_DATE' means the agreement expires AFTER the end_date
  -- Example: If end_date = 2026-01-07, the unit stays occupied on Jan 7, becomes vacant on Jan 8
  -- This gives tenant the full day on end_date (standard rental practice)
  IF (TG_OP = 'UPDATE') AND (NEW.agreement_status IN ('terminated', 'expired') OR NEW.end_date < CURRENT_DATE) THEN
    -- Check if there are no other active agreements for this unit
    IF NOT EXISTS (
      SELECT 1 FROM public.tenancy_agreements
      WHERE unit_id = NEW.unit_id
      AND agreement_status = 'active'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
      AND id != NEW.id
    ) THEN
      UPDATE public.units
      SET 
        is_occupied = FALSE,
        current_tenant_id = NULL,
        listing_status = 'available'
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  -- When a tenancy agreement is deleted
  IF TG_OP = 'DELETE' THEN
    -- Check if there are no other active agreements for this unit
    IF NOT EXISTS (
      SELECT 1 FROM public.tenancy_agreements
      WHERE unit_id = OLD.unit_id
      AND agreement_status = 'active'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    ) THEN
      UPDATE public.units
      SET 
        is_occupied = FALSE,
        current_tenant_id = NULL,
        listing_status = 'available'
      WHERE id = OLD.unit_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_unit_occupancy ON public.tenancy_agreements;

CREATE TRIGGER trigger_update_unit_occupancy
  AFTER INSERT OR UPDATE OR DELETE ON public.tenancy_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unit_occupancy();

-- Function to update occupancy when application is approved
CREATE OR REPLACE FUNCTION public.update_unit_on_application_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- When application is approved, mark unit as applied (not yet occupied)
  IF (TG_OP = 'UPDATE') AND NEW.application_status = 'approved' AND OLD.application_status != 'approved' THEN
    UPDATE public.units
    SET listing_status = 'rented'
    WHERE id = NEW.unit_id
    AND listing_status = 'available';
  END IF;

  -- When application is rejected or withdrawn, mark unit as available again
  IF (TG_OP = 'UPDATE') AND NEW.application_status IN ('rejected', 'withdrawn') AND OLD.application_status NOT IN ('rejected', 'withdrawn') THEN
    -- Only update if no active tenancy agreement exists
    IF NOT EXISTS (
      SELECT 1 FROM public.tenancy_agreements
      WHERE unit_id = NEW.unit_id
      AND agreement_status = 'active'
      AND start_date <= CURRENT_DATE
      AND end_date >= CURRENT_DATE
    ) THEN
      UPDATE public.units
      SET listing_status = 'available'
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_unit_on_application ON public.property_applications;

CREATE TRIGGER trigger_update_unit_on_application
  AFTER UPDATE ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unit_on_application_approval();

-- ============================================================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for JSONB fields to improve query performance
CREATE INDEX IF NOT EXISTS idx_property_applications_employment_info_gin 
ON public.property_applications USING gin(employment_info);

CREATE INDEX IF NOT EXISTS idx_property_applications_personal_info_gin 
ON public.property_applications USING gin(personal_info);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_units_occupied_status 
ON public.units(is_occupied, listing_status);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category_status 
ON public.support_tickets(category, status);

-- ============================================================================
-- 6. UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- Update existing policies to consider new property_id field
-- Tenants can view applications for properties (through property_id or unit_id)
DROP POLICY IF EXISTS "Tenants can view their own applications" ON public.property_applications;
CREATE POLICY "Tenants can view their own applications" ON public.property_applications
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Landlords can view applications for their properties (now using property_id)
DROP POLICY IF EXISTS "Landlords can view applications for their units" ON public.property_applications;
CREATE POLICY "Landlords can view applications for their units" ON public.property_applications
  FOR SELECT
  USING (
    landlord_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.landlord_id = auth.uid()
    )
  );

-- Landlords can update applications for their properties
DROP POLICY IF EXISTS "Landlords can update applications for their units" ON public.property_applications;
CREATE POLICY "Landlords can update applications for their units" ON public.property_applications
  FOR UPDATE
  USING (
    landlord_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.landlord_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. ADD HELPER VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for occupied units with tenant information
CREATE OR REPLACE VIEW public.occupied_units_view AS
SELECT 
  u.id as unit_id,
  u.unit_number,
  u.property_id,
  u.is_occupied,
  u.current_tenant_id,
  u.rent_amount,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone,
  ta.start_date as tenancy_start,
  ta.end_date as tenancy_end,
  p.name as property_name,
  p.address as property_address
FROM public.units u
LEFT JOIN public.users t ON u.current_tenant_id = t.id
LEFT JOIN public.tenancy_agreements ta ON ta.unit_id = u.id 
  AND ta.tenant_id = u.current_tenant_id
  AND ta.agreement_status = 'active'
  AND ta.start_date <= CURRENT_DATE
  AND ta.end_date >= CURRENT_DATE
LEFT JOIN public.properties p ON u.property_id = p.id
WHERE u.is_occupied = TRUE;

-- View for applications with full details
CREATE OR REPLACE VIEW public.applications_full_view AS
SELECT 
  pa.id as application_id,
  pa.tenant_id,
  pa.landlord_id,
  pa.unit_id,
  pa.property_id,
  pa.application_status,
  pa.move_in_date,
  pa.personal_info,
  pa.employment_info,
  pa.emergency_contact,
  pa.refs,
  pa.previous_landlord,
  pa.pets,
  pa.vehicles,
  pa.occupants,
  pa.documents,
  pa.credit_check_consent,
  pa.background_check_consent,
  pa.notes,
  pa.admin_notes,
  pa.created_at,
  pa.reviewed_at,
  t.name as tenant_name,
  t.email as tenant_email,
  t.phone as tenant_phone,
  l.name as landlord_name,
  u.unit_number,
  u.rent_amount,
  u.bedrooms,
  u.bathrooms,
  p.name as property_name,
  p.address as property_address,
  p.city as property_city
FROM public.property_applications pa
LEFT JOIN public.users t ON pa.tenant_id = t.id
LEFT JOIN public.users l ON pa.landlord_id = l.id
LEFT JOIN public.units u ON pa.unit_id = u.id
LEFT JOIN public.properties p ON pa.property_id = p.id;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:
--
-- 1. Check property_applications columns:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'property_applications' 
-- ORDER BY ordinal_position;
--
-- 2. Check support_tickets category:
-- SELECT DISTINCT category FROM public.support_tickets;
--
-- 3. Check units occupancy:
-- SELECT is_occupied, COUNT(*) FROM public.units GROUP BY is_occupied;
--
-- 4. Check triggers:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_schema = 'public';
-- ============================================================================
