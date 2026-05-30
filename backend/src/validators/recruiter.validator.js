const Joi = require("joi");

const updateRecruiterSchema = Joi.object({
  designation: Joi.string().trim().max(100),
  phone: Joi.string().trim().max(15),
  linkedinProfile: Joi.string().uri().allow(""),
  bio: Joi.string().max(500).allow(""),
});

const verifyRecruiterSchema = Joi.object({
  action: Joi.string().valid("approve", "reject").required(),
  rejectionReason: Joi.when("action", {
    is: "reject",
    then: Joi.string().required(),
    otherwise: Joi.string().allow(""),
  }),
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

module.exports = { updateRecruiterSchema, verifyRecruiterSchema, validate };
