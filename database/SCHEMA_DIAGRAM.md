# RentFlow Database Schema - Visual Guide

## 🗺️ Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION LAYER                         │
│                         (Supabase Auth)                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │      USERS       │◄─────────────┐
                    │  (Main Table)    │              │
                    └──────┬───────────┘              │
                           │                          │
        ┌──────────────────┼────────────────┐         │
        │                  │                │         │
        ▼                  ▼                ▼         │
┌───────────────┐  ┌──────────────┐  ┌────────────┐  │
│    TENANT     │  │   LANDLORD   │  │   ADMIN    │  │
│   PROFILES    │  │   PROFILES   │  │  PROFILES  │  │
│ (Extended)    │  │ (Extended)   │  │ (Extended) │  │
└───────────────┘  └───────┬──────┘  └────────────┘  │
                           │                          │
                           │                          │
                           ▼                          │
                   ┌──────────────┐                   │
                   │ PROPERTIES   │◄──────────────────┘
                   │ (Listings)   │   landlord_id
                   └───────┬──────┘
                           │
                           │ 1:many
                           ▼
                   ┌──────────────┐
                   │    UNITS     │◄──────────────────┐
                   │ (Rental)     │                   │
                   └───────┬──────┘                   │
                           │                          │
      ┌────────────────────┼────────────────┐         │
      │                    │                │         │
      ▼                    ▼                ▼         │
┌─────────────┐    ┌──────────────┐  ┌─────────────┐ │
│  PROPERTY   │    │   TENANCY    │  │  PAYMENTS   │ │
│ APPLICATIONS│    │  AGREEMENTS  │  │  (Rent $)   │ │
└─────────────┘    └──────────────┘  └─────────────┘ │
                                                      │
                                                      │
                   ┌──────────────┐                   │
                   │ MAINTENANCE  │                   │
                   │  REQUESTS    │◄──────────────────┘
                   └───────┬──────┘        unit_id
                           │
                           │ 1:many
                           ▼
                   ┌──────────────┐
                   │ MAINTENANCE  │
                   │   UPDATES    │
                   │ (Comments)   │
                   └──────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                     SUPPORTING TABLES                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ NOTIFICATIONS  │  │   REMINDERS    │  │   DOCUMENTS    │        │
│  │  (In-app)      │  │  (Scheduled)   │  │   (Files)      │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │    SUPPORT     │  │     AUDIT      │  │   PLATFORM     │        │
│  │    TICKETS     │  │     LOGS       │  │ ANNOUNCEMENTS  │        │
│  └────────┬───────┘  │  (Tracking)    │  │  (Admin msg)   │        │
│           │          └────────────────┘  └────────────────┘        │
│           │                                                         │
│           ▼                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │    TICKET      │  │ SUBSCRIPTIONS  │  │ SYSTEM_CONFIG  │        │
│  │   MESSAGES     │  │ (Landlord $)   │  │   (Settings)   │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│                      ┌────────────────┐                              │
│                      │  ADMIN_CODES   │                              │
│                      │ (Registration) │                              │
│                      └────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                            VIEWS                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│              ┌────────────────────────────────┐                      │
│              │  PUBLIC_PROPERTY_LISTINGS      │                      │
│              │  (Marketplace - Public Access) │                      │
│              │  = Units + Properties (JOIN)   │                      │
│              └────────────────────────────────┘                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Relationships

### User Hierarchy
```
1 User → 1 Profile (tenant OR landlord OR admin)
1 Landlord → Many Properties
1 Property → Many Units
1 Unit → Many Applications (from tenants)
1 Unit → Many Agreements (current & historic)
1 Agreement → Many Payments
1 Unit → Many Maintenance Requests
1 Maintenance Request → Many Updates
```

### Cross-Entity Relationships
```
Tenants ←→ Units: Through applications and agreements
Tenants → Payments: Rent payments to landlords
Tenants → Maintenance: Report issues for their units
Landlords ←→ Tenants: Through agreements
Admins → Users: Manage all user accounts
Super Admins → Admins: Manage admin accounts
```

## 📋 Table Purposes

### Core Tables
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **users** | Main user accounts | role, account_status, email |
| **tenant_profiles** | Extended tenant info | employment, emergency_contact, refs |
| **landlord_profiles** | Extended landlord info | business_info, bank_details |
| **admin_profiles** | Extended admin info | department, is_super_admin |

### Property Management
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **properties** | Property listings | address, property_type, is_published |
| **units** | Rental units | rent_amount, bedrooms, listing_status |
| **property_applications** | Tenant applications | application_status, move_in_date |
| **tenancy_agreements** | Lease contracts | start_date, end_date, rent_amount |

### Financial
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **payments** | All payments | amount, payment_type, payment_status |
| **subscriptions** | Landlord plans | subscription_plan, billing_cycle |

