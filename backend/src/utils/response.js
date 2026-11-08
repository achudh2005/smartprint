// ============================================================
// API Response Helpers & Global BigInt Serializer
// ============================================================

// Prevent "Do not know how to serialize a BigInt" across all JSON responses
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    const int = Number(this);
    return Number.isSafeInteger(int) ? int : this.toString();
  };
}

/**
 * Send a success response.
 */
const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send an error response.
 */
const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Send a created response (201).
 */
const sendCreated = (res, data = {}, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

module.exports = { sendSuccess, sendError, sendCreated };
