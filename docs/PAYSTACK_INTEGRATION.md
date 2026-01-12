# Paystack Integration Guide

## Overview

RentFlow uses Paystack as the payment gateway for processing rent payments and application fees. The integration follows a secure webhook-based flow to ensure payment verification happens server-side.

## Architecture

The system uses a hybrid architecture:
- **Frontend**: Vite + React (port 8080) - Initiates payments
- **Backend API**: Next.js API Routes (port 3000) - Handles webhooks and verification
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)

## URLs Configuration

### Webhook URL

The webhook URL is where Paystack sends payment notifications when a transaction is completed.

**Production URL Format:**
```
https://your-domain.com/api/webhooks/paystack
```

**Local Development URL:**
```
http://localhost:3000/api/webhooks/paystack
```

**Implementation Location:**
- File: `/app/api/webhooks/paystack/route.ts`
- Handles: `charge.success` and `charge.failed` events
- Security: HMAC SHA-512 signature verification

### Callback URL

The callback URL is not explicitly configured in this implementation because Paystack uses an **inline/popup payment flow**. The payment happens in a modal on the current page, and the result is handled via JavaScript callbacks.

**Implementation Details:**
- **Method**: Paystack Inline/Popup
- **File**: `/src/services/paystack.ts`
- **Callback Handlers**:
  - `onSuccess`: Triggered when payment is completed (not necessarily successful)
  - `onClose`: Triggered when user closes payment modal
- **Verification**: After popup closes, the frontend polls the payment status or relies on webhook confirmation

## Payment Flow

### 1. Payment Initialization (Frontend)

```javascript
// File: src/services/paymentServiceSecure.ts
await initializePayment({
  tenantId,
  landlordId,
  unitId,
  amount,
  dueDate,
  agreementId
})
```

This creates a `pending` payment record in the database with a unique reference.

### 2. Paystack Popup (Frontend)

```javascript
// File: src/services/paystack.ts
await paystackService.initializePayment({
  email: user.email,
  amount,
  reference,
  onSuccess: (response) => {
    // Payment completed, start polling for confirmation
  },
  onClose: () => {
    // User closed modal
  }
})
```

### 3. Webhook Verification (Backend)

Paystack sends a webhook to `/api/webhooks/paystack` when payment is processed:

```javascript
// File: app/api/webhooks/paystack/route.ts
export async function POST(request: NextRequest) {
  // 1. Verify webhook signature
  // 2. Parse event data
  // 3. Update payment status to 'paid' (ONLY server can do this)
  // 4. Generate tenancy agreement if applicable
  // 5. Send notifications
  // 6. Create audit logs
}
```

### 4. Frontend Confirmation

The frontend polls the payment status or receives real-time updates:

```javascript
// File: src/services/paymentServiceSecure.ts
await pollPaymentStatus(paymentId, maxAttempts)
```

## Environment Variables

### Required Variables

Add these to your `.env.local` or `.env.development` file:

```bash
# Paystack Public Key (Frontend - Safe to expose)
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxx

# Paystack Secret Key (Backend - KEEP SECRET!)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # Server-side only!
```

### Getting Your Keys

1. Go to [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer)
2. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. For production, use live keys; for development, use test keys

## Setting Up Webhook in Paystack Dashboard

### Step 1: Access Webhook Settings

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **Webhooks**

### Step 2: Add Webhook URL

1. Click **Add Endpoint** or **Configure Webhook**
2. Enter your webhook URL:
   - **Production**: `https://your-domain.com/api/webhooks/paystack`
   - **Testing**: Use ngrok or similar for local testing (see below)
3. Click **Save**

### Step 3: Configure Events

The webhook automatically handles these events:
- ✅ `charge.success` - Payment completed successfully
- ✅ `charge.failed` - Payment failed

### Step 4: Note Your Webhook Secret

While Paystack doesn't use a separate webhook secret, it uses your **Secret Key** to generate HMAC signatures. The system verifies these signatures automatically.

## Local Development & Testing

### Testing Webhooks Locally

Since Paystack can't reach `localhost`, you need to expose your local server:

#### Option 1: Using ngrok (Recommended)

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js server
npm run dev

# In another terminal, expose port 3000
ngrok http 3000
```

You'll get a URL like `https://abc123.ngrok.io`. Use this as your webhook URL:
```
https://abc123.ngrok.io/api/webhooks/paystack
```

#### Option 2: Using localtunnel

```bash
# Install localtunnel
npm install -g localtunnel

# Start your Next.js server
npm run dev

# Expose port 3000
lt --port 3000
```

### Testing with Paystack Test Cards

Paystack provides test cards for development:

