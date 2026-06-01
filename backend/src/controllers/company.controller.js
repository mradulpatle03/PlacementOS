const Company = require('../models/Company');
const { createError } = require('../middlewares/errorHandler');
const { uploadImageToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryUpload');
const Recruiter = require('../models/Recruiter');
const HiringHistory = require('../models/HiringHistory');

// POST /api/v1/companies
const createCompany = async (req, res, next) => {
  try {
    const existing = await Company.findOne({ name: req.body.name });
    if (existing) return next(createError('Company with this name already exists', 409));

    const company = await Company.create({
      ...req.body,
      createdBy: req.user._id,
    });

    console.log(`Company created: ${company.name} by ${req.user.email}`);
    res.status(201).json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/companies
const getAllCompanies = async (req, res, next) => {
  try {
    const {
      sector, isActive = 'true',
      search, page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (sector) filter.sector = sector;
    if (isActive !== 'all') filter.isActive = isActive === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ name: 1 }),
      Company.countDocuments(filter),
    ]);

    res.json({
      success: true,
      companies,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/companies/:id
const getCompanyById = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('recruiters', 'name email');

    if (!company) return next(createError('Company not found', 404));
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/companies/:id
const updateCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!company) return next(createError('Company not found', 404));

    console.log(`Company updated: ${company.name} by ${req.user.email}`);
    res.json({ success: true, company });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/companies/:id
const deleteCompany = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    // delete logo from cloudinary if exists
    if (company.logo?.publicId) {
      await deleteFromCloudinary(company.logo.publicId);
    }

    await company.deleteOne();
    console.log(`Company deleted: ${company.name} by ${req.user.email}`);
    res.json({ success: true, message: 'Company deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/companies/:id/logo
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) return next(createError('No image uploaded', 400));

    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    // delete old logo if exists
    if (company.logo?.publicId) {
      await deleteFromCloudinary(company.logo.publicId);
    }

    const result = await uploadImageToCloudinary(req.file.buffer, {
      folder: 'placementos/logos',
      public_id: `company_${company._id}`,
      transformation: [{ width: 400, height: 400, crop: 'limit' }],
    });

    company.logo = {
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
    };
    await company.save();

    console.log(`Logo uploaded for: ${company.name}`);
    res.json({ success: true, logo: company.logo });
  } catch (err) {
    next(err);
  }
};


// POST /api/v1/companies/:id/recruiters
// link an existing recruiter user to a company
const linkRecruiter = async (req, res, next) => {
  try {
    const { recruiterId } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    // recruiterId is the User _id
    const recruiterProfile = await Recruiter.findOne({ user: recruiterId });
    if (!recruiterProfile) return next(createError('Recruiter profile not found', 404));

    // check already linked
    if (company.recruiters.includes(recruiterId)) {
      return next(createError('Recruiter already linked to this company', 409));
    }

    company.recruiters.push(recruiterId);
    await company.save();

    // update recruiter profile with company ref
    recruiterProfile.company = company._id;
    await recruiterProfile.save();

    console.log(`Recruiter ${recruiterId} linked to company: ${company.name}`);
    res.json({ success: true, message: 'Recruiter linked to company', company });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/companies/:id/recruiters/:recruiterId
const unlinkRecruiter = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    company.recruiters = company.recruiters.filter(
      (r) => r.toString() !== req.params.recruiterId
    );
    await company.save();

    // remove company from recruiter profile
    await Recruiter.findOneAndUpdate(
      { user: req.params.recruiterId },
      { $unset: { company: '' } }
    );

    console.log(`Recruiter ${req.params.recruiterId} unlinked from: ${company.name}`);
    res.json({ success: true, message: 'Recruiter unlinked', company });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/companies/:id/recruiters
const getCompanyRecruiters = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate({
        path: 'recruiters',
        select: 'name email',
        populate: {
          path: 'recruiterProfile',
          model: 'Recruiter',
          localField: '_id',
          foreignField: 'user',
          select: 'designation isVerified',
        },
      });

    if (!company) return next(createError('Company not found', 404));

    // get recruiter profiles separately for cleaner data
    const recruiterProfiles = await Recruiter.find({
      user: { $in: company.recruiters },
    }).populate('user', 'name email');

    res.json({ success: true, recruiters: recruiterProfiles });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/companies/:id/history
const getHiringHistory = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    const history = await HiringHistory.find({ company: req.params.id })
      .sort({ year: -1 });

    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/companies/:id/history
// TPO can manually add/update hiring history
const upsertHiringHistory = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    const { year, ...rest } = req.body;

    const history = await HiringHistory.findOneAndUpdate(
      { company: req.params.id, year },
      { $set: { company: req.params.id, year, ...rest } },
      { new: true, upsert: true, runValidators: true }
    );

    // update company aggregate stats
    const allHistory = await HiringHistory.find({ company: req.params.id });
    company.totalOffers = allHistory.reduce((sum, h) => sum + h.totalOffers, 0);
    await company.save();

    console.log(`Hiring history upserted for ${company.name} year ${year}`);
    res.json({ success: true, history });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/companies/:id/stats
// updated getCompanyStats with history
const getCompanyStats = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return next(createError('Company not found', 404));

    const history = await HiringHistory.find({ company: req.params.id }).sort({ year: -1 });

    const totalDrives  = history.reduce((s, h) => s + h.driveCount, 0);
    const totalOffers  = history.reduce((s, h) => s + h.totalOffers, 0);
    const totalHired   = history.reduce((s, h) => s + h.totalHired, 0);
    const highestEver  = Math.max(0, ...history.map((h) => h.highestPackage));
    const avgPackage   = history.length
      ? (history.reduce((s, h) => s + h.averagePackage, 0) / history.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      stats: {
        totalDrives,
        totalOffers,
        totalHired,
        highestEver,
        avgPackage: Number(avgPackage),
        packageRange: company.packageRange,
        yearWise: history,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  uploadLogo,
  getCompanyStats,
  linkRecruiter,
  unlinkRecruiter,
  getCompanyRecruiters,
  getHiringHistory,
  upsertHiringHistory,
};