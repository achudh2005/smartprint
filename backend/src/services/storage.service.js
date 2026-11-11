const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { encryptFileStream, decryptFileStream } = require('./encryption.service');

const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_PATH || './uploads');

// Ensure root directory exists
if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

/**
 * File magic byte signatures
 */
const MAGIC_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4E, 0x47], // \x89PNG
  jpg: [0xFF, 0xD8, 0xFF],       // JPEG
  jpeg: [0xFF, 0xD8, 0xFF],      // JPEG
  zip: [0x50, 0x4B, 0x03, 0x04], // PK.. (DOCX, PPTX, XLSX)
};

/**
 * Verify file signature against its extension on plaintext bytes
 */
function verifyFileSignature(filePath, extension) {
  try {
    const ext = extension.toLowerCase().replace(/^\./, '');
    
    // For plain text, check if it contains readable characters (not binary)
    if (ext === 'txt') {
      const buffer = Buffer.alloc(512);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
      fs.closeSync(fd);
      // Ensure no null bytes
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0x00) return false;
      }
      return true;
    }

    // PDF files per ISO 32000 specification must contain %PDF within the first 1024 bytes
    if (ext === 'pdf') {
      const buffer = Buffer.alloc(1024);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
      fs.closeSync(fd);
      return buffer.subarray(0, bytesRead).includes(Buffer.from('%PDF'));
    }

    const sig = MAGIC_SIGNATURES[ext] || (['docx', 'pptx', 'xlsx'].includes(ext) ? MAGIC_SIGNATURES.zip : null);

    if (!sig) {
      // If no signature is defined (e.g. legacy doc), verify non-empty
      const stats = fs.statSync(filePath);
      return stats.size > 0;
    }

    const buffer = Buffer.alloc(sig.length);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, sig.length, 0);
    fs.closeSync(fd);

    for (let i = 0; i < sig.length; i++) {
      if (buffer[i] !== sig[i]) {
        return false;
      }
    }
    return true;
  } catch (err) {
    logger.error(`Error verifying file signature for ${filePath}: ${err.message}`);
    return false;
  }
}

/**
 * Save an uploaded file to secure shop/session directory with
 * streaming AES-256-GCM envelope encryption at rest.
 *
 * Execution flow:
 * 1. Verify file signature on the original plaintext temp file FIRST.
 * 2. Pipe temp file through AES-256-GCM cipher into destination path (streaming).
 * 3. Delete the original plaintext temporary file.
 * 4. Return storage path and encryption metadata for FileEncryption record.
 */
async function saveUploadedFile({ shopId, sessionToken, file }) {
  const shopDir = path.join(STORAGE_ROOT, `shop_${shopId}`, `session_${sessionToken.slice(0, 16)}`);
  await fs.promises.mkdir(shopDir, { recursive: true });

  const ext = path.extname(file.originalname).toLowerCase();

  // 1. Verify file signature on the original plaintext temp file FIRST
  const isValidSignature = verifyFileSignature(file.path, ext);
  if (!isValidSignature) {
    await fs.promises.unlink(file.path).catch(() => {});
    const err = new Error('File validation failed: File content does not match its extension or is corrupted.');
    err.statusCode = 400;
    throw err;
  }

  const fileUuid = crypto.randomUUID();
  const safeFilename = `${fileUuid}${ext}`;
  const targetPath = path.join(shopDir, safeFilename);

  // 2. Stream-encrypt temp file into target location with AES-256-GCM envelope encryption
  let encryptionInfo;
  try {
    const readStream = fs.createReadStream(file.path);
    const writeStream = fs.createWriteStream(targetPath);
    encryptionInfo = await encryptFileStream(readStream, writeStream);
  } catch (encErr) {
    await fs.promises.unlink(targetPath).catch(() => {});
    await fs.promises.unlink(file.path).catch(() => {});
    logger.error(`Envelope encryption failed for uploaded file: ${encErr.message}`);
    throw encErr;
  } finally {
    // 3. Delete original plaintext temporary file from multer temp directory
    await fs.promises.unlink(file.path).catch(() => {});
  }

  return {
    storagePath: path.relative(process.cwd(), targetPath),
    absolutePath: targetPath,
    filename: safeFilename,
    originalName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    extension: ext,
    encryption: encryptionInfo,
  };
}

/**
 * Read file stream safely.
 * If the file was encrypted at rest with envelope encryption, transparently
 * decrypts the stream on the fly via AES-256-GCM decipher.
 * If legacy unencrypted file, returns plain read stream (backward compatible).
 *
 * @param {string} relativePath - Relative path in STORAGE_ROOT
 * @param {object|null} explicitEncryptionInfo - Optional preloaded FileEncryption object
 * @returns {Promise<import('stream').Readable>}
 */
async function getFileStream(relativePath, explicitEncryptionInfo = null) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
  const rel = path.relative(STORAGE_ROOT, absolutePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Access denied: Invalid storage path traversal.');
  }
  if (!fs.existsSync(absolutePath)) {
    const err = new Error('File not found in storage.');
    err.statusCode = 404;
    throw err;
  }

  // Look up encryption metadata from database if not explicitly passed
  let encInfo = explicitEncryptionInfo;
  if (!encInfo) {
    try {
      const { prisma } = require('../database/client');
      const normalizedPath = relativePath.replace(/\\/g, '/');
      const windowsPath = relativePath.replace(/\//g, '\\');
      const orderFile = await prisma.orderFile.findFirst({
        where: {
          OR: [
            { storagePath: relativePath },
            { storagePath: normalizedPath },
            { storagePath: windowsPath },
          ],
        },
        include: { fileEncryption: true },
      });
      if (orderFile?.fileEncryption) {
        encInfo = orderFile.fileEncryption;
      }
    } catch (dbErr) {
      logger.warn(`Could not query FileEncryption for ${relativePath}: ${dbErr.message}`);
    }
  }

  const fileReadStream = fs.createReadStream(absolutePath);

  // If encrypted, decrypt on the fly via streaming decipher
  if (encInfo) {
    return decryptFileStream(fileReadStream, encInfo);
  }

  // Legacy plaintext fallback: returns plain stream directly
  return fileReadStream;
}

/**
 * Delete a stored file from storage disk
 */
async function deleteStoredFile(relativePath) {
  try {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const rel = path.relative(STORAGE_ROOT, absolutePath);
    if (!rel.startsWith('..') && !path.isAbsolute(rel) && fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  } catch (err) {
    logger.warn(`Failed to delete file ${relativePath}: ${err.message}`);
  }
}

module.exports = {
  STORAGE_ROOT,
  verifyFileSignature,
  saveUploadedFile,
  getFileStream,
  deleteStoredFile,
};