**Successful Payment:**
```
Card Number: 4084 0840 8408 4081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

**Failed Payment:**
```
Card Number: 5060 6666 6666 6666 6666
CVV: 123
Expiry: Any future date
```

More test cards: https://paystack.com/docs/payments/test-payments

## Security Features

### 1. Webhook Signature Verification

Every webhook is verified using HMAC SHA-512:

```typescript
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex')
  
  return hash === signature
}
```

### 2. Server-Side Only Updates

Payment status can **ONLY** be updated by the webhook handler. The frontend cannot mark payments as successful.

### 3. Duplicate Prevention

The system checks if a payment is already processed before updating:

```typescript
if (payment.payment_status === 'paid') {
  console.log('Payment already processed:', reference)
  return NextResponse.json({ message: 'Payment already processed' })
}
```

### 4. Audit Logging

Every payment confirmation creates an audit log entry:

```typescript
await supabase.from('audit_logs').insert({
  user_id: payment.tenant_id,
  action: 'payment_verified',
  entity_type: 'payment',
  entity_id: payment.id,
  changes: {
    reference,
    amount,
    status: 'paid',
    verified_via: 'paystack_webhook'
  }
})
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL** in Paystack dashboard
2. **Verify server is running** on the correct port
3. **Check firewall/security groups** if deployed
4. **Use webhook logs** in Paystack dashboard to see delivery attempts
5. **Check server logs** for errors

### Payment Status Not Updating

1. **Check webhook signature verification** - Invalid signature = rejected webhook
2. **Verify PAYSTACK_SECRET_KEY** is set correctly
3. **Check Supabase permissions** - Service role key must be configured
4. **Review server logs** for detailed error messages

### Frontend Shows Payment Complete but Status is Pending

This is **normal behavior**. The payment popup closing doesn't mean payment was successful. Wait for:
1. Webhook to verify payment (usually < 30 seconds)
2. Frontend polling to detect the status change
3. Real-time notification (if configured)

### "Missing signature" Error

The webhook is missing the `x-paystack-signature` header. This happens when:
1. Request is not from Paystack
2. Webhook URL is incorrect
3. Testing manually without proper headers

## Deployment Checklist

### Pre-Deployment

- [ ] Update `VITE_PAYSTACK_PUBLIC_KEY` with live key (`pk_live_xxx`)
- [ ] Update `PAYSTACK_SECRET_KEY` with live key (`sk_live_xxx`)
- [ ] Test webhook locally with ngrok
- [ ] Verify all environment variables are set
- [ ] Test with Paystack test cards

### Deployment

- [ ] Deploy application to production
- [ ] Note the production URL (e.g., `https://your-app.vercel.app`)
- [ ] Update webhook URL in Paystack dashboard
- [ ] Test with a small amount first
- [ ] Monitor webhook logs in Paystack dashboard
- [ ] Monitor server logs for errors

### Post-Deployment

- [ ] Verify webhook is receiving events
- [ ] Test full payment flow with test cards
- [ ] Check database for payment records
- [ ] Verify notifications are sent
- [ ] Test agreement generation
- [ ] Switch to live keys when ready

## API Endpoints

### POST /api/webhooks/paystack

**Purpose**: Receive and process Paystack webhook events

**Headers**:
- `x-paystack-signature`: HMAC SHA-512 signature (verified)
- `content-type`: application/json

**Request Body**: Paystack event object

**Response**:
```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

**Status Codes**:
- `200`: Success
- `401`: Invalid signature
- `404`: Payment not found
- `500`: Server error

### POST /api/payments/verify

**Purpose**: Manually verify payment status (fallback)

**Headers**:
- `Authorization`: Bearer token
- `content-type`: application/json

**Request Body**:
```json
{
  "reference": "RF-1234567890-ABC"
}
```

**Response**:
```json
{
  "success": true,
  "verified": true,
  "payment": {
    "reference": "RF-1234567890-ABC",
    "amount": 50000,
    "currency": "NGN",
    "status": "success",
    "paidAt": "2024-01-15T10:30:00Z",
    "channel": "card",
    "customer": {
      "email": "tenant@example.com"
    }
  },
  "localStatus": "paid"
}
```

## Additional Resources

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Webhooks Guide](https://paystack.com/docs/payments/webhooks)
- [Paystack Test Cards](https://paystack.com/docs/payments/test-payments)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Support

For issues related to:
- **Paystack**: Contact [Paystack Support](https://paystack.com/contact)
- **RentFlow**: Check existing issues or create a new one
- **Deployment**: Consult deployment platform documentation

## Summary

✅ **Webhook URL**: `https://your-domain.com/api/webhooks/paystack`  
✅ **Callback URL**: Not needed (uses inline/popup flow)  
✅ **Implementation**: Complete and secure  
✅ **Security**: HMAC signature verification, server-side updates only  
✅ **Testing**: Use test keys and test cards for development  
✅ **Production**: Update to live keys and production webhook URL  
