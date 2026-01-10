# Visual UI Flow Guide - Property Occupancy Validation

## Overview

This guide shows the **user interface changes** and **visual flow** for the property occupancy validation feature.

---

## 🎨 Status Badge Colors

| Status | Color | Badge Text | User Can Apply |
|--------|-------|-----------|----------------|
| Available | None | - | ✅ Yes |
| Applied (You) | Yellow (`bg-yellow-600`) | "Applied - Awaiting Payment" | 🔒 Payment needed |
| Applied (Other) | Orange (`bg-orange-600`) | "Applied - Pending Payment" | ❌ No |
| Occupied | Red (`bg-red-600`) | "Occupied" | ❌ No |

---

## 📱 Property Card Display

### State 1: Available Property
```
┌─────────────────────────────────┐
│  [Property Image]                │
│                                  │
├─────────────────────────────────┤
│  Luxury Apartment                │
│  📍 Lagos, Nigeria               │
│  🛏️ 2 bed  🚿 2 bath            │
│                                  │
│  ₦500,000/annum                  │
│                                  │
│  [View Details] [Apply Now]     │
└─────────────────────────────────┘
```
**Actions:** 
- View Details ✅
- Apply Now ✅

---

### State 2: Applied Property (Your Application)
```
┌─────────────────────────────────┐
│  [Property Image]                │
│  🟡 Applied - Awaiting Payment   │ ← YELLOW BADGE
├─────────────────────────────────┤
│  Luxury Apartment                │
│  📍 Lagos, Nigeria               │
│  🛏️ 2 bed  🚿 2 bath            │
│                                  │
│  ₦500,000/annum                  │
│                                  │
│  [View Details] [Make Payment]  │ ← PAYMENT CTA
└─────────────────────────────────┘
```
**Actions:**
- View Details ✅
- Make Payment ✅ (links to `/tenant/rent`)

**Context:** Application approved by landlord, invoice generated

---

### State 3: Applied Property (Other User's Application)
```
┌─────────────────────────────────┐
│  [Property Image]                │
│  🟠 Applied - Pending Payment    │ ← ORANGE BADGE
├─────────────────────────────────┤
│  Luxury Apartment                │
│  📍 Lagos, Nigeria               │
│  🛏️ 2 bed  🚿 2 bath            │
│                                  │
│  ₦500,000/annum                  │
│                                  │
│  [View Details] [Not Available] │ ← DISABLED
└─────────────────────────────────┘
```
**Actions:**
- View Details ✅
- Not Available ❌ (disabled button)

**Context:** Someone else's application approved, pending their payment

---

### State 4: Occupied Property
```
┌─────────────────────────────────┐
│  [Property Image]                │
│  🔴 Occupied                     │ ← RED BADGE
├─────────────────────────────────┤
│  Luxury Apartment                │
│  📍 Lagos, Nigeria               │
│  🛏️ 2 bed  🚿 2 bath            │
│                                  │
│  ₦500,000/annum                  │
│                                  │
│  [View Details] [Not Available] │ ← DISABLED
└─────────────────────────────────┘
```
**Actions:**
- View Details ✅
- Not Available ❌ (disabled button)

**Context:** Payment completed, property locked

---

## 🏠 Tenant Dashboard - Applications Section

