const jwt = require('jsonwebtoken');

// auth() = any logged-in user; auth(['lab']) = lab technicians (admins always pass)
exports.auth = (roles = []) => (req, res, next) => {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Login required' });
  }
  if (roles.length && req.user.role !== 'admin' && !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Not allowed for your role' });
  }
  next();
};
