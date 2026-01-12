# Paystack Quick Reference

## 🔗 URLs

### Webhook URL
```
Production:  https://your-domain.com/api/webhooks/paystack
Development: http://localhost:3000/api/webhooks/paystack
Testing:     https://your-ngrok-url.ngrok.io/api/webhooks/paystack
```

### Callback URL
**Not Required** - System uses Paystack Inline (popup) with JavaScript callbacks

---

## 🔑 Environment Variables

### Frontend (.env.local)
```bash
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
```

### Backend (.env.local)
```bash
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

---

## 📝 Paystack Dashboard Setup

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** → **Webhooks**
3. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
4. Save configuration
5. Copy your **Public Key** and **Secret Key** from Settings → Developer

---

## 🧪 Test Cards

### Successful Payment
```
Card:   4084 0840 8408 4081
CVV:    408
Expiry: Any future date
PIN:    0000
OTP:    123456
```

### Failed Payment
```
Card:   5060 6666 6666 6666 6666
CVV:    123
Expiry: Any future date
```

More test cards: https://paystack.com/docs/payments/test-payments

---

## 🚀 Local Testing with ngrok

```bash
# Terminal 1: Start Next.js server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Copy the ngrok URL (e.g., https://your-unique-id.ngrok.io)
# Add to Paystack webhook settings: https://your-unique-id.ngrok.io/api/webhooks/paystack
```

---

## 🔍 Implementation Files

| File | Purpose |
|------|---------|
| `/app/api/webhooks/paystack/route.ts` | Webhook handler (receives payment notifications) |
| `/app/api/payments/verify/route.ts` | Manual payment verification API |
| `/src/services/paystack.ts` | Frontend Paystack service |
| `/src/services/paymentServiceSecure.ts` | Secure payment operations |
| `/src/components/tenant/PaymentDialog.tsx` | Payment UI component |

---

## 🔒 Security Features

✅ **HMAC SHA-512 signature verification** on all webhooks  
✅ **Server-side only** payment status updates  
✅ **Duplicate payment prevention**  
✅ **Comprehensive audit logging**  
✅ **Row Level Security (RLS)** on database  

---

## 📊 Payment Flow

```
1. Frontend → initializePayment() → Creates pending payment record
2. Frontend → Paystack.popup() → User enters card details
3. Paystack → Webhook → Verifies payment server-side
4. Webhook → Update DB → Marks payment as 'paid'
5. Webhook → Notifications → Alerts tenant & landlord
6. Frontend → Poll status → Shows confirmation
```

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Start development (frontend only - Vite)
npm run dev

# Start Next.js server (for webhooks)
cd /path/to/project && npx next dev

# Build for production
npm run build

# Test locally with ngrok
ngrok http 3000
```

---

## 🐛 Common Issues

### Webhook not receiving events
- ✅ Verify webhook URL in Paystack dashboard
- ✅ Check server is running and accessible
- ✅ Use ngrok for local testing

### Payment shows complete but status is pending
- ✅ This is normal - wait for webhook (< 30 seconds)
- ✅ Check webhook logs in Paystack dashboard
- ✅ Verify PAYSTACK_SECRET_KEY is correct

### "Invalid signature" error
- ✅ Ensure PAYSTACK_SECRET_KEY matches dashboard
- ✅ Check webhook is from Paystack (not manual test)

---

## 📚 Full Documentation

For detailed information, see: [docs/PAYSTACK_INTEGRATION.md](./PAYSTACK_INTEGRATION.md)

---

## 🎯 Production Checklist

- [ ] Switch to live Paystack keys (`pk_live_` and `sk_live_`)
- [ ] Update webhook URL to production domain
- [ ] Test with small amount first
- [ ] Monitor webhook delivery in Paystack dashboard
- [ ] Verify payment records in database
- [ ] Test full flow: payment → notification → agreement

---

## 🆘 Support Links

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Support](https://paystack.com/contact)
- [Paystack Webhooks](https://paystack.com/docs/payments/webhooks)
- [Test Cards](https://paystack.com/docs/payments/test-payments)
