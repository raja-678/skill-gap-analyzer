const IORedis = require('ioredis');
const { Queue } = require('bullmq');

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error('REDIS_URL is required for BullMQ/Upstash Redis queue');
}

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

const queueName = 'resume-processing';
const resumeQueue = new Queue(queueName, { connection });

module.exports = {
  resumeQueue,
  connection
};
