const crypto = require('crypto');

// 6-digit numeric OTP
const generateOTP = () => {
  return String(crypto.randomInt(100000, 999999));
};

// OTP expiry — 10 minutes from now
const otpExpiry = () => new Date(Date.now() + 10 * 60 * 1000);

module.exports = { generateOTP, otpExpiry };