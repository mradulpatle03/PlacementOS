const Policy   = require('../models/Policy');
const AppError = require('../utils/AppError');

// GET /api/v1/policies
// Any authenticated user can view the policy
const getPolicy = async (req, res, next) => {
  try {
    const policy = await Policy.getPolicy();
    return res.status(200).json({
      success: true,
      data:    { policy },
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/policies
// TPO / Admin only — update policy fields
const updatePolicy = async (req, res, next) => {
  try {
    const {
      oneOfferPolicy,
      dreamPackageLPA,
      maxActiveApplications,
      maxApplicationsPerWeek,
      offerResponseWindowDays,
      requireCompleteProfile,
      minProfileScore,
    } = req.body;

    // build update object — only include fields that were sent
    const updates = {};

    if (typeof oneOfferPolicy          === 'boolean') updates.oneOfferPolicy          = oneOfferPolicy;
    if (typeof dreamPackageLPA         === 'number')  updates.dreamPackageLPA         = dreamPackageLPA;
    if (typeof maxActiveApplications   === 'number')  updates.maxActiveApplications   = maxActiveApplications;
    if (typeof maxApplicationsPerWeek  === 'number')  updates.maxApplicationsPerWeek  = maxApplicationsPerWeek;
    if (typeof offerResponseWindowDays === 'number')  updates.offerResponseWindowDays = offerResponseWindowDays;
    if (typeof requireCompleteProfile  === 'boolean') updates.requireCompleteProfile  = requireCompleteProfile;
    if (typeof minProfileScore         === 'number')  updates.minProfileScore         = minProfileScore;

    if (Object.keys(updates).length === 0) {
      return next(new AppError('No valid fields provided for update', 400));
    }

    updates.updatedBy = req.user._id;

    const policy = await Policy.findOneAndUpdate(
      { key: 'global' },
      { $set: updates },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Policy updated successfully',
      data:    { policy },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/policies/reset
// TPO / Admin — reset policy to factory defaults
const resetPolicy = async (req, res, next) => {
  try {
    const policy = await Policy.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          oneOfferPolicy:          true,
          dreamPackageLPA:         10,
          maxActiveApplications:   0,
          maxApplicationsPerWeek:  0,
          offerResponseWindowDays: 3,
          requireCompleteProfile:  false,
          minProfileScore:         0,
          updatedBy:               req.user._id,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Policy reset to defaults',
      data:    { policy },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPolicy, updatePolicy, resetPolicy };