# Tenant Application Visibility - Quick Reference

## Where to Find Each Feature

### 1. Active Applications (Pending & Approved)
**Location**: Top of Tenant Dashboard (`/tenant/dashboard`)
**Component**: ApplicationStatusCard
**Shows**:
- ✅ Pending: "Under Review" status
- ✅ Approved: Property details + "Make Payment" button
- ✅ Option to withdraw

### 2. All Applications History (Including Withdrawn/Rejected)
**Location**: Right sidebar of Tenant Dashboard (`/tenant/dashboard`)
**Section**: "My Applications"
**Shows**:
- ✅ ALL application statuses
- ✅ Color-coded badges (green/red/gray/yellow)
- ✅ Submission & move-in dates
- ✅ Always visible (even when empty)

### 3. Approved Properties in Marketplace
**Location**: Property Search (`/tenant/search`)
**Shows**:
- ✅ Properties with approved applications
- ✅ "Applied - Awaiting Payment" badge
- ✅ "Make Payment" button (not "Apply Now")

### 4. Payment Invoices
**Location**: Rent Payment page (`/tenant/rent`)
**Shows**:
- ✅ Application payment section (yellow alert)
- ✅ Invoice breakdown (rent + deposit)
- ✅ Payment buttons
- ✅ Property details

---

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ APPLICATION STATUS CARD (Active Apps Only)            │ │
│  ├───────────────────────────────────────────────────────┤ │
│  │ 📸 Property Image   | ✅ Approved                     │ │
│  │ Property Name       |                                  │ │
│  │ Unit 101           | Move-in: Jan 15, 2026            │ │
│  │ 123 Main St        | Amount: ₦1,200,000              │ │
│  │                    |                                  │ │
│  │ [Make Payment] [Withdraw]                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────┬──────────────────────────────────────┐ │
│  │ Payment History│  SIDEBAR:                            │ │
│  │                │  ┌──────────────────────────────────┐│ │
│  │ (2 columns)    │  │ My Applications (Always Visible) ││ │
│  │                │  ├──────────────────────────────────┤│ │
│  │                │  │ ✅ Sunset Apartments, Unit 101   ││ │
│  │                │  │    Approved - Pay Now            ││ │
│  │                │  │    Submitted: Jan 10             ││ │
│  │                │  │                                  ││ │
│  │                │  │ ❌ Ocean View, Unit 205          ││ │
│  │                │  │    rejected                      ││ │
│  │                │  │    Submitted: Jan 5              ││ │
│  │                │  │                                  ││ │
│  │                │  │ 🔄 City Plaza, Unit 302          ││ │
│  │                │  │    withdrawn                     ││ │
│  │                │  │    Submitted: Jan 1              ││ │
│  │                │  └──────────────────────────────────┘│ │
│  └────────────────┴──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     PROPERTY SEARCH                          │
├─────────────────────────────────────────────────────────────┤
│ [Search box]  [Sort by Distance]                            │
│                                                              │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │📸 [Applied]  │ │📸 Available   │ │📸 Available   │        │
│ │Sunset Apt    │ │Ocean View     │ │City Plaza     │        │
│ │Unit 101      │ │Unit 205       │ │Unit 302       │        │
│ │₦1,200,000    │ │₦1,500,000     │ │₦1,000,000     │        │
│ │[Make Payment]│ │[Apply Now]    │ │[Apply Now]    │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     RENT PAYMENT PAGE                        │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Action Required: Complete your application payment       │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ APPLICATION PAYMENT                                       ││
│ │                                                           ││
│ │ Initial Payment Required                                 ││
│ │ Sunset Apartments - Unit 101                             ││
│ │ Includes: Security Deposit + First Month Rent            ││
│ │                                                           ││
│ │ ₦1,200,000                                               ││
│ │ Due: Jan 20, 2026                                        ││
│ │                                                           ││
│ │ Invoice Breakdown:                                        ││
│ │ ─────────────────────────────────────                    ││
│ │ Invoice #: INV-2026-001                                  ││
│ │ Rent Amount: ₦600,000                                    ││
│ │ Security Deposit: ₦600,000                               ││
│ │ ─────────────────────────────────────                    ││
│ │ Total Amount: ₦1,200,000                                 ││
│ │                                                           ││
│ │ [Pay with Card] [Pay with Transfer]                      ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Status Badge Colors

