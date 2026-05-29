const router = require("express").Router();
const {
  register,
  verifyEmail,
  resendVerifyOTP,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const {
  validate,
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validators/auth.validator");
const { requireAuth } = require("../middlewares/auth.middleware");
const { authLimiter, otpLimiter } = require("../middlewares/rateLimiter");

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyOTPSchema), verifyEmail);
router.post(
  "/resend-otp",
  otpLimiter,
  validate(forgotPasswordSchema),
  resendVerifyOTP,
);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.get("/me", requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
