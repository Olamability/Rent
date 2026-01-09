# Database Optimization - Testing Checklist

## Pre-Implementation ✅

- [ ] **Review all documentation**
  - [ ] Read `OPTIMIZATION_GUIDE.md` completely
  - [ ] Understand `OPTIMIZATION_SUMMARY.md`
  - [ ] Review each SQL script briefly

- [ ] **Backup database**
  - [ ] Create Supabase manual backup
  - [ ] Wait for backup completion
  - [ ] Verify backup was successful
  - [ ] Document backup timestamp

- [ ] **Prepare environment**
  - [ ] Open Supabase SQL Editor
  - [ ] Have application ready for testing
  - [ ] Clear browser cache
  - [ ] Note current performance metrics

## Phase 1: Security Hardening 🔒

### Run Script
- [ ] Copy `database/security-hardening-fixes.sql`
- [ ] Paste in Supabase SQL Editor
- [ ] Execute script
- [ ] Check for errors (there should be none)
- [ ] Verify success message appears

### Verify Results
- [ ] Run verification query:
```sql
SELECT 
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' 
             OR pg_get_functiondef(p.oid) LIKE '%set_config(''search_path''%'
        THEN '✅ SECURED'
        ELSE '❌ VULNERABLE'
    END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
ORDER BY function_name;
```
- [ ] All functions show ✅ SECURED
- [ ] Count matches expected (18 functions)

### Test Critical Functions
- [ ] **Test User Registration**
  - [ ] Register as Tenant
  - [ ] Register as Landlord
  - [ ] Register as Admin (with code)
  - [ ] Verify all succeed

- [ ] **Test Admin Code System**
  - [ ] Generate admin code (as super admin)
  - [ ] Use admin code for registration
  - [ ] Verify code marked as used

- [ ] **Test Payment Functions**
  - [ ] Submit payment
  - [ ] Verify status updates
  - [ ] Check payment history

- [ ] **Test Application Workflow**
  - [ ] Submit application
  - [ ] Approve application
  - [ ] Verify unit status changes

- [ ] **Test Agreement Generation**
  - [ ] Generate agreement
  - [ ] Sign agreement
  - [ ] Verify tenancy created

## Phase 2: Performance Optimization ⚡

### Run Script
- [ ] Copy `database/performance-optimization-indexes.sql`
- [ ] Paste in Supabase SQL Editor
- [ ] Execute script (may take 3-5 minutes)
- [ ] Check for errors
- [ ] Verify success message

### Verify Results
- [ ] Run index count query:
```sql
SELECT COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public';
```
- [ ] Count should be significantly higher

- [ ] Check missing FK indexes:
```sql
SELECT * FROM public.missing_fk_indexes;
```
- [ ] Should return 0 rows (no missing indexes)

- [ ] Review index usage:
```sql
SELECT * FROM public.index_usage_stats
ORDER BY idx_scan ASC
LIMIT 20;
```
- [ ] New indexes should appear

### Test Performance
- [ ] **Tenant Dashboard**
  - [ ] Load dashboard
  - [ ] Note load time (should be faster)
  - [ ] Check payment history
  - [ ] Check applications list

- [ ] **Landlord Dashboard**
  - [ ] Load dashboard
  - [ ] Note load time (should be faster)
  - [ ] Check properties list
  - [ ] Check maintenance requests
  - [ ] Check payment tracking

- [ ] **Admin Dashboard**
  - [ ] Load dashboard
  - [ ] Check user list
  - [ ] Check support tickets
  - [ ] Check platform stats

- [ ] **Property Listings**
  - [ ] Search properties
  - [ ] Filter by location
  - [ ] Sort by price
  - [ ] Note search speed

- [ ] **Notifications**
  - [ ] Load notifications
  - [ ] Check unread count
  - [ ] Mark as read
  - [ ] Verify updates

## Phase 3: Schema Cleanup Analysis 🧹

### Run Script
- [ ] Copy `database/schema-cleanup-analysis.sql`
- [ ] Paste in Supabase SQL Editor
- [ ] Execute script (READ-ONLY, safe to run)
- [ ] Review all output

### Review Results
- [ ] **Check unused tables**
  - [ ] Review profiles table status
  - [ ] Review invite_codes table status
  - [ ] Review admin_audit_logs table status
  - [ ] Note which have data
  - [ ] Note which are empty

- [ ] **Check function analysis**
```sql
SELECT * FROM public.function_analysis
WHERE schema_name = 'public'
ORDER BY function_name;
```
- [ ] Review all functions
- [ ] Note any duplicates

