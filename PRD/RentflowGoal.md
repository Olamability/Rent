Project Goal

RentFlow is a fully online rental platform where all rental processes — from application to payment to agreement execution — are handled digitally in a secure, legally defensible, and tamper-proof way.

The system must be built to production standards, suitable for real-world financial and legal use.

Key Risks Introduced by Full Online Renting
🔐 Financial Risk

The system will handle:

Rent payments

Security deposits

Refunds

Late fees

Dispute-related transactions

Implication:
Any client-side (frontend) control of financial logic is unacceptable.

📜 Legal Risk

The system will manage:

Tenancy agreements

Digital acceptance/signatures

Time-stamped confirmations

Agreement versioning

Records usable in disputes or legal proceedings

Implication:
All agreement-related actions must be provable, time-stamped, and immutable.

🧑‍⚖️ Trust & Compliance Risk

The platform must ensure:

No party (tenant, landlord, admin) can manipulate records

All sensitive actions are logged

System decisions can be audited and verified

Implication:
Frontend code must never be trusted for critical operations.

Security Principles (Non-Negotiable)

Frontend is untrusted

All critical operations must be validated server-side.

Frontend is for UI/UX only.

Server-side is the source of truth

Financial calculations

Status changes

Agreement acceptance

Payment verification

Database integrity is enforced

Strict Row Level Security (RLS)

Write access restricted to server logic where required

Append-only logs for sensitive actions

Required Architecture
Recommended Stack

Supabase Auth (authentication)

Supabase Postgres (data store)

Supabase Edge Functions (server-side logic)

Frontend (React) for UI only

Frontend (UI only)
   ↓
Edge Functions (trusted logic)
   ↓
Database (RLS enforced)


No frontend-to-database writes for sensitive tables.

Operations That MUST Be Server-Side
❌ Never on Frontend

Payment confirmation

Deposit handling

Refund processing

Agreement status changes

Admin approvals

Role assignment

Rent status updates

✅ Must Be Server-Controlled

Payment verification (via gateway webhooks)

Agreement generation & acceptance

Application approval/rejection

Financial calculations

Audit logging

Dispute records

Payment Handling (Mandatory Flow)

Frontend initiates payment

Payment provider (e.g., Paystack) sends webhook

Server verifies payment authenticity

Server updates payment & transaction records

Frontend only displays results

Frontend must never mark payments as successful.

Agreements & Digital Signatures

Agreements generated server-side

Agreement hash stored for integrity

Acceptance recorded with:

User ID

Timestamp

Agreement version

IP/device metadata

Records must be immutable and auditable

Audit & Compliance Requirements

Every critical action logged:

Who performed it

When it happened

What changed

Logs must be append-only

No silent updates or deletions

Logs usable as legal evidence

Quality & Production Expectations

Role-based access enforced at database level

Server-side validation for all sensitive actions

Clear separation between UI and business logic

Secure handling of secrets (no service keys on frontend)

System designed to scale and withstand misuse

Final Statement

RentFlow is not a simple CRUD app.
It is a financially and legally sensitive platform.

The architecture must prioritize:

Security

Integrity

Auditability

Trust

Anything less puts the platform and its users at risk.