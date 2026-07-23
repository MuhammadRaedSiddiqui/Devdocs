// apps/api/src/lib/logger.ts
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Pretty print in development
  transport: !isProduction ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,

  // Production: JSON format for log aggregators
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },

  // Base fields included in every log
  base: {
    service: '@devdocs/api',
    environment: process.env.NODE_ENV,
  },

  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.apiKey', '*.password'],
    remove: true,
  },
});

// Child logger with specific context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
