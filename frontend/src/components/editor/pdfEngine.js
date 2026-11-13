import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Setup same-origin pdf.js worker URL to avoid CORS/CSP issues in production
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

// Track cached PDF.js document to avoid re-parsing 50+ page PDFs on every click
let cachedPdfDoc = null;
let cachedPdfBytes = null;
let currentRenderTask = null;

export async function getPdfJsDocument(pdfBytes) {
  if (cachedPdfDoc && cachedPdfBytes === pdfBytes) {
    return cachedPdfDoc;
  }
  const data = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@6.5.438/cmaps/',
    cMapPacked: true,
  });
  cachedPdfDoc = await loadingTask.promise;
  cachedPdfBytes = pdfBytes;
  return cachedPdfDoc;
}

export function invalidatePdfJsCache() {
  cachedPdfDoc = null;
  cachedPdfBytes = null;
}

/**
 * Load raw arrayBuffer into pdf-lib PDFDocument
 * If it's an image, wraps it into a 1-page PDF
 */
export async function loadPdfDocument(arrayBuffer, mimeType = 'application/pdf') {
  invalidatePdfJsCache();
  if (mimeType.startsWith('image/')) {
    const pdfDoc = await PDFDocument.create();
    let embeddedImg;
    if (mimeType.includes('png')) {
      embeddedImg = await pdfDoc.embedPng(arrayBuffer);
    } else {
      embeddedImg = await pdfDoc.embedJpg(arrayBuffer);
    }
    const page = pdfDoc.addPage([embeddedImg.width, embeddedImg.height]);
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: embeddedImg.width,
      height: embeddedImg.height,
    });
    const bytes = await pdfDoc.save();
    return {
      pdfDoc,
      bytes,
      isImageConverted: true,
      pageCount: 1,
    };
  }

  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    pdfDoc,
    bytes: new Uint8Array(arrayBuffer),
    isImageConverted: false,
    pageCount: pdfDoc.getPageCount(),
  };
}

/**
 * Render a single page via pdf.js onto a target canvas and extract its text items
 */
export async function renderPdfPage(pdfBytes, pageNumber, canvas, scale = 1.0) {
  if (!canvas || !pdfBytes) return null;

  // Cancel in-flight render to avoid "Cannot use the same canvas during multiple render() operations"
  if (currentRenderTask) {
    try {
      await currentRenderTask.cancel();
    } catch (_) {}
    currentRenderTask = null;
  }

  const pdf = await getPdfJsDocument(pdfBytes);
  const safePageNum = Math.min(Math.max(1, pageNumber), pdf.numPages);
  const page = await pdf.getPage(safePageNum);

  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  const renderTask = page.render(renderContext);
  currentRenderTask = renderTask;

  try {
    await renderTask.promise;
  } catch (err) {
    if (err?.name === 'RenderingCancelledException') {
      return null;
    }
    console.error('[pdfEngine] Page render error:', err);
    throw err;
  } finally {
    if (currentRenderTask === renderTask) {
      currentRenderTask = null;
    }
  }

  // Extract text layer with bounding boxes for click-to-edit, markup snapping, and search
  const textContent = await page.getTextContent();
  const textItems = [];

  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
    const width = item.width * scale;
    const height = (item.height ? item.height * scale : fontHeight) || fontHeight;
    const x = tx[4];
    const y = tx[5] - height;

    textItems.push({
      str: item.str,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.max(8, width),
      height: Math.max(8, height),
      fontSize: fontHeight,
      fontName: item.fontName,
      dir: item.dir,
    });
  }

  return {
    viewport,
    textItems,
    originalWidth: viewport.width / scale,
    originalHeight: viewport.height / scale,
  };
}

/**
 * Render a small thumbnail of a PDF page onto a thumbnail canvas
 */
export async function renderPdfThumbnail(pdfBytes, pageNumber, canvas) {
  if (!canvas || !pdfBytes) return;
  try {
    const pdf = await getPdfJsDocument(pdfBytes);
    if (pageNumber > pdf.numPages || pageNumber < 1) return;
    const page = await pdf.getPage(pageNumber);
    const unscaled = page.getViewport({ scale: 1.0 });
    const targetW = 96;
    const scale = targetW / unscaled.width;
    const viewport = page.getViewport({ scale });

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
  } catch (_) {}
}

/**
 * Detect AcroForm fields in the PDF document
 */
