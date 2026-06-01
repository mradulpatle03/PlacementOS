const Joi = require("joi");

const roundSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string()
    .valid(
      "aptitude",
      "coding",
      "technical",
      "hr",
      "group_discussion",
      "presentation",
      "other",
    )
    .required(),
  description: Joi.string().allow(""),
  scheduledAt: Joi.date().allow(null),
  durationMinutes: Joi.number().min(0),
  venue: Joi.string().allow(""),
  isOnline: Joi.boolean().default(false),
});

const roleSchema = Joi.object({
  title: Joi.string().trim().required(),
  ctc: Joi.number().min(0).required(),
  description: Joi.string().allow(""),
  openings: Joi.number().min(1).default(1),
});

const eligibilitySchema = Joi.object({
  minCGPA: Joi.number().min(0).max(10).default(0),
  maxBacklogs: Joi.number().min(0).default(0),
  allowedBranches: Joi.array()
    .items(Joi.string().valid("CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"))
    .default(["CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"]),
  graduationYear: Joi.array().items(Joi.number()).default([]),
  genderRestriction: Joi.string().valid("any", "male", "female").default("any"),
});

const settingsSchema = Joi.object({
  allowLateApplications: Joi.boolean().default(false),
  gracePeriodHours: Joi.number().min(0).default(0),
  oneOfferPolicy: Joi.boolean().default(true),
  dreamPackageLPA: Joi.number().min(0).default(0),
  autoShortlist: Joi.boolean().default(false),
  notifyOnStatusChange: Joi.boolean().default(true),
});

const createDriveSchema = Joi.object({
  company: Joi.string().required(),
  title: Joi.string().trim().min(3).max(200).required(),
  roles: Joi.array().items(roleSchema).min(1).required(),
  location: Joi.string().trim().allow(""),
  mode: Joi.string()
    .valid("oncampus", "offcampus", "hybrid")
    .default("oncampus"),
  eligibility: eligibilitySchema.default(() => ({})),
  rounds: Joi.array().items(roundSchema).default([]),
  settings: settingsSchema.default(() => ({})),
  applicationDeadline: Joi.date().greater("now").required(),
  driveDate: Joi.date().allow(null),
});

const updateDriveSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  roles: Joi.array().items(roleSchema).min(1),
  location: Joi.string().trim().allow(""),
  mode: Joi.string().valid("oncampus", "offcampus", "hybrid"),
  eligibility: eligibilitySchema,
  rounds: Joi.array().items(roundSchema),
  settings: settingsSchema,
  applicationDeadline: Joi.date(),
  driveDate: Joi.date().allow(null),
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

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("draft", "published", "open", "closed", "completed")
    .required(),
});

module.exports = { createDriveSchema, updateDriveSchema, validate, updateStatusSchema };
