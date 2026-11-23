# Prison Management System

## Backend API configuration

All frontend API requests use `VITE_API_URL`, which defaults to `/api/v1`.
During local development, Vite proxies `/api` to the backend at
`http://localhost:8080`. Start the API separately, then run the frontend with
`npm run dev`.

For deployment, set `VITE_API_URL` to the real backend's API base URL when
building the frontend, or configure the production web server to route `/api`
to that backend. Vite environment variables are embedded at build time, so
rebuild after changing the value. Keep credentials and tokens out of frontend
environment variables; anything prefixed with `VITE_` is exposed to the browser.

The browser communicates only with the API. PostgreSQL is managed by the
backend and is never accessed directly from frontend code.

## Run locally

```powershell
npm run dev
```

Leave `VITE_API_URL` empty in local development so requests use the Vite proxy:

```text
VITE_API_URL=
```

For a deployed frontend, set `VITE_API_URL` to the public API base URL,
including the `/api/v1` path.

The frontend sends the login token as a Bearer token and uses the API for
inmates, visits, transfers, and user access records. Release and discharge
operations are not currently published by the backend OpenAPI contract.

The rehabilitation programs module also uses the configured API base URL:
`GET /programs`, `GET /programs/enrollments`, and
`GET /programs/attendance`, with corresponding `POST` requests to create
programs, enroll inmates, and record session attendance.
