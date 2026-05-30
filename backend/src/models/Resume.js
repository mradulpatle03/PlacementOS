const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    label: {
      type: String,
      trim: true,
      default: "Resume",
      maxlength: 50,
    },
    cloudinaryUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    fileSize: Number, // in bytes
    isPrimary: {
      type: Boolean,
      default: false,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      enum: ["A", "B", "C", "D"],
    },
    scoreSuggestions: [String],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Resume", resumeSchema);
