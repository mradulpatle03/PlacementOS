const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    logo: {
      cloudinaryUrl: String,
      publicId: String,
    },
    sector: {
      type: String,
      trim: true,
      enum: [
        "Technology",
        "Finance",
        "Consulting",
        "Manufacturing",
        "Healthcare",
        "E-commerce",
        "Automobile",
        "Education",
        "Media",
        "Government",
        "Other",
      ],
    },
    location: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    packageRange: {
      min: { type: Number, min: 0 }, // in LPA
      max: { type: Number, min: 0 },
    },
    // auto-populated as drives are created
    totalDrives: { type: Number, default: 0 },
    totalOffers: { type: Number, default: 0 },
    // recruiters linked to this company
    recruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Company", companySchema);
