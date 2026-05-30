const mongoose = require('mongoose');

const recruiterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    designation: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    linkedinProfile: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
    rejectionReason: String,   // if TPO rejects verification
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recruiter', recruiterSchema);