const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const logger = require('../utils/logger');

/**
 * Inspect a document and calculate its page count
 *
 * @param {string} absoluteFilePath
 * @param {string} mimeType
 * @param {string} extension
 * @returns {Promise<{ pageCount: number, isValid: boolean, error?: string }>}
 */
async function processDocument(absoluteFilePath, mimeType, extension) {
  const ext = extension.toLowerCase().replace('.', '');

  try {
    // 1. PDF Documents
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      const fileBytes = await fs.promises.readFile(absoluteFilePath);
      try {
        const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        return {
          pageCount: Math.max(1, pageCount),
          isValid: true,
        };
      } catch (pdfErr) {
        // Fallback: regex page counter for non-standard or compressed PDFs
        try {
          const raw = fileBytes.toString('binary');
          const matches = raw.match(/\/Type\s*\/Page(?=[\s\/>])/g);
          if (matches && matches.length > 0) {
            return {
              pageCount: matches.length,
              isValid: true,
            };
          }
          // If file starts with %PDF, accept it with minimum 1 page
          if (fileBytes.slice(0, 5).toString('ascii').startsWith('%PDF')) {
            return {
              pageCount: 1,
              isValid: true,
            };
          }
        } catch (_) {}

        logger.warn(`Failed to parse PDF ${absoluteFilePath}: ${pdfErr.message}`);
        // If file has non-zero size, still allow printing with 1 page minimum
        if (fileBytes.length > 32) {
          return {
            pageCount: 1,
            isValid: true,
          };
        }

        return {
          pageCount: 1,
          isValid: false,
          error: `Corrupted or unreadable PDF: ${pdfErr.message}`,
        };
      }
    }

    // 2. Images (JPG, JPEG, PNG)
    if (['jpg', 'jpeg', 'png'].includes(ext) || mimeType.startsWith('image/')) {
      return {
        pageCount: 1,
        isValid: true,
      };
    }

    // 3. Plain Text Documents
    if (ext === 'txt' || mimeType === 'text/plain') {
      const content = await fs.promises.readFile(absoluteFilePath, 'utf8');
      const lines = content.split('\n').length;
      // Estimate ~50 lines per standard printed page
      const pageCount = Math.max(1, Math.ceil(lines / 50));
      return {
        pageCount,
        isValid: true,
      };
    }

    // 4. Office Documents (DOC, DOCX, PPT, PPTX)
    if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
      // In Phase 2, office docs are accepted and queued for standard print
      // Default to conservative 1 page minimum estimate until conversion
      return {
        pageCount: 1,
        isValid: true,
      };
    }

    return {
      pageCount: 1,
      isValid: true,
    };
  } catch (err) {
    logger.error(`Error processing document ${absoluteFilePath}: ${err.message}`);
    return {
      pageCount: 1,
      isValid: false,
      error: err.message,
    };
  }
}

/**
 * Parse page range string (e.g. "1-5, 8, 11-14", "all")
 * Returns array of 1-based page indices
 */
function parsePageRange(pageRangeStr, totalPages) {
  if (!pageRangeStr || pageRangeStr.trim().toLowerCase() === 'all') {
    return { count: totalPages, isValid: true };
  }

  const selectedPages = new Set();
  const parts = pageRangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start || start > totalPages) {
        return { count: totalPages, isValid: false, error: `Invalid page range: ${part}` };
      }

      for (let i = start; i <= Math.min(end, totalPages); i++) {
        selectedPages.add(i);
      }
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        return { count: totalPages, isValid: false, error: `Invalid page number: ${part}` };
      }
      selectedPages.add(page);
    }
  }

  const count = selectedPages.size;
  return {
    count: count > 0 ? count : totalPages,
    isValid: count > 0,
  };
}

module.exports = {
  processDocument,
  parsePageRange,
};
