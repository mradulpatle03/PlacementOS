const Joi = require('joi');

const uploadResumeSchema = Joi.object({
  label: Joi.string().trim().max(50).default('Resume'),
  isPrimary: Joi.boolean().default(false),
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

module.exports = { uploadResumeSchema, validate };