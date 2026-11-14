const db = require('../db');

exports.log = (userId, action, detail) =>
  db.query('INSERT INTO audit_log(user_id, action, detail) VALUES ($1, $2, $3)', [userId, action, detail]);
