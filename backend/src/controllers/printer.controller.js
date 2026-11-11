/**
 * Printer Controller
 * Handles shop owner printer management and Windows Print Agent API requests
 */
const printerService = require('../services/printer.service');
const { sendSuccess, sendError } = require('../utils/response');
const { prisma } = require('../database/client');
const storageService = require('../services/storage.service');
const { assertDocumentNotExpired } = require('../services/expiry.service');

// ── Shop Owner Dashboard Endpoints ─────────────────────────

const getShopPrinters = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await printerService.getShopPrinters(shopId, req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const createPrinter = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const printer = await printerService.createPrinter(shopId, req.user.id, req.body);
    return sendSuccess(res, printer, 'Printer registered successfully.', 201);
  } catch (err) {
    next(err);
  }
};

const updatePrinter = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const printerId = parseInt(req.params.printerId, 10);
    const printer = await printerService.updatePrinter(shopId, req.user.id, printerId, req.body);
    return sendSuccess(res, printer, 'Printer updated successfully.');
  } catch (err) {
    next(err);
  }
};

const generateAgentToken = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await printerService.generateShopAgentToken(shopId, req.user.id);
    return sendSuccess(res, data, 'Agent token generated successfully.');
  } catch (err) {
    next(err);
  }
};

const dispatchDirectPrint = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const { orderId, fileId, printerId } = req.body;
    const result = await printerService.dispatchDirectPrint(shopId, req.user.id, {
      orderId: parseInt(orderId, 10),
      fileId: fileId ? parseInt(fileId, 10) : undefined,
      printerId: printerId ? parseInt(printerId, 10) : undefined,
    });
    return sendSuccess(res, result, 'Print job dispatched to printer queue.');
  } catch (err) {
    next(err);
  }
};

const getPrintJobs = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const data = await printerService.getShopPrintJobs(shopId, req.user.id, req.query);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
};

const retryPrintJob = async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const jobId = parseInt(req.params.jobId, 10);
    const newJob = await printerService.retryPrintJob(shopId, req.user.id, jobId);
    return sendSuccess(res, newJob, 'Print job requeued successfully.');
  } catch (err) {
    next(err);
  }
};

// ── Windows Print Agent Protocol Endpoints ──────────────────

const agentAuth = async (req, res, next) => {
  try {
    const { shopCode, agentToken } = req.body;
    const authResult = await printerService.authenticateAgent(shopCode, agentToken);
    return sendSuccess(res, authResult, 'Agent authenticated successfully.');
  } catch (err) {
    next(err);
  }
};

const agentSyncPrinters = async (req, res, next) => {
  try {
    const { shopCode, agentToken, printers } = req.body;
    const auth = await printerService.authenticateAgent(shopCode, agentToken);
    const synced = await printerService.syncAgentPrinters(auth.shopId, printers || []);
    return sendSuccess(res, { syncedCount: synced.length, printers: synced });
  } catch (err) {
    next(err);
  }
};

const agentGetPendingJobs = async (req, res, next) => {
  try {
    const { shopCode, agentToken } = req.query;
    const auth = await printerService.authenticateAgent(shopCode, agentToken);
    const jobs = await printerService.getAgentPendingJobs(auth.shopId);
    return sendSuccess(res, { jobs });
  } catch (err) {
    next(err);
  }
};

const agentUpdateJobStatus = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const { shopCode, agentToken, status, errorMessage, agentNotes } = req.body;
    const auth = await printerService.authenticateAgent(shopCode, agentToken);
    const updated = await printerService.updateAgentJobStatus(auth.shopId, jobId, {
      status,
      errorMessage,
      agentNotes,
    });
    return sendSuccess(res, updated, 'Job status updated.');
  } catch (err) {
    next(err);
  }
};

const agentDownloadFile = async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);
    const { shopCode, agentToken } = req.query;
    const auth = await printerService.authenticateAgent(shopCode, agentToken);

    const job = await prisma.printJob.findFirst({
      where: { id: jobId, file: { order: { shopId: auth.shopId } } },
      include: {
        file: {
          include: { fileEncryption: true },
        },
      },
    });

    if (!job) {
      return sendError(res, 'Print job not found.', 404);
    }

    assertDocumentNotExpired(job.file);

    res.setHeader('Content-Type', job.file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(job.file.originalName)}"`);

    const stream = await storageService.getFileStream(job.file.storagePath, job.file.fileEncryption);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getShopPrinters,
  createPrinter,
  updatePrinter,
  generateAgentToken,
  dispatchDirectPrint,
  getPrintJobs,
  retryPrintJob,
  agentAuth,
  agentSyncPrinters,
  agentGetPendingJobs,
  agentUpdateJobStatus,
  agentDownloadFile,
};
