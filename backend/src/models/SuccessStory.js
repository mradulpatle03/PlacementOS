const mongoose = require("mongoose");

const successStorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null, // optional — story can also be manually entered by TPO
    },

    studentName: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, default: "" },
    graduationYear: { type: Number, default: null },

    companyName: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    ctc: { type: Number, default: null }, // LPA

    photoUrl: { type: String, default: null }, // Cloudinary URL
    photoPublicId: { type: String, default: null },

    testimonial: { type: String, required: true, trim: true, maxlength: 1000 },

    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false }, // show on homepage hero

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

successStorySchema.index({ isPublished: 1, isFeatured: 1, createdAt: -1 });

module.exports = mongoose.model("SuccessStory", successStorySchema);
