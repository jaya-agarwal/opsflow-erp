# Docker + Deployment Notes

## Assignment position

Docker is **not required** by the case study. It is listed under Bonus Points. AWS is also optional; the case study accepts free hosting alternatives for frontend, backend and database.

## Current machine note

The developer machine used for the submission currently has Docker Desktop installed but the Docker Engine is not running because Windows reported that virtualization support was not detected. Therefore **Docker is included in the repository but is intentionally not part of the current local run instructions**.

This is not a blocker for the required submission flow. Run the app with Node.js + Neon instead.

## Docker files

- `docker/api.Dockerfile`: multi-stage Node 22 production image.
- `docker/web.Dockerfile`: multi-stage Vite build served by Nginx.
- `docker/nginx.conf`: SPA fallback plus static asset caching.
- `docker-compose.yml`: Postgres + API + web + optional seed profile.

## When Docker becomes available

```powershell
docker compose up --build
```

Then, for demo data:

```powershell
docker compose --profile tools run --rm seed
```

## Recommended production deployment

```text
GitHub
 ├── Vercel → apps/web
 └── Render → apps/api
                     ↓
                  Neon Postgres
```

The Docker images can be used later for a container-based backend deployment without changing application code.
