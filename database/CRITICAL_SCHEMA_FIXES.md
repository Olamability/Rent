# Critical Schema Fixes for RentFlow Database

## Overview
This document outlines critical database schema issues found through error logs and code analysis.

## Issues Found and Fixed

### 1. ✅ FIXED IN CODE: platform_announcements Column Naming
**Problem:** Frontend queries `message` but schema has `content`
**Root Cause:** Migration file `migration-schema-conformity.sql` renames `message` to `content` but migration may not have been applied
**Solution:** 
- Schema is correct (has `content` column)
- Fixed frontend code in `announcementService.ts` to query `content` instead of `message`
- **Action Required:** If database still has `message` column, run `migration-schema-conformity.sql`

### 2. ✅ FIXED IN CODE: subscriptions.plan Column
**Problem:** Frontend queries `plan` but schema has `subscription_plan`
**Location:** `adminDashboardService.ts:113`
**Solution:** Fixed code to query `subscription_plan`

### 3. ✅ FIXED IN CODE: maintenance_requests.status Column  
**Problem:** Frontend queries `status` but schema has `request_status`
**Location:** `adminDashboardService.ts:242`
**Solution:** Fixed code to query `request_status`

### 4. ✅ FIXED IN CODE: Nonexistent tenancies Table
**Problem:** `maintenanceService.ts` queries `tenancies` table which doesn't exist
**Schema:** Table is named `tenancy_agreements` not `tenancies`
**Solution:** Removed invalid query - maintenance_requests doesn't have tenancy_id field

### 5. ⚠️ REQUIRES VERIFICATION: platform_announcements.author_id
**Error:** `column platform_announcements.author_id does not exist`
**Schema Status:** Schema shows `author_id` column EXISTS
**Possible Causes:**
- Migration `migration-schema-conformity.sql` not applied (renames `created_by` to `author_id`)
- Table was created before migration was run
**Action Required:** 
1. Check if column is named `created_by` in actual database
2. If yes, run `migration-schema-conformity.sql`
3. If no, check RLS policies for this table

## Migration Application Status

### Check if migrations have been applied:
```sql
-- Check column names in platform_announcements
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'platform_announcements'
ORDER BY ordinal_position;

-- Should show:
-- content (TEXT) not message
-- author_id (UUID) not created_by
```

### Check other critical columns:
```sql
-- Check subscriptions columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'subscriptions';
-- Should have: subscription_plan, subscription_status

-- Check maintenance_requests columns
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'maintenance_requests';
-- Should have: request_status (not status)

-- Check payments columns  
SELECT column_name FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'payments';
-- Should have: status, paid_at
```

## Admin Profiles RLS Policy Issues

### Problem: Admins Cannot View Other Admin Profiles
**Location:** `admin_profiles` table
**Issue:** Only super_admins can view all admin profiles with existing policies
**Solution:** Created `fix-admin-profiles-rls.sql` to add policy for admins

### Apply the fix:
```bash
# Run this in Supabase SQL Editor
database/fix-admin-profiles-rls.sql
```

## Recommended Actions

1. **Verify Migration Status**
   - Check if `migration-schema-conformity.sql` has been applied
   - Verify column names match schema.sql

2. **Apply Missing Migrations** (if needed)
   ```sql
   -- Run in Supabase SQL Editor in this order:
   -- 1. database/schema.sql (if fresh install)
   -- 2. database/migration-schema-conformity.sql (if updating existing DB)
   -- 3. database/fix-admin-profiles-rls.sql (RLS policy fixes)
   ```

3. **Test Each Fix**
   - Login as different roles (tenant, landlord, admin, super_admin)
   - Check dashboard loads without 400 errors
   - Verify announcements display correctly
   - Check maintenance requests work

4. **Monitor Error Logs**
   - Check browser console for any remaining 400/500 errors
   - Look for "column does not exist" errors
   - Verify all Supabase REST API calls succeed

## Code Changes Made

### Files Modified:
1. `src/types/index.ts` - Added `profile` field to User interface
2. `src/services/adminProfileService.ts` - Now queries admin_profiles table
3. `src/services/announcementService.ts` - Fixed to query `content` not `message`
4. `src/services/adminDashboardService.ts` - Fixed `subscription_plan` and `request_status`
5. `src/services/maintenanceService.ts` - Removed invalid tenancies query
6. `src/contexts/AuthContext.tsx` - Fixed registration to send role
7. `src/pages/auth/Register.tsx` - Clarified role handling in comments

### Files Created:
1. `database/fix-admin-profiles-rls.sql` - RLS policy fixes
2. `database/CRITICAL_SCHEMA_FIXES.md` - This document

## Next Steps After Applying Fixes

1. Test user registration (tenant, landlord, admin)
2. Test login for all roles
3. Verify dashboards load without errors
4. Check profile loading works correctly
5. Verify RLS policies allow proper data access
6. Test announcements functionality
7. Test maintenance request creation

## Known Schema vs Code Alignments

### Correctly Aligned:
- ✅ payments: `status`, `paid_at` 
- ✅ maintenance_requests: `request_status`, `priority`
- ✅ subscriptions: `subscription_plan`, `subscription_status`
- ✅ platform_announcements schema: `content`, `author_id`

### Needs Database Verification:
- ⚠️ platform_announcements actual DB: May still have `message`, `created_by`
- ⚠️ Check if migration-schema-conformity.sql was run

## Support

If issues persist after applying these fixes:
1. Check Supabase logs for detailed error messages
2. Verify RLS policies are correctly configured
3. Ensure service role key is properly set up
4. Check that all triggers are active
