# OpsFlow Architecture

## Layering

The project uses a compact layered architecture suitable for a 48-hour case study:

```text
Presentation
  React + Vite + Framer Motion + Recharts
        |
        | HTTP / JSON / JWT
        v
Application API
  Express routers
  Zod validation
  Authentication + role guards
  Transaction boundary
        |
        v
Persistence
  PostgreSQL
  Foreign keys / checks / indexes
  Transactional stock update
```

## Key transaction: confirm challan

The confirmation endpoint is the most important business workflow.

```text
BEGIN
  |
  +-- lock challan row
  +-- load challan items
  +-- lock product rows
  +-- verify every requested quantity <= current stock
  |       |
  |       +-- failure -> ROLLBACK -> 409 response
  |
  +-- decrement products
  +-- insert OUT movement rows
  +-- set challan = CONFIRMED
  +-- create invoice record
  +-- write audit rows
  |
COMMIT
```

That design avoids the classic race where two users see the same stock amount in the browser and both succeed.

## Data model

```text
users
  ├── customers
  ├── stock_movements
  ├── challans
  ├── invoices
  └── audit_logs

customers
  ├── customer_followups
  ├── challans
  └── invoices

products
  ├── stock_movements
  └── challan_items

challans
  ├── challan_items
  └── invoices
```

## Why snapshot values live on `challan_items`

The product catalog is mutable. A historical document should not change because a product manager edits the current price or name. Snapshot columns decouple the historical document from the live catalog while retaining `product_id` for traceability.

## API security model

Every protected request receives:

```text
Authorization: Bearer <JWT>
```

The request first passes authentication, then sensitive routes pass `requireRoles(...)`.

Examples:

```text
Admin + Sales       -> customer writes
Admin + Warehouse   -> product / stock writes
Admin + Sales       -> challan writes
Admin + Accounts    -> invoice center
Admin               -> user list + audit trail
```

## Observability / governance

Important write events are recorded in `audit_logs`. The UI exposes that data through the Admin Audit Trail so the feature is demonstrable rather than backend-only.
