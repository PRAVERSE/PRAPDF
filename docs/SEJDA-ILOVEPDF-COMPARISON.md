# PRA PDF — Competitor Research & Feature Matrix: Sejda vs. iLovePDF
**Product:** PRA PDF  
**Company:** PRAVERSE ("A PRAVERSE Company")  
**Target Scope:** Exactly 56 Document Services  
**Reference Platforms:**
- **Sejda:** [https://www.sejda.com/](https://www.sejda.com/)
- **iLovePDF:** [https://www.ilovepdf.com/](https://www.ilovepdf.com/)
**Date:** October 2026  

---

## 1. Executive Summary & Strategic Positioning

### Sejda Architecture Strengths:
- Deep specialized feature set for legal, prepress, and advanced page layout.
- Introduced tools such as **Alternate & Mix** (interleaving duplex scan passes), **Bates Numbering** (multi-document legal exhibit numbering), **N-up** (imposition layout), **Deskew** (rotational straightening), **Split in Half** (two-page book scan cutting), and **Delete Annotations**.
- Pure geometric and mathematical operations requiring zero cloud AI.

### iLovePDF Architecture Strengths:
- Superior consumer and business UX: large high-contrast drag-and-drop dropzones, responsive right sidebar options panels (`tool__sidebar`), and fast one-click batch conversions.
- Best-in-class **Compare PDF** (side-by-side text diffing and visual discrepancy highlighting), **Redact PDF** (keyword and bounding box sanitization), and strict **PDF to PDF/A** (ISO 19005 archival compliance).

### PRA PDF Combined Specification:
- Adopt the **power and depth of Sejda's specialized tools** combined with **iLovePDF's clean, intuitive card-and-panel ergonomics**.
- Integrate our **Universal Completion Screen** (`#0E2419` badge, `#0D1424` card, `#2EE59D` download CTA) across all 56 services.
- Uphold PRA PDF's **Strict Zero-AI Guarantee** and **Strict 50 MB Upload Ceiling**.
- Zero unsolicited watermarks: watermark functionality exists solely via explicit user configuration in the Watermark tool.

---

## 2. 56 Services Detailed Comparative Analysis

The table below documents what Sejda and iLovePDF offer for each operation, the best aspects to adopt, our PRA PDF design decision, engine dependencies, and acceptance test requirements.

| # | Service | Sejda Offering | iLovePDF Offering | Best Aspects to Adopt | PRA PDF Specification | Engine & Dependencies | Risk & Difficulty | Acceptance Test Requirements |
|---|---|---|---|---|---|---|---|---|
| 1 | `jpg-to-pdf` | Fit/A4/Letter, margins, orientation | Fit/A4, portrait/landscape, small/big margin | Sejda's page sizing + iLovePDF's clean thumbnail reordering | Worker endpoint + client fallback; page size, orientation, custom margin | `pdf-lib` | Low | Verify `%PDF-`, correct dimensions, multi-image pagination |
| 2 | `png-to-pdf` | Alpha preservation, page margins | Alpha preservation, page fits | Alpha channel retention with crisp vector boundaries | Pure stream embedding preserving alpha transparency | `pdf-lib` | Low | Alpha transparency retention, 100% valid `%PDF-` |
| 3 | `images-to-pdf` | Mixed formats (JPG, PNG, WebP) | Drag-and-drop gallery reordering | iLovePDF's visual gallery reordering + Sejda's format versatility | Browser canvas transcoding into `pdf-lib` multi-page document | `pdf-lib`, Canvas | Low | Mixed JPG/PNG/WebP collation into single PDF |
| 4 | `word-to-pdf` | DOCX/DOC parsing with table retention | Fast headless conversion | Accurate layout, bold/italic, tables | Dedicated Node processor with client XML extraction fallback | Node processor | High | Heading hierarchy, table preservation |
| 5 | `excel-to-pdf` | Sheet selection, landscape fit | Auto-fit table to page | Auto-fit table cells, gridlines toggle | Client `xlsx` parsing + `jspdf-autotable` rendering | `xlsx`, `jspdf-autotable` | Medium | Multi-sheet pagination, cell wrapping |
| 6 | `powerpoint-to-pdf` | Slide sequential rendering | Widescreen slide export | 16:9 widescreen orientation default | Slide XML slide compositor | Node processor | High | Slide count match, 16:9 aspect ratio |
| 7 | `html-to-pdf` | URL or raw HTML upload | Raw URL capture | Clean CSS styling, page breaks | HTML file or raw code render via `html2canvas` + `jsPDF` | `html2canvas`, `jspdf` | Medium | CSS formatting, page break adherence |
| 8 | `txt-to-pdf` | Line wrapping, monospaced font | Basic text render | Monospaced or sans-serif toggle, custom margins | Client/Worker typesetting via standard Helvetica/Courier | `pdf-lib` | Low | Text wrap, multi-page overflow |
| 9 | `markdown-to-pdf` | Not offered | Not offered | PRA PDF unique: styled GitHub markdown rendering | Markdown AST parse via `markdown-it` to styled PDF | `markdown-it`, `jspdf` | Low | Code block styling, table rendering |
| 10 | `rtf-to-pdf` | Not offered | Not offered | Rich text parser converting bold, italics, fonts to PDF | RTF token parser to `pdf-lib` document | Node / `pdf-lib` | Medium | RTF formatting retention |
| 11 | `scan-to-pdf` | TWAIN/Scanner client app | Mobile app camera integration | Browser camera direct capture via MediaDevices | Client camera scanner with perspective crop & PDF output | HTML5 MediaStream, Canvas | Medium | Camera stream capture, clean PDF output |
| 12 | `pdf-to-jpg` | DPI (150/300), page selection | Normal/High quality, ZIP archive | DPI selector, ZIP packaging if > 1 page | Render pages to canvas, encode JPEG, package ZIP if multi-page | `pdfjs-dist`, `jszip` | Medium | 1-page single JPG, multi-page ZIP archive |
| 13 | `pdf-to-png` | DPI (150/300), transparent BG | High quality PNG | Transparent background support | Render pages to canvas, encode PNG, package ZIP if multi-page | `pdfjs-dist`, `jszip` | Medium | Lossless PNG signature, ZIP archive |
| 14 | `pdf-to-tiff` | Not offered | Not offered | Multi-page TIFF container generation | Render pages, encode TIFF byte stream | `pdfjs-dist`, `utif` | Medium | TIFF header `[0x49, 0x49]` or `[0x4D, 0x4D]` |
| 15 | `pdf-to-markdown` | Text extraction | Not offered | Heading level heuristics based on font size | Text stream extraction with `#` headings and bullet lists | `pdfjs-dist` | Medium | Valid Markdown headings and lists |
| 16 | `pdf-to-word` | Layout flow preservation | OCR / Standard DOCX | Flowing text blocks, table conversion | Node processor with client `docx` builder fallback | Node processor | High | Valid `.docx` file opening in Word |
| 17 | `pdf-to-excel` | Tabular cell detection | Excel export | Coordinate clustering into spreadsheet rows/columns | Coordinate-based cell clustering into XLSX | `pdfjs-dist`, `xlsx` | High | Valid `.xlsx` workbook with rows and columns |
| 18 | `pdf-to-csv` | Flat CSV table export | Not offered | Clean delimiter escaping, comma/semicolon toggle | Tabular coordinate extraction exported to UTF-8 CSV | `pdfjs-dist` | Medium | Valid `.csv` format with proper quote escaping |
| 19 | `pdf-to-powerpoint` | Not offered | Slide image embedding | Each PDF page becomes a high-res presentation slide | Slide composer via `pptxgenjs` | `pptxgenjs` | High | Valid `.pptx` presentation opening in PowerPoint |
| 20 | `pdf-to-rtf` | Not offered | Not offered | Text styling exported into RTF specification | Text extractor generating RTF syntax tags | `pdfjs-dist` | Medium | Valid `{\rtf1` header and styled text |
| 21 | `merge-pdf` | Reorder, sort A-Z | Reorder files, remove single file | Drag-and-drop order, sort alphabetically | Worker endpoint + client fallback; merge any number of PDFs | `pdf-lib` | Low | Total page count sum, bookmark preservation |
| 22 | `split-pdf` | By ranges, extract all, split every N | Split by range, extract pages | Range parser (`1-3, 5`), single PDF or ZIP output | Single range -> `.pdf`, multiple ranges -> `.zip` | `pdf-lib`, `jszip` | Low | `%PDF-` on single range, ZIP on multi-range |
| 23 | `organize-pdf-pages` | Drag grid, rotate, duplicate | Visual thumbnail reordering | Drag-and-drop thumbnail grid with rotate and delete | Visual interactive grid dispatching page order map | `pdf-lib` | Low | Page order integrity, rotation retention |
| 24 | `delete-pdf-pages` | Visual select or range string | Click thumbnails to delete | Support both thumbnail click and text range string | Parse range string, filter pages, save new document | `pdf-lib` | Low | Reduced page count, bounds error handling |
| 25 | `extract-pdf-pages` | Range string or thumbnail click | Select pages to extract | Preserve order toggle, single or multi extract | Extract selected pages into new standalone PDF | `pdf-lib` | Low | Extracted page count match, valid PDF |
| 26 | `rotate-pdf` | 90°, 180°, 270°, per page or all | 90° clockwise/counter-clockwise | Fast 90° modulo addition across all or specific pages | Update `/Rotate` dictionary entry without recompressing | `pdf-lib` | Low | Rotation angle verified on target pages |
| 27 | `crop-pdf` | Visual box or numeric margins | Not offered | Visual bounding box + exact margin inputs (pt) | Set `/CropBox` in page dictionary | `pdf-lib` | Low | Crop dimensions verified, zero content loss |
| 28 | `alternate-mix-pdf` | Interleave odd & even, step size | Not offered | Interleaving loop, reverse order toggle for back pages | Collation algorithm interleaving 2+ PDF files | `pdf-lib` | Low | Alternating page sequences (A1, B1, A2, B2) |
| 29 | `split-pdf-in-half` | Vertical or horizontal split | Not offered | 50% coordinate split doubling pages | Duplicate each page, set CropBox for left & right halves | `pdf-lib` | Low | Page count doubles (1L, 1R, 2L, 2R) |
| 30 | `n-up-pdf` | 2, 4, 8, 16 per sheet, orientation | Not offered | Grid imposition scaling matrix | Embed pages onto new sheet with grid layout | `pdf-lib` | Low | Correct grid layout, sheet dimensions |
| 31 | `flip-pdf` | Horizontal or vertical mirror | Not offered | Coordinate matrix transform `cm [-1 0 0 1 w 0]` | Apply transformation matrix to page content stream | `pdf-lib` | Low | Valid PDF with mirrored page content |
| 32 | `compress-pdf` | Extreme, Recommended, Less | Recommended, Extreme, Low | Multi-tier compression profiles | Object stream compression and image downsampling | `pdf-lib` | Medium | File size reduction, readable PDF |
| 33 | `ocr-pdf` | Cloud OCR | Scanned PDF OCR | Client-side WASM OCR (Zero cloud AI inference) | Tesseract.js WASM adds invisible searchable text layer | `tesseract.js` | High | Searchable text layer verified in reader |
| 34 | `grayscale-pdf` | Grayscale color conversion | Not offered | Desaturate color operators and images | Desaturate canvas renders or rewrite color space | `pdf-lib`, Canvas | Medium | Grayscale visual appearance, valid PDF |
| 35 | `deskew-pdf` | Auto & manual angle slider | Not offered | Manual slider (-30° to +30°) + auto Radon projection | Rotate canvas image and re-embed in PDF | Canvas, `pdf-lib` | Medium | Straightened output, angle precision |
| 36 | `repair-pdf` | Basic XRef repair | Corrupted PDF recovery | Rebuild broken XRef tables and reconstruct trailers | Permissive PDF parser reconstructing cross-references | `pdf-lib`, `qpdf` | High | Repair unreadable PDF with broken EOF |
| 37 | `add-page-numbers` | Custom format, 6 positions | Page numbers, 6 positions | Default `{n}` without "Page", 6-position grid | Worker text drawing with `{n}` and `{total}` macros | `pdf-lib` | Low | Correct page number stamped in right position |
| 38 | `watermark-pdf` | Text or image watermark | Text or image, position, opacity | Transparency, angle, opacity, zero branding | Custom user watermark overlay only | `pdf-lib` | Low | Proper opacity, angle, text string match |
| 39 | `header-footer-pdf` | 6-position header/footer grid | Not offered | 6 independent inputs: Left/Center/Right header & footer | Multi-cell text drawing with `{title}`, `{date}`, `{n}` | `pdf-lib` | Low | All 6 header/footer positions render cleanly |
| 40 | `bates-numbering-pdf` | Prefix, digits, sequential | Not offered | Legal discovery sequential numbering across multi-files | Global counter with zero-padded format (`000001`) | `pdf-lib` | Low | Multi-document continuous numbering |
| 41 | `annotate-pdf` | Highlights, comments, markup | Highlights, freehand, pencil | Quick markup toolbar with sticky notes & highlights | Native `/Annots` dictionary creation | `pdf-lib` | Medium | Annotations recognized in Adobe Reader |
| 42 | `delete-pdf-annotations` | Remove all or specific types | Not offered | Selective removal of comments, highlights, stamps | Inspect and delete `/Annots` arrays from pages | `pdf-lib` | Low | Annotations removed, document text untouched |
| 43 | `flatten-pdf` | Flatten forms or whole page | Flatten forms | Form field freeze vs full page rasterization | (1) `form.flatten()`, (2) full page canvas raster | `pdf-lib`, Canvas | Low | Static text fields, non-interactive output |
| 44 | `resize-pdf` | A4, Letter, Custom padding | Not offered | Standard paper sizes (A4, Letter) + margin padding | Update MediaBox and scale content stream | `pdf-lib` | Low | Output dimensions match requested paper size |
| 45 | `fill-pdf-forms` | Interactive AcroForm filler | PDF Form filler | Interactive browser fields mapping to PDF AcroForm | Parse fields, bind HTML inputs, commit to `pdf-lib` | `pdf-lib` | Medium | Field values saved and visible in PDF reader |
| 46 | `create-pdf-forms` | Form builder | Not offered | Drag-and-drop form field builder | Inject `/AcroForm` text fields, checkboxes, radios | `pdf-lib` | Medium | Fillable fields recognized by PDF readers |
| 47 | `sign-pdf` | Draw, type, or upload sign | Visual signature stamp | Signature pad canvas, stamp placement | Embed PNG signature stamp on specified coordinates | `pdf-lib`, Canvas | Low | Signature visible at specified location |
| 48 | `password-protect-pdf` | Standard password encryption | Password encryption | AES-128 / AES-256 standard encryption | Standard encryption requiring password to open | `pdf-lib`, `qpdf` | Medium | PDF reader prompts for password on opening |
| 49 | `unlock-pdf` | Remove security with password | Remove password restriction | Prompt for owner password, resave unencrypted | Decrypt document stream with provided password | `pdf-lib` | Medium | Document opens without password prompt |
| 50 | `redact-pdf` | Search text or draw box | Draw black box redactions | Destructive stream sanitization (not just black box) | Remove vector text streams & rasterize target coordinates | `pdf-lib`, `pdfjs-dist` | High | Zero searchable/selectable text under redaction |
| 51 | `pdf-to-pdfa` | Not offered | ISO 19005 archival conversion | PDF/A-1b and PDF/A-2b compliance validation | Inject XMP metadata schema, embed fonts, color profile | `pdf-lib` | Medium | Valid PDF/A XMP metadata schema |
| 52 | `compare-pdf` | Not offered | Dual side-by-side diff | Semantic Myers text diff + visual canvas diff | Text diff highlighting additions/deletions + visual diff | Canvas, Myers diff | High | Discrepancies highlighted accurately |
| 53 | `extract-images-from-pdf` | Extract all embedded images | Extract images into ZIP | Lossless `/XObject` image stream extraction into ZIP | Enumerate image objects across pages, package in ZIP | `pdfjs-dist`, `jszip` | Low | Valid ZIP containing original image files |
| 54 | `edit-pdf-metadata` | Title, Author, Subject, etc. | Metadata edit | Title, Author, Subject, Keywords, Creator, Producer | Update PDF Info dictionary and XMP metadata | `pdf-lib` | Low | Round-trip metadata inspection verified |
| 55 | `extract-pdf-text` | Raw text extraction | Text extraction | Clean reading order, dual preview & copy button | Worker `pdfjs-dist` engine extracting text lines | `pdfjs-dist` | Low | Clean `.txt` output with accurate text |
| 56 | `full-pdf-editing` | Full canvas PDF editor | Basic page editor | Full canvas studio with text, images, markup, shapes | Dedicated interactive studio `/editor` | `pdf-lib`, Canvas | High | Full export with all added elements |

---

## 3. Strict Non-AI & Privacy Architecture

PRA PDF explicitly diverges from recent competitor trends by rejecting all LLM APIs and external AI models:
- **Zero Third-Party AI:** No OpenAI, Claude, or Gemini integrations.
- **Deterministic OCR:** Scanned document OCR runs purely client-side via Tesseract.js WebAssembly.
- **Deterministic Parsing:** Text, tables, and forms are parsed with mathematical and geometric algorithms.
- **Strict 50 MB Limit:** Enforced at client, edge, and backend tiers.
- **Zero Unsolicited Watermarking:** PRA PDF will never append branding marks to user documents.
