const HiringHistory = require("../models/HiringHistory");
const Company = require("../models/Company");

// called when a drive completes — updates company hiring history automatically
const updateHiringHistory = async ({
  companyId,
  year,
  offersCount,
  hiredCount,
  packageLPA,
  role,
}) => {
  try {
    const existing = await HiringHistory.findOne({ company: companyId, year });

    if (existing) {
      // recalculate average
      const totalPackage =
        existing.averagePackage * existing.totalOffers + packageLPA;
      const newTotalOffers = existing.totalOffers + offersCount;

      existing.totalOffers = newTotalOffers;
      existing.totalHired += hiredCount;
      existing.driveCount += 1;
      existing.highestPackage = Math.max(existing.highestPackage, packageLPA);
      existing.averagePackage =
        newTotalOffers > 0 ? totalPackage / newTotalOffers : 0;
      if (role && !existing.rolesOffered.includes(role)) {
        existing.rolesOffered.push(role);
      }
      await existing.save();
    } else {
      await HiringHistory.create({
        company: companyId,
        year,
        totalOffers: offersCount,
        totalHired: hiredCount,
        driveCount: 1,
        highestPackage: packageLPA,
        averagePackage: packageLPA,
        rolesOffered: role ? [role] : [],
      });
    }

    // update company aggregate
    const allHistory = await HiringHistory.find({ company: companyId });
    await Company.findByIdAndUpdate(companyId, {
      totalDrives: allHistory.reduce((s, h) => s + h.driveCount, 0),
      totalOffers: allHistory.reduce((s, h) => s + h.totalOffers, 0),
    });

    console.log(`Hiring history updated for company ${companyId} year ${year}`);
  } catch (err) {
    console.log("Failed to update hiring history:", err.message);
  }
};

module.exports = { updateHiringHistory };
