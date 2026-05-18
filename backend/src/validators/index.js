const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  username: z.string().trim().min(3).max(255),
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  userType: z.enum(['candidate', 'recruiter']).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(3000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1200)
  })).max(8).optional()
});

const jobDescriptionSchema = z.object({
  jobDescription: z.string().trim().min(40).max(20000)
});

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  req.body = result.data;
  return next();
};

module.exports = {
  registerSchema,
  loginSchema,
  chatMessageSchema,
  jobDescriptionSchema,
  validate
};
