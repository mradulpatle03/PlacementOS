const Application = require("../models/Application");
const Drive = require("../models/Drive");
const AppError = require("../utils/AppError");
const { buildExcelBuffer, buildCSVString } = require("../utils/exportToExcel");
const {
  PIPELINE_STAGES,
  STAGE_LABELS,
} = require("../services/pipeline.service");

// GET /api/v1/pipeline/drive/:driveId/export?stage=shortlisted&format=xlsx
// GET /api/v1/pipeline/drive/:driveId/export?stage=shortlisted&format=csv
// GET /api/v1/pipeline/drive/:driveId/export?format=xlsx  (exports ALL stages — multi-sheet)
// Roles: tpo, recruiter, admin
const exportPipelineStage = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { stage, format = "xlsx" } = req.query;

    // ── validate format ──
    if (!["xlsx", "csv"].includes(format)) {
      return next(new AppError("format must be 'xlsx' or 'csv'", 400));
    }

    // ── validate stage if provided ──
    const ALL_EXPORTABLE = [...PIPELINE_STAGES, "rejected"];
    if (stage && !ALL_EXPORTABLE.includes(stage)) {
      return next(
        new AppError(
          `Unknown stage '${stage}'. Valid stages: ${ALL_EXPORTABLE.join(", ")}`,
          400,
        ),
      );
    }

    // ── fetch drive ──
    const drive = await Drive.findById(driveId).lean();
    if (!drive) return next(new AppError("Drive not found", 404));

    // ── build query ──
    const filter = { drive: driveId };
    if (stage) filter.status = stage;

    const applications = await Application.find(filter)
      .populate({
        path: "student",
        select:
          "rollNumber branch cgpa backlogs graduationYear placementStatus",
        populate: { path: "user", select: "name email" },
      })
      .populate("resume", "label score isPrimary")
      .sort({ "student.branch": 1, "student.cgpa": -1 })
      .lean();

    if (applications.length === 0) {
      return next(
        new AppError(
          stage
            ? `No applications found at stage '${STAGE_LABELS[stage] || stage}'`
            : "No applications found for this drive",
          404,
        ),
      );
    }

    const driveTitle = drive.title || "Drive";
    const stageLabel = stage ? STAGE_LABELS[stage] || stage : "All Stages";
    // safe filename — strip special chars
    const safeTitle = driveTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
    const safeStage = (stage || "all").replace(/_/g, "-");
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // CSV export
    if (format === "csv") {
      const csvString = buildCSVString(applications);
      const filename = `${safeTitle}_${safeStage}_${timestamp}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.status(200).send(csvString);
    }

    // XLSX export — single stage
    if (stage) {
      const buffer = await buildExcelBuffer(
        applications,
        driveTitle,
        stageLabel,
      );
      const filename = `${safeTitle}_${safeStage}_${timestamp}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      return res.status(200).send(Buffer.from(buffer));
    }

    // XLSX export — all stages (multi-sheet)
    const ExcelJS = require("exceljs");
    const { flattenApplication } = require("../utils/exportToExcel");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PlacementOS";
    workbook.created = new Date();

    const columns = [
      { header: "Roll Number", key: "Roll Number", width: 14 },
      { header: "Student Name", key: "Student Name", width: 22 },
      { header: "Email", key: "Email", width: 28 },
      { header: "Branch", key: "Branch", width: 10 },
      { header: "CGPA", key: "CGPA", width: 8 },
      { header: "Backlogs", key: "Backlogs", width: 10 },
      { header: "Graduation Year", key: "Graduation Year", width: 16 },
      { header: "Placement Status", key: "Placement Status", width: 18 },
      { header: "Stage", key: "Stage", width: 20 },
      { header: "Resume Label", key: "Resume Label", width: 16 },
      { header: "Resume Score", key: "Resume Score", width: 14 },
      { header: "Applied At", key: "Applied At", width: 14 },
      { header: "Remarks", key: "Remarks", width: 30 },
    ];

    // group applications by stage
    const grouped = {};
    ALL_EXPORTABLE.forEach((s) => {
      grouped[s] = [];
    });
    applications.forEach((app) => {
      if (grouped[app.status]) grouped[app.status].push(app);
    });

    // one sheet per stage that has at least one application
    let sheetCount = 0;
    for (const s of ALL_EXPORTABLE) {
      const stageApps = grouped[s];
      if (stageApps.length === 0) continue;

      sheetCount++;
      const worksheet = workbook.addWorksheet(
        `${STAGE_LABELS[s] || s} (${stageApps.length})`,
      );
      worksheet.columns = columns;

      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A5F" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 20;

      stageApps.forEach((app, index) => {
        const row = worksheet.addRow(flattenApplication(app));
        if (index % 2 === 0) {
          row.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF0F4FA" },
          };
        }
        row.alignment = { vertical: "middle" };
      });

      worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
    }

    if (sheetCount === 0) {
      return next(new AppError("No applications to export", 404));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `${safeTitle}_all-stages_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
};

module.exports = { exportPipelineStage };
