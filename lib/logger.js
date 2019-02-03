const log4js = require('log4js');
const pckg = require('../package');

const service_name = pckg.name;
const log_level = pckg.log_level || 'ALL';
const log_pattern = pckg.log_pattern || '%[[%d{ISO8601}] [%p] [%h] [${service_name}] [%c]%] - %m%n';

const default_pattern = `%[ [%d{ISO8601}] [%p] [%h] [${service_name}] [%c] %] - %m%n`;

const pattern = log_pattern ? log_pattern.replace('${service_name}', service_name) : default_pattern;

log4js.configure({
  appenders: {
    out: {
      type: 'stdout',
      layout: {
        type: 'pattern',
        pattern
      }
    }
  },
  categories: {
    default: {
      appenders: ['out'],
      level: 'all'
    }
  }
});

const extractModuleName = (path) => {
  const regexp = /[\w-_]+\.js$/ig;

  if (!path || typeof path !== 'string') {
    return null;
  }

  return path.match(regexp)[0] || null;
};

module.exports = (module) => {
  let logger;

  if (!module || !module.filename) {
    logger = log4js.getLogger();
    logger.setLevel(log_level);

    return logger;
  }

  const category = extractModuleName(module.filename);

  logger = log4js.getLogger(category);
  logger.level = log_level;

  return logger;
};
