# PRA PDF — Repository Analysis & 30-Service Mapping
**A PRAVERSE Company**

---

## 1. Executive Summary of Audited Repositories

An exhaustive audit of the repositories located in the workspace was conducted. Below is the technical breakdown, license review, and integration strategy.

### Explicit Exclusion Confirmation:
> [!IMPORTANT]
> **PDF4QT is strictly excluded from PRA PDF.** No code, binaries, wrappers, or references from PDF4QT exist or will be incorporated into PRA PDF.

---

## 2. Detailed Repository Audits

### 2.1. Repository 1: BentoPDF
- **Local Path:** `c:\Users\hp\OneDrive\Desktop\PRAPDF\bentopdf`
- **Commit:** `3a5f146d1b89d54dc7ca576aa6797c8bd3e42b97` (BentoPDF v2.8.8)
- **Main Purpose:** A complete, client-side, browser-centric PDF toolkit providing dozens of conversion, manipulation, organization, OCR, and editing tools.
- **Core Technology:** TypeScript, Vite, `pdf-lib` (v1.17.1), `pdfjs-dist` (v5.4.624), `tesseract.js` (v7.0.0 WASM), `jspdf` (v4.2.1), `sheetjs` (`xlsx` v0.20.3), `markdown-it` (v14.2.0), `cropperjs` (v1.6.2), `qpdf-wasm` (v0.3.0).
- **License:** GNU AGPL v3 (with underlying MIT/Apache 2.0 component dependencies).
- **Strengths:** 
  - Ultra-fast browser execution without server latency.
  - Complete zero-AI OCR via deterministic Tesseract WASM.
  - Client-side Excel, Markdown, and Image conversions.
  - Visual page organization, split, merge, crop, watermark, and metadata editing.
- **Integration Strategy:** Port and adapt core TypeScript service logic into PRA PDF's modern unified interface.
- **What Must NOT Be Reused:** Clunky legacy UI styling, multi-submodule vendor bloat, and unrelated branding.

### 2.2. Repository 2: Stirling-PDF
- **Local Path:** `c:\Users\hp\OneDrive\Desktop\PRAPDF\Stirling-PDF`
- **Commit:** `824339edc58d4658f50c2077cda60c8ecf718b6e`
- **Main Purpose:** Full-stack PDF manipulation platform providing Spring Boot REST API backend + React editor frontend.
- **Core Technology:** Java (Spring Boot, Apache PDFBox, OpenPDF), React 19, Vite, `@embedpdf/*`, Mantine.
- **License:** Core MIT license (Copyright 2025 Stirling PDF Inc.), with enterprise/proprietary submodules isolated in `app/proprietary/` and `app/saas/`.
- **Strengths:**
  - Robust API design patterns for multi-page layouts and office document conversions.
  - Deep algorithmic reference for PDF imposition, booklet creation, and vector extraction.
- **Integration Strategy:** Use API schemas, data contracts, and architectural validation patterns. (Note: Java runtime is not present on the host environment; server processing will be driven by lightweight Node.js engine).
- **What Must NOT Be Reused:** Proprietary subdirectories (`app/proprietary/`, `frontend/editor/src/proprietary/`), heavy Docker/Kubernetes overhead, or Java dependencies requiring a JDK.

### 2.3. Repository 3: PDFCraft
- **Local Path:** `c:\Users\hp\OneDrive\Desktop\PRAPDF\pdfcraft`
- **Commit:** `3375313c5a3dce4eac748ff9675172026709d6ed`
- **Main Purpose:** Lightweight Python CLI and library for core PDF operations.
- **Core Technology:** Python 3, `pypdf` (v5+).
- **License:** MIT License (Copyright 2026 Radwan Abdulhadi Ahmed).
- **Strengths:** Clean, simple mathematical logic for page selection parsing (`parse_pages("1,3-5,8")`), metadata reading, encryption/decryption, rotation, and watermarking.
- **Integration Strategy:** Adapt the concise page range parsing algorithms and security workflows into TypeScript equivalents.
- **What Must NOT Be Reused:** CLI argument parsing and terminal display routines.

### 2.4. Repository 4: PDFArranger (Workspace Reference)
- **Local Path:** `c:\Users\hp\OneDrive\Desktop\PRAPDF\pdfarranger`
- **Commit:** `fb76e09762677fe5c3e205bb89ca474500fce53c`
- **Main Purpose:** Desktop GTK graphical tool for rearranging, cropping, splitting, and merging PDF documents.
- **Core Technology:** Python, GTK, PikePDF.
- **License:** GNU GPL v3.
- **Strengths:** Visual page grid reordering, duplex collation, and page cropping workflows.
- **Integration Strategy:** Reference UX flow for visual page grid reordering.

---

## 3. Master 30-Service Implementation & Mapping Matrix

Every single one of the 30 services required by the user is mapped below to its real, deterministic implementation:

