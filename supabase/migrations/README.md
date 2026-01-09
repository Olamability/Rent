# Database Migrations

This directory contains database migration scripts for RentFlow.

## Migration Files

### 20260103_agreement_security.sql
Security enhancements for tenancy agreements.

### 20260107_enhance_schema_for_ux.sql
**MAIN MIGRATION - Schema enhancements for better UX and features**

This migration adds:
- `property_id` FK to `property_applications` table for direct property queries
- Extended JSONB fields to `property_applications` for rich application data:
  - `personal_info`, `employment_info`, `emergency_contact`, `refs`, `previous_landlord`
  - `pets`, `vehicles`, `occupants`, `documents`
  - `credit_check_consent`, `background_check_consent`, `notes`, `admin_notes`, `current_address`
- `category` field to `support_tickets` table for better ticket management
- `is_occupied` and `current_tenant_id` fields to `units` table for occupancy tracking
- Indexes for performance optimization
- Automatic triggers for occupancy management
- Helper views for common queries
- Updated RLS policies

**Features:**
- Safe to run on existing databases (uses IF NOT EXISTS checks)
- Preserves all existing data
- Auto-populates new fields from existing relationships
- Includes automatic occupancy management triggers
- Includes helpful views for common queries

### 20260107_rollback_enhance_schema.sql
Rollback script for the schema enhancement migration. Only run if you need to revert the changes.

## How to Apply Migrations

### Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the migration file `20260107_enhance_schema_for_ux.sql`
4. Review the changes
5. Click "Run" to execute the migration

### Using Supabase CLI
```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/20260107_enhance_schema_for_ux.sql
```

## Verification

After running the migration, you can verify the changes using these queries:

### 1. Check property_applications columns
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_applications' 
ORDER BY ordinal_position;
```

### 2. Check support_tickets category
```sql
SELECT DISTINCT category FROM public.support_tickets;
```

### 3. Check units occupancy
```sql
SELECT is_occupied, COUNT(*) 
FROM public.units 
GROUP BY is_occupied;
```

### 4. Check triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN ('trigger_update_unit_occupancy', 'trigger_update_unit_on_application');
```

### 5. View occupied units
```sql
SELECT * FROM public.occupied_units_view LIMIT 10;
```

### 6. View applications with full details
```sql
SELECT * FROM public.applications_full_view LIMIT 10;
```

## Rollback

If you need to rollback the changes:

```bash
# Using Supabase Dashboard
# Run the file: 20260107_rollback_enhance_schema.sql in SQL Editor

# Or using CLI
supabase db execute --file supabase/migrations/20260107_rollback_enhance_schema.sql
```

**Warning:** Rollback will remove all the new columns and any data stored in them.

## Migration Notes

### What Changed

#### property_applications table
- **Added:** Direct `property_id` foreign key (auto-populated from units relationship)
- **Added:** JSONB fields for storing rich application data
- **Added:** Consent and notes fields
- **Impact:** Applications now store complete tenant information for better decision making

#### support_tickets table
- **Added:** `category` field (technical, billing, general, maintenance, feature_request, complaint)
- **Added:** Index on category
- **Impact:** Better ticket filtering and reporting

#### units table
- **Added:** `is_occupied` boolean field (auto-populated from active tenancies)
- **Added:** `current_tenant_id` foreign key (auto-populated from active tenancies)
- **Added:** Indexes on new fields
- **Impact:** Easy tracking of unit occupancy without complex joins

#### Triggers
- **Added:** `trigger_update_unit_occupancy` - Automatically updates unit occupancy when tenancy agreements change
- **Added:** `trigger_update_unit_on_application` - Updates unit status when applications are approved/rejected
- **Impact:** Automatic occupancy management, no manual updates needed

#### Views
- **Added:** `occupied_units_view` - Quick access to occupied units with tenant information
- **Added:** `applications_full_view` - Complete application details with property and tenant info
- **Impact:** Simplified queries for common use cases

### Backward Compatibility

The migration is fully backward compatible:
- All existing queries continue to work
- New fields are optional (nullable or have defaults)
- RLS policies are updated to support both old and new query patterns
- Service layer handles both old records (missing new fields) and new records

### Performance Considerations

- Added indexes on frequently queried fields
- JSONB fields use GIN indexes for fast searching
- Triggers are lightweight and only update when necessary
- Views are non-materialized (always current data)

## Testing

After migration:
1. Test creating new applications with full data
2. Test creating support tickets with categories
3. Verify unit occupancy updates automatically
4. Test filtering tickets by category
5. Verify applications can be queried by property_id
6. Check that existing data is intact

## Support

If you encounter any issues:
1. Check the verification queries above
2. Review the Supabase logs for errors
3. Ensure you have the required permissions (SUPERUSER or table owner)
4. If needed, run the rollback script and report the issue
