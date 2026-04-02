const express = require('express');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// ─── Local auth ───────────────────────────────────────────────────────────────
router.post('/register',        authLimiter,  authController.register);
router.post('/login',           authLimiter,  authController.login);
router.post('/refresh',         authLimiter,  authController.refresh);
router.post('/logout',                        authController.logout);
router.get('/me',               authMiddleware, authController.getMe);

// ─── Password reset ──────────────────────────────────────────────────────────
router.post('/forgot-password', authLimiter,  authController.forgotPassword);
router.post('/reset-password',  authLimiter,  authController.resetPassword);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
router.get('/google',                         authController.googleAuth);
router.get('/google/callback',  authController.googleCallbackGuard, authController.googleCallback);
router.post('/google/exchange',               authController.googleExchange);

module.exports = router;
