CREATE SEQUENCE IF NOT EXISTS unit_seq;

CREATE TABLE hospitals (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  license_no TEXT UNIQUE NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','frontdesk','medical','lab','inventory','issue','hospital')),
  hospital_id INT REFERENCES hospitals(id)
);

CREATE TABLE donors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  dob DATE NOT NULL,
  sex CHAR(1) NOT NULL CHECK (sex IN ('M','F')),
  blood_group TEXT NOT NULL CHECK (blood_group IN ('O-','O+','A-','A+','B-','B+','AB-','AB+')),
  weight_kg NUMERIC(5,1),
  hb NUMERIC(4,1),
  phone TEXT,
  last_donation DATE
);

CREATE TABLE blood_units (
  id SERIAL PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL DEFAULT ('BB' || lpad(nextval('unit_seq')::text, 6, '0')),
  donor_id INT NOT NULL REFERENCES donors(id),
  blood_group TEXT NOT NULL,
  component TEXT NOT NULL CHECK (component IN ('RBC','Platelets','Plasma')),
  collected_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Quarantine'
    CHECK (status IN ('Quarantine','Available','Reserved','Issued','Discarded')),
  reactive_tests TEXT[] NOT NULL DEFAULT '{}',
  discard_reason TEXT
);

CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  hospital_id INT NOT NULL REFERENCES hospitals(id),
  patient_group TEXT NOT NULL,
  component TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  urgency TEXT NOT NULL DEFAULT 'Routine' CHECK (urgency IN ('Routine','Urgent','Emergency')),
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_units (
  request_id INT NOT NULL REFERENCES requests(id),
  unit_id INT NOT NULL UNIQUE REFERENCES blood_units(id),
  PRIMARY KEY (request_id, unit_id)
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT,
  action TEXT NOT NULL,
  detail TEXT,
  at TIMESTAMPTS NOT NULL DEFAULT now()
);

CREATE INDEX idx_units_stock ON blood_units (status, component, blood_group, expiry_on);