export async function detectFormFields(pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    if (!form) return [];

    const fields = form.getFields();
    return fields.map((f) => {
      const type = f.constructor.name;
      const name = f.getName();
      let value = '';
      try {
        if (type.includes('TextField')) value = f.getText() || '';
        else if (type.includes('CheckBox')) value = f.isChecked();
        else if (type.includes('Dropdown')) value = f.getSelected() || '';
        else if (type.includes('OptionList')) value = f.getSelected() || [];
        else if (type.includes('RadioGroup')) value = f.getSelected() || '';
      } catch (_) {}

      return {
        name,
        type,
        value,
      };
    });
  } catch (err) {
    console.debug('[Forms] No form fields detected or error reading form:', err.message);
    return [];
  }
}

/**
 * Embed safe Standard Font helper for pdf-lib
 */
export async function resolvePdfFont(pdfDoc, fontFamily = 'Helvetica', isBold = false, isItalic = false) {
  const family = (fontFamily || '').toLowerCase();
  if (family.includes('times')) {
    if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
    if (isBold) return await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    if (isItalic) return await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
    return await pdfDoc.embedFont(StandardFonts.TimesRoman);
  }
  if (family.includes('courier')) {
    if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.CourierBoldOblique);
    if (isBold) return await pdfDoc.embedFont(StandardFonts.CourierBold);
    if (isItalic) return await pdfDoc.embedFont(StandardFonts.CourierOblique);
    return await pdfDoc.embedFont(StandardFonts.Courier);
  }
  // Default to Helvetica
  if (isBold && isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
  if (isBold) return await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  if (isItalic) return await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  return await pdfDoc.embedFont(StandardFonts.Helvetica);
}

/**
 * Convert Hex Color (e.g. #0E7490) to pdf-lib rgb(r, g, b)
 */