### When Application is Pending
```
┌────────────────────────────────────────┐
│  My Applications                       │
│  Track all your property applications  │
├────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │  Luxury Apartment               │  │
│  │  Unit 101           🟡 pending  │  │
│  │  Submitted: Jan 5, 2026         │  │
│  │  Move-in: Feb 1, 2026           │  │
│  │                                 │  │
│  │  [Withdraw Application]  ←─────┤  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

### When Application is Approved ⭐
```
┌────────────────────────────────────────┐
│  My Applications                       │
│  Track all your property applications  │
├────────────────────────────────────────┤
│  ┌─────────────────────────────────┐  │
│  │  Luxury Apartment               │  │
│  │  Unit 101        🟢 Approved    │  │
│  │  Submitted: Jan 5, 2026         │  │
│  │  Move-in: Feb 1, 2026           │  │
│  │                                 │  │
│  │  [💳 Proceed to Payment]  ←────┤  │ ← PRIMARY ACTION
│  │  [Withdraw]                     │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```
**Key Feature:** Prominent "Proceed to Payment" button appears

---

## 💳 Payment Page

### Pending Application Payment Display
```
┌────────────────────────────────────────────────┐
│  ⚠️ Action Required: Complete your application │
│     payment to proceed with your tenancy       │
├────────────────────────────────────────────────┤
│                                                │
│  🏷️ Application Payment                        │
│                                                │
│  Initial Payment Required                     │
│  Luxury Apartment - Unit 101                  │
│  Includes: Security Deposit + First Month Rent│
│                                                │
│                         ₦1,000,000            │
│                      Due: Jan 15, 2026        │
│                                                │
│  ┌──────────────────────────────────────┐    │
│  │  Invoice Breakdown                    │    │
│  │  ------------------------------------ │    │
│  │  Invoice #: INV-00042                 │    │
│  │  Rent Amount:      ₦500,000           │    │
│  │  Security Deposit: ₦500,000           │    │
│  │  ------------------------------------ │    │
│  │  Total Amount:     ₦1,000,000         │    │
│  └──────────────────────────────────────┘    │
│                                                │
│  [💳 Pay with Card]                           │ ← PAYMENT CTA
│  [Bank Transfer]                              │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 🔄 Complete User Journey

### Tenant's Perspective

```
Step 1: Browse Marketplace
   │
   ├─> See property "Available"
   │   Action: Click "Apply Now"
   │
   ▼
Step 2: Submit Application
   │
   ├─> Fill application form
   │   - Personal info
   │   - Employment details
   │   - References
   │   Action: Submit
   │
   ▼
Step 3: Wait for Review
   │
   ├─> Property still visible
   │   Badge: None (still available to others)
   │   Dashboard: Application shows "Pending"
   │
   ▼
Step 4: Landlord Approves ✅
   │
   ├─> Notification: "Application Approved! 🎉"
   │   Dashboard: "Proceed to Payment" button appears
   │   Invoice: Auto-generated
   │   Property: Shows "Applied - Awaiting Payment" (yellow)
   │
   ▼
Step 5: Make Payment 💳
   │
   ├─> Go to Payment page
   │   See invoice breakdown
   │   Click "Pay with Card"
   │   Complete payment via Paystack
   │
   ▼
Step 6: Payment Confirmed ✅
   │
   ├─> Notification: "Payment Confirmed"
   │   Agreement: Auto-generated
   │   Property: Now shows "Occupied" (red)
   │   Status: Property LOCKED 🔒
   │
   ▼
Step 7: Sign Agreement
   │
   ├─> Go to Agreements page
   │   Review terms
   │   E-sign agreement
   │
   ▼
Step 8: Move In 🏠
   │
   └─> Tenancy begins
       Dashboard: Shows active lease
       Can submit maintenance requests
       Monthly rent invoices generated
```

---

### Other Tenants' Perspective

```
While Your Application is Pending/Approved:
   │
   ├─> Property visible on marketplace
   │   Badge: 
   │   - If YOU applied: "Applied - Awaiting Payment" (yellow)
   │   - If OTHERS applied: "Applied - Pending Payment" (orange)
   │   Action: Can still see, but may not be able to apply
   │
   ▼
After Payment Completed:
   │
   ├─> Property visible on marketplace
   │   Badge: "Occupied" (red)
   │   Button: "Not Available" (disabled)
   │   Action: Cannot apply
   │
   ▼
If Try to Apply via API:
   │
   └─> Error: "This property is already occupied and 
       not available for applications."
```

---

## 🎬 State Transitions

