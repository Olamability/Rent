-- ============================================================================
-- RentFlow Database Schema - Clean Version
-- Version: 2.0
-- Description: Comprehensive database schema for RentFlow property management
-- Generated: 2026-01-06
-- ============================================================================
-- This schema is designed for Supabase (PostgreSQL)
-- Run this entire file in your Supabase SQL Editor
--
-- IMPORTANT: This will DROP ALL existing tables and data!
-- Make sure to backup your data before running this script
-- ============================================================================

-- ============================================================================
-- CLEANUP: Drop all existing objects
-- ============================================================================

-- Drop triggers first (they depend on functions)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS before_auth_user_created_admin_verification ON auth.users CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_create_default_unit ON public.properties CASCADE;
DROP TRIGGER IF EXISTS trigger_auto_set_public_listing ON public.units CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.validate_admin_registration() CASCADE;
DROP FUNCTION IF EXISTS public.verify_admin_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.public_property_listings CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.maintenance_updates CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.reminders CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.property_applications CASCADE;
DROP TABLE IF EXISTS public.tenancy_agreements CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.platform_announcements CASCADE;
DROP TABLE IF EXISTS public.admin_codes CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.tenant_profiles CASCADE;
DROP TABLE IF EXISTS public.landlord_profiles CASCADE;
DROP TABLE IF EXISTS public.admin_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Main users table (syncs with auth.users)
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

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_account_status ON public.users(account_status);
CREATE INDEX idx_users_created_at ON public.users(created_at DESC);

-- Tenant profiles (extended information)
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
    refs JSONB, -- Array of references
    previous_address JSONB, -- Previous rental information
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_profiles_user_id ON public.tenant_profiles(user_id);

-- Landlord profiles (extended information)
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
CREATE INDEX idx_landlord_profiles_subscription ON public.landlord_profiles(subscription_plan, subscription_status);

-- Admin profiles (extended information)
CREATE TABLE public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    first_name TEXT,
    last_name TEXT,
    department TEXT,
    is_super_admin BOOLEAN DEFAULT FALSE,
    permissions JSONB, -- Array of permissions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_profiles_user_id ON public.admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_super_admin ON public.admin_profiles(is_super_admin);

-- ============================================================================
-- PROPERTY MANAGEMENT TABLES
-- ============================================================================

-- Properties (owned by landlords)
CREATE TABLE public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse', 'commercial', 'other')),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT DEFAULT 'Nigeria',
    description TEXT,
    year_built INTEGER,
    total_units INTEGER DEFAULT 1,
    images JSONB DEFAULT '[]'::JSONB, -- Array of image URLs
    amenities JSONB DEFAULT '[]'::JSONB, -- Array of amenities
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_published BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX idx_properties_published ON public.properties(is_published);
CREATE INDEX idx_properties_featured ON public.properties(is_featured);
CREATE INDEX idx_properties_city ON public.properties(city);
CREATE INDEX idx_properties_type ON public.properties(property_type);
CREATE INDEX idx_properties_location ON public.properties(latitude, longitude);

-- Units (rental units within properties)
CREATE TABLE public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    bedrooms INTEGER DEFAULT 0,
    bathrooms DECIMAL(3, 1) DEFAULT 0,
    square_feet INTEGER,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit DECIMAL(12, 2),
    features JSONB DEFAULT '[]'::JSONB, -- Array of features
    available_date DATE,
    listing_status TEXT DEFAULT 'unlisted' CHECK (listing_status IN ('available', 'applied', 'rented', 'unlisted')),
    is_public_listing BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, unit_number)
);

CREATE INDEX idx_units_property_id ON public.units(property_id);
CREATE INDEX idx_units_listing_status ON public.units(listing_status);
CREATE INDEX idx_units_public_listing ON public.units(is_public_listing);
CREATE INDEX idx_units_available_date ON public.units(available_date);
CREATE INDEX idx_units_rent_amount ON public.units(rent_amount);

