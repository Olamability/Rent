# Property Occupancy Validation Implementation

## Overview

This implementation ensures that property occupancy is determined by **payment completion**, not just application approval. Properties remain visible throughout the application process with appropriate status badges, and only become locked after successful payment.

## Key Requirements Met

1. ✅ **Properties remain visible** on marketplace even after application/approval
2. ✅ **Clear status badges** indicate property state (Applied, Occupied)
3. ✅ **Payment validation** is the definitive action that marks property as occupied
4. ✅ **Application flow tracking** visible on tenant dashboard
5. ✅ **Invoice generation** triggered automatically on application approval
6. ✅ **Property locking** prevents further applications only after payment completion

## Property Status Flow

### Status Lifecycle

```
┌─────────────┐
│  available  │ ← Property listed, ready for applications
└──────┬──────┘
       │ Tenant applies
       ▼
┌─────────────┐
│   applied   │ ← Application submitted and approved by landlord
└──────┬──────┘      (Invoice generated, property still visible)
       │ Payment completed
       ▼
┌─────────────┐
│   rented    │ ← Property occupied, locked for new applications
└──────┬──────┘
       │ Lease ends
       ▼
┌─────────────┐
│  available  │ ← Property unlocked, ready for new tenants
└─────────────┘
```

### Database State Changes

| Event | Unit Status | is_occupied | current_tenant_id | Applications Allowed |
|-------|------------|-------------|-------------------|---------------------|
| Property Listed | `available` | FALSE | NULL | ✅ Yes |
| Application Submitted | `available` | FALSE | NULL | ✅ Yes |
| Application Approved | `applied` | FALSE | NULL | ✅ Yes |
| Payment Completed | `rented` | TRUE | tenant_id | ❌ No |
| Lease Ended | `available` | FALSE | NULL | ✅ Yes |

## Implementation Details

### 1. Payment Webhook Enhancement

**File:** `/app/api/webhooks/paystack/route.ts`

**Changes:**
- Added unit status update to `rented` after successful application payment
- Set `is_occupied = true` to lock the property
- Set `current_tenant_id` to track the occupying tenant

```typescript
// Mark unit as rented and occupied after successful payment
const { error: unitUpdateError } = await supabase
  .from('units')
  .update({
    listing_status: 'rented',
    is_occupied: true,
    current_tenant_id: application.tenant_id,
  })
  .eq('id', application.unit_id)
```

**Why this matters:**
- Payment verification is the ONLY trusted way to mark occupancy (security)
- Prevents race conditions between multiple applicants
- Ensures consistency between payment and property status

### 2. Application Submission Validation

**File:** `/src/services/applicationService.ts`

**Changes:**
- Added validation to prevent applications for occupied properties
- Check both `listing_status` and `is_occupied` flag

```typescript
// Prevent applications for rented/occupied properties
if (unit.listing_status === 'rented' || unit.is_occupied) {
  throw new Error('This property is already occupied and not available for applications.');
}
```

**Why this matters:**
- Prevents confusion and wasted effort for tenants
- Enforces business rule that occupied properties cannot receive new applications
- Provides clear error messaging

### 3. Database Schema Update

**File:** `/database/add-unit-occupancy-columns.sql`

**New Columns:**
- `is_occupied` (BOOLEAN): Tracks occupancy status
- `current_tenant_id` (UUID): References the current tenant

**Trigger:**
- Automatically maintains consistency between `listing_status` and `is_occupied`
- Clears `current_tenant_id` when unit becomes available

**Why this matters:**
- Provides explicit occupancy tracking beyond just status
- Maintains referential integrity with tenant data
- Prevents data inconsistencies through database-level enforcement

## Application Lifecycle on Tenant Portal

### 1. Property Search/Marketplace

**Visibility:** All properties visible regardless of status

**Status Badges:**
- 🟢 **Available** - No badge, "Apply Now" button
- 🟡 **Applied (Your Application)** - Yellow badge, "Make Payment" button
- 🟠 **Applied (Other Applicant)** - Orange badge, "Not Available" button  
- 🔴 **Occupied** - Red badge, "Not Available" button

**File:** `/src/pages/tenant/PropertySearch.tsx`

### 2. Tenant Dashboard

**Application Section:**
Shows all applications with:
- Property name and unit number
- Application status (pending, approved, rejected)
- Submission and move-in dates
- **Action buttons:**
  - Approved: "Proceed to Payment" + "Withdraw"
  - Pending: "Withdraw Application"

**File:** `/src/pages/tenant/Dashboard.tsx`

### 3. Payment Page

**For Approved Applications:**
- Displays pending invoice with breakdown
- Shows rent amount + security deposit
- "Pay with Card" button to initiate payment
- Clear due date indication

**File:** `/src/pages/tenant/RentPayment.tsx`

## Invoice System Integration

### Automatic Invoice Creation

**When:** Landlord approves application  
**File:** `/src/services/applicationService.ts` → `updateApplicationStatus()`

**What's Created:**
- Invoice with type: `initial_payment`
- Includes: rent_amount + deposit_amount
- Status: `pending`
- Linked to application via `application_id`

**File:** `/src/services/invoiceService.ts` → `createApplicationInvoice()`

### Payment to Invoice Link

**When:** Payment webhook receives successful payment  
**File:** `/app/api/webhooks/paystack/route.ts`

**Process:**
1. Verify payment signature (security)
2. Update payment status to `paid`
3. Update linked invoice paid_amount
4. Create tenancy agreement
5. **Update unit to rented/occupied** ← Key step
6. Send notifications to tenant and landlord

