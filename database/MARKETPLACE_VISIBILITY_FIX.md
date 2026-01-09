# Marketplace Visibility Fix

## Problem Statement

Properties and units listed by landlords were not appearing on the public marketplace or home page, despite having status set to "available".

## Root Causes Identified

### 1. Schema-Code Mismatch
The database schema defined `listing_status` with values:
- `'draft', 'available', 'rented', 'maintenance'`

But the TypeScript application code uses:
- `'available', 'applied', 'rented', 'unlisted'`

This mismatch prevented proper status management and could cause constraint violations.

### 2. Missing Automation for `is_public_listing`
The `units` table has an `is_public_listing` boolean flag (defaults to FALSE), but there was no automatic mechanism to set it to TRUE when a unit's status changed to 'available'.

### 3. Missing Automation for `is_published`
The `properties` table has an `is_published` boolean flag (defaults to FALSE), but landlords had no way to publish their properties. This flag must be TRUE for properties to appear in the `public_property_listings` view.

### 4. The Public Marketplace View Requirements
The `public_property_listings` view requires ALL THREE conditions:
```sql
WHERE 
    u.is_public_listing = TRUE 
    AND u.listing_status = 'available'
    AND p.is_published = TRUE
```

Without automation, even units marked as "available" wouldn't appear because `is_public_listing` and `is_published` remained FALSE.

## Solution Implemented

### 1. Fixed Schema Constraint
Updated the `listing_status` CHECK constraint to match exactly what the application code uses:
```sql
CHECK (listing_status IN ('available', 'applied', 'rented', 'unlisted'))
```

Changed default from `'draft'` to `'unlisted'` to match code expectations.

### 2. Added Automatic `is_public_listing` Management
Created a BEFORE trigger that automatically sets `is_public_listing`:
- **TRUE** when `listing_status = 'available'`
- **FALSE** for all other statuses

This ensures units are automatically listed when marked as available.

### 3. Added Automatic `is_published` Management
Created AFTER triggers that automatically manage property publishing:
- **Publishes** a property when it has at least one available unit
- **Unpublishes** a property when it has no available units
- Handles both unit status changes and unit deletions

### 4. Fixed Existing Data
The migration script updates all existing units and properties to reflect the correct status based on the new automation rules.

## Files Changed

1. **`database/fix-marketplace-visibility.sql`** - Migration script for existing databases
   - Fixes constraint
   - Adds trigger functions
   - Updates existing data
   - Includes verification queries

2. **`database/schema.sql`** - Updated for new installations
   - Fixed listing_status constraint
   - Added trigger functions and triggers
   - Ensures new installations work correctly out of the box

## How It Works Now

### For Landlords
When a landlord creates or updates a unit:

1. Sets `listing_status = 'available'`
2. **AUTOMATIC**: `is_public_listing` is set to TRUE (via trigger)
3. **AUTOMATIC**: Parent property `is_published` is set to TRUE (via trigger)
4. **RESULT**: Unit appears in `public_property_listings` view
5. **RESULT**: Property appears on home page marketplace

### For the System
The automation ensures:
- Units marked "available" are automatically publicly listed
- Properties with available units are automatically published
- Properties without available units are automatically unpublished
- Status changes instantly reflect in the marketplace
- No manual intervention needed

## Migration Instructions

### For Existing Databases
Run the migration script in Supabase SQL Editor:
```sql
-- Run this file
database/fix-marketplace-visibility.sql
```

This will:
1. Fix the constraint
2. Add the triggers
3. Update existing data
4. Display a summary of changes

### For New Installations
Simply run the updated `schema.sql` - all fixes are included.

## Verification

After running the migration, verify the fix:

```sql
-- Check how many properties are now published
SELECT 
    COUNT(*) as total_properties,
    COUNT(*) FILTER (WHERE is_published = TRUE) as published_properties
FROM public.properties;

-- Check how many units are publicly listed
SELECT 
    COUNT(*) as total_units,
    COUNT(*) FILTER (WHERE listing_status = 'available') as available_units,
    COUNT(*) FILTER (WHERE is_public_listing = TRUE) as public_units
FROM public.units;

-- View what's in the marketplace
SELECT 
    property_name,
    city,
    state,
    unit_number,
    bedrooms,
    bathrooms,
    rent_amount
FROM public.public_property_listings
ORDER BY property_name, unit_number;
```

## Testing the Fix

1. **Create a new property** as a landlord
2. **Add a unit** with `listing_status = 'available'`
3. **Check the home page** - the property should now appear
4. **Change unit status** to 'rented'
5. **Check the home page** - if it was the only unit, property should disappear
6. **Add another available unit** to the same property
7. **Check the home page** - property should reappear

## Impact

✅ Properties with available units now automatically appear on the marketplace  
✅ No manual intervention needed by landlords or admins  
✅ Real-time updates when unit status changes  
✅ Consistent behavior across all parts of the application  
✅ Existing data automatically fixed  

## Related Files

- `src/pages/Index.tsx` - Home page that displays PropertyMarketplace
- `src/components/landing/PropertyMarketplace.tsx` - Marketplace component
- `src/services/propertyService.ts` - Property service with fetchPublicMarketplaceListings
- `src/types/index.ts` - TypeScript type definitions
- `database/schema.sql` - Main database schema

## Status

✅ **COMPLETE** - Ready for deployment

## Author

Copilot AI Agent - January 7, 2026
