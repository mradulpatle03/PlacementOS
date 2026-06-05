const Joi = require('joi');

// reuse the same validate wrapper pattern as other validators
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: messages });
  }
  req.body = value;
  next();
};

// Panel member
const panelMemberSchema = Joi.object({
  user:  Joi.string().required(),
  name:  Joi.string().allow('').default(''),
  email: Joi.string().email().allow('').default(''),
  role:  Joi.string().allow('').default('interviewer'),
});

// Schedule interview (recruiter assigns directly)
const scheduleInterviewSchema = Joi.object({
  drive:           Joi.string().required(),
  application:     Joi.string().required(),
  student:         Joi.string().required(),
  round:           Joi.string().valid('interview_1', 'interview_2', 'hr').required(),
  scheduledAt:     Joi.date().greater('now').required(),
  durationMinutes: Joi.number().min(5).default(45),
  mode:            Joi.string().valid('online', 'offline', 'hybrid').default('online'),
  venue:           Joi.string().allow('').default(''),
  meetingLink:     Joi.string().uri().allow('').default(''),
  panel:           Joi.array().items(panelMemberSchema).default([]),
});

// Reschedule
const rescheduleInterviewSchema = Joi.object({
  scheduledAt:     Joi.date().greater('now').required(),
  durationMinutes: Joi.number().min(5),
  mode:            Joi.string().valid('online', 'offline', 'hybrid'),
  venue:           Joi.string().allow(''),
  meetingLink:     Joi.string().uri().allow(''),
  panel:           Joi.array().items(panelMemberSchema),
});

// Record result
const recordResultSchema = Joi.object({
  result:        Joi.string().valid('pass', 'fail', 'no_show').required(),
  feedback:      Joi.string().allow('').default(''),
  ratingOutOf10: Joi.number().min(0).max(10).allow(null).default(null),
});

// Create slot (recruiter opens availability)
const createSlotSchema = Joi.object({
  drive:           Joi.string().required(),
  round:           Joi.string().valid('interview_1', 'interview_2', 'hr').required(),
  scheduledAt:     Joi.date().greater('now').required(),
  durationMinutes: Joi.number().min(5).default(45),
  mode:            Joi.string().valid('online', 'offline', 'hybrid').default('online'),
  venue:           Joi.string().allow('').default(''),
  meetingLink:     Joi.string().uri().allow('').default(''),
  capacity:        Joi.number().min(1).default(1),
});

// Bulk create slots
const createBulkSlotsSchema = Joi.object({
  slots: Joi.array().items(createSlotSchema).min(1).required(),
});

module.exports = {
  validate,
  scheduleInterviewSchema,
  rescheduleInterviewSchema,
  recordResultSchema,
  createSlotSchema,
  createBulkSlotsSchema,
};