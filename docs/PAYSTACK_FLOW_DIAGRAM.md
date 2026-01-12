# Paystack Payment Flow Diagram

This document provides a visual representation of the payment flow in RentFlow.

## Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PAYMENT FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐
│ TENANT   │
│ (Browser)│
└────┬─────┘
     │
     │ 1. Click "Pay Rent"
     ▼
┌─────────────────────┐
│ Frontend (React)    │
│ Port 8080           │
└────┬────────────────┘
     │
     │ 2. initializePayment()
     │    - Creates pending payment in DB
     │    - Generates reference (RF-XXX)
     ▼
┌─────────────────────┐
│ Supabase DB         │
│ Status: 'pending'   │
└────┬────────────────┘
     │
     │ 3. Payment record created
     ▼
┌─────────────────────┐
│ Paystack SDK        │
│ (Inline/Popup)      │
└────┬────────────────┘
     │
     │ 4. User enters card details
     │    - Card: 4084 0840 8408 4081
     │    - CVV: 408
     │    - PIN: 0000
     │    - OTP: 123456
     ▼
┌─────────────────────┐
│ Paystack Server     │
│ (Cloud)             │
└────┬────────────────┘
     │
     │ 5. Process payment
     │
     ├──────────┬──────────┐
     │          │          │
   SUCCESS    FAILED    PENDING
     │          │          │
     ▼          ▼          ▼

┌──────────────────────────────────────┐
│ WEBHOOK EVENT                        │
│ POST /api/webhooks/paystack          │
└──────────────────────────────────────┘
     │
     │ 6. Paystack sends webhook
     │    Header: x-paystack-signature
     │    Event: charge.success/failed
     ▼
┌─────────────────────┐
│ Next.js Server      │
│ Port 3000           │
└────┬────────────────┘
     │
     │ 7. Verify HMAC signature
     │    ✓ SHA-512 with secret key
     ▼
┌─────────────────────┐
│ Signature Valid?    │
└────┬────────────────┘
     │
     ├─── NO ──▶ Return 401 (Reject)
     │
     │ YES
     ▼
┌─────────────────────┐
│ Find Payment Record │
│ By Reference        │
└────┬────────────────┘
     │
     │ 8. Look up RF-XXX
     ▼
┌─────────────────────┐
│ Payment Found?      │
└────┬────────────────┘
     │
     ├─── NO ──▶ Return 404
     │
     │ YES
     ▼
┌─────────────────────┐
│ Check Duplicate     │
└────┬────────────────┘
     │
     ├─── Already Paid ──▶ Return 200 (Idempotent)
     │
     │ NOT PAID
     ▼
┌─────────────────────────────────┐
│ UPDATE DATABASE                 │
│ ✓ Status: 'paid'               │
│ ✓ Paid date: NOW()             │
│ ✓ Payment method: 'card'       │
│ ✓ Notes: "Verified via webhook"│
└────┬────────────────────────────┘
     │
     │ 9. Update payment status
     ▼
┌─────────────────────┐
│ Update Invoice?     │
└────┬────────────────┘
     │
     │ IF invoice_id exists
     ▼
┌─────────────────────┐
│ Update Invoice      │
│ ✓ paid_amount += X │
│ ✓ paid_at (if full)│
└────┬────────────────┘
     │
     │ 10. Check for application payment
     ▼
┌─────────────────────┐
│ Application Payment?│
└────┬────────────────┘
     │
     │ IF application_id exists
     ▼
┌──────────────────────────────────┐
│ GENERATE TENANCY AGREEMENT       │
│ ✓ Create agreement record        │
│ ✓ Set status: 'pending'          │
│ ✓ Add default terms              │
│ ✓ Calculate dates (1 year lease) │
└────┬─────────────────────────────┘
     │
     │ 11. Mark unit as rented
     ▼
┌──────────────────────────────────┐
│ UPDATE UNIT                      │
│ ✓ listing_status: 'rented'      │
│ ✓ is_occupied: true              │
│ ✓ current_tenant_id: tenant_id  │
└────┬─────────────────────────────┘
     │
     │ 12. Send notifications
     ▼