-- ============================================================================
-- TENANCY AND APPLICATION TABLES
-- ============================================================================

-- Property applications (tenant applications for units)
CREATE TABLE public.property_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_status TEXT DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'withdrawn')),
    move_in_date DATE,
    message TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_property_applications_unit_id ON public.property_applications(unit_id);
CREATE INDEX idx_property_applications_tenant_id ON public.property_applications(tenant_id);
CREATE INDEX idx_property_applications_landlord_id ON public.property_applications(landlord_id);
CREATE INDEX idx_property_applications_status ON public.property_applications(application_status);

-- Tenancy agreements (active and historic leases)
CREATE TABLE public.tenancy_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2),
    payment_due_day INTEGER DEFAULT 1 CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
    agreement_status TEXT DEFAULT 'draft' CHECK (agreement_status IN ('draft', 'active', 'expired', 'terminated', 'renewed')),
    agreement_terms TEXT,
    document_url TEXT,
    tenant_signature TEXT,
    landlord_signature TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenancy_agreements_unit_id ON public.tenancy_agreements(unit_id);
CREATE INDEX idx_tenancy_agreements_tenant_id ON public.tenancy_agreements(tenant_id);
CREATE INDEX idx_tenancy_agreements_landlord_id ON public.tenancy_agreements(landlord_id);
CREATE INDEX idx_tenancy_agreements_application_id ON public.tenancy_agreements(application_id);
CREATE INDEX idx_tenancy_agreements_status ON public.tenancy_agreements(agreement_status);
CREATE INDEX idx_tenancy_agreements_dates ON public.tenancy_agreements(start_date, end_date);

-- ============================================================================
-- PAYMENT TABLES
-- ============================================================================

-- Payments (rent payments and other transactions)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    landlord_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    agreement_id UUID REFERENCES public.tenancy_agreements(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('rent', 'deposit', 'maintenance', 'late_fee', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT CHECK (payment_method IN ('card', 'transfer', 'cash', 'check', 'other')),
    transaction_id TEXT UNIQUE,
    due_date DATE,
    paid_at TIMESTAMPTZ,
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX idx_payments_landlord_id ON public.payments(landlord_id);
CREATE INDEX idx_payments_unit_id ON public.payments(unit_id);
CREATE INDEX idx_payments_agreement_id ON public.payments(agreement_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_due_date ON public.payments(due_date);
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);

-- Subscriptions (landlord subscription plans)
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
-- MAINTENANCE TABLES
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
    images JSONB DEFAULT '[]'::JSONB,
    videos JSONB DEFAULT '[]'::JSONB,
    assigned_to TEXT,
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
CREATE INDEX idx_maintenance_requests_category ON public.maintenance_requests(category);

-- Maintenance updates (status updates and comments)
CREATE TABLE public.maintenance_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    images JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_updates_request_id ON public.maintenance_updates(request_id);
CREATE INDEX idx_maintenance_updates_user_id ON public.maintenance_updates(user_id);

-- ============================================================================
-- NOTIFICATION AND REMINDER TABLES
-- ============================================================================

-- Notifications
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

-- Reminders
CREATE TABLE public.reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('rent_due', 'rent_overdue', 'lease_renewal', 'maintenance')),
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('tenant', 'landlord')),
    message TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    reminder_status TEXT DEFAULT 'scheduled' CHECK (reminder_status IN ('scheduled', 'sent', 'failed')),
    channels JSONB DEFAULT '["email"]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_recipient_id ON public.reminders(recipient_id);
CREATE INDEX idx_reminders_scheduled_for ON public.reminders(scheduled_for);
CREATE INDEX idx_reminders_status ON public.reminders(reminder_status);

-- ============================================================================
-- DOCUMENT TABLES
-- ============================================================================

-- Documents
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('lease', 'receipt', 'id', 'photo', 'other')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
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
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);

