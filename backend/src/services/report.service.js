const ExcelJS     = require('exceljs');
const PDFDocument = require('pdfkit');

// ── shared Excel styling ──────────────────────────────────────

const NAVY  = 'FF1E3A5F';
const WHITE = 'FFFFFFFF';
const GRAY  = 'FFF2F2F2';

const styleHeader = (row) => {
  row.font      = { bold: true, color: { argb: WHITE }, size: 11 };
  row.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height    = 20;
};

const styleDataRow = (row, index) => {
  if (index % 2 === 0) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } };
  }
  row.alignment = { vertical: 'middle' };
};

const addTitleRow = (worksheet, title, colCount) => {
  worksheet.mergeCells(1, 1, 1, colCount);
  const titleRow = worksheet.getRow(1);
  titleRow.getCell(1).value     = title;
  titleRow.getCell(1).font      = { bold: true, size: 13, color: { argb: NAVY } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 28;
};

// ── ALL available field definitions ──────────────────────────

const ALL_FIELDS = {
  // student fields
  rollNumber:      { header: 'Roll Number',     width: 14, path: (r) => r.student?.rollNumber       || '-' },
  name:            { header: 'Student Name',    width: 22, path: (r) => r.student?.user?.name      || '-' },
  email:           { header: 'Email',           width: 28, path: (r) => r.student?.user?.email     || '-' },
  branch:          { header: 'Branch',          width: 10, path: (r) => r.student?.branch          || '-' },
  cgpa:            { header: 'CGPA',            width: 8,  path: (r) => r.student?.cgpa            ?? '-' },
  backlogs:        { header: 'Backlogs',        width: 10, path: (r) => r.student?.backlogs        ?? '-' },
  graduationYear:  { header: 'Grad Year',       width: 12, path: (r) => r.student?.graduationYear  || '-' },
  placementStatus: { header: 'Placement Status',width: 18, path: (r) => r.student?.placementStatus || '-' },
  // application fields
  status:          { header: 'Stage',           width: 16, path: (r) => r.status                   || '-' },
  appliedAt:       { header: 'Applied At',      width: 14, path: (r) => r.appliedAt
    ? new Date(r.appliedAt).toLocaleDateString('en-IN') : '-' },
  // resume fields
  resumeLabel:     { header: 'Resume',          width: 16, path: (r) => r.resume?.label            || '-' },
  resumeScore:     { header: 'Resume Score',    width: 14, path: (r) => r.resume?.score            ?? '-' },
  // offer fields (only relevant for offer reports)
  ctc:             { header: 'CTC (LPA)',       width: 12, path: (r) => r.ctc                      ?? '-' },
  designation:     { header: 'Designation',     width: 20, path: (r) => r.designation              || '-' },
  offerStatus:     { header: 'Offer Status',    width: 14, path: (r) => r.offerStatus              || '-' },
  joiningDate:     { header: 'Joining Date',    width: 14, path: (r) => r.joiningDate
    ? new Date(r.joiningDate).toLocaleDateString('en-IN') : '-' },
};

// default set of fields for each report type
const DEFAULT_FIELDS = {
  placement_summary: ['rollNumber', 'name', 'email', 'branch', 'cgpa', 'placementStatus'],
  drive_report:      ['rollNumber', 'name', 'email', 'branch', 'cgpa', 'backlogs', 'status', 'appliedAt'],
  branch_report:     ['rollNumber', 'name', 'email', 'cgpa', 'backlogs', 'graduationYear', 'status'],
  offer_report:      ['rollNumber', 'name', 'email', 'branch', 'ctc', 'designation', 'offerStatus', 'joiningDate'],
  custom:            ['rollNumber', 'name', 'email', 'branch', 'cgpa', 'status'],
};

// ── Placement Summary — multi-sheet Excel ──────────────────────

const generatePlacementSummaryExcel = async ({ tpoData, year }) => {
  const workbook   = new ExcelJS.Workbook();
  workbook.creator = 'PlacementOS';
  workbook.created = new Date();

  const overview     = tpoData?.overview    || {};
  const packages     = tpoData?.packages    || {};
  const branchStats  = tpoData?.branchStats || [];
  const topCompanies = tpoData?.topCompanies || [];

  // Sheet 1: Overview
  const ws1 = workbook.addWorksheet('Overview');
  addTitleRow(ws1,
    `Placement Summary ${year && year !== 'all' ? `— ${year}` : '(All Years)'}`, 2);
  ws1.columns = [
    { key: 'metric', width: 30 },
    { key: 'value',  width: 20 },
  ];
  styleHeader(ws1.addRow(['Metric', 'Value']));

  [
    ['Total Students',         overview.totalStudents       || 0],
    ['Placed Students',        overview.placedStudents      || 0],
    ['Dream Placed',           overview.dreamPlacedStudents || 0],
    ['Unplaced Students',      overview.unplacedStudents    || 0],
    ['Placement %',            `${overview.placementPercent || 0}%`],
    ['Offer Acceptance Rate',  `${tpoData?.offerAcceptanceRate || 0}%`],
    ['Highest Package (LPA)',  packages.max     || 0],
    ['Average Package (LPA)',  packages.average || 0],
    ['Median Package (LPA)',   packages.median  || 0],
    ['Lowest Package (LPA)',   packages.min     || 0],
    ['Offers Accepted',        packages.count   || 0],
    ['Generated At',           new Date().toLocaleString('en-IN')],
  ].forEach((r, i) => styleDataRow(ws1.addRow(r), i));

  // Sheet 2: Branch-wise
  const ws2 = workbook.addWorksheet('Branch-wise');
  addTitleRow(ws2, 'Branch-wise Placement Breakdown', 6);
  ws2.columns = [
    { key: 'branch',      header: 'Branch',          width: 12 },
    { key: 'total',       header: 'Total Students',  width: 16 },
    { key: 'placed',      header: 'Placed',          width: 12 },
    { key: 'dreamPlaced', header: 'Dream Placed',    width: 14 },
    { key: 'unplaced',    header: 'Unplaced',        width: 12 },
    { key: 'pct',         header: 'Placement %',     width: 14 },
  ];
  styleHeader(ws2.addRow(ws2.columns.map((c) => c.header)));
  branchStats.forEach((b, i) => styleDataRow(ws2.addRow({
    branch: b.branch, total: b.total, placed: b.placed,
    dreamPlaced: b.dreamPlaced, unplaced: b.unplaced, pct: `${b.placementPercent}%`,
  }), i));

  // Sheet 3: Top Companies
  const ws3 = workbook.addWorksheet('Top Companies');
  addTitleRow(ws3, 'Top Recruiting Companies', 4);
  ws3.columns = [
    { key: 'rank',     header: 'Rank',            width: 8  },
    { key: 'name',     header: 'Company',         width: 30 },
    { key: 'offers',   header: 'Offers Extended', width: 18 },
    { key: 'accepted', header: 'Offers Accepted', width: 18 },
  ];
  styleHeader(ws3.addRow(ws3.columns.map((c) => c.header)));
  topCompanies.forEach((c, i) => styleDataRow(ws3.addRow({
    rank: i + 1, name: c.name, offers: c.offers, accepted: c.accepted,
  }), i));

  return workbook.xlsx.writeBuffer();
};

// ── Drive Report ───────────────────────────────────────────────

const generateDriveReportExcel = async ({ drive, applications, funnel }) => {
  const workbook   = new ExcelJS.Workbook();
  workbook.creator = 'PlacementOS';

  const ws1 = workbook.addWorksheet('All Applicants');
  addTitleRow(ws1, `${drive.title} — All Applicants`, 10);
  ws1.columns = [
    { key: 'rollNo',    header: 'Roll No',          width: 14 },
    { key: 'name',      header: 'Name',             width: 22 },
    { key: 'email',     header: 'Email',            width: 28 },
    { key: 'branch',    header: 'Branch',           width: 10 },
    { key: 'cgpa',      header: 'CGPA',             width: 8  },
    { key: 'backlogs',  header: 'Backlogs',         width: 10 },
    { key: 'gradYear',  header: 'Grad Year',        width: 12 },
    { key: 'status',    header: 'Stage',            width: 16 },
    { key: 'appliedAt', header: 'Applied At',       width: 14 },
    { key: 'placed',    header: 'Placement Status', width: 18 },
  ];
  styleHeader(ws1.addRow(ws1.columns.map((c) => c.header)));
  applications.forEach((app, i) => styleDataRow(ws1.addRow({
    rollNo: app.student?.rollNumber || '-', name: app.student?.user?.name || '-',
    email: app.student?.user?.email || '-', branch: app.student?.branch || '-',
    cgpa: app.student?.cgpa ?? '-', backlogs: app.student?.backlogs ?? '-',
    gradYear: app.student?.graduationYear || '-', status: app.status || '-',
    appliedAt: app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN') : '-',
    placed: app.student?.placementStatus || '-',
  }), i));

  if (funnel?.stages?.length) {
    const ws2 = workbook.addWorksheet('Funnel');
    addTitleRow(ws2, `${drive.title} — Recruitment Funnel`, 4);
    ws2.columns = [
      { key: 'stage',    header: 'Stage',              width: 24 },
      { key: 'count',    header: 'Candidates',         width: 14 },
      { key: 'fromPrev', header: 'Conversion (prev)',  width: 20 },
      { key: 'fromTop',  header: 'Conversion (total)', width: 20 },
    ];
    styleHeader(ws2.addRow(ws2.columns.map((c) => c.header)));
    funnel.stages.forEach((s, i) => styleDataRow(ws2.addRow({
      stage: s.label, count: s.count,
      fromPrev: `${s.conversionFromPrev}%`, fromTop: `${s.conversionFromTop}%`,
    }), i));
  }

  return workbook.xlsx.writeBuffer();
};

// ── Offer Report ───────────────────────────────────────────────

const generateOfferReportExcel = async ({ offers, title }) => {
  const workbook   = new ExcelJS.Workbook();
  workbook.creator = 'PlacementOS';

  const ws = workbook.addWorksheet('Offers');
  addTitleRow(ws, title || 'Offer Letters Report', 8);
  ws.columns = [
    { key: 'student',    header: 'Student Name',   width: 22 },
    { key: 'email',      header: 'Email',          width: 28 },
    { key: 'branch',     header: 'Branch',         width: 10 },
    { key: 'company',    header: 'Company',        width: 22 },
    { key: 'drive',      header: 'Drive',          width: 24 },
    { key: 'ctc',        header: 'CTC (LPA)',      width: 12 },
    { key: 'status',     header: 'Offer Status',   width: 14 },
    { key: 'respondedAt',header: 'Responded At',   width: 16 },
  ];
  styleHeader(ws.addRow(ws.columns.map((c) => c.header)));
  offers.forEach((o, i) => styleDataRow(ws.addRow({
    student: o.student?.user?.name || '-', email: o.student?.user?.email || '-',
    branch: o.student?.branch || '-', company: o.company?.name || '-',
    drive: o.drive?.title || '-', ctc: o.ctc || '-', status: o.status || '-',
    respondedAt: o.respondedAt ? new Date(o.respondedAt).toLocaleDateString('en-IN') : '-',
  }), i));

  return workbook.xlsx.writeBuffer();
};

// ── Custom Report — field-selected Excel ───────────────────────

/**
 * generateCustomReportExcel({ rows, selectedFields, title })
 *
 * rows:           array of application/student/offer plain objects
 * selectedFields: array of field keys from ALL_FIELDS
 * title:          report title string
 */
const generateCustomReportExcel = async ({ rows, selectedFields, title }) => {
  // validate + resolve fields — fall back to defaults for unknown keys
  const fields = (selectedFields || [])
    .filter((f) => ALL_FIELDS[f])
    .map((f) => ({ key: f, ...ALL_FIELDS[f] }));

  if (fields.length === 0) {
    // use all fields if none selected
    Object.entries(ALL_FIELDS).forEach(([key, def]) => fields.push({ key, ...def }));
  }

  const workbook   = new ExcelJS.Workbook();
  workbook.creator = 'PlacementOS';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Report');
  addTitleRow(ws, title, fields.length);

  ws.columns = fields.map((f) => ({
    key:    f.key,
    header: f.header,
    width:  f.width,
  }));

  const headerRow = ws.addRow(fields.map((f) => f.header));
  styleHeader(headerRow);

  rows.forEach((row, i) => {
    const rowData = {};
    fields.forEach((f) => { rowData[f.key] = f.path(row); });
    styleDataRow(ws.addRow(rowData), i);
  });

  // auto-filter on header row (row index 2 — after title row)
  ws.autoFilter = {
    from: { row: 2, column: 1 },
    to:   { row: 2, column: fields.length },
  };

  return workbook.xlsx.writeBuffer();
};

// ── PDF: placement summary ─────────────────────────────────────

const generatePlacementSummaryPDF = ({ tpoData, year }) =>
  new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  (c) => chunks.push(c));
    doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const overview    = tpoData?.overview    || {};
    const packages    = tpoData?.packages    || {};
    const branchStats = tpoData?.branchStats || [];

    doc.fontSize(20).fillColor('#1E3A5F')
      .text('PlacementOS', { align: 'center' }).moveDown(0.3);
    doc.fontSize(14).fillColor('#374151')
      .text(
        `Placement Summary Report${year && year !== 'all' ? ` — ${year}` : ''}`,
        { align: 'center' }
      ).moveDown(0.2);
    doc.fontSize(10).fillColor('#6B7280')
      .text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' })
      .moveDown(1.5);

    doc.fontSize(13).fillColor('#1E3A5F').text('Overview', { underline: true }).moveDown(0.5);
    [
      ['Total Students',        overview.totalStudents       || 0],
      ['Placed',                overview.placedStudents      || 0],
      ['Dream Placed',          overview.dreamPlacedStudents || 0],
      ['Unplaced',              overview.unplacedStudents    || 0],
      ['Placement %',           `${overview.placementPercent || 0}%`],
      ['Offer Acceptance Rate', `${tpoData?.offerAcceptanceRate || 0}%`],
    ].forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#374151')
        .text(`${label}:`, { continued: true, width: 200 });
      doc.fillColor('#111827').text(` ${value}`);
    });

    doc.moveDown(1);
    doc.fontSize(13).fillColor('#1E3A5F')
      .text('Package Statistics (LPA)', { underline: true }).moveDown(0.5);
    [
      ['Highest', packages.max     || 0],
      ['Average', packages.average || 0],
      ['Median',  packages.median  || 0],
      ['Lowest',  packages.min     || 0],
    ].forEach(([label, value]) => {
      doc.fontSize(10).fillColor('#374151')
        .text(`${label}:`, { continued: true, width: 200 });
      doc.fillColor('#059669').text(` ₹${value} LPA`);
    });

    if (branchStats.length > 0) {
      doc.moveDown(1);
      doc.fontSize(13).fillColor('#1E3A5F')
        .text('Branch-wise Breakdown', { underline: true }).moveDown(0.5);
      branchStats.forEach((b) => {
        doc.fontSize(10).fillColor('#374151')
          .text(
            `${b.branch}: ${b.placed}/${b.total} placed (${b.placementPercent}%)`,
            { indent: 10 }
          );
      });
    }

    doc.end();
  });

// ── exports ───────────────────────────────────────────────────

module.exports = {
  generatePlacementSummaryExcel,
  generateDriveReportExcel,
  generateOfferReportExcel,
  generateCustomReportExcel,
  generatePlacementSummaryPDF,
  ALL_FIELDS,
  DEFAULT_FIELDS,
};