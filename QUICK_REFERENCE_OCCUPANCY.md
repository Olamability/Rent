# Quick Reference: Property Occupancy Validation

## What Was Implemented ✅

This implementation addresses **Task 1: Property Visibility, Application Flow, and Occupancy Validation** from your requirements document.

## Key Changes

### 1. Payment-Based Occupancy Validation
**Where:** `/app/api/webhooks/paystack/route.ts` (Lines 299-318)

**What happens:** When a tenant completes payment for an approved application:
- ✅ Unit `listing_status` → `'rented'`
- ✅ Unit `is_occupied` → `true`
- ✅ Unit `current_tenant_id` → tenant's ID
- ✅ Tenancy agreement created
- ✅ Notifications sent

**Result:** Property is now locked and occupied - no more applications allowed

### 2. Application Blocking for Occupied Properties
**Where:** `/src/services/applicationService.ts` (Lines 91-105)

**What happens:** When a tenant tries to apply:
- ✅ Checks if unit is `rented` OR `is_occupied`
- ✅ Throws error: "This property is already occupied and not available for applications"

**Result:** Occupied properties cannot receive new applications

### 3. Database Schema Enhancement
**Where:** `/database/add-unit-occupancy-columns.sql`

**Adds to `units` table:**
- `is_occupied` (BOOLEAN) - Explicit occupancy flag
- `current_tenant_id` (UUID) - Links to current tenant
- Trigger to maintain consistency
- Backfill for existing data

**Result:** Better tracking and data integrity

## Property Lifecycle

```
1. AVAILABLE
   └─> Property listed, visible on marketplace
       Badge: None
       Button: "Apply Now" ✅
       
2. APPLIED (after approval)
   └─> Application approved, invoice generated
       Badge: "Applied - Awaiting Payment" (for applicant)
       Button: "Make Payment" ✅
       Other users see: "Applied - Pending Payment" 🟠
       
3. RENTED (after payment) ⭐ NEW BEHAVIOR
   └─> Payment completed, property occupied
       Badge: "Occupied" 🔴
       Button: "Not Available" ❌
       is_occupied: TRUE
       current_tenant_id: SET
       
4. AVAILABLE (after lease ends)
   └─> Lease terminated, property unlocked
       Badge: None
       Button: "Apply Now" ✅
```

## What This Solves

### Before (Problem):
- ❌ Properties disappeared from marketplace after application
- ❌ Unclear when property is truly occupied
- ❌ Approval could lock property without payment
- ❌ Other tenants couldn't see property status

### After (Solution):
- ✅ Properties always visible with correct status
- ✅ Payment = occupancy (clear validation)
- ✅ Property locks only after payment success
- ✅ Clear badges show property state to all users

## User Experience Flow

### For Applicant (Tenant who applied):
1. Browse marketplace → See property
2. Apply for property → Still visible, status unchanged
3. Get approval notification → "Proceed to Payment" button appears
4. See invoice on payment page → Details of rent + deposit
5. Make payment → Property marked "Occupied", agreement generated
6. Sign agreement → Move in 🎉

### For Other Tenants:
1. Browse marketplace → See ALL properties (available, applied, rented)
2. See badges:
   - 🟢 Available: Can apply
   - 🟡 Applied (if you applied): Make payment
   - 🟠 Applied (someone else): Not available yet
   - 🔴 Occupied: Cannot apply

### For Landlords:
1. List property → Appears on marketplace
2. Receive applications → Review and approve
3. Invoice auto-generated → Tenant notified
4. Payment received → Property auto-locked
5. Agreement generated → Both parties sign

## Where Users See Changes

### Tenant Dashboard
- **"My Applications"** section shows all applications
- **Approved applications** have "Proceed to Payment" button
- **Status badges** show application state

**File:** `/src/pages/tenant/Dashboard.tsx`

### Property Search/Marketplace
- **All properties visible** regardless of status
- **Status badges** on property cards
- **Action buttons** change based on status

**File:** `/src/pages/tenant/PropertySearch.tsx`

### Payment Page
- **Pending invoices** displayed prominently
- **Invoice breakdown** shows rent + deposit
- **One-click payment** with Paystack

**File:** `/src/pages/tenant/RentPayment.tsx`

## Deployment Checklist

### Before Deploying:

1. **Run Database Migration:**
   ```sql
   -- In Supabase SQL Editor
   \i database/add-unit-occupancy-columns.sql
   ```

2. **Verify Environment Variables:**
   - `PAYSTACK_SECRET_KEY` (for webhook verification)
   - `SUPABASE_SERVICE_ROLE_KEY` (for server operations)

3. **Configure Webhook URL:**
   - Set in Paystack Dashboard: `https://yourdomain.com/api/webhooks/paystack`

### After Deploying:

1. **Test with Test Payment:**
   - Use Paystack test cards
   - Verify property status changes
   - Check webhook logs

2. **Monitor:**
   - Webhook success rate
   - Application blocking
   - Property status accuracy

## Testing Scenarios

### Scenario 1: Complete Application Flow
1. As Tenant A: Apply for Property X
2. As Landlord: Approve application
3. As Tenant A: Verify payment button appears
4. As Tenant A: Complete payment (test mode)
5. **Verify:** Property marked "Occupied"
6. As Tenant B: Try to apply → Should be blocked ✅

### Scenario 2: Multiple Applicants
1. As Tenant A: Apply for Property X (first)
2. As Tenant B: Apply for Property X (second)
3. As Landlord: Approve Tenant A's application
4. **Verify:** Property shows "Applied" but Tenant B can still see it
5. As Tenant A: Complete payment
6. **Verify:** Property marked "Occupied", Tenant B's application auto-rejected or disabled

### Scenario 3: Property Visibility
1. As Guest (not logged in): Browse marketplace
2. **Verify:** See properties with statuses (available, applied, occupied)
3. As Tenant: Browse marketplace
4. **Verify:** See same properties, with personalized badges if applied

## Files Changed

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `app/api/webhooks/paystack/route.ts` | Payment webhook - marks occupied | +18 |
| `src/services/applicationService.ts` | Blocks occupied property applications | +9 |
| `database/add-unit-occupancy-columns.sql` | Database migration | +96 (new file) |
| `PROPERTY_OCCUPANCY_IMPLEMENTATION.md` | Full documentation | +373 (new file) |

## Support

### If Property Not Marked Occupied After Payment:

1. Check webhook logs in Vercel/deployment platform
2. Verify Paystack webhook URL is correct
3. Check database: `SELECT * FROM units WHERE id = 'unit-id'`
4. Verify webhook signature validation passing

### If Application Not Blocked for Occupied Property:

1. Check unit status: `SELECT listing_status, is_occupied FROM units WHERE id = 'unit-id'`
2. Run consistency check from implementation guide
3. Verify trigger is active: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_maintain_unit_occupancy'`

## Next Steps

1. ✅ Code changes complete
2. ✅ Documentation complete
3. ✅ Database migration ready
4. ⏳ Deploy to staging
5. ⏳ Run database migration
6. ⏳ Test complete flow
7. ⏳ Deploy to production

---

**Need Help?** See `PROPERTY_OCCUPANCY_IMPLEMENTATION.md` for detailed technical documentation.

**Last Updated:** January 10, 2026