-- Ticket messages
CREATE TABLE public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL CHECK (user_role IN ('tenant', 'landlord', 'admin', 'super_admin')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_sender_id ON public.ticket_messages(sender_id);

-- Audit logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Platform announcements
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

-- ============================================================================
-- SYSTEM CONFIGURATION TABLES
-- ============================================================================

-- System configuration
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

-- Admin verification codes (for admin/super_admin registration)
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

-- Insert default admin verification code
INSERT INTO public.system_config (config_key, config_value, description, config_category, is_sensitive)
VALUES (
    'ADMIN_VERIFICATION_CODE',
    encode(gen_random_bytes(16), 'hex'),
    'Verification code required for admin registration. Change this code immediately after setup.',
    'security',
    true
)
ON CONFLICT (config_key) DO NOTHING;

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

-- Helper function to check if user is admin or super_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
        AND account_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'super_admin'
        AND account_status = 'approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify admin code
CREATE OR REPLACE FUNCTION public.verify_admin_code(code_to_verify TEXT)
RETURNS TEXT AS $$
DECLARE
    code_record RECORD;
    stored_code TEXT;
BEGIN
    -- Try admin_codes table first (preferred)
    SELECT * INTO code_record
    FROM public.admin_codes
    WHERE code = code_to_verify
    AND is_used = FALSE
    AND expires_at > NOW();
    
    IF FOUND THEN
        RETURN code_record.role;
    END IF;
    
    -- Fallback to system_config for backward compatibility
    SELECT config_value INTO stored_code
    FROM public.system_config
    WHERE config_key = 'ADMIN_VERIFICATION_CODE';
    
    IF stored_code IS NOT NULL AND stored_code = code_to_verify THEN
        RETURN 'admin';
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate admin registration
CREATE OR REPLACE FUNCTION public.validate_admin_registration()
RETURNS TRIGGER AS $$
DECLARE
    verified_role TEXT;
    admin_code_value TEXT;
BEGIN
    -- Check if admin_code was provided in metadata
    IF NEW.raw_user_meta_data->>'admin_code' IS NOT NULL THEN
        IF NEW.raw_user_meta_data->>'admin_code' = '' THEN
            RAISE EXCEPTION 'Admin verification code is required for admin registration';
        END IF;
        
        admin_code_value := NEW.raw_user_meta_data->>'admin_code';
        verified_role := public.verify_admin_code(admin_code_value);
        
        IF verified_role IS NULL THEN
            RAISE EXCEPTION 'Invalid admin verification code';
        END IF;
        
        -- Override role with the one from the code
        NEW.raw_user_meta_data := jsonb_set(
            NEW.raw_user_meta_data,
            '{role}',
            to_jsonb(verified_role)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_account_status TEXT;
    admin_code_value TEXT;
BEGIN
    -- All users start as pending (requires admin approval)
    user_account_status := 'pending';

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
    
    -- Create role-specific profile
    IF (NEW.raw_user_meta_data->>'role') = 'landlord' THEN
        INSERT INTO public.landlord_profiles (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'role') = 'tenant' THEN
        INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id);
    ELSIF (NEW.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN
        INSERT INTO public.admin_profiles (user_id, is_super_admin) 
        VALUES (NEW.id, (NEW.raw_user_meta_data->>'role') = 'super_admin');
        
        -- Mark admin code as used if provided
        admin_code_value := NEW.raw_user_meta_data->>'admin_code';
        IF admin_code_value IS NOT NULL AND admin_code_value != '' THEN
            UPDATE public.admin_codes
            SET is_used = TRUE, used_by = NEW.id, used_at = NOW()
            WHERE code = admin_code_value AND is_used = FALSE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
    
    -- Generate a secure random code (16 bytes = 32 hex characters)
    new_code := encode(gen_random_bytes(16), 'hex');
    
    -- Insert the new code
    INSERT INTO public.admin_codes (code, role, created_by, expires_at)
    VALUES (
        new_code,
        p_role,
        auth.uid(),
        NOW() + expiry_interval
    );
    
    -- Log the code generation in audit logs (if audit_logs table exists)
    -- Note: Audit log failures are non-critical for code generation
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
            -- This is non-critical: code generation is the primary operation
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger for admin verification before user creation
CREATE TRIGGER before_auth_user_created_admin_verification
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.validate_admin_registration();

-- Trigger for user creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

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

-- ============================================================================
-- Automatic marketplace visibility triggers
-- ============================================================================

-- Function to automatically set is_public_listing based on listing_status
CREATE OR REPLACE FUNCTION public.update_unit_public_listing()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_public_listing based on listing_status
    -- A unit should be publicly listed ONLY when status is 'available'
    -- Code uses: 'available', 'applied', 'rented', 'unlisted'
    IF NEW.listing_status = 'available' THEN
        NEW.is_public_listing := TRUE;
    ELSE
        -- For 'applied', 'rented', or 'unlisted' status
        -- the unit should not be publicly listed
        NEW.is_public_listing := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_unit_public_listing() IS 
'Automatically sets is_public_listing flag based on listing_status. Units with status "available" are made public, all others (applied, rented, unlisted) are not publicly listed.';

-- Trigger to update is_public_listing before insert or update
CREATE TRIGGER trigger_update_unit_public_listing
    BEFORE INSERT OR UPDATE OF listing_status
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_unit_public_listing();

-- Function to automatically publish/unpublish properties based on available units
CREATE OR REPLACE FUNCTION public.update_property_published()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set is_published on the parent property
    -- A property should be published when it has at least one marketplace unit
    -- (available, applied, or rented status)
    IF EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = NEW.property_id
        AND listing_status IN ('available', 'applied', 'rented')
        LIMIT 1
    ) THEN
        -- Property has marketplace units, ensure it's published
        UPDATE public.properties
        SET is_published = TRUE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = FALSE;
    ELSE
        -- No marketplace units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = NEW.property_id
        AND is_published = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_property_published() IS 
'Automatically publishes properties when they have marketplace units (available, applied, or rented) and unpublishes when they have none.';

-- Trigger to update property published status after unit insert or update
CREATE TRIGGER trigger_update_property_published
    AFTER INSERT OR UPDATE OF listing_status
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_published();

-- Function to handle property publishing when units are deleted
CREATE OR REPLACE FUNCTION public.update_property_published_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- When a unit is deleted, check if the property still has marketplace units
    IF NOT EXISTS (
        SELECT 1 FROM public.units
        WHERE property_id = OLD.property_id
        AND listing_status IN ('available', 'applied', 'rented')
        AND id != OLD.id
        LIMIT 1
    ) THEN
        -- No more marketplace units, unpublish the property
        UPDATE public.properties
        SET is_published = FALSE,
            updated_at = NOW()
        WHERE id = OLD.property_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update property published status after unit deletion
CREATE TRIGGER trigger_update_property_published_on_delete
    AFTER DELETE
    ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION public.update_property_published_on_delete();

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
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenancy_agreements ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: USERS
-- ============================================================================

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update user status" ON public.users
    FOR UPDATE USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: TENANT PROFILES
-- ============================================================================

CREATE POLICY "Tenants can view their own profile" ON public.tenant_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Tenants can insert their own profile" ON public.tenant_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Tenants can update their own profile" ON public.tenant_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Landlords can view tenant profiles for their properties" ON public.tenant_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tenancy_agreements ta
            WHERE ta.tenant_id = tenant_profiles.user_id
            AND ta.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all tenant profiles" ON public.tenant_profiles
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: LANDLORD PROFILES
-- ============================================================================

CREATE POLICY "Landlords can view their own profile" ON public.landlord_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Landlords can insert their own profile" ON public.landlord_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Landlords can update their own profile" ON public.landlord_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all landlord profiles" ON public.landlord_profiles
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: ADMIN PROFILES
-- ============================================================================

CREATE POLICY "Admins can view their own profile" ON public.admin_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can insert their own profile" ON public.admin_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update their own profile" ON public.admin_profiles
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all admin profiles" ON public.admin_profiles
    FOR SELECT USING (public.is_super_admin());

-- ============================================================================
-- RLS POLICIES: PROPERTIES
-- ============================================================================

CREATE POLICY "Landlords can view their own properties" ON public.properties
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can insert their own properties" ON public.properties
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update their own properties" ON public.properties
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can delete their own properties" ON public.properties
    FOR DELETE USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all properties" ON public.properties
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all properties" ON public.properties
    FOR ALL USING (public.is_admin());

-- Allow anyone (including tenants and unauthenticated users) to view published properties
-- This is necessary for the property search and details pages to work
CREATE POLICY "Anyone can view published properties" ON public.properties
    FOR SELECT USING (is_published = TRUE);

-- ============================================================================
-- RLS POLICIES: UNITS
-- ============================================================================

CREATE POLICY "Landlords can view their own units" ON public.units
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = units.property_id
            AND p.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can insert units for their properties" ON public.units
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = property_id
            AND p.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can update their own units" ON public.units
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = units.property_id
            AND p.landlord_id = auth.uid()
        )
    );

