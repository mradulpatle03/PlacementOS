const mongoose = require('mongoose');

// tracks year-wise hiring data per company — auto-populated as drives complete
const hiringHistorySchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    totalOffers: { type: Number, default: 0 },
    totalHired: { type: Number, default: 0 },  // accepted offers
    averagePackage: { type: Number, default: 0 },
    highestPackage: { type: Number, default: 0 },
    rolesOffered: [String],
    driveCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// one record per company per year
hiringHistorySchema.index({ company: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('HiringHistory', hiringHistorySchema);