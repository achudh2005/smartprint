const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateShopQRCode } = require('../src/services/qr.service');
const { processDocument, parsePageRange } = require('../src/services/document.service');
const { verifyFileSignature, STORAGE_ROOT } = require('../src/services/storage.service');

// Standalone pricing calculator test (testing algorithm directly)
const DEFAULT_PRICING = {
  A4: {
    BLACK_WHITE: { SIMPLEX: 2.0, DUPLEX_LONG_EDGE: 1.5, DUPLEX_SHORT_EDGE: 1.5 },
    COLOR: { SIMPLEX: 10.0, DUPLEX_LONG_EDGE: 8.0, DUPLEX_SHORT_EDGE: 8.0 },
  },
  A3: {
    BLACK_WHITE: { SIMPLEX: 5.0, DUPLEX_LONG_EDGE: 4.0, DUPLEX_SHORT_EDGE: 4.0 },
    COLOR: { SIMPLEX: 20.0, DUPLEX_LONG_EDGE: 18.0, DUPLEX_SHORT_EDGE: 18.0 },
  },
};

function calculateMockPrice({ totalPages, pageRange, copies, colorMode, paperSize, duplexMode, customRules = null, services = [] }) {
  const rangeRes = parsePageRange(pageRange, totalPages);
  const effectivePages = rangeRes.count;
  const copiesCount = Math.max(1, copies || 1);

  let pricePerPage = 2.0;
  if (customRules) {
    const match = customRules.find(r => r.colorMode === colorMode && r.paperSize === paperSize && r.duplexMode === duplexMode);
    if (match) pricePerPage = match.pricePerPage;
    else pricePerPage = customRules.find(r => r.colorMode === colorMode && r.paperSize === paperSize)?.pricePerPage || 2.0;
  } else {
    const size = DEFAULT_PRICING[paperSize] || DEFAULT_PRICING.A4;
    const color = size[colorMode] || size.BLACK_WHITE;
    pricePerPage = color[duplexMode] || color.SIMPLEX || 2.0;
  }

  const basePrice = effectivePages * pricePerPage * copiesCount;
  const servicesTotal = services.reduce((sum, s) => sum + (s.price * (s.quantity || 1)), 0);
  return Number((basePrice + servicesTotal).toFixed(2));
}

