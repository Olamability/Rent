# Tenant Application Journey Guide

## Overview

This document explains the complete tenant application journey in RentFlow, from browsing properties to moving in. It addresses common questions about property visibility at each stage.

## The Complete Journey

### Stage 1: Browsing Properties
**Status**: No application yet  
**Unit Status**: `available`  
**What Tenant Sees**:
- ✅ Properties visible in marketplace (`/tenant/search`)
- ✅ Properties visible on home page
- ✅ Can view property details
- ✅ Can submit application

**Why**: Units with `listing_status = 'available'` are publicly listed and shown to all users.

---

### Stage 2: Application Submitted
**Status**: Application pending review  
**Unit Status**: `available` (unchanged)  
**What Tenant Sees**:
- ✅ Property still visible in marketplace (other tenants can still apply)
- ✅ ApplicationStatusCard on dashboard shows "Under Review"
- ✅ Can withdraw application

**Why**: Until landlord approves, the unit remains available for other applications.

---

### Stage 3: Application Approved ⚠️ **THIS IS WHERE CONFUSION HAPPENS**
**Status**: Application approved, awaiting payment  
**Unit Status**: `applied`  
**What Tenant Sees**:
- ❌ Property **REMOVED** from marketplace
- ✅ ApplicationStatusCard shows **"Approved - Awaiting Payment"** with:
  - Property image
  - Property name and address
  - Unit number
  - Move-in date
  - Payment amount (rent + deposit)
  - "Make Payment" button
- ✅ Can view payment details on `/tenant/rent` page
- ✅ Can still withdraw application

**Why Property Is Hidden**:
- When application is approved, unit status changes to `'applied'`
- Units with `'applied'` status are intentionally NOT shown in marketplace
- This prevents other tenants from applying to the same unit
- The property is now "reserved" for the approved tenant

**Important**: The property doesn't disappear completely - it's prominently shown in the ApplicationStatusCard on the tenant's dashboard!

---

### Stage 4: Payment Made
**Status**: Payment completed, agreement being prepared  
**Unit Status**: `applied` (unchanged)  
**What Tenant Sees**:
- ❌ Property still not in marketplace
- ✅ ApplicationStatusCard shows **"Payment Received - Agreement Being Prepared"**
- ✅ Can view agreements page (agreement will appear when ready)

**Why**: Landlord is preparing the tenancy agreement. Unit remains reserved.

---

### Stage 5: Agreement Ready for Signing
**Status**: Agreement sent to tenant  
**Unit Status**: `applied`  
**Agreement Status**: `draft` or `sent`  
**What Tenant Sees**:
- ❌ Property still not in marketplace
- ✅ ApplicationStatusCard shows **"Agreement Ready for Signing"**
- ✅ Agreement appears on `/tenant/agreements` page
- ✅ Can review and sign agreement
- ✅ Notification about agreement ready to sign

**Why**: Tenant needs to sign the agreement to activate the tenancy.

---

