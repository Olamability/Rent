# Database Schema Update - Quick Reference

## What Changed?

### Summary
Six database tables have been updated for full system conformity. All column renames preserve data and maintain backward compatibility through the migration script.

### Quick Change Reference

| Table | Old Column | New Column | Type Change |
|-------|-----------|-----------|-------------|
| payments | payment_status | status | No |
| payments | paid_date (DATE) | paid_at (TIMESTAMPTZ) | Yes |
| platform_announcements | message | content | No |
| platform_announcements | created_by | author_id | No |
| documents | owner_id | uploaded_by | No |
| documents | name | file_name | No |
| documents | doc_url | file_url | No |
| documents | (new) | updated_at | New column |
| support_tickets | ticket_status | status | No |
| ticket_messages | user_id | sender_id | No |
| tenancy_agreements | (new) | agreement_hash | New column |
| tenancy_agreements | (new) | agreement_version | New column |

## For Developers

### If you're working on new features:
✅ Use the updated `schema.sql` - it already has all changes  
✅ Use types from `src/types/index.ts` - they're already updated  
✅ Reference services in `src/services/` - they're already updated

### If you're fixing bugs in existing code:
⚠️ Check if your code uses old column names  
⚠️ Update to new column names per the table above  
⚠️ Test thoroughly after changes

## For Database Administrators

### New Installation:
```sql
-- Run in Supabase SQL Editor
-- Execute: database/schema.sql
```

### Existing Database Migration:
```sql
-- Run in Supabase SQL Editor  
-- Execute: database/migration-schema-conformity.sql
```

### Verification:
```sql
-- Check all updates applied
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('status', 'paid_at');
-- Should return 2 rows
```

## Common Errors After Update

### "Column payment_status does not exist"
**Cause:** Code still using old column name  
**Fix:** Update to `status`

### "Column paid_date does not exist"  
**Cause:** Code still using old column name  
**Fix:** Update to `paid_at`

### TypeScript error: "Property 'paymentStatus' does not exist"
**Cause:** Using old interface property  
**Fix:** Update to `status`

### TypeScript error: "Property 'paidDate' does not exist"
**Cause:** Using old interface property  
**Fix:** Update to `paidAt`

## Key Design Decisions

1. **Kept `landlord_id` in payments** - Performance optimization
2. **Kept `user_id` FK in documents** - Multi-role support (not just admins)
3. **Kept `user_id` in support_tickets** - All roles need support
4. **Changed `paid_date` to `paid_at`** - Timestamp precision
5. **Added agreement versioning** - Track agreement changes

## Files Updated

✅ `database/schema.sql` - Main schema  
✅ `database/migration-schema-conformity.sql` - Migration script  
✅ `src/types/index.ts` - TypeScript types  
✅ All service files in `src/services/`  
✅ `src/pages/landlord/RentCollection.tsx` - UI component  
✅ RLS policies updated  
✅ Indexes updated  
✅ Triggers updated  

## Need More Details?

📖 See [SCHEMA_UPDATE_GUIDE.md](./SCHEMA_UPDATE_GUIDE.md) for:
- Complete change details
- Design rationale
- Testing procedures
- Rollback instructions
- Troubleshooting guide

## Quick Test

After applying migration, test basic functionality:

```sql
-- Test payment query with new columns
SELECT id, status, paid_at 
FROM payments 
LIMIT 5;

-- Test announcement query with new columns
SELECT id, title, content, author_id 
FROM platform_announcements 
LIMIT 5;

-- Test documents query with new columns  
SELECT id, file_name, file_url, uploaded_by 
FROM documents 
LIMIT 5;
```

All should return without errors.

## Status: ✅ COMPLETE

- Schema updated
- Types updated  
- Services updated
- UI components updated
- Documentation complete
- Ready for testing & deployment

---

**Last Updated:** January 5, 2026  
**Version:** 1.0  
**Status:** Production Ready
