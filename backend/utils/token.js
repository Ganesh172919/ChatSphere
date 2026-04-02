const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

/**
 * Generate an access token (15m) and a refresh token (7d) for the given user.
 */
function generateAccessToken(user) {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * Convenience wrapper — returns { accessToken, refreshToken }.
 */
function generateTokens(user) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/**
 * Persist a refresh token in MongoDB with a 7-day TTL.
 */
async function saveRefreshToken(token, userId) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({ token, userId, expiresAt });
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  saveRefreshToken,
};
