# PRA PDF — Difficulty-Based Implementation Roadmap (5 Waves)
**Product:** PRA PDF  
**Company:** PRAVERSE ("A PRAVERSE Company")  
**Target:** 56 Services  
**Date:** October 2026  

---

## 1. Architectural Strategy & Phased Wave Design

To implement the remaining services reliably without regressions, the work is strictly partitioned into **5 Implementation Waves** ordered from lowest risk/effort to highest technical complexity:

```
[Baseline: 12 Active Services Verified Live in Production]
               │
               ▼
   [Wave 1 — Easiest (Pure pdf-lib & Vector Transforms)]
   • delete-pdf-annotations • flip-pdf • split-pdf-in-half • alternate-mix-pdf • n-up-pdf
               │
               ▼
   [Wave 2 — Easy to Medium (Layout, Stamping, Forms & Images)]
   • header-footer-pdf • bates-numbering-pdf • flatten-pdf • sign-pdf • annotate-pdf
   • fill-pdf-forms • extract-images-from-pdf • resize-pdf
               │
               ▼
   [Wave 3 — Medium (Deskew, Grayscale, Archival & Document Text)]
   • grayscale-pdf • deskew-pdf • pdf-to-pdfa • scan-to-pdf • images-to-pdf
   • txt-to-pdf • markdown-to-pdf • html-to-pdf • create-pdf-forms
               │
               ▼
   [Wave 4 — Hard (Security, Sanitization, Repair & Comparison)]
   • redact-pdf • repair-pdf • compare-pdf • compress-pdf • ocr-pdf
   • password-protect-pdf • unlock-pdf • full-pdf-editing
               │
               ▼
   [Wave 5 — Hardest (Office Conversions & Tabular Extraction)]
   • pdf-to-jpg • pdf-to-png • pdf-to-tiff • pdf-to-excel • pdf-to-csv
   • pdf-to-word • word-to-pdf • excel-to-pdf • powerpoint-to-pdf • pdf-to-powerpoint
   • pdf-to-markdown • rtf-to-pdf • pdf-to-rtf
```

---

## 2. Detailed Wave Breakdown

### Wave 1 — Easiest (5 Services)
*Focus: Pure in-memory vector/coordinate page manipulation. Runs natively inside Cloudflare Worker and browser with zero external dependencies.*
1. **`delete-pdf-annotations`**: Traverses page dictionaries and strips `/Annots` arrays.
2. **`flip-pdf`**: Applies coordinate transformation matrix `cm [-1 0 0 1 width 0]` (horizontal) or `cm [1 0 0 -1 0 height]` (vertical).
3. **`split-pdf-in-half`**: Duplicates each page, applying left-half CropBox and right-half CropBox for two-page book scans.
4. **`alternate-mix-pdf`**: Interleaves pages from 2+ documents (with reverse order toggle for back-page scans).
5. **`n-up-pdf`**: Imposition tool embedding multiple pages scaled onto new sheets (2-up, 4-up, 8-up).

### Wave 2 — Easy to Medium (8 Services)
*Focus: Document enhancement, legal numbering, form flattening, visual signing, and image extraction.*
6. **`header-footer-pdf`**: Unified 6-cell header/footer layout grid with `{title}`, `{date}`, `{n}` tokens.
7. **`bates-numbering-pdf`**: Sequential legal numbering across multi-file documents with zero-padded format (`000001`).
8. **`flatten-pdf`**: Freezes AcroForm fields into static vector text (`form.flatten()`) or rasterizes page to image.
9. **`sign-pdf`**: Interactive signature pad canvas stamping signature images at selected coordinates.
10. **`annotate-pdf`**: Native PDF annotation creator (highlights, notes, underlines).
11. **`fill-pdf-forms`**: Reads AcroForm fields, renders HTML inputs, and commits user values back to PDF.
12. **`extract-images-from-pdf`**: Enumerates `/XObject /Image` streams and packages raw images into a ZIP archive.
13. **`resize-pdf`**: Changes page MediaBox dimensions and adds uniform margin padding.

