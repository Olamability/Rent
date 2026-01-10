# Schema Mismatch Fixes

This document describes the schema mismatches that were found and fixed in the RentFlow application.

## Issues Fixed

### 1. Property Applications and Tenancy Agreements Relationship

**Error:**
```
Could not find a relationship between 'property_applications' and 'tenancy_agreements' in the schema cache
Error code: PGRST200
```

**Root Cause:**
- The code in `applicationService.ts` was trying to join `property_applications` with `tenancy_agreements` using an incorrect foreign key hint: `property_applications_id_fkey`
- The base schema didn't include an `application_id` column in the `tenancy_agreements` table

**Fix:**
1. Added `application_id` column to `tenancy_agreements` table in the base schema
2. Updated the foreign key hint to use the correct name: `tenancy_agreements_application_id_fkey`
3. Added proper index for performance

### 2. Documents Table Column Names

**Error:**
```
column documents.name does not exist
Error code: 42703
```

**Root Cause:**
- The code in `tenantDashboardService.ts` was using incorrect column names:
  - `name` instead of `file_name`
  - `doc_url` instead of `file_url`
  - `owner_id` instead of `uploaded_by`

**Fix:**
1. Updated `tenantDashboardService.ts` to use correct column names from the schema
2. Updated TypeScript types in `supabase.ts` to match the actual database schema

## Files Changed

### Database Schema
- `database/schema.sql` - Added `application_id` column to `tenancy_agreements` table

### Services
- `src/services/applicationService.ts` - Fixed foreign key hint for tenancy_agreements join
- `src/services/tenantDashboardService.ts` - Updated documents query to use correct column names

### Types
- `src/types/supabase.ts` - Updated documents type definition to match schema

## Migration

If you're using an existing database with the old schema, run this migration:

```sql
-- Run in Supabase SQL Editor
\i database/fix-schema-mismatches.sql
```

Or manually add the column:

```sql
ALTER TABLE public.tenancy_agreements 
ADD COLUMN application_id UUID REFERENCES public.property_applications(id) ON DELETE SET NULL;

CREATE INDEX idx_tenancy_agreements_application_id 
ON public.tenancy_agreements(application_id);
```

## Testing

After applying the fixes:

1. **Test Applications Fetch:**
   - Log in as a tenant
   - Navigate to dashboard
   - Verify applications are displayed without errors

2. **Test Documents Fetch:**
   - Log in as a tenant
   - Navigate to dashboard
   - Verify documents section loads without errors

3. **Test Application-Agreement Link:**
   - As landlord, approve an application
   - Verify the agreement is properly linked to the application
   - As tenant, check that the agreement shows up correctly

## Prevention

To prevent similar issues in the future:

1. Keep the base schema (`database/schema.sql`) as the single source of truth
2. Run schema migrations in order when adding new features
3. Regenerate TypeScript types from Supabase after schema changes
4. Test queries in Supabase SQL editor before implementing in code
5. Use consistent column naming conventions across all tables

## Related Files

- Migration script: `database/fix-schema-mismatches.sql`
- Lease agreement migration: `database/add-lease-agreement-before-payment.sql`
- Complete workflow migration: `database/complete-workflow-migration.sql`
