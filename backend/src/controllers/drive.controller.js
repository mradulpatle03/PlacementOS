const axios = require("axios");
const Drive = require("../models/Drive");
const Company = require("../models/Company");
const { createError } = require("../middlewares/errorHandler");
const {
  validateTransition,
  getAllowedTransitions,
} = require("../services/driveState.service");
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");
const { notifyDriveOpened } = require("../queues/notificationQueue");
const Student = require("../models/Student");
const User = require("../models/User");
const { checkEligibility } = require("../services/eligibility.service");

// POST /api/v1/drives
const createDrive = async (req, res, next) => {
  try {
    const company = await Company.findById(req.body.company);
    if (!company) return next(createError("Company not found", 404));

    const drive = await Drive.create({
      ...req.body,
      createdBy: req.user._id,
      status: "draft",
    });

    await drive.populate("company", "name logo sector");
    console.log(`Drive created: "${drive.title}" by ${req.user.email}`);

    res.status(201).json({
      success: true,
      drive,
      allowedTransitions: getAllowedTransitions("draft"),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives
const getAllDrives = async (req, res, next) => {
  try {
    const {
      status,
      company,
      mode,
      branch,
      minCTC,
      maxCTC,
      search,
      graduationYear,
      sector,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // role-based status filter
    if (req.user.role === "student") {
      filter.status = { $in: ["published", "open"] };
    } else {
      if (status) {
        // support comma-separated: ?status=open,published
        const statuses = status.split(",").map((s) => s.trim());
        filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
      }
    }

    if (company) filter.company = company;
    if (mode) filter.mode = mode;
    if (search) filter.title = { $regex: search, $options: "i" };

    // branch filter — supports comma-separated
    if (branch) {
      const branches = branch.split(",").map((b) => b.trim());
      filter["eligibility.allowedBranches"] = { $in: branches };
    }

    // graduation year filter
    if (graduationYear) {
      const years = graduationYear.split(",").map(Number);
      filter["eligibility.graduationYear"] = { $in: years };
    }

    // CTC filter — any role in the drive matching
    if (minCTC || maxCTC) {
      filter["roles.ctc"] = {};
      if (minCTC) filter["roles.ctc"].$gte = Number(minCTC);
      if (maxCTC) filter["roles.ctc"].$lte = Number(maxCTC);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // sort
    const sort = {};
    const allowedSortFields = ["createdAt", "applicationDeadline", "title"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sort[sortField] = sortOrder === "asc" ? 1 : -1;

    const [drives, total] = await Promise.all([
      Drive.find(filter)
        .populate("company", "name logo sector location")
        .populate("createdBy", "name")
        .skip(skip)
        .limit(Number(limit))
        .sort(sort),
      Drive.countDocuments(filter),
    ]);

    // filter out null company (when sector filter used with populate match)
    const result = sector
      ? drives.filter((d) => d.company?.sector === sector)
      : drives;

    res.json({
      success: true,
      drives: sector ? result : drives,
      pagination: {
        total: sector ? result.length : total,
        page: Number(page),
        pages: Math.ceil((sector ? result.length : total) / Number(limit)),
        limit: Number(limit),
      },
      filters: {
        status,
        company,
        mode,
        branch,
        minCTC,
        maxCTC,
        search,
        graduationYear,
        sector,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives/:id
const getDriveById = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id)
      .populate("company", "name logo sector location website description")
      .populate("createdBy", "name email");

    if (!drive) return next(createError("Drive not found", 404));

    // students blocked from non-public drives
    if (
      req.user.role === "student" &&
      !["published", "open"].includes(drive.status)
    ) {
      return next(createError("Drive not found", 404));
    }

    res.json({
      success: true,
      drive,
      allowedTransitions: getAllowedTransitions(drive.status),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/drives/:id
const updateDrive = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) return next(createError("Drive not found", 404));

    if (!["draft", "published"].includes(drive.status)) {
      return next(
        createError(`Drive in '${drive.status}' status cannot be edited`, 400),
      );
    }

    // prevent company field change after creation
    if (req.body.company && req.body.company !== drive.company.toString()) {
      return next(
        createError("Company cannot be changed after drive creation", 400),
      );
    }
    if (req.body.company) delete req.body.company;

    const updated = await Drive.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    ).populate("company", "name logo sector");

    console.log(`Drive updated: "${drive.title}" by ${req.user.email}`);
    res.json({
      success: true,
      drive: updated,
      allowedTransitions: getAllowedTransitions(updated.status),
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/drives/:id
const deleteDrive = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) return next(createError("Drive not found", 404));

    if (drive.status !== "draft") {
      return next(
        createError(
          "Only draft drives can be deleted. Close the drive first.",
          400,
        ),
      );
    }

    if (drive.jd?.publicId) {
      await deleteFromCloudinary(drive.jd.publicId);
    }

    await drive.deleteOne();
    console.log(`Drive deleted: "${drive.title}" by ${req.user.email}`);
    res.json({ success: true, message: "Drive deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/drives/:id/status
const updateDriveStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return next(createError("New status is required", 400));

    const drive = await Drive.findById(req.params.id).populate(
      "company",
      "name",
    );

    if (!drive) return next(createError("Drive not found", 404));

    const errors = validateTransition(drive, status);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors });
    }

    const previousStatus = drive.status;
    drive.status = status;
    await drive.save();
    // notify eligible students when drive opens
    if (status === "open") {
      try {
        const students = await Student.find({})
          .populate("user", "email name")
          .lean();
        const company = await require("../models/Company")
          .findById(drive.company)
          .lean();

        for (const student of students) {
          const { eligible } = checkEligibility(student, drive);
          if (eligible && student.user) {
            notifyDriveOpened(student.user._id.toString(), student.user.email, {
              drive,
              company: company || { name: "Company" },
              studentName: student.user.name,
              ctc: drive.ctc,
            }).catch((e) => console.log("[Drive] Notify failed:", e.message));
          }
        }
      } catch (notifErr) {
        console.log(
          "[Drive] Bulk notify failed (non-fatal):",
          notifErr.message,
        );
      }
    }

    console.log(
      `Drive "${drive.title}": ${previousStatus} → ${status} by ${req.user.email}`,
    );

    res.json({
      success: true,
      message: `Drive status updated to '${status}'`,
      drive,
      allowedTransitions: getAllowedTransitions(status),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/drives/:id/jd
const uploadJD = async (req, res, next) => {
  try {
    if (!req.file) return next(createError("No file uploaded", 400));

    const drive = await Drive.findById(req.params.id);
    if (!drive) return next(createError("Drive not found", 404));

    if (drive.jd?.publicId) {
      await deleteFromCloudinary(drive.jd.publicId);
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "placementos/jds",
      resource_type: "raw",
      public_id: `jd_${drive._id}_${Date.now()}`,
      // format: "pdf",
      type: "upload",
    });

    drive.jd = { cloudinaryUrl: result.secure_url, publicId: result.public_id };
    await drive.save();

    console.log(`JD uploaded for drive: "${drive.title}"`);
    res.json({ success: true, jd: drive.jd });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives/:id/summary
// quick stats for TPO dashboard
const getDriveSummary = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id).populate(
      "company",
      "name logo",
    );

    if (!drive) return next(createError("Drive not found", 404));

    const maxCTC = Math.max(...drive.roles.map((r) => r.ctc));
    const minCTC = Math.min(...drive.roles.map((r) => r.ctc));
    const totalOpenings = drive.roles.reduce(
      (s, r) => s + (r.openings || 1),
      0,
    );

    res.json({
      success: true,
      summary: {
        title: drive.title,
        company: drive.company,
        status: drive.status,
        ctcRange: { min: minCTC, max: maxCTC },
        totalOpenings,
        totalApplications: drive.totalApplications,
        totalShortlisted: drive.totalShortlisted,
        totalOffers: drive.totalOffers,
        applicationDeadline: drive.applicationDeadline,
        allowedTransitions: getAllowedTransitions(drive.status),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives/stats
// overall drive stats for TPO
const getDriveStats = async (req, res, next) => {
  try {
    const [statusCounts, total] = await Promise.all([
      Drive.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Drive.countDocuments(),
    ]);

    const stats = {
      total,
      draft: 0,
      published: 0,
      open: 0,
      closed: 0,
      completed: 0,
    };
    statusCounts.forEach(({ _id, count }) => {
      stats[_id] = count;
    });

    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives/:id/jd/preview
const previewJD = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id);
    if (!drive) return next(createError("Drive not found", 404));

    if (!drive.jd?.cloudinaryUrl) {
      return next(createError("No JD uploaded for this drive", 404));
    }

    const response = await axios.get(drive.jd.cloudinaryUrl, {
      responseType: "stream",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="JD_${drive.title}.pdf"`,
    );
    response.data.pipe(res);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/drives/upcoming
// drives with deadline in next 7 days
const getUpcomingDrives = async (req, res, next) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const filter = {
      status: { $in: ["published", "open"] },
      applicationDeadline: { $gte: now, $lte: in7Days },
    };

    // students see only their eligible branches (basic filter, full eligibility engine Day 31)
    if (req.user.role === "student") {
      const Student = require("../models/Student");
      const student = await Student.findOne({ user: req.user._id });
      if (student?.branch) {
        filter["eligibility.allowedBranches"] = student.branch;
      }
    }

    const drives = await Drive.find(filter)
      .populate("company", "name logo sector")
      .sort({ applicationDeadline: 1 })
      .limit(10);

    res.json({ success: true, count: drives.length, drives });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDrive,
  getAllDrives,
  getDriveById,
  updateDrive,
  deleteDrive,
  updateDriveStatus,
  uploadJD,
  getDriveSummary,
  getDriveStats,
  previewJD,
  getUpcomingDrives,
};
