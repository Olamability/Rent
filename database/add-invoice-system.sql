-- ============================================================================
-- Invoice System Implementation
-- Add comprehensive invoice management for rent and other charges
-- ============================================================================

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    agreement_id UUID REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL,
    
    -- Invoice details
    invoice_type TEXT NOT NULL CHECK (invoice_type IN ('initial_payment', 'monthly_rent', 'late_fee', 'maintenance', 'other')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    
    -- Amount breakdown
    rent_amount DECIMAL(12, 2) DEFAULT 0,
    deposit_amount DECIMAL(12, 2) DEFAULT 0,
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,
    maintenance_amount DECIMAL(12, 2) DEFAULT 0,
    other_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance_due DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Status and payment tracking
    invoice_status TEXT DEFAULT 'pending' CHECK (invoice_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
    paid_at TIMESTAMPTZ,
    
    -- Line items and notes
    line_items JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    terms TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_tenant_id ON public.invoices(tenant_id);
CREATE INDEX idx_invoices_landlord_id ON public.invoices(landlord_id);
CREATE INDEX idx_invoices_unit_id ON public.invoices(unit_id);
CREATE INDEX idx_invoices_agreement_id ON public.invoices(agreement_id);
CREATE INDEX idx_invoices_application_id ON public.invoices(application_id);
CREATE INDEX idx_invoices_status ON public.invoices(invoice_status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON public.invoices(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add application_id column to payments table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'application_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_payments_application_id ON public.payments(application_id);
    END IF;
END $$;

-- Add invoice_id column to payments table to link payments to invoices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'invoice_id'
    ) THEN
        ALTER TABLE public.payments 
        ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
    END IF;
END $$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    invoice_num TEXT;
BEGIN
    -- Get the next invoice number (counting all invoices)
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM public.invoices
    WHERE invoice_number ~ '^INV-\d+$';
    
    -- If no match found, start from 1
    IF next_num IS NULL THEN
        next_num := 1;
    END IF;
    
    -- Format as INV-00001, INV-00002, etc.
    invoice_num := 'INV-' || LPAD(next_num::TEXT, 5, '0');
    
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update invoice status based on paid amount
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    overdue_threshold TIMESTAMPTZ;
BEGIN
    -- Update status based on payment
    IF NEW.paid_amount >= NEW.total_amount THEN
        NEW.invoice_status := 'paid';
        IF NEW.paid_at IS NULL THEN
            NEW.paid_at := NOW();
        END IF;
    ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
        NEW.invoice_status := 'partial';
    ELSIF NEW.due_date < CURRENT_DATE AND NEW.paid_amount < NEW.total_amount THEN
        NEW.invoice_status := 'overdue';
    ELSE
        -- Only set to pending if not already paid/partial
        IF NEW.invoice_status NOT IN ('paid', 'partial') THEN
            NEW.invoice_status := 'pending';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice status automatically
CREATE TRIGGER trigger_update_invoice_status
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoice_status();

-- Function to update invoice paid_amount when payment is made
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- If payment is linked to an invoice and payment is completed
    IF NEW.invoice_id IS NOT NULL AND NEW.status = 'completed' THEN
        UPDATE public.invoices
        SET 
            paid_amount = paid_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update invoice when payment is completed
CREATE TRIGGER trigger_update_invoice_on_payment
    AFTER INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW 
    WHEN (NEW.invoice_id IS NOT NULL AND NEW.status = 'completed')
    EXECUTE FUNCTION update_invoice_on_payment();

-- ============================================================================
-- RLS Policies for invoices
-- ============================================================================

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own invoices
CREATE POLICY "Tenants can view their own invoices" ON public.invoices
    FOR SELECT USING (
        auth.uid() = tenant_id
    );

-- Landlords can view invoices for their units
CREATE POLICY "Landlords can view invoices for their units" ON public.invoices
    FOR SELECT USING (
        auth.uid() = landlord_id
    );

-- Landlords can create invoices for their units
CREATE POLICY "Landlords can create invoices" ON public.invoices
    FOR INSERT WITH CHECK (
        auth.uid() = landlord_id
    );

-- Landlords can update their invoices
CREATE POLICY "Landlords can update invoices" ON public.invoices
    FOR UPDATE USING (
        auth.uid() = landlord_id
    );

-- System can create and update invoices (for automated processes)
CREATE POLICY "Service role can manage all invoices" ON public.invoices
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices" ON public.invoices
    FOR SELECT USING (
        is_admin() OR is_super_admin()
    );

-- Admins can update invoices
CREATE POLICY "Admins can update invoices" ON public.invoices
    FOR UPDATE USING (
        is_admin() OR is_super_admin()
    );

-- ============================================================================
-- Helper function to create invoice from application
-- ============================================================================

CREATE OR REPLACE FUNCTION create_application_invoice(
    p_application_id UUID,
    p_rent_amount DECIMAL,
    p_deposit_amount DECIMAL,
    p_due_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_tenant_id UUID;
    v_landlord_id UUID;
    v_unit_id UUID;
    v_invoice_number TEXT;
BEGIN
    -- Get application details
    SELECT tenant_id, landlord_id, unit_id
    INTO v_tenant_id, v_landlord_id, v_unit_id
    FROM public.property_applications
    WHERE id = p_application_id;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Application not found: %', p_application_id;
    END IF;
    
    -- Generate invoice number
    v_invoice_number := generate_invoice_number();
    
    -- Create invoice
    INSERT INTO public.invoices (
        invoice_number,
        tenant_id,
        landlord_id,
        unit_id,
        application_id,
        invoice_type,
        invoice_date,
        due_date,
        rent_amount,
        deposit_amount,
        total_amount,
        notes,
        terms
    ) VALUES (
        v_invoice_number,
        v_tenant_id,
        v_landlord_id,
        v_unit_id,
        p_application_id,
        'initial_payment',
        CURRENT_DATE,
        p_due_date,
        p_rent_amount,
        p_deposit_amount,
        p_rent_amount + p_deposit_amount,
        'Initial payment for approved rental application',
        'Payment must be completed within 7 days to secure the property. This invoice includes first month rent and security deposit.'
    )
    RETURNING id INTO v_invoice_id;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_application_invoice(UUID, DECIMAL, DECIMAL, DATE) TO authenticated;

COMMENT ON TABLE public.invoices IS 'Invoices for rent, deposits, and other charges';
COMMENT ON FUNCTION generate_invoice_number() IS 'Generates unique invoice numbers in format INV-00001';
COMMENT ON FUNCTION create_application_invoice(UUID, DECIMAL, DECIMAL, DATE) IS 'Creates invoice for approved rental application';
