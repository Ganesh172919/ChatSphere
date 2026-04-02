const passport = require('passport');
const authService = require('../services/auth.service');

// ─── Cookie config ────────────────────────────────────────────────────────────
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, REFRESH_COOKIE_OPTIONS);
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const result = await authService.registerUser(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    setRefreshCookie(res, result.refreshToken);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const result = await authService.loginUser(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    setRefreshCookie(res, result.refreshToken);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/refresh
async function refresh(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await authService.refreshTokens({ refreshToken });
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    setRefreshCookie(res, result.refreshToken);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/logout
async function logout(req, res) {
  try {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await authService.logoutUser({ refreshToken });
    clearRefreshCookie(res);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Logout error:', err);
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const result = await authService.getMe(req.user.id);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const result = await authService.forgotPassword(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

// GET /api/auth/google
function googleAuth(req, res, next) {
  if (!authService.isGoogleOAuthEnabled()) {
    return res.redirect(`${authService.getClientUrl()}/login?error=google_not_configured`);
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
}

// GET /api/auth/google/callback — middleware guard
function googleCallbackGuard(req, res, next) {
  if (!authService.isGoogleOAuthEnabled()) {
    return res.redirect(`${authService.getClientUrl()}/login?error=google_not_configured`);
  }

  return passport.authenticate('google', {
    session: false,
    failureRedirect: `${authService.getClientUrl()}/login?error=google_auth_failed`,
  })(req, res, next);
}

// GET /api/auth/google/callback — final handler
async function googleCallback(req, res) {
  try {
    const code = authService.issueGoogleLoginCode(req.user._id);
    res.redirect(`${authService.getClientUrl()}/auth/google/callback?code=${code}`);
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${authService.getClientUrl()}/login?error=google_auth_failed`);
  }
}

// POST /api/auth/google/exchange
async function googleExchange(req, res) {
  try {
    const result = await authService.exchangeGoogleCode(req.body);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    setRefreshCookie(res, result.refreshToken);
    res.status(result.status).json(result.data);
  } catch (err) {
    console.error('Google exchange error:', err);
    res.status(500).json({ error: 'Failed to complete Google sign-in' });
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  googleAuth,
  googleCallbackGuard,
  googleCallback,
  googleExchange,
};