- [ ] **Check unused indexes**
```sql
SELECT * FROM public.unused_indexes
ORDER BY pg_size_pretty DESC;
```
- [ ] Review unused indexes (if any)
- [ ] Decide which to keep/drop

- [ ] **Check RLS policies**
```sql
SELECT * FROM public.rls_policy_analysis
WHERE policy_type LIKE '%Permissive%';
```
- [ ] Review permissive policies
- [ ] Verify they're intentional

### Plan Cleanup Actions
- [ ] List tables to drop (if any)
- [ ] List functions to consolidate (if any)
- [ ] List indexes to remove (if any)
- [ ] Schedule cleanup for later

## Comprehensive Application Testing 🧪

### User Management
- [ ] Create new tenant account
- [ ] Create new landlord account
- [ ] Admin approve new accounts
- [ ] User login/logout
- [ ] Password reset
- [ ] Profile updates

### Property Management
- [ ] Landlord create property
- [ ] Landlord add units
- [ ] Landlord upload photos
- [ ] Landlord set amenities
- [ ] Landlord publish property
- [ ] Public view property listing

### Application Workflow
- [ ] Tenant browse properties
- [ ] Tenant submit application
- [ ] Landlord review application
- [ ] Landlord approve application
- [ ] Unit status updates correctly

### Payment Processing
- [ ] Tenant make payment
- [ ] Payment status updates
- [ ] Receipt generated
- [ ] Landlord sees payment
- [ ] Payment history displays

### Agreement System
- [ ] Agreement generated after payment
- [ ] Tenant signs agreement
- [ ] Landlord signs agreement
- [ ] Agreement becomes active
- [ ] Tenancy created automatically

### Maintenance System
- [ ] Tenant submit maintenance request
- [ ] Landlord receives notification
- [ ] Landlord updates status
- [ ] Tenant receives updates
- [ ] Request completion workflow

### Notification System
- [ ] Real-time notifications work
- [ ] Email notifications sent
- [ ] Push notifications work
- [ ] Notification preferences respected

### Support System
- [ ] User creates support ticket
- [ ] Admin assigns ticket
- [ ] Messages exchanged
- [ ] Ticket resolution
- [ ] Ticket closing

### Admin Features
- [ ] Generate admin codes
- [ ] Approve user accounts
- [ ] Suspend accounts
- [ ] View audit logs
- [ ] Platform announcements
- [ ] System configuration

## Performance Verification 📊

### Query Performance
- [ ] Run slow query log analysis
- [ ] Compare before/after metrics
- [ ] Verify 50%+ improvement
- [ ] Document results

### Database Metrics
- [ ] Check CPU usage (should be lower)
- [ ] Check query latency (should be lower)
- [ ] Check connection count
- [ ] Check cache hit ratio

### Application Metrics
- [ ] Dashboard load times
- [ ] API response times
- [ ] User experience feedback
- [ ] Error rates

## Post-Implementation ✅

### Documentation
- [ ] Update team wiki
- [ ] Document any issues found
- [ ] Note performance improvements
- [ ] Update runbooks

### Monitoring
- [ ] Set up alerts for slow queries
- [ ] Monitor error logs
- [ ] Track performance metrics
- [ ] Schedule weekly review

### Cleanup Tasks
- [ ] Remove unused tables (if decided)
- [ ] Consolidate duplicate functions
- [ ] Drop unused indexes
- [ ] Update documentation

### Final Verification
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Performance improved
- [ ] Team informed
- [ ] Backup verified

## Rollback Procedure (If Needed) 🔄

If any critical issues occur:

1. **Stop immediately**
2. **Document the issue**
3. **Restore from backup**
   ```bash
   # Follow Supabase backup restore procedure
   ```
4. **Review what went wrong**
5. **Fix the issue**
6. **Try again on test database**

## Success Criteria ✨

- [ ] **Security:** 0 vulnerable functions
- [ ] **Performance:** 50%+ faster queries
- [ ] **Stability:** All tests passing
- [ ] **Quality:** 360+ issues resolved
- [ ] **Documentation:** All updated
- [ ] **Team:** Everyone informed

## Sign-Off

**Tested By:** _________________________

**Date:** _________________________

**Time:** _________________________

**Result:** ✅ PASS / ❌ FAIL

**Notes:**
```
[Add any observations, issues, or recommendations here]
```

---

**Version:** 1.0
**Last Updated:** January 6, 2026
