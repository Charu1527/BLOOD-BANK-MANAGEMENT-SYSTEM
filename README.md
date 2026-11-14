# Blood Bank Management System

Software Engineering project. Node.js + PostgreSQL REST API with JWT role-based access,
and a browser frontend in `public/`.

## Features
- Donor registration and eligibility screening (age, weight, Hb, donation gap)
- Collection with auto-generated unit barcodes, quarantine until lab release
- Lab testing (TTI): any reactive result discards the unit
- Inventory with FEFO allocation and hourly expiry job
- Hospital requests, allocation (exact group first, then earliest expiry), issue, cancel
- Donor-to-recipient traceability and audit log

