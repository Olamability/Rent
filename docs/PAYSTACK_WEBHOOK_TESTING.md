# Paystack Webhook Testing Guide

This guide will help you test your Paystack webhook integration locally and in production.

## Prerequisites

- Node.js installed
- Paystack test account
- ngrok or similar tunneling tool

## Quick Start

### 1. Setup Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your Paystack test keys:
# VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
# PAYSTACK_SECRET_KEY=sk_test_xxxxx
```

### 2. Start Development Servers

```bash
# Terminal 1: Start Next.js server (handles webhooks)
npx next dev

# Terminal 2: Start Vite frontend (in another terminal)
npm run dev
```

### 3. Expose Local Server with ngrok

```bash
# Terminal 3: Expose port 3000
ngrok http 3000

# You'll get output like:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Configure Webhook in Paystack

1. Go to https://dashboard.paystack.com/#/settings/webhooks
2. Add webhook URL: `https://abc123.ngrok.io/api/webhooks/paystack`
3. Save

### 5. Test Payment Flow

1. Navigate to http://localhost:8080 (your frontend)
2. Log in as a tenant
3. Go to payments section
4. Make a test payment using Paystack test card:
   ```
   Card:   4084 0840 8408 4081
   CVV:    408
   Expiry: Any future date
   PIN:    0000
   OTP:    123456
   ```

### 6. Verify Webhook Received

Check Terminal 1 (Next.js server) for webhook logs:
```
Webhook event received: charge.success
Processing successful payment: RF-XXXX-XXXX
Payment processed successfully: RF-XXXX-XXXX
```

## Manual Webhook Testing

You can manually test the webhook endpoint with curl:

### Test Successful Payment Webhook

```bash
# Generate test signature (use actual PAYSTACK_SECRET_KEY)
SECRET="sk_test_your_secret_key"
BODY='{"event":"charge.success","data":{"reference":"RF-TEST-123","amount":5000000,"customer":{"email":"test@example.com"},"paid_at":"2024-01-15T10:00:00Z","channel":"card"}}'

# Calculate HMAC signature
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha512 -hmac "$SECRET" | sed 's/^.* //')

# Send webhook
curl -X POST http://localhost:3000/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: $SIGNATURE" \
  -d "$BODY"
```

**Note:** This requires a payment record to exist in the database with the reference `RF-TEST-123`.

## Webhook Event Types

### charge.success

Sent when a payment is successful.

**Example Payload:**
```json
{
  "event": "charge.success",
  "data": {
    "reference": "RF-1234567890-ABC",
    "amount": 5000000,
    "currency": "NGN",
    "customer": {
      "email": "tenant@example.com"
    },
    "paid_at": "2024-01-15T10:30:00Z",
    "channel": "card",
    "metadata": {
      "paymentId": "uuid",
      "tenantId": "uuid",
      "unitId": "uuid"
    }
  }
}
```

**What the webhook does:**
1. ✅ Verifies signature
2. ✅ Updates payment status to 'paid'
3. ✅ Updates invoice if linked
4. ✅ Generates tenancy agreement if application payment
5. ✅ Marks unit as rented
6. ✅ Sends notifications to tenant and landlord
7. ✅ Creates audit log

### charge.failed

Sent when a payment fails.

**Example Payload:**
```json
{
  "event": "charge.failed",
  "data": {
    "reference": "RF-1234567890-ABC",
    "message": "Insufficient funds"
  }
}
```

**What the webhook does:**
1. ✅ Verifies signature
2. ✅ Updates payment status to 'failed'
3. ✅ Adds failure message to notes
4. ✅ Creates audit log

## Debugging Webhooks

### Check Webhook Logs in Paystack Dashboard

1. Go to https://dashboard.paystack.com/#/settings/webhooks
2. Click on your webhook URL
3. View delivery logs and responses

### Enable Verbose Logging

Add this to your webhook handler for more detailed logs:

```typescript
// In app/api/webhooks/paystack/route.ts
console.log('Full webhook payload:', JSON.stringify(event, null, 2));
console.log('Payment record:', JSON.stringify(payment, null, 2));
```

### Common Issues

#### Webhook Returns 401 (Invalid Signature)

