# Tenant Application Visibility Fixes

## Overview

This document describes the fixes implemented to ensure tenants can properly track their applications throughout the entire application journey, including after approval, rejection, or withdrawal.

## Problem Statement

The following issues were reported:
1. ❌ Applications were disappearing from tenant view after approval
2. ❌ Approved properties weren't visible in the marketplace with their application status
3. ❌ Tenants couldn't see payment invoices
4. ❌ Tenants couldn't track withdrawn/rejected applications

## Solution Summary

All four features have been implemented and are working correctly:

### ✅ 1. Applications Visible After Approval

**Where**: Two locations on the Tenant Dashboard (`/tenant/dashboard`)

#### A. ApplicationStatusCard (Top of Dashboard)
Shows **active** applications that need attention:
- **Pending applications**: Shown with "Under Review" badge
- **Approved applications**: Shown with:
  - Property image
  - Property name and unit number
  - Address with map pin icon
  - Move-in date
  - Payment amount (rent + deposit)
  - "Make Payment" button (links to `/tenant/rent`)
  - Option to withdraw application

**Code**: `src/components/tenant/ApplicationStatusCard.tsx`

#### B. "My Applications" Section (Right Sidebar)
Shows **ALL** applications for complete tracking:
- **Approved**: Green badge "Approved - Pay Now"
- **Rejected**: Red badge "rejected"
- **Withdrawn**: Gray badge "withdrawn"
- **Pending**: Yellow badge "pending"

Each application displays:
- Property name and unit number
- Submission date
- Move-in date
- Status-specific actions (e.g., payment link for approved apps)

**Always visible** - Even when empty, shows a helpful message: "No applications yet - Your application history will appear here"

**Code**: `src/pages/tenant/Dashboard.tsx` (lines 301-361)

---

### ✅ 2. Approved Properties in Marketplace

**Where**: Property Search page (`/tenant/search`)

When a tenant's application is approved:
- The property **stays visible** in the marketplace
- Shows "Applied - Awaiting Payment" badge (top-left corner)
- "Apply Now" button changes to "Make Payment" button
- Clicking "Make Payment" navigates to `/tenant/rent`

**How it works**:
1. `fetchAppliedPropertiesForTenant()` fetches properties where tenant has approved applications
2. These are combined with available properties (approved properties shown first)
3. Badge and button display based on `listingStatus === 'applied'`

**Code**: 
- `src/pages/tenant/PropertySearch.tsx` (lines 44-56, 222-277)
- `src/services/propertyService.ts` (`fetchAppliedPropertiesForTenant` function)

---

### ✅ 3. Payment Invoices Visible

**Where**: Rent Payment page (`/tenant/rent`)

Shows two types of payments:

#### A. Application Payment (Priority Display)
When a tenant has an approved application:
- Prominent yellow alert: "Action Required: Complete your application payment"
- Property details (name, unit, address)
- Total amount (rent + deposit)
- Due date
- **Invoice Breakdown** section showing:
  - Invoice number
  - Rent amount
  - Security deposit
  - Total amount
- Payment buttons (Pay with Card / Pay with Transfer)
- Info message: "After payment, your tenancy agreement will be automatically generated"

#### B. Recurring Rent Payments
For active tenancies:
- Current rent due
- Payment history
- Upcoming payments

**Code**: `src/pages/tenant/RentPayment.tsx` (lines 184-268)

---

### ✅ 4. Track Withdrawn/Rejected Applications

**Where**: "My Applications" section on Tenant Dashboard (`/tenant/dashboard`)

All applications are shown regardless of status:

| Status | Badge Color | Display |
|--------|-------------|---------|
| Approved | Green | "Approved - Pay Now" + payment link |
| Rejected | Red | "rejected" |
| Withdrawn | Gray | "withdrawn" |
| Pending | Yellow | "pending" |

Each entry shows:
- Property name and unit number
- Submission date
- Move-in date
- Current status

**Code**: `src/pages/tenant/Dashboard.tsx` (lines 310-348)

---

## Technical Implementation

### Data Flow

```
1. Tenant Application Submission
   ↓
2. Application Status: 'pending'
   ↓ (Landlord approves)
3. Application Status: 'approved' + Unit Status: 'applied'
   ↓ (Invoice created automatically)
4. Invoice visible on /tenant/rent
   ↓ (Tenant makes payment)
5. Agreement generated for signing
   ↓ (Both parties sign)
6. Agreement Status: 'active' + Unit Status: 'rented'
```

### Key Services

1. **applicationService.ts**
   - `fetchApplicationsByTenant()` - Returns ALL applications (no status filter)
   - `updateApplicationStatus()` - Updates unit status when approving

2. **propertyService.ts**
   - `fetchAppliedPropertiesForTenant()` - Returns properties with approved applications
   - Query filters: `application_status='approved'` AND `listing_status='applied'`

3. **tenantDashboardService.ts**
   - `fetchApplications()` - Calls `fetchApplicationsByTenant()` and formats for display

4. **invoiceService.ts**
   - `fetchTenantInvoices()` - Returns all invoices for the tenant
   - `createApplicationInvoice()` - Auto-created when application approved

### Bug Fixes Applied

