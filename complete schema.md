[
  {
    "schema": "public",
    "function_name": "handle_new_user",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.handle_new_user()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nDECLARE\r\n    user_account_status TEXT;\r\n    admin_code_value TEXT;\r\n    update_count INTEGER;\r\nBEGIN\r\n    -- Determine account status based on role\r\n    -- ALL user types (tenant, landlord, admin, super_admin) start as pending\r\n    -- This ensures proper oversight and approval workflow\r\n    IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN\r\n        -- Admin accounts start as pending until approved by super admin\r\n        user_account_status := 'pending';\r\n    ELSIF NEW.raw_user_meta_data->>'role' IN ('tenant', 'landlord') THEN\r\n        -- Tenant and landlord accounts also start as pending until approved by admin\r\n        user_account_status := 'pending';\r\n    ELSE\r\n        -- Fallback for any other roles (shouldn't happen, but safety first)\r\n        user_account_status := 'pending';\r\n    END IF;\r\n\r\n    -- Insert into public.users table\r\n    INSERT INTO public.users (id, email, name, role, phone, account_status, created_at)\r\n    VALUES (\r\n        NEW.id,\r\n        NEW.email,\r\n        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),\r\n        COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),\r\n        NEW.raw_user_meta_data->>'phone',\r\n        user_account_status,\r\n        NOW()\r\n    );\r\n    \r\n    -- Create role-specific profile based on user role\r\n    IF (NEW.raw_user_meta_data->>'role') = 'landlord' THEN\r\n        INSERT INTO public.landlord_profiles (user_id) VALUES (NEW.id);\r\n    ELSIF (NEW.raw_user_meta_data->>'role') = 'tenant' THEN\r\n        INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id);\r\n    ELSIF (NEW.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN\r\n        INSERT INTO public.admin_profiles (user_id, is_super_admin) \r\n        VALUES (NEW.id, (NEW.raw_user_meta_data->>'role') = 'super_admin');\r\n        \r\n        -- Mark the admin code as used (now that user exists in public.users)\r\n        IF NEW.raw_user_meta_data->>'admin_code' IS NOT NULL THEN\r\n            admin_code_value := NEW.raw_user_meta_data->>'admin_code';\r\n            \r\n            BEGIN\r\n                -- Perform the UPDATE and count affected rows\r\n                WITH update_result AS (\r\n                    UPDATE public.admin_codes\r\n                    SET \r\n                        is_used = TRUE,\r\n                        used_at = NOW(),\r\n                        used_by = NEW.id\r\n                    WHERE code = admin_code_value\r\n                    AND is_used = FALSE\r\n                    RETURNING id\r\n                )\r\n                SELECT COUNT(*) INTO update_count FROM update_result;\r\n                \r\n                -- Log the result (using partial code for security)\r\n                IF update_count = 0 THEN\r\n                    RAISE WARNING 'Admin code not updated (code: %..., might be already used or not found)', LEFT(admin_code_value, 8);\r\n                ELSE\r\n                    RAISE NOTICE 'Successfully marked admin code as used (code: %..., user: %)', LEFT(admin_code_value, 8), NEW.id;\r\n                END IF;\r\n                \r\n            EXCEPTION\r\n                WHEN insufficient_privilege THEN\r\n                    RAISE WARNING 'Insufficient privileges to update admin code: % (SQLSTATE: %)', SQLERRM, SQLSTATE;\r\n                WHEN OTHERS THEN\r\n                    -- Log warning but don't fail registration\r\n                    RAISE WARNING 'Failed to mark admin code as used: % (SQLSTATE: %)', SQLERRM, SQLSTATE;\r\n            END;\r\n        END IF;\r\n        \r\n        -- Log the admin registration (now that user exists in public.users)\r\n        -- Wrapped in exception handler to prevent registration failure if audit logging fails\r\n        BEGIN\r\n            INSERT INTO public.audit_logs (\r\n                user_id,\r\n                action,\r\n                entity_type,\r\n                entity_id,\r\n                changes,\r\n                created_at\r\n            ) VALUES (\r\n                NEW.id,\r\n                'admin_registration',\r\n                'user',\r\n                NEW.id,\r\n                jsonb_build_object(\r\n                    'email', NEW.email,\r\n                    'role', NEW.raw_user_meta_data->>'role',\r\n                    'admin_code_prefix', LEFT(admin_code_value, 8),\r\n                    'timestamp', NOW()\r\n                ),\r\n                NOW()\r\n            );\r\n        EXCEPTION\r\n            WHEN OTHERS THEN\r\n                RAISE WARNING 'Failed to log admin registration in audit_logs: %', SQLERRM;\r\n        END;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log the error but don't prevent user creation in auth.users\r\n        RAISE WARNING 'Error in handle_new_user trigger: % (SQLSTATE: %)', SQLERRM, SQLSTATE;\r\n        RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "prevent_signature_modification",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.prevent_signature_modification()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    -- Fix the search_path to the public schema\r\n    PERFORM set_config('search_path', 'public', false);\r\n\r\n    -- Function logic here, using fully-qualified object names\r\n    -- e.g., public.signatures instead of just signatures\r\n\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "can_raise_maintenance",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.can_raise_maintenance(tenant_id_param uuid, unit_id_param uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.tenancies\r\n        WHERE tenant_id = tenant_id_param\r\n        AND unit_id = unit_id_param\r\n        AND status = 'active'\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at_column",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    -- Force the search_path to the public schema only\r\n    PERFORM set_config('search_path', 'public', false);\r\n\r\n    -- Fully qualified reference if needed (example table usage)\r\n    -- NEW.updated_at = now(); -- Trigger operates on NEW, so table name is not needed\r\n\r\n    NEW.updated_at = now();\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "can_make_payment",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.can_make_payment(application_id_param uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.property_applications\r\n        WHERE id = application_id_param\r\n        AND application_status = 'approved'\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "can_generate_agreement",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.can_generate_agreement(payment_id_param uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.payments\r\n        WHERE id = payment_id_param\r\n        AND payment_status = 'paid'\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v1",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v1mc",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v3",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v4",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_generate_v5",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "digest",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.digest(text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "digest",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_digest$function$\n"
  },
  {
    "schema": "public",
    "function_name": "prevent_audit_log_modification",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  IF TG_OP = 'UPDATE' THEN\r\n    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified.';\r\n  ELSIF TG_OP = 'DELETE' THEN\r\n    RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted.';\r\n  END IF;\r\n  RETURN NULL;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "uid",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION auth.uid()\n RETURNS uuid\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.sub', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')\n  )::uuid\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "generate_admin_code",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.generate_admin_code(p_role text DEFAULT 'admin'::text, p_expires_in interval DEFAULT '24:00:00'::interval)\n RETURNS TABLE(code text, role text, expires_at timestamp with time zone, created_at timestamp with time zone)\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    new_code TEXT;\r\n    new_code_id UUID;\r\n    current_user_role TEXT;\r\nBEGIN\r\n    -- Security check: Only super admins can generate codes\r\n    SELECT u.role INTO current_user_role\r\n    FROM public.users u\r\n    WHERE u.id = auth.uid();\r\n\r\n    IF current_user_role IS NULL THEN\r\n        RAISE EXCEPTION 'Authentication required';\r\n    END IF;\r\n\r\n    IF current_user_role != 'super_admin' THEN\r\n        RAISE EXCEPTION 'Only super admins can generate admin verification codes';\r\n    END IF;\r\n\r\n    IF p_role NOT IN ('admin', 'super_admin') THEN\r\n        RAISE EXCEPTION 'Invalid role. Must be admin or super_admin';\r\n    END IF;\r\n\r\n    -- Generate secure random code (32 hex characters)\r\n    new_code := encode(gen_random_bytes(16), 'hex');\r\n\r\n    -- Insert the new code and get its ID\r\n    INSERT INTO public.admin_codes (code, role, created_by, expires_at)\r\n    VALUES (new_code, p_role, auth.uid(), NOW() + p_expires_in)\r\n    RETURNING id INTO new_code_id;\r\n\r\n    -- Audit logging\r\n    INSERT INTO public.audit_logs (\r\n        user_id, action, entity_type, entity_id, changes, created_at\r\n    )\r\n    VALUES (\r\n        auth.uid(),\r\n        'generate_admin_code',\r\n        'admin_codes',\r\n        new_code_id,\r\n        jsonb_build_object('role', p_role, 'expires_in', p_expires_in::TEXT, 'timestamp', NOW()),\r\n        NOW()\r\n    );\r\n\r\n    RETURN QUERY SELECT new_code, p_role, NOW() + p_expires_in, NOW();\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "role",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION auth.role()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.role', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')\n  )::text\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "email",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION auth.email()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n  coalesce(\n    nullif(current_setting('request.jwt.claim.email', true), ''),\n    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')\n  )::text\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_unit_on_application_approved",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.update_unit_on_application_approved()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    -- When application is approved, set unit to 'applied' status\r\n    IF NEW.application_status = 'approved' AND OLD.application_status != 'approved' THEN\r\n        UPDATE public.units\r\n        SET \r\n            listing_status = 'applied',\r\n            updated_at = NOW()\r\n        WHERE id = NEW.unit_id;\r\n    -- When application is rejected, set unit back to 'available' if no other approved applications\r\n    ELSIF NEW.application_status = 'rejected' AND OLD.application_status != 'rejected' THEN\r\n        -- Check if there are other approved applications for this unit\r\n        IF NOT EXISTS (\r\n            SELECT 1 FROM public.property_applications\r\n            WHERE unit_id = NEW.unit_id\r\n            AND application_status = 'approved'\r\n            AND id != NEW.id\r\n        ) THEN\r\n            UPDATE public.units\r\n            SET \r\n                listing_status = 'available',\r\n                updated_at = NOW()\r\n            WHERE id = NEW.unit_id;\r\n        END IF;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_nil",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_nil()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_nil$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_dns",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_url",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_url$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_oid",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "uuid_ns_x500",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()\n RETURNS uuid\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$\n"
  },
  {
    "schema": "public",
    "function_name": "handle_admin_code",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.handle_admin_code()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n  admin_code TEXT;\r\nBEGIN\r\n  admin_code := NEW.raw_user_meta_data->>'admin_code';\r\n\r\n  IF admin_code IS NOT NULL THEN\r\n    -- Validate unused admin code\r\n    IF EXISTS (\r\n      SELECT 1 FROM public.admin_codes\r\n      WHERE code = admin_code\r\n      AND is_used = FALSE\r\n    ) THEN\r\n      -- Promote user to admin\r\n      UPDATE public.users\r\n      SET role = 'admin'\r\n      WHERE id = NEW.id;\r\n\r\n      -- Mark code as used\r\n      UPDATE public.admin_codes\r\n      SET\r\n        is_used = TRUE,\r\n        used_at = NOW(),\r\n        used_by = NEW.id\r\n      WHERE code = admin_code;\r\n    ELSE\r\n      RAISE EXCEPTION 'Invalid or already used admin code';\r\n    END IF;\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "refresh_user_auth_metadata",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.refresh_user_auth_metadata(target_user_id uuid)\n RETURNS jsonb\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    user_role TEXT;\r\n    user_name TEXT;\r\n    user_phone TEXT;\r\n    result jsonb;\r\nBEGIN\r\n    -- Get current user data from public.users\r\n    SELECT role, name, phone \r\n    INTO user_role, user_name, user_phone\r\n    FROM public.users \r\n    WHERE id = target_user_id;\r\n    \r\n    IF NOT FOUND THEN\r\n        RETURN jsonb_build_object(\r\n            'success', false,\r\n            'error', 'User not found'\r\n        );\r\n    END IF;\r\n    \r\n    -- Update auth.users metadata\r\n    UPDATE auth.users\r\n    SET raw_user_meta_data = \r\n        COALESCE(raw_user_meta_data, '{}'::jsonb) || \r\n        jsonb_build_object(\r\n            'role', user_role,\r\n            'name', user_name,\r\n            'phone', user_phone\r\n        )\r\n    WHERE id = target_user_id;\r\n    \r\n    RETURN jsonb_build_object(\r\n        'success', true,\r\n        'message', 'Auth metadata refreshed successfully',\r\n        'role', user_role\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "encrypt_iv",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "decrypt_iv",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_random_bytes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_random_bytes$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_random_uuid",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()\n RETURNS uuid\n LANGUAGE c\n PARALLEL SAFE\nAS '$libdir/pgcrypto', $function$pg_random_uuid$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_encrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "hmac",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "hmac",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_hmac$function$\n"
  },
  {
    "schema": "public",
    "function_name": "validate_admin_registration",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.validate_admin_registration()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n    verified_role TEXT;\r\n    admin_code_value TEXT;\r\nBEGIN\r\n    -- Check if admin_code was provided in metadata\r\n    IF NEW.raw_user_meta_data->>'admin_code' IS NOT NULL THEN\r\n        -- Empty code is not allowed\r\n        IF NEW.raw_user_meta_data->>'admin_code' = '' THEN\r\n            RAISE EXCEPTION 'Admin verification code is required for admin registration';\r\n        END IF;\r\n\r\n        -- Store the code value before validation\r\n        admin_code_value := NEW.raw_user_meta_data->>'admin_code';\r\n\r\n        -- Verify the admin code and get the role it grants\r\n        verified_role := public.verify_admin_code(admin_code_value);\r\n\r\n        IF verified_role IS NULL THEN\r\n            RAISE EXCEPTION 'Invalid admin verification code';\r\n        END IF;\r\n\r\n        -- Override the role with the one from the code\r\n        NEW.raw_user_meta_data := jsonb_set(\r\n            NEW.raw_user_meta_data,\r\n            '{role}',\r\n            to_jsonb(verified_role)\r\n        );\r\n\r\n        -- Preserve admin_code for AFTER trigger\r\n        NEW.raw_user_meta_data := jsonb_set(\r\n            NEW.raw_user_meta_data,\r\n            '{admin_code}',\r\n            to_jsonb(admin_code_value)\r\n        );\r\n\r\n    END IF;\r\n\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "apply_admin_role_from_code",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.apply_admin_role_from_code()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nDECLARE\r\n  verified_role text;\r\nBEGIN\r\n  -- Only run if admin_code was provided\r\n  IF NEW.raw_user_meta_data ? 'admin_code' THEN\r\n\r\n    IF NEW.raw_user_meta_data->>'admin_code' = '' THEN\r\n      RAISE EXCEPTION 'Admin verification code is required';\r\n    END IF;\r\n\r\n    -- Validate code\r\n    verified_role := public.verify_admin_code(\r\n      NEW.raw_user_meta_data->>'admin_code'\r\n    );\r\n\r\n    IF verified_role IS NULL THEN\r\n      RAISE EXCEPTION 'Invalid or expired admin verification code';\r\n    END IF;\r\n\r\n    -- Mark code as used\r\n    UPDATE public.admin_codes\r\n    SET\r\n      is_used = true,\r\n      used_at = now(),\r\n      used_by = NEW.id\r\n    WHERE code = NEW.raw_user_meta_data->>'admin_code';\r\n\r\n    -- Inject role\r\n    NEW.raw_user_meta_data :=\r\n      jsonb_set(\r\n        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),\r\n        '{role}',\r\n        to_jsonb(verified_role)\r\n      );\r\n\r\n    -- Remove admin_code\r\n    NEW.raw_user_meta_data := NEW.raw_user_meta_data - 'admin_code';\r\n\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "verify_admin_code",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.verify_admin_code(code_to_verify text)\n RETURNS TABLE(role text)\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  RETURN QUERY\r\n  SELECT admin_codes.role\r\n  FROM public.admin_codes\r\n  WHERE code = code_to_verify\r\n    AND is_used = FALSE\r\n    AND (expires_at IS NULL OR expires_at > NOW());\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_net_access",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT 1\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_net'\n  )\n  THEN\n    IF NOT EXISTS (\n      SELECT 1\n      FROM pg_roles\n      WHERE rolname = 'supabase_functions_admin'\n    )\n    THEN\n      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;\n    END IF;\n\n    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n\n    IF EXISTS (\n      SELECT FROM pg_extension\n      WHERE extname = 'pg_net'\n      -- all versions in use on existing projects as of 2025-02-20\n      -- version 0.12.0 onwards don't need these applied\n      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')\n    ) THEN\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;\n\n      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;\n\n      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;\n\n      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;\n    END IF;\n  END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgrst_drop_watch",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  obj record;\nBEGIN\n  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()\n  LOOP\n    IF obj.object_type IN (\n      'schema'\n    , 'table'\n    , 'foreign table'\n    , 'view'\n    , 'materialized view'\n    , 'function'\n    , 'trigger'\n    , 'type'\n    , 'rule'\n    )\n    AND obj.is_temporary IS false -- no pg_temp objects\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n"
  },
  {
    "schema": "public",
    "function_name": "mark_admin_code_used",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.mark_admin_code_used(code_to_use text, user_id uuid)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  UPDATE public.admin_codes\r\n  SET\r\n    is_used = TRUE,\r\n    used_at = NOW(),\r\n    used_by = user_id\r\n  WHERE code = code_to_use\r\n    AND is_used = FALSE;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_graphql_access",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    func_is_graphql_resolve bool;\nBEGIN\n    func_is_graphql_resolve = (\n        SELECT n.proname = 'resolve'\n        FROM pg_event_trigger_ddl_commands() AS ev\n        LEFT JOIN pg_catalog.pg_proc AS n\n        ON ev.objid = n.oid\n    );\n\n    IF func_is_graphql_resolve\n    THEN\n        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func\n        DROP FUNCTION IF EXISTS graphql_public.graphql;\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language sql\n        as $$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $$;\n\n        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last\n        -- function in the extension so we need to grant permissions on existing entities AND\n        -- update default permissions to any others that are created after `graphql.resolve`\n        grant usage on schema graphql to postgres, anon, authenticated, service_role;\n        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;\n        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;\n        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;\n        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;\n\n        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles\n        grant usage on schema graphql_public to postgres with grant option;\n        grant usage on schema graphql to postgres with grant option;\n    END IF;\n\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "prefixes_delete_cleanup",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.prefixes_delete_cleanup()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_bucket_ids text[];\n    v_names      text[];\nBEGIN\n    IF current_setting('storage.gc.prefixes', true) = '1' THEN\n        RETURN NULL;\n    END IF;\n\n    PERFORM set_config('storage.gc.prefixes', '1', true);\n\n    SELECT COALESCE(array_agg(d.bucket_id), '{}'),\n           COALESCE(array_agg(d.name), '{}')\n    INTO v_bucket_ids, v_names\n    FROM deleted AS d\n    WHERE d.name <> '';\n\n    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);\n    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);\n\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_update_level_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.objects_update_level_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    -- Ensure this is an update operation and the name has changed\n    IF TG_OP = 'UPDATE' AND (NEW.\"name\" <> OLD.\"name\" OR NEW.\"bucket_id\" <> OLD.\"bucket_id\") THEN\n        -- Set the new level\n        NEW.\"level\" := \"storage\".\"get_level\"(NEW.\"name\");\n    END IF;\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_noncegen",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_key_id",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_key_id_w$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "armor",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.armor(bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "armor",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_armor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "dearmor",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.dearmor(text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_dearmor$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_armor_headers",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)\n RETURNS SETOF record\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_armor_headers$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements_info",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone)\n RETURNS record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_info$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone)\n RETURNS SETOF record\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_1_11$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "grant_pg_cron_access",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  IF EXISTS (\n    SELECT\n    FROM pg_event_trigger_ddl_commands() AS ev\n    JOIN pg_extension AS ext\n    ON ev.objid = ext.oid\n    WHERE ext.extname = 'pg_cron'\n  )\n  THEN\n    grant usage on schema cron to postgres with grant option;\n\n    alter default privileges in schema cron grant all on tables to postgres with grant option;\n    alter default privileges in schema cron grant all on functions to postgres with grant option;\n    alter default privileges in schema cron grant all on sequences to postgres with grant option;\n\n    alter default privileges for user supabase_admin in schema cron grant all\n        on sequences to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on tables to postgres with grant option;\n    alter default privileges for user supabase_admin in schema cron grant all\n        on functions to postgres with grant option;\n\n    grant all privileges on all tables in schema cron to postgres with grant option;\n    revoke all on table cron.job from postgres;\n    grant select on table cron.job to postgres with grant option;\n  END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "auth",
    "function_name": "jwt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION auth.jwt()\n RETURNS jsonb\n LANGUAGE sql\n STABLE\nAS $function$\n  select \n    coalesce(\n        nullif(current_setting('request.jwt.claim', true), ''),\n        nullif(current_setting('request.jwt.claims', true), '')\n    )::jsonb\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "create_secret",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS uuid\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  rec record;\nBEGIN\n  INSERT INTO vault.secrets (secret, name, description)\n  VALUES (\n    new_secret,\n    new_name,\n    new_description\n  )\n  RETURNING * INTO rec;\n  UPDATE vault.secrets s\n  SET secret = encode(vault._crypto_aead_det_encrypt(\n    message := convert_to(rec.secret, 'utf8'),\n    additional := convert_to(s.id::text, 'utf8'),\n    key_id := 0,\n    context := 'pgsodium'::bytea,\n    nonce := rec.nonce\n  ), 'base64')\n  WHERE id = rec.id;\n  RETURN rec.id;\nEND\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "update_secret",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\nDECLARE\n  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);\nBEGIN\n  UPDATE vault.secrets s\n  SET\n    secret = CASE WHEN new_secret IS NULL THEN s.secret\n                  ELSE encode(vault._crypto_aead_det_encrypt(\n                    message := convert_to(new_secret, 'utf8'),\n                    additional := convert_to(s.id::text, 'utf8'),\n                    key_id := 0,\n                    context := 'pgsodium'::bytea,\n                    nonce := s.nonce\n                  ), 'base64') END,\n    name = coalesce(new_name, s.name),\n    description = coalesce(new_description, s.description),\n    updated_at = now()\n  WHERE s.id = secret_id;\nEND\n$function$\n"
  },
  {
    "schema": "vault",
    "function_name": "_crypto_aead_det_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE\nAS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pg_stat_statements_reset",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pg_stat_statements_reset(userid oid DEFAULT 0, dbid oid DEFAULT 0, queryid bigint DEFAULT 0, minmax_only boolean DEFAULT false)\n RETURNS timestamp with time zone\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pg_stat_statements', $function$pg_stat_statements_reset_1_11$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "crypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.crypt(text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_crypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_salt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "gen_salt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)\n RETURNS text\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_encrypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pg_decrypt$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_sym_decrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_encrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt_bytea",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)\n RETURNS bytea\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgp_pub_decrypt",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)\n RETURNS text\n LANGUAGE c\n IMMUTABLE PARALLEL SAFE STRICT\nAS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "set_graphql_placeholder",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\n    DECLARE\n    graphql_is_dropped bool;\n    BEGIN\n    graphql_is_dropped = (\n        SELECT ev.schema_name = 'graphql_public'\n        FROM pg_event_trigger_dropped_objects() AS ev\n        WHERE ev.schema_name = 'graphql_public'\n    );\n\n    IF graphql_is_dropped\n    THEN\n        create or replace function graphql_public.graphql(\n            \"operationName\" text default null,\n            query text default null,\n            variables jsonb default null,\n            extensions jsonb default null\n        )\n            returns jsonb\n            language plpgsql\n        as $$\n            DECLARE\n                server_version float;\n            BEGIN\n                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);\n\n                IF server_version >= 14 THEN\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql extension is not enabled.'\n                            )\n                        )\n                    );\n                ELSE\n                    RETURN jsonb_build_object(\n                        'errors', jsonb_build_array(\n                            jsonb_build_object(\n                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'\n                            )\n                        )\n                    );\n                END IF;\n            END;\n        $$;\n    END IF;\n\n    END;\n$function$\n"
  },
  {
    "schema": "extensions",
    "function_name": "pgrst_ddl_watch",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()\n RETURNS event_trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  cmd record;\nBEGIN\n  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()\n  LOOP\n    IF cmd.command_tag IN (\n      'CREATE SCHEMA', 'ALTER SCHEMA'\n    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'\n    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'\n    , 'CREATE VIEW', 'ALTER VIEW'\n    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'\n    , 'CREATE FUNCTION', 'ALTER FUNCTION'\n    , 'CREATE TRIGGER'\n    , 'CREATE TYPE', 'ALTER TYPE'\n    , 'CREATE RULE'\n    , 'COMMENT'\n    )\n    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp\n    AND cmd.schema_name is distinct from 'pg_temp'\n    THEN\n      NOTIFY pgrst, 'reload schema';\n    END IF;\n  END LOOP;\nEND; $function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "increment_schema_version",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql.increment_schema_version()\n RETURNS event_trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nbegin\n    perform pg_catalog.nextval('graphql.seq_schema_version');\nend;\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "get_schema_version",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql.get_schema_version()\n RETURNS integer\n LANGUAGE sql\n SECURITY DEFINER\nAS $function$\n    select last_value from graphql.seq_schema_version;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "is_admin",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.is_admin()\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO 'public'\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1\r\n        FROM public.users\r\n        WHERE id = auth.uid()\r\n        AND role IN ('admin', 'super_admin')\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "is_super_admin",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.is_super_admin()\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.users\r\n        WHERE id = (select auth.uid()) AND role = 'super_admin'\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "is_landlord",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.is_landlord()\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.users\r\n        WHERE id = (select auth.uid()) AND role = 'landlord'\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "graphql_public",
    "function_name": "graphql",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql_public.graphql(\"operationName\" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE sql\nAS $function$\n            select graphql.resolve(\n                query := query,\n                variables := coalesce(variables, '{}'),\n                \"operationName\" := \"operationName\",\n                extensions := extensions\n            );\n        $function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "exception",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql.exception(message text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nbegin\n    raise exception using errcode='22000', message=message;\nend;\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "comment_directive",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql.comment_directive(comment_ text)\n RETURNS jsonb\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    comment on column public.account.name is '@graphql.name: myField'\n    */\n    select\n        coalesce(\n            (\n                regexp_match(\n                    comment_,\n                    '@graphql\\((.+)\\)'\n                )\n            )[1]::jsonb,\n            jsonb_build_object()\n        )\n$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "_internal_resolve",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql._internal_resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE c\nAS '$libdir/pg_graphql', $function$resolve_wrapper$function$\n"
  },
  {
    "schema": "graphql",
    "function_name": "resolve",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION graphql.resolve(query text, variables jsonb DEFAULT '{}'::jsonb, \"operationName\" text DEFAULT NULL::text, extensions jsonb DEFAULT NULL::jsonb)\n RETURNS jsonb\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    res jsonb;\n    message_text text;\nbegin\n  begin\n    select graphql._internal_resolve(\"query\" := \"query\",\n                                     \"variables\" := \"variables\",\n                                     \"operationName\" := \"operationName\",\n                                     \"extensions\" := \"extensions\") into res;\n    return res;\n  exception\n    when others then\n    get stacked diagnostics message_text = message_text;\n    return\n    jsonb_build_object('data', null,\n                       'errors', jsonb_build_array(jsonb_build_object('message', message_text)));\n  end;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "foldername",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.foldername(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\nBEGIN\n    -- Split on \"/\" to get path segments\n    SELECT string_to_array(name, '/') INTO _parts;\n    -- Return everything except the last segment\n    RETURN _parts[1 : array_length(_parts,1) - 1];\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "filename",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.filename(name text)\n RETURNS text\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n_parts text[];\nBEGIN\n\tselect string_to_array(name, '/') into _parts;\n\treturn _parts[array_length(_parts,1)];\nEND\n$function$\n"
  },
  {
    "schema": "pgbouncer",
    "function_name": "get_auth",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)\n RETURNS TABLE(username text, password text)\n LANGUAGE plpgsql\n SECURITY DEFINER\n SET search_path TO ''\nAS $function$\n  BEGIN\n      RAISE DEBUG 'PgBouncer auth request: %', p_usename;\n\n      RETURN QUERY\n      SELECT\n          rolname::text,\n          CASE WHEN rolvaliduntil < now()\n              THEN null\n              ELSE rolpassword::text\n          END\n      FROM pg_authid\n      WHERE rolname=$1 and rolcanlogin;\n  END;\n  $function$\n"
  },
  {
    "schema": "storage",
    "function_name": "extension",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.extension(name text)\n RETURNS text\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\nDECLARE\n    _parts text[];\n    _filename text;\nBEGIN\n    SELECT string_to_array(name, '/') INTO _parts;\n    SELECT _parts[array_length(_parts,1)] INTO _filename;\n    RETURN reverse(split_part(reverse(_filename), '.', 1));\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "update_updated_at_column",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.update_updated_at_column()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "can_insert_object",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n  INSERT INTO \"storage\".\"objects\" (\"bucket_id\", \"name\", \"owner\", \"metadata\") VALUES (bucketid, name, owner, metadata);\n  -- hack to rollback the successful insert\n  RAISE sqlstate 'PT200' using\n  message = 'ROLLBACK',\n  detail = 'rollback successful insert';\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_objects_with_delimiter",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)\n RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(name COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN\n                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))\n                    ELSE\n                        name\n                END AS name, id, metadata, updated_at\n            FROM\n                storage.objects\n            WHERE\n                bucket_id = $5 AND\n                name ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $6 != '''' THEN\n                    name COLLATE \"C\" > $6\n                ELSE true END\n                AND CASE\n                    WHEN $4 != '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN\n                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                name COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END\n            ORDER BY\n                name COLLATE \"C\" ASC) as e order by name COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "list_multipart_uploads_with_delimiter",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)\n RETURNS TABLE(key text, id text, created_at timestamp with time zone)\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    RETURN QUERY EXECUTE\n        'SELECT DISTINCT ON(key COLLATE \"C\") * from (\n            SELECT\n                CASE\n                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))\n                    ELSE\n                        key\n                END AS key, id, created_at\n            FROM\n                storage.s3_multipart_uploads\n            WHERE\n                bucket_id = $5 AND\n                key ILIKE $1 || ''%'' AND\n                CASE\n                    WHEN $4 != '''' AND $6 = '''' THEN\n                        CASE\n                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN\n                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE \"C\" > $4\n                            ELSE\n                                key COLLATE \"C\" > $4\n                            END\n                    ELSE\n                        true\n                END AND\n                CASE\n                    WHEN $6 != '''' THEN\n                        id COLLATE \"C\" > $6\n                    ELSE\n                        true\n                    END\n            ORDER BY\n                key COLLATE \"C\" ASC, created_at ASC) as e order by key COLLATE \"C\" LIMIT $3'\n        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "operation",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.operation()\n RETURNS text\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    RETURN current_setting('storage.operation', true);\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_level",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.get_level(name text)\n RETURNS integer\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT array_length(string_to_array(\"name\", '/'), 1);\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefix",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.get_prefix(name text)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\nSELECT\n    CASE WHEN strpos(\"name\", '/') > 0 THEN\n             regexp_replace(\"name\", '[\\/]{1}[^\\/]+\\/?$', '')\n         ELSE\n             ''\n        END;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_prefixes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)\n RETURNS text[]\n LANGUAGE plpgsql\n IMMUTABLE STRICT\nAS $function$\nDECLARE\n    parts text[];\n    prefixes text[];\n    prefix text;\nBEGIN\n    -- Split the name into parts by '/'\n    parts := string_to_array(\"name\", '/');\n    prefixes := '{}';\n\n    -- Construct the prefixes, stopping one level below the last part\n    FOR i IN 1..array_length(parts, 1) - 1 LOOP\n            prefix := array_to_string(parts[1:i], '/');\n            prefixes := array_append(prefixes, prefix);\n    END LOOP;\n\n    RETURN prefixes;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "add_prefixes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    prefixes text[];\nBEGIN\n    prefixes := \"storage\".\"get_prefixes\"(\"_name\");\n\n    IF array_length(prefixes, 1) > 0 THEN\n        INSERT INTO storage.prefixes (name, bucket_id)\n        SELECT UNNEST(prefixes) as name, \"_bucket_id\" ON CONFLICT DO NOTHING;\n    END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_prefix",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nBEGIN\n    -- Check if we can delete the prefix\n    IF EXISTS(\n        SELECT FROM \"storage\".\"prefixes\"\n        WHERE \"prefixes\".\"bucket_id\" = \"_bucket_id\"\n          AND level = \"storage\".\"get_level\"(\"_name\") + 1\n          AND \"prefixes\".\"name\" COLLATE \"C\" LIKE \"_name\" || '/%'\n        LIMIT 1\n    )\n    OR EXISTS(\n        SELECT FROM \"storage\".\"objects\"\n        WHERE \"objects\".\"bucket_id\" = \"_bucket_id\"\n          AND \"storage\".\"get_level\"(\"objects\".\"name\") = \"storage\".\"get_level\"(\"_name\") + 1\n          AND \"objects\".\"name\" COLLATE \"C\" LIKE \"_name\" || '/%'\n        LIMIT 1\n    ) THEN\n    -- There are sub-objects, skip deletion\n    RETURN false;\n    ELSE\n        DELETE FROM \"storage\".\"prefixes\"\n        WHERE \"prefixes\".\"bucket_id\" = \"_bucket_id\"\n          AND level = \"storage\".\"get_level\"(\"_name\")\n          AND \"prefixes\".\"name\" = \"_name\";\n        RETURN true;\n    END IF;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "prefixes_insert_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_insert_prefix_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    NEW.level := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_prefix_hierarchy_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    prefix text;\nBEGIN\n    prefix := \"storage\".\"get_prefix\"(OLD.\"name\");\n\n    IF coalesce(prefix, '') != '' THEN\n        PERFORM \"storage\".\"delete_prefix\"(OLD.\"bucket_id\", prefix);\n    END IF;\n\n    RETURN OLD;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_v1_optimised",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select (string_to_array(name, ''/''))[level] as name\n           from storage.prefixes\n             where lower(prefixes.name) like lower($2 || $3) || ''%''\n               and bucket_id = $4\n               and level = $1\n           order by name ' || v_sort_order || '\n     )\n     (select name,\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[level] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where lower(objects.name) like lower($2 || $3) || ''%''\n       and bucket_id = $4\n       and level = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_legacy_v1",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\ndeclare\n    v_order_by text;\n    v_sort_order text;\nbegin\n    case\n        when sortcolumn = 'name' then\n            v_order_by = 'name';\n        when sortcolumn = 'updated_at' then\n            v_order_by = 'updated_at';\n        when sortcolumn = 'created_at' then\n            v_order_by = 'created_at';\n        when sortcolumn = 'last_accessed_at' then\n            v_order_by = 'last_accessed_at';\n        else\n            v_order_by = 'name';\n        end case;\n\n    case\n        when sortorder = 'asc' then\n            v_sort_order = 'asc';\n        when sortorder = 'desc' then\n            v_sort_order = 'desc';\n        else\n            v_sort_order = 'asc';\n        end case;\n\n    v_order_by = v_order_by || ' ' || v_sort_order;\n\n    return query execute\n        'with folders as (\n           select path_tokens[$1] as folder\n           from storage.objects\n             where objects.name ilike $2 || $3 || ''%''\n               and bucket_id = $4\n               and array_length(objects.path_tokens, 1) <> $1\n           group by folder\n           order by folder ' || v_sort_order || '\n     )\n     (select folder as \"name\",\n            null as id,\n            null as updated_at,\n            null as created_at,\n            null as last_accessed_at,\n            null as metadata from folders)\n     union all\n     (select path_tokens[$1] as \"name\",\n            id,\n            updated_at,\n            created_at,\n            last_accessed_at,\n            metadata\n     from storage.objects\n     where objects.name ilike $2 || $3 || ''%''\n       and bucket_id = $4\n       and array_length(objects.path_tokens, 1) = $1\n     order by ' || v_order_by || ')\n     limit $5\n     offset $6' using levels, prefix, search, bucketname, limits, offsets;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_delete_cleanup",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.objects_delete_cleanup()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_bucket_ids text[];\n    v_names      text[];\nBEGIN\n    IF current_setting('storage.gc.prefixes', true) = '1' THEN\n        RETURN NULL;\n    END IF;\n\n    PERFORM set_config('storage.gc.prefixes', '1', true);\n\n    SELECT COALESCE(array_agg(d.bucket_id), '{}'),\n           COALESCE(array_agg(d.name), '{}')\n    INTO v_bucket_ids, v_names\n    FROM deleted AS d\n    WHERE d.name <> '';\n\n    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);\n    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);\n\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)\n RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\nAS $function$\ndeclare\n    can_bypass_rls BOOLEAN;\nbegin\n    SELECT rolbypassrls\n    INTO can_bypass_rls\n    FROM pg_roles\n    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);\n\n    IF can_bypass_rls THEN\n        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);\n    ELSE\n        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);\n    END IF;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "get_size_by_bucket",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()\n RETURNS TABLE(size bigint, bucket_id text)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nBEGIN\n    return query\n        select sum((metadata->>'size')::bigint) as size, obj.bucket_id\n        from \"storage\".objects as obj\n        group by obj.bucket_id;\nEND\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_update_prefix_trigger",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    old_prefixes TEXT[];\nBEGIN\n    -- Ensure this is an update operation and the name has changed\n    IF TG_OP = 'UPDATE' AND (NEW.\"name\" <> OLD.\"name\" OR NEW.\"bucket_id\" <> OLD.\"bucket_id\") THEN\n        -- Retrieve old prefixes\n        old_prefixes := \"storage\".\"get_prefixes\"(OLD.\"name\");\n\n        -- Remove old prefixes that are only used by this object\n        WITH all_prefixes as (\n            SELECT unnest(old_prefixes) as prefix\n        ),\n        can_delete_prefixes as (\n             SELECT prefix\n             FROM all_prefixes\n             WHERE NOT EXISTS (\n                 SELECT 1 FROM \"storage\".\"objects\"\n                 WHERE \"bucket_id\" = OLD.\"bucket_id\"\n                   AND \"name\" <> OLD.\"name\"\n                   AND \"name\" LIKE (prefix || '%')\n             )\n         )\n        DELETE FROM \"storage\".\"prefixes\" WHERE name IN (SELECT prefix FROM can_delete_prefixes);\n\n        -- Add new prefixes\n        PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    END IF;\n    -- Set the new level\n    NEW.\"level\" := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "enforce_bucket_name_length",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "search_v2",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)\n RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)\n LANGUAGE plpgsql\n STABLE\nAS $function$\nDECLARE\n    sort_col text;\n    sort_ord text;\n    cursor_op text;\n    cursor_expr text;\n    sort_expr text;\nBEGIN\n    -- Validate sort_order\n    sort_ord := lower(sort_order);\n    IF sort_ord NOT IN ('asc', 'desc') THEN\n        sort_ord := 'asc';\n    END IF;\n\n    -- Determine cursor comparison operator\n    IF sort_ord = 'asc' THEN\n        cursor_op := '>';\n    ELSE\n        cursor_op := '<';\n    END IF;\n    \n    sort_col := lower(sort_column);\n    -- Validate sort column  \n    IF sort_col IN ('updated_at', 'created_at') THEN\n        cursor_expr := format(\n            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE \"C\") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',\n            sort_col, cursor_op\n        );\n        sort_expr := format(\n            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE \"C\" %s',\n            sort_col, sort_ord, sort_ord\n        );\n    ELSE\n        cursor_expr := format('($5 = '''' OR name COLLATE \"C\" %s $5)', cursor_op);\n        sort_expr := format('name COLLATE \"C\" %s', sort_ord);\n    END IF;\n\n    RETURN QUERY EXECUTE format(\n        $sql$\n        SELECT * FROM (\n            (\n                SELECT\n                    split_part(name, '/', $4) AS key,\n                    name,\n                    NULL::uuid AS id,\n                    updated_at,\n                    created_at,\n                    NULL::timestamptz AS last_accessed_at,\n                    NULL::jsonb AS metadata\n                FROM storage.prefixes\n                WHERE name COLLATE \"C\" LIKE $1 || '%%'\n                    AND bucket_id = $2\n                    AND level = $4\n                    AND %s\n                ORDER BY %s\n                LIMIT $3\n            )\n            UNION ALL\n            (\n                SELECT\n                    split_part(name, '/', $4) AS key,\n                    name,\n                    id,\n                    updated_at,\n                    created_at,\n                    last_accessed_at,\n                    metadata\n                FROM storage.objects\n                WHERE name COLLATE \"C\" LIKE $1 || '%%'\n                    AND bucket_id = $2\n                    AND level = $4\n                    AND %s\n                ORDER BY %s\n                LIMIT $3\n            )\n        ) obj\n        ORDER BY %s\n        LIMIT $3\n        $sql$,\n        cursor_expr,    -- prefixes WHERE\n        sort_expr,      -- prefixes ORDER BY\n        cursor_expr,    -- objects WHERE\n        sort_expr,      -- objects ORDER BY\n        sort_expr       -- final ORDER BY\n    )\n    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "lock_top_prefixes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.lock_top_prefixes(bucket_ids text[], names text[])\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_bucket text;\n    v_top text;\nBEGIN\n    FOR v_bucket, v_top IN\n        SELECT DISTINCT t.bucket_id,\n            split_part(t.name, '/', 1) AS top\n        FROM unnest(bucket_ids, names) AS t(bucket_id, name)\n        WHERE t.name <> ''\n        ORDER BY 1, 2\n        LOOP\n            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));\n        END LOOP;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "objects_update_cleanup",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.objects_update_cleanup()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    -- NEW - OLD (destinations to create prefixes for)\n    v_add_bucket_ids text[];\n    v_add_names      text[];\n\n    -- OLD - NEW (sources to prune)\n    v_src_bucket_ids text[];\n    v_src_names      text[];\nBEGIN\n    IF TG_OP <> 'UPDATE' THEN\n        RETURN NULL;\n    END IF;\n\n    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)\n    WITH added AS (\n        SELECT n.bucket_id, n.name\n        FROM new_rows n\n        WHERE n.name <> '' AND position('/' in n.name) > 0\n        EXCEPT\n        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''\n    ),\n    moved AS (\n         SELECT o.bucket_id, o.name\n         FROM old_rows o\n         WHERE o.name <> ''\n         EXCEPT\n         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''\n    )\n    SELECT\n        -- arrays for ADDED (dest) in stable order\n        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),\n        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),\n        -- arrays for MOVED (src) in stable order\n        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),\n        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )\n    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;\n\n    -- Nothing to do?\n    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN\n        RETURN NULL;\n    END IF;\n\n    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks\n    DECLARE\n        v_all_bucket_ids text[];\n        v_all_names text[];\n    BEGIN\n        -- Combine source and destination arrays for consistent lock ordering\n        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');\n        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');\n\n        -- Single lock call ensures consistent global ordering across all transactions\n        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN\n            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);\n        END IF;\n    END;\n\n    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources\n    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN\n        WITH candidates AS (\n            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name\n            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)\n            WHERE name <> ''\n        )\n        INSERT INTO storage.prefixes (bucket_id, name)\n        SELECT c.bucket_id, c.name\n        FROM candidates c\n        ON CONFLICT DO NOTHING;\n    END IF;\n\n    -- 4) Prune source prefixes bottom-up for OLD−NEW\n    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN\n        -- re-entrancy guard so DELETE on prefixes won't recurse\n        IF current_setting('storage.gc.prefixes', true) <> '1' THEN\n            PERFORM set_config('storage.gc.prefixes', '1', true);\n        END IF;\n\n        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);\n    END IF;\n\n    RETURN NULL;\nEND;\n$function$\n"
  },
  {
    "schema": "storage",
    "function_name": "delete_leaf_prefixes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION storage.delete_leaf_prefixes(bucket_ids text[], names text[])\n RETURNS void\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\nDECLARE\n    v_rows_deleted integer;\nBEGIN\n    LOOP\n        WITH candidates AS (\n            SELECT DISTINCT\n                t.bucket_id,\n                unnest(storage.get_prefixes(t.name)) AS name\n            FROM unnest(bucket_ids, names) AS t(bucket_id, name)\n        ),\n        uniq AS (\n             SELECT\n                 bucket_id,\n                 name,\n                 storage.get_level(name) AS level\n             FROM candidates\n             WHERE name <> ''\n             GROUP BY bucket_id, name\n        ),\n        leaf AS (\n             SELECT\n                 p.bucket_id,\n                 p.name,\n                 p.level\n             FROM storage.prefixes AS p\n                  JOIN uniq AS u\n                       ON u.bucket_id = p.bucket_id\n                           AND u.name = p.name\n                           AND u.level = p.level\n             WHERE NOT EXISTS (\n                 SELECT 1\n                 FROM storage.objects AS o\n                 WHERE o.bucket_id = p.bucket_id\n                   AND o.level = p.level + 1\n                   AND o.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n             AND NOT EXISTS (\n                 SELECT 1\n                 FROM storage.prefixes AS c\n                 WHERE c.bucket_id = p.bucket_id\n                   AND c.level = p.level + 1\n                   AND c.name COLLATE \"C\" LIKE p.name || '/%'\n             )\n        )\n        DELETE\n        FROM storage.prefixes AS p\n            USING leaf AS l\n        WHERE p.bucket_id = l.bucket_id\n          AND p.name = l.name\n          AND p.level = l.level;\n\n        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;\n        EXIT WHEN v_rows_deleted = 0;\n    END LOOP;\nEND;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "quote_wal2json",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)\n RETURNS text\n LANGUAGE sql\n IMMUTABLE STRICT\nAS $function$\n      select\n        (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n        )\n        || '.'\n        || (\n          select string_agg('' || ch,'')\n          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)\n          where\n            not (x.idx = 1 and x.ch = '\"')\n            and not (\n              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)\n              and x.ch = '\"'\n            )\n          )\n      from\n        pg_class pc\n        join pg_namespace nsp\n          on pc.relnamespace = nsp.oid\n      where\n        pc.oid = entity\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "cast",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.\"cast\"(val text, type_ regtype)\n RETURNS jsonb\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n    declare\n      res jsonb;\n    begin\n      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;\n      return res;\n    end\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "broadcast_changes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n    -- Declare a variable to hold the JSONB representation of the row\n    row_data jsonb := '{}'::jsonb;\nBEGIN\n    IF level = 'STATEMENT' THEN\n        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';\n    END IF;\n    -- Check the operation type and handle accordingly\n    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN\n        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);\n        PERFORM realtime.send (row_data, event_name, topic_name);\n    ELSE\n        RAISE EXCEPTION 'Unexpected operation type: %', operation;\n    END IF;\nEXCEPTION\n    WHEN OTHERS THEN\n        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;\nEND;\n\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "auto_create_default_unit",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.auto_create_default_unit()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  -- Insert a default unit for the newly created property\r\n  INSERT INTO public.units (\r\n    property_id,\r\n    unit_number,\r\n    bedrooms,\r\n    bathrooms,\r\n    square_feet,\r\n    rent_amount,\r\n    deposit,\r\n    is_occupied,\r\n    features,\r\n    available_date,\r\n    listing_status,\r\n    is_public_listing,\r\n    is_featured,\r\n    view_count\r\n  ) VALUES (\r\n    NEW.id,                           -- property_id\r\n    '1',                              -- unit_number (default to \"1\")\r\n    0,                                -- bedrooms (default)\r\n    0,                                -- bathrooms (default)\r\n    NULL,                             -- square_feet (can be set later)\r\n    0,                                -- rent_amount (default, should be updated)\r\n    0,                                -- deposit (default, should be updated)\r\n    FALSE,                            -- is_occupied\r\n    '[]'::JSONB,                      -- features (empty array)\r\n    CURRENT_DATE,                     -- available_date (today)\r\n    'available',                      -- listing_status\r\n    TRUE,                             -- is_public_listing (make visible immediately)\r\n    FALSE,                            -- is_featured\r\n    0                                 -- view_count\r\n  );\r\n  \r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "to_regrole",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)\n RETURNS regrole\n LANGUAGE sql\n IMMUTABLE\nAS $function$ select role_name::regrole $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "build_prepared_statement_sql",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])\n RETURNS text\n LANGUAGE sql\nAS $function$\n      /*\n      Builds a sql string that, if executed, creates a prepared statement to\n      tests retrive a row from *entity* by its primary key columns.\n      Example\n          select realtime.build_prepared_statement_sql('public.notes', '{\"id\"}'::text[], '{\"bigint\"}'::text[])\n      */\n          select\n      'prepare ' || prepared_statement_name || ' as\n          select\n              exists(\n                  select\n                      1\n                  from\n                      ' || entity || '\n                  where\n                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '\n              )'\n          from\n              unnest(columns) pkc\n          where\n              pkc.is_pkey\n          group by\n              entity\n      $function$\n"
  },
  {
    "schema": "public",
    "function_name": "handle_tenancy_termination",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.handle_tenancy_termination()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    -- Only process when status changes to 'terminated'\r\n    IF NEW.agreement_status = 'terminated' AND (OLD.agreement_status IS NULL OR OLD.agreement_status != 'terminated') THEN\r\n        -- Update the unit to make it available again\r\n        UPDATE public.units\r\n        SET \r\n            listing_status = 'available',\r\n            is_occupied = false,\r\n            current_tenant_id = NULL,\r\n            is_public_listing = true,\r\n            updated_at = NOW()\r\n        WHERE id = NEW.unit_id;\r\n\r\n        -- Update any related active tenancy records to 'ended' status\r\n        UPDATE public.tenancies\r\n        SET \r\n            status = 'ended',\r\n            end_date = COALESCE(NEW.terminated_at::DATE, CURRENT_DATE),\r\n            updated_at = NOW()\r\n        WHERE agreement_id = NEW.id\r\n        AND status = 'active';\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "apply_rls",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))\n RETURNS SETOF realtime.wal_rls\n LANGUAGE plpgsql\nAS $function$\ndeclare\n-- Regclass of the table e.g. public.notes\nentity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;\n\n-- I, U, D, T: insert, update ...\naction realtime.action = (\n    case wal ->> 'action'\n        when 'I' then 'INSERT'\n        when 'U' then 'UPDATE'\n        when 'D' then 'DELETE'\n        else 'ERROR'\n    end\n);\n\n-- Is row level security enabled for the table\nis_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;\n\nsubscriptions realtime.subscription[] = array_agg(subs)\n    from\n        realtime.subscription subs\n    where\n        subs.entity = entity_;\n\n-- Subscription vars\nroles regrole[] = array_agg(distinct us.claims_role::text)\n    from\n        unnest(subscriptions) us;\n\nworking_role regrole;\nclaimed_role regrole;\nclaims jsonb;\n\nsubscription_id uuid;\nsubscription_has_access bool;\nvisible_to_subscription_ids uuid[] = '{}';\n\n-- structured info for wal's columns\ncolumns realtime.wal_column[];\n-- previous identity values for update/delete\nold_columns realtime.wal_column[];\n\nerror_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;\n\n-- Primary jsonb output for record\noutput jsonb;\n\nbegin\nperform set_config('role', null, true);\n\ncolumns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'columns') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nold_columns =\n    array_agg(\n        (\n            x->>'name',\n            x->>'type',\n            x->>'typeoid',\n            realtime.cast(\n                (x->'value') #>> '{}',\n                coalesce(\n                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4\n                    (x->>'type')::regtype\n                )\n            ),\n            (pks ->> 'name') is not null,\n            true\n        )::realtime.wal_column\n    )\n    from\n        jsonb_array_elements(wal -> 'identity') x\n        left join jsonb_array_elements(wal -> 'pk') pks\n            on (x ->> 'name') = (pks ->> 'name');\n\nfor working_role in select * from unnest(roles) loop\n\n    -- Update `is_selectable` for columns and old_columns\n    columns =\n        array_agg(\n            (\n                c.name,\n                c.type_name,\n                c.type_oid,\n                c.value,\n                c.is_pkey,\n                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n            )::realtime.wal_column\n        )\n        from\n            unnest(columns) c;\n\n    old_columns =\n            array_agg(\n                (\n                    c.name,\n                    c.type_name,\n                    c.type_oid,\n                    c.value,\n                    c.is_pkey,\n                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')\n                )::realtime.wal_column\n            )\n            from\n                unnest(old_columns) c;\n\n    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            -- subscriptions is already filtered by entity\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 400: Bad Request, no primary key']\n        )::realtime.wal_rls;\n\n    -- The claims role does not have SELECT permission to the primary key of entity\n    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then\n        return next (\n            jsonb_build_object(\n                'schema', wal ->> 'schema',\n                'table', wal ->> 'table',\n                'type', action\n            ),\n            is_rls_enabled,\n            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),\n            array['Error 401: Unauthorized']\n        )::realtime.wal_rls;\n\n    else\n        output = jsonb_build_object(\n            'schema', wal ->> 'schema',\n            'table', wal ->> 'table',\n            'type', action,\n            'commit_timestamp', to_char(\n                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),\n                'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'\n            ),\n            'columns', (\n                select\n                    jsonb_agg(\n                        jsonb_build_object(\n                            'name', pa.attname,\n                            'type', pt.typname\n                        )\n                        order by pa.attnum asc\n                    )\n                from\n                    pg_attribute pa\n                    join pg_type pt\n                        on pa.atttypid = pt.oid\n                where\n                    attrelid = entity_\n                    and attnum > 0\n                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')\n            )\n        )\n        -- Add \"record\" key for insert and update\n        || case\n            when action in ('INSERT', 'UPDATE') then\n                jsonb_build_object(\n                    'record',\n                    (\n                        select\n                            jsonb_object_agg(\n                                -- if unchanged toast, get column name and value from old record\n                                coalesce((c).name, (oc).name),\n                                case\n                                    when (c).name is null then (oc).value\n                                    else (c).value\n                                end\n                            )\n                        from\n                            unnest(columns) c\n                            full outer join unnest(old_columns) oc\n                                on (c).name = (oc).name\n                        where\n                            coalesce((c).is_selectable, (oc).is_selectable)\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                    )\n                )\n            else '{}'::jsonb\n        end\n        -- Add \"old_record\" key for update and delete\n        || case\n            when action = 'UPDATE' then\n                jsonb_build_object(\n                        'old_record',\n                        (\n                            select jsonb_object_agg((c).name, (c).value)\n                            from unnest(old_columns) c\n                            where\n                                (c).is_selectable\n                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                        )\n                    )\n            when action = 'DELETE' then\n                jsonb_build_object(\n                    'old_record',\n                    (\n                        select jsonb_object_agg((c).name, (c).value)\n                        from unnest(old_columns) c\n                        where\n                            (c).is_selectable\n                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))\n                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey\n                    )\n                )\n            else '{}'::jsonb\n        end;\n\n        -- Create the prepared statement\n        if is_rls_enabled and action <> 'DELETE' then\n            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then\n                deallocate walrus_rls_stmt;\n            end if;\n            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);\n        end if;\n\n        visible_to_subscription_ids = '{}';\n\n        for subscription_id, claims in (\n                select\n                    subs.subscription_id,\n                    subs.claims\n                from\n                    unnest(subscriptions) subs\n                where\n                    subs.entity = entity_\n                    and subs.claims_role = working_role\n                    and (\n                        realtime.is_visible_through_filters(columns, subs.filters)\n                        or (\n                          action = 'DELETE'\n                          and realtime.is_visible_through_filters(old_columns, subs.filters)\n                        )\n                    )\n        ) loop\n\n            if not is_rls_enabled or action = 'DELETE' then\n                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n            else\n                -- Check if RLS allows the role to see the record\n                perform\n                    -- Trim leading and trailing quotes from working_role because set_config\n                    -- doesn't recognize the role as valid if they are included\n                    set_config('role', trim(both '\"' from working_role::text), true),\n                    set_config('request.jwt.claims', claims::text, true);\n\n                execute 'execute walrus_rls_stmt' into subscription_has_access;\n\n                if subscription_has_access then\n                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;\n                end if;\n            end if;\n        end loop;\n\n        perform set_config('role', null, true);\n\n        return next (\n            output,\n            is_rls_enabled,\n            visible_to_subscription_ids,\n            case\n                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']\n                else '{}'\n            end\n        )::realtime.wal_rls;\n\n    end if;\nend loop;\n\nperform set_config('role', null, true);\nend;\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "check_equality_op",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)\n RETURNS boolean\n LANGUAGE plpgsql\n IMMUTABLE\nAS $function$\n      /*\n      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness\n      */\n      declare\n          op_symbol text = (\n              case\n                  when op = 'eq' then '='\n                  when op = 'neq' then '!='\n                  when op = 'lt' then '<'\n                  when op = 'lte' then '<='\n                  when op = 'gt' then '>'\n                  when op = 'gte' then '>='\n                  when op = 'in' then '= any'\n                  else 'UNKNOWN OP'\n              end\n          );\n          res boolean;\n      begin\n          execute format(\n              'select %L::'|| type_::text || ' ' || op_symbol\n              || ' ( %L::'\n              || (\n                  case\n                      when op = 'in' then type_::text || '[]'\n                      else type_::text end\n              )\n              || ')', val_1, val_2) into res;\n          return res;\n      end;\n      $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "subscription_check_filters",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    $function$\n"
  },
  {
    "schema": "public",
    "function_name": "auto_set_is_public_listing",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.auto_set_is_public_listing()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    -- Set is_public_listing to TRUE when listing_status is 'available'\r\n    -- Set to FALSE for any other status\r\n    IF NEW.listing_status = 'available' THEN\r\n        NEW.is_public_listing := TRUE;\r\n    ELSE\r\n        NEW.is_public_listing := FALSE;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_updated_at",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.update_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  NEW.updated_at = NOW();\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "update_tenancies_updated_at",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.update_tenancies_updated_at()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "can_apply_for_unit",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.can_apply_for_unit(unit_id_param uuid)\n RETURNS boolean\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n    RETURN EXISTS (\r\n        SELECT 1 FROM public.units\r\n        WHERE id = unit_id_param\r\n        AND listing_status = 'available'\r\n        AND is_public_listing = true\r\n    );\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "auto_set_public_listing",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.auto_set_public_listing()\n RETURNS trigger\n LANGUAGE plpgsql\nAS $function$\r\nBEGIN\r\n  -- When a unit is set to 'available', make it public\r\n  IF NEW.listing_status = 'available' THEN\r\n    NEW.is_public_listing = TRUE;\r\n  -- When a unit is set to anything else, remove from public listing\r\n  ELSIF NEW.listing_status IN ('applied', 'rented', 'unlisted') THEN\r\n    NEW.is_public_listing = FALSE;\r\n  END IF;\r\n  \r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "is_visible_through_filters",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])\n RETURNS boolean\n LANGUAGE sql\n IMMUTABLE\nAS $function$\n    /*\n    Should the record be visible (true) or filtered out (false) after *filters* are applied\n    */\n        select\n            -- Default to allowed when no filters present\n            $2 is null -- no filters. this should not happen because subscriptions has a default\n            or array_length($2, 1) is null -- array length of an empty array is null\n            or bool_and(\n                coalesce(\n                    realtime.check_equality_op(\n                        op:=f.op,\n                        type_:=coalesce(\n                            col.type_oid::regtype, -- null when wal2json version <= 2.4\n                            col.type_name::regtype\n                        ),\n                        -- cast jsonb to text\n                        val_1:=col.value #>> '{}',\n                        val_2:=f.value\n                    ),\n                    false -- if null, filter does not match\n                )\n            )\n        from\n            unnest(filters) f\n            join unnest(columns) col\n                on f.column_name = col.name;\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "list_changes",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)\n RETURNS SETOF realtime.wal_rls\n LANGUAGE sql\n SET log_min_messages TO 'fatal'\nAS $function$\n      with pub as (\n        select\n          concat_ws(\n            ',',\n            case when bool_or(pubinsert) then 'insert' else null end,\n            case when bool_or(pubupdate) then 'update' else null end,\n            case when bool_or(pubdelete) then 'delete' else null end\n          ) as w2j_actions,\n          coalesce(\n            string_agg(\n              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),\n              ','\n            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),\n            ''\n          ) w2j_add_tables\n        from\n          pg_publication pp\n          left join pg_publication_tables ppt\n            on pp.pubname = ppt.pubname\n        where\n          pp.pubname = publication\n        group by\n          pp.pubname\n        limit 1\n      ),\n      w2j as (\n        select\n          x.*, pub.w2j_add_tables\n        from\n          pub,\n          pg_logical_slot_get_changes(\n            slot_name, null, max_changes,\n            'include-pk', 'true',\n            'include-transaction', 'false',\n            'include-timestamp', 'true',\n            'include-type-oids', 'true',\n            'format-version', '2',\n            'actions', pub.w2j_actions,\n            'add-tables', pub.w2j_add_tables\n          ) x\n      )\n      select\n        xyz.wal,\n        xyz.is_rls_enabled,\n        xyz.subscription_ids,\n        xyz.errors\n      from\n        w2j,\n        realtime.apply_rls(\n          wal := w2j.data::jsonb,\n          max_record_bytes := max_record_bytes\n        ) xyz(wal, is_rls_enabled, subscription_ids, errors)\n      where\n        w2j.w2j_add_tables <> ''\n        and xyz.subscription_ids[1] is not null\n    $function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "topic",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.topic()\n RETURNS text\n LANGUAGE sql\n STABLE\nAS $function$\nselect nullif(current_setting('realtime.topic', true), '')::text;\n$function$\n"
  },
  {
    "schema": "public",
    "function_name": "create_tenancy_on_agreement_active",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION public.create_tenancy_on_agreement_active()\n RETURNS trigger\n LANGUAGE plpgsql\n SECURITY DEFINER\nAS $function$\r\nBEGIN\r\n  -- Ensure we operate in the intended schema (allow temp tables)\r\n  PERFORM set_config('search_path', 'public, pg_temp', false);\r\n\r\n  -- Only proceed if the agreement is active.\r\n  -- Adjust the condition if your agreement active flag uses a different column or value.\r\n  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.active IS DISTINCT FROM OLD.active) THEN\r\n    IF NEW.active IS TRUE THEN\r\n      -- Avoid creating duplicate tenancies for the same agreement\r\n      IF NOT EXISTS (\r\n        SELECT 1\r\n        FROM public.tenancies t\r\n        WHERE t.agreement_id = NEW.id\r\n      ) THEN\r\n        INSERT INTO public.tenancies (agreement_id, tenant_id, start_date)\r\n        VALUES (NEW.id, NEW.tenant_id, CURRENT_DATE);\r\n      ELSE\r\n        RAISE DEBUG 'Tenancy already exists for agreement %', NEW.id;\r\n      END IF;\r\n    END IF;\r\n  END IF;\r\n\r\n  RETURN NEW;\r\nEND;\r\n$function$\n"
  },
  {
    "schema": "realtime",
    "function_name": "send",
    "pg_get_functiondef": "CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)\n RETURNS void\n LANGUAGE plpgsql\nAS $function$\nDECLARE\n  generated_id uuid;\n  final_payload jsonb;\nBEGIN\n  BEGIN\n    -- Generate a new UUID for the id\n    generated_id := gen_random_uuid();\n\n    -- Check if payload has an 'id' key, if not, add the generated UUID\n    IF payload ? 'id' THEN\n      final_payload := payload;\n    ELSE\n      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));\n    END IF;\n\n    -- Set the topic configuration\n    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);\n\n    -- Attempt to insert the message\n    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)\n    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');\n  EXCEPTION\n    WHEN OTHERS THEN\n      -- Capture and notify the error\n      RAISE WARNING 'ErrorSendingBroadcastMessage: %', SQLERRM;\n  END;\nEND;\n$function$\n"
  }
]

