const Joi = require("joi");

const projectSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(""),
  techStack: Joi.array().items(Joi.string().trim()).max(15),
  link: Joi.string().uri().allow(""),
});

const updateStudentSchema = Joi.object({
  rollNumber: Joi.string().trim(),
  branch: Joi.string().valid("CSE", "IT", "ECE", "EEE", "ME", "CE", "Other"),
  graduationYear: Joi.number().min(2000).max(2100),
  cgpa: Joi.number().min(0).max(10),
  backlogs: Joi.number().min(0),
  skills: Joi.array().items(Joi.string().trim()).max(30),
  socialLinks: Joi.object({
    linkedin: Joi.string().uri().allow(""),
    github: Joi.string().uri().allow(""),
    portfolio: Joi.string().uri().allow(""),
  }),
});

const addProjectSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).allow(""),
  techStack: Joi.array().items(Joi.string().trim()).max(15),
  link: Joi.string().uri().allow(""),
});

const updateProjectSchema = Joi.object({
  title: Joi.string().min(1).max(100),
  description: Joi.string().max(500).allow(""),
  techStack: Joi.array().items(Joi.string().trim()).max(15),
  link: Joi.string().uri().allow(""),
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

module.exports = {
  updateStudentSchema,
  addProjectSchema,
  updateProjectSchema,
  validate,
};
