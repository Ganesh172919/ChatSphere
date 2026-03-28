const User = require('../models/User');

async function adminCheck(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('isAdmin').lean();
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ error: 'Auth check failed' });
  }
}

module.exports = adminCheck;
