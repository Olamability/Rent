📘 PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Name: RentEase – Digital Landlord–Tenant Manager
Version: 1.0 (MVP)
Prepared For: Full development & implementation
Date: 2025
1.0 PRODUCT OVERVIEW

RentEase is a mobile & web application that enables landlords and tenants to digitally manage rent, tenancy agreements, and maintenance. The goal is to replace the manual, stressful process of property management with a modern, automated platform.

2.0 OBJECTIVES & SUCCESS METRICS
2.1 Objectives

Enable digital rent collection with receipts.

Make landlord–tenant communication seamless.

Provide real-time rent status dashboard.

Automate documentation & tenancy workflows.

Enable online maintenance submission & tracking.

2.2 Success Metrics

70% rent payments processed digitally within 6 months.

40% reduction in overdue rent.

50,000 monthly active users in year 1.

30% of landlords subscribing to premium plan.

3.0 USER PERSONAS
Landlord – Individual

Owns 1–10 rental units; wants easier rent collection.

Property Manager – Professional

Manages 20–200+ tenants; needs dashboard + reporting.

Tenant

Needs simple rent payment, reminders, and maintenance tool.

4.0 FEATURES (MVP)
4.1 Landlord Features
Feature	Description
Property Management	Add/edit/delete properties; set rent price; upload images/documents
Unit & Tenant Management	Assign tenants to units; approve applications
Rent Collection	Receive rent digitally via Paystack/Flutterwave
Rent Status Dashboard	Shows paid, pending, overdue
Automated Reminders	SMS/Email/Push
Receipts Generation	Auto-generated for each payment
Tenancy Agreement	Auto-generated template + digital signature
Maintenance Requests	Receive, assign, update status
4.2 Tenant Features
Feature	Description
Property Search & Apply	View listings, submit application
Rent Payment	Pay via card, transfer, or USSD
Notifications	Rent due, overdue, renewal reminders
Receipts	Automatic digital receipts
Tenancy Agreement	View & download
Maintenance	Submit request with photos/videos
4.3 Admin Panel

Manage platform users

Approve verified landlords

Flag fraudulent activity

Revenue dashboard

Support tickets

5.0 USER FLOW DIAGRAMS (TEXT FORMAT)
Tenant Rent Payment Flow

Tenant logs in

Opens “Rent payment”

Sees amount + due date

Clicks Pay → Payment gateway

Payment success → Receipt auto generated

Landlord dashboard updates to “Paid”

Maintenance Request Flow

Tenant submits issue (text + photos)

Landlord receives alert

Landlord assigns repair worker

Worker updates status (En Route → Completed)

Tenant confirms completion

System closes request

Landlord Onboarding Flow

Verify identity & property ownership

Add property

Add unit details

Invite tenant or wait for application

Start collecting rent online

6.0 TECH REQUIREMENTS
6.1 Frontend

Cross-platform mobile app (React Native)

Web dashboard (React/Next.js)

Push notifications

Offline mode for viewing documents

6.2 Backend

Authentication (Supabase/Auth0/Firebase)

Role-based access: tenant, landlord, admin

API endpoints for payments, properties, tenants

Cron jobs for reminders

Storage for documents (AWS S3, Supabase storage)

6.3 Integrations

Paystack OR Flutterwave

SMS gateway (Termii)

Email provider (SendGrid)

6.4 Database Design (Simplified)
Tables

Users

Landlords

Tenants

Properties

Units

Payments

Maintenance Requests

Documents

Subscriptions

7.0 NON-FUNCTIONAL REQUIREMENTS

Security:

PCI-compliant payments

Encryption at rest and in transit

Performance:

Rent dashboard loads ≤ 2 seconds

Reminders triggered via scheduled jobs

Scalability:

Architecture supports 1M tenants

Reliability:

99.5% uptime

Automatic retries for failed reminders

8.0 MONETIZATION
Free Tier

Basic rent collection

1 property

Pro (₦3,000/mo or ₦20,000/yr)

Unlimited properties

Auto tenancy agreements

Analytics & reports

Priority support

Maintenance workflow automation

Transaction Fees

1.5% per rent payment

Shared with payment provider (Paystack)

9.0 LAUNCH PLAN (MVP)
Phase 1 — Build

Mobile app (tenant + landlord)

Web admin dashboard

Paystack integration

Core rent management features

Maintenance system

Document generation

Phase 2 — Pilot

Test with 20 landlords

Collect feedback

Improve dashboard & workflows

Phase 3 — Public Launch

Marketing to:

Realtors

Estate developers

Twitter/Instagram ads

Sign partnership with Paystack & property agents

10.0 RISKS & MITIGATIONS
Risk	Mitigation
Fraudulent landlords listing fake properties	KYC verification + property ownership check
Payment disputes	Escrow option in future
Slow adoption from offline landlords	On-ground onboarding agents
Tenant complaints about fees	Keep payment fee low & transparent
11.0 FUTURE EXPANSIONS

Rent Loans (Buy-Now-Pay-Later for rent).

AI tenant background screening.

Smart utility billing (water, light).

Marketplace for verified repair workers.

Automated rent increase notices.