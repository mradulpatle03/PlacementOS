const User = require("../models/User");
const Student = require("../models/Student");
const Recruiter = require("../models/Recruiter");
const { createError } = require("../middlewares/errorHandler");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");
const {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE,
} = require("../utils/cookie");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/mailer");
const { generateOTP, otpExpiry } = require("../utils/otp");

// Register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (role === "admin" || role === "tpo") {
      return next(createError("Cannot self-register as admin or TPO", 403));
    }

    const existing = await User.findOne({ email });
    if (existing) return next(createError("Email already registered", 409));

    const otp = generateOTP();
    const expiry = otpExpiry();

    const user = await User.create({
      name,
      email,
      password,
      role,
      emailVerifyOTP: otp,
      emailVerifyOTPExpiry: expiry,
    });

    console.log(`Registered: ${email} [${role}]`);

    if (role === "student") await Student.create({ user: user._id });
    else if (role === "recruiter") await Recruiter.create({ user: user._id });

    // send OTP — don't await so response isn't blocked
    sendOTPEmail(email, otp).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Registration successful. Check your email for the OTP.",
      user,
    });
  } catch (err) {
    next(err);
  }
};

// Verify Email OTP
const verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select(
      "+emailVerifyOTP +emailVerifyOTPExpiry",
    );
    if (!user) return next(createError("User not found", 404));

    if (user.isEmailVerified) {
      return res.json({ success: true, message: "Email already verified" });
    }

    if (!user.emailVerifyOTP || user.emailVerifyOTP !== otp) {
      return next(createError("Invalid OTP", 400));
    }

    if (user.emailVerifyOTPExpiry < new Date()) {
      return next(createError("OTP expired. Request a new one.", 400));
    }

    user.isEmailVerified = true;
    user.emailVerifyOTP = undefined;
    user.emailVerifyOTPExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    console.log(`Email verified: ${email}`);
    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
};

// Resend Verification OTP
const resendVerifyOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return next(createError("User not found", 404));
    if (user.isEmailVerified) {
      return res.json({ success: true, message: "Email already verified" });
    }

    const otp = generateOTP();
    user.emailVerifyOTP = otp;
    user.emailVerifyOTPExpiry = otpExpiry();
    await user.save({ validateBeforeSave: false });

    sendOTPEmail(email, otp).catch(() => {});
    console.log(`Resent verify OTP to: ${email}`);

    res.json({ success: true, message: "OTP resent. Check your email." });
  } catch (err) {
    next(err);
  }
};

// Login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select(
      "+password +refreshTokens",
    );
    if (!user) return next(createError("Invalid email or password", 401));

    if (!user.isActive)
      return next(createError("Account deactivated. Contact admin.", 403));

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return next(createError("Invalid email or password", 401));

    if (!user.isEmailVerified) {
      return next(
        createError("Please verify your email before logging in.", 403),
      );
    }

    const payload = { userId: user._id, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    user.refreshTokens.push({ token: refreshToken });
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save({ validateBeforeSave: false });

    setRefreshTokenCookie(res, refreshToken);
    console.log(`Login: ${email} [${user.role}]`);

    res.json({ success: true, message: "Login successful", accessToken, user });
  } catch (err) {
    next(err);
  }
};

// Refresh Token
const refresh = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];
    if (!token) return next(createError("No refresh token", 401));

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return next(createError("Invalid or expired refresh token", 401));
    }

    const user = await User.findById(decoded.userId).select("+refreshTokens");
    if (!user) return next(createError("User not found", 401));

    const tokenExists = user.refreshTokens.some((t) => t.token === token);
    if (!tokenExists) return next(createError("Refresh token revoked", 401));

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== token);
    const newRefreshToken = generateRefreshToken({
      userId: user._id,
      role: user.role,
    });
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save({ validateBeforeSave: false });

    const newAccessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    setRefreshTokenCookie(res, newRefreshToken);
    console.log(`Token refreshed: userId ${user._id}`);

    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

// Logout
const logout = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE];

    if (token) {
      const user = await User.findOne({ "refreshTokens.token": token }).select(
        "+refreshTokens",
      );
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(
          (t) => t.token !== token,
        );
        await user.save({ validateBeforeSave: false });
        console.log(`Logout: userId ${user._id}`);
      }
    }

    clearRefreshTokenCookie(res);
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

// Forgot Password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // always respond success — don't leak whether email exists
    if (!user) {
      return res.json({
        success: true,
        message: "If that email exists, an OTP has been sent.",
      });
    }

    const otp = generateOTP();
    user.passwordResetOTP = otp;
    user.passwordResetOTPExpiry = otpExpiry();
    await user.save({ validateBeforeSave: false });

    sendPasswordResetEmail(email, otp).catch(() => {});
    console.log(`Password reset OTP sent: ${email}`);

    res.json({
      success: true,
      message: "If that email exists, an OTP has been sent.",
    });
  } catch (err) {
    next(err);
  }
};

// Reset Password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select(
      "+passwordResetOTP +passwordResetOTPExpiry +refreshTokens",
    );
    if (!user) return next(createError("Invalid request", 400));

    if (!user.passwordResetOTP || user.passwordResetOTP !== otp) {
      return next(createError("Invalid OTP", 400));
    }

    if (user.passwordResetOTPExpiry < new Date()) {
      return next(createError("OTP expired. Request a new one.", 400));
    }

    user.password = newPassword; // pre-save hook will hash it
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpiry = undefined;
    user.refreshTokens = []; // invalidate all sessions on password reset
    await user.save();

    clearRefreshTokenCookie(res);
    console.log(`Password reset: ${email}`);

    res.json({
      success: true,
      message: "Password reset successful. Please log in.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerifyOTP,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