┌────────────────────┬─────────────────────┐
│ NOTIFY LANDLORD    │ NOTIFY TENANT       │
│ "Payment Received" │ "Payment Confirmed" │
└────────────────────┴─────────────────────┘
     │                         │
     │ 13. Create audit log    │
     ▼                         ▼
┌─────────────────────────────────────────┐
│ AUDIT LOG                               │
│ ✓ Action: payment_verified              │
│ ✓ Amount: ₦50,000                       │
│ ✓ Reference: RF-XXX                     │
│ ✓ Verified via: paystack_webhook        │
└────┬────────────────────────────────────┘
     │
     │ 14. Return success to Paystack
     ▼
┌─────────────────────┐
│ Response 200        │
│ {"status":"success"}│
└────┬────────────────┘
     │
     │ 15. Paystack marks webhook delivered
     ▼
┌─────────────────────┐
│ Frontend Polling    │
│ pollPaymentStatus() │
└────┬────────────────┘
     │
     │ 16. Query payment status every 2s
     │     (max 30 attempts = 60s)
     ▼
┌─────────────────────┐
│ Status Changed?     │
└────┬────────────────┘
     │
     │ Status: 'paid'
     ▼
┌─────────────────────┐
│ SHOW SUCCESS UI     │
│ ✓ Payment confirmed │
│ ✓ Show receipt      │
│ ✓ Redirect to home  │
└─────────────────────┘
```

## Webhook URL Configuration

```
┌───────────────────────────────────────────────────────┐
│ PAYSTACK DASHBOARD                                    │
│ https://dashboard.paystack.com                        │
└────────────────────┬──────────────────────────────────┘
                     │
                     │ Configure Webhook
                     │
                     ▼
┌───────────────────────────────────────────────────────┐
│ Webhook Settings                                      │
│                                                       │
│ URL: https://your-domain.com/api/webhooks/paystack   │
│                                                       │
│ Events:                                               │
│   ✓ charge.success                                    │
│   ✓ charge.failed                                     │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## Security Flow

```
┌─────────────────────────────────────────────────────┐
│ WEBHOOK SECURITY                                    │
└─────────────────────────────────────────────────────┘

Paystack Server:
   │
   │ 1. Prepare webhook payload
   │    body = JSON.stringify(event)
   │
   │ 2. Generate signature
   │    signature = HMAC_SHA512(body, SECRET_KEY)
   │
   │ 3. Send request
   │    POST /api/webhooks/paystack
   │    Header: x-paystack-signature: <signature>
   │    Body: <event JSON>
   ▼

Your Server:
   │
   │ 4. Receive webhook
   │    signature = request.headers['x-paystack-signature']
   │    body = request.body (raw string)
   │
   │ 5. Verify signature
   │    expected = HMAC_SHA512(body, SECRET_KEY)
   │    valid = (expected === signature)
   │
   ├─── valid === false ──▶ Reject (401)
   │
   │ valid === true
   │
   │ 6. Process webhook
   │    ✓ Update payment
   │    ✓ Generate agreement
   │    ✓ Send notifications
   │
   │ 7. Return 200 OK
   ▼

Paystack Server:
   │
   │ 8. Mark webhook as delivered
   │    ✓ Show in dashboard logs
   ▼
```

## Local Development Flow

```
┌────────────────────────────────────────────────────────┐
│ LOCAL DEVELOPMENT SETUP                                │
└────────────────────────────────────────────────────────┘

Terminal 1:
┌──────────────────┐
│ npm run dev      │  ◀─ Vite frontend (port 8080)
│ Frontend running │
└──────────────────┘

Terminal 2:
┌──────────────────┐
│ npx next dev     │  ◀─ Next.js API (port 3000)
│ API running      │
└──────────────────┘

Terminal 3:
┌──────────────────┐
│ ngrok http 3000  │  ◀─ Tunnel to local server
│ Public URL:      │
│ abc123.ngrok.io  │
└──────────────────┘
         │
         │ Exposes localhost:3000
         ▼
┌─────────────────────────────────────┐
│ https://your-unique-id.ngrok.io     │
│   → http://localhost:3000           │
│   → /api/webhooks/paystack          │
└─────────────────────────────────────┘
         │
         │ Accessible from internet
         ▼
┌─────────────────────────────────────┐
│ Paystack Dashboard                  │
│ Webhook URL:                        │
│ https://your-unique-id.ngrok.io/api/│
│        webhooks/paystack            │
└─────────────────────────────────────┘
```

