require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { PORT, FRONTEND_URL } = require("./config/env");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const { initSocket } = require("./sockets");

const { errorHandler } = require("./middlewares/errorHandler");
const healthRouter = require("./routes/health.routes");
const authRouter = require("./routes/auth.routes");
const studentRouter = require("./routes/student.routes");
const recruiterRouter = require("./routes/recruiter.routes");
const resumeRouter = require("./routes/resume.routes");
const companyRouter = require("./routes/company.routes");
const driveRouter = require("./routes/drive.routes");
const eligibilityRouter = require("./routes/eligibility.routes");
const applicationRouter = require("./routes/application.routes");
const pipelineRouter = require("./routes/pipeline.routes");
const submissionRouter = require("./routes/submission.routes");
const assessmentRouter = require("./routes/assessment.routes");
const interviewRouter = require("./routes/interview.routes");
const notificationRouter = require('./routes/notification.routes');
const offerRouter = require('./routes/offer.routes');
const policyRouter = require('./routes/policy.routes');
const analyticsRouter = require('./routes/analytics.routes');
const { startEmailWorker } = require("./queues/emailWorker");
const {
  startInterviewReminderWorker,
} = require("./queues/interviewReminderWorker");
const { startNotificationWorker } = require("./queues/notificationWorker");

const app = express();
const server = http.createServer(app); // wrap express in http.Server

// Middlewares
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/students", studentRouter);
app.use("/api/v1/recruiters", recruiterRouter);
app.use("/api/v1/resumes", resumeRouter);
app.use("/api/v1/companies", companyRouter);
app.use("/api/v1/drives", driveRouter);
app.use("/api/v1/drives", eligibilityRouter);
app.use("/api/v1/applications", applicationRouter);
app.use("/api/v1/pipeline", pipelineRouter);
app.use("/api/v1/submissions", submissionRouter);
app.use("/api/v1/assessments", assessmentRouter);
app.use("/api/v1/interviews", interviewRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/offers', offerRouter);
app.use('/api/v1/policies', policyRouter);
app.use('/api/v1/analytics', analyticsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// Boot (only when run directly)
if (require.main === module) {
  connectDB();
  connectRedis();
  require("./config/cloudinary");

  // init Socket.IO on the http server
  initSocket(server, FRONTEND_URL);

  startEmailWorker();
  startInterviewReminderWorker();
  startNotificationWorker();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

// export both for testing (supertest uses app; socket tests use server)
module.exports = app;
module.exports.server = server;
