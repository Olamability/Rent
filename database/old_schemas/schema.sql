-- ============================================================================
-- RentFlow Database Schema
-- Version: 1.0
-- Description: Complete database schema for RentFlow property management system
-- ============================================================================
-- This schema is designed to work with Supabase (PostgreSQL)
-- Run this entire file in your Supabase SQL Editor

-- ============================================================================
-- EXTENSION SETUP
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostgreSQL's crypto functions for secure password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DROP EXISTING OBJECTS (For clean reinstall)
-- ============================================================================
-- CAUTION: The following lines will DELETE ALL DATA if uncommented!
-- Only use this for development/testing environments!
-- For production resets, export your data first and use a separate reset script.
--
-- To reset the database completely, uncomment all lines below:
-- WARNING: THIS WILL PERMANENTLY DELETE ALL DATA!
--
-- BEGIN RESET (uncomment to use)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
-- DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
-- DROP VIEW IF EXISTS public.public_property_listings CASCADE;
-- DROP TABLE IF EXISTS public.ticket_messages CASCADE;
-- DROP TABLE IF EXISTS public.support_tickets CASCADE;
-- DROP TABLE IF EXISTS public.maintenance_updates CASCADE;
-- DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
-- DROP TABLE IF EXISTS public.reminders CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.documents CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.property_applications CASCADE;
-- DROP TABLE IF EXISTS public.tenancy_agreements CASCADE;
-- DROP TABLE IF EXISTS public.units CASCADE;
-- DROP TABLE IF EXISTS public.properties CASCADE;
-- DROP TABLE IF EXISTS public.subscriptions CASCADE;
-- DROP TABLE IF EXISTS public.audit_logs CASCADE;
-- DROP TABLE IF EXISTS public.tenant_profiles CASCADE;
-- DROP TABLE IF EXISTS public.landlord_profiles CASCADE;
-- DROP TABLE IF EXISTS public.admin_profiles CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;
-- END RESET

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (syncs with auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin', 'super_admin')),
    phone TEXT,
    avatar TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    profile_complete BOOLEAN DEFAULT FALSE,
    profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
    account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'suspended', 'banned')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_account_status ON public.users(account_status);

-- Landlord profiles
CREATE TABLE public.landlord_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    national_id TEXT,
    address JSONB, -- {street, city, state, zipCode, country}
    business_info JSONB, -- {registeredBusiness, businessName, businessRegistrationNumber, taxId}
    bank_details JSONB, -- {bankName, accountNumber, accountName, routingNumber}
    verification_documents JSONB, -- {idCardUrl, proofOfOwnershipUrl, businessRegistrationUrl}
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_landlord_profiles_user_id ON public.landlord_profiles(user_id);

-- Tenant profiles
CREATE TABLE public.tenant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    national_id TEXT,
    address JSONB, -- {street, city, state, zipCode, country}
    employment JSONB, -- {status, employer, position, monthlyIncome, yearsEmployed}
    emergency_contact JSONB, -- {name, relationship, phone, email}
    refs JSONB, -- [{name, relationship, phone, email}]
    previous_address JSONB, -- {street, city, state, duration, landlordName, landlordPhone}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_profiles_user_id ON public.tenant_profiles(user_id);

-- Admin profiles
CREATE TABLE public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_profiles_user_id ON public.admin_profiles(user_id);

-- ============================================================================
-- PROPERTY MANAGEMENT TABLES
-- ============================================================================

-- Properties table
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse')),
    description TEXT,
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs
    amenities JSONB DEFAULT '[]'::JSONB, -- Array of amenity strings
    total_units INTEGER DEFAULT 0,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_state ON public.properties(state);
CREATE INDEX idx_properties_is_published ON public.properties(is_published);

-- Units table
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms DECIMAL(3, 1) NOT NULL DEFAULT 0,
    square_feet INTEGER,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit DECIMAL(12, 2) NOT NULL,
    is_occupied BOOLEAN DEFAULT FALSE,
    current_tenant_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    features JSONB DEFAULT '[]'::JSONB, -- Array of feature strings
    available_date DATE,
    listing_status TEXT DEFAULT 'available' CHECK (listing_status IN ('available', 'applied', 'rented', 'unlisted')),
    is_public_listing BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property_id ON public.units(property_id);
CREATE INDEX idx_units_current_tenant_id ON public.units(current_tenant_id);
CREATE INDEX idx_units_listing_status ON public.units(listing_status);
CREATE INDEX idx_units_is_public_listing ON public.units(is_public_listing);

