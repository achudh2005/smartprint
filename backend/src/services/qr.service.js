const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * Generate QR code in multiple formats for a shop
 *
 * @param {string} shopCode
 * @param {string} baseUrl
 * @returns {Promise<{ url: string, pngDataUrl: string, svg: string }>}
 */
async function generateShopQRCode(shopCode, baseUrl) {
  const customerUrl = `${baseUrl.replace(/\/$/, '')}/s/${shopCode}`;

  try {
    const pngDataUrl = await QRCode.toDataURL(customerUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff',
      },
    });

    const svg = await QRCode.toString(customerUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return {
      url: customerUrl,
      pngDataUrl,
      svg,
    };
  } catch (err) {
    logger.error(`Failed to generate QR code for shop ${shopCode}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  generateShopQRCode,
};
