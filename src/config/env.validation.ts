import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  DATABASE_URL: Joi.string()
    .pattern(/^postgres(ql)?:\/\//)
    .required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  SMTP_HOST: Joi.string().hostname(),
  SMTP_PORT: Joi.number().integer().min(1).max(65535),
  SMTP_USER: Joi.string().allow(''),
  SMTP_PASS: Joi.string().allow(''),
  SMTP_FROM: Joi.string().email(),
})
  .custom((value, helpers) => {
    const smtpKeys = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
    ] as const;
    const hasAnySmtpConfig = smtpKeys.some((key) => {
      const entry = value[key];
      return entry !== undefined && entry !== '';
    });

    if (hasAnySmtpConfig && (!value.SMTP_HOST || !value.SMTP_PORT)) {
      return helpers.error('any.custom', {
        message: 'SMTP_HOST and SMTP_PORT are required when SMTP is configured',
      });
    }

    return value;
  }, 'SMTP conditional validation')
  .messages({
    'any.custom': '{{#message}}',
  });