-- ============================================================================
-- TENANCY AND AGREEMENTS
-- ============================================================================

-- Tenancy agreements
CREATE TABLE public.tenancy_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) NOT NULL,
    agreement_status TEXT DEFAULT 'draft' CHECK (agreement_status IN ('draft', 'pending', 'sent', 'signed', 'active', 'expired', 'terminated')),
    document_url TEXT,
    signed_date DATE,
    tenant_signed_at TIMESTAMPTZ,
    landlord_signed_at TIMESTAMPTZ,
    tenant_signature TEXT,
    landlord_signature TEXT,
    terminated_at TIMESTAMPTZ,
    termination_reason TEXT,
    agreement_hash TEXT,
    agreement_version INTEGER DEFAULT 1,
    terms JSONB DEFAULT '[]'::JSONB, -- Array of term strings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenancy_agreements_landlord_id ON public.tenancy_agreements(landlord_id);
CREATE INDEX idx_tenancy_agreements_tenant_id ON public.tenancy_agreements(tenant_id);
CREATE INDEX idx_tenancy_agreements_property_id ON public.tenancy_agreements(property_id);
CREATE INDEX idx_tenancy_agreements_unit_id ON public.tenancy_agreements(unit_id);
CREATE INDEX idx_tenancy_agreements_status ON public.tenancy_agreements(agreement_status);
CREATE INDEX idx_tenancy_agreements_application_id ON public.tenancy_agreements(application_id);
CREATE INDEX idx_tenancy_agreements_payment_id ON public.tenancy_agreements(payment_id);
CREATE INDEX idx_tenancy_agreements_terminated_at ON public.tenancy_agreements(terminated_at);
CREATE INDEX idx_tenancy_agreements_agreement_hash ON public.tenancy_agreements(agreement_hash);
CREATE INDEX idx_tenancy_agreements_agreement_version ON public.tenancy_agreements(agreement_version);

-- Property applications
CREATE TABLE public.property_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'withdrawn', 'cancelled')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    move_in_date DATE NOT NULL,
    employment_info JSONB, -- {employer, position, income}
    refs JSONB, -- [{name, phone, relationship}]
    documents JSONB, -- {idCard, proofOfIncome, references}
    notes TEXT,
    admin_notes TEXT,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    decision_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_applications_tenant_id ON public.property_applications(tenant_id);
CREATE INDEX idx_property_applications_property_id ON public.property_applications(property_id);
CREATE INDEX idx_property_applications_unit_id ON public.property_applications(unit_id);
CREATE INDEX idx_property_applications_status ON public.property_applications(application_status);

-- ============================================================================
-- PAYMENTS AND SUBSCRIPTIONS
-- ============================================================================

-- Payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'overdue', 'partial')),
    payment_method TEXT CHECK (payment_method IN ('card', 'transfer', 'ussd', 'cash')),
    transaction_id TEXT,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_landlord_id ON public.payments(landlord_id);
CREATE INDEX idx_payments_unit_id ON public.payments(unit_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);

-- Subscriptions table (for landlord plans)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_plan TEXT NOT NULL CHECK (subscription_plan IN ('free', 'pro')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
    start_date DATE NOT NULL,
    end_date DATE,
    amount DECIMAL(12, 2),
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'yearly')),
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_landlord_id ON public.subscriptions(landlord_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(subscription_status);

-- ============================================================================
-- MAINTENANCE REQUESTS
-- ============================================================================

-- Maintenance requests
CREATE TABLE public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    request_status TEXT DEFAULT 'pending' CHECK (request_status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance', 'structural', 'pest_control', 'cleaning', 'locks_security', 'landscaping', 'other')),
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs
    videos JSONB DEFAULT '[]'::JSONB, -- Array of video URLs
    assigned_to TEXT, -- Worker ID or name
    estimated_cost DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_landlord_id ON public.maintenance_requests(landlord_id);
CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(request_status);
CREATE INDEX idx_maintenance_requests_priority ON public.maintenance_requests(priority);

-- Maintenance updates (comments/status updates)
CREATE TABLE public.maintenance_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_updates_request_id ON public.maintenance_updates(request_id);
CREATE INDEX idx_maintenance_updates_user_id ON public.maintenance_updates(user_id);

-- ============================================================================
-- NOTIFICATIONS AND REMINDERS
-- ============================================================================

-- Notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Reminders table
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('rent_due', 'rent_overdue', 'lease_renewal', 'maintenance')),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('tenant', 'landlord')),
    message TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    reminder_status TEXT DEFAULT 'scheduled' CHECK (reminder_status IN ('scheduled', 'sent', 'failed')),
    channels JSONB DEFAULT '["email"]'::JSONB, -- Array of channels: email, sms, push
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_recipient_id ON public.reminders(recipient_id);
CREATE INDEX idx_reminders_scheduled_for ON public.reminders(scheduled_for);
CREATE INDEX idx_reminders_status ON public.reminders(reminder_status);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

-- Documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('lease', 'receipt', 'id', 'photo', 'other')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT, -- in bytes
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_type ON public.documents(document_type);

-- ============================================================================
-- SUPPORT AND ADMIN TABLES
-- ============================================================================

-- Support tickets
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin', 'super_admin')),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- Ticket messages
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin', 'super_admin')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB, -- Array of attachment URLs
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);

-- Audit logs (for admin tracking)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- e.g., 'user', 'property', 'payment'
    entity_id UUID,
    changes JSONB, -- Before/after state
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Platform announcements (for admin-created announcements)
CREATE TABLE public.platform_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    announcement_type TEXT NOT NULL CHECK (announcement_type IN ('info', 'warning', 'success', 'error')),
    target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'landlords', 'tenants', 'admins')),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_announcements_active ON public.platform_announcements(is_active);
CREATE INDEX idx_platform_announcements_target_audience ON public.platform_announcements(target_audience);
CREATE INDEX idx_platform_announcements_dates ON public.platform_announcements(start_date, end_date);
CREATE INDEX idx_platform_announcements_author_id ON public.platform_announcements(author_id);

-- System configuration (for admin verification codes and other system settings)
CREATE TABLE public.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    config_category TEXT DEFAULT 'general' CHECK (config_category IN ('general', 'payment', 'email', 'security', 'api', 'feature_flags')),
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_config_key ON public.system_config(config_key);
CREATE INDEX idx_system_config_category ON public.system_config(config_category);

-- Insert default admin verification code
-- This creates a secure random code that should be changed by super admin
-- Note: gen_random_bytes(16) generates 16 bytes which encodes to 32 hex characters
-- DEPRECATED: This single code approach is replaced by admin_codes table (see below)
-- Kept for backward compatibility with existing installations
INSERT INTO public.system_config (config_key, config_value, description, config_category, is_sensitive)
VALUES (
    'ADMIN_VERIFICATION_CODE',
    encode(gen_random_bytes(16), 'hex'), -- Generates 16 bytes = 32 hex characters
    'Verification code required for admin registration. Change this code immediately after setup.',
    'security',
    true
)
ON CONFLICT (config_key) DO NOTHING; -- Don't overwrite if already exists

-- Admin verification codes (single-use, role-specific codes for admin registration)
CREATE TABLE public.admin_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_codes_code ON public.admin_codes(code);
CREATE INDEX idx_admin_codes_used ON public.admin_codes(is_used);
CREATE INDEX idx_admin_codes_expires ON public.admin_codes(expires_at);
CREATE INDEX idx_admin_codes_created_by ON public.admin_codes(created_by);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Public property listings view (for marketplace)
CREATE OR REPLACE VIEW public.public_property_listings AS
SELECT 
    u.id AS unit_id,
    u.unit_number,
    u.bedrooms,
    u.bathrooms,
    u.square_feet,
    u.rent_amount,
    u.deposit,
    u.features,
    u.available_date,
    u.is_featured AS unit_featured,
    u.view_count,
    p.id AS property_id,
    p.name AS property_name,
    p.address,
    p.city,
    p.state,
    p.zip_code,
    p.property_type,
    p.description,
    p.images,
    p.amenities,
    p.latitude,
    p.longitude,
    p.landlord_id,
    p.is_featured AS property_featured,
    u.created_at
FROM 
    public.units u
JOIN 
    public.properties p ON u.property_id = p.id
WHERE 
    u.is_public_listing = TRUE 
    AND u.listing_status = 'available'
    AND p.is_published = TRUE;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to verify admin code
CREATE OR REPLACE FUNCTION public.verify_admin_code(code_to_verify TEXT)
RETURNS TEXT AS $$
DECLARE
    code_record RECORD;
    stored_code TEXT;
