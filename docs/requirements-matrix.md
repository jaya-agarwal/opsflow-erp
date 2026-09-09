# Case Study Requirements Matrix

| Case study item | Where to verify |
|---|---|
| Admin / Sales / Warehouse / Accounts | `apps/api/src/middleware/auth.ts`, `apps/web/src/components/AppShell.tsx` |
| JWT login | `apps/api/src/routes/auth.ts`, Login page |
| Customer fields | `database/schema.sql`, Customers page |
| Add / Edit / Search / Detail | Customers page + `/api/customers` |
| Follow-up notes | Customer detail + `/api/customers/:id/followups` |
| Product fields | `database/schema.sql`, Products page |
| Stock movement log | Inventory page + `/api/inventory/movements` |
| Challan draft / confirmed / cancelled | Challans page + `/api/challans/:id/status` |
| Auto challan number | `nextChallanNumber()` |
| Stock reduction on confirm | `apps/api/src/routes/challans.ts` |
| No negative stock | Product locks + validation + DB CHECK |
| Product snapshot | `challan_items` columns |
| Input validation | Zod schemas |
| HTTP errors | `middleware/error.ts` + `HttpError` |
| Pagination | `/api/customers` |
| Search / filter | Customers, Products, Inventory, Challans, Invoices |
| Responsive UI | `apps/web/src/styles.css` |
| PDF | Challan and invoice routes |
| Postman | `postman/mini-erp.postman_collection.json` |
| Deployment documentation | README + `render.yaml` + Vercel config |
| Docker bonus | `docker/` + `docker-compose.yml` + production compose |
| Bonus invoice PDF | `/api/invoices/:id/pdf` |
