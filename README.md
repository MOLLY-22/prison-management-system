# Prison Management System

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

The discharge dashboard runs against a browser-local mock backend; it does not
connect to a server or production data. The queue is seeded with sample records,
and discharge events and saved clearance checklists persist in the current
browser's local storage.

The trial storage keys are:

- `prison-management.trial.inmates`
- `prison-management.trial.discharge-events`
- `prison-management.trial.checklists`

To restore the sample records and clear saved trial changes, remove those keys
from the browser's local storage for this app. This mock backend is for UI
testing only and is not suitable for real records or operational decisions.