export function hexToRgb(hex = '#000000') {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

/**
 * Bake all annotations, redactions, pages, forms, watermarks, and page numbers into a final PDF
 */
export async function bakeFinalPdf(originalBytes, editSession) {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const {
    pageOrder = null,
    deletedPages = [],
    rotations = {},
    crops = {},
    annotationsByPage = {},
    watermark = null,
    pageNumbering = null,
    formValues = {},
    redactionsByPage = {},
  } = editSession;

  // 1. Fill AcroForms if updated
  if (Object.keys(formValues).length > 0) {
    try {
      const form = pdfDoc.getForm();
      if (form) {
        for (const [fieldName, val] of Object.entries(formValues)) {
          try {
            const field = form.getField(fieldName);
            const type = field.constructor.name;
            if (type.includes('TextField')) field.setText(String(val || ''));
            else if (type.includes('CheckBox')) {
              if (val) field.check();
              else field.uncheck();
            } else if (type.includes('Dropdown') && val) {
              field.select(val);
            } else if (type.includes('RadioGroup') && val) {
              field.select(val);
            }
          } catch (fErr) {
            console.debug(`[FormFill] Skipped field ${fieldName}:`, fErr.message);
          }
        }
      }
    } catch (_) {}
  }

  // 2. Process Page Order, Duplications, Insertions
  let totalPages = pdfDoc.getPageCount();

  // Handle deletions in reverse index order
  const toDelete = [...deletedPages].sort((a, b) => b - a);
  for (const idx of toDelete) {
    if (idx >= 0 && idx < pdfDoc.getPageCount() && pdfDoc.getPageCount() > 1) {
      pdfDoc.removePage(idx);
    }
  }

  totalPages = pdfDoc.getPageCount();
  const pages = pdfDoc.getPages();

  // 3. Apply Page-Specific Edits
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i];
    const pageNum = i + 1;
    const { width: pageW, height: pageH } = page.getSize();

    // 3a. Rotation
    const pageRot = rotations[pageNum] || 0;
    if (pageRot !== 0) {
      const currentRot = page.getRotation().angle;
      page.setRotation(degrees((currentRot + pageRot) % 360));
    }

    // 3b. Crop
    const crop = crops[pageNum];
    if (crop) {
      page.setCropBox(crop.x, pageH - crop.y - crop.height, crop.width, crop.height);
    }

    // 3c. True Redactions: permanently draw solid black rectangle over the region
    const pageRedactions = redactionsByPage[pageNum] || [];
    for (const r of pageRedactions) {
      // PDF coordinates are (0,0) at bottom-left
      const pdfY = pageH - r.y - r.height;
      page.drawRectangle({
        x: r.x,
        y: Math.max(0, pdfY),
        width: r.width,
        height: r.height,
        color: rgb(0, 0, 0),
        opacity: 1,
      });
    }

    // 3d. Annotations & Edits for this page
    const items = annotationsByPage[pageNum] || [];
    for (const item of items) {
      const pdfY = pageH - item.y - (item.height || 0);

      // (A) Text Masking & Replacement ("Edit Text")
      if (item.type === 'text_mask') {
        const bgRgb = hexToRgb(item.bgColor || '#FFFFFF');
        page.drawRectangle({
          x: item.x,
          y: Math.max(0, pdfY),
          width: item.width,
          height: item.height,
          color: bgRgb,
          opacity: 1,
        });

        if (item.replacementText && item.replacementText.trim()) {
          const font = await resolvePdfFont(pdfDoc, item.fontFamily, item.isBold, item.isItalic);
          const textColor = hexToRgb(item.color || '#000000');
          page.drawText(item.replacementText, {
            x: item.x + 2,
            y: Math.max(0, pdfY + 2),
            size: item.fontSize || 12,
            font,
            color: textColor,
          });
        }
      }

      // (B) Added New Text Box
      else if (item.type === 'text') {
        if (item.text && item.text.trim()) {
          if (item.hasBackground) {
            const bgRgb = hexToRgb(item.bgColor || '#FFFFFF');
            page.drawRectangle({
              x: item.x,
              y: Math.max(0, pdfY),
              width: item.width || 120,
              height: item.height || 24,
              color: bgRgb,
              opacity: 1,
            });
          }
          const font = await resolvePdfFont(pdfDoc, item.fontFamily, item.isBold, item.isItalic);
          const textColor = hexToRgb(item.color || '#000000');
          page.drawText(item.text, {
            x: item.x,
            y: Math.max(0, pdfY),
            size: item.fontSize || 12,
            font,
            color: textColor,
          });
        }
      }

      // (C) Shapes: Rectangle, Ellipse, Line, Arrow
      else if (item.type === 'rectangle') {
        const strokeColor = hexToRgb(item.strokeColor || '#0E7490');
        const fillColor = item.fillColor ? hexToRgb(item.fillColor) : undefined;
        page.drawRectangle({
          x: item.x,
          y: Math.max(0, pdfY),
          width: item.width,
          height: item.height,
          borderColor: strokeColor,
          borderWidth: item.strokeWidth || 2,
          color: fillColor,
          opacity: item.opacity || 1,
        });
      }

      else if (item.type === 'ellipse') {
        const strokeColor = hexToRgb(item.strokeColor || '#0E7490');
        const fillColor = item.fillColor ? hexToRgb(item.fillColor) : undefined;
        page.drawEllipse({
          x: item.x + (item.width / 2),
          y: Math.max(0, pdfY + (item.height / 2)),
          xScale: item.width / 2,
          yScale: item.height / 2,
          borderColor: strokeColor,
          borderWidth: item.strokeWidth || 2,
          color: fillColor,
          opacity: item.opacity || 1,
        });
      }

      else if (item.type === 'line' || item.type === 'arrow') {
        const strokeColor = hexToRgb(item.strokeColor || '#0E7490');
        page.drawLine({
          start: { x: item.x, y: pageH - item.y },
          end: { x: item.endX || (item.x + item.width), y: pageH - (item.endY || (item.y + item.height)) },
          color: strokeColor,
          thickness: item.strokeWidth || 2,
          opacity: item.opacity || 1,
        });
      }

      // (D) Highlighting / Underline / Strikethrough
      else if (item.type === 'highlight') {
        const highlightColor = hexToRgb(item.color || '#FEF08A');
        page.drawRectangle({
          x: item.x,
          y: Math.max(0, pdfY),
          width: item.width,
          height: item.height,
          color: highlightColor,
          opacity: item.opacity || 0.45,
        });
      }

      else if (item.type === 'underline') {
        const color = hexToRgb(item.color || '#EF4444');
        page.drawLine({
          start: { x: item.x, y: Math.max(0, pdfY) },
          end: { x: item.x + item.width, y: Math.max(0, pdfY) },
          color,
          thickness: item.strokeWidth || 1.5,
        });
      }

      else if (item.type === 'strikethrough') {
        const color = hexToRgb(item.color || '#EF4444');
        const midY = pdfY + (item.height / 2);
        page.drawLine({
          start: { x: item.x, y: Math.max(0, midY) },
          end: { x: item.x + item.width, y: Math.max(0, midY) },
          color,
          thickness: item.strokeWidth || 1.5,
        });
      }

      // (E) Stamp: Approved, Confidential, Draft, Paid, Void, Custom
      else if (item.type === 'stamp') {
        const stampColor = hexToRgb(item.color || '#DC2626');
        const stampText = (item.text || 'APPROVED').toUpperCase();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const stampW = item.width || 140;
        const stampH = item.height || 40;

        page.drawRectangle({
          x: item.x,
          y: Math.max(0, pdfY),
          width: stampW,
          height: stampH,
          borderColor: stampColor,
          borderWidth: 2.5,
          opacity: 0.9,
        });

        page.drawText(stampText, {
          x: item.x + 12,
          y: Math.max(0, pdfY + 10),
          size: 16,
          font,
          color: stampColor,
          opacity: 0.9,
        });
      }

      // (F) Image or Signature embedding
      else if ((item.type === 'image' || item.type === 'signature') && item.dataUrl) {
        try {
          const rawBase64 = item.dataUrl.split(',')[1];
          const imgBytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
          let embeddedImg;
          if (item.dataUrl.includes('image/png') || item.type === 'signature') {
            embeddedImg = await pdfDoc.embedPng(imgBytes);
          } else {
            embeddedImg = await pdfDoc.embedJpg(imgBytes);
          }

          page.drawImage(embeddedImg, {
            x: item.x,
            y: Math.max(0, pdfY),
            width: item.width || embeddedImg.width,
            height: item.height || embeddedImg.height,
            opacity: item.opacity || 1,
          });
        } catch (imgErr) {
          console.warn('[Bake] Failed to embed image/signature item:', imgErr);
        }
      }

      // (G) Sticky Note Comment
      else if (item.type === 'sticky_note') {
        // Draw visual pin icon indicator on page
        const noteColor = hexToRgb(item.color || '#F59E0B');
        page.drawRectangle({
          x: item.x,
          y: Math.max(0, pdfY),
          width: 18,
          height: 18,
          color: noteColor,
          borderWidth: 1,
          borderColor: rgb(0.2, 0.2, 0.2),
        });
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        page.drawText('!', {
          x: item.x + 6,
          y: Math.max(0, pdfY + 4),
          size: 12,
          font,
          color: rgb(1, 1, 1),
        });
      }
    }

    // 4. Global Watermark across all pages
    if (watermark && watermark.enabled && watermark.text) {
      const wmColor = hexToRgb(watermark.color || '#94A3B8');
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const wmText = watermark.text.trim();
      const fontSize = watermark.fontSize || 48;
      const opacity = watermark.opacity || 0.2;
      const angle = watermark.angle || -45;

      page.drawText(wmText, {
        x: pageW / 4,
        y: pageH / 2,
        size: fontSize,
        font,
        color: wmColor,
        opacity,
        rotate: degrees(angle),
      });
    }

    // 5. Global Page Numbering
    if (pageNumbering && pageNumbering.enabled) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const startNum = pageNumbering.startNumber || 1;
      const currentNumber = startNum + i;
      const totalCount = startNum + totalPages - 1;
      const formatStr = pageNumbering.format === 'X_OF_Y'
        ? `Page ${currentNumber} of ${totalCount}`
        : `${currentNumber}`;

      const fontSize = pageNumbering.fontSize || 10;
      const fontColor = hexToRgb(pageNumbering.color || '#64748B');

      let numX = pageW / 2 - 25; // default center
      let numY = 25; // default bottom

      if (pageNumbering.position === 'BOTTOM_LEFT') { numX = 36; numY = 25; }
      else if (pageNumbering.position === 'BOTTOM_RIGHT') { numX = pageW - 80; numY = 25; }
      else if (pageNumbering.position === 'TOP_CENTER') { numX = pageW / 2 - 25; numY = pageH - 30; }
      else if (pageNumbering.position === 'TOP_RIGHT') { numX = pageW - 80; numY = pageH - 30; }

      page.drawText(formatStr, {
        x: numX,
        y: numY,
        size: fontSize,
        font,
        color: fontColor,
      });
    }
  }

  const finalBytes = await pdfDoc.save();
  return finalBytes;
}

