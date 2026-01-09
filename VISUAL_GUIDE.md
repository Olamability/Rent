# Visual Guide - Tenant Application Visibility Features

This guide shows exactly where to find each feature in the RentFlow application.

## Feature 1: Applications Visible After Approval

### Location 1: ApplicationStatusCard (Top of Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT DASHBOARD                        │
├─────────────────────────────────────────────────────────────┤
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🏠 Application Status                                 ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                        ┃  │
│  ┃  ┌────────┐                                           ┃  │
│  ┃  │ 📸     │  Sunset Apartments - Unit 101             ┃  │
│  ┃  │ Image  │  📍 123 Main St, Downtown                 ┃  │
│  ┃  └────────┘  Move-in: Jan 15, 2026                    ┃  │
│  ┃                                                        ┃  │
│  ┃  ✅ Your application has been approved!               ┃  │
│  ┃  Please complete your payment of ₦1,200,000           ┃  │
│  ┃  (₦600,000 rent + ₦600,000 deposit)                   ┃  │
│  ┃                                                        ┃  │
│  ┃  [💳 Make Payment]  [❌ Withdraw]                     ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└─────────────────────────────────────────────────────────────┘
```

**What You See:**
- ✅ Property image (placeholder if none)
- ✅ Property name and unit number
- ✅ Full address with map pin icon
- ✅ Move-in date
- ✅ Payment amount breakdown
- ✅ "Make Payment" button (navigates to `/tenant/rent`)
- ✅ "Withdraw" button (optional)

**Status Displayed:**
- 🟡 Pending: "Under Review" badge
- 🟢 Approved: "Approved" badge + payment details

---

### Location 2: "My Applications" Section (Dashboard Sidebar)

```
┌─────────────────────────────────────────────────────────────┐
│                     TENANT DASHBOARD                        │
│                                                             │
│  [Left: Payment History]     [Right: Sidebar →]            │
│                              ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│                              ┃ My Applications          ┃   │
│                              ┃ Track all your property  ┃   │
│                              ┃ applications             ┃   │
│                              ┣━━━━━━━━━━━━━━━━━━━━━━━━━┫   │
│                              ┃                          ┃   │
│                              ┃ ┌────────────────────┐  ┃   │
│                              ┃ │ Sunset Apartments  │  ┃   │
│                              ┃ │ Unit 101          🟢│  ┃   │
│                              ┃ │ Submitted: Jan 10  │  ┃   │
│                              ┃ │ Move-in: Jan 15    │  ┃   │
│                              ┃ │ Approved - Pay Now │  ┃   │
│                              ┃ │ 💳 Click to pay    │  ┃   │
│                              ┃ └────────────────────┘  ┃   │
│                              ┃                          ┃   │
│                              ┃ ┌────────────────────┐  ┃   │
│                              ┃ │ Ocean View Condos  │  ┃   │
│                              ┃ │ Unit 205          🔴│  ┃   │
│                              ┃ │ Submitted: Jan 5   │  ┃   │
│                              ┃ │ Move-in: Feb 1     │  ┃   │
│                              ┃ │ rejected           │  ┃   │
│                              ┃ └────────────────────┘  ┃   │
│                              ┃                          ┃   │
│                              ┃ ┌────────────────────┐  ┃   │
│                              ┃ │ City Plaza Tower   │  ┃   │
│                              ┃ │ Unit 302          ⚪│  ┃   │
│                              ┃ │ Submitted: Jan 1   │  ┃   │
│                              ┃ │ Move-in: Jan 20    │  ┃   │
│                              ┃ │ withdrawn          │  ┃   │
│                              ┃ └────────────────────┘  ┃   │
│                              ┃                          ┃   │
│                              ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
└─────────────────────────────────────────────────────────────┘
```

**What You See:**
- ✅ ALL applications (no filtering by status)
- ✅ Color-coded status badges
- ✅ Property name and unit number
- ✅ Submission date
- ✅ Move-in date
- ✅ Status-specific actions (payment link for approved)
- ✅ **Always visible** (even when empty)
- ✅ Loading spinner while fetching

**Status Colors:**
- 🟢 Green: Approved - Pay Now
- 🔴 Red: rejected
- ⚪ Gray: withdrawn
- 🟡 Yellow: pending

---

## Feature 2: Approved Properties in Marketplace

### Location: Property Search Page (`/tenant/search`)

```
┌─────────────────────────────────────────────────────────────┐
│                     PROPERTY SEARCH                          │
├─────────────────────────────────────────────────────────────┤
│  [Search box ..................]  [Sort by Distance]        │
│                                                              │
│  ┏━━━━━━━━━━━━━┓ ┌──────────────┐ ┌──────────────┐        │
│  ┃📸 Property   ┃ │📸 Property    │ │📸 Property    │        │
│  ┃  Image       ┃ │  Image        │ │  Image        │        │
│  ┃              ┃ │               │ │               │        │
│  ┃ [Applied-    ┃ │               │ │               │        │
│  ┃  Awaiting    ┃ │               │ │               │        │
│  ┃  Payment]    ┃ │               │ │               │        │
│  ┗━━━━━━━━━━━━━┛ └──────────────┘ └──────────────┘        │
│  Sunset Apt       Ocean View       City Plaza              │
│  Unit 101         Unit 205         Unit 302                │
│  3 bed, 2 bath    2 bed, 2 bath    1 bed, 1 bath           │
│  ₦1,200,000/yr    ₦1,500,000/yr    ₦1,000,000/yr          │
│  [View Details]   [View Details]   [View Details]          │
│  [💳 Make Payment] [Apply Now]      [Apply Now]             │
└─────────────────────────────────────────────────────────────┘
```

**What You See:**
- ✅ Your approved property stays in the list
- ✅ "Applied - Awaiting Payment" badge (yellow/orange, top-left)
- ✅ Button changes from "Apply Now" to "Make Payment"
- ✅ Property image, details, and rent amount
- ✅ Clicking "Make Payment" goes to `/tenant/rent`

**Key Difference:**
- Regular properties: "Apply Now" button
- Your approved property: "Applied" badge + "Make Payment" button

---

## Feature 3: Payment Invoices Visible

### Location: Rent Payment Page (`/tenant/rent`)

```
┌─────────────────────────────────────────────────────────────┐
│                     RENT PAYMENT                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ⚠️ Action Required: Complete your application payment      │
│                                                              │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ 🏷️ APPLICATION PAYMENT                                 ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃                                                        ┃  │
│  ┃  Initial Payment Required                             ┃  │
│  ┃  Sunset Apartments - Unit 101                         ┃  │
│  ┃  Includes: Security Deposit + First Month Rent        ┃  │
│  ┃                                                        ┃  │
│  ┃                              ₦1,200,000                ┃  │
│  ┃                              Due: Jan 20, 2026         ┃  │
│  ┃                                                        ┃  │
│  ┃  ┌────────────────────────────────────────────┐       ┃  │
│  ┃  │ Invoice Breakdown                          │       ┃  │
│  ┃  ├────────────────────────────────────────────┤       ┃  │
│  ┃  │ Invoice #: INV-2026-001                    │       ┃  │
│  ┃  │ Rent Amount:        ₦600,000               │       ┃  │
│  ┃  │ Security Deposit:   ₦600,000               │       ┃  │
│  ┃  │ ────────────────────────────────────────── │       ┃  │
│  ┃  │ Total Amount:       ₦1,200,000             │       ┃  │
│  ┃  └────────────────────────────────────────────┘       ┃  │
│  ┃                                                        ┃  │
│  ┃  [💳 Pay with Card]  [🏦 Pay with Transfer]          ┃  │
│  ┃                                                        ┃  │
│  ┃  ℹ️ After payment, your tenancy agreement will be    ┃  │
│  ┃     automatically generated for signature.            ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└─────────────────────────────────────────────────────────────┘
```

**What You See:**
- ✅ Yellow alert banner at top ("Action Required")
- ✅ "Application Payment" badge
- ✅ Property name and unit
- ✅ Payment description
- ✅ Total amount (large, prominent)
- ✅ Due date
- ✅ **Invoice Breakdown** section with:
  - Invoice number
  - Rent amount line item
  - Security deposit line item
  - Total amount (highlighted)
- ✅ Payment buttons (Card & Transfer)
- ✅ Helpful info message

**Priority Display:**
Application payments show BEFORE regular rent payments to ensure they're not missed.

---

## Feature 4: Track Withdrawn/Rejected Applications

### Already Covered in Feature 1, Location 2

The "My Applications" section shows **ALL** statuses:

```
Status Badges:

