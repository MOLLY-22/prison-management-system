# Prison Management System

The Vite frontend proxies local API requests to `http://localhost:8080/api/v1`.
PostgreSQL is managed by the API stack and is not accessed directly by the
browser.

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