### Operations
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **maintenance_requests** | Issue tracking | priority, request_status, category |
| **maintenance_updates** | Request comments | message, images |
| **notifications** | In-app alerts | notification_type, is_read |
| **reminders** | Scheduled alerts | reminder_type, scheduled_for |

### Support & Admin
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **support_tickets** | User support | status, priority, assigned_to |
| **ticket_messages** | Support chat | message, attachments |
| **audit_logs** | Activity tracking | action, entity_type, changes |
| **platform_announcements** | Admin broadcasts | target_audience, announcement_type |

### Configuration
| Table | Purpose | Key Fields |
|-------|---------|------------|
| **system_config** | App settings | config_key, config_value |
| **admin_codes** | Admin registration | code, role, is_used |
| **documents** | File uploads | document_type, file_url |

## 🔐 Security Model

### RLS Policy Structure

```
┌─────────────────────────────────────────┐
│         ROW LEVEL SECURITY              │
├─────────────────────────────────────────┤
│                                         │
│  Anonymous (Public):                    │
│  ├─ View public_property_listings       │
│  └─ No other access                     │
│                                         │
│  Tenant:                                │
│  ├─ View/Edit own profile               │
│  ├─ View public listings                │
│  ├─ Create applications                 │
│  ├─ View own agreements                 │
│  ├─ Create/View own payments            │
│  ├─ Create/View own maintenance         │
│  ├─ View own notifications              │
│  └─ Create/View own support tickets     │
│                                         │
│  Landlord:                              │
│  ├─ All tenant permissions +            │
│  ├─ Create/View/Edit own properties     │
│  ├─ Create/View/Edit units              │
│  ├─ View/Manage applications            │
│  ├─ Create/View agreements              │
│  ├─ View payments for properties        │
│  ├─ View/Manage maintenance             │
│  └─ View subscriptions                  │
│                                         │
│  Admin:                                 │
│  ├─ View all users                      │
│  ├─ Update user account_status          │
│  ├─ View all properties/units           │
│  ├─ View all applications/agreements    │
│  ├─ View all payments                   │
│  ├─ Manage maintenance requests         │
│  ├─ View/Manage all support tickets     │
│  ├─ Create/Manage announcements         │
│  ├─ View audit logs                     │
│  └─ View non-sensitive config           │
│                                         │
│  Super Admin:                           │
│  ├─ All admin permissions +             │
│  ├─ Manage admin accounts               │
│  ├─ View/Update all config              │
│  ├─ Generate admin codes                │
│  └─ Full system access                  │
│                                         │
└─────────────────────────────────────────┘
```

## 🔄 Data Flow Examples

### New Tenant Registration Flow
```
1. User signs up → auth.users
2. Trigger: handle_new_user()
3. Create record in users table
4. Create record in tenant_profiles
5. Set account_status = 'pending'
6. Admin approves → account_status = 'approved'
7. User can now log in
```

### Property Listing Flow
```
1. Landlord creates property
2. Property saved with is_published = false
3. Landlord adds units
4. Unit saved with listing_status = 'draft'
5. Landlord publishes property → is_published = true
6. Unit set to available → listing_status = 'available'
7. Unit set to public → is_public_listing = true
8. Unit appears in public_property_listings view
9. Tenants can search and apply
```

### Rent Payment Flow
```
1. Tenant initiates payment
2. Payment record created with status = 'pending'
3. Paystack processes payment
4. Webhook updates payment status = 'completed'
5. Receipt generated and stored
6. Notification sent to tenant and landlord
7. Payment appears in both dashboards
```

### Maintenance Request Flow
```
1. Tenant creates maintenance request
2. Request saved with status = 'pending'
3. Notification sent to landlord
4. Landlord views and assigns → status = 'assigned'
5. Worker updates progress → Creates maintenance_update
6. Work completed → status = 'completed'
7. Notification sent to tenant
```

## 📊 Performance Considerations

### Indexed Fields
- All primary keys (UUID)
- All foreign keys
- user_id, tenant_id, landlord_id (every table)
- status fields (account_status, listing_status, etc.)
- date fields (created_at, due_date, scheduled_for, etc.)
- location fields (city, latitude/longitude)

### Query Optimization
- Use public_property_listings view for marketplace (pre-joined)
- Filter by status before joins
- Use pagination for large datasets
- Leverage JSONB indexes for flexible data

## 🎯 Best Practices

1. **Always check account_status** before allowing user actions
2. **Use RLS policies** - don't bypass with service role unless necessary
3. **Validate foreign keys** exist before inserting
4. **Use transactions** for multi-table operations
5. **Log critical actions** to audit_logs
6. **Clean up old data** regularly (notifications, reminders, etc.)
7. **Monitor performance** using pg_stat_statements

---

**For detailed setup instructions, see:** [SCHEMA_SETUP.md](./SCHEMA_SETUP.md)  
**For fix details, see:** [FIX_SUMMARY.md](../FIX_SUMMARY.md)
