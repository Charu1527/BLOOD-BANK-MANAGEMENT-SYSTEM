# Blood Bank Management System

Software Engineering project. Node.js + Express + PostgreSQL REST API with JWT role-based access,
and a browser frontend in `public/`.

## Features
- Donor registration and eligibility screening (age, weight, Hb, donation gap)
- Collection with auto-generated unit barcodes, quarantine until lab release
- Lab testing (TTI): any reactive result discards the unit
- Inventory with FEFO allocation and hourly expiry job
- Hospital requests, allocation (exact group first, then earliest expiry), issue, cancel
- Donor-to-recipient traceability and audit log

## Setup
1. Install Node.js 20+ and PostgreSQL 15+
2. `npm install`
3. `psql -U postgres -c "CREATE DATABASE bbms;"`
4. `psql -U postgres -d bbms -f db/schema.sql`
5. `cp .env.example .env` and edit the values
6. `npm run seed` (creates admin@bbms.local / Admin@123; change the password)
7. `npm run dev` and open http://localhost:3000

## Tests
`npm test`

## API
| Method | Path | Role |
|---|---|---|
| POST | /api/auth/login | public |
| POST | /api/auth/users | admin |
| POST, GET | /api/donors | frontdesk, medical |
| POST | /api/donors/:id/collect | medical, lab, frontdesk |
| GET | /api/units, /api/units/stock | any user |
| POST | /api/units/:id/tests | lab |
| POST | /api/units/:id/discard | inventory |
| GET | /api/units/trace/:barcode | inventory, issue, lab, medical |
| POST, GET | /api/requests | hospital, issue |
| POST | /api/requests/:id/allocate, /issue | issue |
| POST | /api/requests/:id/cancel | issue, hospital |

## Note
`public/index.html` is a standalone demo that stores data in the browser. See the build guide to wire it to this API.
