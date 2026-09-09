# OpsFlow Submission Checklist

## Required

- [ ] GitHub repository is public/private as requested by the recruiter.
- [ ] `.env` is not committed.
- [ ] `.env.example` contains placeholders only.
- [ ] Neon PostgreSQL production database is initialized and seeded.
- [ ] Render API is live and `/health` returns 200.
- [ ] Vercel frontend is live.
- [ ] Vercel `VITE_API_URL` points to the Render API.
- [ ] Render `CORS_ORIGIN` points to the Vercel domain.
- [ ] All four role credentials are tested.
- [ ] Customer CRUD/search/detail/follow-up works.
- [ ] Product CRUD and inventory movement works.
- [ ] Challan draft/confirm/cancel works.
- [ ] Insufficient-stock confirmation is rejected.
- [ ] Confirmed challan reduces stock and creates an OUT movement.
- [ ] Historical challan line values remain snapshots.
- [ ] Challan PDF works.
- [ ] Invoice Center and invoice PDF work.
- [ ] Admin Audit Trail works.
- [ ] Postman collection is included and smoke-tested.
- [ ] README and architecture docs are complete.
- [ ] Screen recording demonstrates the complete flow.

## Bonus

- [ ] Docker files are present.
- [ ] GitHub Actions CI is green.
- [ ] Docker Compose works on a machine with virtualization enabled.

## Current Docker note

Docker is included as a bonus implementation, but the current Windows machine reports that Docker Desktop cannot start because virtualization support is not detected. **Do not claim the Docker path was run locally.** The required local and deployment path is Node.js + Neon + Render/Vercel.
