# Prison Management System

<<<<<<< HEAD
## Backend API configuration

All frontend API requests use `VITE_API_URL`, which defaults to `/api`. During
local development, Vite proxies `/api` to the mock backend at
`http://127.0.0.1:5000`; start it with `pnpm dev:backend` and start the frontend
with `pnpm dev`.

For deployment, set `VITE_API_URL` to the real backend's API base URL when
building the frontend, or configure the production web server to route `/api`
to that backend. Vite environment variables are embedded at build time, so
rebuild after changing the value. Keep credentials and tokens out of frontend
environment variables; anything prefixed with `VITE_` is exposed to the browser.

## Trial mock backend
=======
The Vite frontend proxies local API requests to `http://localhost:8080/api/v1`.
PostgreSQL is managed by the API stack and is not accessed directly by the
browser.
>>>>>>> origin/master

## Run locally

```powershell
npm install
npm run dev
```

Leave `VITE_API_URL` empty in local development so requests use the Vite proxy:

```text
VITE_API_URL=
```

For a deployed frontend, set `VITE_API_URL` to the public API base URL,
including the `/api/v1` path.

The frontend sends the login token as a Bearer token and uses the API for
inmates, visitors, transfers, releases, and user access records.
