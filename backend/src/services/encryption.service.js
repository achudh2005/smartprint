// ============================================================
// SmartPrint – Envelope Encryption Service (AES-256-GCM)
//
// Protects sensitive customer-uploaded documents (e.g. ID proofs,
// Aadhaar cards, contracts, personal files) at rest.
//
// Envelope Architecture:
// 1. Data Key (DEK): Unique 256-bit random key generated per file.
// 2. Master Key (KEK): 256-bit AES_MASTER_KEY protects DEKs.
// 3. Streaming Only: Cipher/decipher operates via Node.js streams
//    using AES-256-GCM authenticated encryption (never buffers).
// ============================================================
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const logger = require('../utils/logger');

const ALGORITHM = 'aes-256-gcm';
const KEY_VERSION = 1;
const GCM_IV_LENGTH_BYTES = 12; // Standard 96-bit IV for GCM
const DATA_KEY_LENGTH_BYTES = 32; // 256-bit data key

// Ephemeral development fallback key (used only if NODE_ENV !== 'production' and AES_MASTER_KEY is unset)
const DEV_FALLBACK_KEY_BASE64 = '3ItAVrLV+zSimt7flayAvUcVSz7LjFPVtEHcvs85sWY=';

/**
 * Validates master key presence and 256-bit length at server startup.
 * Fails fast with a fatal error in production if misconfigured.
 */
function validateMasterKey() {
  const rawKey = process.env.AES_MASTER_KEY;

  if (!rawKey || !rawKey.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: AES_MASTER_KEY environment variable is missing. ' +
        'Envelope encryption at rest requires a 32-byte base64 master key in production. ' +
        'Generate one using: openssl rand -base64 32'
      );
    }
    logger.warn('⚠️ [Encryption] AES_MASTER_KEY not set in development. Using development fallback key. Set AES_MASTER_KEY before deploying to production!');
    return;
  }

  const keyBuffer = Buffer.from(rawKey.trim(), 'base64');
  if (keyBuffer.length !== DATA_KEY_LENGTH_BYTES) {
    throw new Error(
      `FATAL: AES_MASTER_KEY must decode to exactly 32 bytes (256 bits), but got ${keyBuffer.length} bytes. ` +
      'Generate a valid 32-byte base64 key using: openssl rand -base64 32'
    );
  }
}

/**
 * Retrieves the master key buffer (KEK)
 * @returns {Buffer} 32-byte Buffer
 */
function getMasterKey() {
  const rawKey = process.env.AES_MASTER_KEY;
  if (!rawKey || !rawKey.trim()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: AES_MASTER_KEY is not configured in production.');
    }
    return Buffer.from(DEV_FALLBACK_KEY_BASE64, 'base64');
  }

  const buf = Buffer.from(rawKey.trim(), 'base64');
  if (buf.length !== DATA_KEY_LENGTH_BYTES) {
    throw new Error(`Invalid AES_MASTER_KEY length: expected 32 bytes, received ${buf.length}`);
  }
  return buf;
}

/**
 * Generates an ephemeral 256-bit data encryption key (DEK) for a file
 * @returns {Buffer}
 */
function generateDataKey() {
  return crypto.randomBytes(DATA_KEY_LENGTH_BYTES);
}

/**
 * Wraps (encrypts) the ephemeral data key with the master key using AES-256-GCM
 * @param {Buffer} dataKey - 32-byte raw DEK
 * @returns {{ wrappedKey: string, keyIv: string, keyAuthTag: string }} Base64 encoded strings
 */
function wrapKey(dataKey) {
  const masterKey = getMasterKey();
  const keyIv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, keyIv);

  const wrappedKey = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  const keyAuthTag = cipher.getAuthTag();

  return {
    wrappedKey: wrappedKey.toString('base64'),
    keyIv: keyIv.toString('base64'),
    keyAuthTag: keyAuthTag.toString('base64'),
  };
}