CREATE POLICY "Landlords can delete their own units" ON public.units
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = units.property_id
            AND p.landlord_id = auth.uid()
        )
    );

-- Allow tenants to view units in the marketplace (available, applied, rented)
-- This ensures tenants can see the full marketplace with proper status indicators
CREATE POLICY "Tenants can view marketplace listings" ON public.units
    FOR SELECT USING (listing_status IN ('available', 'applied', 'rented'));

CREATE POLICY "Tenants can view their rented units" ON public.units
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tenancy_agreements ta
            WHERE ta.unit_id = units.id
            AND ta.tenant_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all units" ON public.units
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all units" ON public.units
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: PROPERTY APPLICATIONS
-- ============================================================================

CREATE POLICY "Tenants can view their own applications" ON public.property_applications
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can create applications" ON public.property_applications
    FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update their own applications" ON public.property_applications
    FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can view applications for their units" ON public.property_applications
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can update applications for their units" ON public.property_applications
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all applications" ON public.property_applications
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: TENANCY AGREEMENTS
-- ============================================================================

CREATE POLICY "Tenants can view their own agreements" ON public.tenancy_agreements
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can view their agreements" ON public.tenancy_agreements
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can create agreements" ON public.tenancy_agreements
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords can update their agreements" ON public.tenancy_agreements
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all agreements" ON public.tenancy_agreements
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: PAYMENTS
-- ============================================================================

