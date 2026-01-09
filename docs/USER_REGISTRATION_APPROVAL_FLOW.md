# User Registration and Approval Flow

## Overview

This document describes the complete user registration and approval workflow implemented in RentFlow. The workflow ensures that all users complete their profiles before gaining access to the platform, and that administrators review and approve accounts before users can access restricted features.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. User Registration
   ├─> User creates account (email, password, name, role)
   ├─> Supabase Auth sends confirmation email
   └─> account_status: 'pending' (set by trigger)

2. Email Confirmation
   ├─> User clicks confirmation link in email
   └─> Email verified in Supabase Auth

3. First Login
   ├─> User logs in with credentials
   ├─> AuthContext loads user profile
   ├─> ProtectedRoute checks profile completion
   └─> IF profile_complete = false
       └─> Redirect to profile completion page

4. Profile Completion
   ├─> User fills in ALL mandatory fields
   │   ├─> Tenant: Personal info, address, employment, emergency contact
   │   └─> Landlord: Personal info, address, business info, bank details
   ├─> User clicks "Save Profile"
   ├─> Backend calculates profile completeness
   └─> IF all required fields filled (completeness = 100%)
       ├─> profile_complete = true
       ├─> profile_completeness = 100
       └─> account_status remains 'pending' (trigger maintains this)

5. Account Approval
   ├─> Admin/Super Admin reviews user in admin dashboard
   ├─> Admin clicks "Approve" button
   ├─> Database validates profile_complete = true (trigger)
   └─> IF profile complete
       ├─> account_status = 'approved'
       └─> User can now access all features
       ELSE
       └─> Error: "Cannot approve account with incomplete profile"

6. Access Control
   ├─> ProtectedRoute checks account_status
   ├─> IF account_status = 'pending'
   │   └─> Redirect to "Waiting for Approval" page
   ├─> IF account_status = 'approved'
   │   └─> Grant access to dashboard and features
   └─> IF account_status = 'suspended' or 'banned'
       └─> Show error message and prevent access
```

## Implementation Details

### Database Layer

#### 1. Triggers

**Trigger: `auto_set_pending_on_profile_complete`**
- **When**: User updates their profile with `profile_complete = true` and `profile_completeness = 100`
- **Action**: Ensures `account_status` remains 'pending' if it was already pending
- **Purpose**: Automatically maintains pending status when profile is completed

**Trigger: `validate_approval_requires_complete_profile`**
- **When**: Admin attempts to change `account_status` to 'approved'
- **Action**: Validates that `profile_complete = true` and `profile_completeness = 100`
- **Purpose**: Enforces profile completion requirement at database level
- **Error**: Raises exception if profile is not complete

#### 2. Functions

**Function: `auto_update_account_status_on_profile_complete()`**
```sql
-- Automatically sets account_status to 'pending' when profile is completed
-- Prevents status changes if user is already approved/suspended/banned
```

**Function: `validate_profile_completion_before_approval()`**
```sql
-- Validates profile completion before allowing approval
-- Checks profile_complete = true AND profile_completeness = 100
-- Raises exception if requirements not met
```

### Application Layer

#### 1. Profile Services

**`upsertTenantProfileWithCompletion()`** and **`upsertLandlordProfileWithCompletion()`**
- Save profile data to database
- Calculate profile completeness percentage
- Update `profile_complete` and `profile_completeness` fields in users table
- Return completion status to UI

**`updateProfileCompletionStatus()`**
- Helper function that calculates completion percentage
- Checks if all required fields are filled
- Updates users table with completion status

#### 2. Profile Pages

**Tenant Profile (`src/pages/tenant/Profile.tsx`)**
- Collects all required tenant information
- Validates required fields before saving
- Shows profile completeness banner
- Displays success message when profile is complete

**Landlord Profile (`src/pages/landlord/Profile.tsx`)**
- Collects all required landlord information
- Validates required fields before saving
- Shows profile completeness banner
- Displays success message when profile is complete

#### 3. Protected Routes

**`ProtectedRoute` Component (`src/components/auth/ProtectedRoute.tsx`)**
- Checks authentication status
- Validates account status (pending/approved/suspended/banned)
- Redirects to profile page if profile incomplete
- Redirects to waiting page if account pending
- Shows error for suspended/banned accounts

#### 4. Account Approval

**User Management (`src/pages/admin/UserManagement.tsx`)**
- Admins can view all user accounts
- Shows profile completion status
- Approve button only enabled for complete profiles
- Database trigger prevents approval of incomplete profiles

### Required Fields

#### Tenant Profile
1. **Basic Information**
   - Name (from user table)
   - Email (from user table)
   - Phone (from user table)

2. **Personal Information**
   - First Name
   - Last Name
   - Date of Birth
   - National ID

3. **Address**
   - Street
   - City
   - State
   - Zip Code

4. **Employment**
   - Employment Status
   - Employer
   - Position
   - Monthly Income

5. **Emergency Contact**
   - Name
   - Relationship
   - Phone

#### Landlord Profile
1. **Basic Information**
   - Name (from user table)
   - Email (from user table)
   - Phone (from user table)

2. **Personal Information**
   - First Name
   - Last Name
   - Date of Birth
   - National ID

3. **Address**
   - Street
   - City
   - State
   - Zip Code

4. **Business Information** (if registered business)
   - Business Name
   - Business Registration Number

5. **Bank Details** (required for rent collection)
   - Bank Name
   - Account Number
   - Account Name

## User Experience

### For End Users (Tenants/Landlords)

1. **Registration**: Simple sign-up form with basic information
2. **Email Confirmation**: Click link in email to verify
3. **First Login**: Automatically redirected to profile page if incomplete
4. **Profile Completion**: Clear indication of required fields and progress
5. **Pending Status**: Friendly waiting page with explanation
6. **Approval**: Email notification when account is approved
7. **Full Access**: Access to all features after approval

### For Administrators

1. **User Management Dashboard**: View all users and their status
2. **Profile Review**: Check if user profiles are complete
3. **Approval Process**: One-click approval for complete profiles
4. **Validation**: Prevented from approving incomplete profiles
5. **Audit Trail**: All approval actions are logged

## Error Handling

### Database Errors
- **Incomplete Profile Approval**: "Cannot approve account: Profile must be completed before approval"
- **Missing Completeness**: "Cannot approve account: Profile completeness is X%. Profile must be 100% complete"

### Application Errors
- **Missing Required Fields**: Clear validation messages for each field
- **Permission Denied**: Handled by RLS policies
- **Network Errors**: User-friendly error messages with retry options

## Testing

### Manual Testing Steps

1. **Test Registration Flow**
   ```
   - Register new user (tenant or landlord)
   - Check email for confirmation link
   - Click confirmation link
   - Login to account
   - Verify redirect to profile page
   ```

2. **Test Profile Completion**
   ```
   - Fill in profile partially (should show progress)
   - Try to save incomplete profile (should save but not complete)
   - Fill in ALL required fields
   - Save profile
   - Verify profile_complete = true in database
   - Verify redirect to waiting page
   ```

3. **Test Approval Process**
   ```
   - Login as admin
   - Navigate to User Management
   - Find user with incomplete profile
   - Try to approve (should fail)
   - Find user with complete profile
   - Approve user
   - Verify account_status = 'approved'
   - Login as approved user
   - Verify access to dashboard
   ```

4. **Test Access Control**
   ```
   - Login with pending account
   - Verify redirect to waiting page
   - Try to access dashboard directly (should redirect)
   - Login with approved account
   - Verify access to all features
   ```

### Database Testing

Run the following SQL to test triggers:

```sql
-- Test: Try to approve user with incomplete profile (should fail)
UPDATE users 
SET account_status = 'approved' 
WHERE id = 'user-id-here' 
AND profile_complete = false;
-- Expected: ERROR: Cannot approve account: Profile must be completed before approval

