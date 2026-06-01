const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['aptitude', 'coding', 'technical', 'hr', 'group_discussion', 'presentation', 'other'],
    required: true,
  },
  description: String,
  scheduledAt: Date,
  durationMinutes: Number,
  venue: String,
  isOnline: { type: Boolean, default: false },
});

const eligibilitySchema = new mongoose.Schema({
  minCGPA: { type: Number, default: 0, min: 0, max: 10 },
  maxBacklogs: { type: Number, default: 0, min: 0 },
  allowedBranches: {
    type: [String],
    enum: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'],
    default: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'Other'],
  },
  graduationYear: [Number],   // empty = all years allowed
  genderRestriction: {
    type: String,
    enum: ['any', 'male', 'female'],
    default: 'any',
  },
});

const settingsSchema = new mongoose.Schema({
  allowLateApplications: { type: Boolean, default: false },
  gracePeriodHours: { type: Number, default: 0 },
  oneOfferPolicy: { type: Boolean, default: true },
  dreamPackageLPA: { type: Number, default: 0 },
  // if CTC >= dreamPackageLPA, treated as dream company
  // students with a placed status can still apply to dream companies
  autoShortlist: { type: Boolean, default: false },
  notifyOnStatusChange: { type: Boolean, default: true },
});

const driveSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    roles: [
      {
        title: { type: String, required: true, trim: true },
        ctc: { type: Number, required: true },        // in LPA
        description: String,
        openings: { type: Number, default: 1 },
      },
    ],
    location: {
      type: String,
      trim: true,
    },
    mode: {
      type: String,
      enum: ['oncampus', 'offcampus', 'hybrid'],
      default: 'oncampus',
    },
    eligibility: {
      type: eligibilitySchema,
      default: () => ({}),
    },
    rounds: [roundSchema],
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
    jd: {
      cloudinaryUrl: String,
      publicId: String,
    },
    applicationDeadline: {
      type: Date,
      required: true,
    },
    driveDate: Date,
    status: {
      type: String,
      enum: ['draft', 'published', 'open', 'closed', 'completed'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // stats — auto-updated
    totalApplications: { type: Number, default: 0 },
    totalShortlisted: { type: Number, default: 0 },
    totalOffers: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// index for common queries
driveSchema.index({ status: 1 });
driveSchema.index({ company: 1 });
driveSchema.index({ applicationDeadline: 1 });
driveSchema.index({ 'eligibility.allowedBranches': 1 });

module.exports = mongoose.model('Drive', driveSchema);