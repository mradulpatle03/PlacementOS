require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { PORT, FRONTEND_URL } = require("./config/env");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

const { errorHandler } = require("./middlewares/errorHandler");
const healthRouter = require("./routes/health.routes");
const authRouter = require("./routes/auth.routes");
const studentRouter = require('./routes/student.routes');
const recruiterRouter = require('./routes/recruiter.routes');
const resumeRouter = require('./routes/resume.routes');
const companyRouter = require('./routes/company.routes');
const driveRouter = require('./routes/drive.routes');
const eligibilityRouter = require('./routes/eligibility.routes');
const applicationRouter = require('./routes/application.routes');
const pipelineRouter = require('./routes/pipeline.routes');

const app = express();

// Middlewares
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use('/api/v1/students', studentRouter);
app.use('/api/v1/recruiters', recruiterRouter);
app.use('/api/v1/resumes', resumeRouter);
app.use('/api/v1/companies', companyRouter);
app.use('/api/v1/drives', driveRouter);
app.use('/api/v1/drives', eligibilityRouter);
app.use('/api/v1/applications', applicationRouter);
app.use('/api/v1/pipeline', pipelineRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler (must be last)
app.use(errorHandler);

if (require.main === module) {
  // Connect services
  connectDB();
  connectRedis();
  require("./config/cloudinary");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
}

module.exports = app;