/**
 * Insert a blank page into the PDF at the given position
 */
export async function insertBlankPageInPdf(pdfBytes, position = 'AFTER_CURRENT', currentPage = 1) {
  invalidatePdfJsCache();
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const insertIndex = position === 'BEFORE_CURRENT' ? Math.max(0, currentPage - 1) : Math.min(pageCount, currentPage);

  let width = 595.28;
  let height = 841.89;
  if (pageCount > 0) {
    const refPage = pdfDoc.getPage(Math.min(currentPage - 1, pageCount - 1));
    const size = refPage.getSize();
    width = size.width;
    height = size.height;
  }

  pdfDoc.insertPage(insertIndex, [width, height]);
  const newBytes = await pdfDoc.save();
  return {
    bytes: newBytes,
    pageCount: pdfDoc.getPageCount(),
    newCurrentPage: insertIndex + 1,
  };
}

/**
 * Duplicate a specific page in the PDF
 */
export async function duplicatePageInPdf(pdfBytes, pageNumber = 1) {
  invalidatePdfJsCache();
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageIndex = Math.max(0, Math.min(pdfDoc.getPageCount() - 1, pageNumber - 1));
  const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
  pdfDoc.insertPage(pageIndex + 1, copiedPage);
  const newBytes = await pdfDoc.save();
  return {
    bytes: newBytes,
    pageCount: pdfDoc.getPageCount(),
    newCurrentPage: pageIndex + 2,
  };
}

