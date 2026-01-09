-- ============================================================================
-- RentFlow Security Migration: Agreement Integrity & Signatures
-- Version: 1.0
-- Date: 2026-01-03
-- Description: Implements agreement hash storage and immutable signature records
-- ============================================================================

-- ============================================================================
-- 1. ADD AGREEMENT HASH AND VERSION COLUMNS
-- ============================================================================

-- Add hash column for integrity verification
ALTER TABLE tenancy_agreements 
ADD COLUMN IF NOT EXISTS agreement_hash TEXT;

-- Add agreement version column for tracking changes
ALTER TABLE tenancy_agreements 
ADD COLUMN IF NOT EXISTS agreement_version INTEGER DEFAULT 1;

-- Add index for faster hash lookups
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_hash 
ON tenancy_agreements(agreement_hash);

-- ============================================================================
-- 2. CREATE AGREEMENT SIGNATURES TABLE (IMMUTABLE)
-- ============================================================================

-- This table stores legally-binding signature records
-- IMPORTANT: Records are append-only (cannot be updated or deleted)
CREATE TABLE IF NOT EXISTS agreement_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES tenancy_agreements(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('tenant', 'landlord')),
  agreement_hash TEXT NOT NULL,
  signature_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_fingerprint TEXT,
  agreement_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate signatures from same user on same agreement
  UNIQUE(agreement_id, signer_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agreement_signatures_agreement_id 
ON agreement_signatures(agreement_id);

CREATE INDEX IF NOT EXISTS idx_agreement_signatures_signer_id 
ON agreement_signatures(signer_id);

CREATE INDEX IF NOT EXISTS idx_agreement_signatures_timestamp 
ON agreement_signatures(signature_timestamp);

-- Add comment for documentation
COMMENT ON TABLE agreement_signatures IS 
'Immutable signature records for tenancy agreements. Records cannot be updated or deleted for legal compliance.';

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE agreement_signatures ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR AGREEMENT SIGNATURES
-- ============================================================================

-- Policy: Only Edge Functions (service role) can insert signature records
CREATE POLICY "Service role can insert signatures" ON agreement_signatures
FOR INSERT 
WITH CHECK (false); -- Blocks all client inserts, only service role can bypass

-- Policy: Users can view their own signatures
CREATE POLICY "Users can view own signatures" ON agreement_signatures
FOR SELECT 
USING (signer_id = auth.uid());

-- Policy: Admins can view all signatures
CREATE POLICY "Admins can view all signatures" ON agreement_signatures
FOR SELECT 
USING (public.is_admin());

-- Policy: Landlords can view signatures for their agreements
CREATE POLICY "Landlords can view agreement signatures" ON agreement_signatures
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tenancy_agreements
    WHERE tenancy_agreements.id = agreement_signatures.agreement_id
    AND tenancy_agreements.landlord_id = auth.uid()
  )
);

-- Policy: Tenants can view signatures for their agreements
CREATE POLICY "Tenants can view agreement signatures" ON agreement_signatures
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM tenancy_agreements
    WHERE tenancy_agreements.id = agreement_signatures.agreement_id
    AND tenancy_agreements.tenant_id = auth.uid()
  )
);

-- Policy: BLOCK all UPDATE operations (immutability)
CREATE POLICY "No updates allowed on signatures" ON agreement_signatures
FOR UPDATE 
USING (false);

-- Policy: BLOCK all DELETE operations (immutability)
CREATE POLICY "No deletes allowed on signatures" ON agreement_signatures
FOR DELETE 
USING (false);

-- ============================================================================
-- 5. CREATE TRIGGER TO PREVENT SIGNATURE MODIFICATIONS
-- ============================================================================

-- Additional safety: Trigger to prevent any modifications to signature records
CREATE OR REPLACE FUNCTION prevent_signature_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Agreement signatures cannot be modified. Record is immutable for legal compliance.';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Agreement signatures cannot be deleted. Record is immutable for legal compliance.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to agreement_signatures table
DROP TRIGGER IF EXISTS prevent_signature_modification_trigger ON agreement_signatures;

CREATE TRIGGER prevent_signature_modification_trigger
BEFORE UPDATE OR DELETE ON agreement_signatures
FOR EACH ROW
EXECUTE FUNCTION prevent_signature_modification();

-- ============================================================================
-- 6. UPDATE EXISTING TENANCY AGREEMENTS RLS POLICIES
-- ============================================================================

-- Drop existing restrictive policies to recreate with better security
DROP POLICY IF EXISTS "Tenants can update own agreements" ON tenancy_agreements;
DROP POLICY IF EXISTS "Landlords can update agreements" ON tenancy_agreements;

-- Tenants can ONLY view their agreements, not update
-- (Updates must go through Edge Functions)
CREATE POLICY "Tenants view only own agreements" ON tenancy_agreements
FOR SELECT 
USING (tenant_id = auth.uid());

