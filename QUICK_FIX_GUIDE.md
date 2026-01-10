# Quick Fix Guide

## What Was Fixed

This PR fixes two critical database schema mismatches that were causing errors in the application:

### 1. Applications Error
**Error Message:** `Could not find a relationship between 'property_applications' and 'tenancy_agreements'`

**What was wrong:** The code was trying to use a foreign key that didn't exist in the database.

**What was fixed:**
- Added `application_id` column to `tenancy_agreements` table
- Updated the query to use the correct foreign key name
- Applications can now properly link to tenancy agreements

### 2. Documents Error
**Error Message:** `column documents.name does not exist`

**What was wrong:** The code was using incorrect column names that didn't match the database schema.

**What was fixed:**
- Updated queries to use `file_name` instead of `name`
- Updated queries to use `file_url` instead of `doc_url`
- Updated queries to use `uploaded_by` instead of `owner_id`
- Documents now load correctly in the tenant dashboard

## How to Apply These Fixes

### Step 1: Update Your Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Add application_id column to tenancy_agreements
ALTER TABLE public.tenancy_agreements 
ADD COLUMN IF NOT EXISTS application_id UUID 
REFERENCES public.property_applications(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tenancy_agreements_application_id 
ON public.tenancy_agreements(application_id);
```

Or use the provided migration script:
```sql
\i database/fix-schema-mismatches.sql
```

### Step 2: Update Your Code

Merge this PR or apply the changes from these files:
- `database/schema.sql` - Updated base schema
- `src/services/applicationService.ts` - Fixed foreign key hint
- `src/services/tenantDashboardService.ts` - Fixed column names
- `src/types/supabase.ts` - Updated TypeScript types

### Step 3: Test

1. **Test Applications:**
   - Log in as a tenant
   - Go to the dashboard
   - Verify applications load without errors
   - Check browser console for any errors

2. **Test Documents:**
   - Log in as a tenant
   - Go to the dashboard
   - Verify documents section loads
   - Check browser console for any errors

## What If I Get Errors?

### Error: "column already exists"
This is safe to ignore - it means the migration was already applied.

### Error: "relation does not exist"
Make sure you're running the migration on the correct database. Check your Supabase project settings.

### Error: "permission denied"
Make sure you're running the SQL as a user with sufficient privileges (super admin).

## Need Help?

- Check `database/SCHEMA_FIXES.md` for detailed documentation
- Review the migration script in `database/fix-schema-mismatches.sql`
- Check the original issue for context

## Files Changed

- `database/schema.sql` - Base schema with application_id column
- `database/fix-schema-mismatches.sql` - Migration script for existing databases
- `database/SCHEMA_FIXES.md` - Detailed documentation
- `src/services/applicationService.ts` - Fixed foreign key hint
- `src/services/tenantDashboardService.ts` - Fixed column names
- `src/types/supabase.ts` - Updated TypeScript types

## Summary

✅ Fixed foreign key relationship between applications and agreements
✅ Fixed documents table column name mismatches
✅ Added migration script for existing databases
✅ Updated TypeScript types to match schema
✅ Created comprehensive documentation

No data loss, backward compatible, and safe to deploy! 🚀
