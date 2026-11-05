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
