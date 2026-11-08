# SmartPrint Known Limitations & Roadmap

This document outlines the current known constraints, architectural boundaries, and planned future enhancements for the **SmartPrint** platform.

---

## 1. Known Architectural Limitations

### 1.1 Windows Print Agent OS Dependency
- **Current State**: The native Direct Print Agent (`print-agent/`) is built specifically for **Microsoft Windows** (10, 11, Server) utilizing `win32print` and `win32api`.
- **Reason**: 95%+ of retail print and copy shops in India and emerging markets operate POS and billing machines running Microsoft Windows.
- **Roadmap Mitigation**: Future versions will introduce a CUPS-based Linux/macOS agent daemon using `pycups` for university printing labs.

### 1.2 Office Document Conversion
- **Current State**: PDF documents and raster images (`.pdf`, `.png`, `.jpg`) are processed natively. Word documents (`.docx`) require server-side conversion tools (such as LibreOffice headless or unoconv) for exact page count rendering. If LibreOffice is absent in the host runtime, Word files default to estimated page counts based on word density until reviewed by the shopkeeper.
- **Best Practice**: Encourage customers to upload `.pdf` for 100% exact vector and page count rendering.

### 1.3 Maximum Upload Size
- **Current State**: Default maximum upload file size is constrained to **50 MB** per document (configurable up to 100 MB in `ShopSettings`).
- **Reason**: Protects shop servers from denial-of-service and memory exhaustion when parsing large PDFs with embedded uncompressed bitmaps.
- **Mitigation**: Very large architectural blueprints (>100MB) can be compressed or shared directly via shop staff.

### 1.4 Single Active Spooler per Shop
- **Current State**: While multiple physical printers can be attached to one shop, they are coordinated through the primary Windows Print Agent instance running on the billing counter PC.
- **Roadmap**: Multi-agent clustering allowing independent print agents across distinct shop branches or floors.

---

## 2. Security Boundaries

- **Zero-Persistence Guarantee**: The server permanently unlinks expired documents. While this guarantees customer privacy, it means **reprints are not possible** after the expiration window elapses without the customer re-uploading the file.
- **Counter Payments Reconciliation**: Manual counter cash payments rely on shop staff actively clicking "Collect Payment" in the dashboard. If staff omit this step, counter revenue will not be reflected in verified accounting analytics.

---

## 3. Product Roadmap

- [ ] **Android POS Integration**: Direct printing from Android-based smart POS thermal billing machines.
- [ ] **Self-Service Kiosk Mode**: Full-screen kiosk mode for touch monitors with integrated UPI QR dynamic displays.
- [ ] **Multi-Branch Tenant Clustering**: Consolidated enterprise reporting for printing store franchises with 10+ branches.
