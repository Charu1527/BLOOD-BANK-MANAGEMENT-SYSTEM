const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { check } = require('../lib/eligibility');
const { log } = require('../lib/audit');

const SHELF = { RBC: 42, Platelets: 5, Plasma: 365 };

router.post('/', auth(['frontdesk', 'medical']), async (req, res) => {
  const { name, dob, sex, blood_group, weight_kg, hb, phone, last_donation } = req.body;
  const { rows } = await db.query(
    `INSERT INTO donors(name, dob, sex, blood_group, weight_kg, hb, phone, last_donation)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, dob, sex, blood_group, weight_kg, hb, phone, last_donation || null]
  );
  await log(req.user.id, 'DONOR_REGISTERED', 'donor ' + rows[0].id);
  res.status(201).json({ donor: rows[0], deferral_reasons: check(rows[0]) });
});

router.get('/', auth(), async (req, res) => {
  const { rows } = await db.query('SELECT * FROM donors ORDER BY id');
  res.json(rows.map((d) => ({ ...d, deferral_reasons: check(d) })));
});

router.post('/:id/collect', auth(['medical', 'lab', 'frontdesk']), async (req, res) => {
  const component = req.body.component || 'RBC';
  if (!SHELF[component]) return res.status(400).json({ error: 'Unknown component' });

  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const d = (await c.query('SELECT * FROM donors WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!d) {
      await c.query('ROLLBACK');
      return res.status(404).json({ error: 'Donor not found' });
    }
    const reasons = check(d);
    if (reasons.length) {
      await c.query('ROLLBACK');
      return res.status(422).json({ error: 'Donor is deferred', reasons });
    }
    const unit = (await c.query(
      `INSERT INTO blood_units(donor_id, blood_group, component, expiry_on)
       VALUES ($1, $2, $3, CURRENT_DATE + $4::int) RETURNING *`,
      [d.id, d.blood_group, component, SHELF[component]]
    )).rows[0];
    await c.query('UPDATE donors SET last_donation = CURRENT_DATE WHERE id = $1', [d.id]);
    await c.query('COMMIT');
    await log(req.user.id, 'UNIT_COLLECTED', unit.barcode + ' from donor ' + d.id);
    res.status(201).json(unit);
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
});

module.exports = router;