| # | PRA PDF Service | Source Repository | Actual Implementation Engine | Browser or Server | Primary Dependencies | License | Integration Status |
|---|---|---|---|---|---|---|---|
| 1 | **JPG to PDF** | BentoPDF | `pdf-lib` image embedding (`embedJpg`) with orientation/margins | Browser | `pdf-lib` | MIT | Planned / Ready |
| 2 | **PNG to PDF** | BentoPDF | `pdf-lib` image embedding (`embedPng`) with transparency | Browser | `pdf-lib` | MIT | Planned / Ready |
| 3 | **Images to PDF** | BentoPDF | Batch image processor with reordering & multi-page PDF compilation | Browser | `pdf-lib`, `canvas` | MIT | Planned / Ready |
| 4 | **Word to PDF** | BentoPDF / Stirling | Docx XML parser & structured layout renderer to PDF | Browser / Engine | `docx-preview`, `jspdf` | MIT / Apache 2.0 | Planned / Ready |
| 5 | **Excel to PDF** | BentoPDF | SheetJS workbook reader + `jspdf-autotable` cell grid renderer | Browser | `xlsx`, `jspdf`, `jspdf-autotable` | Apache 2.0 / MIT | Planned / Ready |
| 6 | **PowerPoint to PDF** | Stirling / Custom | PPTX slide XML parser & structured slide-to-page PDF generator | Browser / Engine | `jszip`, `canvas`, `pdf-lib` | MIT | Planned / Ready |
| 7 | **HTML to PDF** | BentoPDF | HTML5 DOM renderer & canvas print stream to PDF | Browser | `jspdf`, `html2canvas` | MIT | Planned / Ready |
| 8 | **TXT to PDF** | BentoPDF | Text stream paginator with font sizing, line wrapping & margins | Browser | `pdf-lib` | MIT | Planned / Ready |
| 9 | **Markdown to PDF** | BentoPDF | `markdown-it` AST parser with CSS theme rendering to PDF | Browser | `markdown-it`, `jspdf` | MIT | Planned / Ready |
| 10 | **PDF to JPG** | BentoPDF | `pdfjs-dist` viewport rendering to JPEG blobs + ZIP bundler | Browser | `pdfjs-dist`, `jszip` | Apache 2.0 / MIT | Planned / Ready |
| 11 | **PDF to PNG** | BentoPDF | `pdfjs-dist` high-DPI rendering to PNG blobs + ZIP bundler | Browser | `pdfjs-dist`, `jszip` | Apache 2.0 / MIT | Planned / Ready |
| 12 | **PDF to Markdown** | BentoPDF | Structured text block & heading extractor formatting to Markdown | Browser | `pdfjs-dist` | Apache 2.0 | Planned / Ready |
| 13 | **PDF to Word** | BentoPDF / Custom | Text & layout extraction recompiled into editable Word `.docx` | Browser | `pdfjs-dist`, `docx` | Apache 2.0 / MIT | Planned / Ready |
| 14 | **Merge PDF** | BentoPDF & PDFCraft | `pdf-lib` multi-document loader with page copier & merger | Browser | `pdf-lib` | MIT | Planned / Ready |
| 15 | **Split PDF** | BentoPDF & PDFCraft | Page range parser (`1-3, 5`) splitting into multiple PDF files | Browser | `pdf-lib`, `jszip` | MIT | Planned / Ready |
| 16 | **Organize PDF Pages** | BentoPDF & PDFArranger | Visual drag-and-drop thumbnail grid with reorder, rotate & save | Browser | `pdf-lib`, `pdfjs-dist` | MIT / Apache 2.0 | Planned / Ready |
| 17 | **Delete PDF Pages** | BentoPDF & PDFCraft | Page selector removing indices from PDF page tree | Browser | `pdf-lib` | MIT | Planned / Ready |
| 18 | **Extract PDF Pages** | BentoPDF & PDFCraft | Sub-document generator copying selected page indices | Browser | `pdf-lib` | MIT | Planned / Ready |
| 19 | **Rotate PDF** | BentoPDF & PDFCraft | Modifies page `/Rotate` dictionary (90°, 180°, 270°) | Browser | `pdf-lib` | MIT | Planned / Ready |
| 20 | **Crop PDF** | BentoPDF | Interactive crop box adjustor updating `/CropBox` & `/MediaBox` | Browser | `pdf-lib`, `cropperjs` | MIT | Planned / Ready |
| 21 | **Compress PDF** | BentoPDF | Image stream recompressor, metadata stripper, stream flattener | Browser | `pdf-lib`, `canvas` | MIT | Planned / Ready |
| 22 | **OCR PDF** | BentoPDF | Tesseract.js (Pure WebAssembly OCR, non-AI) searchable layer generator | Browser / WASM | `tesseract.js`, `pdf-lib` | Apache 2.0 / MIT | Planned / Ready |
| 23 | **Add Page Numbers** | BentoPDF | Inserts dynamic page number strings at designated page coordinates | Browser | `pdf-lib` | MIT | Planned / Ready |
| 24 | **Watermark PDF** | BentoPDF & PDFCraft | Overlays rotated text string or graphic watermark on each page | Browser | `pdf-lib` | MIT | Planned / Ready |
| 25 | **Full PDF Editing** | BentoPDF & Stirling | Studio canvas: Add text, shapes, drawing, images, edit text, export | Browser Studio | `pdfjs-dist`, `pdf-lib`, `canvas`| Apache 2.0 / MIT | Planned / Ready |
| 26 | **Password-Protect PDF**| PDFCraft & BentoPDF | AES standard encryption securing PDF with user-defined password | Browser / Engine | `pdf-lib` / `qpdf-wasm` | MIT / Apache 2.0 | Planned / Ready |
| 27 | **Unlock PDF** | PDFCraft & BentoPDF | Removes encryption dictionary given valid user password | Browser / Engine | `pdf-lib` / `qpdf-wasm` | MIT / Apache 2.0 | Planned / Ready |
| 28 | **Edit PDF Metadata** | BentoPDF & PDFCraft | Reads and writes Title, Author, Subject, Keywords, Creator | Browser | `pdf-lib` | MIT | Planned / Ready |
| 29 | **Extract PDF Text** | BentoPDF & PDFCraft | Extracts plaintext text items across all pages into `.txt` | Browser | `pdfjs-dist` | Apache 2.0 | Planned / Ready |
| 30 | **RTF Conversion** | Custom / BentoPDF | Bidirectional RTF token parser & generator with PDF compilation | Browser / Engine | `pdf-lib`, custom parser | MIT | Planned / Ready |
