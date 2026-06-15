const Report = require("../models/Report");
const { addReportJob } = require("../queues/reportQueue");
const { ALL_FIELDS, DEFAULT_FIELDS } = require("../services/report.service");
const AppError = require("../utils/AppError");

const VALID_TYPES = [
  "placement_summary",
  "drive_report",
  "branch_report",
  "offer_report",
  "custom",
];

// POST /api/v1/reports/generate
const generateReport = async (req, res, next) => {
  try {
    const {
      type,
      title,
      filters = {},
      format = "xlsx",
      notifyEmail,
    } = req.body;

    if (!type || !VALID_TYPES.includes(type)) {
      return next(
        new AppError(
          `Invalid report type. Valid: ${VALID_TYPES.join(", ")}`,
          400,
        ),
      );
    }
    if (!title) return next(new AppError("title is required", 400));
    if (!["xlsx", "pdf"].includes(format)) {
      return next(new AppError("format must be 'xlsx' or 'pdf'", 400));
    }

    // for custom reports, validate selected fields
    if (type === "custom" && filters.fields?.length) {
      const invalid = filters.fields.filter((f) => !ALL_FIELDS[f]);
      if (invalid.length) {
        return next(new AppError(`Unknown fields: ${invalid.join(", ")}`, 400));
      }
    }

    const report = await Report.create({
      requestedBy: req.user._id,
      type,
      title,
      filters: {
        ...filters,
        fields:
          type === "custom" ? filters.fields || DEFAULT_FIELDS.custom : [],
      },
      format,
      status: "queued",
      notifyEmail: notifyEmail || req.user.email || null,
    });

    await addReportJob({
      reportId: report._id.toString(),
      type,
      title,
      filters: report.filters,
      format,
      notifyEmail: report.notifyEmail,
    });

    return res.status(202).json({
      success: true,
      message: "Report queued. You will be notified by email when it is ready.",
      data: { reportId: report._id, status: "queued" },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports
const getReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { requestedBy: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports/:id
const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      requestedBy: req.user._id,
    }).lean();

    if (!report) return next(new AppError("Report not found", 404));

    return res.status(200).json({ success: true, data: { report } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/reports/:id
const deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findOneAndDelete({
      _id: req.params.id,
      requestedBy: req.user._id,
    });

    if (!report) return next(new AppError("Report not found", 404));

    if (report.publicId) {
      try {
        const { deleteFromCloudinary } = require("../utils/cloudinaryUpload");
        await deleteFromCloudinary(report.publicId);
      } catch (_) {}
    }

    return res.status(200).json({ success: true, message: "Report deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reports/fields
// Returns all available fields for custom report builder
const getAvailableFields = (req, res) => {
  const fields = Object.entries(ALL_FIELDS).map(([key, def]) => ({
    key,
    label: def.header,
    category: key.startsWith("resume")
      ? "Resume"
      : ["ctc", "designation", "offerStatus", "joiningDate"].includes(key)
        ? "Offer"
        : ["status", "appliedAt"].includes(key)
          ? "Application"
          : "Student",
  }));

  return res.status(200).json({
    success: true,
    data: { fields, defaults: DEFAULT_FIELDS },
  });
};

// GET /api/v1/reports/count-preview
// Returns how many rows a custom report would generate without building it
const countPreview = async (req, res, next) => {
  try {
    const { driveId, branch, status, year } = req.query;

    const Application = require("../models/Application");
    const Student = require("../models/Student");

    const filter = {};
    if (driveId) filter.drive = driveId;
    if (status) filter.status = status;
    if (branch) {
      const students = await Student.find({ branch }).select("_id").lean();
      filter.student = { $in: students.map((s) => s._id) };
    }
    if (year) {
      const y = Number(year);
      if (!isNaN(y)) {
        filter.appliedAt = {
          $gte: new Date(`${y}-01-01`),
          $lte: new Date(`${y}-12-31T23:59:59`),
        };
      }
    }

    const count = await Application.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: { count, message: `This report will include ${count} row(s)` },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateReport,
  getReports,
  getReportById,
  deleteReport,
  getAvailableFields,
  countPreview,
};
