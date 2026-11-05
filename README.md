# Prison Management System

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
