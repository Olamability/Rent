-- ============================================================================
-- Lease Renewal and Late Fee Tracking System
-- Add fields and functions for lease expiry, renewal, and late payment tracking
-- ============================================================================

-- Add renewal and late fee fields to tenancy_agreements
DO $$ 
BEGIN
    -- Add late fee configuration
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'late_fee_amount'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN late_fee_amount DECIMAL(12, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'late_fee_grace_days'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN late_fee_grace_days INTEGER DEFAULT 3;
    END IF;
    
    -- Add renewal tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'renewal_requested'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN renewal_requested BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'renewal_requested_at'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN renewal_requested_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'renewal_status'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN renewal_status TEXT CHECK (renewal_status IN ('none', 'requested', 'approved', 'rejected', 'completed'));
        
        -- Set default for existing rows
        UPDATE public.tenancy_agreements 
        SET renewal_status = 'none' 
        WHERE renewal_status IS NULL;
        
        ALTER TABLE public.tenancy_agreements 
        ALTER COLUMN renewal_status SET DEFAULT 'none';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'renewal_end_date'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN renewal_end_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'previous_agreement_id'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN previous_agreement_id UUID REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL;
    END IF;
    
    -- Add deposit tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'deposit_status'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN deposit_status TEXT DEFAULT 'held' CHECK (deposit_status IN ('held', 'refunded', 'forfeited'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'deposit_refunded_at'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN deposit_refunded_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'deposit_refund_amount'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN deposit_refund_amount DECIMAL(12, 2);
    END IF;
END $$;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_renewal_status 
    ON public.tenancy_agreements(renewal_status);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_deposit_status 
    ON public.tenancy_agreements(deposit_status);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_previous_agreement 
    ON public.tenancy_agreements(previous_agreement_id);

-- ============================================================================
-- Late Payment Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.late_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    agreement_id UUID REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
    
    -- Late payment details
    original_due_date DATE NOT NULL,
    days_late INTEGER NOT NULL,
    late_fee_amount DECIMAL(12, 2) NOT NULL,
    late_fee_paid BOOLEAN DEFAULT FALSE,
    late_fee_paid_at TIMESTAMPTZ,
    
    -- Status
    late_payment_status TEXT DEFAULT 'pending' CHECK (late_payment_status IN ('pending', 'paid', 'waived', 'in_dispute')),
    waived_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    waived_at TIMESTAMPTZ,
    waiver_reason TEXT,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_late_payments_payment_id ON public.late_payments(payment_id);
CREATE INDEX idx_late_payments_invoice_id ON public.late_payments(invoice_id);
CREATE INDEX idx_late_payments_tenant_id ON public.late_payments(tenant_id);
CREATE INDEX idx_late_payments_landlord_id ON public.late_payments(landlord_id);
CREATE INDEX idx_late_payments_status ON public.late_payments(late_payment_status);
CREATE INDEX idx_late_payments_created_at ON public.late_payments(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_late_payments_updated_at 
    BEFORE UPDATE ON public.late_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Lease Renewal Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lease_renewals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_agreement_id UUID NOT NULL REFERENCES public.tenancy_agreements(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    
    -- Renewal details
    requested_start_date DATE NOT NULL,
    requested_end_date DATE NOT NULL,
    requested_rent_amount DECIMAL(12, 2),
    proposed_rent_amount DECIMAL(12, 2),
    
    -- Status
    renewal_status TEXT DEFAULT 'pending' CHECK (renewal_status IN ('pending', 'approved', 'rejected', 'withdrawn', 'completed')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- New agreement
    new_agreement_id UUID REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
    
    -- Notes
    tenant_notes TEXT,
    landlord_notes TEXT,
    rejection_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lease_renewals_current_agreement ON public.lease_renewals(current_agreement_id);
CREATE INDEX idx_lease_renewals_tenant_id ON public.lease_renewals(tenant_id);
CREATE INDEX idx_lease_renewals_landlord_id ON public.lease_renewals(landlord_id);
CREATE INDEX idx_lease_renewals_status ON public.lease_renewals(renewal_status);
CREATE INDEX idx_lease_renewals_new_agreement ON public.lease_renewals(new_agreement_id);

-- Add trigger for updated_at
CREATE TRIGGER update_lease_renewals_updated_at 
    BEFORE UPDATE ON public.lease_renewals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Functions for Late Payment Tracking
-- ============================================================================

-- Function to calculate late fee based on agreement settings
CREATE OR REPLACE FUNCTION calculate_late_fee(
    p_agreement_id UUID,
    p_payment_amount DECIMAL,
    p_days_late INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    v_late_fee_amount DECIMAL;
    v_grace_days INTEGER;
BEGIN
    -- Get late fee configuration from agreement
    SELECT late_fee_amount, late_fee_grace_days
    INTO v_late_fee_amount, v_grace_days
    FROM public.tenancy_agreements
    WHERE id = p_agreement_id;
    
    -- If within grace period, no late fee
    IF p_days_late <= COALESCE(v_grace_days, 3) THEN
        RETURN 0;
    END IF;
    
    -- Return configured late fee amount
    -- Can be enhanced to calculate percentage-based fees
    RETURN COALESCE(v_late_fee_amount, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to create late payment record
CREATE OR REPLACE FUNCTION create_late_payment_record(
    p_payment_id UUID,
    p_invoice_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_late_payment_id UUID;
    v_payment_record RECORD;
    v_days_late INTEGER;
    v_late_fee DECIMAL;
BEGIN
    -- Get payment details
    SELECT 
        p.tenant_id,
        p.landlord_id,
        p.unit_id,
        p.agreement_id,
        p.due_date,
        p.amount,
        CURRENT_DATE - p.due_date AS days_overdue
    INTO v_payment_record
    FROM public.payments p
    WHERE p.id = p_payment_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found: %', p_payment_id;
    END IF;
    
    -- Calculate days late
    v_days_late := v_payment_record.days_overdue;
    
    IF v_days_late <= 0 THEN
        RAISE EXCEPTION 'Payment is not late';
    END IF;
    
    -- Calculate late fee
    v_late_fee := calculate_late_fee(
        v_payment_record.agreement_id,
        v_payment_record.amount,
        v_days_late
    );
    
    -- Create late payment record
    INSERT INTO public.late_payments (
        payment_id,
        invoice_id,
        tenant_id,
        landlord_id,
        unit_id,
        agreement_id,
        original_due_date,
        days_late,
        late_fee_amount,
        notes
    ) VALUES (
        p_payment_id,
        p_invoice_id,
        v_payment_record.tenant_id,
        v_payment_record.landlord_id,
        v_payment_record.unit_id,
        v_payment_record.agreement_id,
        v_payment_record.due_date,
        v_days_late,
        v_late_fee,
        'Automatically generated late payment record'
    )
    RETURNING id INTO v_late_payment_id;
    
    RETURN v_late_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Functions for Lease Renewal
-- ============================================================================

-- Function to create lease renewal request
CREATE OR REPLACE FUNCTION request_lease_renewal(
    p_agreement_id UUID,
    p_requested_end_date DATE,
    p_tenant_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_renewal_id UUID;
    v_agreement RECORD;
BEGIN
    -- Get current agreement details
    SELECT 
        tenant_id,
        landlord_id,
        unit_id,
        end_date,
        rent_amount
    INTO v_agreement
    FROM public.tenancy_agreements
    WHERE id = p_agreement_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agreement not found: %', p_agreement_id;
    END IF;
    
    -- Create renewal request
    INSERT INTO public.lease_renewals (
        current_agreement_id,
        tenant_id,
        landlord_id,
        unit_id,
        requested_start_date,
        requested_end_date,
        requested_rent_amount,
        tenant_notes
    ) VALUES (
        p_agreement_id,
        v_agreement.tenant_id,
        v_agreement.landlord_id,
        v_agreement.unit_id,
        v_agreement.end_date + INTERVAL '1 day',
        p_requested_end_date,
        v_agreement.rent_amount,
        p_tenant_notes
    )
    RETURNING id INTO v_renewal_id;
    
    -- Update original agreement
    UPDATE public.tenancy_agreements
    SET 
        renewal_requested = TRUE,
        renewal_requested_at = NOW(),
        renewal_status = 'requested'
    WHERE id = p_agreement_id;
    
    RETURN v_renewal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve lease renewal and create new agreement
CREATE OR REPLACE FUNCTION approve_lease_renewal(
    p_renewal_id UUID,
    p_proposed_rent_amount DECIMAL DEFAULT NULL,
    p_landlord_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_renewal RECORD;
    v_new_agreement_id UUID;
    v_final_rent_amount DECIMAL;
BEGIN
    -- Get renewal details
    SELECT * INTO v_renewal
    FROM public.lease_renewals
    WHERE id = p_renewal_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Renewal request not found: %', p_renewal_id;
    END IF;
    
    -- Determine final rent amount
    v_final_rent_amount := COALESCE(p_proposed_rent_amount, v_renewal.requested_rent_amount);
    
    -- Create new tenancy agreement
    INSERT INTO public.tenancy_agreements (
        unit_id,
        tenant_id,
        landlord_id,
        start_date,
        end_date,
        rent_amount,
        deposit_amount,
        agreement_status,
        previous_agreement_id,
        agreement_terms
    )
    SELECT 
        unit_id,
        tenant_id,
        landlord_id,
        v_renewal.requested_start_date,
        v_renewal.requested_end_date,
        v_final_rent_amount,
        deposit_amount,
        'draft',
        current_agreement_id,
        'Renewal of lease agreement'
    FROM public.tenancy_agreements
    WHERE id = v_renewal.current_agreement_id
    RETURNING id INTO v_new_agreement_id;
    
    -- Update renewal record
    UPDATE public.lease_renewals
    SET 
        renewal_status = 'approved',
        responded_at = NOW(),
        proposed_rent_amount = v_final_rent_amount,
        landlord_notes = p_landlord_notes,
        new_agreement_id = v_new_agreement_id
    WHERE id = p_renewal_id;
    
    -- Update original agreement
    UPDATE public.tenancy_agreements
    SET renewal_status = 'approved'
    WHERE id = v_renewal.current_agreement_id;
    
    RETURN v_new_agreement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Late Payments RLS
ALTER TABLE public.late_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their late payments" ON public.late_payments
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view late payments for their units" ON public.late_payments
    FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Admins can view all late payments" ON public.late_payments
    FOR SELECT USING (is_admin() OR is_super_admin());

CREATE POLICY "Service role can manage late payments" ON public.late_payments
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Lease Renewals RLS
ALTER TABLE public.lease_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their renewal requests" ON public.lease_renewals
    FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create renewal requests" ON public.lease_renewals
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view renewal requests for their units" ON public.lease_renewals
    FOR SELECT USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update renewal requests" ON public.lease_renewals
    FOR UPDATE USING (auth.uid() = landlord_id);

CREATE POLICY "Admins can view all renewal requests" ON public.lease_renewals
    FOR SELECT USING (is_admin() OR is_super_admin());

CREATE POLICY "Service role can manage renewals" ON public.lease_renewals
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_late_fee(UUID, DECIMAL, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_late_payment_record(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_lease_renewal(UUID, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_lease_renewal(UUID, DECIMAL, TEXT) TO authenticated;

COMMENT ON TABLE public.late_payments IS 'Tracks late rent payments and associated fees';
COMMENT ON TABLE public.lease_renewals IS 'Tracks lease renewal requests and approvals';
COMMENT ON FUNCTION calculate_late_fee(UUID, DECIMAL, INTEGER) IS 'Calculates late fee based on agreement settings';
COMMENT ON FUNCTION request_lease_renewal(UUID, DATE, TEXT) IS 'Creates a lease renewal request from tenant';
COMMENT ON FUNCTION approve_lease_renewal(UUID, DECIMAL, TEXT) IS 'Approves renewal and creates new agreement';
