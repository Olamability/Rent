# Quick Start: User Registration and Approval Flow

## 🚀 For Developers

### Setup (One-time)

1. **Run the migration script in Supabase SQL Editor:**
   ```sql
   -- Copy and paste the contents of database/user_registration_approval_flow.sql
   ```

2. **Verify installation:**
   ```sql
   -- Copy and paste the contents of database/test_registration_approval_flow.sql
   -- Check that all tests pass
   ```

3. **Done!** The flow is now active.

## 📝 How It Works

### For End Users

```
1. Register → Email confirmation → Login
   ↓
2. Automatically redirected to Profile page
   ↓
3. Fill in ALL required fields → Save
   ↓
4. Profile complete → Status: Pending Approval
   ↓
5. Admin approves → Status: Approved → Full access granted
```

### Required Fields

**Tenants:**
- Basic: Name, Email, Phone
- Personal: First/Last Name, DOB, National ID
- Address: Street, City, State, Zip
- Employment: Status, Employer, Position, Income
- Emergency Contact: Name, Relationship, Phone

**Landlords:**
- Basic: Name, Email, Phone
- Personal: First/Last Name, DOB, National ID
- Address: Street, City, State, Zip
- Bank: Bank Name, Account Number, Account Name
- Business (if applicable): Name, Registration Number

## 🔧 For Developers

### Profile Completion Service

```typescript
import { 
  upsertTenantProfileWithCompletion,
  upsertLandlordProfileWithCompletion 
} from '@/services/[tenant|landlord]ProfileService';

// Save profile with automatic completion status update
const result = await upsertTenantProfileWithCompletion(
  userId,
  { name, email, phone },
  profileData
);

// Returns:
// {
//   profile: TenantProfile,
//   profileComplete: boolean,
//   profileCompleteness: number (0-100)
// }
```

### Profile Completion Utilities

```typescript
import {
  isTenantProfileComplete,
  isLandlordProfileComplete,
  calculateTenantCompleteness,
  calculateLandlordCompleteness,
} from '@/lib/profileCompletionUtils';

// Check if profile is complete
const isComplete = isTenantProfileComplete(user, profile);

// Calculate completeness percentage
const percentage = calculateTenantCompleteness(user, profile);
```

### Database Access

```sql
-- Check user profile status
SELECT 
  email, 
  account_status, 
  profile_complete, 
  profile_completeness 
FROM users 
WHERE email = 'user@example.com';

-- Try to approve incomplete profile (will fail)
UPDATE users 
SET account_status = 'approved' 
WHERE email = 'user@example.com';
-- ERROR: Cannot approve account: Profile must be completed before approval

-- Complete profile
UPDATE users 
SET 
  profile_complete = true,
  profile_completeness = 100
WHERE email = 'user@example.com';

-- Now approve (will succeed)
UPDATE users 
SET account_status = 'approved' 
WHERE email = 'user@example.com';
```

## 🧪 Testing

### Quick Test

```bash
# 1. Register a new user through the app
# 2. Login and verify redirect to profile page
# 3. Fill in profile completely and save
# 4. Verify you see "Profile complete! Pending approval" message
# 5. Login as admin
# 6. Go to User Management
# 7. Try to approve the user
# 8. Verify approval succeeds
# 9. Login as the user again
# 10. Verify full access to dashboard
```

### Database Test

```sql
-- Run in Supabase SQL Editor
-- Copy and paste: database/test_registration_approval_flow.sql
-- All tests should pass with ✓
```

## 🐛 Troubleshooting

### Profile not marking as complete

**Issue:** Profile saved but not showing as complete

**Solutions:**
1. Check all required fields are filled (see list above)
2. Check browser console for errors
3. Verify `profileCompleteness` = 100 in database
4. Check that profile service is being called correctly

```sql
-- Check what's missing
SELECT 
  profile_complete,
  profile_completeness,
  role
FROM users 
WHERE email = 'user@example.com';
```

### Cannot approve user

**Issue:** Admin gets error when trying to approve

**Solutions:**
1. Verify profile is 100% complete
2. Check database for trigger errors
3. Run test script to verify triggers are working

```sql
-- Verify triggers exist
SELECT tgname 
FROM pg_trigger 
WHERE tgname LIKE '%profile%';

-- Should return:
-- validate_approval_requires_complete_profile
-- auto_set_pending_on_profile_complete
```

### User stuck on waiting page

**Issue:** User approved but still seeing "Waiting for Approval"

**Solutions:**
1. Verify account_status in database
2. Clear browser cache and localStorage
3. Logout and login again

```sql
-- Check status
SELECT account_status 
FROM users 
WHERE email = 'user@example.com';

-- If not 'approved', update it
UPDATE users 
SET account_status = 'approved' 
WHERE email = 'user@example.com'
AND profile_complete = true;
```

## 📚 Full Documentation

For complete details, see:
- **[Full Documentation](./USER_REGISTRATION_APPROVAL_FLOW.md)** - Complete implementation guide
- **[Database README](../database/README.md)** - Database schema and migrations
- **[Main README](../README.md)** - Project overview and setup

## 🎯 Key Points

✅ **Database-level enforcement** - Cannot be bypassed
✅ **Automatic status management** - No manual updates needed
✅ **Profile completeness tracking** - 0-100% calculation
✅ **User-friendly flow** - Clear guidance at each step
✅ **Admin validation** - Prevents approval of incomplete profiles

## ⚡ Quick Commands

```bash
# Run migration
psql -f database/user_registration_approval_flow.sql

# Run tests
psql -f database/test_registration_approval_flow.sql

# Check status
psql -c "SELECT email, account_status, profile_complete FROM users;"

# Approve user (must have complete profile)
psql -c "UPDATE users SET account_status='approved' WHERE email='user@example.com' AND profile_complete=true;"
```

---

**Need help?** See [USER_REGISTRATION_APPROVAL_FLOW.md](./USER_REGISTRATION_APPROVAL_FLOW.md) for detailed information.
