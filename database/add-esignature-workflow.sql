-- ============================================================================
-- E-Signature and Agreement Signing Workflow
-- Enhanced signature tracking and property locking mechanism
-- ============================================================================

-- Add enhanced signature tracking fields to tenancy_agreements if not exists
DO $$ 
BEGIN
    -- Tenant signature metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'tenant_signature_ip'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN tenant_signature_ip TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'tenant_signature_timestamp'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN tenant_signature_timestamp TIMESTAMPTZ;
    END IF;
    
    -- Landlord signature metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'landlord_signature_ip'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN landlord_signature_ip TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'landlord_signature_timestamp'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN landlord_signature_timestamp TIMESTAMPTZ;
    END IF;
    
    -- Document hash for integrity verification
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'document_hash'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN document_hash TEXT;
    END IF;
    
    -- Signature version/method tracking
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tenancy_agreements' 
        AND column_name = 'signature_method'
    ) THEN
        ALTER TABLE public.tenancy_agreements 
        ADD COLUMN signature_method TEXT DEFAULT 'digital' CHECK (signature_method IN ('digital', 'typed', 'drawn'));
    END IF;
END $$;

-- Function to sign agreement by tenant
CREATE OR REPLACE FUNCTION sign_agreement_tenant(
    p_agreement_id UUID,
    p_signature_data TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_agreement RECORD;
BEGIN
    -- Get agreement details
    SELECT * INTO v_agreement
    FROM public.tenancy_agreements
    WHERE id = p_agreement_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agreement not found: %', p_agreement_id;
    END IF;
    
    -- Verify user is the tenant
    IF v_agreement.tenant_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the tenant can sign this agreement';
    END IF;
    
    -- Check if already signed by tenant
    IF v_agreement.tenant_signature IS NOT NULL THEN
        RAISE EXCEPTION 'Agreement already signed by tenant';
    END IF;
    
    -- Update with tenant signature
    UPDATE public.tenancy_agreements
    SET 
        tenant_signature = p_signature_data,
        tenant_signature_timestamp = NOW(),
        tenant_signature_ip = p_ip_address,
        updated_at = NOW()
    WHERE id = p_agreement_id;
    
    -- If both parties have signed, activate the agreement
    IF v_agreement.landlord_signature IS NOT NULL THEN
        PERFORM activate_signed_agreement(p_agreement_id);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sign agreement by landlord
CREATE OR REPLACE FUNCTION sign_agreement_landlord(
    p_agreement_id UUID,
    p_signature_data TEXT,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_agreement RECORD;
BEGIN
    -- Get agreement details
    SELECT * INTO v_agreement
    FROM public.tenancy_agreements
    WHERE id = p_agreement_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agreement not found: %', p_agreement_id;
    END IF;
    
    -- Verify user is the landlord
    IF v_agreement.landlord_id != auth.uid() THEN
        RAISE EXCEPTION 'Only the landlord can sign this agreement';
    END IF;
    
    -- Check if already signed by landlord
    IF v_agreement.landlord_signature IS NOT NULL THEN
        RAISE EXCEPTION 'Agreement already signed by landlord';
    END IF;
    
    -- Update with landlord signature
    UPDATE public.tenancy_agreements
    SET 
        landlord_signature = p_signature_data,
        landlord_signature_timestamp = NOW(),
        landlord_signature_ip = p_ip_address,
        updated_at = NOW()
    WHERE id = p_agreement_id;
    
    -- If both parties have signed, activate the agreement
    IF v_agreement.tenant_signature IS NOT NULL THEN
        PERFORM activate_signed_agreement(p_agreement_id);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate agreement after both signatures
CREATE OR REPLACE FUNCTION activate_signed_agreement(
    p_agreement_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_agreement RECORD;
    v_tenant_name TEXT;
    v_landlord_name TEXT;
    v_property_name TEXT;
BEGIN
    -- Get agreement details with related info
    SELECT 
        ta.*,
        u_tenant.name as tenant_name,
        u_landlord.name as landlord_name,
        p.name as property_name
    INTO v_agreement
    FROM public.tenancy_agreements ta
    JOIN public.users u_tenant ON ta.tenant_id = u_tenant.id
    JOIN public.users u_landlord ON ta.landlord_id = u_landlord.id
    JOIN public.units un ON ta.unit_id = un.id
    JOIN public.properties p ON un.property_id = p.id
    WHERE ta.id = p_agreement_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agreement not found: %', p_agreement_id;
    END IF;
    
    -- Verify both parties have signed
    IF v_agreement.tenant_signature IS NULL OR v_agreement.landlord_signature IS NULL THEN
        RAISE EXCEPTION 'Agreement requires signatures from both parties';
    END IF;
    
    -- Update agreement status to active
    UPDATE public.tenancy_agreements
    SET 
        agreement_status = 'active',
        signed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_agreement_id;
    
    -- Lock the unit (mark as rented)
    UPDATE public.units
    SET 
        listing_status = 'rented',
        is_public_listing = FALSE,
        updated_at = NOW()
    WHERE id = v_agreement.unit_id;
    
    -- Create notifications
    -- Notify tenant
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_agreement.tenant_id,
        'Agreement Activated! 🎉',
        'Your tenancy agreement for ' || v_agreement.property_name || ' is now active. Welcome to your new home!',
        'success',
        '/tenant/agreements'
    );
    
    -- Notify landlord
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        action_url
    ) VALUES (
        v_agreement.landlord_id,
        'Agreement Activated',
        v_agreement.tenant_name || ' has completed signing the agreement for ' || v_agreement.property_name || '. The property is now rented.',
        'success',
        '/landlord/tenancy-agreements'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get signature status
CREATE OR REPLACE FUNCTION get_agreement_signature_status(
    p_agreement_id UUID
)
RETURNS TABLE (
    tenant_signed BOOLEAN,
    landlord_signed BOOLEAN,
    tenant_signature_timestamp TIMESTAMPTZ,
    landlord_signature_timestamp TIMESTAMPTZ,
    fully_signed BOOLEAN,
    agreement_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (tenant_signature IS NOT NULL) as tenant_signed,
        (landlord_signature IS NOT NULL) as landlord_signed,
        ta.tenant_signature_timestamp,
        ta.landlord_signature_timestamp,
        (tenant_signature IS NOT NULL AND landlord_signature IS NOT NULL) as fully_signed,
        ta.agreement_status
    FROM public.tenancy_agreements ta
    WHERE ta.id = p_agreement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if unit is locked (prevent duplicate applications)
CREATE OR REPLACE FUNCTION is_unit_locked(p_unit_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT listing_status INTO v_status
    FROM public.units
    WHERE id = p_unit_id;
    
    -- Unit is locked if it's rented or has a pending active agreement
    IF v_status = 'rented' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if there's an active or draft agreement for this unit
    IF EXISTS (
        SELECT 1 FROM public.tenancy_agreements
        WHERE unit_id = p_unit_id
        AND agreement_status IN ('active', 'draft')
        AND (tenant_signature IS NOT NULL OR landlord_signature IS NOT NULL)
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent applications on locked units
CREATE OR REPLACE FUNCTION prevent_application_on_locked_unit()
RETURNS TRIGGER AS $$
BEGIN
    IF is_unit_locked(NEW.unit_id) THEN
        RAISE EXCEPTION 'This unit is no longer available for applications';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_prevent_locked_unit_application'
    ) THEN
        CREATE TRIGGER trigger_prevent_locked_unit_application
            BEFORE INSERT ON public.property_applications
            FOR EACH ROW
            EXECUTE FUNCTION prevent_application_on_locked_unit();
    END IF;
END $$;

-- Function to unlock unit when agreement terminates
CREATE OR REPLACE FUNCTION unlock_unit_on_termination()
RETURNS TRIGGER AS $$
BEGIN
    -- If agreement is being terminated or expired, unlock the unit
    IF NEW.agreement_status IN ('terminated', 'expired') 
       AND OLD.agreement_status NOT IN ('terminated', 'expired') THEN
        
        UPDATE public.units
        SET 
            listing_status = 'available',
            is_public_listing = TRUE,
            updated_at = NOW()
        WHERE id = NEW.unit_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_unlock_unit_on_termination'
    ) THEN
        CREATE TRIGGER trigger_unlock_unit_on_termination
            AFTER UPDATE ON public.tenancy_agreements
            FOR EACH ROW
            WHEN (NEW.agreement_status IN ('terminated', 'expired'))
            EXECUTE FUNCTION unlock_unit_on_termination();
    END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sign_agreement_tenant(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION sign_agreement_landlord(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agreement_signature_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_unit_locked(UUID) TO authenticated;

COMMENT ON FUNCTION sign_agreement_tenant(UUID, TEXT, TEXT) IS 'Sign agreement as tenant with signature tracking';
COMMENT ON FUNCTION sign_agreement_landlord(UUID, TEXT, TEXT) IS 'Sign agreement as landlord with signature tracking';
COMMENT ON FUNCTION activate_signed_agreement(UUID) IS 'Activate agreement and lock property after both signatures';
COMMENT ON FUNCTION get_agreement_signature_status(UUID) IS 'Get current signature status of agreement';
COMMENT ON FUNCTION is_unit_locked(UUID) IS 'Check if unit is locked and unavailable for new applications';
