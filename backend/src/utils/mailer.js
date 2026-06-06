const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_USER, SMTP_PASS, NODE_ENV } = require('../config/env');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// verify connection on startup (only in production)
if (NODE_ENV === 'production') {
  transporter.verify((err) => {
    if (err) console.log('Mailer error:', err.message);
    else console.log('Mailer ready');
  });
}

const sendMail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"PlacementOS" <${SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.log(`Email failed to ${to}:`, err.message);
    throw err;
  }
};

// ── Named senders — use centralised templates ─────────────────

const { otpEmail, welcomeEmail } = require('./emailTemplates');

const sendOTPEmail = (to, otp) => {
  const { subject, html } = otpEmail({ otp, purpose: 'verify' });
  return sendMail({ to, subject, html });
};

const sendPasswordResetEmail = (to, otp) => {
  const { subject, html } = otpEmail({ otp, purpose: 'reset' });
  return sendMail({ to, subject, html });
};

const sendWelcomeEmail = (to, name, role) => {
  const { subject, html } = welcomeEmail({ name, role });
  return sendMail({ to, subject, html });
};

module.exports = { sendMail, sendOTPEmail, sendPasswordResetEmail, sendWelcomeEmail };