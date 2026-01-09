# RentFlow Database Schema - Setup Guide

## 📋 Overview

This guide will help you set up the RentFlow database schema in your Supabase project. The schema includes:

- ✅ **20 Core Tables** with proper relationships
- ✅ **Complete Row Level Security (RLS)** policies
- ✅ **Performance Indexes** on all key columns
- ✅ **Triggers & Functions** for automation
- ✅ **Admin Verification System**
- ✅ **Public Property Listings View**

## 🚀 Quick Setup (5 minutes)

### Step 1: Access Supabase SQL Editor

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click on "SQL Editor" in the sidebar
4. Click "New Query"

### Step 2: Run the Schema

1. Open `database/schema.sql` from this repository
2. Copy the **entire file** contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

**Note:** This script will **DROP ALL EXISTING TABLES** and create fresh ones. Make sure to backup your data first if you have any!

### Step 3: Verify Installation

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see 20 tables:
- admin_codes
- admin_profiles
- audit_logs
- documents
- landlord_profiles
- maintenance_requests
- maintenance_updates
- notifications
- payments
- platform_announcements
- properties
- property_applications
- reminders
- subscriptions
- support_tickets
- system_config
- tenancy_agreements
- tenant_profiles
- ticket_messages
- units
- users

### Step 4: Get Admin Verification Code

To register admin or super_admin users, you'll need the verification code:

```sql
SELECT config_value 
FROM public.system_config 
WHERE config_key = 'ADMIN_VERIFICATION_CODE';
```

**Important:** Copy this code - you'll need it when registering admin accounts!

## 📊 Database Structure

### Core User Tables

```
users (main user table)
├── tenant_profiles
├── landlord_profiles
└── admin_profiles
```

### Property Management

```
properties (landlord properties)
└── units (rental units)
    ├── tenancy_agreements (leases)
    ├── property_applications (tenant apps)
    ├── payments (rent payments)
    └── maintenance_requests (issues)
        └── maintenance_updates (comments)
```

### Supporting Tables

```
notifications (in-app alerts)
reminders (scheduled notifications)
documents (file attachments)
subscriptions (landlord plans)
support_tickets (user support)
│   └── ticket_messages (conversations)
audit_logs (system audit trail)
platform_announcements (admin broadcasts)
system_config (app configuration)
admin_codes (admin registration codes)
```

### Views

- `public_property_listings` - Public marketplace view (anonymous access allowed)

## 🔐 Security Features

### Row Level Security (RLS)

All tables have RLS enabled with comprehensive policies:

- **Users** can only view/edit their own data
- **Landlords** can manage their properties, units, and tenant interactions
- **Tenants** can view public listings and manage their applications/payments
- **Admins** have elevated access to manage users and platform operations
- **Super Admins** have full access to all data and system configuration

### Helper Functions

- `is_admin()` - Check if current user is admin or super_admin
- `is_super_admin()` - Check if current user is super_admin
- `verify_admin_code(code)` - Verify admin registration codes

### Triggers

- `on_auth_user_created` - Automatically creates user profile when auth account is created
- `before_auth_user_created_admin_verification` - Validates admin codes before account creation
- `update_*_updated_at` - Automatically updates `updated_at` timestamp on all tables

## 🧪 Testing the Setup

### 1. Register Test Users

Use the RentFlow application to register:

- **Tenant**: Use regular registration at `/register`
- **Landlord**: Use regular registration at `/register` with landlord role
- **Admin/Super Admin**: Use admin registration at `/admin/register` with the verification code

### 2. Approve Users (for testing)

Since all new users start with `account_status = 'pending'`, you'll need to approve them:

```sql
-- Approve a specific user
UPDATE public.users 
SET account_status = 'approved' 
WHERE email = 'user@example.com';

-- Approve all users (for testing only!)
UPDATE public.users 
SET account_status = 'approved' 
WHERE account_status = 'pending';
```

### 3. Test Login

- Go to the login page
- Use your registered credentials
- You should be redirected to the appropriate dashboard based on your role

## 🔄 Account Approval Workflow

By default, all new accounts start as **pending** and require admin approval:

1. User registers → `account_status = 'pending'`
2. Admin reviews in User Management dashboard
3. Admin approves → `account_status = 'approved'`
4. User can now log in fully

To bypass approval for testing, run:

```sql
UPDATE public.users 
SET account_status = 'approved' 
WHERE email = 'your-test-email@example.com';
```

## 📝 Common Operations

### Generate New Admin Code

```sql
-- Super admin must be logged in to run this
INSERT INTO public.admin_codes (
    code, 
    role, 
    created_by, 
    expires_at
) VALUES (
    'YOUR_CUSTOM_CODE', -- or use encode(gen_random_bytes(16), 'hex')
    'admin', -- or 'super_admin'
    auth.uid(), -- current super admin user ID
    NOW() + INTERVAL '30 days'
);
```

### View All RLS Policies

```sql
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Check Table Sizes

```sql
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

## 🐛 Troubleshooting

### Issue: "permission denied for table users"

**Solution:** Make sure RLS policies are properly set up. Re-run the schema.sql file.

### Issue: "new row violates row-level security policy"

**Solution:** Check that:
1. User is authenticated (`auth.uid()` returns valid ID)
2. User has approved account status
3. User has correct role for the operation

### Issue: "insert or update on table violates foreign key constraint"

**Solution:** Ensure referenced records exist. For example:
- Properties must exist before creating units
- Users must exist before creating profiles

### Issue: Admin registration fails with "Invalid verification code"

**Solution:** 
1. Get the current code: `SELECT config_value FROM public.system_config WHERE config_key = 'ADMIN_VERIFICATION_CODE';`
2. Or generate a new admin code (requires super admin access)

## 🔄 Migration from Old Schema

If you're upgrading from an older version:

1. **Backup your data first!**
2. Export data from critical tables (users, properties, payments, etc.)
3. Run the new schema.sql
4. Re-import your data
5. Update any changed column names/types as needed

Old schema files are backed up in `database/old_schemas/` for reference.

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs in your browser
2. Check the Supabase logs in the Dashboard
3. Review the RLS policies for the affected table
4. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Your schema version

## ✅ Checklist

- [ ] Ran schema.sql in Supabase SQL Editor
- [ ] Verified all 20 tables were created
- [ ] Retrieved admin verification code
- [ ] Registered test users (tenant, landlord, admin)
- [ ] Approved test users for login
- [ ] Successfully logged in with each role
- [ ] Tested basic functionality (create property, apply for unit, etc.)

---

**Schema Version:** 2.0  
**Last Updated:** 2026-01-06  
**Compatible with:** RentFlow v1.0+
