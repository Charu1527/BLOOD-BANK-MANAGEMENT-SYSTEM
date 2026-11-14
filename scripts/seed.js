require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../src/db');

(async () => {
  const hash = await bcrypt.hash('Admin@123', 10);
  await db.query(
    `INSERT INTO users(name, email, password_hash, role)
     VALUES ('Admin', 'admin@bbms.local', $1, 'admin') ON CONFLICT (email) DO NOTHING`,
    [hash]
  );
  await db.query(
    `INSERT INTO hospitals(name, license_no) VALUES ('City General', 'LIC-001') ON CONFLICT (license_no) DO NOTHING`
  );
  console.log('Seeded admin@bbms.local / Admin@123. Change this password.');
  process.exit(0);
})();