CREATE POLICY "Tenants can view their own payments" ON public.payments
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can create their own payments" ON public.payments
    FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Landlords can view their payments" ON public.payments
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all payments" ON public.payments
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: SUBSCRIPTIONS
-- ============================================================================

CREATE POLICY "Landlords can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can create their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
    FOR ALL USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: MAINTENANCE REQUESTS
-- ============================================================================

CREATE POLICY "Tenants can view their own maintenance requests" ON public.maintenance_requests
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can create maintenance requests" ON public.maintenance_requests
    FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can update their own maintenance requests" ON public.maintenance_requests
    FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY "Landlords can view maintenance requests for their units" ON public.maintenance_requests
    FOR SELECT USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can update maintenance requests for their units" ON public.maintenance_requests
    FOR UPDATE USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all maintenance requests" ON public.maintenance_requests
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: MAINTENANCE UPDATES
-- ============================================================================

CREATE POLICY "Users can view updates for their requests" ON public.maintenance_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.maintenance_requests mr
            WHERE mr.id = maintenance_updates.request_id
            AND (mr.tenant_id = auth.uid() OR mr.landlord_id = auth.uid())
        )
    );

CREATE POLICY "Users can create updates for their requests" ON public.maintenance_updates
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.maintenance_requests mr
            WHERE mr.id = request_id
            AND (mr.tenant_id = auth.uid() OR mr.landlord_id = auth.uid())
        )
        AND user_id = auth.uid()
    );