```
┌─────────────┐
│  AVAILABLE  │ ← Initial state when property is listed
└──────┬──────┘
       │
       │ Tenant applies
       ▼
┌─────────────┐
│  AVAILABLE  │ ← Still available (multiple can apply)
└──────┬──────┘
       │
       │ Landlord approves ONE application
       ▼
┌─────────────┐
│   APPLIED   │ ← Waiting for payment
└──────┬──────┘   Badge: Yellow (applicant) / Orange (others)
       │           Button: "Make Payment" / "Not Available"
       │
       │ Tenant completes payment ⭐ CRITICAL STEP
       ▼
┌─────────────┐
│   RENTED    │ ← LOCKED - No more applications
└──────┬──────┘   Badge: Red "Occupied"
       │           Button: "Not Available"
       │           is_occupied = TRUE
       │
       │ Lease period ends
       ▼
┌─────────────┐
│  AVAILABLE  │ ← Back to available, ready for new tenant
└─────────────┘
```

---

## 📊 Dashboard Widgets

### Application Status Widget
```
┌────────────────────────────────────┐
│  My Applications (3)               │
├────────────────────────────────────┤
│  ✅ Modern Loft - Approved         │
│     → Proceed to Payment           │
│                                    │
│  ⏳ City View Apt - Pending        │
│     → Awaiting landlord review     │
│                                    │
│  ❌ Beach House - Rejected         │
│     → Thank you for applying       │
└────────────────────────────────────┘
```

### Pending Payments Widget
```
┌────────────────────────────────────┐
│  Pending Payments                  │
├────────────────────────────────────┤
│  ⚠️ Application Payment Due        │
│                                    │
│  Modern Loft - Unit 301            │
│  ₦1,000,000                        │
│  Due: Jan 15, 2026                 │
│                                    │
│  [Pay Now]                         │
└────────────────────────────────────┘
```

---

## 🔔 Notifications

### Timeline of Notifications

```
1. Application Submitted
   ┌─────────────────────────────────┐
   │  Application Submitted          │
   │  Successfully                   │
   │                                 │
   │  Your application for Modern    │
   │  Loft - Unit 301 has been       │
   │  submitted. The landlord will   │
   │  review it shortly.             │
   │                                 │
   │  [View Application]             │
   └─────────────────────────────────┘

2. Application Approved
   ┌─────────────────────────────────┐
   │  Application Approved! 🎉       │
   │                                 │
   │  Your application for Modern    │
   │  Loft - Unit 301 has been       │
   │  approved! Please proceed with  │
   │  payment to secure your tenancy.│
   │                                 │
   │  [Make Payment]                 │
   └─────────────────────────────────┘

3. Payment Confirmed
   ┌─────────────────────────────────┐
   │  Payment Confirmed              │
   │                                 │
   │  Your payment of ₦1,000,000     │
   │  has been confirmed.            │
   │                                 │
   │  [View Receipt]                 │
   └─────────────────────────────────┘

4. Agreement Ready
   ┌─────────────────────────────────┐
   │  Agreement Ready for Signature  │
   │                                 │
   │  Your tenancy agreement for     │
   │  Modern Loft is ready. Please   │
   │  review and sign to complete    │
   │  the process.                   │
   │                                 │
   │  [Sign Agreement]               │
   └─────────────────────────────────┘
```

---

## 🎯 Key UI/UX Improvements

### Before Implementation
- ❌ Properties disappeared after application
- ❌ No clear indication of property status
- ❌ Confusing when property became unavailable
- ❌ No payment CTA after approval
- ❌ Unclear what action to take next

### After Implementation
- ✅ Properties always visible with status badges
- ✅ Clear color-coded badges (Yellow → Orange → Red)
- ✅ Obvious payment button after approval
- ✅ Dashboard shows complete application lifecycle
- ✅ Clear next steps at every stage
- ✅ Property locks only after payment (not approval)

---

## 📱 Mobile Responsive Behavior

All UI elements adapt to mobile screens:
- Status badges remain visible
- Buttons stack vertically on small screens
- Cards maintain readability
- Touch-friendly button sizes
- Swipe navigation on dashboards

---

## 🎨 Design Tokens

### Colors
```css
/* Status Badge Colors */
--badge-available: transparent
--badge-applied-self: #D97706 (yellow-600)
--badge-applied-other: #EA580C (orange-600)
--badge-occupied: #DC2626 (red-600)

/* Button States */
--button-primary: accent color
--button-disabled: muted
--button-success: green
```

