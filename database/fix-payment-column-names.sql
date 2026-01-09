-- ============================================================================
-- Fix: Payment Data Column Name Mismatches
-- ============================================================================
-- This script fixes column name mismatches between the database schema
-- and the application code that are causing "Failed to load payment data" errors.
--
-- Issues:
-- 1. Database has 'payment_status' but code uses 'status'
-- 2. Database has 'transaction_reference' but code uses 'transaction_id'
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Rename payment_status to status for consistency
-- ============================================================================

-- Rename the column
ALTER TABLE public.payments
RENAME COLUMN payment_status TO status;

-- Update the check constraint
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_payment_status_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Update the index
DROP INDEX IF EXISTS idx_payments_status;
CREATE INDEX idx_payments_status ON public.payments(status);

COMMENT ON COLUMN public.payments.status IS 
'Payment status: pending (awaiting payment), completed (successfully paid), failed (payment failed), refunded (payment refunded)';

-- ============================================================================
-- STEP 2: Rename transaction_reference to transaction_id for consistency
-- ============================================================================

-- Rename the column
ALTER TABLE public.payments
RENAME COLUMN transaction_reference TO transaction_id;

-- Update the unique constraint
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_transaction_reference_key;

ALTER TABLE public.payments
ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);

-- Update the index
DROP INDEX IF EXISTS idx_payments_transaction_ref;
CREATE INDEX idx_payments_transaction_id ON public.payments(transaction_id);

COMMENT ON COLUMN public.payments.transaction_id IS 
'Unique transaction reference/ID from payment gateway (e.g., Paystack reference)';

-- ============================================================================
-- STEP 3: Check for any views that might reference the old column names
-- ============================================================================

-- Note: If there are any views using these columns, they would need to be recreated
-- Let's check if public_property_listings or any other views reference payments

DO $$
DECLARE
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO view_count
    FROM information_schema.view_column_usage
    WHERE table_name = 'payments'
    AND table_schema = 'public';
    
    IF view_count > 0 THEN
        RAISE NOTICE 'Found % views referencing the payments table', view_count;
        RAISE NOTICE 'These views may need to be updated if they use the renamed columns';
    ELSE
        RAISE NOTICE 'No views found referencing the payments table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if 'status' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'status'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✓ Column "status" exists in payments table';
    ELSE
        RAISE WARNING '✗ Column "status" NOT found in payments table';
    END IF;
    
    -- Check if 'transaction_id' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'transaction_id'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✓ Column "transaction_id" exists in payments table';
    ELSE
        RAISE WARNING '✗ Column "transaction_id" NOT found in payments table';
    END IF;
    
    -- Check if old columns are gone
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'payment_status'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '✓ Old column "payment_status" has been removed';
    ELSE
        RAISE WARNING '✗ Old column "payment_status" still exists';
    END IF;
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'payments'
        AND column_name = 'transaction_reference'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE '✓ Old column "transaction_reference" has been removed';
    ELSE
        RAISE WARNING '✗ Old column "transaction_reference" still exists';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Payment Data Column Fix - Summary';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Renamed: payment_status → status';
    RAISE NOTICE 'Renamed: transaction_reference → transaction_id';
    RAISE NOTICE '';
    RAISE NOTICE 'The application should now be able to:';
    RAISE NOTICE '- Load payment history for tenants';
    RAISE NOTICE '- Load upcoming payments';
    RAISE NOTICE '- Display tenancy agreements';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================================================
-- Test Queries (run these separately after migration to verify)
-- ============================================================================

-- Count payments by status
-- SELECT status, COUNT(*) 
-- FROM public.payments 
-- GROUP BY status 
-- ORDER BY status;

-- Show recent payments with all fields
-- SELECT 
--     id,
--     tenant_id,
--     amount,
--     status,
--     transaction_id,
--     due_date,
--     paid_at,
--     created_at
-- FROM public.payments
-- ORDER BY created_at DESC
-- LIMIT 10;
