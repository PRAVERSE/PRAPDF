# PRA PDF — Project Phases & Implementation Plan
**A PRAVERSE Company**

---

## Overview

Development is partitioned into 10 practical, testable phases. Each phase establishes clear tasks, concrete expected outputs, verification tests, and strict completion criteria.

---

## Phase 1: Repository Audit & Core Project Documentation

### Tasks
- Inspect all four cloned repositories: `Stirling-PDF`, `bentopdf`, `pdfcraft`, `pdfarranger`.
- Verify absence of `PDF4QT` (strictly excluded).
- Analyze licenses, dependencies, capabilities, runtime compatibility, and reusable components.
- Author all 8 core documentation files:
  1. `PRD.md`
  2. `Architecture.md`
  3. `Rules.md`
  4. `Phases.md`
  5. `Design.md`
  6. `Memory.md`
  7. `Repository-Analysis.md`
  8. `LICENSES-AND-ATTRIBUTIONS.md`
- Map every one of the 30 services to its optimal implementation engine.

### Expected Result
Complete, comprehensive documentation establishing architectural and legal parameters for the entire PRA PDF platform.

### Tests & Verification
- Verify all 30 services have explicit implementation sources in `Repository-Analysis.md`.
- Verify license compliance and attribution obligations are documented.

### Completion Criteria
All 8 markdown documentation files exist, contain exhaustive detail, and conform to the project requirements.

---

## Phase 2: Project Foundation, Design System & Core UI Layout

### Tasks
- Initialize the unified `pra-pdf` project with `package.json`, Vite configuration, TypeScript, and build scripts.
- Implement the PRAVERSE Design System (`index.css`): PRA Navy (`#0A0F1D`), Electric Indigo (`#6366F1`), dark mode elevation tokens, typography, glassmorphism cards, micro-animations.
- Build universal UI components:
  - `Navbar`: PRA PDF branding, tool category links, quick search.
  - `Footer`: Legal links (Privacy Policy, Terms, Contact), copyright attribution.
  - `Dropzone`: Drag-and-drop file uploader with instant client-side 50 MB check and MIME validator.
  - `ProgressBar`: Real-time processing progress with status messaging.
  - `ResultCard`: Download button, file size comparison, action triggers.
- Build main views: `HomePage` (catalog of all 30 tools with search/filters), `ToolPage` (runner layout), `PrivacyPage`, `TermsPage`, `ContactPage`.
- Implement client-side routing.

### Expected Result
A responsive, high-performance web application skeleton with seamless navigation, branding, and dropzone validation.

### Tests & Verification
- Verify 50 MB limit error alert triggers immediately when dropping a >50 MB mock file.
- Verify navigation between Homepage, Tool pages, and Legal pages works without page reloads.

### Completion Criteria
The UI renders cleanly, meets visual excellence standards, and correctly validates file sizes.

---

## Phase 3: Convert to PDF Tools (Services 1–9)

### Tasks
Implement and integrate conversion engines for:
1. **JPG to PDF** (Service 1) — `pdf-lib` image embedding with auto-orientation and margins.
2. **PNG to PDF** (Service 2) — `pdf-lib` PNG embedding with alpha channel preservation.
3. **Images to PDF** (Service 3) — Multi-image drag-and-drop batch converter.
4. **Word to PDF** (Service 4) — `.docx` parser & structured layout renderer.
5. **Excel to PDF** (Service 5) — `SheetJS` spreadsheet parser & `jsPDF-autotable` renderer.
6. **PowerPoint to PDF** (Service 6) — Presentation slide converter & visual PDF layout.
7. **HTML to PDF** (Service 7) — HTML/CSS parser and paginated PDF generator.
8. **TXT to PDF** (Service 8) — Plain text paginator with monospace/sans fonts and margins.
9. **Markdown to PDF** (Service 9) — `markdown-it` AST parser with styled headings, code blocks, tables.

### Expected Result
All 9 "Convert to PDF" tools fully operational, converting documents and images into standards-compliant downloadable PDFs.

