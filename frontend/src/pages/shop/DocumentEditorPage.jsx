import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Eye, Edit3, PenTool, ShieldX, Layers, PlusCircle, CheckSquare,
  Undo2, Redo2, RotateCcw, Download, Printer, ArrowLeft, Loader2,
  Lock, Save, AlertCircle, FileText
} from 'lucide-react';
import { Button, Spinner, Badge } from '../../components/ui';
import api from '../../lib/api';
import toast from 'react-hot-toast';

import {
  loadPdfDocument, renderPdfPage, renderPdfThumbnail, detectFormFields, bakeFinalPdf,
  insertBlankPageInPdf, duplicatePageInPdf, deletePageInPdf, reorderPagesInPdf, mergePdfBytes
} from '../../components/editor/pdfEngine';
import {
  saveEditSession, getEditSession, clearEditSession
} from '../../components/editor/idbStorage';

import ViewMenu from '../../components/editor/ViewMenu';
import EditTextMenu from '../../components/editor/EditTextMenu';
import DrawMarkupMenu from '../../components/editor/DrawMarkupMenu';
import RedactionMenu from '../../components/editor/RedactionMenu';
import PagesMenu from '../../components/editor/PagesMenu';
import InsertMenu from '../../components/editor/InsertMenu';
import FormsMenu from '../../components/editor/FormsMenu';
import PageThumbnailsSidebar from '../../components/editor/PageThumbnailsSidebar';
import SignaturePadModal from '../../components/editor/SignaturePadModal';
import WatermarkModal from '../../components/editor/WatermarkModal';
import PageNumberModal from '../../components/editor/PageNumberModal';
import CropModal from '../../components/editor/CropModal';
import SplitModal from '../../components/editor/SplitModal';
import MergePdfModal from '../../components/editor/MergePdfModal';
import StickyNoteModal from '../../components/editor/StickyNoteModal';
import TextSearchOverlay from '../../components/editor/TextSearchOverlay';

