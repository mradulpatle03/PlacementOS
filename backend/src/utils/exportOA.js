const ExcelJS = require("exceljs");

/**
 * Flatten a submission into a plain row — for Excel + CSV export.
 */
const flattenSubmission = (sub, rank = null) => ({
  Rank: rank ?? "-",
  "Roll Number": sub.student?.rollNumber || "-",
  "Student Name": sub.student?.user?.name || "-",
  Email: sub.student?.user?.email || "-",
  Branch: sub.student?.branch || "-",
  CGPA: sub.student?.cgpa ?? "-",
  "Score (Marks)": `${sub.totalMarksAwarded ?? 0} / ${sub.totalMarksPossible ?? 0}`,
  "Score (%)": sub.percentageScore ?? 0,
  "MCQ Correct": _countCorrect(sub.answers, "mcq"),
  "Coding Passed": _codingPassed(sub.answers),
  "Time Taken (min)": sub.timeTakenSeconds
    ? Math.round(sub.timeTakenSeconds / 60)
    : "-",
  Violations: sub.violationCount ?? 0,
  "Auto Submitted": sub.autoSubmitted ? "Yes" : "No",
  Status: sub.status || "-",
  "Submitted At": sub.submittedAt
    ? new Date(sub.submittedAt).toLocaleString("en-IN")
    : "-",
});

const _countCorrect = (answers = [], type) =>
  answers.filter((a) => a.questionType === type && a.isCorrect === true).length;

const _codingPassed = (answers = []) => {
  const coding = answers.filter((a) => a.questionType === "coding");
  if (!coding.length) return "-";
  const passed = coding.filter(
    (a) =>
      a.judgeResult?.passedTestCases === a.judgeResult?.totalTestCases &&
      a.judgeResult?.totalTestCases > 0,
  ).length;
  return `${passed} / ${coding.length}`;
};

/**
 * Build an Excel buffer for OA results.
 * Follows the same style as buildExcelBuffer() in exportToExcel.js.
 *
 * @param {object[]} submissions  - populated submission docs (plain objects)
 * @param {string}   assessmentTitle
 * @returns {Buffer}
 */
const buildOAExcelBuffer = async (submissions, assessmentTitle) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PlacementOS";
  workbook.created = new Date();

  const sheetTitle = `OA Results (${submissions.length})`;
  const worksheet = workbook.addWorksheet(sheetTitle);

  const columns = [
    { header: "Rank", key: "Rank", width: 7 },
    { header: "Roll Number", key: "Roll Number", width: 14 },
    { header: "Student Name", key: "Student Name", width: 22 },
    { header: "Email", key: "Email", width: 28 },
    { header: "Branch", key: "Branch", width: 10 },
    { header: "CGPA", key: "CGPA", width: 8 },
    { header: "Score (Marks)", key: "Score (Marks)", width: 14 },
    { header: "Score (%)", key: "Score (%)", width: 10 },
    { header: "MCQ Correct", key: "MCQ Correct", width: 13 },
    { header: "Coding Passed", key: "Coding Passed", width: 14 },
    { header: "Time Taken (min)", key: "Time Taken (min)", width: 16 },
    { header: "Violations", key: "Violations", width: 11 },
    { header: "Auto Submitted", key: "Auto Submitted", width: 14 },
    { header: "Status", key: "Status", width: 12 },
    { header: "Submitted At", key: "Submitted At", width: 20 },
  ];

  worksheet.columns = columns;

  // style header row — same navy as pipeline export
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;

  // sort by score desc, time asc (same as leaderboard)
  const sorted = [...submissions].sort((a, b) => {
    if (b.percentageScore !== a.percentageScore)
      return b.percentageScore - a.percentageScore;
    return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
  });

  sorted.forEach((sub, index) => {
    const row = worksheet.addRow(flattenSubmission(sub, index + 1));

    // alternate row shading — same as pipeline export
    if (index % 2 === 0) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F4FA" },
      };
    }

    // highlight perfect scores in green
    if (sub.percentageScore >= 100) {
      row.getCell("Score (%)").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD4EDDA" },
      };
    }

    row.alignment = { vertical: "middle" };
  });

  // freeze header
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

  // auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  return workbook.xlsx.writeBuffer();
};

/**
 * Build a CSV string for OA results.
 * Matches buildCSVString() pattern in exportToExcel.js.
 *
 * @param {object[]} submissions
 * @returns {string}
 */
const buildOACSVString = (submissions) => {
  if (submissions.length === 0) return "";

  const sorted = [...submissions].sort((a, b) => {
    if (b.percentageScore !== a.percentageScore)
      return b.percentageScore - a.percentageScore;
    return (a.timeTakenSeconds || 0) - (b.timeTakenSeconds || 0);
  });

  const rows = sorted.map((sub, idx) => flattenSubmission(sub, idx + 1));
  const headers = Object.keys(rows[0]);

  const escape = (val) => {
    const str = String(val ?? "");
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

module.exports = { buildOAExcelBuffer, buildOACSVString, flattenSubmission };