## Notification Flow

### Application Submitted
- **To Landlord:** "New Property Application" with tenant name
- **To Tenant:** "Application Submitted Successfully"

### Application Approved
- **To Tenant:** "Application Approved! 🎉" with payment CTA
- Invoice automatically generated

### Payment Completed
- **To Tenant:** "Payment Confirmed"
- **To Landlord:** "Payment Received"
- **To Both:** "Agreement Ready for Signature"

### Property Status Change
- Unit marked as occupied
- Property remains visible with "Occupied" badge

## Security Considerations

### Payment Verification
- ✅ Webhook signature validation (prevents fraud)
- ✅ Server-side payment status updates only
- ✅ Duplicate payment prevention
- ✅ Audit logging for all payment operations

### Application Security
- ✅ Validates property availability before submission
- ✅ Prevents applications to occupied units
- ✅ Uses RLS policies for data access control

### Data Consistency
- ✅ Database triggers maintain status consistency
- ✅ Check constraints prevent invalid states
- ✅ Transaction-safe updates

## Testing Checklist

### Manual Testing Flow

1. **Property Listing**
   - [ ] Create property as landlord
   - [ ] Verify appears on marketplace as "available"

2. **Application Submission**
   - [ ] Apply as tenant
   - [ ] Verify property still visible
   - [ ] Verify notification sent to landlord

3. **Application Approval**
   - [ ] Approve as landlord
   - [ ] Verify invoice created
   - [ ] Verify property status changes to "applied"
   - [ ] Verify property still visible with "Applied" badge
   - [ ] Verify payment CTA appears on tenant dashboard
   - [ ] Verify notification sent to tenant

4. **Payment Completion**
   - [ ] Make payment as tenant (test mode)
   - [ ] Verify webhook processes payment
   - [ ] Verify unit status changes to "rented"
   - [ ] Verify `is_occupied = true`
   - [ ] Verify `current_tenant_id` set
   - [ ] Verify agreement created
   - [ ] Verify property shows "Occupied" badge
   - [ ] Verify new applications blocked

5. **Property Visibility**
   - [ ] As other tenant, verify property visible but marked "Occupied"
   - [ ] Verify "Apply Now" button disabled/hidden
   - [ ] Verify error if trying to apply via API

6. **Lease End**
   - [ ] End tenancy as landlord/tenant
   - [ ] Verify property returns to "available"
   - [ ] Verify `is_occupied = false`
   - [ ] Verify `current_tenant_id = null`
   - [ ] Verify new applications allowed

## Database Migration Required

**Before deploying to production**, run this migration:

```bash
# In Supabase SQL Editor
\i database/add-unit-occupancy-columns.sql
```

This adds:
- `is_occupied` column to units table
- `current_tenant_id` column to units table  
- Trigger to maintain consistency
- Backfills existing data

## Monitoring and Validation

### Key Metrics to Monitor

1. **Application to Payment Conversion Rate**
   - Applications approved vs payments completed
   - Should be high (>80%)

2. **Property Lock Success Rate**  
   - Units marked rented after payment
   - Should be 100%

3. **Payment Webhook Success Rate**
   - Webhook processes without errors
   - Should be >99%

4. **Application Rejection Rate**
   - Applications rejected for occupied units
   - Should be low after property marked rented

### Database Queries for Validation

```sql
-- Check for properties marked rented but not occupied
SELECT * FROM units 
WHERE listing_status = 'rented' AND is_occupied = FALSE;
-- Should return 0 rows

-- Check for occupied properties without tenant
SELECT * FROM units 
WHERE is_occupied = TRUE AND current_tenant_id IS NULL;
-- Should return 0 rows

-- Check for orphaned applications (approved but no payment)
SELECT pa.*, u.listing_status 
FROM property_applications pa
JOIN units u ON pa.unit_id = u.id
WHERE pa.application_status = 'approved' 
  AND u.listing_status != 'rented'
  AND pa.created_at < NOW() - INTERVAL '7 days';
-- Review for stuck applications
```

## Rollback Plan

If issues arise, rollback procedure:

1. **Revert webhook changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Reset property statuses:**
   ```sql
   UPDATE units 
   SET is_occupied = FALSE, current_tenant_id = NULL 
   WHERE listing_status = 'rented' 
     AND id NOT IN (
       SELECT unit_id FROM tenancy_agreements 
       WHERE agreement_status = 'active'
     );
   ```

3. **Redeploy previous version**

## Future Enhancements

1. **Partial Payments:** Support installment payments for deposits
2. **Payment Reminders:** Automated reminders for pending payments
3. **Multi-Unit Applications:** Allow applying to multiple properties
4. **Waiting List:** Queue system for occupied properties
5. **Auto-Unlock:** Automatically unlock properties on lease expiry

## Support and Troubleshooting

### Common Issues

**Issue:** Property not showing "Occupied" after payment  
**Solution:** Check webhook logs, verify payment webhook URL configured

**Issue:** Application blocked for available property  
**Solution:** Check `listing_status` and `is_occupied` values, run consistency check

**Issue:** Invoice not generated after approval  
**Solution:** Check application service logs, verify invoice service accessible

## Related Documentation

- `MARKETPLACE_VISIBILITY_UPDATE.md` - Marketplace visibility implementation
- `database/add-invoice-system.sql` - Invoice system schema
- `database/schema.sql` - Base database schema
- Task requirements in root: `Task to be performed and achieved.md`

---

**Implementation Date:** January 10, 2026  
**Status:** ✅ Complete and Ready for Testing  
**Version:** 1.0
