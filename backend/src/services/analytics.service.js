const mongoose = require("mongoose");
const Application = require("../models/Application");
const Student = require("../models/Student");
const Drive = require("../models/Drive");
const Company = require("../models/Company");

// ── helpers ───────────────────────────────────────────────────

/**
 * Compute median from a sorted numeric array.
 */
const median = (sortedArr) => {
  if (!sortedArr || sortedArr.length === 0) return 0;
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 !== 0
    ? sortedArr[mid]
    : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
};

/**
 * Parse an optional year filter into a Date range.
 * yearFilter: 'all' | '2024' | '2025' …
 */
const yearDateRange = (yearFilter) => {
  if (!yearFilter || yearFilter === "all") return {};
  const y = Number(yearFilter);
  if (isNaN(y)) return {};
  return {
    $gte: new Date(`${y}-01-01`),
    $lte: new Date(`${y}-12-31T23:59:59`),
  };
};

const getDriveIdsByYear = async (year) => {
  const dateRange = yearDateRange(year);

  if (Object.keys(dateRange).length === 0) return null;

  const drives = await Drive.find({
    createdAt: dateRange,
  })
    .select("_id")
    .lean();

  return drives.map((d) => d._id);
};

// ── TPO dashboard analytics ───────────────────────────────────

/**
 * getTPOAnalytics({ year })
 *
 * Returns:
 *  - totalStudents, placedStudents, dreamPlacedStudents, placementPercent
 *  - packages: { min, max, median, average }
 *  - branchStats[]  — per-branch breakdown
 *  - topCompanies[] — by offers given
 *  - driveStats     — total drives by status
 *  - offerAcceptanceRate
 */
