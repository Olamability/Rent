# Tenant Property Search Fix

## Issue
Tenants were unable to view the property search/marketplace page. The page displayed an error:

```
Error loading properties: AppError: Property data missing for unit
    AppError errorHandling.ts:60
    fetchAvailableProperties propertyService.ts:275
```

## Root Cause

The issue was caused by **missing RLS (Row Level Security) policies** in the database:

1. **Missing properties table policy**: No policy allowed tenants to view the `properties` table for public listings
2. **Restrictive units table policy**: The policy only allowed viewing units with `is_public_listing = TRUE AND listing_status = 'available'`, but the application code was trying to fetch units with status 'available', 'applied', OR 'rented'

When the query `units.select(properties(...))` executed:
- Tenants could see the units table rows (subject to their RLS policies)
- But the join to the properties table returned `null` because no policy allowed access
- This caused the "Property data missing for unit" error

## Solution

Two RLS policies were added and trigger functions were updated:

### 1. Properties Table Policy
```sql
CREATE POLICY "Anyone can view published properties" ON public.properties
    FOR SELECT USING (is_published = TRUE);
```

This allows anyone (including tenants and unauthenticated users) to view published properties. This is necessary for:
- Property search/marketplace pages
- Property details pages
- Public property browsing

### 2. Units Table Policy (Updated)
```sql
-- OLD (Too Restrictive)
CREATE POLICY "Tenants can view public listings" ON public.units
    FOR SELECT USING (is_public_listing = TRUE AND listing_status = 'available');

-- NEW (Matches Application Requirements)
CREATE POLICY "Tenants can view marketplace listings" ON public.units
    FOR SELECT USING (listing_status IN ('available', 'applied', 'rented'));
```

This aligns with the marketplace visibility requirements that tenants should see:
- **Available** properties: Ready for applications
- **Applied** properties: Have pending applications (shows "Applied - Awaiting Payment" badge)
- **Rented** properties: Currently occupied (shows "Occupied" badge)

### 3. Trigger Functions (Updated)

The trigger functions that automatically set `is_published` on properties were updated to consider all marketplace statuses:

```sql
-- OLD (Only considered 'available')
WHERE listing_status = 'available'

-- NEW (Considers all marketplace statuses)
WHERE listing_status IN ('available', 'applied', 'rented')
```

This ensures that:
- Properties remain published when units transition from 'available' to 'applied'
- Properties remain published when units transition from 'applied' to 'rented'
- Properties are only unpublished when they have no marketplace units at all

## Files Changed

1. **database/schema.sql** - Main schema file updated with the new policies
2. **database/fix-tenant-property-search.sql** - Migration file for existing databases

## How to Apply the Fix

### For New Installations
Simply run the updated `database/schema.sql` file. The policies are already included.

### For Existing Installations
Run the migration file:

```sql
-- In Supabase SQL Editor
\i database/fix-tenant-property-search.sql
```

Or copy and paste the contents of `database/fix-tenant-property-search.sql` into the Supabase SQL Editor and execute.

## Verification

After applying the fix, verify that:

1. Tenants can access the property search page at `/tenant/property-search`
2. Properties are displayed with their details (name, address, rent amount, etc.)
3. Properties show appropriate status badges:
   - No badge for "available" properties
   - "Applied - Awaiting Payment" for properties the user has applied to
   - "Occupied" for rented properties
4. No console errors about "Property data missing for unit"

## Security Considerations

The new policies are safe because:

1. **Published properties are meant to be public**: The `is_published` flag is a conscious decision by landlords to make their properties visible
2. **Marketplace visibility is a feature**: Showing applied/rented properties helps all tenants understand the full marketplace
3. **Personal data is protected**: Only property information is exposed, not tenant personal information or sensitive details
4. **Existing protections remain**: Other tables (tenancy_agreements, payments, etc.) maintain their restrictive RLS policies

## Related Documentation

- [Marketplace Visibility Requirements](../MARKETPLACE_VISIBILITY_UPDATE.md)
- [Implementation Summary](../IMPLEMENTATION_SUMMARY.md)
- [RLS Setup Guide](../database/README.md)
