const { Worker, connection } = require("../config/queues");
const { REPORT_QUEUE_NAME } = require("./reportQueue");
const Report = require("../models/Report");
const { sendMail } = require("../utils/mailer");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");
const {
  generatePlacementSummaryExcel,
  generateDriveReportExcel,
  generateOfferReportExcel,
  generateCustomReportExcel,
  generatePlacementSummaryPDF,
} = require("../services/report.service");
const {
  getTPOAnalytics,
  getDriveFunnel,
} = require("../services/analytics.service");

const Application = require("../models/Application");
const Student = require("../models/Student");
const Drive = require("../models/Drive");

// ── upload helper ─────────────────────────────────────────────
const uploadReport = async (buffer, reportId, format) => {
  const result = await uploadBufferToCloudinary(buffer, {
    folder: "placementos/reports",
    resource_type: "raw",
    public_id: `report_${reportId}_${Date.now()}`,
    format,
  });
  return { fileUrl: result.secure_url, publicId: result.public_id };
};

// ── email notification ────────────────────────────────────────
const notifyReportReady = async (email, reportTitle, fileUrl) => {
  if (!email) return;
  try {
    await sendMail({
      to: email,
      subject: `PlacementOS — Report Ready: ${reportTitle}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px">
          <h2 style="color:#4f46e5">PlacementOS</h2>
          <p>Your report <strong>${reportTitle}</strong> is ready for download.</p>
          <a href="${fileUrl}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;
                    border-radius:8px;text-decoration:none;font-size:14px;margin-top:12px">
            Download Report
          </a>
          <p style="color:#6b7280;font-size:12px;margin-top:20px">
            This link expires in 7 days.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.log("[ReportWorker] Email notification failed:", err.message);
  }
};

// ── generators ────────────────────────────────────────────────
const generate = async (job) => {
  const { type, filters, format } = job.data;

  switch (type) {
    case "placement_summary": {
      const tpoData = await getTPOAnalytics({ year: filters.year });
      return format === "pdf"
        ? generatePlacementSummaryPDF({ tpoData, year: filters.year })
        : generatePlacementSummaryExcel({ tpoData, year: filters.year });
    }

    case "drive_report": {
      if (!filters.driveId)
        throw new Error("driveId required for drive report");
      const drive = await Drive.findById(filters.driveId).lean();
      if (!drive) throw new Error("Drive not found");

      const appFilter = { drive: filters.driveId };
      if (filters.status) appFilter.status = filters.status;

      const applications = await Application.find(appFilter)
        .populate({
          path: "student",
          select:
            "rollNumber branch cgpa backlogs graduationYear placementStatus",
          populate: { path: "user", select: "name email" },
        })
        .populate("resume", "label score")
        .lean();

      const funnel = await getDriveFunnel({ driveId: filters.driveId });
      return generateDriveReportExcel({ drive, applications, funnel });
    }

    case "branch_report": {
      if (!filters.branch) throw new Error("branch required for branch report");

      const students = await Student.find({ branch: filters.branch })
        .populate("user", "name email")
        .lean();

      const studentIds = students.map((s) => s._id);

      const appFilter = { student: { $in: studentIds } };
      if (filters.status) appFilter.status = filters.status;
      if (filters.driveId) appFilter.drive = filters.driveId;

      const applications = await Application.find(appFilter)
        .populate({
          path: "student",
          select:
            "rollNumber branch cgpa backlogs graduationYear placementStatus",
          populate: { path: "user", select: "name email" },
        })
        .lean();

      // reuse drive report generator — same shape
      const fakeDrive = { title: `${filters.branch} Branch Report` };
      return generateDriveReportExcel({
        drive: fakeDrive,
        applications,
        funnel: null,
      });
    }

    case "offer_report": {
      const Offer = require("../models/Offer");
      const offerFilter = {};
      if (filters.driveId) offerFilter.drive = filters.driveId;
      if (filters.status) offerFilter.status = filters.status;
      if (filters.companyId) offerFilter.company = filters.companyId;

      const offers = await Offer.find(offerFilter)
        .populate({
          path: "student",
          select: "branch",
          populate: { path: "user", select: "name email" },
        })
        .populate("company", "name")
        .populate("drive", "title")
        .lean();

      return generateOfferReportExcel({
        offers,
        title: "Offer Letters Report",
      });
    }

    case "custom": {
      // build a unified rows array from applications + optional joins
      const appFilter = {};
      if (filters.driveId) appFilter.drive = filters.driveId;
      if (filters.branch) {
        const branchStudents = await Student.find({ branch: filters.branch })
          .select("_id")
          .lean();
        appFilter.student = { $in: branchStudents.map((s) => s._id) };
      }
      if (filters.status) appFilter.status = filters.status;
      if (filters.year) {
        const y = Number(filters.year);
        if (!isNaN(y)) {
          appFilter.appliedAt = {
            $gte: new Date(`${y}-01-01`),
            $lte: new Date(`${y}-12-31T23:59:59`),
          };
        }
      }

      const applications = await Application.find(appFilter)
        .populate({
          path: "student",
          select:
            "rollNumber branch cgpa backlogs graduationYear placementStatus",
          populate: { path: "user", select: "name email" },
        })
        .populate("resume", "label score")
        .lean();

      // if offer fields selected, try to join offer data
      const selectedFields = filters.fields || [];
      const needsOffer = [
        "ctc",
        "designation",
        "offerStatus",
        "joiningDate",
      ].some((f) => selectedFields.includes(f));

      let rows = applications;

      if (needsOffer) {
        const Offer = require("../models/Offer");
        const appIds = applications.map((a) => a._id);
        const offers = await Offer.find({ application: { $in: appIds } })
          .select("application ctc designation status joiningDate")
          .lean();

        const offerMap = offers.reduce((acc, o) => {
          acc[o.application.toString()] = o;
          return acc;
        }, {});

        // merge offer data into rows
        rows = applications.map((app) => {
          const offer = offerMap[app._id.toString()] || {};
          return {
            ...app,
            ctc: offer.ctc || null,
            designation: offer.designation || "",
            offerStatus: offer.status || "",
            joiningDate: offer.joiningDate || null,
          };
        });
      }

      return generateCustomReportExcel({
        rows,
        selectedFields,
        title: job.data.title || "Custom Report",
      });
    }

    default:
      throw new Error(`Unknown report type: ${type}`);
  }
};

// ── worker ─────────────────────────────────────────────────────
let reportWorker = null;

const startReportWorker = () => {
  if (reportWorker) return reportWorker;

  reportWorker = new Worker(
    REPORT_QUEUE_NAME,
    async (job) => {
      const { reportId, format } = job.data;
      console.log(`[ReportWorker] Job ${job.id} | reportId: ${reportId}`);

      try {
        await Report.findByIdAndUpdate(reportId, { status: "processing" });

        const buffer = await generate(job);
        const { fileUrl, publicId } = await uploadReport(
          buffer,
          reportId,
          format,
        );

        const report = await Report.findByIdAndUpdate(
          reportId,
          { status: "completed", fileUrl, publicId, completedAt: new Date() },
          { new: true },
        );

        await notifyReportReady(job.data.notifyEmail, report.title, fileUrl);
        console.log(`[ReportWorker] Job ${job.id} completed — ${fileUrl}`);
      } catch (err) {
        console.error(`[ReportWorker] Job ${job.id} failed:`, err.message);
        await Report.findByIdAndUpdate(reportId, {
          status: "failed",
          errorMessage: err.message,
        });
        throw err;
      }
    },
    { connection, concurrency: 3 },
  );

  reportWorker.on("completed", (job) =>
    console.log(`[ReportWorker] Job ${job.id} done`),
  );
  reportWorker.on("failed", (job, err) =>
    console.error(`[ReportWorker] Job ${job?.id} failed:`, err.message),
  );

  console.log("[ReportWorker] Started");
  return reportWorker;
};

module.exports = { startReportWorker, reportWorker: () => reportWorker };
