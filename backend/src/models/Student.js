const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  techStack: [String],
  link: String,
});

const resumeRefSchema = new mongoose.Schema({
  label: String,          // e.g. "General", "SDE Focus"
  cloudinaryUrl: String,
  publicId: String,
  isPrimary: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
});

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    rollNumber: {
      type: String,
      unique: true,
      sparse: true,       // allows multiple nulls
      trim: true,
    },
    branch: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'],
    },
    graduationYear: {
      type: Number,
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
    },
    backlogs: {
      type: Number,
      default: 0,
      min: 0,
    },
    skills: [String],
    projects: [projectSchema],
    resumes: [resumeRefSchema],
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
    },
    placementStatus: {
      type: String,
      enum: ['unplaced', 'placed', 'dream_placed'],
      default: 'unplaced',
    },
    // populated as drives progress
    offeredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);