require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/donors', require('./routes/donors'));
app.use('/api/units', require('./routes/units'));
app.use('/api/requests', require('./routes/requests'));

// Express 5 forwards errors from async handlers to this function
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log('BBMS running on port ' + port));

  // Hourly: discard every expired unit that is not yet issued
  setInterval(() => {
    db.query(
      `UPDATE blood_units SET status = 'Discarded', discard_reason = 'Expired'
       WHERE status IN ('Quarantine','Available','Reserved') AND expiry_on < CURRENT_DATE`
    ).catch(console.error);
  }, 3600000);
}

module.exports = app;
