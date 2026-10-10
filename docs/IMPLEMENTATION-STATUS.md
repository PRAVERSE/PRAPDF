# PRA PDF — 56 Services Implementation Status Tracker
**Product:** PRA PDF  
**Company:** PRAVERSE ("A PRAVERSE Company")  
**Production Worker:** [https://pra-pdf.praverse-auth.workers.dev](https://pra-pdf.praverse-auth.workers.dev/)  
**Website:** [https://prapdf.us.ci](https://prapdf.us.ci/)  
**Last Updated:** October 2026  

---

## 1. Status Definitions

Per strict delivery rules, services are categorized using only the authorized labels:
- **`Verified Live`**: Real production input/output test executed against the live Cloudflare Worker or website; verified valid output magic bytes, MIME type, filename, and readability.
- **`Implemented, Not Live-Verified`**: Code exists in codebase / test suite but not yet verified against the live production endpoint.
- **`Partially Implemented`**: Partial engine or UI exists without full end-to-end functionality.
- **`UI Only`**: Card, route, or button exists without backend/processing engine.
- **`Missing`**: Not yet present in registry or code.
- **`Blocked`**: Blocked by documented technical limitation.

---

## 2. Master Status Table (All 56 Services)

| # | Service ID | Service Name | Wave / Group | Current Status | Output Format | Verified Output Signature |
|---|---|---|---|---|---|---|
| 1 | `jpg-to-pdf` | JPG to PDF | Baseline | **Verified Live** | `.pdf` | `%PDF-` (1 page) |
| 2 | `png-to-pdf` | PNG to PDF | Baseline | **Verified Live** | `.pdf` | `%PDF-` (1 page) |
| 3 | `images-to-pdf` | Images to PDF | Wave 3 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 4 | `word-to-pdf` | Word to PDF | Wave 5 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 5 | `excel-to-pdf` | Excel to PDF | Wave 5 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 6 | `powerpoint-to-pdf` | PowerPoint to PDF | Wave 5 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 7 | `html-to-pdf` | HTML to PDF | Wave 3 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 8 | `txt-to-pdf` | TXT to PDF | Wave 3 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 9 | `markdown-to-pdf` | Markdown to PDF | Wave 3 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 10 | `rtf-to-pdf` | RTF to PDF | Wave 5 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 11 | `scan-to-pdf` | Scan to PDF | Wave 3 | Missing | `.pdf` | Pending |
| 12 | `pdf-to-jpg` | PDF to JPG | Wave 5 | Implemented, Not Live-Verified | `.jpg` / `.zip` | `FF D8 FF` / `PK` |
| 13 | `pdf-to-png` | PDF to PNG | Wave 5 | Implemented, Not Live-Verified | `.png` / `.zip` | `89 50 4E 47` / `PK` |
| 14 | `pdf-to-tiff` | PDF to TIFF | Wave 5 | Missing | `.tiff` / `.zip` | Pending |
| 15 | `pdf-to-markdown` | PDF to Markdown | Wave 5 | Implemented, Not Live-Verified | `.md` | Plaintext UTF-8 |
| 16 | `pdf-to-word` | PDF to Word | Wave 5 | Implemented, Not Live-Verified | `.docx` | `PK` (.docx) |
| 17 | `pdf-to-excel` | PDF to Excel | Wave 5 | Missing | `.xlsx` | Pending |
| 18 | `pdf-to-csv` | PDF to CSV | Wave 5 | Missing | `.csv` | Pending |
| 19 | `pdf-to-powerpoint` | PDF to PowerPoint | Wave 5 | Missing | `.pptx` | Pending |
| 20 | `pdf-to-rtf` | PDF to RTF | Wave 5 | Missing | `.rtf` | Pending |
| 21 | `merge-pdf` | Merge PDF | Baseline | **Verified Live** | `.pdf` | `%PDF-` (4 pages) |
| 22 | `split-pdf` | Split PDF | Baseline | **Verified Live** | `.pdf` / `.zip` | `%PDF-` / `PK` |
| 23 | `organize-pdf-pages`| Organize PDF Pages | Baseline | **Verified Live** | `.pdf` | `%PDF-` (3 pages) |
| 24 | `delete-pdf-pages` | Delete PDF Pages | Baseline | **Verified Live** | `.pdf` | `%PDF-` (2 pages) |
| 25 | `extract-pdf-pages` | Extract PDF Pages | Baseline | **Verified Live** | `.pdf` | `%PDF-` (2 pages) |
| 26 | `rotate-pdf` | Rotate PDF | Baseline | **Verified Live** | `.pdf` | `%PDF-` (90° rot) |
| 27 | `crop-pdf` | Crop PDF | Baseline | **Verified Live** | `.pdf` | `%PDF-` (CropBox) |
| 28 | `alternate-mix-pdf` | Alternate & Mix PDF | Wave 1 | **Verified Live** | `.pdf` | `%PDF-` (4 pages interleaved) |
| 29 | `split-pdf-in-half` | Split PDF in Half | Wave 1 | **Verified Live** | `.pdf` / `.zip` | `%PDF-` (4 pages halved) |
| 30 | `n-up-pdf` | N-up PDF | Wave 1 | **Verified Live** | `.pdf` | `%PDF-` (2-up sheets) |
| 31 | `flip-pdf` | Flip PDF | Wave 1 | **Verified Live** | `.pdf` | `%PDF-` (2 pages flipped) |
| 32 | `compress-pdf` | Compress PDF | Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 33 | `ocr-pdf` | OCR PDF | Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` (Searchable) |
| 34 | `grayscale-pdf` | Grayscale PDF | Wave 3 | Missing | `.pdf` | Pending |
| 35 | `deskew-pdf` | Deskew PDF | Wave 3 | Missing | `.pdf` | Pending |
| 36 | `repair-pdf` | Repair PDF | Wave 4 | Missing | `.pdf` | Pending |
| 37 | `add-page-numbers` | Add Page Numbers | Baseline | **Verified Live** | `.pdf` | `%PDF-` (`{n}`) |
| 38 | `watermark-pdf` | Watermark PDF | Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 39 | `header-footer-pdf` | Header & Footer | Wave 2 | Missing | `.pdf` | Pending |
| 40 | `bates-numbering-pdf`| Bates Numbering | Wave 2 | Missing | `.pdf` | Pending |
| 41 | `annotate-pdf` | Annotate PDF | Wave 2 | Missing | `.pdf` | Pending |
| 42 | `delete-pdf-annotations`| Delete Annotations| Wave 1 | **Verified Live** | `.pdf` | `%PDF-` (/Annots deleted) |
| 43 | `flatten-pdf` | Flatten PDF | Wave 2 | Missing | `.pdf` | Pending |
| 44 | `resize-pdf` | Resize PDF Pages | Wave 2 | Missing | `.pdf` | Pending |
| 45 | `fill-pdf-forms` | Fill PDF Forms | Wave 2 | Missing | `.pdf` | Pending |
| 46 | `create-pdf-forms` | Create PDF Forms | Wave 3 | Missing | `.pdf` | Pending |
| 47 | `sign-pdf` | Sign PDF | Wave 2 | Missing | `.pdf` | Pending |
| 48 | `password-protect-pdf`| Password-Protect PDF| Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 49 | `unlock-pdf` | Unlock PDF | Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |
| 50 | `redact-pdf` | Redact PDF | Wave 4 | Missing | `.pdf` | Pending |
| 51 | `pdf-to-pdfa` | PDF to PDF/A | Wave 3 | Missing | `.pdf` | Pending |
| 52 | `compare-pdf` | Compare PDF | Wave 4 | Missing | Visual / `.pdf` | Pending |
| 53 | `extract-images-from-pdf`| Extract Images | Wave 2 | Missing | `.zip` | Pending |
| 54 | `edit-pdf-metadata`| Edit PDF Metadata | Baseline | **Verified Live** | `.pdf` | `%PDF-` (Title/Author) |
| 55 | `extract-pdf-text` | Extract PDF Text | Baseline | **Verified Live** | `.txt` | Plaintext UTF-8 |
| 56 | `full-pdf-editing` | Full PDF Editing | Wave 4 | Implemented, Not Live-Verified | `.pdf` | `%PDF-` |

---

## 3. Current Live Production Verification Summary
- **Verified Live in Production:** 17 / 56 services (100% passing live I/O tests against `https://pra-pdf.praverse-auth.workers.dev`)
- **Implemented, Not Live-Verified:** 18 / 56 services
- **Missing (To Be Implemented in Waves):** 21 / 56 services
- **Partially Implemented / Broken / Blocked:** 0