export default function DocumentEditorPage() {
  const { shopId, orderId, filePublicId } = useParams();
  const navigate = useNavigate();

  // Document & File state
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [fileMeta, setFileMeta] = useState(null);
  const [rawPdfBytes, setRawPdfBytes] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageViewport, setPageViewport] = useState(null);
  const [textItems, setTextItems] = useState([]);

  // View state
  const [zoom, setZoom] = useState(1.15);
  const [canvasTheme, setCanvasTheme] = useState('light');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  // Active Menu Tabs & Tools
  const [activeTab, setActiveTab] = useState('EDIT_TEXT');
  const [activeTool, setActiveTool] = useState('SELECT');

  // Tool Configurations
  const [textConfig, setTextConfig] = useState({
    fontFamily: 'Helvetica',
    fontSize: 14,
    isBold: false,
    isItalic: false,
    color: '#000000',
    bgColor: '#FFFFFF',
  });

  const [markupConfig, setMarkupConfig] = useState({
    color: '#EF4444',
    strokeWidth: 2,
    opacity: 0.8,
    stampPreset: 'APPROVED',
  });

  // Annotations & Edits per page
  const [annotationsByPage, setAnnotationsByPage] = useState({});
  const [redactionsByPage, setRedactionsByPage] = useState({});
  const [rotations, setRotations] = useState({});
  const [crops, setCrops] = useState({});
  const [watermark, setWatermark] = useState({ enabled: false, text: 'CONFIDENTIAL', opacity: 0.2, angle: -45, fontSize: 48, color: '#94A3B8' });
  const [pageNumbering, setPageNumbering] = useState({ enabled: false, position: 'BOTTOM_CENTER', format: 'X_OF_Y', startNumber: 1 });
  const [detectedFormFields, setDetectedFormFields] = useState([]);
  const [formValues, setFormValues] = useState({});

  // Active inline text editing
  const [activeInlineEditor, setActiveInlineEditor] = useState(null); // { id, x, y, width, height, text }

  // History Undo / Redo
  const [historyStack, setHistoryStack] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isAutosaved, setIsAutosaved] = useState(true);

  // Modals state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);
  const [isPageNumberModalOpen, setIsPageNumberModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [activeStickyNote, setActiveStickyNote] = useState(null);

  // Saving / Printing state
  const [bakingPdf, setBakingPdf] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Canvas Refs
  const pdfCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const isInteractingRef = useRef(false);
  const interactionStartRef = useRef({ x: 0, y: 0 });

  // 1. Load File Data & Raw Bytes
  useEffect(() => {
    let active = true;

    async function initDocument() {
      try {
        setLoadingDoc(true);
        // Fetch raw bytes via preview endpoint
        const res = await api.get(`/shops/${shopId}/files/${filePublicId}/preview`, {
          responseType: 'arraybuffer',
        });

        if (!active) return;

        const mime = res.headers?.['content-type'] || 'application/pdf';
        const docResult = await loadPdfDocument(res.data, mime);

        setRawPdfBytes(docResult.bytes);
        setTotalPages(docResult.pageCount);

        // Detect AcroForms
        const fields = await detectFormFields(docResult.bytes);
        setDetectedFormFields(fields);

        // Fetch file metadata from order
        try {
          const ordRes = await api.get(`/shops/${shopId}/orders/${orderId}`);
          const ord = ordRes.data.data.order;
          const found = (ord.orderFiles || []).find((f) => f.publicId === filePublicId || f.id === Number(filePublicId));
          if (found) setFileMeta(found);
        } catch (_) {}

        // Check IndexedDB for autosaved session
        const savedSession = await getEditSession(filePublicId);
        if (savedSession) {
          if (savedSession.annotationsByPage) setAnnotationsByPage(savedSession.annotationsByPage);
          if (savedSession.redactionsByPage) setRedactionsByPage(savedSession.redactionsByPage);
          if (savedSession.rotations) setRotations(savedSession.rotations);
          if (savedSession.crops) setCrops(savedSession.crops);
          if (savedSession.watermark) setWatermark(savedSession.watermark);
          if (savedSession.pageNumbering) setPageNumbering(savedSession.pageNumbering);
          if (savedSession.formValues) setFormValues(savedSession.formValues);
          toast.success('Restored previous autosaved draft', { icon: '📝' });
        }
      } catch (err) {
        console.error('Failed to load document:', err);
        toast.error('Failed to load document for editing.');
      } finally {
        if (active) setLoadingDoc(false);
      }
    }

    initDocument();
    return () => { active = false; };
  }, [shopId, orderId, filePublicId]);

  // 2. Render Current PDF Page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!rawPdfBytes || !pdfCanvasRef.current) return;
    try {
      const renderResult = await renderPdfPage(rawPdfBytes, currentPage, pdfCanvasRef.current, zoom);
      if (renderResult) {
        setPageViewport(renderResult.viewport);
        setTextItems(renderResult.textItems || []);
      }
    } catch (err) {
      console.error('Page render error:', err);
    }
  }, [rawPdfBytes, currentPage, zoom]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // 3. Autosave to IndexedDB on edits
  useEffect(() => {
    if (!filePublicId || loadingDoc) return;
    setIsAutosaved(false);
    const timer = setTimeout(async () => {
      await saveEditSession(filePublicId, {
        annotationsByPage,
        redactionsByPage,
        rotations,
        crops,
        watermark,
        pageNumbering,
        formValues,
      });
      setIsAutosaved(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [filePublicId, annotationsByPage, redactionsByPage, rotations, crops, watermark, pageNumbering, formValues, loadingDoc]);

  // 4. Record Action for Undo / Redo
  const recordAction = (newAnnotations, newRedactions = redactionsByPage) => {
    const nextState = {
      annotationsByPage: newAnnotations,
      redactionsByPage: newRedactions,
      currentPage,
    };
    const updated = historyStack.slice(0, historyIndex + 1);
    updated.push(nextState);
    setHistoryStack(updated);
    setHistoryIndex(updated.length - 1);
    setAnnotationsByPage(newAnnotations);
    setRedactionsByPage(newRedactions);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyStack[historyIndex - 1];
      setAnnotationsByPage(prev.annotationsByPage);
      setRedactionsByPage(prev.redactionsByPage);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const next = historyStack[historyIndex + 1];
      setAnnotationsByPage(next.annotationsByPage);
      setRedactionsByPage(next.redactionsByPage);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleResetToOriginal = async () => {
    const confirm = window.confirm('Are you sure you want to discard all annotations, redactions, and edits?');
    if (!confirm) return;
    await clearEditSession(filePublicId);
    setAnnotationsByPage({});
    setRedactionsByPage({});
    setRotations({});
    setCrops({});
    setWatermark({ enabled: false, text: 'CONFIDENTIAL', opacity: 0.2, angle: -45, fontSize: 48, color: '#94A3B8' });
    setPageNumbering({ enabled: false, position: 'BOTTOM_CENTER', format: 'X_OF_Y', startNumber: 1 });
    setFormValues({});
    setHistoryStack([]);
    setHistoryIndex(-1);
    toast.success('Document reset to original.');
  };

  // 5. Text Search in Document
  useEffect(() => {
    if (!searchQuery.trim() || textItems.length === 0) {
      setSearchMatches([]);
      setCurrentMatchIdx(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = textItems.filter((t) => t.str.toLowerCase().includes(q));
    setSearchMatches(matches);
    setCurrentMatchIdx(0);
  }, [searchQuery, textItems]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIdx((prev) => (prev + 1) % searchMatches.length);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIdx((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
  };

  // 6. Interactive Canvas / Overlay Click & Drag Handler
  const handleOverlayPointerDown = (e) => {
    if (activeTool === 'SELECT') return;
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    isInteractingRef.current = true;
    interactionStartRef.current = { x, y };

    // (A) Click to place New Text Box
    if (activeTool === 'ADD_TEXT') {
      const newTextItem = {
        id: `text_${Date.now()}`,
        type: 'text',
        x,
        y,
        width: 140,
        height: 28,
        text: 'Type text here',
        fontFamily: textConfig.fontFamily,
        fontSize: textConfig.fontSize,
        isBold: textConfig.isBold,
        isItalic: textConfig.isItalic,
        color: textConfig.color,
        hasBackground: true,
        bgColor: '#FFFFFF',
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), newTextItem];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      setActiveInlineEditor(newTextItem);
      setActiveTool('SELECT');
      return;
    }

    // (B) Click to place Sticky Note
    if (activeTool === 'STICKY_NOTE') {
      const newNote = {
        id: `note_${Date.now()}`,
        type: 'sticky_note',
        x,
        y,
        text: 'Double click to add comment note...',
        color: '#F59E0B',
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), newNote];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      setActiveStickyNote(newNote);
      setActiveTool('SELECT');
      return;
    }

    // (C) Click to place Stamp
    if (activeTool === 'STAMP') {
      const newStamp = {
        id: `stamp_${Date.now()}`,
        type: 'stamp',
        x,
        y,
        width: 140,
        height: 38,
        text: markupConfig.stampPreset || 'APPROVED',
        color: markupConfig.color || '#DC2626',
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), newStamp];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      setActiveTool('SELECT');
      return;
    }
  };

  const handleOverlayPointerUp = (e) => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    const rect = overlayCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const endX = (e.clientX - rect.left) / zoom;
    const endY = (e.clientY - rect.top) / zoom;
    const startX = interactionStartRef.current.x;
    const startY = interactionStartRef.current.y;

    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);

    if (width < 5 && height < 5) return;

    // Redaction Area Marking
    if (activeTool === 'REDACT_AREA') {
      const newRedaction = {
        id: `redact_${Date.now()}`,
        x,
        y,
        width,
        height,
      };
      const pageRedactions = [...(redactionsByPage[currentPage] || []), newRedaction];
      recordAction(annotationsByPage, { ...redactionsByPage, [currentPage]: pageRedactions });
      return;
    }

    // Shapes: Rectangle, Ellipse, Line, Arrow
    if (activeTool.startsWith('SHAPE_')) {
      const shapeType = activeTool.replace('SHAPE_', '').toLowerCase();
      const newShape = {
        id: `shape_${Date.now()}`,
        type: shapeType,
        x,
        y,
        endX,
        endY,
        width,
        height,
        strokeColor: markupConfig.color,
        strokeWidth: markupConfig.strokeWidth,
        opacity: markupConfig.opacity,
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), newShape];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      return;
    }
  };

  // 7. Click on Existing Text item (Mask & Edit / Delete)
  const handleTextItemClick = (t) => {
    if (activeTool === 'MASK_AND_EDIT') {
      const maskItem = {
        id: `mask_${Date.now()}`,
        type: 'text_mask',
        x: t.x / zoom,
        y: t.y / zoom,
        width: t.width / zoom,
        height: t.height / zoom,
        bgColor: '#FFFFFF',
        replacementText: t.str,
        fontSize: Math.round(t.fontSize / zoom),
        fontFamily: textConfig.fontFamily,
        color: textConfig.color,
        isBold: textConfig.isBold,
        isItalic: textConfig.isItalic,
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), maskItem];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      setActiveInlineEditor(maskItem);
      setActiveTool('SELECT');
      toast.success('Text masked. Type replacement in the box.');
    } else if (activeTool === 'DELETE_TEXT') {
      const maskItem = {
        id: `mask_del_${Date.now()}`,
        type: 'text_mask',
        x: t.x / zoom,
        y: t.y / zoom,
        width: t.width / zoom,
        height: t.height / zoom,
        bgColor: '#FFFFFF',
        replacementText: '',
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), maskItem];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
      toast.success('Text erased with background mask.');
    } else if (['HIGHLIGHT', 'UNDERLINE', 'STRIKETHROUGH'].includes(activeTool)) {
      const markupItem = {
        id: `markup_${Date.now()}`,
        type: activeTool.toLowerCase(),
        x: t.x / zoom,
        y: t.y / zoom,
        width: t.width / zoom,
        height: t.height / zoom,
        color: markupConfig.color,
        opacity: activeTool === 'HIGHLIGHT' ? 0.4 : 1.0,
      };
      const pageItems = [...(annotationsByPage[currentPage] || []), markupItem];
      recordAction({ ...annotationsByPage, [currentPage]: pageItems });
    }
  };

  // 8. Page Manipulation Handlers
  const handleInsertBlankPage = async () => {
    if (!rawPdfBytes) return;
    try {
      const res = await insertBlankPageInPdf(rawPdfBytes, 'AFTER_CURRENT', currentPage);
      setRawPdfBytes(res.bytes);
      setTotalPages(res.pageCount);
      setCurrentPage(res.newCurrentPage);
      toast.success('Blank page inserted.');
    } catch (err) {
      toast.error('Failed to insert blank page: ' + err.message);
    }
  };

  const handleDuplicatePage = async (targetPage = currentPage) => {
    if (!rawPdfBytes) return;
    try {
      const res = await duplicatePageInPdf(rawPdfBytes, targetPage);
      setRawPdfBytes(res.bytes);
      setTotalPages(res.pageCount);
      setCurrentPage(res.newCurrentPage);
      toast.success(`Page ${targetPage} duplicated.`);
    } catch (err) {
      toast.error('Failed to duplicate page: ' + err.message);
    }
  };

  const handleDeletePage = async (targetPage = currentPage) => {
    if (!rawPdfBytes) return;
    if (totalPages <= 1) {
      toast.error('Cannot delete the only page in the document.');
      return;
    }
    try {
      const res = await deletePageInPdf(rawPdfBytes, targetPage);
      setRawPdfBytes(res.bytes);
      setTotalPages(res.pageCount);
      setCurrentPage(res.newCurrentPage);
      toast.success(`Page ${targetPage} removed.`);
    } catch (err) {
      toast.error('Failed to delete page: ' + err.message);
    }
  };

  const handleReorderPages = async (fromIndex, toIndex) => {
    if (!rawPdfBytes || fromIndex === toIndex) return;
    try {
      const res = await reorderPagesInPdf(rawPdfBytes, fromIndex, toIndex);
      setRawPdfBytes(res.bytes);
      setTotalPages(res.pageCount);
      setCurrentPage(res.newCurrentPage);
      toast.success(`Page moved from ${fromIndex + 1} to ${toIndex + 1}.`);
    } catch (err) {
      toast.error('Failed to reorder pages: ' + err.message);
    }
  };

  const handleRotatePage = (angle = 90, targetPage = currentPage) => {
    setRotations((prev) => ({
      ...prev,
      [targetPage]: ((prev[targetPage] || 0) + angle) % 360,
    }));
    toast.success(`Page ${targetPage} rotated.`);
  };

  const handleRotateAllPages = (angle = 90) => {
    const nextRot = {};
    for (let i = 1; i <= totalPages; i++) {
      nextRot[i] = ((rotations[i] || 0) + angle) % 360;
    }
    setRotations(nextRot);
    toast.success('All pages rotated.');
  };

  const handleApplyCrop = ({ top, bottom, left, right, applyAll }) => {
    const pageW = pageViewport ? pageViewport.width / zoom : 595;
    const pageH = pageViewport ? pageViewport.height / zoom : 842;
    const cropBox = {
      x: left,
      y: top,
      width: Math.max(50, pageW - left - right),
      height: Math.max(50, pageH - top - bottom),
    };

    if (applyAll) {
      const nextCrops = {};
      for (let i = 1; i <= totalPages; i++) nextCrops[i] = cropBox;
      setCrops(nextCrops);
    } else {
      setCrops((prev) => ({ ...prev, [currentPage]: cropBox }));
    }
    toast.success('Crop margins applied.');
  };

  const handleExtractPages = async (rangeString, action) => {
    try {
      const finalBytes = await bakeFinalPdf(rawPdfBytes, {
        annotationsByPage,
        redactionsByPage,
        rotations,
        crops,
        watermark,
        pageNumbering,
        formValues,
      });

      if (action === 'DOWNLOAD') {
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `[Split_${rangeString.replace(/[^a-zA-Z0-9]/g, '_')}]_${fileMeta?.originalName || 'doc.pdf'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success('Extracted pages downloaded.');
      } else {
        // Upload as new OrderFile
        const formData = new FormData();
        const splitBlob = new Blob([finalBytes], { type: 'application/pdf' });
        formData.append('file', splitBlob, `[Split_${rangeString}] ${fileMeta?.originalName || 'document.pdf'}`);
        formData.append('pageCount', totalPages.toString());

        await api.post(`/shops/${shopId}/orders/${orderId}/files/${filePublicId}/edited`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Extracted pages attached to order as a new document!');
      }
    } catch (err) {
      toast.error('Failed to extract pages: ' + err.message);
    }
  };

  // 9. Bake & Save / Print / Download Handlers
  const handlePrintEditedVersion = async () => {
    setBakingPdf(true);
    try {
      const finalBytes = await bakeFinalPdf(rawPdfBytes, {
        annotationsByPage,
        redactionsByPage,
        rotations,
        crops,
        watermark,
        pageNumbering,
        formValues,
      });

      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', blob, `[Edited] ${fileMeta?.originalName || 'document.pdf'}`);
      formData.append('directPrint', 'true');
      formData.append('pageCount', totalPages.toString());

      const res = await api.post(`/shops/${shopId}/orders/${orderId}/files/${filePublicId}/edited`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Edited document saved and sent to Direct Print queue!');
      await clearEditSession(filePublicId);
    } catch (err) {
      console.error('Print Edited Version failed:', err);
      toast.error(err.response?.data?.message || 'Failed to print edited document.');
    } finally {
      setBakingPdf(false);
    }
  };

  const handleDownloadEditedVersion = async () => {
    if (!fileMeta?.allowDownload) {
      toast.error('Customer has not allowed downloading this file. Use Print Edited Version.');
      return;
    }
    setDownloading(true);
    try {
      const finalBytes = await bakeFinalPdf(rawPdfBytes, {
        annotationsByPage,
        redactionsByPage,
        rotations,
        crops,
        watermark,
        pageNumbering,
        formValues,
      });

      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `[Edited]_${fileMeta?.originalName || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Downloaded edited document.');
    } catch (err) {
      toast.error('Failed to download edited document: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-3">
        <Spinner size="lg" />
        <p className="text-sm font-semibold text-[var(--text)]">Loading SmartPrint Document Editor...</p>
        <p className="text-xs text-[var(--text-muted)]">Preparing canvas and text layer...</p>
      </div>
    );
  }

  const currentPageAnnotations = annotationsByPage[currentPage] || [];
  const currentPageRedactions = redactionsByPage[currentPage] || [];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] select-none text-[var(--text)]">
      {/* ── Top Header Bar ── */}
      <header className="h-14 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            to={`/shops/${shopId}/orders/${orderId}`}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Back to Order"
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-tint)] text-[#0E7490] flex items-center justify-center shrink-0">
              <FileText size={15} strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-display text-xs sm:text-sm font-bold text-[var(--text)] truncate max-w-xs sm:max-w-md">
                {fileMeta?.originalName || 'Document Editor'}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <span>Page {currentPage} of {totalPages}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isAutosaved ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {isAutosaved ? 'Autosaved' : 'Saving draft...'}
                </span>
                <span>•</span>
                <Badge variant={fileMeta?.allowDownload ? 'green' : 'gray'} size="sm">
                  {fileMeta?.allowDownload ? 'Download Allowed' : 'Direct Print Only'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center border border-[var(--border)] rounded-lg bg-[var(--surface-hover)] p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= historyStack.length - 1}
              className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-40"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToOriginal}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center gap-1"
            title="Discard all edits and revert"
          >
            <RotateCcw size={13} strokeWidth={1.75} />
            <span className="hidden md:inline">Reset</span>
          </button>

          {/* Download Edited Version (Gated by allowDownload) */}
          {fileMeta?.allowDownload ? (
            <Button
              variant="secondary"
              size="sm"
              loading={downloading}
              onClick={handleDownloadEditedVersion}
              className="border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-400"
            >
              <Download size={13} strokeWidth={2} />
              <span className="hidden sm:inline">Download Edited</span>
            </Button>
          ) : (
            <div className="relative group inline-block">
              <Button
                variant="secondary"
                size="sm"
                disabled
                className="opacity-50 cursor-not-allowed border-dashed"
              >
                <Lock size={12} strokeWidth={1.75} />
                <span className="hidden sm:inline">Download (Locked)</span>
              </Button>
              <div className="absolute top-full right-0 mt-1.5 hidden group-hover:block z-50 w-56 p-2 text-[11px] leading-tight text-white bg-slate-900 rounded-lg shadow-lg text-center pointer-events-none">
                Customer has not allowed downloading this file. Use Print Edited Version.
              </div>
            </div>
          )}

          {/* Print Edited Version */}
          <Button
            variant="primary"
            size="sm"
            loading={bakingPdf}
            onClick={handlePrintEditedVersion}
            className="shadow-xs"
          >
            <Printer size={13} strokeWidth={2} />
            <span>Print Edited Version</span>
          </Button>
        </div>
      </header>

      {/* ── Menu Navigation Tabs Bar ── */}
      <nav className="bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center gap-1 overflow-x-auto shrink-0 z-20">
        {[
          { id: 'VIEW', label: 'View', icon: Eye },
          { id: 'EDIT_TEXT', label: 'Edit Text', icon: Edit3 },
          { id: 'DRAW_MARKUP', label: 'Draw & Markup', icon: PenTool },
          { id: 'REDACTION', label: 'True Redaction', icon: ShieldX },
          { id: 'PAGES', label: 'Pages', icon: Layers },
          { id: 'INSERT', label: 'Insert', icon: PlusCircle },
          ...(detectedFormFields.length > 0 ? [{ id: 'FORMS', label: 'Forms', icon: CheckSquare }] : []),
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                active
                  ? 'border-[#0E7490] text-[#0E7490] dark:text-[#22D3EE] bg-[var(--surface-hover)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <Icon size={13} strokeWidth={1.75} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Active Tab Secondary Toolbar ── */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-1.5 shrink-0 z-10 shadow-xs min-h-[44px] flex items-center">
        {activeTab === 'VIEW' && (
          <ViewMenu
            zoom={zoom}
            onZoomChange={setZoom}
            canvasTheme={canvasTheme}
            onCanvasThemeToggle={() => setCanvasTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            showSearch={showSearch}
            onToggleSearch={() => setShowSearch((v) => !v)}
            showThumbnails={showThumbnails}
            onToggleThumbnails={() => setShowThumbnails((v) => !v)}
          />
        )}

        {activeTab === 'EDIT_TEXT' && (
          <EditTextMenu
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            textConfig={textConfig}
            onTextConfigChange={(k, v) => setTextConfig((prev) => ({ ...prev, [k]: v }))}
          />
        )}

        {activeTab === 'DRAW_MARKUP' && (
          <DrawMarkupMenu
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            markupConfig={markupConfig}
            onMarkupConfigChange={(k, v) => setMarkupConfig((prev) => ({ ...prev, [k]: v }))}
            onOpenStickyNoteModal={() => setActiveStickyNote({ text: '', color: '#F59E0B' })}
          />
        )}

        {activeTab === 'REDACTION' && (
          <RedactionMenu
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            currentPendingRedactionsCount={currentPageRedactions.length}
            onApplyPendingRedactions={() => toast.success('Redactions permanently applied to this document.')}
            onClearPendingRedactions={() => {
              setRedactionsByPage((prev) => ({ ...prev, [currentPage]: [] }));
              toast('Redaction marks cleared.');
            }}
          />
        )}

        {activeTab === 'PAGES' && (
          <PagesMenu
            currentPage={currentPage}
            totalPages={totalPages}
            onInsertBlankPage={handleInsertBlankPage}
            onOpenMergeModal={() => setIsMergeModalOpen(true)}
            onDuplicatePage={handleDuplicatePage}
            onDeleteCurrentPage={handleDeletePage}
            onRotatePage={(deg) => handleRotatePage(deg)}
            onRotateAllPages={(deg) => handleRotateAllPages(deg)}
            onOpenCropModal={() => setIsCropModalOpen(true)}
            onOpenSplitModal={() => setIsSplitModalOpen(true)}
          />
        )}

        {activeTab === 'INSERT' && (
          <InsertMenu
            onInsertImageFile={(dataUrl) => {
              const newImg = {
                id: `img_${Date.now()}`,
                type: 'image',
                x: 80,
                y: 80,
                width: 160,
                height: 120,
                dataUrl,
              };
              recordAction({
                ...annotationsByPage,
                [currentPage]: [...currentPageAnnotations, newImg],
              });
              toast.success('Image placed. Drag to position.');
            }}
            onOpenSignatureModal={() => setIsSignatureModalOpen(true)}
            onOpenPageNumberModal={() => setIsPageNumberModalOpen(true)}
            onOpenWatermarkModal={() => setIsWatermarkModalOpen(true)}
            hasWatermark={watermark.enabled}
            hasPageNumbers={pageNumbering.enabled}
          />
        )}

        {activeTab === 'FORMS' && (
          <FormsMenu
            detectedFormFields={detectedFormFields}
            formValues={formValues}
            onFormFieldChange={(name, val) => setFormValues((prev) => ({ ...prev, [name]: val }))}
          />
        )}
      </div>

      {/* ── Main Workspace Body (Thumbnails + Canvas Viewport) ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <PageThumbnailsSidebar
            totalPages={totalPages}
            currentPage={currentPage}
            pdfBytes={rawPdfBytes}
            rotations={rotations}
            onSelectPage={setCurrentPage}
            onReorderPages={handleReorderPages}
            onDuplicatePage={handleDuplicatePage}
            onDeletePage={handleDeletePage}
            onRotatePage={(pg, deg) => handleRotatePage(deg, pg)}
          />
        )}

        {/* Text Search Floating Bar */}
        <TextSearchOverlay
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          matchCount={searchMatches.length}
          currentMatchIndex={currentMatchIdx}
          onNextMatch={handleNextMatch}
          onPrevMatch={handlePrevMatch}
        />

        {/* Canvas & Document Viewport */}
        <main
          className={`flex-1 overflow-auto flex items-center justify-center p-8 relative ${
            canvasTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-100 dark:bg-slate-950'
          }`}
        >
          {loadingDoc && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center z-30">
              <Loader2 className="animate-spin text-[#0E7490] mb-2" size={36} />
              <p className="text-sm font-medium text-[var(--text)]">Loading document...</p>
            </div>
          )}

          <div
            className="relative shadow-2xl rounded-sm transition-all bg-white"
            style={{
              transform: `rotate(${rotations[currentPage] || 0}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Background PDF Render Canvas */}
            <canvas ref={pdfCanvasRef} className="block shadow-md" />

            {/* Interactive Annotation & Marking Canvas Overlay */}
            <div
              ref={overlayCanvasRef}
              onPointerDown={handleOverlayPointerDown}
              onPointerUp={handleOverlayPointerUp}
              className={`absolute inset-0 touch-none ${
                activeTool === 'SELECT'
                  ? 'cursor-default'
                  : activeTool === 'MASK_AND_EDIT' || activeTool === 'DELETE_TEXT'
                  ? 'cursor-text'
                  : activeTool === 'REDACT_AREA'
                  ? 'cursor-crosshair'
                  : 'cursor-crosshair'
              }`}
            >
              {/* Text Layer for Mask-and-Replace Click Detection */}
              {textItems.map((t, i) => (
                <div
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTextItemClick(t);
                  }}
                  className={`absolute transition-colors ${
                    activeTool === 'MASK_AND_EDIT'
                      ? 'hover:bg-amber-300/40 cursor-pointer border border-transparent hover:border-amber-400'
                      : activeTool === 'DELETE_TEXT'
                      ? 'hover:bg-rose-400/40 cursor-pointer border border-transparent hover:border-rose-500'
                      : ''
                  }`}
                  style={{
                    left: `${t.x}px`,
                    top: `${t.y}px`,
                    width: `${t.width}px`,
                    height: `${t.height}px`,
                  }}
                />
              ))}

              {/* Search Highlight Highlights */}
              {searchMatches.map((m, mIdx) => (
                <div
                  key={mIdx}
                  className={`absolute pointer-events-none rounded-xs ${
                    mIdx === currentMatchIdx ? 'bg-amber-400/70 ring-2 ring-amber-500' : 'bg-yellow-300/40'
                  }`}
                  style={{
                    left: `${m.x}px`,
                    top: `${m.y}px`,
                    width: `${m.width}px`,
                    height: `${m.height}px`,
                  }}
                />
              ))}

              {/* Rendered Annotations on this page */}
              {currentPageAnnotations.map((item) => {
                if (item.type === 'text_mask') {
                  return (
                    <div
                      key={item.id}
                      className="absolute border border-dashed border-slate-300 flex items-center"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        width: `${item.width * zoom}px`,
                        height: `${item.height * zoom}px`,
                        backgroundColor: item.bgColor || '#FFFFFF',
                      }}
                      onDoubleClick={() => setActiveInlineEditor(item)}
                    >
                      <span
                        className="truncate px-1 select-none font-medium"
                        style={{
                          fontSize: `${(item.fontSize || 12) * zoom}px`,
                          color: item.color || '#000000',
                          fontFamily: item.fontFamily || 'Helvetica',
                        }}
                      >
                        {item.replacementText}
                      </span>
                    </div>
                  );
                }

                if (item.type === 'text') {
                  return (
                    <div
                      key={item.id}
                      className="absolute border border-dashed border-[#0E7490]/50 p-1 rounded cursor-move"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        backgroundColor: item.hasBackground ? item.bgColor : 'transparent',
                      }}
                      onDoubleClick={() => setActiveInlineEditor(item)}
                    >
                      <span
                        style={{
                          fontSize: `${(item.fontSize || 12) * zoom}px`,
                          color: item.color || '#000000',
                          fontFamily: item.fontFamily || 'Helvetica',
                          fontWeight: item.isBold ? 'bold' : 'normal',
                          fontStyle: item.isItalic ? 'italic' : 'normal',
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  );
                }

                if (item.type === 'highlight') {
                  return (
                    <div
                      key={item.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        width: `${item.width * zoom}px`,
                        height: `${item.height * zoom}px`,
                        backgroundColor: item.color || '#FEF08A',
                        opacity: item.opacity || 0.4,
                      }}
                    />
                  );
                }

                if (item.type === 'rectangle') {
                  return (
                    <div
                      key={item.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        width: `${item.width * zoom}px`,
                        height: `${item.height * zoom}px`,
                        borderColor: item.strokeColor || '#0E7490',
                        borderWidth: `${(item.strokeWidth || 2) * zoom}px`,
                        borderStyle: 'solid',
                        opacity: item.opacity || 1,
                      }}
                    />
                  );
                }

                if (item.type === 'stamp') {
                  return (
                    <div
                      key={item.id}
                      className="absolute border-2 font-display font-black tracking-widest text-center px-3 py-1 uppercase rounded-md shadow-xs select-none"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        borderColor: item.color || '#DC2626',
                        color: item.color || '#DC2626',
                        transform: 'rotate(-5deg)',
                      }}
                    >
                      {item.text}
                    </div>
                  );
                }

                if (item.type === 'sticky_note') {
                  return (
                    <div
                      key={item.id}
                      onClick={() => setActiveStickyNote(item)}
                      className="absolute w-6 h-6 rounded-md shadow-md flex items-center justify-center cursor-pointer text-white font-bold text-xs hover:scale-110 transition-transform"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        backgroundColor: item.color || '#F59E0B',
                      }}
                      title={item.text}
                    >
                      !
                    </div>
                  );
                }

                if ((item.type === 'image' || item.type === 'signature') && item.dataUrl) {
                  return (
                    <img
                      key={item.id}
                      src={item.dataUrl}
                      alt="Annotation"
                      className="absolute border border-dashed border-slate-400 cursor-move"
                      style={{
                        left: `${item.x * zoom}px`,
                        top: `${item.y * zoom}px`,
                        width: `${(item.width || 120) * zoom}px`,
                        height: `${(item.height || 60) * zoom}px`,
                      }}
                    />
                  );
                }

                return null;
              })}

              {/* True Redaction solid black boxes */}
              {currentPageRedactions.map((r) => (
                <div
                  key={r.id}
                  className="absolute bg-black flex items-center justify-center text-white text-[9px] font-bold select-none"
                  style={{
                    left: `${r.x * zoom}px`,
                    top: `${r.y * zoom}px`,
                    width: `${r.width * zoom}px`,
                    height: `${r.height * zoom}px`,
                  }}
                >
                  REDACTED
                </div>
              ))}

              {/* Inline Active Text Box Editor popover */}
              {activeInlineEditor && (
                <div
                  className="absolute z-50 bg-white border border-[#0E7490] rounded shadow-lg p-1"
                  style={{
                    left: `${activeInlineEditor.x * zoom}px`,
                    top: `${activeInlineEditor.y * zoom}px`,
                    minWidth: `${Math.max(120, activeInlineEditor.width * zoom)}px`,
                  }}
                >
                  <input
                    type="text"
                    value={activeInlineEditor.replacementText !== undefined ? activeInlineEditor.replacementText : activeInlineEditor.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setActiveInlineEditor((prev) => ({
                        ...prev,
                        replacementText: val,
                        text: val,
                      }));
                    }}
                    onBlur={() => {
                      // Update in annotations array
                      const updated = currentPageAnnotations.map((item) =>
                        item.id === activeInlineEditor.id
                          ? { ...item, replacementText: activeInlineEditor.replacementText, text: activeInlineEditor.text }
                          : item
                      );
                      recordAction({ ...annotationsByPage, [currentPage]: updated });
                      setActiveInlineEditor(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                    className="w-full text-xs p-1 outline-hidden font-medium text-black bg-white"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Subcomponent Modals ── */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSaveSignature={(dataUrl) => {
          const newSig = {
            id: `sig_${Date.now()}`,
            type: 'signature',
            x: 100,
            y: 200,
            width: 140,
            height: 60,
            dataUrl,
          };
          recordAction({
            ...annotationsByPage,
            [currentPage]: [...currentPageAnnotations, newSig],
          });
          toast.success('Signature stamped on page.');
        }}
      />

      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        watermark={watermark}
        onSaveWatermark={(wm) => {
          setWatermark(wm);
          toast.success(wm.enabled ? 'Watermark enabled across all pages.' : 'Watermark disabled.');
        }}
      />

      <PageNumberModal
        isOpen={isPageNumberModalOpen}
        onClose={() => setIsPageNumberModalOpen(false)}
        pageNumbering={pageNumbering}
        onSavePageNumbering={(pn) => {
          setPageNumbering(pn);
          toast.success(pn.enabled ? 'Page numbers enabled across all pages.' : 'Page numbers disabled.');
        }}
      />

      <CropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        currentPage={currentPage}
        onApplyCrop={handleApplyCrop}
      />

      <SplitModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalPages={totalPages}
        onExtractPages={handleExtractPages}
      />

      <MergePdfModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        currentPage={currentPage}
        onMergePdf={async (otherBytes, position) => {
          if (!rawPdfBytes) return null;
          const res = await mergePdfBytes(rawPdfBytes, otherBytes, position, currentPage);
          setRawPdfBytes(res.bytes);
          setTotalPages(res.pageCount);
          setCurrentPage(res.newCurrentPage);
          return res;
        }}
      />

      <StickyNoteModal
        isOpen={Boolean(activeStickyNote)}
        onClose={() => setActiveStickyNote(null)}
        note={activeStickyNote}
        onSaveNote={(savedNote) => {
          const updated = currentPageAnnotations.map((it) => (it.id === savedNote.id ? savedNote : it));
          recordAction({ ...annotationsByPage, [currentPage]: updated });
        }}
        onDeleteNote={(noteId) => {
          const filtered = currentPageAnnotations.filter((it) => it.id !== noteId);
          recordAction({ ...annotationsByPage, [currentPage]: filtered });
        }}
      />
    </div>
  );
}
