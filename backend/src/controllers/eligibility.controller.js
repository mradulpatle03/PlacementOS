// Day 32 — Eligibility Controller
const Student = require('../models/Student');
const Drive = require('../models/Drive');
const { checkEligibility } = require('../services/eligibility.service');
const AppError = require('../utils/AppError');

// GET /drives/:id/check-eligibility
// Student checks their own eligibility for a drive
const checkMyEligibility = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id).lean();
    if (!drive) return next(new AppError('Drive not found', 404));

    const student = await Student.findOne({ user: req.user._id }).lean();
    if (!student) return next(new AppError('Student profile not found', 404));

    const result = checkEligibility(student, drive);

    res.status(200).json({
      success: true,
      data: {
        driveId: drive._id,
        driveTitle: drive.title,
        ...result,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /drives/:id/eligible-students
// TPO sees full list of eligible + ineligible students for a drive
const getEligibleStudents = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id).lean();
    if (!drive) return next(new AppError('Drive not found', 404));

    // fetch all students with their user info (name, email, gender)
    const students = await Student.find({})
      .populate('user', 'name email gender')
      .lean();

    const eligible = [];
    const ineligible = [];

    for (const student of students) {
      // attach gender from user onto student so eligibility engine can read it
      const studentWithGender = {
        ...student,
        gender: student.user?.gender,
      };

      const result = checkEligibility(studentWithGender, drive);

      const entry = {
        studentId: student._id,
        userId: student.user?._id,
        name: student.user?.name,
        email: student.user?.email,
        branch: student.branch,
        cgpa: student.cgpa,
        backlogs: student.backlogs ?? 0,
        graduationYear: student.graduationYear,
        rollNumber: student.rollNumber,
        placementStatus: student.placementStatus,
        reasons: result.reasons,
        warnings: result.warnings,
      };

      if (result.eligible) {
        eligible.push(entry);
      } else {
        ineligible.push(entry);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        driveId: drive._id,
        driveTitle: drive.title,
        summary: {
          total: students.length,
          eligible: eligible.length,
          ineligible: ineligible.length,
        },
        eligible,
        ineligible,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /drives/:id/eligible-students/export
// TPO exports eligible students list as Excel
const exportEligibleStudents = async (req, res, next) => {
  try {
    const drive = await Drive.findById(req.params.id).lean();
    if (!drive) return next(new AppError('Drive not found', 404));

    const students = await Student.find({})
      .populate('user', 'name email gender')
      .lean();

    const rows = [];

    for (const student of students) {
      const studentWithGender = { ...student, gender: student.user?.gender };
      const result = checkEligibility(studentWithGender, drive);

      rows.push({
        Name: student.user?.name || '',
        Email: student.user?.email || '',
        'Roll Number': student.rollNumber || '',
        Branch: student.branch || '',
        CGPA: student.cgpa ?? '',
        Backlogs: student.backlogs ?? 0,
        'Graduation Year': student.graduationYear || '',
        'Placement Status': student.placementStatus || '',
        Eligible: result.eligible ? 'Yes' : 'No',
        'Ineligibility Reasons': result.reasons.join('; '),
        Warnings: result.warnings.join('; '),
      });
    }

    // build Excel using ExcelJS (already in your backend deps)
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Eligible Students');

    // header row
    const headers = Object.keys(rows[0] || {});
    sheet.addRow(headers);

    // style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }, // indigo
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // column widths
    sheet.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(h.length + 4, 18),
    }));

    // data rows with alternate row shading + colour for eligible column
    rows.forEach((row, i) => {
      const dataRow = sheet.addRow(Object.values(row));
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF' },
      };

      // colour the Eligible cell
      const eligibleCellIndex = headers.indexOf('Eligible') + 1;
      const cell = dataRow.getCell(eligibleCellIndex);
      cell.font = {
        bold: true,
        color: { argb: row['Eligible'] === 'Yes' ? 'FF16A34A' : 'FFDC2626' },
      };
    });

    // freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // stream to response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="eligible_students_${drive._id}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkMyEligibility, getEligibleStudents, exportEligibleStudents };