🟢 Approved - Pay Now
   Green background, success color
   Shows payment link
   
🔴 rejected
   Red background, destructive color
   View only (no actions)
   
⚪ withdrawn
   Gray background, muted color
   View only (no actions)
   
🟡 pending
   Yellow background, warning color
   Shows "Under Review" status
```

---

## Navigation Map

```
Tenant Dashboard (/tenant/dashboard)
├── ApplicationStatusCard (Top)
│   └── Shows: Pending & Approved only
│       └── Actions: Make Payment, Withdraw
│
└── Sidebar (Right)
    └── My Applications (Always visible)
        └── Shows: ALL statuses (pending, approved, rejected, withdrawn)
            └── Actions: View details, Make payment (for approved)

Property Search (/tenant/search)
├── All Available Properties
└── Your Approved Properties (with badge)
    └── Action: Make Payment button

Rent Payment (/tenant/rent)
├── Application Payment (Priority)
│   ├── Property details
│   ├── Invoice breakdown
│   └── Payment buttons
└── Regular Rent (If active lease exists)
```

---

## Status at Each Stage

### Stage 1: Application Submitted
- Dashboard - ApplicationStatusCard: ✅ Shows "Under Review"
- Dashboard - My Applications: ✅ Shows pending (yellow)
- Property Search: ✅ Shows with "Apply Now" (can't apply again)

### Stage 2: Application Approved
- Dashboard - ApplicationStatusCard: ✅ Shows "Approved" with payment button
- Dashboard - My Applications: ✅ Shows "Approved - Pay Now" (green)
- Property Search: ✅ Shows "Applied" badge + "Make Payment" button
- Rent Payment: ✅ Shows invoice with breakdown

### Stage 3: Application Rejected
- Dashboard - ApplicationStatusCard: ❌ Removed (no action needed)
- Dashboard - My Applications: ✅ Shows "rejected" (red)
- Property Search: ❌ Removed from list (no longer applied)

### Stage 4: Application Withdrawn
- Dashboard - ApplicationStatusCard: ❌ Removed (no action needed)
- Dashboard - My Applications: ✅ Shows "withdrawn" (gray)
- Property Search: ❌ Removed from list (no longer applied)

---

## Color Legend

🟢 **Green (Success)**: Approved applications, paid invoices  
🔴 **Red (Destructive)**: Rejected applications, failed payments  
⚪ **Gray (Muted)**: Withdrawn applications, inactive items  
🟡 **Yellow (Warning)**: Pending applications, unpaid invoices  
🔵 **Blue (Info)**: General information, help text  

---

## Empty States

All sections show helpful messages when empty:

**My Applications (empty):**
```
┌─────────────────────────────┐
│ My Applications             │
├─────────────────────────────┤
│                             │
│  No applications yet        │
│  Your application history   │
│  will appear here           │
│                             │
└─────────────────────────────┘
```

**ApplicationStatusCard (no active apps):**
- Simply doesn't render (no empty card shown)

**Property Search (no properties):**
```
┌─────────────────────────────┐
│  🏠                          │
│                             │
│  No Properties Available    │
│                             │
│  Check back later for new   │
│  listings, or contact us    │
│  for assistance.            │
└─────────────────────────────┘
```

---

## Loading States

All sections show spinners during data fetch:

```
┌─────────────────────────────┐
│ My Applications             │
├─────────────────────────────┤
│                             │
│         ⏳                  │
│      Loading...             │
│                             │
└─────────────────────────────┘
```

This prevents confusing empty states while data is being fetched.

---

Last Updated: January 2026
