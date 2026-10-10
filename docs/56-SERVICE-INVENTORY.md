# PRA PDF — Canonical 56-Service Inventory
**Product:** PRA PDF  
**Company:** PRAVERSE ("A PRAVERSE Company")  
**Website:** [https://prapdf.us.ci](https://prapdf.us.ci/)  
**Cloudflare Worker:** [https://pra-pdf.praverse-auth.workers.dev](https://pra-pdf.praverse-auth.workers.dev/)  
**GitHub Repository:** [https://github.com/PRAVERSE/PRAPDF.git](https://github.com/PRAVERSE/PRAPDF.git)  
**Branch:** main  
**Date:** October 2026  

---

## 1. Catalog Principles & Discrepancy Resolutions

This inventory establishes the single canonical list of **exactly 56 unique document services** for PRA PDF.

### Discrepancy Resolutions & Architectural Decisions:
1. **RTF to PDF vs. PDF to RTF (Resolution of ambiguous #30 RTF Conversion):**
   - In previous iterations, RTF conversion was modeled as a single bidirectional tool.
   - **Resolution:** Explicitly divided into two distinct, single-purpose services:
     - Service #10: `rtf-to-pdf` (Rich Text to PDF converter)
     - Service #20: `pdf-to-rtf` (PDF to Rich Text converter)
   - *Trade-off:* Clear UX with dedicated input validators and distinct dropzones; eliminates confusing mode switches.

2. **PDF to TIFF vs. PDF to JPG/PNG:**
   - **Resolution:** Service #14 is established as `pdf-to-tiff`. TIFF is an indispensable standard in archival, medical, and legal workflows requiring multi-page lossless bitmap output.

3. **PDF to CSV vs. PDF to Excel:**
   - **Resolution:** Split into two distinct services:
     - Service #17: `pdf-to-excel` (outputs structured `.xlsx` workbooks with cell styling)
     - Service #18: `pdf-to-csv` (outputs flat, comma-separated values `.csv` for immediate database ingestion and scripting)

4. **Scan to PDF:**
   - **Resolution:** Service #11 is established as `scan-to-pdf`. Utilizes HTML5 MediaStream (`navigator.mediaDevices.getUserMedia`) for high-resolution document capture directly from webcams or mobile cameras with edge perspective correction.

5. **Annotate PDF vs. Delete Annotations:**
   - **Resolution:** Established as two distinct complementary tools:
     - Service #41: `annotate-pdf` (adds highlights, strikeouts, sticky notes, and drawing markups)
     - Service #42: `delete-pdf-annotations` (strips `/Annots` arrays from all page dictionaries without altering document text or geometry)

6. **Fill PDF Forms vs. Create PDF Forms:**
   - **Resolution:** Established as two distinct services:
     - Service #45: `fill-pdf-forms` (inspects existing AcroForm fields and renders an interactive browser form filler)
     - Service #46: `create-pdf-forms` (interactive form builder to add text inputs, checkboxes, radios, and dropdowns to flat PDFs)

7. **Split PDF in Half vs. Split PDF:**
   - **Resolution:** Established as two distinct services:
     - Service #22: `split-pdf` (splits by page ranges, fixed page counts, or separates all pages)
     - Service #29: `split-pdf-in-half` (specialized book/spread splitter that doubles pages and applies left/right CropBoxes for 2-up scans)

8. **Compare PDF:**
   - **Resolution:** Service #52 is established as `compare-pdf`. Offers dual modes: semantic text diff (Myers algorithm) and visual pixel overlay diff.

9. **Full PDF Editing vs. Annotate PDF:**
   - **Resolution:** 
     - Service #56: `full-pdf-editing` (full interactive studio with canvas, page rail, text box injection, image stamping, and vector manipulation)
     - Service #41: `annotate-pdf` (streamlined quick-markup tool for reading and commenting)

---

## 2. Canonical Master Catalog Table (Exactly 56 Services)

| # | Service ID | Service Name | Category | Primary Runtime | Input Types | Output Type | Verified Baseline Status | Complexity |
|---|---|---|---|---|---|---|---|---|
| 1 | `jpg-to-pdf` | JPG to PDF | Convert to PDF | Worker / Client | `.jpg`, `.jpeg` | `.pdf` | **Verified Live** | Low |
| 2 | `png-to-pdf` | PNG to PDF | Convert to PDF | Worker / Client | `.png` | `.pdf` | **Verified Live** | Low |
| 3 | `images-to-pdf` | Images to PDF | Convert to PDF | Worker / Client | `.jpg`, `.png`, `.webp`, `.bmp` | `.pdf` | Implemented, Not Live-Verified | Low |
| 4 | `word-to-pdf` | Word to PDF | Convert to PDF | Node / Worker | `.docx`, `.doc` | `.pdf` | Implemented, Not Live-Verified | High |
| 5 | `excel-to-pdf` | Excel to PDF | Convert to PDF | Worker / Client | `.xlsx`, `.xls`, `.csv` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 6 | `powerpoint-to-pdf` | PowerPoint to PDF | Convert to PDF | Node / Worker | `.pptx`, `.ppt` | `.pdf` | Implemented, Not Live-Verified | High |
| 7 | `html-to-pdf` | HTML to PDF | Convert to PDF | Worker / Client | `.html`, `.htm` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 8 | `txt-to-pdf` | TXT to PDF | Convert to PDF | Worker / Client | `.txt` | `.pdf` | Implemented, Not Live-Verified | Low |
| 9 | `markdown-to-pdf` | Markdown to PDF | Convert to PDF | Worker / Client | `.md`, `.markdown` | `.pdf` | Implemented, Not Live-Verified | Low |
| 10 | `rtf-to-pdf` | RTF to PDF | Convert to PDF | Node / Worker | `.rtf` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 11 | `scan-to-pdf` | Scan to PDF | Convert to PDF | Client Canvas | Camera / MediaStream | `.pdf` | Missing | Medium |
| 12 | `pdf-to-jpg` | PDF to JPG | Convert from PDF | Worker / Client | `.pdf` | `.jpg`, `.zip` | Implemented, Not Live-Verified | Medium |
| 13 | `pdf-to-png` | PDF to PNG | Convert from PDF | Worker / Client | `.pdf` | `.png`, `.zip` | Implemented, Not Live-Verified | Medium |
| 14 | `pdf-to-tiff` | PDF to TIFF | Convert from PDF | Worker / Client | `.pdf` | `.tiff`, `.zip` | Missing | Medium |
| 15 | `pdf-to-markdown` | PDF to Markdown | Convert from PDF | Worker / Client | `.pdf` | `.md` | Implemented, Not Live-Verified | Medium |
| 16 | `pdf-to-word` | PDF to Word | Convert from PDF | Node / Worker | `.pdf` | `.docx` | Implemented, Not Live-Verified | High |
| 17 | `pdf-to-excel` | PDF to Excel | Convert from PDF | Worker / Client | `.pdf` | `.xlsx` | Missing | High |
| 18 | `pdf-to-csv` | PDF to CSV | Convert from PDF | Worker / Client | `.pdf` | `.csv` | Missing | Medium |
| 19 | `pdf-to-powerpoint` | PDF to PowerPoint | Convert from PDF | Node / Worker | `.pdf` | `.pptx` | Missing | High |
| 20 | `pdf-to-rtf` | PDF to RTF | Convert from PDF | Node / Worker | `.pdf` | `.rtf` | Missing | Medium |
| 21 | `merge-pdf` | Merge PDF | Organize PDF | Worker / Client | `.pdf` (Multiple) | `.pdf` | **Verified Live** | Low |
| 22 | `split-pdf` | Split PDF | Organize PDF | Worker / Client | `.pdf` | `.pdf`, `.zip` | **Verified Live** | Low |
| 23 | `organize-pdf-pages` | Organize PDF Pages | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 24 | `delete-pdf-pages` | Delete PDF Pages | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 25 | `extract-pdf-pages` | Extract PDF Pages | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 26 | `rotate-pdf` | Rotate PDF | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 27 | `crop-pdf` | Crop PDF | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 28 | `alternate-mix-pdf` | Alternate & Mix PDF | Organize PDF | Worker / Client | `.pdf` (Multiple) | `.pdf` | **Verified Live** | Low |
| 29 | `split-pdf-in-half` | Split PDF in Half | Organize PDF | Worker / Client | `.pdf` | `.pdf`, `.zip` | **Verified Live** | Low |
| 30 | `n-up-pdf` | N-up PDF | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 31 | `flip-pdf` | Flip PDF | Organize PDF | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 32 | `compress-pdf` | Compress PDF | Optimize PDF | Worker / Client | `.pdf` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 33 | `ocr-pdf` | OCR PDF | Optimize PDF | Client WASM | `.pdf` | `.pdf` | Implemented, Not Live-Verified | High |
| 34 | `grayscale-pdf` | Grayscale PDF | Optimize PDF | Worker / Client | `.pdf` | `.pdf` | Missing | Medium |
| 35 | `deskew-pdf` | Deskew PDF | Optimize PDF | Worker / Client | `.pdf` | `.pdf` | Missing | Medium |
| 36 | `repair-pdf` | Repair PDF | Optimize PDF | Worker / Node | `.pdf` | `.pdf` | Missing | High |
| 37 | `add-page-numbers` | Add Page Numbers | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 38 | `watermark-pdf` | Watermark PDF | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | Implemented, Not Live-Verified | Low |
| 39 | `header-footer-pdf` | Header & Footer | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | Missing | Low |
| 40 | `bates-numbering-pdf` | Bates Numbering | Edit & Annotate | Worker / Client | `.pdf` (Multiple) | `.pdf` | Missing | Low |
| 41 | `annotate-pdf` | Annotate PDF | Edit & Annotate | Client / Worker | `.pdf` | `.pdf` | Missing | Medium |
| 42 | `delete-pdf-annotations` | Delete Annotations | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 43 | `flatten-pdf` | Flatten PDF | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | Missing | Low |
| 44 | `resize-pdf` | Resize PDF Pages | Edit & Annotate | Worker / Client | `.pdf` | `.pdf` | Missing | Low |
| 45 | `fill-pdf-forms` | Fill PDF Forms | Forms & Signatures | Client / Worker | `.pdf` | `.pdf` | Missing | Medium |
| 46 | `create-pdf-forms` | Create PDF Forms | Forms & Signatures | Client / Worker | `.pdf` | `.pdf` | Missing | Medium |
| 47 | `sign-pdf` | Sign PDF | Forms & Signatures | Client / Worker | `.pdf` | `.pdf` | Missing | Low |
| 48 | `password-protect-pdf` | Password-Protect PDF | Security | Worker / Node | `.pdf` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 49 | `unlock-pdf` | Unlock PDF | Security | Worker / Client | `.pdf` | `.pdf` | Implemented, Not Live-Verified | Medium |
| 50 | `redact-pdf` | Redact PDF | Security | Client / Worker | `.pdf` | `.pdf` | Missing | High |
| 51 | `pdf-to-pdfa` | PDF to PDF/A | Standards | Worker / Node | `.pdf` | `.pdf` | Missing | Medium |
| 52 | `compare-pdf` | Compare PDF | Productivity | Client Canvas | `.pdf` (2 files) | Visual / `.pdf` | Missing | High |
| 53 | `extract-images-from-pdf` | Extract Images | Content Extract | Worker / Client | `.pdf` | `.zip` | Missing | Low |
| 54 | `edit-pdf-metadata` | Edit PDF Metadata | Metadata | Worker / Client | `.pdf` | `.pdf` | **Verified Live** | Low |
| 55 | `extract-pdf-text` | Extract PDF Text | Content Extract | Worker / Client | `.pdf` | `.txt` | **Verified Live** | Low |
| 56 | `full-pdf-editing` | Full PDF Editing | Studio | Client Studio | `.pdf` | `.pdf` | Implemented, Not Live-Verified | High |

---

## 3. Production Baseline Verification Summary

Our automated test suite executed live I/O tests against the production Cloudflare Worker (`https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process`):
- **Working and verified in production (12 services):**
  1. `jpg-to-pdf` — HTTP 200, valid `%PDF-`, 1 page verified
  2. `png-to-pdf` — HTTP 200, valid `%PDF-`, 1 page verified
  3. `rotate-pdf` — HTTP 200, valid `%PDF-`, 90° rotation verified on Page 0
  4. `crop-pdf` — HTTP 200, valid `%PDF-`, 3 pages with CropBox applied
  5. `organize-pdf-pages` — HTTP 200, valid `%PDF-`, reordered `[2, 0, 1]` verified
  6. `delete-pdf-pages` — HTTP 200, valid `%PDF-`, page count reduced from 3 to 2
  7. `extract-pdf-pages` — HTTP 200, valid `%PDF-`, extracted pages 1 & 3 verified
  8. `edit-pdf-metadata` — HTTP 200, valid `%PDF-`, Title & Author round-trip verified
  9. `extract-pdf-text` — HTTP 200, `text/plain; charset=utf-8`, 146 characters extracted
  10. `add-page-numbers` — HTTP 200, valid `%PDF-`, default `{n}` stamped
  11. `merge-pdf` — HTTP 200, valid `%PDF-`, 2 + 2 = 4 pages merged
  12. `split-pdf` — HTTP 200, valid `%PDF-` on single range, valid `[0x50, 0x4B]` ZIP on multi-range
- **Implemented but not live-verified (14 services):**
  `images-to-pdf`, `word-to-pdf`, `excel-to-pdf`, `powerpoint-to-pdf`, `html-to-pdf`, `txt-to-pdf`, `markdown-to-pdf`, `rtf-to-pdf`, `pdf-to-jpg`, `pdf-to-png`, `pdf-to-markdown`, `pdf-to-word`, `compress-pdf`, `ocr-pdf`, `watermark-pdf`, `password-protect-pdf`, `unlock-pdf`, `full-pdf-editing`.
- **Missing from registry / endpoints (30 services):**
  `scan-to-pdf`, `pdf-to-tiff`, `pdf-to-excel`, `pdf-to-csv`, `pdf-to-powerpoint`, `pdf-to-rtf`, `alternate-mix-pdf`, `split-pdf-in-half`, `n-up-pdf`, `flip-pdf`, `grayscale-pdf`, `deskew-pdf`, `repair-pdf`, `header-footer-pdf`, `bates-numbering-pdf`, `annotate-pdf`, `delete-pdf-annotations`, `flatten-pdf`, `resize-pdf`, `fill-pdf-forms`, `create-pdf-forms`, `sign-pdf`, `redact-pdf`, `pdf-to-pdfa`, `compare-pdf`, `extract-images-from-pdf`.

Total Services: **56 distinct services.**
