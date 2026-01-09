Task to diligently Verify achieve
1.	Tenant – wants to rent an apartment.
2.	Landlord – owns/listed property.
3.	System / Platform – orchestrates notifications, payments, agreements, and locks property.
1️ Browse & Select Property
Tenant actions:
•	Visits property listings.
•	Filters by location, price, type, etc.
•	Clicks on a property to see full details.
System actions:
•	Fetch property details from database.
•	Show availability status (available, pending, rented).
•	Show landlord profile/contact info (optional).
2️ Apply for Property
Tenant actions:
•	Clicks Apply on property.
•	Fills application form:
o	Personal info (auto-filled from profile)
o	Employment details
o	Emergency contact
o	References
o	Lease duration requested
System actions:
•	Creates property application record:
•	Sends notification to landlord:
o	Dashboard alert
o	Email
o	Optional SMS

3️ Landlord Reviews Application
Landlord actions:
•	Views pending applications.
•	Reviews tenant info:
o	Profile
o	Employment
o	References
o	Previous rental history (if available)
•	Approve or Reject.
System actions:
•	Updates property_application
o	approved or rejected
•	Sends notification to tenant:
o	Email
o	SMS
o	Dashboard alert
Business logic:
•	Only 1 tenant can be approved per property at a time.
•	If rejected → tenant can apply to another property.

4️ Invoice Generation & Payment
After landlord approval:
System actions:
•	Generates invoice for tenant:
o	Monthly rent
o	Security deposit
o	Other fees
•	Updates invoices table:
•	Tenant sees invoice in dashboard.
Tenant actions:
•	Pays online (Paystack, Stripe, etc.).
•	Payment status updated in DB.
System actions:
•	Verify payment success.
•	Update invoices status → paid
•	Trigger next step: agreement generation.

5️ Lease Agreement (E-signing)
System actions:
•	Generates digital lease agreement:
o	Auto-filled with tenant info, property info, rent, duration
•	Sends to tenant (and landlord) for e-signature.
Tenant / Landlord actions:
•	Sign the document digitally.
System actions:
•	Store signed agreements securely 

6️ Property Locked / Confirmed
Business logic:
•	Once agreement signed:
o	Property becomes unavailable to others.
o	Dashboard shows property under my rentals for tenant.
o	Landlord dashboard shows tenant under current tenants.
•	Lease duration tracked 
7️ Ongoing Management
Optional features:
•	Automated reminders for:
o	Rent payment
o	Lease expiry
•	Maintenance requests from tenant → landlord approval
•	Renewal notifications before lease end
•	Late payment tracking / penalty

8️ End of Lease
System actions:
•	Notify tenant & landlord of lease end.
•	Property becomes available again.
•	Security deposit refunded (if applicable).
•	Option to renew lease.

