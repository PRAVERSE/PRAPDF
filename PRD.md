# PRA PDF — Product Requirement Document (PRD)
**A PRAVERSE Company**

---

## 1. Executive Summary & Vision

**PRA PDF** is a unified, high-performance, private, and professional online PDF & document toolkit developed by **PRAVERSE** ("A PRAVERSE Company"). 

Modern users frequently encounter fragmented tools: one site for merging PDFs, another for compression, a third for image conversion, and a fourth for PDF text editing. Many of these third-party platforms enforce arbitrary paywalls, bombard users with ads, compromise document privacy, or require heavy AI subscriptions.

**PRA PDF solves this by providing 30 essential document and PDF operations in one elegant, coherent, ultra-fast web application.**

### Zero-AI Architecture Guarantee
PRA PDF is strictly a **deterministic software engineering platform**. It does **NOT** contain, use, or depend on:
- ChatGPT, OpenAI API, Anthropic Claude, or Google Gemini
- AI document summarizers or AI text rewriters
- Cloud AI OCR APIs or machine-learning vision models
- Paid external AI APIs or recurring cloud inference costs

All conversions, manipulations, OCR, and editing run via proven deterministic algorithms, standard open-source document engines (e.g., `pdf-lib`, `PDF.js`, `Tesseract.js WASM`, `jsPDF`, `SheetJS`), and local browser/server processing routines.

---

## 2. Product Goals & Target Audience

### Product Goals
1. **Unified Document Hub:** All 30 required operations accessible through an intuitive, cohesive user interface with zero tool switching.
2. **Strict Privacy First:** Private client-side processing whenever possible, with zero unneeded server data retention.
3. **50 MB File Limit Enforcement:** Strict, multi-layered 50 MB upload ceiling enforced consistently across Frontend, Backend/API, and Processing layers.
4. **Instant Testability & Zero Friction:** No account required for core operations; drag-and-drop simplicity with immediate visual feedback and downloadable results.
5. **Brand Identity:** Distinctive PRAVERSE identity ("PRA PDF — A PRAVERSE Company"), avoiding generic designs and avoiding copying the appearance of cloned source repositories.

### Target Audience
- **Professionals & Businesses:** Generating reports, organizing invoices, watermarking contracts, merging proposals, protecting sensitive PDFs.
- **Students & Academics:** Converting lecture notes, compressing research papers, extracting pages, OCRing textbook scans.
- **Developers & Power Users:** Converting Markdown to PDF, extracting clean structured text, editing metadata.
- **Everyday Users:** Quick conversion of images, Word documents, Excel spreadsheets to clean PDFs.

---

## 3. Strict 50 MB Upload Limit

The maximum upload size for any single file is **50 MB**. The previous 100 MB limit is decommissioned.

This limit is enforced across three distinct layers:
1. **Frontend Validation:** 
   - Drag-and-drop and file input event listeners validate `file.size <= 50 * 1024 * 1024` (52,428,800 bytes).
   - Instant UI rejection badge and notification before file ingestion starts.
2. **Backend / API Layer:**
   - Content-Length header verification and streaming chunk counter reject requests > 50 MB with HTTP `413 Payload Too Large`.
3. **Processing Layer:**
   - Memory and byte stream guards abort any processing pipeline if cumulative input payload exceeds 50 MB.

---

## 4. The 30 Required Services

Every single service listed below is required and backed by a functional, testable implementation. No fake buttons, placeholder alerts, or silent service replacements are permitted.

