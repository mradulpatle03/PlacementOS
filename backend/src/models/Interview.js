const mongoose = require('mongoose');

// Panel member (one interviewer in the panel)
const panelMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name:  { type: String, default: '' },
  email: { type: String, default: '' },
  role:  { type: String, default: 'interviewer' }, // e.g. 'hiring manager', 'tech lead'
}, { _id: false });

// Main Interview schema 
const interviewSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },

    // which pipeline round this interview is for
    round: {
      type: String,
      enum: ['interview_1', 'interview_2', 'hr'],
      required: true,
    },

    // scheduling
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 45, min: 5 },

    // location / mode
    mode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'online',
    },
    venue:       { type: String, trim: true, default: '' }, // offline venue
    meetingLink: { type: String, trim: true, default: '' }, // online link

    // panel
    panel: { type: [panelMemberSchema], default: [] },

    // result — filled after the interview
    result: {
      type: String,
      enum: ['pending', 'pass', 'fail', 'no_show'],
      default: 'pending',
    },
    feedback:  { type: String, default: '' },
    ratingOutOf10: { type: Number, min: 0, max: 10, default: null },

    // status
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'cancelled', 'completed'],
      default: 'scheduled',
    },

    // reminders — track whether they were sent
    reminders: {
      sent24h: { type: Boolean, default: false },
      sent1h:  { type: Boolean, default: false },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// indexes
interviewSchema.index({ drive: 1, round: 1 });
interviewSchema.index({ student: 1, status: 1 });
interviewSchema.index({ application: 1 });
interviewSchema.index({ scheduledAt: 1 });  // for reminder jobs

module.exports = mongoose.model('Interview', interviewSchema);