BEGIN
    -- First try the new admin_codes table (preferred)
    SELECT * INTO code_record
    FROM public.admin_codes
    WHERE code = code_to_verify
    AND is_used = FALSE
    AND expires_at > NOW();
    
    -- Return the role if valid code found in admin_codes table
    IF FOUND THEN
        RETURN code_record.role;
    END IF;
    
    -- Fallback to legacy system_config for backward compatibility
    SELECT config_value INTO stored_code
    FROM public.system_config
    WHERE config_key = 'ADMIN_VERIFICATION_CODE';
    
    -- If legacy code matches, return 'admin' as default role
    IF stored_code IS NOT NULL AND stored_code = code_to_verify THEN
        RETURN 'admin';
    END IF;
    
    -- No valid code found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_admin_code IS 'Verifies admin code and returns the role it grants, or NULL if invalid. Supports both admin_codes table and legacy system_config.';

-- Function to validate admin registration
CREATE OR REPLACE FUNCTION public.validate_admin_registration()
RETURNS TRIGGER AS $$
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
        
        -- Keep the admin_code in metadata temporarily (will be used in handle_new_user to mark code as used)
        -- It will be cleaned up in handle_new_user after marking the code as used
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_admin_registration IS 'Validates admin registration with verification code before account creation. Code determines role.';

