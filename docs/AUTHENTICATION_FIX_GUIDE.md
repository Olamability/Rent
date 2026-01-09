# RentFlow Authentication & Registration Fix Implementation Guide

## Overview
This document provides a comprehensive guide to the fixed authentication and registration system, addressing all issues outlined in Task.md.

## Issues Fixed

### 1. ✅ Auth → public.users Synchronization
**Problem**: Users were created in `auth.users` but not in `public.users`, causing "User account not found in database" errors on login.

**Solution**: 
- Database trigger `on_auth_user_created` automatically creates corresponding records in `public.users` when a user registers via Supabase Auth
- The trigger also creates the appropriate role-specific profile (tenant, landlord, or admin)

**Implementation**:
```sql
-- Trigger executes AFTER user is created in auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

### 2. ✅ Admin Verification Code Security
**Problem**: Admin registration accepted random verification codes, representing a critical security vulnerability.

**Solution**:
- Database trigger `before_auth_user_created_admin_verification` validates admin codes BEFORE account creation
- Invalid codes cause registration to fail with proper error message
- Codes are checked against `admin_codes` table for validity, expiration, and single-use status
- Code determines the actual role (admin or super_admin), preventing privilege escalation

**Implementation**:
```sql
-- Trigger executes BEFORE user is created to validate admin code
CREATE TRIGGER before_auth_user_created_admin_verification
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.validate_admin_registration();
```

### 3. ✅ Admin Code Generation
**Problem**: No secure way for super admins to generate verification codes.

**Solution**:
- Added `generate_admin_code()` PostgreSQL function
- Only super admins can generate codes
- Codes are single-use, role-specific, and have configurable expiration
- Generates cryptographically secure 32-character codes
- Automatically logs code generation in audit logs

**Usage**:
```sql
-- Generate an admin code that expires in 24 hours
SELECT * FROM generate_admin_code('admin', '24 hours');

-- Generate a super_admin code that expires in 7 days
SELECT * FROM generate_admin_code('super_admin', '7 days');
```

## Registration Flows

### Tenant & Landlord Registration
**No verification code required**

1. User visits `/register`
2. Selects role (tenant or landlord)
3. Fills out registration form
4. Submits form
5. **Backend Process**:
   - Supabase Auth creates user in `auth.users`
   - `handle_new_user` trigger creates record in `public.users` with `account_status = 'pending'`
   - Trigger creates appropriate profile (tenant_profile or landlord_profile)
6. User receives email confirmation
7. Account remains in "pending" status
8. Admin receives notification of new registration
9. User cannot login until approved

### Admin & Super Admin Registration
**Requires valid verification code**

1. Super admin generates code via `/admin/verification-codes`
2. Super admin securely shares code with new admin
3. New admin visits `/admin/register`
4. Fills out registration form including verification code
5. Submits form
6. **Backend Process**:
   - `validate_admin_registration` trigger (BEFORE) validates code:
     * Checks if code exists
     * Checks if code is not already used
     * Checks if code has not expired
     * If valid: sets role based on code type
     * If invalid: raises exception, registration fails
   - If validation passes, Supabase Auth creates user
   - `handle_new_user` trigger (AFTER) creates record in `public.users`
   - Trigger creates admin_profile
   - Trigger marks code as used in `admin_codes` table
7. Account status set to "pending"
8. Super admin must approve account before login

**Security Features**:
- Code validation happens at database level (cannot be bypassed)
- Invalid/expired/used codes cause registration to fail
- Role is determined by code, not user input
- Single-use codes prevent reuse
- Audit trail of all code generation and usage

## Account Approval Workflow

### For All User Types
1. **Registration**: Account created with `account_status = 'pending'`
2. **Email Confirmation**: User verifies email (if required)
3. **Login Attempt**: User tries to login
4. **Status Check**: System checks account_status
   - If `pending`: Login denied with message "Your account is pending approval"
   - If `suspended`: Login denied with message "Your account has been suspended"
   - If `banned`: Login denied with message "Your account has been banned"
   - If `approved`: Login succeeds
5. **Admin Approval**: Admin/Super Admin approves account
6. **Restricted Access**: After approval and login:
   - User can only access profile completion page
   - All other routes redirect to profile
7. **Profile Completion**: User fills out complete profile
8. **Full Access**: After profile completion, user gains full access

### Admin Actions
Admins and Super Admins can:
- View all pending user registrations
- Approve or reject accounts
- Suspend or ban accounts
- View account details and registration information

## Database Schema

### Key Tables

#### users
Main user table synced with auth.users
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'admin', 'super_admin')),
    phone TEXT,
    avatar TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    profile_complete BOOLEAN DEFAULT FALSE,
    profile_completeness INTEGER DEFAULT 0,
    account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'suspended', 'banned')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### admin_codes
Stores admin verification codes
```sql
CREATE TABLE public.admin_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Functions

#### handle_new_user()
Triggered after user creation in auth.users
- Creates record in public.users
- Sets account_status to 'pending'
- Creates role-specific profile
- Marks admin code as used (if applicable)

#### validate_admin_registration()
Triggered before user creation for admin registrations
- Validates admin_code from user metadata
- Checks code exists, not used, not expired
- Sets role based on code type
- Raises exception if invalid

#### generate_admin_code(p_role, p_expires_in)
Generates new admin verification codes
- Only callable by super admins
- Creates secure random code
- Stores in admin_codes table
- Logs in audit_logs

#### verify_admin_code(code)
Validates a verification code
- Checks admin_codes table
- Returns role if valid
- Returns NULL if invalid

## Frontend Components

### /src/pages/auth/Register.tsx
Tenant and Landlord registration
- No admin code field
- Sends role in user metadata
- Database trigger handles profile creation

