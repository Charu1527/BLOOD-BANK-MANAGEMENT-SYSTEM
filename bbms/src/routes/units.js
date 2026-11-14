const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { log } = require('../lib/audit');

router.get('/', auth(), async (req, res) => {
  const { status, group } = req.query;
  const { rows } = await db.query(
    `SELECT * FROM blood_units
     WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR blood_group = $2)
     ORDER BY expiry_on`,
    [status || null, group || null]
  );
  res.json(rows);
});

router.get('/stock', auth(), async (req, res) => {
  const { rows } = await db.query(
    `SELECT blood_group, component, COUNT(*)::int AS units
     FROM blood_units WHERE status = 'Available'
     GROUP BY blood_group, component ORDER BY blood_group, component`
  );
  res.json(rows);
});

// Lab records reactive tests. Any reactive result discards the unit.
router.post('/:id/tests', auth(['lab']), async (req, res) => {
  const reactive = req.body.reactive || [];
  const status = reactive.length ? 'Discarded' : 'Available';
  const reason = reactive.length ? 'TTI reactive: ' + reactive.join(', ') : null;
  const { rows } = await db.query(
    `UPDATE blood_units SET status = $1, reactive_tests = $2, discard_reason = $3
     WHERE id = $4 AND status = 'Quarantine' RETURNING *`,
    [status, reactive, reason, req.params.id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Unit is not in quarantine' });
  await log(req.user.id, 'TESTS_RECORDED', rows[0].barcode + ' -> ' + status);
  res.json(rows[0]);
});

router.post('/:id/discard', auth(['inventory']), async (req, res) => {
  const { rows } = await db.query(
    `UPDATE blood_units SET status = 'Discarded', discard_reason = $2
     WHERE id = $1 AND status IN ('Available','Quarantine') RETURNING *`,
    [req.params.id, req.body.reason || 'Manual discard']
  );
  if (!rows[0]) return res.status(409).json({ error: 'Unit cannot be discarded' });
  await log(req.user.id, 'UNIT_DISCARDED', rows[0].barcode);
  res.json(rows[0]);
});

// Donor-to-recipient traceability
router.get('/trace/:barcode', auth(['inventory', 'issue', 'lab', 'medical']), async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.*, d.name AS donor_name, q.id AS request_id, h.name AS hospital
     FROM blood_units u
     JOIN donors d ON d.id = u.donor_id
     LEFT JOIN request_units ru ON ru.unit_id = u.id
     LEFT JOIN requests q ON q.id = ru.request_id
     LEFT JOIN hospitals h ON h.id = q.hospital_id
     WHERE u.barcode = $1`,
    [req.params.barcode.toUpperCase()]
  );
  rows[0] ? res.json(rows[0]) : res.status(404).json({ error: 'Unit not found' });
});

module.exports = router;
