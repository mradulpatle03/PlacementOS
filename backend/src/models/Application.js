const mongoose = require('mongoose');

// Full 9-stage pipeline (Day 39 expansion)
// NOTE: 'interview' and 'selected' kept for backward compat with existing tests
const ALL_STATUSES = [
  'applied',
  'shortlisted',
  'oa',
  'interview_1',
  'interview_2',
  'hr',
  'offered',
  'accepted',
  // legacy aliases kept so existing tests don't break
  'interview',
  'selected',
  // exit statuses
  'rejected',
  'withdrawn',
];

const stageHistorySchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ALL_STATUSES,
      required: true,
    },
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    movedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },

    // current pipeline stage
    status: {
      type: String,
      enum: ALL_STATUSES,
      default: 'applied',
    },

    // full audit trail — every stage move is recorded here
    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },

    // stage at which rejection / withdrawal happened
    stageAtExit: {
      type: String,
      default: null,
    },

    // TPO / recruiter remarks
    remarks: {
      type: String,
      default: '',
      maxlength: 1000,
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    withdrawnAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// indexes
applicationSchema.index({ student: 1, drive: 1 }, { unique: true });
applicationSchema.index({ drive: 1, status: 1 });
applicationSchema.index({ student: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;