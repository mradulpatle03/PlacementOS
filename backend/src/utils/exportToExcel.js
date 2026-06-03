const ExcelJS = require("exceljs");
const { STAGE_LABELS } = require("../services/pipeline.service");

/**
 * Flattens a populated Application document into a plain row object
 * ready for both Excel and CSV export.
 */
const flattenApplication = (app) => ({
  "Roll Number": app.student?.rollNumber || "-",
  "Student Name": app.student?.user?.name || "-",
  Email: app.student?.user?.email || "-",
  Branch: app.student?.branch || "-",
  CGPA: app.student?.cgpa ?? "-",
  Backlogs: app.student?.backlogs ?? "-",
  "Graduation Year": app.student?.graduationYear || "-",
  "Placement Status": app.student?.placementStatus || "-",
  Stage: STAGE_LABELS[app.status] || app.status,
  "Resume Label": app.resume?.label || "-",
  "Resume Score": app.resume?.score ?? "-",
  "Applied At": app.appliedAt
    ? new Date(app.appliedAt).toLocaleDateString("en-IN")
    : "-",
  Remarks: app.remarks || "-",
});

/**
 * Builds an Excel workbook (.xlsx) buffer for a given list of applications.
 * One sheet per export — titled with drive name + stage.
 *
 * @param {object[]} applications  - populated application docs (plain objects)
 * @param {string}   driveTitle    - used as the worksheet title
 * @param {string}   stage         - current stage key (e.g. 'shortlisted')
 * @returns {Buffer}
 */
const buildExcelBuffer = async (applications, driveTitle, stage) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PlacementOS";
  workbook.created = new Date();

  const sheetTitle = `${stage.toUpperCase()} (${applications.length})`;
  const worksheet = workbook.addWorksheet(sheetTitle);

  // header row
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

  worksheet.columns = columns;

  // style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" }, // dark navy — matches PlacementOS brand
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  // data rows
  applications.forEach((app, index) => {
    const row = worksheet.addRow(flattenApplication(app));

    // alternate row shading
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F4FA" },
      };
    }

    row.alignment = { vertical: "middle" };
  });

  // freeze header row
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // auto-filter on header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  return workbook.xlsx.writeBuffer();
};

/**
 * Builds a CSV string for a given list of applications.
 *
 * @param {object[]} applications - populated application docs (plain objects)
 * @returns {string}
 */
const buildCSVString = (applications) => {
  if (applications.length === 0) return "";

  const rows = applications.map(flattenApplication);
  const headers = Object.keys(rows[0]);

  const escape = (val) => {
    const str = String(val ?? "");
    // wrap in quotes if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];

  return csvLines.join("\n");
};

module.exports = { buildExcelBuffer, buildCSVString, flattenApplication };
