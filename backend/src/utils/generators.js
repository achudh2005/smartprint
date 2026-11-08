// ============================================================
// Shop Code Generator
// ============================================================
const { customAlphabet } = require('nanoid');

// 8-character alphanumeric shop code, uppercase
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

// 5-character alphanumeric order suffix
const generateOrderSuffix = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 5);

/**
 * Generate a unique shop code like "SP-XXXX-YYYY"
 */
function generateShopCode() {
  const code = generateCode();
  return `SP-${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Generate an order number like "ORD-20261107-XXXXX"
 */
function generateOrderNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${date}-${generateOrderSuffix()}`;
}

module.exports = { generateShopCode, generateOrderNumber };
