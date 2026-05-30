const axios = require('axios');
const Resume = require("../models/Resume");
const Student = require("../models/Student");
const { createError } = require("../middlewares/errorHandler");
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");
const {
  extractTextFromBuffer,
  extractTextFromUrl,
} = require("../utils/extractPdfText");
const { scoreResume } = require("../services/resumeScore.service");

const MAX_RESUMES = 5;

// POST /api/v1/resumes/upload
const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) return next(createError("No file uploaded", 400));

    const student = await Student.findOne({ user: req.user._id });
    if (!student) return next(createError("Student profile not found", 404));

    // check resume count limit
    const existingCount = await Resume.countDocuments({ user: req.user._id });
    if (existingCount >= MAX_RESUMES) {
      return next(
        createError(
          `Maximum ${MAX_RESUMES} resumes allowed. Delete one first.`,
          400,
        ),
      );
    }

    const { label, isPrimary } = req.body;

    // upload buffer to cloudinary
    const result = await uploadBufferToCloudinary(req.file.buffer, {
      folder: `placementos/resumes/${req.user._id}`,
      resource_type: "raw", // PDF is a raw resource in cloudinary
      public_id: `resume_${Date.now()}`,
      format: "pdf",
    });

    console.log(`Resume uploaded to Cloudinary: ${result.public_id}`);

    // if this is set as primary, unset all others first
    if (isPrimary) {
      await Resume.updateMany(
        { user: req.user._id },
        { $set: { isPrimary: false } },
      );
    }

    const resume = await Resume.create({
      student: student._id,
      user: req.user._id,
      label,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
      fileSize: req.file.size,
      isPrimary,
    });
    // score the resume in background — don't block response
    extractTextFromBuffer(req.file.buffer)
      .then((text) => {
        const result = scoreResume(text);
        console.log(
          `Resume score for ${req.user.email}: ${result.score}/100 [${result.grade}]`,
        );
        // store score on the resume document
        return Resume.findByIdAndUpdate(resume._id, {
          $set: {
            score: result.score,
            grade: result.grade,
            scoreSuggestions: result.suggestions,
          },
        });
      })
      .catch((err) => console.log("Resume scoring failed:", err.message));

    console.log(`Resume saved: ${resume._id} for user: ${req.user.email}`);

    res.status(201).json({ success: true, resume });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/resumes
// student gets all their resumes
const getMyResumes = async (req, res, next) => {
  try {
    const resumes = await Resume.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: resumes.length, resumes });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/resumes/:id
const deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!resume) return next(createError("Resume not found", 404));

    // delete from cloudinary first
    await deleteFromCloudinary(resume.publicId);

    await resume.deleteOne();
    console.log(`Resume deleted: ${req.params.id} for user: ${req.user.email}`);

    res.json({ success: true, message: "Resume deleted" });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/resumes/:id/primary
// set a resume as primary
const setPrimary = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!resume) return next(createError("Resume not found", 404));

    // unset all, then set this one
    await Resume.updateMany(
      { user: req.user._id },
      { $set: { isPrimary: false } },
    );
    resume.isPrimary = true;
    await resume.save();

    console.log(`Primary resume set: ${req.params.id} for: ${req.user.email}`);
    res.json({ success: true, message: "Primary resume updated", resume });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/resumes/:id/label
// rename a resume label
const updateLabel = async (req, res, next) => {
  try {
    const { label } = req.body;
    if (!label) return next(createError("Label is required", 400));

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { label } },
      { new: true },
    );
    if (!resume) return next(createError("Resume not found", 404));

    res.json({ success: true, resume });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/resumes/student/:studentId
// TPO/recruiter: view resumes of a specific student
const getStudentResumes = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) return next(createError("Student not found", 404));

    const resumes = await Resume.find({ student: req.params.studentId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: resumes.length, resumes });
  } catch (err) {
    next(err);
  }
};
// GET /api/v1/resumes/:id/score
// get score for a specific resume (re-computes if needed)
const getResumeScore = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    if (!resume) return next(createError('Resume not found', 404));

    // if score already computed return it
    if (resume.score !== undefined) {
      return res.json({
        success: true,
        score: resume.score,
        grade: resume.grade,
        suggestions: resume.scoreSuggestions,
      });
    }

    // re-compute from cloudinary URL
    const text = await extractTextFromUrl(resume.cloudinaryUrl);
    const result = scoreResume(text);

    // save it
    await Resume.findByIdAndUpdate(resume._id, {
      $set: {
        score: result.score,
        grade: result.grade,
        scoreSuggestions: result.suggestions,
      },
    });

    res.json({
      success: true,
      score: result.score,
      grade: result.grade,
      breakdown: result.breakdown,
      suggestions: result.suggestions,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/resumes/:id/preview
// streams the PDF back to client for in-browser preview
const previewResume = async (req, res, next) => {
  try {
    // allow student to preview own, TPO/recruiter to preview any
    let resume;
    if (req.user.role === 'student') {
      resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
    } else {
      resume = await Resume.findById(req.params.id);
    }

    if (!resume) return next(createError('Resume not found', 404));

    // fetch PDF from cloudinary and pipe it to client
    const response = await axios.get(resume.cloudinaryUrl, { responseType: 'stream' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${resume.label}.pdf"`);
    response.data.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadResume,
  getMyResumes,
  deleteResume,
  setPrimary,
  updateLabel,
  getStudentResumes,
  getResumeScore,
  previewResume,
};
