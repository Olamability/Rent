# Visual Guide to Schema Fixes

## Problem 1: Missing Foreign Key Relationship

### BEFORE (Broken) ❌
```
property_applications          tenancy_agreements
┌─────────────────┐           ┌──────────────────┐
│ id              │           │ id               │
│ tenant_id       │           │ tenant_id        │
│ unit_id         │           │ unit_id          │
│ landlord_id     │           │ landlord_id      │
│ status          │           │ start_date       │
└─────────────────┘           │ end_date         │
                               │ status           │
                               └──────────────────┘
                               
        ❌ No relationship!
        Code tried to join using non-existent FK
```

### AFTER (Fixed) ✅
```
property_applications          tenancy_agreements
┌─────────────────┐           ┌──────────────────┐
│ id              │◄──────────│ application_id   │ ✅ NEW!
│ tenant_id       │           │ id               │
│ unit_id         │           │ tenant_id        │
│ landlord_id     │           │ unit_id          │
│ status          │           │ landlord_id      │
└─────────────────┘           │ start_date       │
                               │ end_date         │
                               │ status           │
                               └──────────────────┘
                               
        ✅ Proper FK relationship established!
        Index added for performance
```

## Problem 2: Wrong Column Names

### BEFORE (Broken) ❌
```sql
-- Code tried to query:
SELECT name, doc_url, owner_id FROM documents;
       ❌     ❌       ❌
       
-- But schema has:
CREATE TABLE documents (
    file_name TEXT,    -- not "name"
    file_url TEXT,     -- not "doc_url"
    uploaded_by UUID   -- not "owner_id"
);
```

### AFTER (Fixed) ✅
```sql
-- Code now queries correctly:
SELECT file_name, file_url, uploaded_by FROM documents;
       ✅         ✅        ✅
       
-- Matches schema:
CREATE TABLE documents (
    file_name TEXT,    ✅
    file_url TEXT,     ✅
    uploaded_by UUID   ✅
);
```

## Query Flow Example

### Application Fetch with Agreement (Now Works!)

```
1. Tenant Dashboard loads
   ↓
2. fetchApplicationsByTenant() called
   ↓
3. Query runs:
   SELECT *
   FROM property_applications
   JOIN tenancy_agreements 
   ON tenancy_agreements.application_id = property_applications.id
   WHERE tenant_id = 'xxx'
   ↓
4. ✅ Returns applications with linked agreements
   ↓
5. Display in UI with agreement status
```

### Document Fetch (Now Works!)

```
1. Tenant Dashboard loads
   ↓
2. fetchDocuments() called
   ↓
3. Query runs:
   SELECT file_name, file_url, uploaded_by
   FROM documents
   WHERE uploaded_by = 'tenant-id'
   ↓
4. ✅ Returns documents list
   ↓
5. Display in UI with file names and URLs
```

## Data Flow Diagram

```
┌─────────────┐
│   Tenant    │
│  Dashboard  │
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│ Applications │   │  Documents   │
│   Service    │   │   Service    │
└──────┬───────┘   └──────┬───────┘
       │                  │
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────┐
│  Supabase    │   │  Supabase    │
│   Query      │   │   Query      │
│              │   │              │
│ .from(...)   │   │ .from(...)   │
│ .select(...) │   │ .select(...) │
└──────┬───────┘   └──────┬───────┘
       │                  │
       │ ✅ Correct FK   │ ✅ Correct
       │    hint         │    columns
       │                  │
       ▼                  ▼
┌───────────────────────────────┐
│         Database              │
│                               │
│  property_applications ──►    │
│  tenancy_agreements           │
│  (with application_id FK)     │
│                               │
│  documents                    │
│  (file_name, file_url, etc)   │
└───────────────────────────────┘
```

## Migration Steps

```
Step 1: Run Migration
┌─────────────────────────────────┐
│ ALTER TABLE tenancy_agreements  │
│ ADD COLUMN application_id UUID  │
│ REFERENCES property_applications│
└─────────────────────────────────┘
                ↓
Step 2: Deploy Code
┌─────────────────────────────────┐
│ • Updated service queries       │
│ • Fixed column names            │
│ • Updated TypeScript types      │
└─────────────────────────────────┘
                ↓
Step 3: Test
┌─────────────────────────────────┐
│ ✅ Applications load without    │
│    errors                       │
│ ✅ Documents display correctly  │
│ ✅ No console errors            │
└─────────────────────────────────┘
```

## Impact Analysis

### Before Fix
```
Applications Page:   ❌ Error: Could not find relationship
Documents Section:   ❌ Error: column does not exist
User Experience:     ❌ Broken functionality
Console:            ❌ Multiple errors
```

### After Fix
```
Applications Page:   ✅ Loads with agreement status
Documents Section:   ✅ Shows all documents
User Experience:     ✅ Smooth, no errors
Console:            ✅ Clean, no errors
```

## Backward Compatibility

✅ **Safe to deploy** - Migration is idempotent:
- If column already exists → No changes made
- If column doesn't exist → Column added
- No data loss or breaking changes
- Existing queries continue to work

## Performance Improvement

**Added Index:**
```sql
CREATE INDEX idx_tenancy_agreements_application_id 
ON tenancy_agreements(application_id);
```

**Before:** Full table scan when joining
**After:** Index lookup (much faster!)

**Query Time:**
- Small dataset: Negligible difference
- Large dataset: ~10-100x faster joins