### Typography
```css
/* Badge Text */
font-size: 0.75rem (text-xs)
font-weight: 500 (medium)

/* Property Name */
font-size: 1.125rem (text-lg)
font-weight: 600 (semibold)

/* Price */
font-size: 1.5rem (text-2xl)
font-weight: 700 (bold)
```

---

## 🖼️ Icon Usage

| Element | Icon | Purpose |
|---------|------|---------|
| Payment Button | 💳 `<CreditCard />` | Indicates payment action |
| Withdraw | ❌ `<XCircle />` | Cancel application |
| View Details | 👁️ `<Eye />` | See more info |
| Notification | 🔔 `<Bell />` | Alert user |

---

## 🎭 Interaction States

### Button States
```
[Apply Now]
├─ Default: Blue background
├─ Hover: Darker blue
├─ Active: Even darker
└─ Disabled: Gray, not clickable

[Make Payment]
├─ Default: Accent color (prominent)
├─ Hover: Brighter
├─ Loading: Spinner animation
└─ Success: Green checkmark

[Not Available]
├─ Default: Disabled state
├─ Cursor: not-allowed
└─ Opacity: 50%
```

---

## 📐 Layout Specifications

### Property Card
- Width: Full container (responsive grid)
- Image: 16:9 aspect ratio, 48 (h-48)
- Padding: 6 (p-6)
- Border: 1px solid border
- Border Radius: xl (rounded-xl)
- Shadow: Hover elevation

### Dashboard Application Card
- Width: Full container
- Padding: 3 (p-3)
- Background: secondary/50
- Border: 1px solid border/50
- Border Radius: lg (rounded-lg)

---

## 🔄 Animation & Transitions

```css
/* Badge appearance */
transition: opacity 200ms ease-in-out

/* Button hover */
transition: background-color 150ms ease

/* Card hover */
transition: box-shadow 200ms ease

/* Page transitions */
transition: opacity 300ms ease-in-out
```

---

## 📖 Accessibility

- ✅ All buttons have `aria-label`
- ✅ Status badges have `sr-only` context
- ✅ Color not sole indicator (text + icons)
- ✅ Keyboard navigation supported
- ✅ Screen reader announcements
- ✅ Focus indicators visible

---

## 🎬 Animation Sequences

### Payment Success Flow
```
1. User clicks "Pay with Card"
   ↓
2. Payment modal opens
   ↓
3. Paystack payment form loads
   ↓
4. User completes payment
   ↓
5. Loading spinner appears
   ↓
6. Success checkmark animates in
   ↓
7. "Payment Confirmed" toast notification
   ↓
8. Redirect to Agreements page
   ↓
9. Property badge updates to "Occupied"
```

---

## 📱 Screenshots Recommended

After deployment, take screenshots of:

1. **Property Card States**
   - Available
   - Applied (yellow badge)
   - Applied by other (orange badge)
   - Occupied (red badge)

2. **Dashboard Views**
   - Pending application
   - Approved application with payment button
   - Application list

3. **Payment Page**
   - Pending invoice display
   - Invoice breakdown
   - Payment button

4. **Notifications**
   - Approval notification
   - Payment confirmation
   - Agreement ready

5. **Mobile Views**
   - Property cards on mobile
   - Dashboard on mobile
   - Payment page on mobile

---

## ✅ Visual QA Checklist

Before deployment, verify:

- [ ] Badge colors match specification
- [ ] Button states work correctly
- [ ] Loading states display properly
- [ ] Error messages are clear
- [ ] Success states are celebratory
- [ ] Mobile layout is readable
- [ ] Icons are appropriate size
- [ ] Spacing is consistent
- [ ] Typography is legible
- [ ] Colors have sufficient contrast

---

**This visual guide complements the technical documentation and provides a clear picture of the user experience.**

---

**Last Updated:** January 10, 2026  
**Status:** Ready for UI Testing  
**Next:** Take screenshots after deployment