const getTPOAnalytics = async ({ year } = {}) => {
  // const dateRange = yearDateRange(year);
  const driveIds = await getDriveIdsByYear(year);

  const applicationFilter = {};

  if (driveIds) {
    applicationFilter.drive = {
      $in: driveIds,
    };
  }

  // ── 1. Student placement stats ─────────────────────────────
  const studentStats = await Student.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        placed: {
          $sum: { $cond: [{ $eq: ["$placementStatus", "placed"] }, 1, 0] },
        },
        dreamPlaced: {
          $sum: {
            $cond: [{ $eq: ["$placementStatus", "dream_placed"] }, 1, 0],
          },
        },
        unplaced: {
          $sum: { $cond: [{ $eq: ["$placementStatus", "unplaced"] }, 1, 0] },
        },
      },
    },
  ]);

  const totalStudents = studentStats[0]?.total || 0;
  const placedStudents =
    (studentStats[0]?.placed || 0) + (studentStats[0]?.dreamPlaced || 0);
  const dreamPlacedStudents = studentStats[0]?.dreamPlaced || 0;
  const placementPercent =
    totalStudents > 0
      ? Math.round((placedStudents / totalStudents) * 100 * 10) / 10
      : 0;

  // ── 2. Package stats from accepted applications ────────────
  // We get CTC from Drive.roles — join via application → drive
  const acceptedApps = await Application.aggregate([
    { $match: { status: "accepted", ...applicationFilter } },
    {
      $lookup: {
        from: "drives",
        localField: "drive",
        foreignField: "_id",
        as: "driveData",
      },
    },
    { $unwind: "$driveData" },
    { $unwind: "$driveData.roles" },
    {
      $group: {
        _id: "$_id", // deduplicate per application
        maxCTC: { $max: "$driveData.roles.ctc" },
      },
    },
    { $sort: { maxCTC: 1 } },
  ]);

  const ctcList = acceptedApps
    .map((a) => a.maxCTC)
    .filter(Boolean)
    .sort((a, b) => a - b);
  const packages = {
    min: ctcList.length ? ctcList[0] : 0,
    max: ctcList.length ? ctcList[ctcList.length - 1] : 0,
    median: median(ctcList),
    average: ctcList.length
      ? Math.round((ctcList.reduce((s, v) => s + v, 0) / ctcList.length) * 10) /
        10
      : 0,
    count: ctcList.length,
  };

  // ── 3. Branch-wise breakdown ───────────────────────────────
  const branchAgg = await Student.aggregate([
    {
      $group: {
        _id: "$branch",
        total: { $sum: 1 },
        placed: {
          $sum: {
            $cond: [
              { $in: ["$placementStatus", ["placed", "dream_placed"]] },
              1,
              0,
            ],
          },
        },
        dreamPlaced: {
          $sum: {
            $cond: [{ $eq: ["$placementStatus", "dream_placed"] }, 1, 0],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const branchStats = branchAgg
    .filter((b) => b._id)
    .map((b) => ({
      branch: b._id,
      total: b.total,
      placed: b.placed,
      dreamPlaced: b.dreamPlaced,
      unplaced: b.total - b.placed,
      placementPercent:
        b.total > 0 ? Math.round((b.placed / b.total) * 100 * 10) / 10 : 0,
    }));

  // ── 4. Top companies by offers ─────────────────────────────
  const topCompaniesAgg = await Application.aggregate([
    {
      $match: {
        status: { $in: ["offered", "accepted"] },
        ...applicationFilter,
      },
    },
    {
      $lookup: {
        from: "drives",
        localField: "drive",
        foreignField: "_id",
        as: "driveData",
      },
    },
    { $unwind: "$driveData" },
    {
      $lookup: {
        from: "companies",
        localField: "driveData.company",
        foreignField: "_id",
        as: "companyData",
      },
    },
    { $unwind: "$companyData" },
    {
      $group: {
        _id: "$companyData._id",
        name: { $first: "$companyData.name" },
        logo: { $first: "$companyData.logo" },
        offers: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
      },
    },
    { $sort: { offers: -1 } },
    { $limit: 10 },
  ]);

  // ── 5. Drive stats by status ───────────────────────────────
  const driveStatusAgg = await Drive.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const driveStats = driveStatusAgg.reduce((acc, d) => {
    acc[d._id] = d.count;
    return acc;
  }, {});
  driveStats.total = driveStatusAgg.reduce((s, d) => s + d.count, 0);

  // ── 6. Offer acceptance rate ───────────────────────────────
  const [offeredCount, acceptedCount] = await Promise.all([
    Application.countDocuments({
      status: { $in: ["offered", "accepted", "rejected"] },
      ...applicationFilter,
    }),
    Application.countDocuments({ status: "accepted" }),
  ]);

  const offerAcceptanceRate =
    offeredCount > 0
      ? Math.round((acceptedCount / offeredCount) * 100 * 10) / 10
      : 0;

  return {
    overview: {
      totalStudents,
      placedStudents,
      dreamPlacedStudents,
      unplacedStudents: totalStudents - placedStudents,
      placementPercent,
    },
    packages,
    branchStats,
    topCompanies: topCompaniesAgg,
    driveStats,
    offerAcceptanceRate,
  };
};

// ── Branch-specific analytics ─────────────────────────────────

/**
 * getBranchAnalytics({ branch, year })
 */
const getBranchAnalytics = async ({ branch, year } = {}) => {
  if (!branch) throw new Error("branch is required");

  // Get all students in this branch
  const studentIds = await Student.find({ branch }).select("_id").lean();

  const ids = studentIds.map((s) => s._id);

  // Year-specific drive filter
  const driveIds = await getDriveIdsByYear(year);

  const applicationFilter = {
    student: { $in: ids },
  };

  if (driveIds) {
    applicationFilter.drive = {
      $in: driveIds,
    };
  }

  // Branch overview stats
  const branchStudents = await Student.aggregate([
    {
      $match: { branch },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgCGPA: { $avg: "$cgpa" },
      },
    },
  ]);

  // Placement stats (year filtered)
  const placementStats = await Application.aggregate([
    {
      $match: {
        ...applicationFilter,
        status: {
          $in: ["accepted"],
        },
      },
    },
    {
      $group: {
        _id: "$student",
      },
    },
  ]);

  const total = branchStudents[0]?.total || 0;
  const placed = placementStats.length;
  const dreamPlaced = 0; // adjust if dream placement logic exists
  const avgCGPA = Math.round((branchStudents[0]?.avgCGPA || 0) * 100) / 100;

  // Application funnel
  const applicationFunnel = await Application.aggregate([
    { $match: applicationFilter },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const funnel = applicationFunnel.reduce((acc, f) => {
    acc[f._id] = f.count;
    return acc;
  }, {});

  // Package stats
  const acceptedFromBranch = await Application.aggregate([
    {
      $match: {
        ...applicationFilter,
        status: "accepted",
      },
    },
    {
      $lookup: {
        from: "drives",
        localField: "drive",
        foreignField: "_id",
        as: "driveData",
      },
    },
    { $unwind: "$driveData" },
    { $unwind: "$driveData.roles" },
    {
      $group: {
        _id: "$_id",
        maxCTC: { $max: "$driveData.roles.ctc" },
      },
    },
    { $sort: { maxCTC: 1 } },
  ]);

  const ctcList = acceptedFromBranch
    .map((a) => a.maxCTC)
    .filter(Boolean)
    .sort((a, b) => a - b);

  return {
    branch,
    overview: {
      total,
      placed,
      dreamPlaced,
      unplaced: total - placed,
      placementPercent:
        total > 0 ? Math.round((placed / total) * 100 * 10) / 10 : 0,
      avgCGPA,
    },
    packages: {
      min: ctcList[0] || 0,
      max: ctcList.at(-1) || 0,
      median: median(ctcList),
      average: ctcList.length
        ? Math.round(
            (ctcList.reduce((s, v) => s + v, 0) / ctcList.length) * 10,
          ) / 10
        : 0,
    },
    applicationFunnel: funnel,
  };
};

// ── Company-specific analytics ────────────────────────────────

/**
 * getCompanyAnalytics({ companyId })
 */
const getCompanyAnalytics = async ({ companyId } = {}) => {
  if (!companyId) throw new Error("companyId is required");

  const drives = await Drive.find({ company: companyId })
    .select("title status totalApplications totalOffers roles createdAt")
    .lean();

  const driveIds = drives.map((d) => d._id);

  const applicationsByDrive = await Application.aggregate([
    { $match: { drive: { $in: driveIds } } },
    {
      $group: {
        _id: "$drive",
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
        offered: { $sum: { $cond: [{ $eq: ["$status", "offered"] }, 1, 0] } },
      },
    },
  ]);

  const appMap = applicationsByDrive.reduce((acc, a) => {
    acc[a._id.toString()] = a;
    return acc;
  }, {});

  const driveBreakdown = drives.map((d) => ({
    ...d,
    applications: appMap[d._id.toString()]?.total || 0,
    accepted: appMap[d._id.toString()]?.accepted || 0,
    offered: appMap[d._id.toString()]?.offered || 0,
  }));

  const totalApplications = driveBreakdown.reduce(
    (s, d) => s + d.applications,
    0,
  );
  const totalAccepted = driveBreakdown.reduce((s, d) => s + d.accepted, 0);
  const totalOffered = driveBreakdown.reduce((s, d) => s + d.offered, 0);

  return {
    companyId,
    totalDrives: drives.length,
    totalApplications,
    totalOffered,
    totalAccepted,
    offerAcceptanceRate:
      totalOffered > 0
        ? Math.round((totalAccepted / totalOffered) * 100 * 10) / 10
        : 0,
    drives: driveBreakdown,
  };
};

// ── Student self-analytics ─────────────────────────────────────

/**
 * getStudentAnalytics({ studentId })
 */
const getStudentAnalytics = async ({ studentId } = {}) => {
  if (!studentId) throw new Error("studentId is required");

  const applications = await Application.find({ student: studentId })
    .populate("drive", "title status roles company")
    .lean();

  const total = applications.length;
  const byStatus = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // funnel: applied → shortlisted → oa → interview → offered → accepted
  const funnelStages = [
    "applied",
    "shortlisted",
    "oa",
    "interview_1",
    "offered",
    "accepted",
  ];
  const funnel = funnelStages.map((stage) => ({
    stage,
    count: applications.filter((a) =>
      stage === "applied"
        ? true // all applications count as "applied"
        : a.status === stage ||
          (stage === "interview_1" &&
            [
              "interview_1",
              "interview_2",
              "hr",
              "offered",
              "accepted",
            ].includes(a.status)),
    ).length,
  }));

  // success rate = accepted / total
  const successRate =
    total > 0
      ? Math.round(((byStatus.accepted || 0) / total) * 100 * 10) / 10
      : 0;

  // active applications (currently in pipeline)
  const active = applications.filter(
    (a) => !["withdrawn", "rejected", "accepted"].includes(a.status),
  ).length;

  return {
    total,
    active,
    byStatus,
    funnel,
    successRate,
    recentApplications: applications
      .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
      .slice(0, 5)
      .map((a) => ({
        _id: a._id,
        status: a.status,
        drive: a.drive?.title || "",
        appliedAt: a.appliedAt,
      })),
  };
};

// ── Recruitment funnel analytics ──────────────────────────────

/**
 * FUNNEL STAGES in order — a candidate progresses through these
 * We count how many applications ever REACHED each stage
 * (using stageHistory so we don't lose candidates who were
 *  later rejected after reaching a higher stage)
 */
const FUNNEL_STAGES = [
  { key: "applied", label: "Applied" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "oa", label: "Online Assessment" },
  { key: "interview_1", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
];

/**
 * getDriveFunnel({ driveId })
 *
 * Returns stage-by-stage funnel for a single drive:
 * - count: how many candidates reached this stage
 * - conversionFromPrev: % of previous stage that progressed
 * - conversionFromTop:  % of total applicants that reached this stage
 */
const getDriveFunnel = async ({ driveId } = {}) => {
  if (!driveId) throw new Error("driveId is required");

  const id = new mongoose.Types.ObjectId(driveId);

  // For each stage, count applications that REACHED it
  // An application "reached" a stage if:
  //   - its current status is that stage or beyond, OR
  //   - its stageHistory contains that stage
  const stageOrder = [
    "applied",
    "shortlisted",
    "oa",
    "interview_1",
    "interview_2",
    "hr",
    "offered",
    "accepted",
  ];

  // Get all applications for this drive with their stageHistory
  const applications = await Application.find({ drive: id })
    .select("status stageHistory")
    .lean();

  const total = applications.length;
  if (total === 0) {
    return {
      driveId,
      total: 0,
      stages: FUNNEL_STAGES.map((s) => ({
        ...s,
        count: 0,
        conversionFromPrev: null,
        conversionFromTop: 0,
        dropoff: 0,
      })),
    };
  }

  /**
   * Check if an application reached a specific stage.
   * An application reached stage X if:
   *   - current status is X or is ordered after X, OR
   *   - stageHistory has an entry for X
   */
  const reachedStage = (app, targetStage) => {
    // check current status
    const currentIdx = stageOrder.indexOf(app.status);
    const targetIdx = stageOrder.indexOf(targetStage);

    if (currentIdx >= 0 && targetIdx >= 0 && currentIdx >= targetIdx)
      return true;

    // check stage history
    if (
      app.stageHistory &&
      app.stageHistory.some((h) => h.stage === targetStage)
    )
      return true;

    // 'applied' is always reached if application exists
    if (targetStage === "applied") return true;

    return false;
  };

  const stageCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count: applications.filter((app) => reachedStage(app, stage.key)).length,
  }));

  // compute conversion rates
  const stages = stageCounts.map((stage, i) => {
    const prevCount = i === 0 ? total : stageCounts[i - 1].count;
    const conversionFromPrev =
      prevCount > 0 ? Math.round((stage.count / prevCount) * 100 * 10) / 10 : 0;
    const conversionFromTop =
      total > 0 ? Math.round((stage.count / total) * 100 * 10) / 10 : 0;
    const dropoff =
      i === 0 ? 0 : Math.max(0, stageCounts[i - 1].count - stage.count);

    return {
      ...stage,
      conversionFromPrev: i === 0 ? 100 : conversionFromPrev,
      conversionFromTop,
      dropoff,
    };
  });

  return {
    driveId,
    total,
    stages,
  };
};

/**
 * getOverallFunnel({ year })
 *
 * Aggregates funnel across ALL drives (or filtered by year).
 * Uses stageHistory to correctly count candidates at each stage
 * even if they were later rejected/withdrawn.
 */
const getOverallFunnel = async ({ year } = {}) => {
  // Build drive filter
  const driveFilter = {};
  if (year && year !== "all") {
    const y = Number(year);
    driveFilter.createdAt = {
      $gte: new Date(`${y}-01-01`),
      $lte: new Date(`${y}-12-31T23:59:59`),
    };
  }

  let driveIds = null;
  if (Object.keys(driveFilter).length > 0) {
    const drives = await Drive.find(driveFilter).select("_id").lean();
    driveIds = drives.map((d) => d._id);
  }

  const appFilter = driveIds ? { drive: { $in: driveIds } } : {};
  const applications = await Application.find(appFilter)
    .select("status stageHistory")
    .lean();

  const total = applications.length;

  // For each funnel stage, count how many ever reached it
  const stageOrder = [
    "applied",
    "shortlisted",
    "oa",
    "interview_1",
    "interview_2",
    "hr",
    "offered",
    "accepted",
  ];

  const reachedStage = (app, targetStage) => {
    if (targetStage === "applied") return true;
    const currentIdx = stageOrder.indexOf(app.status);
    const targetIdx = stageOrder.indexOf(targetStage);
    if (currentIdx >= 0 && targetIdx >= 0 && currentIdx >= targetIdx)
      return true;
    return app.stageHistory?.some((h) => h.stage === targetStage) || false;
  };

  const stageCounts = FUNNEL_STAGES.map((stage) => ({
    ...stage,
    count:
      total === 0
        ? 0
        : applications.filter((app) => reachedStage(app, stage.key)).length,
  }));

  const stages = stageCounts.map((stage, i) => {
    const prevCount = i === 0 ? total : stageCounts[i - 1].count;
    const conversionFromPrev =
      prevCount > 0 ? Math.round((stage.count / prevCount) * 100 * 10) / 10 : 0;
    const conversionFromTop =
      total > 0 ? Math.round((stage.count / total) * 100 * 10) / 10 : 0;
    const dropoff =
      i === 0 ? 0 : Math.max(0, stageCounts[i - 1].count - stage.count);

    return {
      ...stage,
      conversionFromPrev: i === 0 ? 100 : conversionFromPrev,
      conversionFromTop,
      dropoff,
    };
  });

  // biggest drop-off stage
  let maxDropoff = 0;
  let maxDropoffStage = null;
  stages.slice(1).forEach((s) => {
    if (s.dropoff > maxDropoff) {
      maxDropoff = s.dropoff;
      maxDropoffStage = s.label;
    }
  });

  return {
    total,
    stages,
    insight: maxDropoffStage
      ? `Biggest drop-off is at ${maxDropoffStage} (${maxDropoff} candidates lost)`
      : null,
  };
};

/**
 * getDriveConversionSummary()
 *
 * Per-drive conversion: total applicants → accepted.
 * Used for ranking drives by effectiveness.
 */
const getDriveConversionSummary = async ({ limit = 10 } = {}) => {
  const summary = await Application.aggregate([
    {
      $group: {
        _id: "$drive",
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ["$status", "accepted"] }, 1, 0] } },
        offered: { $sum: { $cond: [{ $eq: ["$status", "offered"] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: "drives",
        localField: "_id",
        foreignField: "_id",
        as: "drive",
      },
    },
    { $unwind: "$drive" },
    {
      $lookup: {
        from: "companies",
        localField: "drive.company",
        foreignField: "_id",
        as: "company",
      },
    },
    { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $gt: ["$total", 0] },
            {
              $round: [
                { $multiply: [{ $divide: ["$accepted", "$total"] }, 100] },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { total: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 1,
        total: 1,
        accepted: 1,
        offered: 1,
        conversionRate: 1,
        driveTitle: "$drive.title",
        driveStatus: "$drive.status",
        companyName: "$company.name",
      },
    },
  ]);

  return summary;
};

module.exports = {
  getTPOAnalytics,
  getBranchAnalytics,
  getCompanyAnalytics,
  getStudentAnalytics,
  median,
  getDriveConversionSummary,
  getDriveFunnel,
  getOverallFunnel,
  FUNNEL_STAGES,
};