### Tests & Verification
- Unit test for each converter with valid sample input.
- Output PDF validation: file header starts with `%PDF-` and pages can be rendered.
- Delete temporary test artifacts immediately upon test completion.

### Completion Criteria
All 9 services generate valid PDFs, download cleanly, and adhere to the 50 MB limit.

---

## Phase 4: Convert from PDF & Document Export Tools (Services 10–13, 29, 30)

### Tasks
Implement and integrate extraction & export engines:
10. **PDF to JPG** (Service 10) — `PDF.js` canvas rendering to JPEG with quality slider; ZIP download.
11. **PDF to PNG** (Service 11) — Lossless high-DPI rendering to PNG; single or ZIP download.
12. **PDF to Markdown** (Service 12) — Structured text & header extraction to Markdown `.md`.
13. **PDF to Word** (Service 13) — Document text & layout extraction to editable Word `.docx`.
29. **Extract PDF Text** (Service 29) — High-fidelity plain text extraction to `.txt`.
30. **RTF Conversion** (Service 30) — RTF to PDF and PDF to RTF bidirectional conversion.

### Expected Result
All 6 conversion and extraction tools operate reliably with downloadable outputs.

### Tests & Verification
- Run extraction on sample PDF documents.
- Verify generated `.jpg`, `.png`, `.md`, `.docx`, `.txt`, `.rtf` files are structurally valid.
- Delete temporary test artifacts immediately.

### Completion Criteria
All 6 services execute, handle corrupted inputs gracefully, and download correct file formats.

---

## Phase 5: PDF Organization & Manipulation Tools (Services 14–20, 23, 24, 28)

### Tasks
Implement core page and document structure manipulation tools:
14. **Merge PDF** (Service 14) — Multi-file dropzone with reorderable list; merges into single PDF.
15. **Split PDF** (Service 15) — Range selection (`1-3, 5, 8-10`) or split all into separate pages.
16. **Organize PDF Pages** (Service 16) — Visual page grid with drag-and-drop reorder, rotate, duplicate.
17. **Delete PDF Pages** (Service 17) — Select pages via visual checkbox or input string to delete.
18. **Extract PDF Pages** (Service 18) — Extract selected page subsets into a fresh PDF.
19. **Rotate PDF** (Service 19) — Clockwise rotation (90°, 180°, 270°) per page or document-wide.
20. **Crop PDF** (Service 20) — Visual crop bounding box; adjustments to PDF MediaBox/CropBox.
23. **Add Page Numbers** (Service 23) — Header/footer insertion with custom format, font, margin.
24. **Watermark PDF** (Service 24) — Text watermark (angle, opacity, color) or image overlay.
28. **Edit PDF Metadata** (Service 28) — Inspect and edit Title, Author, Subject, Keywords, Creator.

### Expected Result
All 10 organization and manipulation tools function seamlessly via `pdf-lib` and `PDF.js`.

### Tests & Verification
- Test page count before and after merge, split, delete, and extract operations.
- Verify rotation angles in PDF page dictionaries.
- Delete all test artifacts upon completion.

### Completion Criteria
All 10 tools pass automated tests, update PDF structures accurately, and produce downloadable results.

---

## Phase 6: PDF Optimization, Security & OCR Tools (Services 21, 22, 26, 27)

### Tasks
Implement advanced optimization, security, and character recognition tools:
21. **Compress PDF** (Service 21) — Stream optimization, canvas re-encoding, image quality reduction.
22. **OCR PDF** (Service 22) — `Tesseract.js WASM` non-AI optical character recognition adding an invisible, searchable text layer.
26. **Password-Protect PDF** (Service 26) — Standard encryption with user password.
27. **Unlock PDF** (Service 27) — Decrypt password-protected PDF given user authorization password.

### Expected Result
High-performance compression, privacy-safe offline WASM OCR, and robust PDF security management.

### Tests & Verification
- Verify compressed PDF file size is smaller than uncompressed image-heavy PDF.
- Verify OCR extracts text from image-only PDF and produces a searchable document.
- Verify encrypted PDF requires password and unlocked PDF opens cleanly without credentials.
- Delete temporary test artifacts immediately.