**Cause:** PAYSTACK_SECRET_KEY doesn't match the key in Paystack dashboard

**Fix:**
1. Verify PAYSTACK_SECRET_KEY in .env.local
2. Make sure you're using the secret key, not public key
3. Check for extra spaces or quotes

#### Webhook Returns 404 (Payment Not Found)

**Cause:** No payment record exists with the given reference

**Fix:**
1. Ensure payment was created before triggering webhook
2. Check the reference matches exactly
3. Verify database connection

#### Webhook Not Being Called

**Cause:** Paystack can't reach your webhook URL

**Fix:**
1. Verify ngrok is running and URL is correct
2. Check firewall settings
3. Ensure Next.js server is running on port 3000
4. Test webhook URL directly in browser (should return 405 Method Not Allowed for GET)

#### Payment Status Not Updating

**Cause:** RLS policies or permissions issue

**Fix:**
1. Verify SUPABASE_SERVICE_ROLE_KEY is set (has full permissions)
2. Check Supabase logs for permission errors
3. Ensure RLS policies allow service role to update

## Testing Production Webhook

### Before Going Live

1. Switch to live keys in environment variables:
   ```bash
   VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
   PAYSTACK_SECRET_KEY=sk_live_xxxxx
   ```

2. Update webhook URL in Paystack to production domain:
   ```
   https://your-production-domain.com/api/webhooks/paystack
   ```

3. Test with small real payment first

### Production Testing Checklist

- [ ] Environment variables updated to live keys
- [ ] Webhook URL updated in Paystack dashboard
- [ ] SSL certificate valid on production domain
- [ ] Server logs accessible for debugging
- [ ] Database backup taken
- [ ] Test payment made with real card (small amount)
- [ ] Verify payment status updates in database
- [ ] Check notifications sent correctly
- [ ] Verify agreement generated (if applicable)
- [ ] Monitor webhook delivery in Paystack dashboard

## Monitoring

### What to Monitor

1. **Webhook Delivery Rate**
   - Check Paystack dashboard for failed deliveries
   - Should be close to 100%

2. **Response Times**
   - Webhook should respond within 10 seconds
   - Paystack retries if timeout

3. **Payment Status Updates**
   - All successful payments should update to 'paid'
   - Failed payments should update to 'failed'

4. **Audit Logs**
   - Every payment should have audit log entry
   - Check for missing or duplicate logs

### Setting Up Alerts

Consider setting up alerts for:
- ❌ Failed webhook deliveries
- ❌ Signature verification failures
- ❌ Payment status not updating
- ❌ Database errors

## Webhook Replay

If a webhook fails and you need to replay it:

1. Go to Paystack Dashboard → Webhooks → Logs
2. Find the failed webhook event
3. Click "Replay" button
4. Webhook will be resent with same payload

**Note:** Make sure your system handles duplicate webhooks gracefully (it does via the duplicate check).

## Security Verification

### Test Security Features

1. **Invalid Signature Test:**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/paystack \
     -H "Content-Type: application/json" \
     -H "x-paystack-signature: invalid_signature" \
     -d '{"event":"charge.success","data":{"reference":"RF-TEST-123"}}'
   
   # Should return 401 Unauthorized
   ```

2. **Missing Signature Test:**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/paystack \
     -H "Content-Type: application/json" \
     -d '{"event":"charge.success","data":{"reference":"RF-TEST-123"}}'
   
   # Should return 401 Missing signature
   ```

3. **Duplicate Payment Test:**
   - Make a payment
   - Wait for webhook to process
   - Replay the same webhook
   - Should return "Payment already processed"

## Additional Resources

- [Paystack Webhooks Documentation](https://paystack.com/docs/payments/webhooks)
- [Testing Webhooks Locally](https://paystack.com/docs/payments/test-webhooks)
- [Webhook Best Practices](https://paystack.com/docs/payments/webhook-best-practices)
- [ngrok Documentation](https://ngrok.com/docs)

## Support

If you encounter issues:

1. Check server logs for detailed error messages
2. Check Paystack webhook logs in dashboard
3. Review this testing guide
4. Check [Paystack Support](https://paystack.com/contact)
5. Review [docs/PAYSTACK_INTEGRATION.md](./PAYSTACK_INTEGRATION.md)