### /src/pages/auth/AdminRegister.tsx
Admin and Super Admin registration
- Requires admin code field
- Sends admin_code in user metadata
- Database trigger validates code before registration
- Shows specific error for invalid codes

### /src/pages/admin/AdminVerificationCode.tsx
Admin code management (Super Admin only)
- Generate new codes
- View all codes and their status
- Copy codes to clipboard
- Shows used/expired/active status

### /src/contexts/AuthContext.tsx
Authentication context
- Handles login with role validation
- Checks account_status before allowing login
- Syncs user profile from database
- Enforces role-based access control

## Security Features

1. **Database-Level Validation**: Admin code validation happens in PostgreSQL triggers, cannot be bypassed from frontend
2. **Role Enforcement**: User cannot choose their own role for admin registration; code determines role
3. **Single-Use Codes**: Each code can only be used once
4. **Expiration**: Codes expire after specified time
5. **Audit Trail**: All code generation and usage is logged
6. **RLS Policies**: Row-level security enforces access control
7. **Super Admin Only**: Only super admins can generate codes
8. **Secure Random Generation**: Codes use cryptographically secure random bytes
9. **Account Approval**: All new accounts require admin approval
10. **Status Checks**: Login validates account status (pending/approved/suspended/banned)

## Testing

### Test Registration Flows
Use the provided test script: `/database/test_registration_flow.sql`

1. Run SQL tests to verify functions and triggers exist
2. Test tenant/landlord registration (no code)
3. Test admin registration with valid code
4. Test admin registration with invalid code (should fail)
5. Test login with pending account (should fail)
6. Test approval workflow
7. Test profile completion restrictions

### Manual Testing Checklist
- [ ] Tenant registration succeeds without code
- [ ] Landlord registration succeeds without code
- [ ] Admin registration fails with random code
- [ ] Admin registration succeeds with valid code
- [ ] Super admin registration succeeds with valid super_admin code
- [ ] Used codes cannot be reused
- [ ] Expired codes are rejected
- [ ] Pending accounts cannot login
- [ ] Approved accounts can login
- [ ] Users see profile completion page first
- [ ] After profile completion, full access granted
- [ ] Only super admins can generate codes
- [ ] Only admins can approve accounts

## Deployment Steps

1. **Backup Database**: Always backup before schema changes
2. **Run Schema**: Execute `/database/schema.sql` in Supabase SQL Editor
3. **Verify Functions**: Run test script to verify all functions exist
4. **Create Super Admin**: Manually set first super admin in database:
   ```sql
   UPDATE public.users 
   SET role = 'super_admin', account_status = 'approved'
   WHERE email = 'your-email@example.com';
   ```
5. **Generate First Code**: Login as super admin and generate codes
6. **Test Flows**: Test all registration and approval flows
7. **Monitor Logs**: Check Supabase logs for any errors

## Troubleshooting

### Issue: "User account not found in database"
**Cause**: `handle_new_user` trigger not executing
**Solution**: 
- Verify trigger exists: Check in Supabase Dashboard → Database → Triggers
- Re-run schema.sql to recreate trigger
- Check Supabase logs for trigger errors

### Issue: Admin registration succeeds with random code
**Cause**: `validate_admin_registration` trigger not executing
**Solution**:
- Verify trigger exists and is enabled
- Re-run schema.sql to recreate trigger
- Clear browser cache and try again
- Check Supabase logs for validation errors

### Issue: "Only super admins can generate admin verification codes"
**Cause**: User role is not 'super_admin' in database
**Solution**:
- Check user role: `SELECT role FROM public.users WHERE email = 'your-email';`
- Update if needed: `UPDATE public.users SET role = 'super_admin' WHERE email = 'your-email';`
- Logout and login again

### Issue: Approved users still can't login
**Cause**: account_status not properly set
**Solution**:
- Check status: `SELECT account_status FROM public.users WHERE email = 'user-email';`
- Update: `UPDATE public.users SET account_status = 'approved' WHERE email = 'user-email';`

## API Endpoints

The system uses Supabase Auth API directly:
- `supabase.auth.signUp()` - Registration
- `supabase.auth.signInWithPassword()` - Login
- `supabase.rpc('generate_admin_code')` - Code generation
- `supabase.from('admin_codes').select()` - View codes
- `supabase.from('users').update()` - Approve accounts

## Best Practices

1. **Never Expose Codes**: Share admin codes securely (encrypted channels)
2. **Regular Rotation**: Generate new codes regularly, expire old ones
3. **Monitor Usage**: Review audit logs for suspicious activity
4. **Limit Super Admins**: Keep super admin count minimal
5. **Prompt Approval**: Review and approve/reject accounts promptly
6. **Profile Completion**: Enforce complete profiles before full access
7. **Status Reviews**: Regularly review suspended/banned accounts

## Maintenance

### Regular Tasks
- Review pending account approvals
- Check for expired unused codes
- Monitor failed login attempts
- Review audit logs
- Update RLS policies as needed

### Quarterly Tasks
- Review and expire old unused codes
- Audit super admin list
- Review banned/suspended accounts
- Update documentation

## Support

For issues or questions:
1. Check Supabase logs: Dashboard → Logs
2. Review test script results
3. Check RLS policies: Dashboard → Database → Policies
4. Verify trigger status: Dashboard → Database → Triggers
5. Check function definitions: Dashboard → Database → Functions

## Conclusion

This implementation provides:
- ✅ Secure authentication and registration
- ✅ Role-based access control
- ✅ Admin code verification system
- ✅ Account approval workflow
- ✅ Database-level security
- ✅ Comprehensive audit trail
- ✅ Production-ready scalability

All issues from Task.md have been addressed with production-grade security and maintainability.