| # | Service Name | Category | Primary Execution | Input Formats | Output Format | Description |
|---|---|---|---|---|---|---|
| 1 | **JPG to PDF** | Convert to PDF | Browser / Engine | `.jpg`, `.jpeg` | `.pdf` | Converts JPG images into a formatted PDF document with customizable orientation and margins. |
| 2 | **PNG to PDF** | Convert to PDF | Browser / Engine | `.png` | `.pdf` | Converts PNG images (preserving alpha transparency/crisp lines) into a PDF document. |
| 3 | **Images to PDF** | Convert to PDF | Browser / Engine | `.jpg`, `.png`, `.webp`, `.bmp` | `.pdf` | Batch converts multiple mixed images into a multi-page PDF with drag-and-drop reordering. |
| 4 | **Word to PDF** | Convert to PDF | Engine / Worker | `.docx`, `.doc` | `.pdf` | Converts Word documents into PDF documents preserving text hierarchy, tables, and formatting. |
| 5 | **Excel to PDF** | Convert to PDF | Browser / Engine | `.xlsx`, `.xls`, `.csv` | `.pdf` | Renders spreadsheet worksheets into clean, structured PDF tables with auto-fit layout. |
| 6 | **PowerPoint to PDF** | Convert to PDF | Engine / Worker | `.pptx`, `.ppt` | `.pdf` | Converts presentation slides into sequential PDF presentation pages. |
| 7 | **HTML to PDF** | Convert to PDF | Browser / Engine | `.html`, `.htm` | `.pdf` | Renders HTML code or uploaded web pages into PDF documents with CSS styling. |
| 8 | **TXT to PDF** | Convert to PDF | Browser / Engine | `.txt` | `.pdf` | Converts plain text files into paginated, readable PDF documents with custom font sizes. |
| 9 | **Markdown to PDF** | Convert to PDF | Browser / Engine | `.md`, `.markdown` | `.pdf` | Parses Markdown syntax (headings, code blocks, tables, blockquotes) and exports styled PDF. |
| 10 | **PDF to JPG** | Convert from PDF | Browser / Engine | `.pdf` | `.jpg`, `.zip` | Renders PDF pages to individual JPG images (high resolution) packaged in ZIP or single download. |
| 11 | **PDF to PNG** | Convert from PDF | Browser / Engine | `.pdf` | `.png`, `.zip` | Renders PDF pages to crisp PNG images with lossless fidelity. |
| 12 | **PDF to Markdown** | Convert from PDF | Browser / Engine | `.pdf` | `.md` | Extracts text and structural hierarchies from PDF pages into formatted Markdown text. |
| 13 | **PDF to Word** | Convert from PDF | Browser / Engine | `.pdf` | `.docx` | Converts PDF documents into editable Word `.docx` documents. |
| 14 | **Merge PDF** | Organize PDF | Browser / Engine | `.pdf` (Multiple) | `.pdf` | Combines two or more PDF files into a single unified document with custom ordering. |
| 15 | **Split PDF** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` / `.zip` | Splits PDF by page ranges (e.g., `1-3, 5, 7-10`) or into separate single-page files. |
| 16 | **Organize PDF Pages** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` | Visual drag-and-drop thumbnail grid allowing reordering, rotating, and duplicating pages. |
| 17 | **Delete PDF Pages** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` | Deletes designated pages from a PDF document based on user selection or page numbers. |
| 18 | **Extract PDF Pages** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` | Extracts selected pages into a brand new standalone PDF. |
| 19 | **Rotate PDF** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` | Rotates all or selected PDF pages by 90°, 180°, or 270° clockwise. |
| 20 | **Crop PDF** | Organize PDF | Browser / Engine | `.pdf` | `.pdf` | Crops page boundaries visually or via margin dimensions across all or selected pages. |
| 21 | **Compress PDF** | Optimize PDF | Browser / Engine | `.pdf` | `.pdf` | Optimizes PDF size via image recompression, stream removal, and font deduplication. |
| 22 | **OCR PDF** | Optimize PDF | Browser / WASM | `.pdf` | `.pdf` (Searchable) | Non-AI optical character recognition (Tesseract WASM) adding a searchable text layer to scans. |
| 23 | **Add Page Numbers** | Edit & Annotate | Browser / Engine | `.pdf` | `.pdf` | Inserts customized page numbers (Page X of Y, position, font, margins, starting index). |
| 24 | **Watermark PDF** | Edit & Annotate | Browser / Engine | `.pdf` | `.pdf` | Overlays custom text or image watermarks with angle, opacity, color, and size controls. |
| 25 | **Full PDF Editing** | Edit & Annotate | Browser Studio | `.pdf` | `.pdf` | Interactive studio: add text, edit text where supported, add images, draw/markup, shapes, zoom. |
| 26 | **Password-Protect PDF** | Security | Browser / Engine | `.pdf` | `.pdf` | Encrypts PDF using standard AES encryption requiring user password for opening. |
| 27 | **Unlock PDF** | Security | Browser / Engine | `.pdf` | `.pdf` | Removes security encryption from a password-protected PDF when the valid password is provided. |
| 28 | **Edit PDF Metadata** | Metadata | Browser / Engine | `.pdf` | `.pdf` | Views and edits Title, Author, Subject, Keywords, Creator, and Producer properties. |
| 29 | **Extract PDF Text** | Content Extract | Browser / Engine | `.pdf` | `.txt` | Extracts raw plaintext from all or specific PDF pages into a downloadable text document. |
| 30 | **RTF Conversion** | Convert & Format | Browser / Engine | `.rtf` / `.pdf` | `.pdf` / `.rtf` | Bidirectional conversion between Rich Text Format (.rtf) and PDF documents. |

---

## 5. Full PDF Editing Tool Specifications

The **Full PDF Editing** service (#25) is an interactive, multi-tool PDF editor studio:
- **Text Insertion & Styling:** Place custom text boxes anywhere on the page, set font family, font size, text color, bold/italic, alignment.
- **Text Modification:** Support modifying text overlays and editing text blocks where the PDF structure allows.
- **Image Insertion:** Upload and stamp PNG/JPG/WebP images onto PDF pages with resizing and drag positioning.
- **Drawing & Markup:** Freehand pen tool with stroke width and color pickers for signatures and hand-drawn annotations.
- **Shapes & Highlights:** Rectangles, ellipses, highlight overlays with opacity slider.
- **Object Manipulation:** Drag to reposition, resize handles, delete selected elements.
- **Multi-Page Navigation:** Page thumbnail rail, next/prev page buttons, page jump.
- **Zoom & View Controls:** Zoom in, zoom out, fit-to-width, fit-to-page, pan mode.
- **Export & Download:** Re-encodes all annotations, graphics, and modifications into a standard compliant PDF file download.
- **Honest Capability Messaging:** If an existing low-level compressed vector text stream in an external PDF cannot be natively reflowed without rasterization, the UI informs the user honestly and allows whiteout overlay editing.

---

## 6. End-to-End User Workflow

Every tool follows a unified 5-step intuitive flow:
1. **Upload:** User drops a file (or multiple files) or selects via system file picker. The 50 MB limit and MIME validation fire immediately.
2. **Configure:** Tool-specific options appear (e.g., page numbers position, watermark text, rotation angle, compression level, target format).
3. **Process:** User clicks "Process Document" / "Convert". Animated status indicator with progress percentage and current stage displays.
4. **Result:** Success banner with output file name, original size vs. new size, and preview (where applicable).
5. **Download:** One-click download button and direct download action. Automatic cleanup triggers after timeout or upon user request.

---

## 7. Required Pages & Routing

- `/` — **Homepage:** Hero banner, PRA PDF branding, tool category tabs (All, Convert to PDF, Convert from PDF, Organize, Edit & Security), search bar, and grid of all 30 tool cards.
- `/tools/[tool-slug]` — **Individual Tool Pages:** Dedicated workspace for each of the 30 tools with tailored dropzone, configuration options, progress monitor, and download actions.
- `/editor` — **Full PDF Editing Studio:** Dedicated full-screen studio layout with toolbar, canvas, page rail, and properties inspector.
- `/privacy` — **Privacy Policy:** Comprehensive disclosure of data handling, zero-AI guarantee, local browser processing, temporary B2 storage, Telegram backup policies, and retention limits.
- `/terms` — **Terms & Conditions:** Legally accurate terms detailing 50 MB limit, acceptable use, user copyright ownership, service warranties, and disclaimers.
- `/contact` — **Contact Us:** Support contact form and communication channels for PRA PDF / PRAVERSE.

---

## 8. Security & Privacy Guarantees

- **No Third-Party AI Data Sharing:** User data is never sent to external LLM providers or AI model training pipelines.
- **Local Browser Execution Where Viable:** Merging, splitting, rotating, metadata editing, local conversions, watermarking, page numbering, and OCR run directly in the user's browser whenever supported, meaning sensitive files never leave their machine.
- **Secure Server Processing:** Where server processing is needed, files are written to isolated temporary directories (`/tmp/pra-pdf-[uuid]`), sanitized against path traversal, and protected against shell injection.
- **Zero Secrets in Frontend:** API keys, cloud storage credentials, and bot tokens are strictly isolated to server-side environments.
- **Auto-Cleanup Engine:** Temporary files are expunged automatically after 10 minutes or immediately upon job completion/failure.

---

## 9. Success Criteria

1. All 30 services are discoverable, interactive, and functional.
2. The 50 MB upload limit is strictly enforced and verified by tests.
3. Zero AI APIs or external AI dependencies exist in the codebase.
4. Zero PDF4QT dependencies exist anywhere in the project.
5. All open-source licenses and attribution obligations are completely satisfied.
6. The test suite passes cleanly, and temporary test artifacts are deleted.
7. PRA PDF runs locally with a clean, documented start command and test verification workflow.

---

## 10. Core Operational Constraints & Platform Rules

### 10.1. Zero-Watermark Policy
- **100% Clean Documents:** PRA PDF enforces an absolute zero-unsolicited-branding policy.
- Under **no circumstances** will the platform ever add a "Created with PRA PDF", company logo, footer watermark, or promotional stamp to any generated, converted, or exported document.
- Watermarks are applied **only** when the user explicitly configures the Watermark tool (`watermark-pdf`), using solely their own custom text, formatting, and angle.

### 10.2. Honest Capability & Status Reporting
- Zero fake progress bars, simulated loaders, or mock success states.
- If an operation fails, the system provides immediate, truthful error messaging with accurate HTTP status codes and error definitions.
- When an external processing server is unconfigured, endpoints report `PROCESSOR_UNAVAILABLE` rather than faking execution.

### 10.3. Strict Test Artifact Cleanup
- All temporary files generated during unit, integration, or manual testing must be purged immediately upon test completion.
- No temporary test PDFs, mock images, or scratch archives are ever committed to the repository.

### 10.4. Ephemeral Retention Policies
- Temporary Backblaze B2 files: Purged automatically ~10 minutes after job creation.
- Telegram audit backups: Original uploads only, purged after ~24 hours via scheduled bot sweeps.
- Local processor workspaces: Purged immediately upon output upload.
