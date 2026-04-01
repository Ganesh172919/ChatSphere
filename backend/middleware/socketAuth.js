const jwt = require('jsonwebtoken');

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    socket.user = { id: decoded.id, username: decoded.username, email: decoded.email };
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
}

module.exports = socketAuthMiddleware;