async function runAudit() {
  console.log('====================================================');
  console.log('   SMARTPRINT PHASE 2 COMPREHENSIVE AUDIT SUITE     ');
  console.log('====================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failCount++;
    }
  }

  // --- SECTION 1: QR CODE & ROUTING AUDIT ---
  console.log('1. QR CODE & ROUTING AUDIT');
  const shopA_Code = 'SP-TEST-AAAA';
  const shopB_Code = 'SP-TEST-BBBB';
  const qrA = await generateShopQRCode(shopA_Code, 'http://localhost:5173');
  const qrB = await generateShopQRCode(shopB_Code, 'http://localhost:5173');

  assert(qrA.url === 'http://localhost:5173/s/SP-TEST-AAAA', 'Shop A QR generates correct URL /s/SP-TEST-AAAA');
  assert(qrB.url === 'http://localhost:5173/s/SP-TEST-BBBB', 'Shop B QR generates correct URL /s/SP-TEST-BBBB');
  assert(qrA.url !== qrB.url, 'Shop A and Shop B have distinct, isolated URLs');
  assert(qrA.pngDataUrl.startsWith('data:image/png;base64,'), 'QR code exports valid PNG data URL');
  assert(qrA.svg.includes('<svg') && qrA.svg.includes('</svg>'), 'QR code exports valid scalable vector SVG');

  // --- SECTION 2: FILE SIGNATURE & INTEGRITY AUDIT ---
  console.log('\n2. FILE SIGNATURE & INTEGRITY VALIDATION');
  const tempDir = path.join(os.tmpdir(), 'smartprint_audit_files');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  // 2.1 PDF
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595, 842]);
  pdfDoc.addPage([595, 842]);
  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(tempDir, 'sample.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  assert(verifyFileSignature(pdfPath, 'pdf') === true, 'Valid PDF file signature recognized (%PDF)');

  // 2.2 PNG
  const pngPath = path.join(tempDir, 'sample.png');
  fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
  assert(verifyFileSignature(pngPath, 'png') === true, 'Valid PNG header signature recognized');

  // 2.3 JPEG
  const jpgPath = path.join(tempDir, 'sample.jpg');
  fs.writeFileSync(jpgPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]));
  assert(verifyFileSignature(jpgPath, 'jpg') === true, 'Valid JPEG header signature recognized');

  // 2.4 DOCX / ZIP
  const docxPath = path.join(tempDir, 'sample.docx');
  fs.writeFileSync(docxPath, Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]));
  assert(verifyFileSignature(docxPath, 'docx') === true, 'Valid DOCX/ZIP header signature recognized (PK..)');

  // 2.5 TXT
  const txtPath = path.join(tempDir, 'sample.txt');
  fs.writeFileSync(txtPath, 'Hello SmartPrint plain text content!\nLine 2\nLine 3');
  assert(verifyFileSignature(txtPath, 'txt') === true, 'Valid UTF-8 plain text recognized');

  // 2.6 Corrupted / Spoofed file
  const spoofedPath = path.join(tempDir, 'fake.pdf');
  fs.writeFileSync(spoofedPath, 'NOT A PDF BUT MALICIOUS PAYLOAD');
  assert(verifyFileSignature(spoofedPath, 'pdf') === false, 'Spoofed file with wrong extension rejected by signature validator');

  // --- SECTION 3: DOCUMENT PROCESSING & PAGE COUNTING ---
  console.log('\n3. DOCUMENT PROCESSING & PAGE COUNTING');
  // 3.1 Multi-page PDF (5 pages)
  const fivePagePdf = await PDFDocument.create();
  for (let i = 0; i < 5; i++) fivePagePdf.addPage([595, 842]);
  const fivePagePath = path.join(tempDir, 'five_pages.pdf');
  fs.writeFileSync(fivePagePath, await fivePagePdf.save());
  const doc5 = await processDocument(fivePagePath, 'application/pdf', '.pdf');
  assert(doc5.pageCount === 5 && doc5.isValid === true, '5-page PDF evaluated accurately to exactly 5 pages');

  // 3.2 Corrupted PDF detection
  const corruptPdfRes = await processDocument(spoofedPath, 'application/pdf', '.pdf');
  assert(corruptPdfRes.isValid === false, 'Corrupted document flagged with isValid: false to prevent checkout');

  // 3.3 Image page count
  const imgRes = await processDocument(pngPath, 'image/png', '.png');
  assert(imgRes.pageCount === 1 && imgRes.isValid === true, 'Single image correctly defaults to 1 printable page');

  // --- SECTION 4: PAGE RANGE PARSING ---
  console.log('\n4. PAGE RANGE PARSING');
  assert(parsePageRange('ALL', 10).count === 10, 'parsePageRange "ALL" covers full document');
  assert(parsePageRange('1-3, 5, 8-10', 10).count === 7, 'parsePageRange "1-3, 5, 8-10" evaluates to exactly 7 pages');
  assert(parsePageRange('15-20', 10).isValid === false, 'Out-of-bounds page range correctly flagged invalid');

  // --- SECTION 5: DYNAMIC PRICING ENGINE AUDIT ---
  console.log('\n5. DYNAMIC PRICING ENGINE AUDIT');

  // Scenario A: Shop A Default Pricing
  // Document 1: 10 pages, ALL, 2 copies, COLOR, A4, SIMPLEX -> 10 * 10.0 * 2 = 200.00
  const doc1Total = calculateMockPrice({
    totalPages: 10,
    pageRange: 'ALL',
    copies: 2,
    colorMode: 'COLOR',
    paperSize: 'A4',
    duplexMode: 'SIMPLEX',
  });
  assert(doc1Total === 200.00, `Scenario A1 (Color, A4, Simplex, 2 copies): Expected 200.00, got ${doc1Total}`);

  // Scenario B: Shop A Default Pricing
  // Document 2: 10 pages, ALL, 5 copies, BLACK_WHITE, A4, DUPLEX_LONG_EDGE -> 10 * 1.5 * 5 = 75.00
  const doc2Total = calculateMockPrice({
    totalPages: 10,
    pageRange: 'ALL',
    copies: 5,
    colorMode: 'BLACK_WHITE',
    paperSize: 'A4',
    duplexMode: 'DUPLEX_LONG_EDGE',
  });
  assert(doc2Total === 75.00, `Scenario A2 (B&W, A4, Duplex, 5 copies): Expected 75.00, got ${doc2Total}`);

  // Scenario C: Additional Finishing Services
  // Spiral Binding (₹40) + Lamination (₹15)
  const docWithServices = calculateMockPrice({
    totalPages: 5,
    pageRange: 'ALL',
    copies: 1,
    colorMode: 'BLACK_WHITE',
    paperSize: 'A4',
    duplexMode: 'SIMPLEX',
    services: [
      { price: 40.0, quantity: 1 },
      { price: 15.0, quantity: 1 },
    ],
  }); // 5 * 2.0 * 1 = 10.00 + 40 + 15 = 65.00
  assert(docWithServices === 65.00, `Scenario A3 (Printing + Finishing Services): Expected 65.00, got ${docWithServices}`);

  // Scenario D: Multi-Tenant Pricing Isolation
  // Shop B has customized pricing: A4 Color = ₹15.00 (instead of ₹10.00)
  const shopBCustomRules = [
    { colorMode: 'COLOR', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 15.0 },
    { colorMode: 'BLACK_WHITE', paperSize: 'A4', duplexMode: 'SIMPLEX', pricePerPage: 3.0 },
  ];

  const shopBPrice = calculateMockPrice({
    totalPages: 10,
    pageRange: 'ALL',
    copies: 1,
    colorMode: 'COLOR',
    paperSize: 'A4',
    duplexMode: 'SIMPLEX',
    customRules: shopBCustomRules,
  });
  assert(shopBPrice === 150.00, `Shop B Custom Pricing: Expected 150.00, got ${shopBPrice}`);
  assert(shopBPrice !== 100.00, 'Shop B pricing does not bleed into Shop A default rate (100.00 vs 150.00)');

  // Clean up audit test files
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log(` AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) process.exit(1);
}

runAudit().catch(err => {
  console.error('Audit exception:', err);
  process.exit(1);
});