### Stage 6: Agreement Signed & Active ✅
**Status**: Tenancy active  
**Unit Status**: `rented`  
**Agreement Status**: `active`  
**What Tenant Sees**:
- ❌ Property not in marketplace (correctly - it's rented!)
- ✅ ApplicationStatusCard disappears (no longer needed)
- ✅ Property appears in **"Current Lease"** section on dashboard with:
  - Property image
  - Property name and address
  - Unit number
  - Lease end date
  - Monthly rent amount
  - "Pay Rent" button
  - "End Tenancy" button
- ✅ Can make rent payments
- ✅ Can submit maintenance requests
- ✅ Can access all tenant features

**Why**: Tenancy is now active. The property is no longer available because the tenant lives there!

---

## Common Questions

### Q: "My application was approved but I can't see the property anymore!"
**A**: This is correct! After approval, the property is removed from the public marketplace to reserve it for you. Check your dashboard - the ApplicationStatusCard will show your approved application with all property details, payment information, and next steps.

### Q: "Where do I see my approved property?"
**A**: On your tenant dashboard (`/tenant/dashboard`), look at the ApplicationStatusCard at the top. It shows:
- Property image
- Property name and address
- Payment details
- Next steps

### Q: "When will the property show in my 'Current Lease'?"
**A**: The property will appear in the "Current Lease" section only after:
1. You complete the payment
2. The agreement is prepared and sent to you
3. You sign the agreement
4. The agreement status becomes `active`

### Q: "Can other tenants apply to my approved property?"
**A**: No! Once your application is approved, the unit status changes to `'applied'`, which removes it from the public marketplace. This ensures no one else can apply.

### Q: "What if I want to withdraw my approved application?"
**A**: You can withdraw it from the ApplicationStatusCard by clicking the "Withdraw" button. The property will then become available again for other tenants.

---

## For Developers

### Key Database Fields

**units table:**
- `listing_status`: Controls marketplace visibility
  - `'available'` → Shows in marketplace
  - `'applied'` → Hidden from marketplace (application approved)
  - `'rented'` → Hidden from marketplace (tenancy active)
  - `'unlisted'` → Hidden from marketplace (not listed by landlord)

**property_applications table:**
- `application_status`: Tracks application state
  - `'pending'` → Awaiting landlord review
  - `'approved'` → Approved, awaiting payment
  - `'rejected'` → Declined
  - `'withdrawn'` → Cancelled by tenant

**tenancy_agreements table:**
- `agreement_status`: Tracks agreement state
  - `'draft'` → Being prepared
  - `'sent'` → Sent to tenant for signing
  - `'signed'` → Both parties signed (triggers activation)
  - `'active'` → Currently active tenancy
  - `'expired'` → Lease period ended
  - `'terminated'` → Ended early

### Key Components

1. **ApplicationStatusCard** (`src/components/tenant/ApplicationStatusCard.tsx`)
   - Shows pending and approved applications
   - Displays property details for approved applications
   - Guides tenant through payment and signing process

2. **Dashboard Lease Overview** (`src/pages/tenant/Dashboard.tsx`)
   - Shows current active lease (if exists)
   - Shows count of pending applications when no active lease
   - Fetches from `tenancy_agreements` where `agreement_status = 'active'`

3. **PropertySearch** (`src/pages/tenant/PropertySearch.tsx`)
   - Shows only units with `listing_status = 'available'`
   - Provides helpful guidance when no properties found

### Key Services

1. **fetchAvailableProperties** (`src/services/propertyService.ts`)
   - Fetches units WHERE `listing_status = 'available'`
   - Used by marketplace and property search

2. **fetchApplicationsByTenant** (`src/services/applicationService.ts`)
   - Fetches all applications for tenant
   - Includes property and unit details via joins

3. **fetchCurrentLease** (`src/services/tenantDashboardService.ts`)
   - Fetches active agreement WHERE `agreement_status = 'active'`
   - Used by dashboard to show current lease

### Database Triggers

1. **Application Approval** (applicationService.ts)
   - Updates unit: `listing_status = 'applied'`
   - Creates invoice for payment

2. **Agreement Activation** (database/add-esignature-workflow.sql)
   - Updates unit: `listing_status = 'rented'`
   - Updates agreement: `agreement_status = 'active'`
   - Sends notifications

3. **Tenancy Termination** (agreementService.ts)
   - Updates unit: `listing_status = 'available'`
   - Updates agreement: `agreement_status = 'terminated'`

---

## Testing the Journey

To test the complete journey:

1. **As Tenant**: 
   - Browse properties at `/tenant/search`
   - Apply for a property
   - Check dashboard - should see "Under Review" in ApplicationStatusCard

2. **As Landlord**:
   - Approve the application at `/landlord/units`

3. **As Tenant**:
   - Refresh dashboard
   - Property should be GONE from marketplace (✅ correct!)
   - ApplicationStatusCard should show approved application with property details
   - Click "Make Payment" button

4. **After Payment**:
   - ApplicationStatusCard should update to show payment received
   - Check `/tenant/agreements` for agreement (may take time to prepare)

5. **After Signing**:
   - ApplicationStatusCard disappears
   - Property appears in "Current Lease" section
   - Can pay rent, submit maintenance requests, etc.

---

## Related Files

- `src/components/tenant/ApplicationStatusCard.tsx` - Application status display
- `src/pages/tenant/Dashboard.tsx` - Tenant dashboard
- `src/pages/tenant/PropertySearch.tsx` - Property marketplace
- `src/services/applicationService.ts` - Application logic
- `src/services/propertyService.ts` - Property fetching logic
- `src/services/tenantDashboardService.ts` - Dashboard data logic
- `database/add-esignature-workflow.sql` - Agreement activation trigger
