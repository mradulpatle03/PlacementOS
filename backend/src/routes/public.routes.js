const express = require("express");
const router = express.Router();

const {
  getStats,
  getRecruiterShowcase,
  getPublicSuccessStories,
} = require("../controllers/public.controller");

// no auth middleware — fully public
router.get("/stats", getStats);
router.get("/recruiters", getRecruiterShowcase);
router.get("/success-stories", getPublicSuccessStories);

module.exports = router;
