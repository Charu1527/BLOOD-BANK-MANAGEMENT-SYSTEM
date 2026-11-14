const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const u = (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0];
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  const token = jwt.sign(
    { id: u.id, role: u.role, hospital_id: u.hospital_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, role: u.role, name: u.name });
});

// Only an admin can create staff and hospital accounts
router.post('/users', auth(['admin']), async (req, res) => {
  const { name, email, password, role, hospital_id } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    'INSERT INTO users(name, email, password_hash, role, hospital_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role',
    [name, email, hash, role, hospital_id || null]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
