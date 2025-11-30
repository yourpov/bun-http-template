import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const opts = {
  level: isProd ? 'info' : 'debug',
};

export const logger = pino(opts);
