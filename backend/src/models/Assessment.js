const mongoose = require('mongoose');

// MCQ option
const optionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

// Test case for coding questions
const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },   // hidden from student
}, { _id: false });

// Single question (MCQ or Coding)
const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'coding'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  // MCQ only
  options: [optionSchema],

  // Coding only
  starterCode: { type: String, default: '' },
  testCases: [testCaseSchema],
  allowedLanguages: {
    type: [String],
    default: ['python', 'javascript', 'java', 'cpp', 'c'],
  },

  marks: { type: Number, default: 1, min: 0 },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
  order: { type: Number, default: 0 }, // for display order
});

// Assessment settings
const assessmentSettingsSchema = new mongoose.Schema({
  shuffleQuestions: { type: Boolean, default: false },
  shuffleOptions: { type: Boolean, default: false },    // MCQ only
  showResultAfterSubmit: { type: Boolean, default: false },
  allowTabSwitch: { type: Boolean, default: false },
  maxTabSwitches: { type: Number, default: 3 },         // auto-submit after N
  requireFullscreen: { type: Boolean, default: true },
  copyPasteDisabled: { type: Boolean, default: true },
}, { _id: false });

// Main Assessment schema
const assessmentSchema = new mongoose.Schema(
  {
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Drive',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    questions: [questionSchema],

    settings: {
      type: assessmentSettingsSchema,
      default: () => ({}),
    },

    // window during which students can start
    startsAt: { type: Date },
    endsAt: { type: Date },

    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // computed
    totalMarks: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// auto-compute totals before save
assessmentSchema.pre('save', function () {
  this.totalQuestions = this.questions.length;
  this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
});

assessmentSchema.index({ drive: 1 });
assessmentSchema.index({ status: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);