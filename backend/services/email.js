const nodemailer = require('nodemailer');

// Create transporter — uses SMTP if configured, otherwise logs to console
let transporter;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: (process.env.SMTP_PORT || '587') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  console.warn('⚠️  SMTP not configured — emails will be logged to console. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable.');
}

/**
 * Send a password reset email (or log the URL to console if SMTP is not configured)
 */
async function sendResetEmail(toEmail, resetUrl) {
  const subject = 'ChatSphere — Reset Your Password';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #A855F7;">ChatSphere</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="background: #A855F7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">Reset Password</a></p>
      <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request this, just ignore this email.</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"ChatSphere" <noreply@chatsphere.app>',
      to: toEmail,
      subject,
      html,
    });
  } else {
    // Fallback: log to console so developers can grab the link
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Password Reset Email (SMTP not configured)');
    console.log(`   To: ${toEmail}`);
    console.log(`   Reset URL: ${resetUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

module.exports = { sendResetEmail };
