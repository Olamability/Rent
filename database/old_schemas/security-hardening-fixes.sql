-- ============================================================================
-- RentFlow Database Security Hardening
-- ============================================================================
-- This script fixes security vulnerabilities in SECURITY DEFINER functions
-- by adding SET search_path to prevent search_path hijacking attacks
--
-- CRITICAL: All SECURITY DEFINER functions MUST have a fixed search_path
-- to prevent privilege escalation vulnerabilities
-- ============================================================================

-- ============================================================================
-- Fix: can_raise_maintenance
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_raise_maintenance(tenant_id_param uuid, unit_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tenancies
        WHERE tenant_id = tenant_id_param
        AND unit_id = unit_id_param
        AND status = 'active'
    );
END;
$function$;

-- ============================================================================
-- Fix: can_make_payment
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_make_payment(application_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.property_applications
        WHERE id = application_id_param
        AND application_status = 'approved'
    );
END;
$function$;

-- ============================================================================
-- Fix: can_generate_agreement
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_generate_agreement(payment_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.payments
        WHERE id = payment_id_param
        AND payment_status = 'paid'
    );
END;
$function$;

-- ============================================================================
-- Fix: can_apply_for_unit
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.can_apply_for_unit(unit_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.units
        WHERE id = unit_id_param
        AND listing_status = 'available'
        AND is_public_listing = true
    );
END;
$function$;

-- ============================================================================
-- Fix: handle_admin_code
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_admin_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_code TEXT;
BEGIN
  admin_code := NEW.raw_user_meta_data->>'admin_code';

  IF admin_code IS NOT NULL THEN
    -- Validate unused admin code
    IF EXISTS (
      SELECT 1 FROM public.admin_codes
      WHERE code = admin_code
      AND is_used = FALSE
    ) THEN
      -- Promote user to admin
      UPDATE public.users
      SET role = 'admin'
      WHERE id = NEW.id;

      -- Mark code as used
      UPDATE public.admin_codes
      SET
        is_used = TRUE,
        used_at = NOW(),
        used_by = NEW.id
      WHERE code = admin_code;
    ELSE
      RAISE EXCEPTION 'Invalid or already used admin code';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix: refresh_user_auth_metadata
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refresh_user_auth_metadata(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    user_role TEXT;
    user_name TEXT;
    user_phone TEXT;
    result jsonb;
BEGIN
    -- Get current user data from public.users
    SELECT role, name, phone 
    INTO user_role, user_name, user_phone
    FROM public.users 
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || 
        jsonb_build_object(
            'role', user_role,
            'name', user_name,
            'phone', user_phone
        )
    WHERE id = target_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Auth metadata refreshed successfully',
        'role', user_role
    );
END;
$function$;

-- ============================================================================
-- Fix: validate_admin_registration
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_admin_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    verified_role TEXT;
    admin_code_value TEXT;
