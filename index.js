const conf = require('nconf');
const {CronJob} = require('cron');
const logger = require('./logger');
const moment = require('moment');
const pSettle = require('p-settle');
const request = require('request-promise-native');

conf
  .env()
  .argv()
  .file({'file': 'config.json'});

const elasticSearchSchema = conf.get('elasticsearch:schema');
const elasticSearchHost = conf.get('elasticsearch:host');
const elasticSearchPort = conf.get('elasticsearch:port');
const logstashPrefix = conf.get('logstash:indexPrefix');
const logstashDaystokeep = conf.get('logstash:keepLatestDays');
const cronExpr = conf.get('cronExpr');

let job;

/**
 * Format the ES url
 * @return {String}
 */
function baseUrl () {
  return `${elasticSearchSchema}://${elasticSearchHost}:${elasticSearchPort}`;
}

/**
 * Delete the indices
 * @param  {Array} indices
 */
async function deleteIndices (indices) {
  const promises = indices.map(indice => request.delete(`${baseUrl()}/${indice}`));
  const results = await pSettle(promises);

  const isRejected = results.filter(result => result.isRejected);
  const isFulfilled = results.filter(result => result.isFulfilled);

  // we log all rejected widget with reason
  if (isRejected.length) {
    isRejected.forEach(item => {
      logger.error(item.reason);
    });
  }

  // we log all rejected widget with reason
  if (isFulfilled.length) {
    logger.info(`${isFulfilled.length} indices deleted on ${results.length}`);
  }
}

/**
 * Clean ES given indices
 */
async function clean () {
  logger.info(`running cron job at: ${new Date()}`);

  try {
    const body = await request.get(baseUrl() + '/_stats/indexing?pretty');
    const {indices} = JSON.parse(body);
    const keys = Object.keys(indices);
    const now = moment();
    const timeLimit = now.subtract(logstashDaystokeep, 'days');

    const indicesToDelete = keys.filter(key => {
      if (key.startsWith(logstashPrefix)) {
        const date = key.replace(logstashPrefix, '');
        const realDate = moment(date, 'YYYY.MM.DD');

        if (realDate.isBefore(timeLimit)) {
          return true;
        }
      }

      return false;
    });

    if (indicesToDelete.length > 0) {
      logger.info(`${indicesToDelete.length} indices on ${keys.length} to delete...`);
      logger.info(JSON.stringify(indicesToDelete, null, 2));
      deleteIndices(indicesToDelete);
    }

    logger.warn(`any indices on ${keys.length} available to delete...`);
    logger.info(`next clean: ${job.nextDate()}`);
  } catch (e) {
    logger.error(e.error || e);
  }
}

logger.verbose(`running for: ${baseUrl()}`);
logger.verbose(
  `cleaning logs for prefix: "${logstashPrefix}" older than ${logstashDaystokeep} day(s)`
);
logger.verbose(`the cron expression is ${cronExpr}`);

try {
  job = new CronJob(cronExpr, clean, null, false);

  logger.info(`next clean: ${job.nextDate()}`);

  job.start();
} catch (error) {
  logger.error(error);
}