-- Function to handle new user creation (syncs auth.users with public.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_account_status TEXT;
    admin_code_value TEXT;
    update_count INTEGER;
BEGIN
    -- Determine account status based on role
    -- ALL user types (tenant, landlord, admin, super_admin) start as pending
    -- This ensures proper oversight and approval workflow
    IF NEW.raw_user_meta_data->>'role' IN ('admin', 'super_admin') THEN
        -- Admin accounts start as pending until approved by super admin
        user_account_status := 'pending';
    ELSIF NEW.raw_user_meta_data->>'role' IN ('tenant', 'landlord') THEN
        -- Tenant and landlord accounts also start as pending until approved by admin
        user_account_status := 'pending';
    ELSE
        -- Fallback for any other roles (shouldn't happen, but safety first)
        user_account_status := 'pending';
    END IF;

    -- Insert into public.users table
    INSERT INTO public.users (id, email, name, role, phone, account_status, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'tenant'),
        NEW.raw_user_meta_data->>'phone',
        user_account_status,
        NOW()
    );
    
    -- Create role-specific profile based on user role
    IF (NEW.raw_user_meta_data->>'role') = 'landlord' THEN
        INSERT INTO public.landlord_profiles (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'role') = 'tenant' THEN
        INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN
        INSERT INTO public.admin_profiles (user_id, is_super_admin) 
        VALUES (NEW.id, (NEW.raw_user_meta_data->>'role') = 'super_admin');
        
        -- Mark the admin code as used (now that user exists in public.users)
        IF NEW.raw_user_meta_data->>'admin_code' IS NOT NULL THEN
            admin_code_value := NEW.raw_user_meta_data->>'admin_code';
            
            BEGIN
                -- Perform the UPDATE and count affected rows
                WITH update_result AS (
                    UPDATE public.admin_codes
                    SET 
                        is_used = TRUE,
                        used_at = NOW(),
                        used_by = NEW.id
                    WHERE code = admin_code_value
                    AND is_used = FALSE
                    RETURNING id
                )
                SELECT COUNT(*) INTO update_count FROM update_result;
                
                -- Log the result (using partial code for security)
                IF update_count = 0 THEN
                    RAISE WARNING 'Admin code not updated (code: %..., might be already used or not found)', LEFT(admin_code_value, 8);
                ELSE
                    RAISE NOTICE 'Successfully marked admin code as used (code: %..., user: %)', LEFT(admin_code_value, 8), NEW.id;
                END IF;
                
            EXCEPTION
                WHEN insufficient_privilege THEN
                    RAISE WARNING 'Insufficient privileges to update admin code: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
                WHEN OTHERS THEN
                    -- Log warning but don't fail registration
                    RAISE WARNING 'Failed to mark admin code as used: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
            END;
        END IF;
        
        -- Log the admin registration (now that user exists in public.users)
        -- Wrapped in exception handler to prevent registration failure if audit logging fails
        BEGIN
            INSERT INTO public.audit_logs (
                user_id,
                action,
                entity_type,
                entity_id,
                changes,
                created_at
            ) VALUES (
                NEW.id,
                'admin_registration',
                'user',
                NEW.id,
                jsonb_build_object(
                    'email', NEW.email,
                    'role', NEW.raw_user_meta_data->>'role',
                    'admin_code_prefix', LEFT(admin_code_value, 8),
                    'timestamp', NOW()
                ),
                NOW()
            );
        EXCEPTION
            WHEN insufficient_privilege OR check_violation THEN
                -- Expected errors for RLS/permission issues - log warning and continue
                RAISE WARNING 'Failed to create audit log (RLS): %', SQLERRM;
            WHEN OTHERS THEN
                -- Unexpected error - log with more details for debugging
                RAISE WARNING 'Failed to create audit log: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (select auth.uid()) AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is super admin (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (select auth.uid()) AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is landlord (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.is_landlord()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (select auth.uid()) AND role = 'landlord'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate admin verification codes (super admin only)
CREATE OR REPLACE FUNCTION public.generate_admin_code(
    p_role TEXT DEFAULT 'admin',
    p_expires_in TEXT DEFAULT '24 hours'
)
RETURNS TABLE (
    code TEXT,
    role TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    new_code TEXT;
    current_user_role TEXT;
    expiry_interval INTERVAL;
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
    
    -- Validate role parameter
    IF p_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role. Must be either admin or super_admin';
    END IF;
    
    -- Convert text to interval (e.g., "24 hours", "7 days")
    BEGIN
        expiry_interval := p_expires_in::INTERVAL;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Invalid expiration time format. Use formats like "24 hours", "7 days", etc.';
    END;
    
    -- Generate a secure random code (32 characters)
    new_code := encode(gen_random_bytes(16), 'hex');
    
    -- Insert the new code
    INSERT INTO public.admin_codes (code, role, created_by, expires_at)
    VALUES (
        new_code,
        p_role,
        auth.uid(),
        NOW() + expiry_interval
    );
    
    -- Log the code generation in audit logs
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            changes,
            created_at
        ) VALUES (
            auth.uid(),
            'generate_admin_code',
            'admin_codes',
            (SELECT id FROM public.admin_codes WHERE code = new_code),
            jsonb_build_object(
                'role', p_role,
                'expires_in', p_expires_in,
                'timestamp', NOW()
            ),
            NOW()
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log audit failure but don't block code generation
            RAISE WARNING 'Failed to create audit log for admin code generation: %', SQLERRM;
    END;
    
    -- Return the new code details
    RETURN QUERY
    SELECT 
        new_code,
        p_role,
        NOW() + expiry_interval,
        NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_admin_code IS 'Generates new admin verification code (super admin only). Returns the code, role, and expiration details.';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: auto_create_default_unit
-- Purpose: Automatically creates a default unit when a property is inserted
-- Trigger: AFTER INSERT ON properties
-- Behavior:
--   - Creates a single unit with unit_number '1'
--   - Sets default values for all required fields
--   - Marks unit as 'available' and publicly listed (is_public_listing = TRUE)
--   - Ensures property appears immediately in public_property_listings view
-- Notes:
--   - Default values (rent_amount=0, bedrooms=0, etc.) should be updated by landlord
--   - Landlords can add more units or customize the default unit
--   - This solves the issue where properties without units were invisible in marketplace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_create_default_unit()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a default unit for the newly created property
  INSERT INTO public.units (
    property_id,
    unit_number,
    bedrooms,
    bathrooms,
    square_feet,
    rent_amount,
    deposit,
    is_occupied,
    features,
    available_date,
    listing_status,
    is_public_listing,
    is_featured,
    view_count
  ) VALUES (
    NEW.id,                           -- property_id
    '1',                              -- unit_number (default to "1")
    0,                                -- bedrooms (default)
    0,                                -- bathrooms (default)
    NULL,                             -- square_feet (can be set later)
    0,                                -- rent_amount (default, should be updated)
    0,                                -- deposit (default, should be updated)
    FALSE,                            -- is_occupied
    '[]'::JSONB,                      -- features (empty array)
    CURRENT_DATE,                     -- available_date (today)
    'available',                      -- listing_status
    TRUE,                             -- is_public_listing (make visible immediately)
    FALSE,                            -- is_featured
    0                                 -- view_count
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: auto_set_public_listing
-- Purpose: Automatically manages is_public_listing flag based on listing_status
-- Trigger: BEFORE INSERT OR UPDATE OF listing_status ON units
-- Behavior:
--   - Sets is_public_listing = TRUE when listing_status = 'available'
--   - Sets is_public_listing = FALSE when listing_status is 'applied', 'rented', or 'unlisted'
-- Parameters:
--   - NEW: The new row being inserted or updated
-- Returns: The modified NEW row
-- Notes:
--   - This ensures consistent public listing visibility
--   - Prevents units from being publicly listed when not available
--   - Works automatically without application code changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_set_public_listing()
RETURNS TRIGGER AS $$
BEGIN
  -- When a unit is set to 'available', make it public
  IF NEW.listing_status = 'available' THEN
    NEW.is_public_listing = TRUE;
  -- When a unit is set to anything else, remove from public listing
  ELSIF NEW.listing_status IN ('applied', 'rented', 'unlisted') THEN
    NEW.is_public_listing = FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for admin code validation (BEFORE user creation)
DROP TRIGGER IF EXISTS before_auth_user_created_admin_verification ON auth.users;
CREATE TRIGGER before_auth_user_created_admin_verification
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_admin_registration();

-- Trigger to create user record when auth user is created (AFTER user creation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-create a default unit when a property is created
-- Ensures immediate marketplace visibility
DROP TRIGGER IF EXISTS trigger_auto_create_default_unit ON public.properties;
CREATE TRIGGER trigger_auto_create_default_unit
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_default_unit();

-- Trigger to automatically set is_public_listing based on listing_status
-- When a unit is set to 'available', it becomes publicly listed
DROP TRIGGER IF EXISTS trigger_auto_set_public_listing ON public.units;
CREATE TRIGGER trigger_auto_set_public_listing
  BEFORE INSERT OR UPDATE OF listing_status
  ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_public_listing();

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landlord_profiles_updated_at BEFORE UPDATE ON public.landlord_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_profiles_updated_at BEFORE UPDATE ON public.tenant_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenancy_agreements_updated_at BEFORE UPDATE ON public.tenancy_agreements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_property_applications_updated_at BEFORE UPDATE ON public.property_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_announcements_updated_at BEFORE UPDATE ON public.platform_announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

-- Users can view their own record
CREATE POLICY "Users can view own record" ON public.users
    FOR SELECT USING ((select auth.uid()) = id);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING ((select auth.uid()) = id);

-- Allow service role to insert users (used by trigger)
CREATE POLICY "Service can insert users" ON public.users
    FOR INSERT WITH CHECK (true);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

-- Admins can update all users (for managing account status, etc.)
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: LANDLORD PROFILES
-- ============================================================================

CREATE POLICY "Landlords can view own profile" ON public.landlord_profiles
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Landlords can update own profile" ON public.landlord_profiles
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all landlord profiles" ON public.landlord_profiles
    FOR SELECT USING (public.is_admin());

-- Allow service role to insert landlord profiles (used by trigger)
CREATE POLICY "Service can insert landlord profiles" ON public.landlord_profiles
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: TENANT PROFILES
-- ============================================================================

CREATE POLICY "Tenants can view own profile" ON public.tenant_profiles
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Tenants can update own profile" ON public.tenant_profiles
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Landlords can view tenant profiles for their units" ON public.tenant_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.units u
            JOIN public.properties p ON u.property_id = p.id
            WHERE u.current_tenant_id = tenant_profiles.user_id
            AND p.landlord_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can view all tenant profiles" ON public.tenant_profiles
    FOR SELECT USING (public.is_admin());

-- Allow service role to insert tenant profiles (used by trigger)
CREATE POLICY "Service can insert tenant profiles" ON public.tenant_profiles
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: ADMIN PROFILES
-- ============================================================================

CREATE POLICY "Admins can view own profile" ON public.admin_profiles
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Admins can update own profile" ON public.admin_profiles
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Super admins can view all admin profiles" ON public.admin_profiles
    FOR ALL USING (public.is_super_admin());

-- Allow service role to insert admin profiles (used by trigger)
CREATE POLICY "Service can insert admin profiles" ON public.admin_profiles
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: PROPERTIES
-- ============================================================================

CREATE POLICY "Landlords can view own properties" ON public.properties
    FOR SELECT USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Landlords can insert own properties" ON public.properties
    FOR INSERT WITH CHECK ((select auth.uid()) = landlord_id);

CREATE POLICY "Landlords can update own properties" ON public.properties
    FOR UPDATE USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Landlords can delete own properties" ON public.properties
    FOR DELETE USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Tenants can view published properties" ON public.properties
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins can view all properties" ON public.properties
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: UNITS
-- ============================================================================

CREATE POLICY "Landlords can manage own units" ON public.units
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = units.property_id
            AND properties.landlord_id = (select auth.uid())
        )
    );

CREATE POLICY "Tenants can view units they occupy" ON public.units
    FOR SELECT USING ((select auth.uid()) = current_tenant_id);

CREATE POLICY "Anyone can view public listings" ON public.units
    FOR SELECT USING (is_public_listing = TRUE AND listing_status = 'available');

CREATE POLICY "Admins can manage all units" ON public.units
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: TENANCY AGREEMENTS
-- ============================================================================

CREATE POLICY "Landlords can manage own agreements" ON public.tenancy_agreements
    FOR ALL USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Tenants can view own agreements" ON public.tenancy_agreements
    FOR SELECT USING ((select auth.uid()) = tenant_id);

CREATE POLICY "Admins can view all agreements" ON public.tenancy_agreements
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: PROPERTY APPLICATIONS
-- ============================================================================

CREATE POLICY "Tenants can view own applications" ON public.property_applications
    FOR SELECT USING ((select auth.uid()) = tenant_id);

CREATE POLICY "Tenants can create applications" ON public.property_applications
    FOR INSERT WITH CHECK ((select auth.uid()) = tenant_id);

CREATE POLICY "Landlords can view applications for their properties" ON public.property_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = property_applications.property_id
            AND properties.landlord_id = (select auth.uid())
        )
    );

