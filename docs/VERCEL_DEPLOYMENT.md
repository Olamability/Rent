# Vercel Deployment Configuration

## Overview
This project is configured to deploy to Vercel as a **Vite React application** with **Serverless Functions** for API routes.

## Architecture
- **Frontend**: Vite + React + TypeScript (builds to `/dist`)
- **API Routes**: Vercel Serverless Functions (in `/api` directory)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payment Gateway**: Paystack

## Deployment Configuration

### vercel.json
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Key settings:
- `framework: null` - Prevents Next.js auto-detection
- `buildCommand: "npm run build"` - Uses Vite build
- `outputDirectory: "dist"` - Vite build output
- Rewrites ensure SPA routing works correctly

## Environment Variables

Required environment variables in Vercel:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for API routes only)

### Payment Gateway
- `PAYSTACK_SECRET_KEY` - Paystack secret key for payment verification
- `PAYSTACK_PUBLIC_KEY` - Paystack public key (optional, can be in frontend)

### Other
- Any additional environment variables your app needs

## API Routes

All API routes are Vercel Serverless Functions in the `/api` directory:

- `/api/payments/verify` - Payment verification
- `/api/agreements/sign` - Agreement signing with security
- `/api/auth/register` - User registration
- `/api/webhooks/paystack` - Paystack webhook handler

## Build Process

1. **Install dependencies**: `npm install`
2. **Build frontend**: `npm run build` (Vite)
3. **Deploy**: Vercel automatically deploys serverless functions from `/api`

## Troubleshooting

### Build Fails
- Check that all environment variables are set in Vercel dashboard
- Verify `npm run build` works locally
- Check build logs in Vercel dashboard

### API Routes Not Working
- Ensure environment variables are set (especially `SUPABASE_SERVICE_ROLE_KEY`)
- Check function logs in Vercel dashboard
- Verify CORS headers are properly set

### Next.js Detection Issue
- Ensure `next.config.mjs` is renamed to `.bak` or removed
- Verify `framework: null` is set in `vercel.json`
- Check that `app/` directory is not interfering (it's ignored during build)

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Notes

- The original Next.js config files are kept as `.bak` for reference
- The `app/` directory with Next.js API routes is preserved but not used
- All API functionality has been migrated to Vercel Serverless Functions
- No functionality has been lost in the migration

## Support

For deployment issues, check:
1. Vercel dashboard logs
2. Environment variables configuration
3. Build command and output directory settings