-- Test: Complete profile and verify status
UPDATE users 
SET profile_complete = true, profile_completeness = 100 
WHERE id = 'user-id-here';
-- Expected: account_status remains 'pending'

-- Test: Approve user with complete profile (should succeed)
UPDATE users 
SET account_status = 'approved' 
WHERE id = 'user-id-here' 
AND profile_complete = true;
-- Expected: Success, account_status = 'approved'
```

## Deployment

### Database Migration

1. Run the migration script on your Supabase database:
   ```bash
   # In Supabase SQL Editor, run:
   database/user_registration_approval_flow.sql
   ```

2. Verify triggers and functions are created:
   ```sql
   -- Check functions
   SELECT proname FROM pg_proc 
   WHERE proname LIKE '%profile%approval%';

   -- Check triggers
   SELECT tgname FROM pg_trigger 
   WHERE tgname LIKE '%profile%';
   ```

### Application Deployment

1. Deploy the updated code to your environment
2. Verify environment variables are set correctly
3. Test the flow with a new user registration
4. Monitor logs for any errors

## Troubleshooting

### Common Issues

1. **Profile not marking as complete**
   - Check all required fields are filled
   - Verify profile service is calling `updateProfileCompletionStatus`
   - Check browser console for errors

2. **Trigger not firing**
   - Verify triggers exist in database
   - Check trigger conditions match update statement
   - Review database logs for errors

3. **Approval fails for complete profile**
   - Check `profile_complete` and `profile_completeness` in database
   - Verify trigger function is not raising exceptions
   - Review admin permissions

4. **User stuck on waiting page**
   - Verify `account_status` is 'approved' in database
   - Clear browser cache and session storage
   - Check AuthContext is syncing account status

## Security Considerations

1. **Database-Level Enforcement**: Triggers ensure rules cannot be bypassed
2. **RLS Policies**: Prevent unauthorized profile access
3. **Validation**: Both client-side and server-side validation
4. **Audit Trail**: All account changes are logged
5. **Role-Based Access**: Only admins can approve accounts

## Future Enhancements

1. **Email Notifications**: Send email when account is approved
2. **Profile Reminders**: Remind users to complete profile
3. **Partial Save**: Allow saving incomplete profiles with progress
4. **Profile Review**: Admins can request profile changes
5. **Bulk Approval**: Approve multiple users at once
6. **Auto-Approval**: Optional auto-approval for certain user types

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Check database logs in Supabase
4. Contact technical support

---

**Last Updated**: 2026-01-07
**Version**: 1.0.0