BEGIN
    -- Check if admin_code was provided in metadata
    IF NEW.raw_user_meta_data->>'admin_code' IS NOT NULL THEN
        -- Empty code is not allowed
        IF NEW.raw_user_meta_data->>'admin_code' = '' THEN
            RAISE EXCEPTION 'Admin verification code is required for admin registration';
        END IF;

        -- Store the code value before validation
        admin_code_value := NEW.raw_user_meta_data->>'admin_code';

        -- Verify the admin code and get the role it grants
        verified_role := public.verify_admin_code(admin_code_value);

        IF verified_role IS NULL THEN
            RAISE EXCEPTION 'Invalid admin verification code';
        END IF;

        -- Override the role with the one from the code
        NEW.raw_user_meta_data := jsonb_set(
            NEW.raw_user_meta_data,
            '{role}',
            to_jsonb(verified_role)
        );

        -- Preserve admin_code for AFTER trigger
        NEW.raw_user_meta_data := jsonb_set(
            NEW.raw_user_meta_data,
            '{admin_code}',
            to_jsonb(admin_code_value)
        );

    END IF;

    RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix: apply_admin_role_from_code
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_admin_role_from_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  verified_role text;
BEGIN
  -- Only run if admin_code was provided
  IF NEW.raw_user_meta_data ? 'admin_code' THEN

    IF NEW.raw_user_meta_data->>'admin_code' = '' THEN
      RAISE EXCEPTION 'Admin verification code is required';
    END IF;

    -- Validate code
    verified_role := public.verify_admin_code(
      NEW.raw_user_meta_data->>'admin_code'
    );

    IF verified_role IS NULL THEN
      RAISE EXCEPTION 'Invalid or expired admin verification code';
    END IF;

    -- Mark code as used
    UPDATE public.admin_codes
    SET
      is_used = true,
      used_at = now(),
      used_by = NEW.id
    WHERE code = NEW.raw_user_meta_data->>'admin_code';

    -- Inject role
    NEW.raw_user_meta_data :=
      jsonb_set(
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(verified_role)
      );

    -- Remove admin_code
    NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'admin_code';

  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix: generate_admin_code
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_admin_code(p_role text DEFAULT 'admin'::text, p_expires_in interval DEFAULT '24:00:00'::interval)
RETURNS TABLE(code text, role text, expires_at timestamp with time zone, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_code TEXT;
    new_code_id UUID;
    current_user_role TEXT;
BEGIN
    -- Security check: Only super admins can generate codes
    SELECT u.role INTO current_user_role
    FROM public.users u
    WHERE u.id = auth.uid();

    IF current_user_role IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can generate admin verification codes';
    END IF;

    IF p_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin or super_admin';
    END IF;

    -- Generate secure random code (32 hex characters)
    new_code := encode(gen_random_bytes(16), 'hex');

    -- Insert the new code and get its ID
    INSERT INTO public.admin_codes (code, role, created_by, expires_at)
    VALUES (new_code, p_role, auth.uid(), NOW() + p_expires_in)
    RETURNING id INTO new_code_id;

    -- Audit logging
    INSERT INTO public.audit_logs (
        user_id, action, entity_type, entity_id, changes, created_at
    )
    VALUES (
        auth.uid(),
        'generate_admin_code',
        'admin_codes',
        new_code_id,
        jsonb_build_object('role', p_role, 'expires_in', p_expires_in::TEXT, 'timestamp', NOW()),
        NOW()
    );

    RETURN QUERY SELECT new_code, p_role, NOW() + p_expires_in, NOW();
END;
$function$;

-- ============================================================================
-- Fix: update_unit_on_application_approved
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_unit_on_application_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- When application is approved, set unit to 'applied' status
    IF NEW.application_status = 'approved' AND OLD.application_status != 'approved' THEN
        UPDATE public.units
        SET 
            listing_status = 'applied',
            updated_at = NOW()
        WHERE id = NEW.unit_id;
    -- When application is rejected, set unit back to 'available' if no other approved applications
    ELSIF NEW.application_status = 'rejected' AND OLD.application_status != 'rejected' THEN
        -- Check if there are other approved applications for this unit
        IF NOT EXISTS (
            SELECT 1 FROM public.property_applications
            WHERE unit_id = NEW.unit_id
            AND application_status = 'approved'
            AND id != NEW.id
        ) THEN
            UPDATE public.units
            SET 
                listing_status = 'available',
                updated_at = NOW()
            WHERE id = NEW.unit_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix: handle_tenancy_termination
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_tenancy_termination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only process when status changes to 'terminated'
    IF NEW.agreement_status = 'terminated' AND (OLD.agreement_status IS NULL OR OLD.agreement_status != 'terminated') THEN
        -- Update the unit to make it available again
        UPDATE public.units
        SET 
            listing_status = 'available',
            is_occupied = false,
            current_tenant_id = NULL,
            is_public_listing = true,
            updated_at = NOW()
        WHERE id = NEW.unit_id;

        -- Update any related active tenancy records to 'ended' status
        UPDATE public.tenancies
        SET 
            status = 'ended',
            end_date = COALESCE(NEW.terminated_at::DATE, CURRENT_DATE),
            updated_at = NOW()
        WHERE agreement_id = NEW.id
        AND status = 'active';
    END IF;
    
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- Fix: is_super_admin
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$function$;

-- ============================================================================
-- Fix: is_landlord
-- Add SET search_path to prevent search_path hijacking
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_landlord()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'landlord'
    );
END;
$function$;

-- ============================================================================
-- Security Verification
-- ============================================================================

-- Verify all SECURITY DEFINER functions have SET search_path
DO $$
DECLARE
    func_record RECORD;
    func_count INT := 0;
    fixed_count INT := 0;
BEGIN
    -- Check all SECURITY DEFINER functions in public schema
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_def
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND prosecdef = true
    LOOP
        func_count := func_count + 1;
        
        IF func_record.function_def LIKE '%SET search_path%' OR 
           func_record.function_def LIKE '%set_config(''search_path''%' THEN
            fixed_count := fixed_count + 1;
            RAISE NOTICE '✅ %: Has search_path protection', func_record.function_name;
        ELSE
            RAISE WARNING '❌ %: MISSING search_path protection!', func_record.function_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Security Audit Summary ===';
    RAISE NOTICE 'Total SECURITY DEFINER functions: %', func_count;
    RAISE NOTICE 'Functions with search_path protection: %', fixed_count;
    RAISE NOTICE 'Functions still vulnerable: %', func_count - fixed_count;
    
    IF func_count = fixed_count THEN
        RAISE NOTICE '✅ All SECURITY DEFINER functions are properly secured!';
    ELSE
        RAISE WARNING '⚠️  Some functions still need search_path protection!';
    END IF;
END $$;

-- ============================================================================
-- End of Security Hardening Script
-- ============================================================================
