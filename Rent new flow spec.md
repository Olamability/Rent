This is the current flow of this app 1. Tenant submits application → Unit stays: available ✅ 2. Landlord approves application → Unit stays: available ✅ 3. Invoice is auto-generated → Unit stays: available ✅ 4. Tenant completes payment → Unit changes to: rented ✅ 5. Property becomes occupied → No more applications allowed ✅
I want you to go through the current app and understand what is current done and what we want to achieve:
mostly correct, but it’s missing one very important legal + product step: the lease (tenancy) agreement. In standard real-estate / prop-tech practice, payment should never come before agreement acceptance.
Below is the industry-standard flow, followed by why it works and how it maps cleanly to the current system and implement every missing peice to details and ensure it is 100% production ready
Standard Practice Flow (Recommended)
1. Tenant submits application

Unit status: Available

Multiple tenants can apply.

Tenant sees: Application submitted / Under review

✅ Correct in your current flow

2. Landlord reviews & approves a tenant

Unit status: Available

Approval only means “You are selected”, not occupied.

Other applications may be auto-rejected or kept pending.

✅ Correct in your current flow

3. Lease / Tenancy Agreement is generated & sent

👉 THIS IS THE MISSING STEP

A digital tenancy agreement is generated (PDF or in-app document).

Agreement includes:

Rent amount

Lease duration

Start & end date

Payment deadline

Terms & conditions

Tenant must review and accept/sign the agreement.

Unit status: still Available

Application status: Approved – Awaiting Agreement

⚠️ No payment should happen before this step.

4. Tenant accepts/signs the agreement

Tenant digitally accepts/signs the lease.

This confirms legal intent.

Unit status: still Available

Application status: Agreement Accepted – Awaiting Payment

This step protects:

The landlord legally

The tenant from unclear terms

Your platform from disputes

5. Invoice is generated (or unlocked)

Invoice is now official because agreement is accepted.

Invoice may include:

Rent

Caution deposit

Agency fee

Service charge

Unit status: still Available

🧠 Invoice should be conditional on agreement acceptance.

6. Tenant completes payment

Payment is confirmed (not just initiated).

Unit status changes to: Rented

Application status: Completed

✅ This is the ONLY point where occupancy becomes valid.

7. Property becomes occupied

Property is now:

Locked from new applications

Marked as Occupied everywhere

Lease countdown begins.

✅ Correct final step in your flow

Why This Flow Is Standard
1. Legal protection

Agreement before payment avoids:

Refund disputes

Chargebacks

“I didn’t agree to these terms” claims

2. Marketplace flexibility

Units stay visible and open until money is confirmed

Landlords can approve backups if first tenant fails to pay

3. Clear system truth

Approval = Intent
Agreement = Legal consent
Payment = Occupancy

Clean Status Model (Very Important)
Property (Unit)

available

rented

occupied (optional alias of rented)

Application

submitted

approved

agreement_sent

agreement_accepted

payment_pending

paid

rejected

expired

Invoice

draft

issued

paid

failed

