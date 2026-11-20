/**
 * BullMQ & In-Process Daily Subscription Maintenance Queue
 * Automatically processes daily subscription status checks:
 * - TRIAL expiration -> EXPIRED
 * - ACTIVE period end -> PAST_DUE (3 days grace) -> EXPIRED
 * Follows the exact pattern from expiry.queue.js — same Redis setup,
 * graceful fallback when Redis is offline.
 */
'use strict';

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const { runDailySubscriptionMaintenance } = require('../services/subscription.service');

const QUEUE_NAME = 'smartprint-subscription-maintenance';
let subscriptionQueue = null;
let subscriptionWorker = null;
let redisAvailable = false;
let inProcessInterval = null;

const redisUrl = process.env.REDIS_URL;
const isRedisExplicitlyEnabled = Boolean(redisUrl) && process.env.REDIS_ENABLED !== 'false';

// ── Daily Cron: 00:00 UTC (05:30 IST) ─────────────────────
const DAILY_CRON = '0 0 * * *';

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
      logger.info(`[SubscriptionQueue] Connected to Redis at ${redisUrl}`);
      redisAvailable = true;
    });

    connection.on('error', () => {
      redisAvailable = false;
    });

    subscriptionQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    subscriptionWorker = new Worker(
      QUEUE_NAME,
      async () => {
        logger.info('[SubscriptionQueue] Executing daily subscription maintenance job');
        return runDailySubscriptionMaintenance();
      },
      { connection, concurrency: 1 }
    );

    subscriptionWorker.on('failed', (job, err) => {
      logger.error(`[SubscriptionQueue] Maintenance job failed: ${err.message}`);
    });

    // Schedule repeatable daily job
    subscriptionQueue.add(
      'daily-subscription-audit',
      {},
      { repeat: { pattern: DAILY_CRON } }
    ).then(() => {
      logger.info(`[SubscriptionQueue] Daily BullMQ job scheduled: ${DAILY_CRON}`);
    }).catch((schErr) => {
      logger.warn(`[SubscriptionQueue] Failed to schedule repeatable BullMQ job: ${schErr.message}`);
    });
  } catch (initErr) {
    logger.warn(`[SubscriptionQueue] Redis init skipped (${initErr.message}). Using in-process fallback.`);
    redisAvailable = false;
  }
}

// ── Graceful In-Process Fallback ───────────────────────────
// Runs once shortly after startup (10s), then every 24 hours
const STARTUP_DELAY_MS = 10 * 1000;
const MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;

setTimeout(async () => {
  try {
    logger.info('[SubscriptionQueue] Running initial startup subscription audit...');
    await runDailySubscriptionMaintenance();
  } catch (err) {
    logger.error(`[SubscriptionQueue] Initial startup audit failed: ${err.message}`);
  }
}, STARTUP_DELAY_MS);

inProcessInterval = setInterval(async () => {
  try {
    logger.info('[SubscriptionQueue] Running in-process periodic subscription maintenance...');
    await runDailySubscriptionMaintenance();
  } catch (err) {
    logger.error(`[SubscriptionQueue] Periodic audit failed: ${err.message}`);
  }
}, MAINTENANCE_INTERVAL_MS);

/**
 * Trigger immediate subscription check (for tests or manual admin trigger)
 */
async function triggerImmediateMaintenance() {
  return runDailySubscriptionMaintenance();
}

/**
 * Graceful shutdown
 */
async function closeSubscriptionQueue() {
  if (inProcessInterval) clearInterval(inProcessInterval);
  if (subscriptionWorker) await subscriptionWorker.close();
  if (subscriptionQueue) await subscriptionQueue.close();
}

module.exports = {
  triggerImmediateMaintenance,
  closeSubscriptionQueue,
  isRedisAvailable: () => redisAvailable,
};