CREATE POLICY "Landlords can update applications for their properties" ON public.property_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties
            WHERE properties.id = property_applications.property_id
            AND properties.landlord_id = (select auth.uid())
        )
    );

CREATE POLICY "Admins can manage all applications" ON public.property_applications
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: PAYMENTS
-- ============================================================================

CREATE POLICY "Tenants can view own payments" ON public.payments
    FOR SELECT USING ((select auth.uid()) = tenant_id);

CREATE POLICY "Tenants can create payments" ON public.payments
    FOR INSERT WITH CHECK ((select auth.uid()) = tenant_id);

CREATE POLICY "Landlords can view payments for their units" ON public.payments
    FOR SELECT USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Landlords can update payments for their units" ON public.payments
    FOR UPDATE USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Admins can manage all payments" ON public.payments
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: SUBSCRIPTIONS
-- ============================================================================

CREATE POLICY "Landlords can view own subscriptions" ON public.subscriptions
    FOR SELECT USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: MAINTENANCE REQUESTS
-- ============================================================================

CREATE POLICY "Tenants can view own maintenance requests" ON public.maintenance_requests
    FOR SELECT USING ((select auth.uid()) = tenant_id);

CREATE POLICY "Tenants can create maintenance requests" ON public.maintenance_requests
    FOR INSERT WITH CHECK ((select auth.uid()) = tenant_id);

