/**
 * BullMQ & Redis File Expiry Background Queue
 * Automatically processes file lifetime expiration and physical purging.
 * Includes graceful in-process timer fallback for resilience when Redis is offline.
 */
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const { expireOrderFiles } = require('../services/expiry.service');

const QUEUE_NAME = 'smartprint-file-expiry';
let expiryQueue = null;
let expiryWorker = null;
let redisAvailable = false;

// Fallback in-process timer map for standalone mode or offline Redis
const localTimers = new Map();

const redisUrl = process.env.REDIS_URL;
const isRedisExplicitlyEnabled = Boolean(redisUrl) && process.env.REDIS_ENABLED !== 'false';

if (isRedisExplicitlyEnabled) {
  try {
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return 2000;
      },
    });

    connection.on('connect', () => {
      logger.info(`[BullMQ] Connected to Redis at ${redisUrl}`);
      redisAvailable = true;
    });

    connection.on('error', (err) => {
      redisAvailable = false;
    });

    expiryQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    expiryWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`[BullMQ] Processing expiry job for Order #${job.data.orderId} (Attempt: ${job.attemptsMade + 1})`);
        return expireOrderFiles(job.data.orderId, {
          reason: 'Automated background lifetime expiry',
          action: 'AUTO_EXPIRED',
        });
      },
      { connection, concurrency: 5 }
    );

    expiryWorker.on('failed', (job, err) => {
      logger.error(`[BullMQ] Expiry job failed for Order #${job?.data?.orderId}: ${err.message}`);
    });
  } catch (initErr) {
    logger.warn(`[BullMQ] Redis initialization skipped (${initErr.message}). Using in-process timer scheduler.`);
    redisAvailable = false;
  }
} else {
  logger.info('[Queue] Running in-process timer scheduler for document lifetime expiry.');
}

/**
 * Schedule background order expiry
 * @param {number} orderId
 * @param {number} delayMs Delay until expiration in milliseconds
 */
async function scheduleOrderExpiry(orderId, delayMs = 0) {
  // Clear any existing local timer for this order
  if (localTimers.has(orderId)) {
    clearTimeout(localTimers.get(orderId));
    localTimers.delete(orderId);
  }

  // 1. If Redis is available, enqueue via BullMQ
  if (redisAvailable && expiryQueue) {
    try {
      const jobId = `expiry_order_${orderId}`;
      // Remove previous job if exists
      const existingJob = await expiryQueue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
      }

      await expiryQueue.add(
        'expire-order-files',
        { orderId },
        {
          jobId,
          delay: Math.max(0, delayMs),
        }
      );
      logger.info(`[Queue] Enqueued BullMQ expiry job for Order #${orderId} with ${Math.round(delayMs / 1000)}s delay`);
      return { type: 'bullmq', orderId, delayMs };
    } catch (qErr) {
      logger.warn(`[Queue] BullMQ enqueue failed: ${qErr.message}. Falling back to in-process timer.`);
    }
  }

  // 2. In-process timer fallback (guarantees job execution even without Redis daemon)
  const timer = setTimeout(async () => {
    try {
      logger.info(`[TimerQueue] Executing automated purge for Order #${orderId}`);
      await expireOrderFiles(orderId, {
        reason: 'Automated in-process timer lifetime expiry',
        action: 'AUTO_EXPIRED',
      });
      localTimers.delete(orderId);
    } catch (execErr) {
      logger.error(`[TimerQueue] Failed to expire Order #${orderId}: ${execErr.message}`);
    }
  }, Math.max(0, delayMs));

  localTimers.set(orderId, timer);
  logger.info(`[TimerQueue] Scheduled in-process timer for Order #${orderId} with ${Math.round(delayMs / 1000)}s delay`);
  return { type: 'local_timer', orderId, delayMs };
}

/**
 * Cancel an active scheduled expiry (e.g. if extended or manually handled)
 */
async function cancelOrderExpiry(orderId) {
  if (localTimers.has(orderId)) {
    clearTimeout(localTimers.get(orderId));
    localTimers.delete(orderId);
  }

  if (redisAvailable && expiryQueue) {
    try {
      const jobId = `expiry_order_${orderId}`;
      const job = await expiryQueue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch (e) {}
  }
}

/**
 * Graceful shutdown for BullMQ worker & timers
 */
async function closeQueue() {
  for (const timer of localTimers.values()) {
    clearTimeout(timer);
  }
  localTimers.clear();

  if (expiryWorker) {
    await expiryWorker.close();
  }
  if (expiryQueue) {
    await expiryQueue.close();
  }
}

module.exports = {
  scheduleOrderExpiry,
  cancelOrderExpiry,
  closeQueue,
  isRedisAvailable: () => redisAvailable,
};
