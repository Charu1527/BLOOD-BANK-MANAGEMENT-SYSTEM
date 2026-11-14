const router = require('express').Router();
const db = require('../db');
const { auth } = require('../auth');
const { log } = require('../lib/audit');
const { donorGroupsFor } = require('../lib/compat');

router.post('/', auth(['hospital', 'issue']), async (req, res) => {
  const { patient_group, component, quantity, urgency } = req.body;
  const hospital_id = req.user.hospital_id || req.body.hospital_id;
  const { rows } = await db.query(
    `INSERT INTO requests(hospital_id, patient_group, component, quantity, urgency)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [hospital_id, patient_group, component, quantity, urgency || 'Routine']
  );
  await log(req.user.id, 'REQUEST_RAISED', 'request ' + rows[0].id);
  res.status(201).json(rows[0]);
});

router.get('/', auth(), async (req, res) => {
  const own = req.user.role === 'hospital' ? req.user.hospital_id : null;
  const { rows } = await db.query(
    `SELECT * FROM requests WHERE ($1::int IS NULL OR hospital_id = $1)
     ORDER BY CASE urgency WHEN 'Emergency' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END, created_at`,
    [own]
  );
  res.json(rows);
});

// Exact group first, then earliest expiry. SKIP LOCKED stops two officers grabbing one unit.
router.post('/:id/allocate', auth(['issue']), async (req, res) => {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const q = (await c.query('SELECT * FROM requests WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
    if (!q || ['Issued', 'Cancelled'].includes(q.status)) {
      await c.query('ROLLBACK');
      return res.status(409).json({ error: 'Request cannot be allocated' });
    }
    const have = (await c.query('SELECT COUNT(*)::int AS n FROM request_units WHERE request_id = $1', [q.id])).rows[0].n;
    const picked = (await c.query(
      `SELECT id FROM blood_units
       WHERE status = 'Available' AND component = $1 AND blood_group = ANY($2)
         AND expiry_on >= CURRENT_DATE
       ORDER BY (blood_group = $3) DESC, expiry_on ASC
       LIMIT $4 FOR UPDATE SKIP LOCKED`,
      [q.component, donorGroupsFor(q.component, q.patient_group), q.patient_group, q.quantity - have]
    )).rows.map((x) => x.id);

    if (picked.length) {
      await c.query("UPDATE blood_units SET status = 'Reserved' WHERE id = ANY($1)", [picked]);
      await c.query('INSERT INTO request_units(request_id, unit_id) SELECT $1, UNNEST($2::int[])', [q.id, picked]);
    }
    const total = have + picked.length;
    const status = total >= q.quantity ? 'Reserved' : total > 0 ? 'Partial' : 'Shortage';
    await c.query('UPDATE requests SET status = $1 WHERE id = $2', [status, q.id]);
    await c.query('COMMIT');
    await log(req.user.id, 'REQUEST_ALLOCATED', 'request ' + q.id + ': ' + picked.length + ' reserved');
    res.json({ status, reserved: picked.length });
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
});

router.post('/:id/issue', auth(['issue']), async (req, res) => {
  const q = (await db.query('SELECT status FROM requests WHERE id = $1', [req.params.id])).rows[0];
  if (!q || q.status !== 'Reserved') return res.status(409).json({ error: 'Reserve all units before issuing' });
  await db.query(
    `WITH u AS (
       UPDATE blood_units SET status = 'Issued'
       WHERE id IN (SELECT unit_id FROM request_units WHERE request_id = $1)
     )
     UPDATE requests SET status = 'Issued' WHERE id = $1`,
    [req.params.id]
  );
  await log(req.user.id, 'REQUEST_ISSUED', 'request ' + req.params.id);
  res.json({ status: 'Issued' });
});

router.post('/:id/cancel', auth(['issue', 'hospital']), async (req, res) => {
  const { rows } = await db.query(
    `WITH r AS (DELETE FROM request_units WHERE request_id = $1 RETURNING unit_id),
          u AS (UPDATE blood_units SET status = 'Available'
                WHERE id IN (SELECT unit_id FROM r) AND status = 'Reserved' RETURNING id)
     UPDATE requests SET status = 'Cancelled'
     WHERE id = $1 AND status IN ('Pending','Reserved','Partial','Shortage') RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Request cannot be cancelled' });
  await log(req.user.id, 'REQUEST_CANCELLED', 'request ' + req.params.id);
  res.json(rows[0]);
});

module.exports = router;