-- ============================================================================
-- RLS POLICIES: NOTIFICATIONS
-- ============================================================================

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: REMINDERS
-- ============================================================================

CREATE POLICY "Users can view their own reminders" ON public.reminders
    FOR SELECT USING (recipient_id = auth.uid());

CREATE POLICY "System can create reminders" ON public.reminders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update reminders" ON public.reminders
    FOR UPDATE USING (true);

-- ============================================================================
-- RLS POLICIES: DOCUMENTS
-- ============================================================================

CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Users can create their own documents" ON public.documents
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can view all documents" ON public.documents
    FOR SELECT USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: SUPPORT TICKETS
-- ============================================================================

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tickets" ON public.support_tickets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets" ON public.support_tickets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON public.support_tickets
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
    FOR ALL USING (public.is_admin());

CREATE POLICY "Assigned admins can view assigned tickets" ON public.support_tickets
    FOR SELECT USING (auth.uid() = assigned_to);

-- ============================================================================
-- RLS POLICIES: TICKET MESSAGES
-- ============================================================================

CREATE POLICY "Users can view messages for their tickets" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = ticket_messages.ticket_id
            AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can create messages for their tickets" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.support_tickets st
            WHERE st.id = ticket_id
            AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid())
        )
        AND sender_id = auth.uid()
    );

-- ============================================================================
-- RLS POLICIES: AUDIT LOGS
-- ============================================================================

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: PLATFORM ANNOUNCEMENTS
-- ============================================================================

CREATE POLICY "Users can view active announcements" ON public.platform_announcements
    FOR SELECT USING (
        is_active = true
        AND start_date <= NOW()
        AND (end_date IS NULL OR end_date >= NOW())
        AND (
            target_audience = 'all'
            OR (target_audience = 'landlords' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'landlord'))
            OR (target_audience = 'tenants' AND EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'tenant'))
            OR (target_audience = 'admins' AND public.is_admin())
        )
    );

CREATE POLICY "Admins can view all announcements" ON public.platform_announcements
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can create announcements" ON public.platform_announcements
    FOR INSERT WITH CHECK (public.is_admin() AND auth.uid() = author_id);

CREATE POLICY "Admins can update announcements" ON public.platform_announcements
    FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete announcements" ON public.platform_announcements
    FOR DELETE USING (public.is_admin());

-- ============================================================================
-- RLS POLICIES: SYSTEM CONFIG
-- ============================================================================

CREATE POLICY "Service can read system config" ON public.system_config
    FOR SELECT USING (true);

CREATE POLICY "Super admins can view all config" ON public.system_config
    FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Admins can view non-sensitive config" ON public.system_config
    FOR SELECT USING (public.is_admin() AND is_sensitive = false);

CREATE POLICY "Super admins can update config" ON public.system_config
    FOR UPDATE USING (public.is_super_admin());

CREATE POLICY "Service can insert system config" ON public.system_config
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES: ADMIN CODES
-- ============================================================================

CREATE POLICY "Super admins can view all admin codes" ON public.admin_codes
    FOR SELECT USING (public.is_super_admin());

CREATE POLICY "Super admins can insert admin codes" ON public.admin_codes
    FOR INSERT WITH CHECK (public.is_super_admin() AND created_by = auth.uid());

CREATE POLICY "Allow marking admin codes as used" ON public.admin_codes
    FOR UPDATE USING (is_used = FALSE)
    WITH CHECK (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.public_property_listings TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================================
-- ✅ All tables created with proper relationships
-- ✅ All indexes created for performance
-- ✅ All triggers and functions set up
-- ✅ Row Level Security enabled on all tables
-- ✅ Comprehensive RLS policies applied
-- ✅ Ready for use with RentFlow application
-- 
-- Next steps:
-- 1. Verify tables: SELECT table_name FROM information_schema.tables 
--    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
-- 2. Create test users in Supabase Auth
-- 3. Test the application
-- ============================================================================