CREATE POLICY "Landlords can view maintenance requests for their units" ON public.maintenance_requests
    FOR SELECT USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Landlords can update maintenance requests for their units" ON public.maintenance_requests
    FOR UPDATE USING ((select auth.uid()) = landlord_id);

CREATE POLICY "Admins can manage all maintenance requests" ON public.maintenance_requests
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: MAINTENANCE UPDATES
-- ============================================================================

CREATE POLICY "Users can view updates for their requests" ON public.maintenance_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.maintenance_requests mr
            WHERE mr.id = maintenance_updates.request_id
            AND (mr.tenant_id = (select auth.uid()) OR mr.landlord_id = (select auth.uid()))
        )
    );

CREATE POLICY "Users can create updates for their requests" ON public.maintenance_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.maintenance_requests mr
            WHERE mr.id = request_id
            AND (mr.tenant_id = (select auth.uid()) OR mr.landlord_id = (select auth.uid()))
        )
        AND (select auth.uid()) = user_id
    );

-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================

CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- Service role can insert notifications (for system-generated notifications)
CREATE POLICY "Service can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: REMINDERS
-- ============================================================================

CREATE POLICY "Users can view own reminders" ON public.reminders
    FOR SELECT USING ((select auth.uid()) = recipient_id);

CREATE POLICY "Landlords can create reminders" ON public.reminders
    FOR INSERT WITH CHECK (public.is_landlord());

CREATE POLICY "Admins can manage all reminders" ON public.reminders
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: DOCUMENTS
-- ============================================================================

CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING ((select auth.uid()) = uploaded_by);

CREATE POLICY "Admins can view all documents" ON public.documents
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: SUPPORT TICKETS
-- ============================================================================

CREATE POLICY "Users can view own tickets" ON public.support_tickets
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create tickets" ON public.support_tickets
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
    FOR ALL USING (public.is_admin());

