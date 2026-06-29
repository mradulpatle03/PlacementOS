const Student = require("../models/Student");
const Company = require("../models/Company");
const Drive = require("../models/Drive");
const Application = require("../models/Application");

/**
 * getPublicStats()
 *
 * Aggregated, anonymized stats safe to expose on the public landing page.
 * No PII — only counts and ranges.
 */
const getPublicStats = async () => {
  // ── placement overview ──────────────────────────────────────
  const studentAgg = await Student.aggregate([
    {
      $group: {
        _id: null,
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
      },
    },
  ]);

  const total = studentAgg[0]?.total || 0;
  const placed = studentAgg[0]?.placed || 0;
  const placementPercent =
    total > 0 ? Math.round((placed / total) * 100 * 10) / 10 : 0;

  // ── package stats from accepted applications ────────────────
  const acceptedApps = await Application.aggregate([
    { $match: { status: "accepted" } },
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
  ]);

  const ctcList = acceptedApps.map((a) => a.maxCTC).filter(Boolean);
  const highestPackage = ctcList.length ? Math.max(...ctcList) : 0;
  const averagePackage = ctcList.length
    ? Math.round((ctcList.reduce((s, v) => s + v, 0) / ctcList.length) * 10) /
      10
    : 0;

  // ── recruiting companies ─────────────────────────────────────
  const totalCompanies = await Company.countDocuments({ isActive: true });
  const totalDrivesCompleted = await Drive.countDocuments({
    status: "completed",
  });

  // top companies by hiring count
  const topCompaniesAgg = await Application.aggregate([
    { $match: { status: "accepted" } },
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
        logo: { $first: "$companyData.logo.cloudinaryUrl" },
        hires: { $sum: 1 },
      },
    },
    { $sort: { hires: -1 } },
    { $limit: 12 },
  ]);

  return {
    placementPercent,
    totalStudentsPlaced: placed,
    totalCompanies,
    totalDrivesCompleted,
    highestPackage,
    averagePackage,
    topCompanies: topCompaniesAgg,
    lastUpdated: new Date(),
  };
};

module.exports = { getPublicStats };
