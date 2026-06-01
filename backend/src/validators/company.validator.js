const Joi = require("joi");

const createCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  sector: Joi.string().valid(
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
  ),
  location: Joi.string().trim().max(100),
  website: Joi.string().uri().allow(""),
  description: Joi.string().max(1000).allow(""),
  packageRange: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
  }),
});

const updateCompanySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  sector: Joi.string().valid(
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
  ),
  location: Joi.string().trim().max(100),
  website: Joi.string().uri().allow(""),
  description: Joi.string().max(1000).allow(""),
  packageRange: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
  }),
  isActive: Joi.boolean(),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: messages });
  }
  req.body = value;
  next();
};

const linkRecruiterSchema = Joi.object({
  recruiterId: Joi.string().required(),
});

const addHiringHistorySchema = Joi.object({
  year: Joi.number().min(2000).max(2100).required(),
  totalOffers: Joi.number().min(0).default(0),
  totalHired: Joi.number().min(0).default(0),
  averagePackage: Joi.number().min(0).default(0),
  highestPackage: Joi.number().min(0).default(0),
  rolesOffered: Joi.array().items(Joi.string()).default([]),
  driveCount: Joi.number().min(0).default(0),
});

module.exports = { createCompanySchema, updateCompanySchema, validate, linkRecruiterSchema, addHiringHistorySchema };