### Completion Criteria
All 4 advanced tools execute successfully and handle invalid passwords and corrupted streams gracefully.

---

## Phase 7: Full PDF Editing Studio (Service 25)

### Tasks
Build the comprehensive **Full PDF Editing Studio**:
- Full-page canvas viewer backed by `PDF.js` with thumbnail navigation bar.
- Interactive tool palette:
  - Add & style text (font family, font size, bold/italic, color, alignment).
  - Add images (upload PNG/JPG, move, resize).
  - Freehand drawing/pen tool with color and stroke-width selection.
  - Shapes: rectangle, ellipse, line, highlight overlay with transparency.
  - Object selection, dragging, resizing, and deletion.
- Multi-page navigation (next, prev, thumbnail selector, page counter).
- Canvas zoom (50% to 200%, fit-to-page, fit-to-width) and panning.
- Export pipeline: encodes all visual annotations onto the PDF via `pdf-lib` and triggers download.
- Honest limitation messaging for complex reflow scenarios.

### Expected Result
A rich, responsive, desktop/tablet-friendly PDF editing studio matching modern web expectations.

### Tests & Verification
- Add text, shape, image, and drawing annotation; export PDF; reload exported PDF to verify modifications persist in output.
- Delete temporary test artifacts immediately.

### Completion Criteria
The editor works smoothly, allows multi-tool annotations, and exports valid modified PDFs.

---

## Phase 8: Storage, API & Auto-Cleanup Engine

### Tasks
- Create lightweight Node.js API server (`pra-pdf/src/server/apiServer.ts`):
  - Strict 50 MB payload limiter on incoming requests (`Content-Length` & multipart stream counter).
  - Health check endpoint `/api/health`.
  - Conversion endpoints for server-side operations.
- Implement Backblaze B2 private storage integration spec & client adapter with 10-minute signed access.
- Implement Telegram original-file backup spec & adapter (server-side bot token only, ~24 hour retention).
- Implement automated cleanup engine (`cleanup.ts`):
  - Client-side blob URL revoker.
  - Server-side cron/timer purging `/tmp` jobs older than 10 minutes.

### Expected Result
Robust backend gateway, secure storage abstractions, and zero lingering temporary files.

### Tests & Verification
- Send >50 MB request to API endpoint; assert HTTP `413 Payload Too Large`.
- Assert cleanup worker purges expired jobs.

### Completion Criteria
API gateway runs, limits uploads, protects credentials, and purges temporary files reliably.

---

## Phase 9: Comprehensive Automated Testing Suite

### Tasks
- Configure Vitest / Node test runner for `pra-pdf`.
- Implement tests covering:
  - File size validation (< 50 MB pass, > 50 MB reject).
  - MIME type and magic number validation.
  - Core conversion tools (Images to PDF, TXT to PDF, Markdown to PDF).
  - PDF manipulation tools (Merge, Split, Rotate, Delete, Extract, Page Numbers, Watermark).
  - Security tools (Password protect and unlock).
  - Cleanup routine execution.
- Run complete test suite and assert 100% pass rate.
- **Enforce Test Artifact Rule:** Automatically unlink all test-generated files immediately after tests conclude.

### Expected Result
A clean, passing automated test suite with zero lingering test files.

### Tests & Verification
- Execute `npm test` or `node tests/runner.js`.
- Confirm directory is free of test PDFs, temp images, and logs.

### Completion Criteria
All tests pass without errors; no test artifacts remain in the repository.

---

## Phase 10: Test-Ready Integration & Verification

### Tasks
- Build production bundle (`npm run build`) to verify TypeScript and bundler integrity.
- Verify local development server starts cleanly (`npm run dev`).
- Test all 30 tools end-to-end in the running application.
- Finalize `Memory.md` with complete implementation status, test logs, and next steps.
- Provide user with exact local startup instructions and testing commands.

### Expected Result
A test-ready, verified PRA PDF application ready for user demonstration.

### Completion Criteria
Development server starts, all 30 services are reachable and functional, documentation is complete, and zero warnings or broken references exist.
