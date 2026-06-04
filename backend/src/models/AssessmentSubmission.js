const mongoose = require('mongoose');

// Per-question answer
const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  questionType: {
    type: String,
    enum: ['mcq', 'coding'],
    required: true,
  },

  // MCQ — index of chosen option
  selectedOptionIndex: { type: Number, default: null },

  // Coding — submitted source code
  code: { type: String, default: '' },
  language: { type: String, default: '' },

  // Grading — filled after auto-grade / manual review
  isCorrect: { type: Boolean, default: null },  // null = pending
  marksAwarded: { type: Number, default: 0 },

  // Judge0 / Piston result
  judgeResult: {
    status: { type: String, default: '' },       // "Accepted", "Wrong Answer", etc.
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    time: { type: Number, default: 0 },          // execution time ms
    memory: { type: Number, default: 0 },        // KB
    passedTestCases: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
  },
}, { _id: false });

// Anti-cheat log
const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['tab_switch', 'fullscreen_exit', 'copy_paste', 'focus_lost'],
    required: true,
  },
  at: { type: Date, default: Date.now },
}, { _id: false });

// Main Submission schema
const submissionSchema = new mongoose.Schema(
  {
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
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

    answers: [answerSchema],

    // anti-cheat
    violations: [violationSchema],
    violationCount: { type: Number, default: 0 },
    autoSubmitted: { type: Boolean, default: false },  // true if time ran out or N violations

    // timing
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    timeTakenSeconds: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'graded'],
      default: 'in_progress',
    },

    // scoring — filled after grading
    totalMarksAwarded: { type: Number, default: 0 },
    totalMarksPossible: { type: Number, default: 0 },
    percentageScore: { type: Number, default: 0 },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// one submission per student per assessment
submissionSchema.index({ assessment: 1, student: 1 }, { unique: true });
submissionSchema.index({ drive: 1, status: 1 });

module.exports = mongoose.model('AssessmentSubmission', submissionSchema);