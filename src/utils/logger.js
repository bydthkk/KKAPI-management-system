const winston = require('winston');
const config = require('../config/config');

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-management' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: config.logging.file }),
  ],
});

if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 添加条件化调试方法
logger.debug_dev = (...args) => {
  if (config.nodeEnv === 'development') {
    console.log('[DEV-DEBUG]', ...args);
  }
};

// 添加条件化错误输出方法
logger.error_dev = (...args) => {
  if (config.nodeEnv === 'development') {
    console.error('[DEV-ERROR]', ...args);
  }
  logger.error(...args);
};

module.exports = logger;