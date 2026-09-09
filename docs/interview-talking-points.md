# Interview Talking Points

## 1. "What makes your project different?"

> I intentionally treated the ERP as an operations-control problem rather than a set of CRUD screens. The Command Center turns raw records into a readiness score and an exception queue, while the core transactional workflows remain deterministic and auditable.

## 2. "How do you prevent overselling?"

> The frontend warns the user, but the backend is authoritative. Confirmation runs in a PostgreSQL transaction, locks the affected product rows, re-checks stock, then decrements stock and writes OUT movements. A failure rolls back everything.

## 3. "Why store product snapshots?"

> A product's current catalog values can change. A historical challan must remain legally/business-consistent, so I store name, SKU, price and quantity as snapshot values while keeping the product ID for traceability.

## 4. "Why create the invoice in the same transaction?"

> A confirmed challan should not look successful to Sales while Accounts has no document. Linking invoice creation to the same transaction keeps the workflow source-controlled.

## 5. "Why use PostgreSQL?"

> The domain is relational: customers, products, movements, challans, line items and invoices have strong relationships and integrity requirements. PostgreSQL constraints plus transactions fit this workflow naturally.

## 6. "Why is the readiness score not AI?"

> It is deliberately transparent. The score is a simple rule-based operational signal using observable exception counts. That makes it explainable and safe for a case-study system.

## 7. "What would you add in production?"

- refresh tokens / session management
- rate limiting and login lockout
- structured logging + monitoring
- background jobs for reminders
- richer invoice/tax engine
- permission matrix instead of role-only rules
- stronger automated tests and migrations
