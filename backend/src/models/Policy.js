const mongoose = require("mongoose");

const policySchema = new mongoose.Schema(
  {
    // there is exactly ONE policy document — singleton pattern
    // enforced via a fixed key field
    key: {
      type: String,
      default: "global",
      unique: true,
      immutable: true,
    },

    // ── Core placement rules ──────────────────────────────────
    oneOfferPolicy: {
      type: Boolean,
      default: true,
      // if true: students cannot apply to non-dream drives after accepting an offer
    },

    dreamPackageLPA: {
      type: Number,
      default: 10,
      min: 0,
      // drives with max CTC >= this value are "dream company" drives
      // placed students can still apply to dream drives even with oneOfferPolicy ON
    },

    maxActiveApplications: {
      type: Number,
      default: 0,
      min: 0,
      // 0 = unlimited; >0 = max simultaneous open applications per student
    },

    maxApplicationsPerWeek: {
      type: Number,
      default: 0,
      min: 0,
      // 0 = unlimited; >0 = max applications in a 7-day rolling window
    },

    // ── Offer response rules ──────────────────────────────────
    offerResponseWindowDays: {
      type: Number,
      default: 3,
      min: 1,
      // how many days a student has to accept/reject after offer is verified
    },

    // ── Profile completeness gate ─────────────────────────────
    requireCompleteProfile: {
      type: Boolean,
      default: false,
      // if true: student must have CGPA, branch, year, resume before applying
    },

    minProfileScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      // 0 = no minimum; student's resume score must be >= this to apply
    },

    // ── Who last changed this and when ────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// ── static helper: get-or-create the singleton ───────────────
policySchema.statics.getPolicy = async function () {
  let policy = await this.findOne({ key: "global" });
  if (!policy) {
    policy = await this.create({ key: "global" });
    console.log("[Policy] Singleton document created with defaults");
  }
  return policy;
};

module.exports = mongoose.model("Policy", policySchema);
