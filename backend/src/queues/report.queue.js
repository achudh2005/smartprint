/**
 * BullMQ Finance Report Queue
 * Sends weekly (every Monday 07:00) and monthly (1st of month 07:00) reports.
 * Follows the exact pattern from expiry.queue.js — same Redis connection setup,
 * same graceful in-process fallback.
 */
'use strict';

const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');
const reportService = require('../services/report.service');

const QUEUE_NAME = 'smartprint-finance-reports';
let reportQueue = null;
let reportWorker = null;
let redisAvailable = false;

const redisUrl = process.env.REDIS_URL;
const isRedisExplicitlyEnabled = Boolean(redisUrl) && process.env.REDIS_ENABLED !== 'false';

// ── Job handler ───────────────────────────────────────────
async function processReportJob(job) {
  const { period } = job.data; // 'Weekly' | 'Monthly'
  logger.info(`[ReportQueue] Starting ${period} report job (attempt ${job.attemptsMade + 1})`);

  let startDate, endDate;
  if (period === 'Weekly') {
    ({ startDate, endDate } = reportService.getPrevWeekRange());
  } else {
    ({ startDate, endDate } = reportService.getPrevMonthRange());
  }

  await reportService.sendReportsForAllShops(period, startDate, endDate);
  logger.info(`[ReportQueue] ${period} report job completed.`);
}

// ── BullMQ repeatable job patterns ───────────────────────
// Weekly: every Monday at 07:00 IST (Asia/Kolkata = UTC+5:30, so 01:30 UTC)
const WEEKLY_CRON  = '30 1 * * 1'; // Monday 07:00 IST
// Monthly: 1st of month at 07:00 IST
const MONTHLY_CRON = '30 1 1 * *'; // 1st of month 07:00 IST

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
      logger.info(`[ReportQueue] Connected to Redis at ${redisUrl}`);
      redisAvailable = true;
    });
    connection.on('error', () => { redisAvailable = false; });

    reportQueue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Add repeatable jobs (idempotent — BullMQ deduplicates by jobId)
    reportQueue.add(
      'weekly-reports',
      { period: 'Weekly' },
      { repeat: { cron: WEEKLY_CRON }, jobId: 'weekly-finance-report' }
    ).catch((e) => logger.warn(`[ReportQueue] Could not schedule weekly job: ${e.message}`));

    reportQueue.add(
      'monthly-reports',
      { period: 'Monthly' },
      { repeat: { cron: MONTHLY_CRON }, jobId: 'monthly-finance-report' }
    ).catch((e) => logger.warn(`[ReportQueue] Could not schedule monthly job: ${e.message}`));

    reportWorker = new Worker(QUEUE_NAME, processReportJob, { connection, concurrency: 1 });

    reportWorker.on('completed', (job) => {
      logger.info(`[ReportQueue] Job completed: ${job.name}`);
    });
    reportWorker.on('failed', (job, err) => {
      logger.error(`[ReportQueue] Job failed: ${job?.name} – ${err.message}`);
    });

    logger.info('[ReportQueue] BullMQ report queue initialized. Weekly + Monthly jobs scheduled.');
  } catch (initErr) {
    logger.warn(`[ReportQueue] Redis init failed (${initErr.message}). Reports will not send automatically — use the manual endpoint.`);
    redisAvailable = false;
  }
} else {
  logger.info('[ReportQueue] Redis not enabled. Finance reports can be triggered manually via API.');
}

/**
 * Trigger a report run immediately (called by the manual API endpoint).
 * Works with or without Redis.
 * @param {'Weekly'|'Monthly'} period
 */
async function triggerReportNow(period) {
  if (redisAvailable && reportQueue) {
    const job = await reportQueue.add(`manual-${period.toLowerCase()}-report`, { period }, {
      jobId: `manual-report-${Date.now()}`,
    });
    logger.info(`[ReportQueue] Enqueued manual ${period} report job: ${job.id}`);
    return { type: 'bullmq', jobId: job.id };
  }

  // Fallback: run inline (blocks the HTTP response — acceptable for manual trigger)
  logger.info(`[ReportQueue] Running manual ${period} report inline (no Redis).`);
  let startDate, endDate;
  if (period === 'Weekly') {
    ({ startDate, endDate } = reportService.getPrevWeekRange());
  } else {
    ({ startDate, endDate } = reportService.getPrevMonthRange());
  }
  await reportService.sendReportsForAllShops(period, startDate, endDate);
  return { type: 'inline' };
}

async function closeQueue() {
  if (reportWorker) await reportWorker.close();
  if (reportQueue) await reportQueue.close();
}

module.exports = {
  triggerReportNow,
  closeQueue,
  isRedisAvailable: () => redisAvailable,
};
