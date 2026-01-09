-- ============================================================================
-- RentFlow Database Performance Optimization - Missing Indexes
-- ============================================================================
-- This script adds missing indexes to improve query performance
-- Focus areas:
-- 1. Foreign key columns without indexes
-- 2. Columns used in RLS policies
-- 3. Frequently queried/filtered columns
-- ============================================================================

-- ============================================================================
-- SECTION 1: Foreign Key Indexes
-- ============================================================================
-- All foreign keys should have indexes to improve JOIN performance
-- and prevent lock contention during CASCADE operations

-- Payments table
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_id ON public.payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_payments_unit_id ON public.payments(unit_id);
CREATE INDEX IF NOT EXISTS idx_payments_property_id ON public.payments(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenancy_id ON public.payments(tenancy_id);

-- Property Applications table
CREATE INDEX IF NOT EXISTS idx_property_applications_tenant_id ON public.property_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_landlord_id ON public.property_applications(landlord_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_property_id ON public.property_applications(property_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_unit_id ON public.property_applications(unit_id);

-- Units table
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_landlord_id ON public.units(landlord_id);

-- Properties table
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);

-- Tenancy Agreements table
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_tenant_id ON public.tenancy_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_landlord_id ON public.tenancy_agreements(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_unit_id ON public.tenancy_agreements(unit_id);

-- Documents table - related_entity_id is used for polymorphic relations
CREATE INDEX IF NOT EXISTS idx_documents_related_entity_id ON public.documents(related_entity_id);

-- ============================================================================
-- SECTION 2: RLS Policy Support Indexes
-- ============================================================================
-- Add indexes to columns used in RLS policy USING clauses
-- This significantly improves RLS performance

-- Users table - auth.uid() lookups
-- Already indexed as PRIMARY KEY (id)

-- Landlord profiles - user_id lookups
-- Already indexed as UNIQUE (user_id)

-- Tenant profiles - user_id lookups  
-- Already indexed as UNIQUE (user_id)

-- Properties - landlord filtering
-- Already has idx_properties_landlord_id

-- Units - landlord and status filtering
CREATE INDEX IF NOT EXISTS idx_units_landlord_listing_status ON public.units(landlord_id, listing_status);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units(listing_status);

-- Payments - tenant and landlord filtering with status
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON public.payments(tenant_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_landlord_status ON public.payments(landlord_id, payment_status);

-- Property applications - tenant and landlord filtering with status
CREATE INDEX IF NOT EXISTS idx_property_applications_tenant_status ON public.property_applications(tenant_id, application_status);
CREATE INDEX IF NOT EXISTS idx_property_applications_landlord_status ON public.property_applications(landlord_id, application_status);

-- Tenancy agreements - tenant and landlord filtering
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_tenant_status ON public.tenancy_agreements(tenant_id, agreement_status);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_landlord_status ON public.tenancy_agreements(landlord_id, agreement_status);

-- ============================================================================
-- SECTION 3: Query Performance Indexes
-- ============================================================================
-- Add indexes for frequently filtered/sorted columns

-- Payments - due date filtering for overdue detection
-- Already exists: idx_payments_pending_overdue

-- Payments - transaction reference lookups
CREATE INDEX IF NOT EXISTS idx_payments_transaction_reference ON public.payments(transaction_reference) WHERE transaction_reference IS NOT NULL;

-- Tenancy agreements - date range queries
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_dates ON public.tenancy_agreements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_active ON public.tenancy_agreements(agreement_status) WHERE agreement_status = 'active';

-- Property applications - created_at for sorting recent applications
CREATE INDEX IF NOT EXISTS idx_property_applications_created_at ON public.property_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_applications_status ON public.property_applications(application_status);

-- Units - composite index for public marketplace queries
-- Already exists: idx_units_public_available

-- Maintenance requests - composite for landlord dashboard
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_landlord_status_priority ON public.maintenance_requests(landlord_id, request_status, priority);

-- Notifications - composite for user notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON public.notifications(user_id, is_read, created_at DESC);

-- Support tickets - assigned admin lookups
-- Already exists: idx_support_tickets_assigned_to

-- Documents - owner and type filtering
CREATE INDEX IF NOT EXISTS idx_documents_owner_type ON public.documents(owner_id, document_type);

-- ============================================================================
-- SECTION 4: Full-Text Search Indexes (if needed)
-- ============================================================================
-- Add GIN indexes for text search on properties

-- Properties - text search on name and description
CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON public.properties USING gin(property_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_search ON public.properties USING gin(to_tsvector('english', coalesce(property_name, '') || ' ' || coalesce(description, '')));

-- Units - text search on unit_number and description  
CREATE INDEX IF NOT EXISTS idx_units_search ON public.units USING gin(to_tsvector('english', coalesce(unit_number, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- SECTION 5: Partial Indexes for Common Filters
-- ============================================================================
-- Partial indexes save space and improve performance for specific queries

-- Active tenancies only
CREATE INDEX IF NOT EXISTS idx_tenancies_active ON public.tenancies(tenant_id, landlord_id) WHERE status = 'active';

-- Pending user approvals
CREATE INDEX IF NOT EXISTS idx_users_pending_approval ON public.users(account_status, role, created_at) WHERE account_status = 'pending';

-- Open maintenance requests
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_open ON public.maintenance_requests(landlord_id, priority, created_at) WHERE request_status IN ('pending', 'in_progress');

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;

-- Available units for listings
-- Already exists: idx_units_public_available

-- Active platform announcements
CREATE INDEX IF NOT EXISTS idx_platform_announcements_active_dates ON public.platform_announcements(target_audience, start_date, end_date) WHERE is_active = true;

-- ============================================================================
-- SECTION 6: Index Analysis and Recommendations
-- ============================================================================

-- View to check index usage statistics
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- View to find missing indexes on foreign keys
CREATE OR REPLACE VIEW public.missing_fk_indexes AS
SELECT
    c.conrelid::regclass AS table_name,
    string_agg(a.attname, ', ') AS columns,
    c.confrelid::regclass AS referenced_table
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
LEFT JOIN pg_index i ON i.indrelid = c.conrelid 
    AND a.attnum = ANY(i.indkey)
    AND i.indisunique = false
WHERE c.contype = 'f'
    AND c.connamespace = 'public'::regnamespace
    AND i.indexrelid IS NULL
GROUP BY c.conrelid, c.confrelid, c.conname;

-- Performance analysis function
CREATE OR REPLACE FUNCTION public.analyze_index_performance()
RETURNS TABLE(
    table_name text,
    index_name text,
    index_size text,
    scans bigint,
    tuples_read bigint,
    tuples_fetched bigint,
    recommendation text
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.tablename::text,
        i.indexname::text,
        pg_size_pretty(pg_relation_size(i.indexrelid)),
        i.idx_scan,
        i.idx_tup_read,
        i.idx_tup_fetch,
        CASE 
            WHEN i.idx_scan = 0 THEN 'UNUSED - Consider dropping'
            WHEN i.idx_scan < 100 AND pg_relation_size(i.indexrelid) > 1000000 THEN 'Low usage, large size - Review'
            WHEN i.idx_scan > 10000 THEN 'Heavily used - Keep'
            ELSE 'Normal usage'
        END::text
    FROM pg_stat_user_indexes i
    WHERE i.schemaname = 'public'
    ORDER BY 
        CASE 
            WHEN i.idx_scan = 0 THEN 0
            WHEN i.idx_scan < 100 THEN 1
            ELSE 2
        END,
        pg_relation_size(i.indexrelid) DESC;
END;
$$;

-- ============================================================================
-- Index Maintenance
-- ============================================================================

-- Analyze all tables to update statistics
ANALYZE public.users;
ANALYZE public.landlord_profiles;
ANALYZE public.tenant_profiles;
ANALYZE public.admin_profiles;
ANALYZE public.properties;
ANALYZE public.units;
ANALYZE public.property_applications;
ANALYZE public.payments;
ANALYZE public.tenancy_agreements;
ANALYZE public.tenancies;
ANALYZE public.maintenance_requests;
ANALYZE public.maintenance_updates;
ANALYZE public.notifications;
ANALYZE public.documents;
ANALYZE public.support_tickets;
ANALYZE public.audit_logs;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    index_count INT;
    missing_fks INT;
BEGIN
    -- Count total indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    -- Count missing FK indexes
    SELECT COUNT(*) INTO missing_fks
    FROM public.missing_fk_indexes;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Index Optimization Summary ===';
    RAISE NOTICE 'Total indexes in public schema: %', index_count;
    RAISE NOTICE 'Missing FK indexes: %', missing_fks;
    
    IF missing_fks = 0 THEN
        RAISE NOTICE '✅ All foreign keys are properly indexed!';
    ELSE
        RAISE WARNING '⚠️  % foreign keys still need indexes', missing_fks;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Run SELECT * FROM public.index_usage_stats; to analyze index usage';
    RAISE NOTICE 'Run SELECT * FROM public.analyze_index_performance(); for recommendations';
END $$;

-- ============================================================================
-- End of Performance Optimization Script
-- ============================================================================
