# Corp-Sec Visitor Management Demo

A React/Vite visitor-management dashboard with an Express and SQLite mock API.

## Run locally

Install dependencies once from the project root and backend folder:

```powershell
npm install
npm --prefix mock-backend install
```

Open two terminals at the project root:

```powershell
npm run dev:backend
```

```powershell
npm run dev
```

Open the Vite URL shown in the second terminal. The development server proxies `/api` requests to the backend on port `5000`.

The backend persists demo data in `mock-backend/visitors.db`. It exposes visitor registration, status approval/rejection, gate entry/exit, deletion, inmate search, and `/api/health`.

## Staff login

The app starts at `/login`. A successful sign-in opens the protected `/dashboard` route; unauthenticated visits to the dashboard redirect to login. Use **Remember me** to keep the session across browser restarts, or leave it unchecked to keep it for the current browser session only. Sign out from the dashboard header.

The local mock backend accepts this development-only account:

- Email: `admin@prison.local`
- Password: `DemoPrison2026!`

Set `DEMO_AUTH_EMAIL` and `DEMO_AUTH_PASSWORD` to override the local demo credentials. The mock backend uses in-memory sessions and is not suitable for production. In production mode, credentials must be explicitly configured.
