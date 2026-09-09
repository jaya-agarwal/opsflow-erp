# OpsFlow Demo Script — 5 to 7 Minutes

## 00:00 — Intro

> "I built OpsFlow, a Mini ERP + CRM for wholesale operations. The core assignment modules are here, and I added an operations-control layer so the dashboard helps teams decide what needs attention next."

## 00:30 — Admin login

Login:

`admin@opsflow.demo`

`Demo@123`

Point out:
- Command Center
- Readiness Score
- Exception Radar
- role indicator

## 01:15 — CRM

Open Customers.

Show:
- search/filter
- customer record
- customer detail
- follow-up timeline

Say:
> "The timeline makes CRM notes auditable and hand-off friendly."

## 02:00 — Inventory

Open Products.

Show:
- current stock
- minimum threshold
- low stock / out of stock
- stock movement action

## 02:40 — Challan business rule

Open Sales Challans.

Create a new draft.

Choose a customer and multiple products.

Enter a quantity larger than available.

Say:
> "The UI warns immediately, but I do not rely on client validation. The API protects the transaction."

Correct the quantity and save the draft.

## 03:45 — Confirm

Open the draft.

Click Confirm.

Show:
- confirmed status
- stock changed
- OUT movement
- challan number

Say:
> "This confirmation is a database transaction with row locking, so concurrent users cannot silently oversell the same stock."

## 04:45 — PDF

Open Challan PDF.

Point out snapshot product values.

## 05:05 — Accounts

Logout and login as:

`accounts@opsflow.demo`

Open Invoice Center.

Show the invoice created from the confirmed challan.

Open Invoice PDF.

## 05:45 — Audit

Login back as Admin and open Audit Trail.

Show challan confirmation / invoice events.

## Closing

> "The core requirements are implemented end to end, while the differentiating pieces are the transparent readiness score, exception radar, audit trail, transactional stock guard and linked invoice workflow."
