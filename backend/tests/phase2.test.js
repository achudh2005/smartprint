const { PDFDocument } = require('pdf-lib');
const { processDocument, parsePageRange } = require('../src/services/document.service');
const { generateShopQRCode } = require('../src/services/qr.service');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('=== PHASE 2 COMPREHENSIVE AUTOMATED VERIFICATION ===');

  // Test 1: Page Range Parser
  console.log('1. Testing Page Range Parsing...');
  const range1 = parsePageRange('1-5, 8, 10-12', 20);
  console.log('   - parsePageRange("1-5, 8, 10-12", 20) -> Count:', range1.count);
  if (range1.count !== 9) throw new Error(`Expected 9 pages, got ${range1.count}`);

  const rangeAll = parsePageRange('ALL', 12);
  console.log('   - parsePageRange("ALL", 12) -> Count:', rangeAll.count);
  if (rangeAll.count !== 12) throw new Error(`Expected 12 pages, got ${rangeAll.count}`);

  // Test 2: PDF Document Page Count Inspection
  console.log('2. Testing PDF Document Page Counting with pdf-lib...');
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([595, 842]); // A4 Page 1
  pdfDoc.addPage([595, 842]); // A4 Page 2
  pdfDoc.addPage([595, 842]); // A4 Page 3
  pdfDoc.addPage([595, 842]); // A4 Page 4
  const pdfBytes = await pdfDoc.save();

  const tempPdfPath = path.join(__dirname, 'test_sample.pdf');
  fs.writeFileSync(tempPdfPath, pdfBytes);

  const docRes = await processDocument(tempPdfPath, 'application/pdf', '.pdf');
  console.log('   - PDF Processing Result:', docRes);
  fs.unlinkSync(tempPdfPath);

  if (docRes.pageCount !== 4 || !docRes.isValid) {
    throw new Error('PDF page counting failed');
  }

  // Test 3: Corrupt File Handling
  console.log('3. Testing Corrupt File Detection...');
  const corruptPath = path.join(__dirname, 'corrupt.pdf');
  fs.writeFileSync(corruptPath, 'THIS IS NOT A VALID PDF FILE CONTENT %%%');
  const corruptRes = await processDocument(corruptPath, 'application/pdf', '.pdf');
  console.log('   - Corrupt PDF Handling:', corruptRes);
  fs.unlinkSync(corruptPath);
  if (corruptRes.isValid) {
    throw new Error('Corrupt file was incorrectly marked valid');
  }

  // Test 4: QR Code Generation
  console.log('4. Testing QR Code Generation...');
  const qr = await generateShopQRCode('SP-TEST-9999', 'http://localhost:5173');
  console.log('   - Customer Portal URL:', qr.url);
  console.log('   - PNG Data URL prefix:', qr.pngDataUrl.slice(0, 30) + '...');
  console.log('   - SVG tag present:', qr.svg.includes('<svg'));
  if (!qr.svg.includes('<svg') || !qr.pngDataUrl.startsWith('data:image/png')) {
    throw new Error('Invalid QR output');
  }

  console.log('\n✅ ALL PHASE 2 ENGINE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
