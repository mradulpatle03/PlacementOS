const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  techStack: [{ type: String, trim: true }],
  link: { type: String, trim: true },
});

const resumeRefSchema = new mongoose.Schema({
  label: { type: String, trim: true, default: 'Resume' },
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
      sparse: true,
      trim: true,
    },
    branch: {
      type: String,
      enum: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'],
    },
    graduationYear: {
      type: Number,
      min: 2000,
      max: 2100,
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
    skills: [{ type: String, trim: true }],
    projects: [projectSchema],
    resumes: [resumeRefSchema],
    socialLinks: {
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
    placementStatus: {
      type: String,
      enum: ['unplaced', 'placed', 'dream_placed'],
      default: 'unplaced',
    },
    offeredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);