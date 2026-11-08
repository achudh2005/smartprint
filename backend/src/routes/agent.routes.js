/**
 * Print Agent Routes
 * Used by the Windows Print Agent to authenticate, sync printers, poll jobs,
 * report driver statuses, and download files.
 */
const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printer.controller');

// Agent Authentication & Handshake
router.post('/auth', printerController.agentAuth);

// Printer Discovery & Sync
router.post('/printers/sync', printerController.agentSyncPrinters);

// Pending Print Jobs Polling
router.get('/jobs/pending', printerController.agentGetPendingJobs);

// Job Status Updates (DOWNLOADED, SUBMITTED_TO_OS, DRIVER_COMPLETED, FAILED)
router.patch('/jobs/:jobId/status', printerController.agentUpdateJobStatus);

// Secure File Download for Printing
router.get('/jobs/:jobId/download', printerController.agentDownloadFile);

module.exports = router;
