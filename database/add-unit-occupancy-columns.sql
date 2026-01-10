-- ============================================================================
-- Add Unit Occupancy Tracking Columns
-- This migration adds columns to track unit occupancy and current tenants
-- ============================================================================

-- Add is_occupied column if it doesn't exist
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
        
        CREATE INDEX idx_units_is_occupied ON public.units(is_occupied);
        
        COMMENT ON COLUMN public.units.is_occupied IS 'Indicates if the unit is currently occupied by a tenant';
    END IF;
END $$;

-- Add current_tenant_id column if it doesn't exist
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
        
        CREATE INDEX idx_units_current_tenant_id ON public.units(current_tenant_id);
        
        COMMENT ON COLUMN public.units.current_tenant_id IS 'References the user_id of the current tenant occupying this unit';
    END IF;
END $$;

-- Backfill is_occupied based on listing_status for existing data
UPDATE public.units 
SET is_occupied = TRUE 
WHERE listing_status = 'rented' AND is_occupied = FALSE;

-- Add check constraint to ensure consistency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'units_occupied_status_consistency'
    ) THEN
        ALTER TABLE public.units 
        ADD CONSTRAINT units_occupied_status_consistency 
        CHECK (
            (listing_status = 'rented' AND is_occupied = TRUE) OR 
            (listing_status != 'rented')
        );
    END IF;
END $$;

-- Add trigger to maintain consistency between listing_status and is_occupied
CREATE OR REPLACE FUNCTION maintain_unit_occupancy_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When marking as rented, ensure is_occupied is true
    IF NEW.listing_status = 'rented' THEN
        NEW.is_occupied := TRUE;
    END IF;
    
    -- When marking as not rented, ensure is_occupied is false and clear tenant
    IF NEW.listing_status != 'rented' AND OLD.listing_status = 'rented' THEN
        NEW.is_occupied := FALSE;
        NEW.current_tenant_id := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_maintain_unit_occupancy ON public.units;
CREATE TRIGGER trigger_maintain_unit_occupancy
    BEFORE UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION maintain_unit_occupancy_status();

-- Add comment to explain the migration
COMMENT ON TABLE public.units IS 'Rental units within properties. Tracks availability, occupancy status, and current tenant.';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Unit occupancy columns and triggers added successfully';
END $$;