/**
 * Delete a specific page from the PDF
 */
export async function deletePageInPdf(pdfBytes, pageNumber = 1) {
  invalidatePdfJsCache();
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  if (pdfDoc.getPageCount() <= 1) {
    throw new Error('Cannot delete the only page in the document.');
  }
  const pageIndex = Math.max(0, Math.min(pdfDoc.getPageCount() - 1, pageNumber - 1));
  pdfDoc.removePage(pageIndex);
  const newBytes = await pdfDoc.save();
  const newPageCount = pdfDoc.getPageCount();
  const newCurrentPage = Math.min(pageNumber, newPageCount);
  return {
    bytes: newBytes,
    pageCount: newPageCount,
    newCurrentPage,
  };
}

/**
 * Reorder pages by moving fromIndex to toIndex
 */
export async function reorderPagesInPdf(pdfBytes, fromIndex, toIndex) {
  invalidatePdfJsCache();
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  if (fromIndex < 0 || fromIndex >= pageCount || toIndex < 0 || toIndex >= pageCount) {
    return { bytes: pdfBytes, pageCount, newCurrentPage: fromIndex + 1 };
  }
  const newDoc = await PDFDocument.create();
  const indices = Array.from({ length: pageCount }, (_, i) => i);
  const [moved] = indices.splice(fromIndex, 1);
  indices.splice(toIndex, 0, moved);

  const copiedPages = await newDoc.copyPages(pdfDoc, indices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }
  const newBytes = await newDoc.save();
  return {
    bytes: newBytes,
    pageCount: newDoc.getPageCount(),
    newCurrentPage: toIndex + 1,
  };
}

/**
 * Merge secondary PDF bytes into base PDF bytes
 */
export async function mergePdfBytes(basePdfBytes, secondaryPdfBytes, position = 'AFTER_CURRENT', currentPage = 1) {
  invalidatePdfJsCache();
  const baseDoc = await PDFDocument.load(basePdfBytes, { ignoreEncryption: true });
  const otherDoc = await PDFDocument.load(secondaryPdfBytes, { ignoreEncryption: true });

  const copiedPages = await baseDoc.copyPages(otherDoc, otherDoc.getPageIndices());
  let insertIndex;
  if (position === 'BEFORE_CURRENT') {
    insertIndex = Math.max(0, currentPage - 1);
  } else if (position === 'AFTER_CURRENT') {
    insertIndex = Math.min(baseDoc.getPageCount(), currentPage);
  } else {
    insertIndex = baseDoc.getPageCount();
  }

  for (let i = 0; i < copiedPages.length; i++) {
    baseDoc.insertPage(insertIndex + i, copiedPages[i]);
  }

  const newBytes = await baseDoc.save();
  return {
    bytes: newBytes,
    pageCount: baseDoc.getPageCount(),
    insertedCount: copiedPages.length,
    newCurrentPage: insertIndex + 1,
  };
}

