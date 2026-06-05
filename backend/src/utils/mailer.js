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

// Email templates

const sendOTPEmail = (to, otp) =>
  sendMail({
    to,
    subject: 'Verify your PlacementOS account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#4f46e5">PlacementOS</h2>
        <p>Your email verification OTP is:</p>
        <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

const sendPasswordResetEmail = (to, otp) =>
  sendMail({
    to,
    subject: 'Reset your PlacementOS password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#4f46e5">PlacementOS</h2>
        <p>Your password reset OTP is:</p>
        <h1 style="letter-spacing:8px;color:#4f46e5">${otp}</h1>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

module.exports = { sendMail , sendOTPEmail, sendPasswordResetEmail };