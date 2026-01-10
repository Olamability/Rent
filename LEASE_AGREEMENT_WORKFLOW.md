# Lease Agreement Workflow - Visual Flow Guide

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TENANT APPLICATION FLOW                          │
│                    (Lease Agreement Before Payment)                       │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Step 1:    │
│   Tenant     │──────────────────────────────────────────────┐
│   Submits    │                                               │
│ Application  │                                               │
└──────────────┘                                               │
      │                                                        │
      │  Application created                                  │
      ▼                                                        │
┌──────────────────────────────────────────────────┐          │
│  Status: submitted / pending                     │          │
│  Unit: available                                 │          │
│  Invoice: not created                            │          │
│  Agreement: not created                          │          │
│  ✓ Multiple tenants can apply                   │          │
└──────────────────────────────────────────────────┘          │
      │                                                        │
      │  Landlord reviews                                     │
      ▼                                                        │
┌──────────────┐                                              │
│   Step 2:    │                                              │
│  Landlord    │                                              │
│  Reviews &   │                                              │
│   Approves   │                                              │
└──────────────┘                                              │
      │                                                        │
      │  Approval triggers                                    │
      │  generate_agreement_from_application()                │
      ▼                                                        │
┌──────────────────────────────────────────────────┐          │
│  Status: approved → agreement_sent               │          │
│  Unit: available (still open)                    │          │
│  Invoice: draft (hidden from tenant)             │          │
│  Agreement: draft → sent                         │          │
│  ✓ Other applications may be rejected            │          │
└──────────────────────────────────────────────────┘          │
      │                                                        │
      │  Notification sent to tenant                          │
      ▼                                                        │
┌──────────────┐                                              │
│   Step 3:    │                                              │
│   Lease      │──────────────────────────────────────────────┤
│  Agreement   │                                               │
│  Generated   │  🎯 THIS IS THE MISSING STEP (NOW ADDED)     │
│  & Sent      │                                               │
└──────────────┘                                               │
      │                                                        │
      │  Tenant reviews terms                                 │
      ▼                                                        │
┌──────────────────────────────────────────────────┐          │
│  Dashboard shows:                                │          │
│  ┌────────────────────────────────────────────┐  │          │
│  │  📄 Agreement Ready for Review             │  │          │
│  │  Your lease agreement is ready.            │  │          │
│  │  [Review Agreement] button                 │  │          │
│  └────────────────────────────────────────────┘  │          │
└──────────────────────────────────────────────────┘          │
      │                                                        │
      │  Tenant clicks "Review Agreement"                     │
      ▼                                                        │
┌─────────────────────────────────────────────────────────────┤
│  Agreement Review Page (Mobile-Responsive)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Property Details                                      │ │
│  │  • Name, Address, Unit Number                          │ │
│  │  • Property images                                     │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Financial Summary                                     │ │
│  │  • Monthly Rent: $XXX                                  │ │
│  │  • Security Deposit: $XXX                              │ │
│  │  • Total Initial Payment: $XXX                         │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Lease Period                                          │ │
│  │  • Start Date: MM/DD/YYYY                              │ │
│  │  • End Date: MM/DD/YYYY                                │ │
│  │  • Duration: X months                                  │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Terms & Conditions                                    │ │
│  │  • Payment terms                                       │ │
│  │  • Responsibilities                                    │ │
│  │  • [Download PDF] option                               │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Acceptance                                            │ │
│  │  ☐ I accept the terms and conditions                  │ │
│  │  [Cancel] [Accept & Continue to Payment]              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
      │
      │  Tenant accepts
      ▼
┌──────────────┐
│   Step 4:    │
│   Tenant     │
│  Accepts/    │
│    Signs     │
│  Agreement   │
└──────────────┘
      │
      │  accept_agreement_by_tenant()
      │  triggered
      ▼
┌──────────────────────────────────────────────────┐
│  Status: agreement_accepted → payment_pending    │
│  Unit: available (not yet locked)                │
│  Invoice: draft → issued (now visible)           │
│  Agreement: accepted                             │
│  ✓ This confirms legal intent                    │
│  ✓ Protects landlord legally                     │
│  ✓ Protects tenant from unclear terms            │
└──────────────────────────────────────────────────┘
      │
      │  issueInvoiceAfterAgreementAcceptance()
      │  called
      ▼