-- Landlords can view and create agreements for their properties
-- But cannot update status directly (must use Edge Functions)
CREATE POLICY "Landlords can view own agreements" ON tenancy_agreements
FOR SELECT 
USING (landlord_id = auth.uid());

CREATE POLICY "Landlords can create agreements" ON tenancy_agreements
FOR INSERT 
WITH CHECK (landlord_id = auth.uid());

-- Only service role (Edge Functions) can update agreement status
-- This prevents frontend manipulation of agreement status
CREATE POLICY "Service role can update agreements" ON tenancy_agreements
FOR UPDATE 
USING (false); -- Blocks all client updates

-- ============================================================================
-- 7. CREATE AUDIT LOG CONSTRAINTS
-- ============================================================================

-- Add constraints to prevent audit log modification (append-only)
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified.';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to audit_logs table
DROP TRIGGER IF EXISTS prevent_audit_log_modification_trigger ON audit_logs;

CREATE TRIGGER prevent_audit_log_modification_trigger
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();

-- Update audit_logs RLS policies
DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_logs;

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON audit_logs
FOR INSERT 
WITH CHECK (true); -- Service role can always insert

-- BLOCK all client UPDATE operations on audit logs
CREATE POLICY "No updates on audit logs" ON audit_logs
FOR UPDATE 
USING (false);

-- BLOCK all client DELETE operations on audit logs
CREATE POLICY "No deletes on audit logs" ON audit_logs
FOR DELETE 
USING (false);

-- ============================================================================
-- 8. RESTRICT PAYMENT UPDATE POLICIES
-- ============================================================================

-- Drop existing payment update policies
DROP POLICY IF EXISTS "Tenants can create payments" ON payments;
DROP POLICY IF EXISTS "Landlords can update payments for their units" ON payments;

-- Tenants can only view their own payments
CREATE POLICY "Tenants view only own payments" ON payments
FOR SELECT 
USING (tenant_id = auth.uid());

-- Landlords can view payments for their properties
CREATE POLICY "Landlords view own unit payments" ON payments
FOR SELECT 
USING (landlord_id = auth.uid());

-- BLOCK all UPDATE operations from clients
-- Only webhook (Edge Function) can update payment status
CREATE POLICY "Service role only updates payments" ON payments
FOR UPDATE 
USING (false);

-- BLOCK all INSERT operations from clients
-- Payments should be created via application approval or Edge Functions
CREATE POLICY "Service role only creates payments" ON payments
FOR INSERT 
WITH CHECK (false);

-- ============================================================================
-- 9. CREATE VIEW FOR AGREEMENT STATUS
-- ============================================================================

-- View to show agreement signing status
CREATE OR REPLACE VIEW agreement_signing_status AS
SELECT 
  ta.id as agreement_id,
  ta.tenant_id,
  ta.landlord_id,
  ta.property_id,
  ta.unit_id,
  ta.agreement_status,
  ta.agreement_hash,
  ta.agreement_version,
  ta.signed_at,
  -- Check if tenant has signed
  EXISTS(
    SELECT 1 FROM agreement_signatures 
    WHERE agreement_id = ta.id 
    AND signer_role = 'tenant'
  ) as tenant_signed,
  -- Check if landlord has signed
  EXISTS(
    SELECT 1 FROM agreement_signatures 
    WHERE agreement_id = ta.id 
    AND signer_role = 'landlord'
  ) as landlord_signed,
  -- Get tenant signature timestamp
  (
    SELECT signature_timestamp FROM agreement_signatures 
    WHERE agreement_id = ta.id 
    AND signer_role = 'tenant'
    ORDER BY signature_timestamp DESC
    LIMIT 1
  ) as tenant_signature_timestamp,
  -- Get landlord signature timestamp
  (
    SELECT signature_timestamp FROM agreement_signatures 
    WHERE agreement_id = ta.id 
    AND signer_role = 'landlord'
    ORDER BY signature_timestamp DESC
    LIMIT 1
  ) as landlord_signature_timestamp
FROM tenancy_agreements ta;

-- Grant access to view
GRANT SELECT ON agreement_signing_status TO authenticated;

-- ============================================================================
-- 10. VERIFICATION QUERIES
-- ============================================================================

-- Verify agreement_signatures table was created
-- SELECT COUNT(*) as signature_records FROM agreement_signatures;

-- Verify RLS policies are active
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('agreement_signatures', 'tenancy_agreements', 'payments', 'audit_logs')
-- ORDER BY tablename, policyname;

-- Verify triggers are active
-- SELECT tgname, tgrelid::regclass, tgenabled 
-- FROM pg_trigger 
-- WHERE tgname LIKE '%signature%' OR tgname LIKE '%audit%';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Deploy Edge Functions (paystack-webhook, sign-agreement)
-- 2. Update frontend to call Edge Functions instead of direct DB writes
-- 3. Test signature flow with both tenant and landlord
-- 4. Verify audit logs are being created
-- 5. Test that direct DB updates are blocked
-- ============================================================================
