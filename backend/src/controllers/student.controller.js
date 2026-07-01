const Student = require('../models/Student');
const User = require('../models/User');
const { createError } = require('../middlewares/errorHandler');

// GET /api/v1/students/me
// student sees their own profile
const getMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id }).populate('user', 'name email');
    if (!student) return next(createError('Student profile not found', 404));
    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/students/me
// student updates their own profile (basic info)
const updateMyProfile = async (req, res, next) => {
  try {
    const student = await Student.findOneAndUpdate(
      { user: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    if (!student) return next(createError('Student profile not found', 404));
    console.log(`Student profile updated: ${req.user.email}`);
    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/students/me/projects
// add a project
const addProject = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError('Student profile not found', 404));

    if (student.projects.length >= 10) {
      return next(createError('Maximum 10 projects allowed', 400));
    }

    student.projects.push(req.body);
    await student.save();
    console.log(`Project added for: ${req.user.email}`);
    res.status(201).json({ success: true, projects: student.projects });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/students/me/projects/:projectId
// update a specific project
const updateProject = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError('Student profile not found', 404));

    const project = student.projects.id(req.params.projectId);
    if (!project) return next(createError('Project not found', 404));

    Object.assign(project, req.body);
    await student.save();
    res.json({ success: true, projects: student.projects });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/students/me/projects/:projectId
const deleteProject = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError('Student profile not found', 404));

    const project = student.projects.id(req.params.projectId);
    if (!project) return next(createError('Project not found', 404));

    project.deleteOne();
    await student.save();
    console.log(`Project deleted for: ${req.user.email}`);
    res.json({ success: true, projects: student.projects });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/students/me/skills
// replace skills array
const updateSkills = async (req, res, next) => {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      return next(createError('skills must be an array', 400));
    }

    const student = await Student.findOneAndUpdate(
      { user: req.user._id },
      { $set: { skills } },
      { new: true }
    );
    if (!student) return next(createError('Student profile not found', 404));
    res.json({ success: true, skills: student.skills });
  } catch (err) {
    next(err);
  }
};

// TPO / Admin endpoints

// GET /api/v1/students
// TPO/admin gets all students with optional filters
const getAllStudents = async (req, res, next) => {
  try {
    const {
      branch, graduationYear, placementStatus, search,
      page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (branch) filter.branch = branch;
    if (graduationYear) filter.graduationYear = Number(graduationYear);
    if (placementStatus) filter.placementStatus = placementStatus;

    // search by name/email (via User) or roll number (on Student itself)
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [{ name: regex }, { email: regex }],
      }).select('_id');
      filter.$or = [
        { rollNumber: regex },
        { user: { $in: matchingUsers.map((u) => u._id) } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [students, total] = await Promise.all([
      Student.find(filter)
        .populate('user', 'name email isActive')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Student.countDocuments(filter),
    ]);

    res.json({
      success: true,
      students,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/students/:id
// TPO/admin gets a specific student
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', 'name email isActive')
      .populate('offeredBy', 'name logo sector');
    if (!student) return next(createError('Student not found', 404));
    res.json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/students/me/completeness
const getProfileCompleteness = async (req, res, next) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError('Student profile not found', 404));

    const checks = [
      { field: 'rollNumber',      label: 'Roll Number',        done: !!student.rollNumber },
      { field: 'branch',          label: 'Branch',             done: !!student.branch },
      { field: 'graduationYear',  label: 'Graduation Year',    done: !!student.graduationYear },
      { field: 'cgpa',            label: 'CGPA',               done: !!student.cgpa },
      { field: 'backlogs',        label: 'Backlogs',           done: student.backlogs !== undefined },
      { field: 'skills',          label: 'Skills (min 3)',     done: student.skills.length >= 3 },
      { field: 'projects',        label: 'Projects (min 1)',   done: student.projects.length >= 1 },
      { field: 'linkedin',        label: 'LinkedIn',           done: !!student.socialLinks?.linkedin },
      { field: 'github',          label: 'GitHub',             done: !!student.socialLinks?.github },
      { field: 'resume',          label: 'Resume uploaded',    done: false }, // checked separately
    ];

    // check if at least one resume exists
    const Resume = require('../models/Resume');
    const resumeCount = await Resume.countDocuments({ user: req.user._id });
    checks.find((c) => c.field === 'resume').done = resumeCount > 0;

    const completed = checks.filter((c) => c.done).length;
    const percent = Math.round((completed / checks.length) * 100);

    res.json({
      success: true,
      percent,
      completed,
      total: checks.length,
      checks,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  addProject,
  updateProject,
  deleteProject,
  updateSkills,
  getAllStudents,
  getStudentById,
  getProfileCompleteness,
};