| Status | Badge | Location | Action Available |
|--------|-------|----------|-----------------|
| 🟡 Pending | Yellow | ApplicationStatusCard + My Applications | Withdraw |
| 🟢 Approved | Green | ApplicationStatusCard + My Applications + Property Search | Make Payment, Withdraw |
| 🔴 Rejected | Red | My Applications only | None (view only) |
| ⚪ Withdrawn | Gray | My Applications only | None (view only) |

---

## User Journey

```
1. Browse Properties
   ↓ (Click "Apply Now")
2. Submit Application
   ↓ (Dashboard: See "Under Review" in ApplicationStatusCard)
   ↓ (Dashboard: See in "My Applications" - pending)
3. Landlord Approves
   ↓ (Dashboard: See "Approved" with payment button in ApplicationStatusCard)
   ↓ (Dashboard: See in "My Applications" - "Approved - Pay Now")
   ↓ (Property Search: See property with "Applied" badge + "Make Payment")
   ↓ (Rent Payment: See invoice with breakdown)
4. Make Payment
   ↓ (Click "Make Payment" from any location)
   ↓ (Complete payment on /tenant/rent)
5. Sign Agreement
   ↓ (Go to /tenant/agreements when ready)
6. Active Tenancy
   ↓ (ApplicationStatusCard disappears - no longer needed)
   ↓ (Dashboard: See "Current Lease" section)
   ↓ ("My Applications": Still visible - shows as "approved")
```

---

## Quick Troubleshooting

### "Where are my applications?"
➡️ Check "My Applications" section on dashboard (right sidebar)
➡️ It's ALWAYS visible now, even when empty

### "I can't see my approved application"
➡️ Check ApplicationStatusCard at TOP of dashboard
➡️ Check "My Applications" in RIGHT sidebar
➡️ Check Property Search - your property should have "Applied" badge

### "Where's my invoice?"
➡️ Go to /tenant/rent
➡️ Look for yellow "Action Required" alert
➡️ Invoice breakdown shown below

### "My application disappeared after approval"
✅ It DIDN'T disappear! It's in TWO places:
1. ApplicationStatusCard (top of dashboard)
2. "My Applications" section (sidebar)

### "I withdrew my application - can I still see it?"
✅ YES! Check "My Applications" section
✅ Shows with gray "withdrawn" badge

---

## For Developers

### Key Functions

```typescript
// Fetch ALL applications (no filter)
fetchApplicationsByTenant(tenantId)
  → Returns: pending, approved, rejected, withdrawn

// Fetch properties with approved applications
fetchAppliedPropertiesForTenant(tenantId)
  → Returns: Properties where user has approved app
  → Filter: application_status='approved' AND listing_status='applied'

// Fetch invoices
fetchTenantInvoices(tenantId)
  → Returns: All invoices including application payments

// Fetch dashboard data
fetchTenantDashboardData(tenantId)
  → Returns: currentLease, payments, applications, etc.
```

### Component Hierarchy

```
Dashboard.tsx
├── ApplicationStatusCard.tsx (Active apps: pending + approved)
├── Lease Overview (Current lease or "No active lease")
└── Sidebar
    ├── Maintenance Requests
    ├── Documents
    └── My Applications (ALL apps: pending + approved + rejected + withdrawn)

PropertySearch.tsx
├── fetchAvailableProperties() - Available units
├── fetchAppliedPropertiesForTenant() - Approved applications
└── Display both with appropriate badges

RentPayment.tsx
├── Pending Application Payment (Priority)
├── Current Rent Due
└── Payment History
```

---

## Testing Checklist

- [ ] ApplicationStatusCard shows pending application
- [ ] ApplicationStatusCard shows approved application with payment button
- [ ] "My Applications" always visible (even when empty)
- [ ] "My Applications" shows all statuses with correct badges
- [ ] Property Search shows approved property with "Applied" badge
- [ ] Property Search changes button to "Make Payment"
- [ ] Rent Payment page shows application payment section
- [ ] Rent Payment page shows invoice breakdown
- [ ] Withdrawn applications visible in "My Applications"
- [ ] Rejected applications visible in "My Applications"

---

Last Updated: January 2026