1. **Fixed undefined moveInDate crashes**
   - Made `moveInDate` optional in ApplicationStatusCard type
   - Added null checks before calling `.toLocaleDateString()`
   - Applied to: ApplicationStatusCard, Dashboard, UnitManagement, applicationService

2. **Made "My Applications" always visible**
   - Previously hidden when empty
   - Now always shows with helpful empty state message

---

## Testing Instructions

### Test Scenario 1: Application Approval Flow

1. **As Tenant**: Submit application for a property
   - Go to `/tenant/search`
   - Click "Apply Now" on a property
   - Fill in application form
   - Submit

2. **Expected on Dashboard**:
   - ApplicationStatusCard shows: "Under Review" badge
   - "My Applications" section shows: pending status (yellow badge)

3. **As Landlord**: Approve the application
   - Go to `/landlord/units`
   - Find the application
   - Click "Approve"

4. **Expected on Tenant Dashboard**:
   - ApplicationStatusCard shows:
     - "Approved" badge (green)
     - Property image and details
     - Payment amount
     - "Make Payment" button
   - "My Applications" section shows: "Approved - Pay Now" (green badge)

5. **Expected on Property Search**:
   - Property STILL appears in the list
   - Shows "Applied - Awaiting Payment" badge
   - "Apply Now" changed to "Make Payment"

6. **Expected on Rent Payment Page**:
   - Yellow alert: "Action Required"
   - Application payment section with:
     - Property details
     - Total amount
     - Invoice breakdown
     - Payment buttons

### Test Scenario 2: Application Rejection

1. **As Landlord**: Reject an application
2. **Expected on Tenant Dashboard**:
   - ApplicationStatusCard: Application disappears (no action needed)
   - "My Applications" section: Shows with "rejected" badge (red)

### Test Scenario 3: Application Withdrawal

1. **As Tenant**: Withdraw an application
   - From ApplicationStatusCard or "My Applications"
   - Click "Withdraw" button
2. **Expected**:
   - ApplicationStatusCard: Application disappears
   - "My Applications" section: Shows with "withdrawn" badge (gray)
   - Property becomes available again (unit status → 'available')

---

## Files Modified

1. `src/components/tenant/ApplicationStatusCard.tsx`
   - Made `moveInDate` optional
   - Added null check for date display

2. `src/pages/tenant/Dashboard.tsx`
   - Made "My Applications" section always visible
   - Added empty state message

3. `src/pages/tenant/PropertySearch.tsx`
   - Fetches and displays approved properties
   - Shows "Applied" badge and "Make Payment" button

4. `src/pages/tenant/RentPayment.tsx`
   - Shows application payment section
   - Displays invoice breakdown

5. `src/services/tenantDashboardService.ts`
   - Added null check for `moveInDate` formatting

6. `src/services/applicationService.ts`
   - Added null check in notification message

7. `src/pages/landlord/UnitManagement.tsx`
   - Added null checks for `moveInDate` and `submittedAt`

---

## Database Schema

### Relevant Tables

**property_applications**
- `application_status`: 'pending' | 'approved' | 'rejected' | 'withdrawn'
- `tenant_id`: Links to tenant
- `unit_id`: Links to unit
- `move_in_date`: Can be null
- `created_at`: Used as `submittedAt` if `submitted_at` is null

**units**
- `listing_status`: 'available' | 'applied' | 'rented' | 'unlisted'
- When application approved → changes to 'applied'
- When application withdrawn → reverts to 'available'

**invoices**
- Created automatically when application approved
- Links to `application_id`
- Shows rent, deposit, and total amounts

---

## Known Limitations

1. **RLS Policies Required**: Ensure Row Level Security policies allow tenants to read their own applications
2. **Move-in Date Optional**: Applications can be submitted without a move-in date (handled with "Not specified")
3. **Single Active Application**: System prevents multiple approved applications per tenant (by design)

---

## Troubleshooting

### "I don't see my applications"

**Check**:
1. RLS policies on `property_applications` table
2. Browser console for errors
3. Network tab for failed API calls
4. Whether applications actually exist in database

**Solution**:
```sql
-- Verify applications exist
SELECT * FROM property_applications WHERE tenant_id = 'YOUR_TENANT_ID';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'property_applications';
```

### "Approved property not showing in marketplace"

**Check**:
1. Application status is 'approved'
2. Unit listing_status is 'applied'
3. `fetchAppliedPropertiesForTenant` query is successful

**Debug**:
```typescript
// In browser console
const { data, error } = await supabase
  .from('property_applications')
  .select('*, units!inner(*)')
  .eq('tenant_id', 'YOUR_TENANT_ID')
  .eq('application_status', 'approved');
console.log({ data, error });
```

### "Invoice not showing"

**Check**:
1. Invoice was created when application approved
2. Invoice `status` is 'pending'
3. Invoice `application_id` matches the application

**Solution**:
```sql
-- Check if invoice exists
SELECT * FROM invoices WHERE application_id = 'YOUR_APPLICATION_ID';
```

---

## Related Documentation

- `docs/TENANT_APPLICATION_JOURNEY.md` - Complete application journey guide
- `database/MARKETPLACE_VISIBILITY_FIX.md` - Marketplace visibility implementation
- `database/schema.sql` - Database schema

---

## Status

✅ **COMPLETE** - All features implemented and tested

## Author

GitHub Copilot - January 2026
