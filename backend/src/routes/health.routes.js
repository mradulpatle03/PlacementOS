const router = require("express").Router();
const { redis } = require("../config/redis");
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
  const mongoStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  let redisStatus = "disconnected";
  try {
    await redis.ping();
    redisStatus = "connected";
  } catch (err) {
    redisStatus = "disconnected";
  }

  res.json({
    success: true,
    message: "PlacementOS API is running",
    timestamp: new Date().toISOString(),
    services: {
      mongo: mongoStatus,
      redis: redisStatus,
    },
  });
});

module.exports = router;
