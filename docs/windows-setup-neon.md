# OpsFlow on Windows + Neon (no Docker, no local PostgreSQL)

1. Install Node.js 22+ and verify `node --version` and `npm --version`.
2. Create a Neon PostgreSQL project and copy its connection string.
3. In the repository root, copy `.env.example` to `.env`.
4. Put the Neon connection string into `DATABASE_URL` in `.env`.
5. Run `npm install` if dependencies are not already installed.
6. Run `npm run setup`. This initializes the schema and seeds the four demo users/sample data.
7. Run `npm run dev`.
8. Open `http://localhost:5173`.

Demo password: `Demo@123` for all seeded roles.

Never commit `.env` or share the database password.