## Payment Status State Machine

```
┌──────────┐
│ PENDING  │ ◀─── Payment initialized
└────┬─────┘
     │
     │ User completes payment
     │ Webhook received
     ▼
┌──────────┐
│  PAID    │ ◀─── Payment verified via webhook
└──────────┘
     │
     │ Auto-generates:
     │  • Tenancy agreement
     │  • Notifications
     │  • Audit logs
     │  • Unit status update
     ▼
┌──────────┐
│ COMPLETE │
└──────────┘

Alternative flow:

┌──────────┐
│ PENDING  │
└────┬─────┘
     │
     │ Payment fails
     │ Webhook received
     ▼
┌──────────┐
│  FAILED  │ ◀─── Payment rejected
└──────────┘
     │
     │ User can retry
     ▼
```

## File Structure

```
/home/runner/work/Rent/Rent/
│
├── app/
│   └── api/
│       ├── webhooks/
│       │   └── paystack/
│       │       └── route.ts          ⬅ WEBHOOK HANDLER
│       └── payments/
│           └── verify/
│               └── route.ts          ⬅ MANUAL VERIFICATION
│
├── src/
│   ├── services/
│   │   ├── paystack.ts              ⬅ Paystack SDK wrapper
│   │   ├── paymentService.ts        ⬅ Payment CRUD operations
│   │   └── paymentServiceSecure.ts  ⬅ Secure payment flow
│   │
│   └── components/
│       ├── tenant/
│       │   └── PaymentDialog.tsx     ⬅ Tenant payment UI
│       └── shared/
│           └── PaymentDialog.tsx     ⬅ Shared payment UI
│
├── docs/
│   ├── PAYSTACK_INTEGRATION.md       ⬅ Full documentation
│   ├── PAYSTACK_QUICK_REFERENCE.md   ⬅ Quick reference
│   ├── PAYSTACK_WEBHOOK_TESTING.md   ⬅ Testing guide
│   └── PAYSTACK_FLOW_DIAGRAM.md      ⬅ This file
│
└── .env.example                      ⬅ Environment template
```

## Key Concepts

### 1. Server-Side Only Updates
```
❌ Frontend CANNOT update payment status
✓ Only webhook can mark payment as 'paid'
✓ Prevents payment fraud
✓ Ensures payment verification
```

### 2. Idempotent Webhooks
```
✓ Same webhook can be received multiple times
✓ System checks if already processed
✓ Returns 200 OK without re-processing
✓ Prevents duplicate payments
```

### 3. Signature Verification
```
✓ Every webhook must have valid signature
✓ Uses HMAC SHA-512
✓ Prevents unauthorized updates
✓ Rejects invalid signatures (401)
```

### 4. Audit Trail
```
✓ Every payment creates audit log
✓ Records who, what, when, where
✓ Includes IP address and user agent
✓ Compliance requirement
```

## URLs Summary

| Purpose | URL | Used By |
|---------|-----|---------|
| **Webhook** | `https://your-domain.com/api/webhooks/paystack` | Paystack → Your Server |
| **Callback** | N/A (inline popup) | JavaScript in browser |
| **Verification** | `https://your-domain.com/api/payments/verify` | Your Frontend → Your Server |
| **Frontend** | `http://localhost:8080` | User browser |
| **Backend** | `http://localhost:3000` | API routes |

## Testing URLs

| Environment | Webhook URL |
|-------------|-------------|
| **Local** | `http://localhost:3000/api/webhooks/paystack` |
| **ngrok** | `https://abc123.ngrok.io/api/webhooks/paystack` |
| **Staging** | `https://staging.your-domain.com/api/webhooks/paystack` |
| **Production** | `https://your-domain.com/api/webhooks/paystack` |

---

**Need help?** See [PAYSTACK_INTEGRATION.md](./PAYSTACK_INTEGRATION.md) for detailed documentation.
