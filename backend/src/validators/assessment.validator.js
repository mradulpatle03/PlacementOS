const Joi = require('joi');

// reusable validate middleware — same pattern as drive.validator.js
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: messages });
  }
  req.body = value;
  next();
};

// Option schema (MCQ)
const optionSchema = Joi.object({
  text: Joi.string().trim().required(),
  isCorrect: Joi.boolean().default(false),
});

// Test case schema (coding)
const testCaseSchema = Joi.object({
  input: Joi.string().allow('').default(''),
  expectedOutput: Joi.string().required(),
  isHidden: Joi.boolean().default(false),
});

// Question schema
const questionSchema = Joi.object({
  type: Joi.string().valid('mcq', 'coding').required(),
  title: Joi.string().trim().min(3).required(),
  description: Joi.string().allow('').default(''),
  // MCQ
  options: Joi.when('type', {
    is: 'mcq',
    then: Joi.array().items(optionSchema).min(2).required(),
    otherwise: Joi.array().default([]),
  }),
  // Coding
  starterCode: Joi.string().allow('').default(''),
  testCases: Joi.when('type', {
    is: 'coding',
    then: Joi.array().items(testCaseSchema).min(1).required(),
    otherwise: Joi.array().default([]),
  }),
  allowedLanguages: Joi.array()
    .items(Joi.string())
    .default(['python', 'javascript', 'java', 'cpp', 'c']),
  marks: Joi.number().min(0).default(1),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  order: Joi.number().default(0),
});

// Settings schema
const settingsSchema = Joi.object({
  shuffleQuestions: Joi.boolean().default(false),
  shuffleOptions: Joi.boolean().default(false),
  showResultAfterSubmit: Joi.boolean().default(false),
  allowTabSwitch: Joi.boolean().default(false),
  maxTabSwitches: Joi.number().default(3),
  requireFullscreen: Joi.boolean().default(true),
  copyPasteDisabled: Joi.boolean().default(true),
});

// Create Assessment
const createAssessmentSchema = Joi.object({
  drive: Joi.string().required(),
  title: Joi.string().trim().min(3).max(200).required(),
  instructions: Joi.string().allow('').default(''),
  durationMinutes: Joi.number().min(1).required(),
  questions: Joi.array().items(questionSchema).min(1).required(),
  settings: settingsSchema.default(() => ({})),
  startsAt: Joi.date().allow(null),
  endsAt: Joi.date().allow(null),
});

// Update Assessment
const updateAssessmentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200),
  instructions: Joi.string().allow(''),
  durationMinutes: Joi.number().min(1),
  questions: Joi.array().items(questionSchema).min(1),
  settings: settingsSchema,
  startsAt: Joi.date().allow(null),
  endsAt: Joi.date().allow(null),
  status: Joi.string().valid('draft', 'active', 'closed'),
});

module.exports = {
  validate,
  createAssessmentSchema,
  updateAssessmentSchema,
};