┌──────────────┐
│   Step 5:    │
│   Invoice    │
│  Generated/  │
│   Unlocked   │
└──────────────┘
      │
      │  Notification sent
      ▼
┌──────────────────────────────────────────────────┐
│  Status: payment_pending                         │
│  Unit: available                                 │
│  Invoice: issued (visible to tenant)             │
│  Agreement: accepted                             │
│  ✓ Invoice is conditional on agreement           │
│  ✓ Tenant can now see full payment details       │
└──────────────────────────────────────────────────┘
      │
      │  Tenant navigates to payment page
      ▼
┌─────────────────────────────────────────────────────────────┐
│  Payment Page                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Invoice Details                                       │ │
│  │  • Invoice #: INV-00001                                │ │
│  │  • Amount Due: $XXX                                    │ │
│  │  • Due Date: MM/DD/YYYY                                │ │
│  │  • Breakdown: Rent + Deposit                           │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │  Payment Method                                        │ │
│  │  ○ Card  ○ Transfer  ○ USSD                            │ │
│  │  [Complete Payment]                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
      │
      │  Tenant completes payment
      ▼
┌──────────────┐
│   Step 6:    │
│   Tenant     │
│  Completes   │
│   Payment    │
└──────────────┘
      │
      │  Payment verified
      │  (webhook or service)
      ▼
┌──────────────────────────────────────────────────┐
│  Status: paid                                    │
│  Unit: rented ⭐ (ONLY NOW)                      │
│  Invoice: paid                                   │
│  Agreement: accepted                             │
│  ✓ Payment confirmed (not just initiated)        │
│  ✓ This is the ONLY point occupancy is valid     │
└──────────────────────────────────────────────────┘
      │
      │  mark_application_paid()
      │  Unit status update triggered
      ▼
┌──────────────┐
│   Step 7:    │
│  Property    │
│   Becomes    │
│  Occupied    │
└──────────────┘
      │
      ▼
┌──────────────────────────────────────────────────┐
│  Final State                                     │
│  • Unit: rented / occupied                       │
│  • Application: paid                             │
│  • Locked from new applications                  │
│  • Marked as occupied everywhere                 │
│  • Lease countdown begins                        │
│  ✓ Workflow complete                             │
└──────────────────────────────────────────────────┘
```

## Status Transitions

### Application Status Flow

```
submitted/pending
      ↓
   approved (Landlord action)
      ↓
agreement_sent (Auto: agreement generated)
      ↓
agreement_accepted (Tenant action)
      ↓
payment_pending (Auto: invoice issued)
      ↓
     paid (Payment webhook)
      ↓
  [Complete]
```

### Unit Status Flow

```
available (stays through entire process)
    ↓
    ↓ (only changes after payment)
    ↓
  rented (after payment confirmed)
    ↓
 occupied (alias)
```

### Invoice Status Flow

```
  draft (created on approval, hidden)
    ↓
 issued (after agreement acceptance, visible)
    ↓
   paid (after payment completion)
```

### Agreement Status Flow

```
  draft (created)
    ↓
   sent (to tenant)
    ↓
accepted (tenant accepts)
    ↓
 signed (future: e-signature)
    ↓
 active (both signed)
```

## User Interface Flow

### Tenant Dashboard Views

#### Before Approval
```
┌────────────────────────────────────────┐
│  Your Application                      │
│  ┌──────────────────────────────────┐  │
│  │  🏠 Sunset Apartments - Unit 3B  │  │
│  │  Status: Under Review            │  │
│  │  Your application is being       │  │
│  │  reviewed by the landlord.       │  │
│  │  [Withdraw Application]          │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

#### After Approval (New!)
```
┌────────────────────────────────────────┐
│  Your Application                      │
│  ┌──────────────────────────────────┐  │
│  │  🏠 Sunset Apartments - Unit 3B  │  │
│  │  Status: Agreement Ready 📄      │  │
│  │  Your lease agreement is ready   │  │
│  │  for review. Please review and   │  │
│  │  accept the terms to continue.   │  │
│  │  [Review Agreement] [Withdraw]   │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

#### After Agreement Acceptance
```
┌────────────────────────────────────────┐
│  Your Application                      │
│  ┌──────────────────────────────────┐  │
│  │  🏠 Sunset Apartments - Unit 3B  │  │
│  │  Status: Payment Pending 💳      │  │
│  │  Your agreement has been         │  │
│  │  accepted! Please complete your  │  │
│  │  payment of $2,500 to finalize.  │  │
│  │  [Make Payment] [Withdraw]       │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Landlord Dashboard Views