/**
 * Unwraps (decrypts) a wrapped data key using the master key and verifies its auth tag
 * @param {{ wrappedKey: string, keyIv: string, keyAuthTag: string }} encKeyInfo
 * @returns {Buffer} Decrypted 32-byte data key
 */
function unwrapKey({ wrappedKey, keyIv, keyAuthTag }) {
  if (!wrappedKey || !keyIv || !keyAuthTag) {
    throw new Error('Invalid key unwrap request: missing wrappedKey, keyIv, or keyAuthTag.');
  }

  const masterKey = getMasterKey();
  const ivBuf = Buffer.from(keyIv, 'base64');
  const tagBuf = Buffer.from(keyAuthTag, 'base64');
  const cipherTextBuf = Buffer.from(wrappedKey, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, ivBuf);
  decipher.setAuthTag(tagBuf);

  try {
    const dataKey = Buffer.concat([decipher.update(cipherTextBuf), decipher.final()]);
    if (dataKey.length !== DATA_KEY_LENGTH_BYTES) {
      throw new Error(`Unwrapped data key length mismatch: got ${dataKey.length} bytes`);
    }
    return dataKey;
  } catch (err) {
    throw new Error(`Data key unwrapping failed (authentication tag mismatch or corrupted key): ${err.message}`);
  }
}

/**
 * Streams plaintext data from readStream, encrypts it on the fly with a new
 * ephemeral AES-256-GCM data key, writes ciphertext to writeStream, and returns
 * the envelope encryption metadata once the pipeline finishes.
 *
 * @param {import('stream').Readable} readStream - Plaintext source stream
 * @param {import('stream').Writable} writeStream - Ciphertext destination stream
 * @returns {Promise<{ keyVersion: number, wrappedKey: string, keyIv: string, keyAuthTag: string, fileIv: string, fileAuthTag: string, algorithm: string }>}
 */
async function encryptFileStream(readStream, writeStream) {
  const dataKey = generateDataKey();
  const keyWrap = wrapKey(dataKey);
  const fileIv = crypto.randomBytes(GCM_IV_LENGTH_BYTES);

  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, fileIv);

  // Pipe plaintext through cipher directly into writeStream (streaming only, zero full-file buffering)
  await pipeline(readStream, cipher, writeStream);

  // GCM auth tag is available after stream pipeline completes
  const fileAuthTag = cipher.getAuthTag();

  return {
    keyVersion: KEY_VERSION,
    wrappedKey: keyWrap.wrappedKey,
    keyIv: keyWrap.keyIv,
    keyAuthTag: keyWrap.keyAuthTag,
    fileIv: fileIv.toString('base64'),
    fileAuthTag: fileAuthTag.toString('base64'),
    algorithm: ALGORITHM,
  };
}

/**
 * Unwraps the file data key and returns a readable decipher stream that
 * decrypts the ciphertext stream on the fly.
 *
 * @param {import('stream').Readable} readStream - Ciphertext stream from disk
 * @param {{ wrappedKey: string, keyIv: string, keyAuthTag: string, fileIv: string, fileAuthTag: string }} encInfo
 * @returns {import('stream').Readable} Plaintext stream
 */
function decryptFileStream(readStream, encInfo) {
  const dataKey = unwrapKey(encInfo);
  const fileIv = Buffer.from(encInfo.fileIv, 'base64');
  const fileAuthTag = Buffer.from(encInfo.fileAuthTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, fileIv);
  decipher.setAuthTag(fileAuthTag);

  // Forward any errors from readStream to decipher
  readStream.on('error', (err) => {
    decipher.destroy(err);
  });

  return readStream.pipe(decipher);
}

module.exports = {
  ALGORITHM,
  KEY_VERSION,
  validateMasterKey,
  getMasterKey,
  generateDataKey,
  wrapKey,
  unwrapKey,
  encryptFileStream,
  decryptFileStream,
};