### Wave 3 — Medium (9 Services)
*Focus: Scans, deskewing, color desaturation, archival standards, and text-to-document conversions.*
14. **`grayscale-pdf`**: Desaturates color streams and raster images to monochrome/gray.
15. **`deskew-pdf`**: Straightens tilted scanned documents using canvas rotation and Radon projection.
16. **`pdf-to-pdfa`**: Injects ISO 19005 archival metadata schemas (`pdfaExtension`) and sanitizes streams.
17. **`scan-to-pdf`**: In-browser camera capture with perspective correction to clean PDF.
18. **`images-to-pdf`**: Mixed image collation and drag-and-drop reordering into single multi-page PDF.
19. **`txt-to-pdf`**: Plain text typesetting with font sizing and page wrapping.
20. **`markdown-to-pdf`**: GitHub-style markdown parsing and rendering to styled PDF.
21. **`html-to-pdf`**: HTML/CSS rendering to paginated PDF.
22. **`create-pdf-forms`**: AcroForm field builder (injecting interactive text fields, checkboxes, dropdowns).

### Wave 4 — Hard (8 Services)
*Focus: Security sanitization, document reconstruction, OCR, comparison, and full editor studio.*
23. **`redact-pdf`**: Permanent, destructive sanitization removing underlying glyph streams and pixels.
24. **`repair-pdf`**: Rebuilds broken XRef tables and reconstructs corrupted EOF trailers.
25. **`compare-pdf`**: Semantic text difference analysis (Myers diff) + visual overlay highlighting discrepancies.
26. **`compress-pdf`**: Stream deduplication and image downsampling profiles.
27. **`ocr-pdf`**: Deterministic client-side WebAssembly OCR (Tesseract.js WASM) creating invisible searchable text layer.
28. **`password-protect-pdf`**: AES-128 / AES-256 standard PDF encryption.
29. **`unlock-pdf`**: Decrypts password-protected PDFs with user password.
30. **`full-pdf-editing`**: Full-screen interactive editing studio (`/editor`).

### Wave 5 — Hardest (13 Services)
*Focus: High-fidelity rasterization and bi-directional Office / tabular conversions.*
31. **`pdf-to-jpg`**: High-resolution page rasterization to JPG (single or ZIP).
32. **`pdf-to-png`**: Lossless page rasterization to PNG with transparent background.
33. **`pdf-to-tiff`**: Multi-page lossless TIFF bitmap container creation.
34. **`pdf-to-excel`**: Coordinate text clustering into structured `.xlsx` workbooks.
35. **`pdf-to-csv`**: Coordinate text clustering into flat `.csv` tables.
36. **`pdf-to-word`**: Flowing text and table extraction into editable `.docx` files.
37. **`word-to-pdf`**: Word `.docx` to PDF rendering.
38. **`excel-to-pdf`**: Spreadsheets `.xlsx` to formatted PDF tables.
39. **`powerpoint-to-pdf`**: Slides `.pptx` to presentation PDF.
40. **`pdf-to-powerpoint`**: PDF pages to `.pptx` slides.
41. **`pdf-to-markdown`**: Structural PDF hierarchy to Markdown.
42. **`rtf-to-pdf`**: Rich Text Format to PDF.
43. **`pdf-to-rtf`**: PDF to Rich Text Format.

---

## 3. Strict Verification & Delivery Gates

For each wave:
1. Engine implementation in `src/worker/engines/` and client service in `src/services/`.
2. Master tools registry expansion in `src/services/toolsRegistry.ts`.
3. Worker dispatch switchboard registration in `src/worker/index.ts` and `src/worker/cfProcessor.ts`.
4. Automated unit and integration test creation in `tests/`.
5. Run `cmd /c npx vitest run` to ensure zero regressions.
6. Run `cmd /c npx tsc --noEmit` to verify type safety.
7. Deploy to Cloudflare Worker via `cmd /c npx wrangler deploy`.
8. Execute live production I/O verification against `https://pra-pdf.praverse-auth.workers.dev`.
9. Git commit and push to `origin/main`.