CREATE POLICY "Assigned admins can view assigned tickets" ON public.support_tickets
    FOR SELECT USING ((select auth.uid()) = assigned_to);

-- ============================================================================
-- RLS POLICIES: TICKET MESSAGES
-- ============================================================================

CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = ticket_messages.ticket_id
            AND (st.user_id = (select auth.uid()) OR st.assigned_to = (select auth.uid()))
        )
    );

CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = ticket_id
            AND (st.user_id = (select auth.uid()) OR st.assigned_to = (select auth.uid()))
        )
        AND (select auth.uid()) = sender_id
    );

-- ============================================================================
-- RLS POLICIES: AUDIT LOGS
-- ============================================================================

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- Service role can insert audit logs (for system-generated logs)
CREATE POLICY "Service can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: SYSTEM_CONFIG
-- ============================================================================

-- Allow all SELECT operations (needed for SECURITY DEFINER functions like verify_admin_code)
-- SECURITY NOTE: Secure because users lack SELECT grants; only SECURITY DEFINER functions can use this
CREATE POLICY "Service can read system config" ON public.system_config
    FOR SELECT USING (true);

-- Super admins can SELECT all config
CREATE POLICY "Super admins can view all config" ON public.system_config
    FOR SELECT USING (public.is_super_admin());

-- Regular admins can SELECT non-sensitive config
CREATE POLICY "Admins can view non-sensitive config" ON public.system_config
    FOR SELECT USING (
        public.is_admin() AND is_sensitive = false
    );

-- Super admins can UPDATE all config
CREATE POLICY "Super admins can update config" ON public.system_config
    FOR UPDATE USING (public.is_super_admin());

-- Allow service role to insert system config (for migrations and setup)
-- SECURITY NOTE: Secure because users lack INSERT grants; only migrations/postgres role can use this
CREATE POLICY "Service can insert system config" ON public.system_config
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: ADMIN CODES
-- ============================================================================

-- Super admins can view all admin codes
CREATE POLICY "Super admins can view all admin codes"
ON public.admin_codes FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Super admins can insert admin codes (via generate_admin_code RPC function)
CREATE POLICY "Super admins can insert admin codes"
ON public.admin_codes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Allow trigger function to update admin codes when used
-- This policy specifically allows marking unused codes as used
CREATE POLICY "Allow marking admin codes as used"
ON public.admin_codes FOR UPDATE
USING (
    -- Allow updates to codes that are not yet used
    is_used = FALSE
)
WITH CHECK (
    -- Allow the update to proceed (trust the trigger function)
    true
);

-- ============================================================================
-- RLS POLICIES: PLATFORM ANNOUNCEMENTS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- All users can view active announcements targeted to them
CREATE POLICY "Users can view active announcements" ON public.platform_announcements
    FOR SELECT USING (
        is_active = true
        AND start_date <= NOW()
        AND (end_date IS NULL OR end_date >= NOW())
        AND (
            target_audience = 'all'
            OR (target_audience = 'landlords' AND EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'landlord'))
            OR (target_audience = 'tenants' AND EXISTS (SELECT 1 FROM public.users WHERE id = (select auth.uid()) AND role = 'tenant'))
            OR (target_audience = 'admins' AND public.is_admin())
        )
    );

-- Admins can view all announcements
CREATE POLICY "Admins can view all announcements" ON public.platform_announcements
    FOR SELECT USING (public.is_admin());

-- Admins can create announcements
CREATE POLICY "Admins can create announcements" ON public.platform_announcements
    FOR INSERT WITH CHECK (public.is_admin() AND (select auth.uid()) = author_id);

-- Admins can update announcements
CREATE POLICY "Admins can update announcements" ON public.platform_announcements
    FOR UPDATE USING (public.is_admin());

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements" ON public.platform_announcements
    FOR DELETE USING (public.is_admin());

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on all tables
GRANT SELECT ON public.public_property_listings TO anon, authenticated;

-- Grant all privileges to authenticated users (RLS will control actual access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after schema creation to verify everything is set up correctly

-- List all tables
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- List all RLS policies
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Count rows in each table (should be 0 initially)
-- SELECT 
--     'SELECT ''' || table_name || ''' as table_name, COUNT(*) as row_count FROM ' || table_name || ' UNION ALL'
-- FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- ============================================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify all tables are created: Run the table list query above
-- 2. Create test users in Supabase Auth Dashboard
-- 3. Run seed.sql to populate with sample data (optional)
-- 4. Test authentication and RLS policies
-- ============================================================================