[
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Service role can insert signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "false"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update own record",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Users can view own signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(signer_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Admins can view all signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Landlords can view tenant profiles for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN properties p ON ((u.property_id = p.id)))\n  WHERE ((u.current_tenant_id = tenant_profiles.user_id) AND (p.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Assigned admins can view assigned tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = assigned_to)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Landlords can view agreement signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM tenancy_agreements\n  WHERE ((tenancy_agreements.id = agreement_signatures.agreement_id) AND (tenancy_agreements.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Tenants can view agreement signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM tenancy_agreements\n  WHERE ((tenancy_agreements.id = agreement_signatures.agreement_id) AND (tenancy_agreements.tenant_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "No updates allowed on signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "No deletes allowed on signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can view own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can insert own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can update own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can delete own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Tenants can view published properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_published = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenants view only own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Landlords can manage own units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = units.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Tenants can view units they occupy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = current_tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Anyone can view public listings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_public_listing = true) AND (listing_status = 'available'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlords can view own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can view own applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can create applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlords can create agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(landlord_id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Service role can update agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admin can update documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((auth.jwt() ->> 'role'::text) = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admin can delete documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((auth.jwt() ->> 'role'::text) = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Landlords can view applications for their properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = property_applications.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Landlords can update applications for their properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = property_applications.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "Service role can insert audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenants can view own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlords can view payments for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "No updates on audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "No deletes on audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can update their own objects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = owner)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can delete their own objects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = owner)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlord can read unit payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(((auth.jwt() ->> 'role'::text) = 'landlord'::text) AND (EXISTS ( SELECT 1\n   FROM (units u\n     JOIN properties p ON ((p.id = u.property_id)))\n  WHERE ((u.id = payments.unit_id) AND (p.landlord_id = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can access own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenants view only own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "Landlords can view own subscriptions",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Tenants can view own maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Tenants can create maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Landlords can view maintenance requests for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Landlords can update maintenance requests for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can view all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Admins can view all landlord profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Admins can view all tenant profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Admins can view all properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Admins can manage all units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Admins can view all agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Admins can manage all applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Admins can manage all payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "Admins can manage all subscriptions",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Admins can manage all maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Landlords can create reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "is_landlord()"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Admins can manage all reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admins can view all documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Admins can view all tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "Admins can view audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "policyname": "Users can view updates for their requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM maintenance_requests mr\n  WHERE ((mr.id = maintenance_updates.request_id) AND ((mr.tenant_id = auth.uid()) OR (mr.landlord_id = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "policyname": "Users can create updates for their requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM maintenance_requests mr\n  WHERE ((mr.id = maintenance_updates.request_id) AND ((mr.tenant_id = auth.uid()) OR (mr.landlord_id = auth.uid()))))) AND (auth.uid() = user_id))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can view own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can update own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Service can insert notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Users can view own reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = recipient_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlords view own unit payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "Users can view messages for their tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM support_tickets st\n  WHERE ((st.id = ticket_messages.ticket_id) AND ((st.user_id = auth.uid()) OR (st.assigned_to = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service role only updates payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service role only creates payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "false"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Allow marking admin codes as used",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(is_used = false)",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can view own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = owner_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can insert own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = owner_id)"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can delete own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = owner_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "User can delete own messages (open tickets only)",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((user_id = auth.uid()) AND (ticket_id IN ( SELECT support_tickets.id\n   FROM support_tickets\n  WHERE (support_tickets.status = 'open'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Users can view own tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Users can create tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "User can access own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(owner_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "Users can create messages for their tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM support_tickets st\n  WHERE ((st.id = ticket_messages.ticket_id) AND ((st.user_id = auth.uid()) OR (st.assigned_to = auth.uid()))))) AND (auth.uid() = user_id))"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admin can update announcements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.role() = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admin can delete announcements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.role() = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to update own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can view all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenant can access own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to insert own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(id = ( SELECT auth.uid() AS uid))"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update their own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can manage all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(role = 'admin'::text)",
    "with_check": "(role = 'admin'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to read own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to update own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Tenants can view own tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "...",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Super admins can update user roles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "is_super_admin()",
    "with_check": "is_super_admin()"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins cannot escalate roles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": "(role = role)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Landlords can view their property tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "System can create tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Landlords can update their tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "User can select own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "User can update own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can delete admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to upload property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'landlord'::text)))))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access to property images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'property-images'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to update own property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.landlord_id = auth.uid()) AND ((properties.id)::text = split_part(properties.name, '/'::text, 1))))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to delete own property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.landlord_id = auth.uid()) AND ((properties.id)::text = split_part(properties.name, '/'::text, 1))))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow authenticated users to upload",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'documents'::text) AND (auth.uid() IS NOT NULL))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access to documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'documents'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'documents'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow users to delete own files",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'documents'::text) AND (auth.uid() IS NOT NULL) AND ((auth.uid())::text = split_part(name, '/'::text, 2)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Public read published properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_published = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Public read public units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_public_listing = true) AND (listing_status = 'available'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can delete own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can view all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can select own record",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Admins can manage all tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlord can update own property",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can withdraw own applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((auth.uid() = tenant_id) AND (application_status = ANY (ARRAY['pending'::text, 'approved'::text])))",
    "with_check": "((auth.uid() = tenant_id) AND (application_status = ANY (ARRAY['withdrawn'::text, 'cancelled'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admins can manage announcements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlord can delete own property",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Landlord can read own tenants only",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (properties p\n     JOIN tenancy_agreements t ON ((t.property_id = p.id)))\n  WHERE ((p.landlord_id = auth.uid()) AND (t.tenant_id = tenant_profiles.user_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can manage all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Users can view active announcements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_active = true) AND ((target_audience = 'all'::text) OR ((target_audience = 'tenants'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'tenant'::text))))) OR ((target_audience = 'landlords'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'landlord'::text))))) OR ((target_audience = 'admins'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Service can insert users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Service can insert landlord profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Service can insert tenant profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Service can insert admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Service can read system config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Super admins can view all config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Admins can view non-sensitive config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_admin() AND (is_sensitive = false))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Super admins can update config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Service can insert system config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins read all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can read all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow insert via trigger",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Admins manage admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": "is_admin()"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can view own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can update own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can delete own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenant can read own payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to select own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read self",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read their own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlord can view own properties agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Super admins can view all admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Super admins can insert admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Read admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "User can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can update all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlord can update own properties agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service can insert payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.role() = 'service'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can read own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to read own role",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view own record",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can delete own account",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow logged-in user to select own role",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  }
]
[
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Service role can insert signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "false"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update own record",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Users can view own signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(signer_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Admins can view all signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Landlords can view tenant profiles for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (units u\n     JOIN properties p ON ((u.property_id = p.id)))\n  WHERE ((u.current_tenant_id = tenant_profiles.user_id) AND (p.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Assigned admins can view assigned tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = assigned_to)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Landlords can view agreement signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM tenancy_agreements\n  WHERE ((tenancy_agreements.id = agreement_signatures.agreement_id) AND (tenancy_agreements.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "Tenants can view agreement signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM tenancy_agreements\n  WHERE ((tenancy_agreements.id = agreement_signatures.agreement_id) AND (tenancy_agreements.tenant_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "No updates allowed on signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "policyname": "No deletes allowed on signatures",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can update own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can view own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can insert own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can update own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlords can delete own properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Tenants can view published properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_published = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenants view only own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Landlords can manage own units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = units.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Tenants can view units they occupy",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = current_tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Anyone can view public listings",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_public_listing = true) AND (listing_status = 'available'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlords can view own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can view own applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can create applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlords can create agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(landlord_id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Service role can update agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admin can update documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((auth.jwt() ->> 'role'::text) = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admin can delete documents",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((auth.jwt() ->> 'role'::text) = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Landlords can view applications for their properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = property_applications.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Landlords can update applications for their properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.id = property_applications.property_id) AND (properties.landlord_id = auth.uid()))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "Service role can insert audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenants can view own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlords can view payments for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "No updates on audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "No deletes on audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can update their own objects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = owner)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Authenticated users can delete their own objects",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = owner)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlord can read unit payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(((auth.jwt() ->> 'role'::text) = 'landlord'::text) AND (EXISTS ( SELECT 1\n   FROM (units u\n     JOIN properties p ON ((p.id = u.property_id)))\n  WHERE ((u.id = payments.unit_id) AND (p.landlord_id = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can access own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenants view only own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "Landlords can view own subscriptions",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Tenants can view own maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Tenants can create maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Landlords can view maintenance requests for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Landlords can update maintenance requests for their units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can view all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Admins can view all landlord profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Admins can view all tenant profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Admins can view all properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Admins can manage all units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Admins can view all agreements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Admins can manage all applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Admins can manage all payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "policyname": "Admins can manage all subscriptions",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "policyname": "Admins can manage all maintenance requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Landlords can create reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "is_landlord()"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Admins can manage all reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Admins can view all documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Admins can view all tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "policyname": "Admins can view audit logs",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "policyname": "Users can view updates for their requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM maintenance_requests mr\n  WHERE ((mr.id = maintenance_updates.request_id) AND ((mr.tenant_id = auth.uid()) OR (mr.landlord_id = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "policyname": "Users can create updates for their requests",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM maintenance_requests mr\n  WHERE ((mr.id = maintenance_updates.request_id) AND ((mr.tenant_id = auth.uid()) OR (mr.landlord_id = auth.uid()))))) AND (auth.uid() = user_id))"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can view own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Users can update own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "Service can insert notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "policyname": "Users can view own reminders",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = recipient_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Landlords view own unit payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "Users can view messages for their tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM support_tickets st\n  WHERE ((st.id = ticket_messages.ticket_id) AND ((st.user_id = auth.uid()) OR (st.assigned_to = auth.uid())))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service role only updates payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "false",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service role only creates payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "false"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Allow marking admin codes as used",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(is_used = false)",
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can view own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = owner_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can insert own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = owner_id)"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "Users can delete own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = owner_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "User can delete own messages (open tickets only)",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((user_id = auth.uid()) AND (ticket_id IN ( SELECT support_tickets.id\n   FROM support_tickets\n  WHERE (support_tickets.status = 'open'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Users can view own tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "policyname": "Users can create tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can view own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "policyname": "User can access own documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(owner_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "policyname": "Users can create messages for their tickets",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((EXISTS ( SELECT 1\n   FROM support_tickets st\n  WHERE ((st.id = ticket_messages.ticket_id) AND ((st.user_id = auth.uid()) OR (st.assigned_to = auth.uid()))))) AND (auth.uid() = user_id))"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenant can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admin can update announcements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.role() = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admin can delete announcements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.role() = 'admin'::text)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to update own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can view all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenant can access own payments",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to insert own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(id = ( SELECT auth.uid() AS uid))"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update their own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can manage all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(role = 'admin'::text)",
    "with_check": "(role = 'admin'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to read own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to update own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can update their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(id = auth.uid())",
    "with_check": "(id = auth.uid())"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Tenants can view own tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = tenant_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "...",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(( SELECT auth.uid() AS uid) = id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Super admins can update user roles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "is_super_admin()",
    "with_check": "is_super_admin()"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins cannot escalate roles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = id)",
    "with_check": "(role = role)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Landlords can view their property tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "System can create tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Landlords can update their tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(auth.uid() = landlord_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "User can select own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "policyname": "User can update own notifications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "(user_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can delete admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to upload property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'landlord'::text)))))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access to property images",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'property-images'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to update own property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.landlord_id = auth.uid()) AND ((properties.id)::text = split_part(properties.name, '/'::text, 1))))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow landlords to delete own property images",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'property-images'::text) AND (auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1\n   FROM properties\n  WHERE ((properties.landlord_id = auth.uid()) AND ((properties.id)::text = split_part(properties.name, '/'::text, 1))))))",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow authenticated users to upload",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "((bucket_id = 'documents'::text) AND (auth.uid() IS NOT NULL))"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access to documents",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'documents'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow public read access",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(bucket_id = 'documents'::text)",
    "with_check": null
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "policyname": "Allow users to delete own files",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "((bucket_id = 'documents'::text) AND (auth.uid() IS NOT NULL) AND ((auth.uid())::text = split_part(name, '/'::text, 2)))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Landlords can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Tenants can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can insert own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.uid() = user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Public read published properties",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_published = true)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "policyname": "Public read public units",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_public_listing = true) AND (listing_status = 'available'::text))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Admins can delete own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(auth.uid() = user_id)",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can view all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can select own record",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "policyname": "Admins can manage all tenancies",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlord can update own property",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "policyname": "Tenants can withdraw own applications",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "((auth.uid() = tenant_id) AND (application_status = ANY (ARRAY['pending'::text, 'approved'::text])))",
    "with_check": "((auth.uid() = tenant_id) AND (application_status = ANY (ARRAY['withdrawn'::text, 'cancelled'::text])))"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Admins can manage announcements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "policyname": "Landlord can delete own property",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Landlord can read own tenants only",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM (properties p\n     JOIN tenancy_agreements t ON ((t.property_id = p.id)))\n  WHERE ((p.landlord_id = auth.uid()) AND (t.tenant_id = tenant_profiles.user_id))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Super admins can manage all admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "policyname": "Users can view active announcements",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "((is_active = true) AND ((target_audience = 'all'::text) OR ((target_audience = 'tenants'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'tenant'::text))))) OR ((target_audience = 'landlords'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'landlord'::text))))) OR ((target_audience = 'admins'::text) AND (EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Service can insert users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "policyname": "Service can insert landlord profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "policyname": "Service can insert tenant profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "policyname": "Service can insert admin profiles",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Service can read system config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Super admins can view all config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Admins can view non-sensitive config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(is_admin() AND (is_sensitive = false))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Super admins can update config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_super_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "policyname": "Service can insert system config",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins read all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can read all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow insert via trigger",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "true"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Admins manage admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "ALL",
    "qual": "is_admin()",
    "with_check": "is_admin()"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can view own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can update own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can delete own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Tenant can read own payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to select own row",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read self",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read their own data",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlord can view own properties agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Super admins can view all admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Super admins can insert admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM users\n  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::text))))"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "policyname": "Read admin codes",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "policyname": "User can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Admins can update all users",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "UPDATE",
    "qual": "is_admin()",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Landlord can update own properties agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(landlord_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "policyname": "Service can insert payments",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(auth.role() = 'service'::text)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read own profile",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "policyname": "Tenant can read own agreements",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(tenant_id = auth.uid())",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can read their own profile",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow user to read own role",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can view own record",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Users can delete own account",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "policyname": "Allow logged-in user to select own role",
    "permissive": "PERMISSIVE",
    "roles": "{public}",
    "cmd": "SELECT",
    "qual": "(id = ( SELECT auth.uid() AS uid))",
    "with_check": null
  }
]
[
  {
    "event_object_schema": "storage",
    "event_object_table": "objects",
    "trigger_name": "update_objects_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION storage.update_updated_at_column()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "prefixes",
    "trigger_name": "prefixes_create_hierarchy",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION storage.prefixes_insert_trigger()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "objects",
    "trigger_name": "objects_insert_create_prefix",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION storage.objects_insert_prefix_trigger()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION storage.enforce_bucket_name_length()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "buckets",
    "trigger_name": "enforce_bucket_name_length_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION storage.enforce_bucket_name_length()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "objects",
    "trigger_name": "objects_delete_delete_prefix",
    "action_timing": "AFTER",
    "event_manipulation": "DELETE",
    "action_statement": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "objects",
    "trigger_name": "objects_update_create_prefix",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION storage.objects_update_prefix_trigger()"
  },
  {
    "event_object_schema": "storage",
    "event_object_table": "prefixes",
    "trigger_name": "prefixes_delete_hierarchy",
    "action_timing": "AFTER",
    "event_manipulation": "DELETE",
    "action_statement": "EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger()"
  },
  {
    "event_object_schema": "realtime",
    "event_object_table": "subscription",
    "trigger_name": "tr_check_filters",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION realtime.subscription_check_filters()"
  },
  {
    "event_object_schema": "realtime",
    "event_object_table": "subscription",
    "trigger_name": "tr_check_filters",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION realtime.subscription_check_filters()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "users",
    "trigger_name": "update_users_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "landlord_profiles",
    "trigger_name": "update_landlord_profiles_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "tenant_profiles",
    "trigger_name": "update_tenant_profiles_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "admin_profiles",
    "trigger_name": "update_admin_profiles_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "properties",
    "trigger_name": "update_properties_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "units",
    "trigger_name": "update_units_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "tenancy_agreements",
    "trigger_name": "update_tenancy_agreements_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "property_applications",
    "trigger_name": "update_property_applications_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "payments",
    "trigger_name": "update_payments_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "subscriptions",
    "trigger_name": "update_subscriptions_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "maintenance_requests",
    "trigger_name": "update_maintenance_requests_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "reminders",
    "trigger_name": "update_reminders_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "support_tickets",
    "trigger_name": "update_support_tickets_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at_column()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "units",
    "trigger_name": "auto_set_public_listing",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION auto_set_is_public_listing()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "units",
    "trigger_name": "auto_set_public_listing",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION auto_set_is_public_listing()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "payments",
    "trigger_name": "payments_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_updated_at()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "tenancies",
    "trigger_name": "update_tenancies_updated_at",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_tenancies_updated_at()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "tenancy_agreements",
    "trigger_name": "trigger_create_tenancy_on_agreement_active",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION create_tenancy_on_agreement_active()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "property_applications",
    "trigger_name": "trigger_update_unit_on_application_approved",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION update_unit_on_application_approved()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "tenancy_agreements",
    "trigger_name": "trigger_handle_tenancy_termination",
    "action_timing": "AFTER",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION handle_tenancy_termination()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "properties",
    "trigger_name": "trigger_auto_create_default_unit",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION auto_create_default_unit()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "units",
    "trigger_name": "trigger_auto_set_public_listing",
    "action_timing": "BEFORE",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION auto_set_public_listing()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "units",
    "trigger_name": "trigger_auto_set_public_listing",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION auto_set_public_listing()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "agreement_signatures",
    "trigger_name": "prevent_signature_modification_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "DELETE",
    "action_statement": "EXECUTE FUNCTION prevent_signature_modification()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "agreement_signatures",
    "trigger_name": "prevent_signature_modification_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION prevent_signature_modification()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "audit_logs",
    "trigger_name": "prevent_audit_log_modification_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "DELETE",
    "action_statement": "EXECUTE FUNCTION prevent_audit_log_modification()"
  },
  {
    "event_object_schema": "public",
    "event_object_table": "audit_logs",
    "trigger_name": "prevent_audit_log_modification_trigger",
    "action_timing": "BEFORE",
    "event_manipulation": "UPDATE",
    "action_statement": "EXECUTE FUNCTION prevent_audit_log_modification()"
  },
  {
    "event_object_schema": "auth",
    "event_object_table": "users",
    "trigger_name": "handle_new_user_trigger",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION validate_admin_registration()"
  },
  {
    "event_object_schema": "auth",
    "event_object_table": "users",
    "trigger_name": "on_auth_user_created",
    "action_timing": "AFTER",
    "event_manipulation": "INSERT",
    "action_statement": "EXECUTE FUNCTION handle_new_user()"
  }
]
[
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_pkey",
    "indexdef": "CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_instance_id_idx",
    "indexdef": "CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_pkey",
    "indexdef": "CREATE UNIQUE INDEX refresh_tokens_pkey ON auth.refresh_tokens USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_instance_id_idx",
    "indexdef": "CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_instance_id_user_id_idx",
    "indexdef": "CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "instances",
    "indexname": "instances_pkey",
    "indexdef": "CREATE UNIQUE INDEX instances_pkey ON auth.instances USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "audit_log_entries",
    "indexname": "audit_log_entries_pkey",
    "indexdef": "CREATE UNIQUE INDEX audit_log_entries_pkey ON auth.audit_log_entries USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "audit_log_entries",
    "indexname": "audit_logs_instance_id_idx",
    "indexdef": "CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "schema_migrations",
    "indexname": "schema_migrations_pkey",
    "indexdef": "CREATE UNIQUE INDEX schema_migrations_pkey ON auth.schema_migrations USING btree (version)"
  },
  {
    "schemaname": "vault",
    "tablename": "secrets",
    "indexname": "secrets_pkey",
    "indexdef": "CREATE UNIQUE INDEX secrets_pkey ON vault.secrets USING btree (id)"
  },
  {
    "schemaname": "vault",
    "tablename": "secrets",
    "indexname": "secrets_name_idx",
    "indexdef": "CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_token_unique",
    "indexdef": "CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_parent_idx",
    "indexdef": "CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent)"
  },
  {
    "schemaname": "auth",
    "tablename": "identities",
    "indexname": "identities_user_id_idx",
    "indexdef": "CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_instance_id_email_idx",
    "indexdef": "CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text))"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "confirmation_token_idx",
    "indexdef": "CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "recovery_token_idx",
    "indexdef": "CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "email_change_token_current_idx",
    "indexdef": "CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "email_change_token_new_idx",
    "indexdef": "CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "reauthentication_token_idx",
    "indexdef": "CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions",
    "indexname": "sessions_pkey",
    "indexdef": "CREATE UNIQUE INDEX sessions_pkey ON auth.sessions USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "mfa_factors_pkey",
    "indexdef": "CREATE UNIQUE INDEX mfa_factors_pkey ON auth.mfa_factors USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "mfa_factors_user_friendly_name_unique",
    "indexdef": "CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_challenges",
    "indexname": "mfa_challenges_pkey",
    "indexdef": "CREATE UNIQUE INDEX mfa_challenges_pkey ON auth.mfa_challenges USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_amr_claims",
    "indexname": "mfa_amr_claims_session_id_authentication_method_pkey",
    "indexdef": "CREATE UNIQUE INDEX mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims USING btree (session_id, authentication_method)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_amr_claims",
    "indexname": "amr_id_pk",
    "indexdef": "CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions",
    "indexname": "user_id_created_at_idx",
    "indexdef": "CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "factor_id_created_at_idx",
    "indexdef": "CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at)"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions",
    "indexname": "sessions_user_id_idx",
    "indexdef": "CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_session_id_revoked_idx",
    "indexdef": "CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked)"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_providers",
    "indexname": "sso_providers_pkey",
    "indexdef": "CREATE UNIQUE INDEX sso_providers_pkey ON auth.sso_providers USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_providers",
    "indexname": "sso_providers_resource_id_idx",
    "indexdef": "CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id))"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_domains",
    "indexname": "sso_domains_pkey",
    "indexdef": "CREATE UNIQUE INDEX sso_domains_pkey ON auth.sso_domains USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_domains",
    "indexname": "sso_domains_sso_provider_id_idx",
    "indexdef": "CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_domains",
    "indexname": "sso_domains_domain_idx",
    "indexdef": "CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain))"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_providers",
    "indexname": "saml_providers_pkey",
    "indexdef": "CREATE UNIQUE INDEX saml_providers_pkey ON auth.saml_providers USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_providers",
    "indexname": "saml_providers_entity_id_key",
    "indexdef": "CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_providers",
    "indexname": "saml_providers_sso_provider_id_idx",
    "indexdef": "CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_relay_states",
    "indexname": "saml_relay_states_pkey",
    "indexdef": "CREATE UNIQUE INDEX saml_relay_states_pkey ON auth.saml_relay_states USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_relay_states",
    "indexname": "saml_relay_states_sso_provider_id_idx",
    "indexdef": "CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_relay_states",
    "indexname": "saml_relay_states_for_email_idx",
    "indexdef": "CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_email_partial_key",
    "indexdef": "CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false)"
  },
  {
    "schemaname": "auth",
    "tablename": "identities",
    "indexname": "identities_email_idx",
    "indexdef": "CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_phone_key",
    "indexdef": "CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone)"
  },
  {
    "schemaname": "auth",
    "tablename": "flow_state",
    "indexname": "flow_state_pkey",
    "indexdef": "CREATE UNIQUE INDEX flow_state_pkey ON auth.flow_state USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "flow_state",
    "indexname": "idx_auth_code",
    "indexdef": "CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code)"
  },
  {
    "schemaname": "auth",
    "tablename": "flow_state",
    "indexname": "idx_user_id_auth_method",
    "indexdef": "CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method)"
  },
  {
    "schemaname": "auth",
    "tablename": "refresh_tokens",
    "indexname": "refresh_tokens_updated_at_idx",
    "indexdef": "CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "flow_state",
    "indexname": "flow_state_created_at_idx",
    "indexdef": "CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "saml_relay_states",
    "indexname": "saml_relay_states_created_at_idx",
    "indexdef": "CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions",
    "indexname": "sessions_not_after_idx",
    "indexdef": "CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_challenges",
    "indexname": "mfa_challenge_created_at_idx",
    "indexdef": "CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "mfa_factors_user_id_idx",
    "indexdef": "CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "identities",
    "indexname": "identities_pkey",
    "indexdef": "CREATE UNIQUE INDEX identities_pkey ON auth.identities USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "identities",
    "indexname": "identities_provider_id_provider_unique",
    "indexdef": "CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider)"
  },
  {
    "schemaname": "auth",
    "tablename": "users",
    "indexname": "users_is_anonymous_idx",
    "indexdef": "CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous)"
  },
  {
    "schemaname": "auth",
    "tablename": "one_time_tokens",
    "indexname": "one_time_tokens_pkey",
    "indexdef": "CREATE UNIQUE INDEX one_time_tokens_pkey ON auth.one_time_tokens USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "one_time_tokens",
    "indexname": "one_time_tokens_token_hash_hash_idx",
    "indexdef": "CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash)"
  },
  {
    "schemaname": "auth",
    "tablename": "one_time_tokens",
    "indexname": "one_time_tokens_relates_to_hash_idx",
    "indexdef": "CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to)"
  },
  {
    "schemaname": "auth",
    "tablename": "one_time_tokens",
    "indexname": "one_time_tokens_user_id_token_type_key",
    "indexdef": "CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "unique_phone_factor_per_user",
    "indexdef": "CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone)"
  },
  {
    "schemaname": "auth",
    "tablename": "mfa_factors",
    "indexname": "mfa_factors_last_challenged_at_key",
    "indexdef": "CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at)"
  },
  {
    "schemaname": "auth",
    "tablename": "sso_providers",
    "indexname": "sso_providers_resource_id_pattern_idx",
    "indexdef": "CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_clients",
    "indexname": "oauth_clients_pkey",
    "indexdef": "CREATE UNIQUE INDEX oauth_clients_pkey ON auth.oauth_clients USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_clients",
    "indexname": "oauth_clients_deleted_at_idx",
    "indexdef": "CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_authorizations",
    "indexname": "oauth_authorizations_pkey",
    "indexdef": "CREATE UNIQUE INDEX oauth_authorizations_pkey ON auth.oauth_authorizations USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_authorizations",
    "indexname": "oauth_authorizations_authorization_id_key",
    "indexdef": "CREATE UNIQUE INDEX oauth_authorizations_authorization_id_key ON auth.oauth_authorizations USING btree (authorization_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_authorizations",
    "indexname": "oauth_authorizations_authorization_code_key",
    "indexdef": "CREATE UNIQUE INDEX oauth_authorizations_authorization_code_key ON auth.oauth_authorizations USING btree (authorization_code)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_authorizations",
    "indexname": "oauth_auth_pending_exp_idx",
    "indexdef": "CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_consents",
    "indexname": "oauth_consents_pkey",
    "indexdef": "CREATE UNIQUE INDEX oauth_consents_pkey ON auth.oauth_consents USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_consents",
    "indexname": "oauth_consents_user_client_unique",
    "indexdef": "CREATE UNIQUE INDEX oauth_consents_user_client_unique ON auth.oauth_consents USING btree (user_id, client_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_consents",
    "indexname": "oauth_consents_active_user_client_idx",
    "indexdef": "CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_consents",
    "indexname": "oauth_consents_user_order_idx",
    "indexdef": "CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_consents",
    "indexname": "oauth_consents_active_client_idx",
    "indexdef": "CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL)"
  },
  {
    "schemaname": "auth",
    "tablename": "sessions",
    "indexname": "sessions_oauth_client_id_idx",
    "indexdef": "CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_client_states",
    "indexname": "oauth_client_states_pkey",
    "indexdef": "CREATE UNIQUE INDEX oauth_client_states_pkey ON auth.oauth_client_states USING btree (id)"
  },
  {
    "schemaname": "auth",
    "tablename": "oauth_client_states",
    "indexname": "idx_oauth_client_states_created_at",
    "indexdef": "CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at)"
  },
  {
    "schemaname": "storage",
    "tablename": "migrations",
    "indexname": "migrations_pkey",
    "indexdef": "CREATE UNIQUE INDEX migrations_pkey ON storage.migrations USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "migrations",
    "indexname": "migrations_name_key",
    "indexdef": "CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name)"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets",
    "indexname": "buckets_pkey",
    "indexdef": "CREATE UNIQUE INDEX buckets_pkey ON storage.buckets USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets",
    "indexname": "bname",
    "indexdef": "CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "objects_pkey",
    "indexdef": "CREATE UNIQUE INDEX objects_pkey ON storage.objects USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "bucketid_objname",
    "indexdef": "CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "name_prefix_search",
    "indexdef": "CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "idx_objects_bucket_id_name",
    "indexdef": "CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE \"C\")"
  },
  {
    "schemaname": "storage",
    "tablename": "s3_multipart_uploads",
    "indexname": "s3_multipart_uploads_pkey",
    "indexdef": "CREATE UNIQUE INDEX s3_multipart_uploads_pkey ON storage.s3_multipart_uploads USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "s3_multipart_uploads_parts",
    "indexname": "s3_multipart_uploads_parts_pkey",
    "indexdef": "CREATE UNIQUE INDEX s3_multipart_uploads_parts_pkey ON storage.s3_multipart_uploads_parts USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "s3_multipart_uploads",
    "indexname": "idx_multipart_uploads_list",
    "indexdef": "CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at)"
  },
  {
    "schemaname": "storage",
    "tablename": "prefixes",
    "indexname": "prefixes_pkey",
    "indexdef": "CREATE UNIQUE INDEX prefixes_pkey ON storage.prefixes USING btree (bucket_id, level, name)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "idx_name_bucket_level_unique",
    "indexdef": "CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE \"C\", bucket_id, level)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "properties_pkey",
    "indexdef": "CREATE UNIQUE INDEX properties_pkey ON public.properties USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "objects_bucket_id_level_idx",
    "indexdef": "CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE \"C\")"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_landlord_id",
    "indexdef": "CREATE INDEX idx_properties_landlord_id ON public.properties USING btree (landlord_id)"
  },
  {
    "schemaname": "storage",
    "tablename": "objects",
    "indexname": "idx_objects_lower_name",
    "indexdef": "CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_city",
    "indexdef": "CREATE INDEX idx_properties_city ON public.properties USING btree (city)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_state",
    "indexdef": "CREATE INDEX idx_properties_state ON public.properties USING btree (state)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_is_published",
    "indexdef": "CREATE INDEX idx_properties_is_published ON public.properties USING btree (is_published)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "units_pkey",
    "indexdef": "CREATE UNIQUE INDEX units_pkey ON public.units USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "units_property_id_unit_number_key",
    "indexdef": "CREATE UNIQUE INDEX units_property_id_unit_number_key ON public.units USING btree (property_id, unit_number)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "idx_units_property_id",
    "indexdef": "CREATE INDEX idx_units_property_id ON public.units USING btree (property_id)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "idx_units_current_tenant_id",
    "indexdef": "CREATE INDEX idx_units_current_tenant_id ON public.units USING btree (current_tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "idx_units_listing_status",
    "indexdef": "CREATE INDEX idx_units_listing_status ON public.units USING btree (listing_status)"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "idx_units_is_public_listing",
    "indexdef": "CREATE INDEX idx_units_is_public_listing ON public.units USING btree (is_public_listing)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "tenancy_agreements_pkey",
    "indexdef": "CREATE UNIQUE INDEX tenancy_agreements_pkey ON public.tenancy_agreements USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_landlord_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_landlord_id ON public.tenancy_agreements USING btree (landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_tenant_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_tenant_id ON public.tenancy_agreements USING btree (tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_property_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_property_id ON public.tenancy_agreements USING btree (property_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_unit_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_unit_id ON public.tenancy_agreements USING btree (unit_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_status",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_status ON public.tenancy_agreements USING btree (agreement_status)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "property_applications_pkey",
    "indexdef": "CREATE UNIQUE INDEX property_applications_pkey ON public.property_applications USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "idx_property_applications_tenant_id",
    "indexdef": "CREATE INDEX idx_property_applications_tenant_id ON public.property_applications USING btree (tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "idx_property_applications_property_id",
    "indexdef": "CREATE INDEX idx_property_applications_property_id ON public.property_applications USING btree (property_id)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "idx_property_applications_unit_id",
    "indexdef": "CREATE INDEX idx_property_applications_unit_id ON public.property_applications USING btree (unit_id)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "idx_property_applications_status",
    "indexdef": "CREATE INDEX idx_property_applications_status ON public.property_applications USING btree (application_status)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "payments_pkey",
    "indexdef": "CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_tenant_id",
    "indexdef": "CREATE INDEX idx_payments_tenant_id ON public.payments USING btree (tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_landlord_id",
    "indexdef": "CREATE INDEX idx_payments_landlord_id ON public.payments USING btree (landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_unit_id",
    "indexdef": "CREATE INDEX idx_payments_unit_id ON public.payments USING btree (unit_id)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_due_date",
    "indexdef": "CREATE INDEX idx_payments_due_date ON public.payments USING btree (due_date)"
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "indexname": "subscriptions_pkey",
    "indexdef": "CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "indexname": "idx_subscriptions_landlord_id",
    "indexdef": "CREATE INDEX idx_subscriptions_landlord_id ON public.subscriptions USING btree (landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "subscriptions",
    "indexname": "idx_subscriptions_status",
    "indexdef": "CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (subscription_status)"
  },
  {
    "schemaname": "storage",
    "tablename": "prefixes",
    "indexname": "idx_prefixes_lower_name",
    "indexdef": "CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops)"
  },
  {
    "schemaname": "realtime",
    "tablename": "schema_migrations",
    "indexname": "schema_migrations_pkey",
    "indexdef": "CREATE UNIQUE INDEX schema_migrations_pkey ON realtime.schema_migrations USING btree (version)"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets_vectors",
    "indexname": "buckets_vectors_pkey",
    "indexdef": "CREATE UNIQUE INDEX buckets_vectors_pkey ON storage.buckets_vectors USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "vector_indexes",
    "indexname": "vector_indexes_pkey",
    "indexdef": "CREATE UNIQUE INDEX vector_indexes_pkey ON storage.vector_indexes USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "vector_indexes",
    "indexname": "vector_indexes_name_bucket_id_idx",
    "indexdef": "CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id)"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets_analytics",
    "indexname": "buckets_analytics_pkey",
    "indexdef": "CREATE UNIQUE INDEX buckets_analytics_pkey ON storage.buckets_analytics USING btree (id)"
  },
  {
    "schemaname": "storage",
    "tablename": "buckets_analytics",
    "indexname": "buckets_analytics_unique_name_idx",
    "indexdef": "CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL)"
  },
  {
    "schemaname": "realtime",
    "tablename": "subscription",
    "indexname": "pk_subscription",
    "indexdef": "CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id)"
  },
  {
    "schemaname": "realtime",
    "tablename": "subscription",
    "indexname": "subscription_subscription_id_entity_filters_key",
    "indexdef": "CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters)"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages",
    "indexname": "messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX messages_pkey ON ONLY realtime.messages USING btree (id, inserted_at)"
  },
  {
    "schemaname": "realtime",
    "tablename": "subscription",
    "indexname": "ix_realtime_subscription_entity",
    "indexdef": "CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity)"
  },
  {
    "schemaname": "realtime",
    "tablename": "messages",
    "indexname": "messages_inserted_at_topic_index",
    "indexdef": "CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE))"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "indexname": "users_pkey",
    "indexdef": "CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "indexname": "users_email_key",
    "indexdef": "CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "indexname": "idx_users_email",
    "indexdef": "CREATE INDEX idx_users_email ON public.users USING btree (email)"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "indexname": "idx_users_role",
    "indexdef": "CREATE INDEX idx_users_role ON public.users USING btree (role)"
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "indexname": "landlord_profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX landlord_profiles_pkey ON public.landlord_profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "indexname": "landlord_profiles_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX landlord_profiles_user_id_key ON public.landlord_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "landlord_profiles",
    "indexname": "idx_landlord_profiles_user_id",
    "indexdef": "CREATE INDEX idx_landlord_profiles_user_id ON public.landlord_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "indexname": "tenant_profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX tenant_profiles_pkey ON public.tenant_profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "indexname": "tenant_profiles_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX tenant_profiles_user_id_key ON public.tenant_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenant_profiles",
    "indexname": "idx_tenant_profiles_user_id",
    "indexdef": "CREATE INDEX idx_tenant_profiles_user_id ON public.tenant_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "indexname": "admin_profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX admin_profiles_pkey ON public.admin_profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "indexname": "admin_profiles_user_id_key",
    "indexdef": "CREATE UNIQUE INDEX admin_profiles_user_id_key ON public.admin_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_profiles",
    "indexname": "idx_admin_profiles_user_id",
    "indexdef": "CREATE INDEX idx_admin_profiles_user_id ON public.admin_profiles USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "maintenance_requests_pkey",
    "indexdef": "CREATE UNIQUE INDEX maintenance_requests_pkey ON public.maintenance_requests USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_tenant_id",
    "indexdef": "CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests USING btree (tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_landlord_id",
    "indexdef": "CREATE INDEX idx_maintenance_requests_landlord_id ON public.maintenance_requests USING btree (landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_unit_id",
    "indexdef": "CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests USING btree (unit_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_status",
    "indexdef": "CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests USING btree (request_status)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_priority",
    "indexdef": "CREATE INDEX idx_maintenance_requests_priority ON public.maintenance_requests USING btree (priority)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "indexname": "maintenance_updates_pkey",
    "indexdef": "CREATE UNIQUE INDEX maintenance_updates_pkey ON public.maintenance_updates USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "indexname": "idx_maintenance_updates_request_id",
    "indexdef": "CREATE INDEX idx_maintenance_updates_request_id ON public.maintenance_updates USING btree (request_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_updates",
    "indexname": "idx_maintenance_updates_user_id",
    "indexdef": "CREATE INDEX idx_maintenance_updates_user_id ON public.maintenance_updates USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "indexname": "notifications_pkey",
    "indexdef": "CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "indexname": "idx_notifications_user_id",
    "indexdef": "CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "indexname": "idx_notifications_is_read",
    "indexdef": "CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read)"
  },
  {
    "schemaname": "public",
    "tablename": "notifications",
    "indexname": "idx_notifications_created_at",
    "indexdef": "CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "indexname": "reminders_pkey",
    "indexdef": "CREATE UNIQUE INDEX reminders_pkey ON public.reminders USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "indexname": "idx_reminders_recipient_id",
    "indexdef": "CREATE INDEX idx_reminders_recipient_id ON public.reminders USING btree (recipient_id)"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "indexname": "idx_reminders_scheduled_for",
    "indexdef": "CREATE INDEX idx_reminders_scheduled_for ON public.reminders USING btree (scheduled_for)"
  },
  {
    "schemaname": "public",
    "tablename": "reminders",
    "indexname": "idx_reminders_status",
    "indexdef": "CREATE INDEX idx_reminders_status ON public.reminders USING btree (reminder_status)"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "indexname": "documents_pkey",
    "indexdef": "CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "indexname": "idx_documents_owner_id",
    "indexdef": "CREATE INDEX idx_documents_owner_id ON public.documents USING btree (owner_id)"
  },
  {
    "schemaname": "public",
    "tablename": "documents",
    "indexname": "idx_documents_type",
    "indexdef": "CREATE INDEX idx_documents_type ON public.documents USING btree (document_type)"
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "indexname": "support_tickets_pkey",
    "indexdef": "CREATE UNIQUE INDEX support_tickets_pkey ON public.support_tickets USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "indexname": "idx_support_tickets_user_id",
    "indexdef": "CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "indexname": "idx_support_tickets_status",
    "indexdef": "CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (ticket_status)"
  },
  {
    "schemaname": "public",
    "tablename": "support_tickets",
    "indexname": "idx_support_tickets_assigned_to",
    "indexdef": "CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to)"
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "indexname": "ticket_messages_pkey",
    "indexdef": "CREATE UNIQUE INDEX ticket_messages_pkey ON public.ticket_messages USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "indexname": "idx_ticket_messages_ticket_id",
    "indexdef": "CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages USING btree (ticket_id)"
  },
  {
    "schemaname": "public",
    "tablename": "ticket_messages",
    "indexname": "idx_ticket_messages_user_id",
    "indexdef": "CREATE INDEX idx_ticket_messages_user_id ON public.ticket_messages USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "indexname": "audit_logs_pkey",
    "indexdef": "CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "indexname": "idx_audit_logs_user_id",
    "indexdef": "CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id)"
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "indexname": "idx_audit_logs_entity_type",
    "indexdef": "CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs USING btree (entity_type)"
  },
  {
    "schemaname": "public",
    "tablename": "audit_logs",
    "indexname": "idx_audit_logs_created_at",
    "indexdef": "CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC)"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "indexname": "platform_announcements_pkey",
    "indexdef": "CREATE UNIQUE INDEX platform_announcements_pkey ON public.platform_announcements USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "indexname": "idx_platform_announcements_active",
    "indexdef": "CREATE INDEX idx_platform_announcements_active ON public.platform_announcements USING btree (is_active)"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "indexname": "idx_platform_announcements_target_audience",
    "indexdef": "CREATE INDEX idx_platform_announcements_target_audience ON public.platform_announcements USING btree (target_audience)"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "indexname": "idx_platform_announcements_dates",
    "indexdef": "CREATE INDEX idx_platform_announcements_dates ON public.platform_announcements USING btree (start_date, end_date)"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "indexname": "system_config_pkey",
    "indexdef": "CREATE UNIQUE INDEX system_config_pkey ON public.system_config USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "indexname": "system_config_config_key_key",
    "indexdef": "CREATE UNIQUE INDEX system_config_config_key_key ON public.system_config USING btree (config_key)"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "indexname": "idx_system_config_category",
    "indexdef": "CREATE INDEX idx_system_config_category ON public.system_config USING btree (config_category)"
  },
  {
    "schemaname": "public",
    "tablename": "system_config",
    "indexname": "idx_system_config_key",
    "indexdef": "CREATE INDEX idx_system_config_key ON public.system_config USING btree (config_key)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_pending_overdue",
    "indexdef": "CREATE INDEX idx_payments_pending_overdue ON public.payments USING btree (due_date) WHERE (status = ANY (ARRAY['pending'::text, 'overdue'::text]))"
  },
  {
    "schemaname": "public",
    "tablename": "units",
    "indexname": "idx_units_public_available",
    "indexdef": "CREATE INDEX idx_units_public_available ON public.units USING btree (listing_status) WHERE (is_public_listing = true)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_published",
    "indexdef": "CREATE INDEX idx_properties_published ON public.properties USING btree (is_published) WHERE (is_published = true)"
  },
  {
    "schemaname": "public",
    "tablename": "properties",
    "indexname": "idx_properties_city_state",
    "indexdef": "CREATE INDEX idx_properties_city_state ON public.properties USING btree (city, state)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_application_id",
    "indexdef": "CREATE INDEX idx_payments_application_id ON public.payments USING btree (application_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_payment_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_payment_id ON public.tenancy_agreements USING btree (payment_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_application_id",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_application_id ON public.tenancy_agreements USING btree (application_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "tenancies_pkey",
    "indexdef": "CREATE UNIQUE INDEX tenancies_pkey ON public.tenancies USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_property_id",
    "indexdef": "CREATE INDEX idx_tenancies_property_id ON public.tenancies USING btree (property_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_unit_id",
    "indexdef": "CREATE INDEX idx_tenancies_unit_id ON public.tenancies USING btree (unit_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_tenant_id",
    "indexdef": "CREATE INDEX idx_tenancies_tenant_id ON public.tenancies USING btree (tenant_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_landlord_id",
    "indexdef": "CREATE INDEX idx_tenancies_landlord_id ON public.tenancies USING btree (landlord_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_status",
    "indexdef": "CREATE INDEX idx_tenancies_status ON public.tenancies USING btree (status)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancies",
    "indexname": "idx_tenancies_agreement_id",
    "indexdef": "CREATE INDEX idx_tenancies_agreement_id ON public.tenancies USING btree (agreement_id)"
  },
  {
    "schemaname": "public",
    "tablename": "maintenance_requests",
    "indexname": "idx_maintenance_requests_tenancy_id",
    "indexdef": "CREATE INDEX idx_maintenance_requests_tenancy_id ON public.maintenance_requests USING btree (tenancy_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_terminated_at",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_terminated_at ON public.tenancy_agreements USING btree (terminated_at)"
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "indexname": "idx_agreement_signatures_agreement_id",
    "indexdef": "CREATE INDEX idx_agreement_signatures_agreement_id ON public.agreement_signatures USING btree (agreement_id)"
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "indexname": "idx_agreement_signatures_signer_id",
    "indexdef": "CREATE INDEX idx_agreement_signatures_signer_id ON public.agreement_signatures USING btree (signer_id)"
  },
  {
    "schemaname": "public",
    "tablename": "property_applications",
    "indexname": "idx_property_applications_withdrawal",
    "indexdef": "CREATE INDEX idx_property_applications_withdrawal ON public.property_applications USING btree (application_status, withdrawal_date) WHERE (application_status = ANY (ARRAY['withdrawn'::text, 'cancelled'::text]))"
  },
  {
    "schemaname": "public",
    "tablename": "users",
    "indexname": "idx_users_account_status",
    "indexdef": "CREATE INDEX idx_users_account_status ON public.users USING btree (account_status)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "admin_codes_pkey",
    "indexdef": "CREATE UNIQUE INDEX admin_codes_pkey ON public.admin_codes USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "admin_codes_code_key",
    "indexdef": "CREATE UNIQUE INDEX admin_codes_code_key ON public.admin_codes USING btree (code)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "idx_admin_codes_code",
    "indexdef": "CREATE INDEX idx_admin_codes_code ON public.admin_codes USING btree (code)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_audit_logs",
    "indexname": "admin_audit_logs_pkey",
    "indexdef": "CREATE UNIQUE INDEX admin_audit_logs_pkey ON public.admin_audit_logs USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "idx_admin_codes_used",
    "indexdef": "CREATE INDEX idx_admin_codes_used ON public.admin_codes USING btree (is_used)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "idx_admin_codes_expires",
    "indexdef": "CREATE INDEX idx_admin_codes_expires ON public.admin_codes USING btree (expires_at)"
  },
  {
    "schemaname": "public",
    "tablename": "admin_codes",
    "indexname": "idx_admin_codes_created_by",
    "indexdef": "CREATE INDEX idx_admin_codes_created_by ON public.admin_codes USING btree (created_by)"
  },
  {
    "schemaname": "public",
    "tablename": "profiles",
    "indexname": "profiles_pkey",
    "indexdef": "CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_tenancy_agreements_hash",
    "indexdef": "CREATE INDEX idx_tenancy_agreements_hash ON public.tenancy_agreements USING btree (agreement_hash)"
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "indexname": "agreement_signatures_pkey",
    "indexdef": "CREATE UNIQUE INDEX agreement_signatures_pkey ON public.agreement_signatures USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "indexname": "agreement_signatures_agreement_id_signer_id_key",
    "indexdef": "CREATE UNIQUE INDEX agreement_signatures_agreement_id_signer_id_key ON public.agreement_signatures USING btree (agreement_id, signer_id)"
  },
  {
    "schemaname": "public",
    "tablename": "agreement_signatures",
    "indexname": "idx_agreement_signatures_timestamp",
    "indexdef": "CREATE INDEX idx_agreement_signatures_timestamp ON public.agreement_signatures USING btree (signature_timestamp)"
  },
  {
    "schemaname": "public",
    "tablename": "invite_codes",
    "indexname": "invite_codes_pkey",
    "indexdef": "CREATE UNIQUE INDEX invite_codes_pkey ON public.invite_codes USING btree (id)"
  },
  {
    "schemaname": "public",
    "tablename": "invite_codes",
    "indexname": "invite_codes_code_key",
    "indexdef": "CREATE UNIQUE INDEX invite_codes_code_key ON public.invite_codes USING btree (code)"
  },
  {
    "schemaname": "public",
    "tablename": "payments",
    "indexname": "idx_payments_status",
    "indexdef": "CREATE INDEX idx_payments_status ON public.payments USING btree (status)"
  },
  {
    "schemaname": "public",
    "tablename": "platform_announcements",
    "indexname": "idx_platform_announcements_author_id",
    "indexdef": "CREATE INDEX idx_platform_announcements_author_id ON public.platform_announcements USING btree (author_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_agreements_property_id",
    "indexdef": "CREATE INDEX idx_agreements_property_id ON public.tenancy_agreements USING btree (property_id)"
  },
  {
    "schemaname": "public",
    "tablename": "tenancy_agreements",
    "indexname": "idx_agreements_status",
    "indexdef": "CREATE INDEX idx_agreements_status ON public.tenancy_agreements USING btree (agreement_status)"
  }
]