#### After Approval
```
┌────────────────────────────────────────┐
│  Recent Applications                   │
│  ┌──────────────────────────────────┐  │
│  │  John Doe - Sunset Apt 3B        │  │
│  │  Status: Agreement Sent 📄       │  │
│  │  Agreement has been generated    │  │
│  │  and sent to tenant for review.  │  │
│  │  [View Details]                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

#### After Tenant Acceptance
```
┌────────────────────────────────────────┐
│  Recent Applications                   │
│  ┌──────────────────────────────────┐  │
│  │  John Doe - Sunset Apt 3B        │  │
│  │  Status: Payment Pending 💳      │  │
│  │  Tenant accepted agreement.      │  │
│  │  Awaiting payment.               │  │
│  │  [View Details]                  │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

## Responsive Design Breakpoints

### Mobile (320px - 767px)
- Single column layout
- Stacked buttons (full width)
- Text: text-sm to text-base
- Images: 48px to 64px height
- Grid: 1 column

### Tablet (768px - 1023px)
- 2 column grid
- Side-by-side buttons
- Text: text-base
- Images: 64px to 96px height
- Grid: 2 columns

### Desktop (1024px+)
- Full 2 column layouts
- Horizontal button groups
- Text: text-base to text-lg
- Images: 96px to 128px height
- Grid: 2 columns with wider max-width

## Error Scenarios

### Agreement Generation Fails
```
Step 2 → Approval succeeds
       ↓
       ✗ Agreement generation fails
       ↓
  Status remains: approved
  Notification: Error logged
  Recovery: Retry via manual trigger or automatic retry
```

### Agreement Acceptance Fails
```
Step 4 → Tenant clicks Accept
       ↓
       ✗ Database error
       ↓
  Status remains: agreement_sent
  User sees: Error toast
  Recovery: Tenant can retry acceptance
```

### Invoice Issuing Fails
```
Step 4 → Agreement accepted
       ↓
       ✗ Invoice issuing fails
       ↓
  Status: agreement_accepted
  Invoice: draft (still hidden)
  Recovery: Background job or manual trigger
```

### Payment Fails
```
Step 6 → Payment initiated
       ↓
       ✗ Payment gateway error
       ↓
  Status remains: payment_pending
  Invoice: issued
  Recovery: Tenant can retry payment
```

## Notification Timeline

```
Time  Event                    Recipient   Message
─────────────────────────────────────────────────────────────────
T+0   Application Submitted   Landlord    "New application from..."
T+0   Application Submitted   Tenant      "Application submitted..."

T+1   Application Approved    Tenant      "Application approved!..."
T+1   Agreement Generated     Tenant      "Agreement ready for review..."
T+1   Agreement Generated     Landlord    "Agreement sent to tenant..."

T+2   Agreement Accepted      Tenant      "Agreement accepted - Payment Required..."
T+2   Agreement Accepted      Landlord    "Tenant accepted agreement..."
T+2   Invoice Ready           Tenant      "Invoice ready for payment..."

T+3   Payment Completed       Tenant      "Payment confirmed!..."
T+3   Payment Completed       Landlord    "Payment received from..."
T+3   Tenancy Activated       Both        "Tenancy is now active!..."
```

## Database Relationships

```
property_applications
    ├─ id (PK)
    ├─ application_status
    └─ [other fields]
         │
         │ 1:1
         ▼
tenancy_agreements
    ├─ id (PK)
    ├─ application_id (FK) ← NEW
    ├─ agreement_status
    └─ [other fields]
         │
         │ 1:many
         ▼
     invoices
         ├─ id (PK)
         ├─ application_id (FK)
         ├─ invoice_status
         └─ [other fields]
              │
              │ 1:many
              ▼
          payments
              ├─ id (PK)
              ├─ application_id (FK)
              ├─ invoice_id (FK)
              └─ [other fields]
```

## Summary

This visual guide shows the complete workflow from application submission to tenancy activation, with the critical **lease agreement acceptance step** properly positioned before payment. The design is mobile-responsive, legally compliant, and provides clear feedback to users at every step.
