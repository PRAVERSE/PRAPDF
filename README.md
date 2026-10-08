# PRA PDF — Professional Document & PDF Utility Suite
**PRA PDF — A PRAVERSE Company**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-42%20Passing-brightgreen.svg)]()
[![Zero AI](https://img.shields.io/badge/Zero%20AI-Guaranteed-informational.svg)]()
[![Phase 3 Complete](https://img.shields.io/badge/Phase%203-100%25%20Verified-success.svg)]()

---

## 1. Overview
**PRA PDF** is a professional online document and PDF toolkit created by **PRAVERSE**. It consolidates common document and PDF manipulation workflows into a unified, high-performance platform.

- **Strict Zero-AI Architecture**: PRA PDF uses pure algorithmic and programmatic document manipulation (PDF specification parsing, geometry transforms, format transcoders). No AI chatbots, AI summaries, LLM hallucinations, or third-party AI APIs.
- **Zero Unsolicited Watermarks**: 100% clean, professional document exports. Absolutely NO PRA PDF watermark, logo, or promotional stamp is ever appended to any output unless explicitly designed by the user in the watermark tool.
- **Privacy & Security**: Files are uploaded to private temporary cloud storage (Backblaze B2), retained only during active processing, and automatically purged.
- **Audit Trails**: Original uploads are backed up to a dedicated private Telegram audit channel with metadata tracking (`message_id`, `file_id`).
- **Separation of Concerns**: Lightweight API gateway handles security, upload ingestion, validation, and job orchestration. Heavy CPU/memory tasks are routed to a dedicated processing server.

---

## 2. Architecture & Pipeline Topology

```text
Frontend (Frozen UI / Vanilla CSS)
    ↓  [Multipart or Streaming Binary Upload, hard 50 MB server-side limit]
API Gateway Server (:3001) (/api/v1/jobs)
    ↓
B2 Temporary Storage (jobs/{jobId}/input/{safeFileId})
    ↓
Telegram Private Channel (Original File Backup Only; message_id, file_id recorded)
    ↓
Dedicated Processing Server (:3002) (Authenticated via PROCESSOR_SHARED_SECRET)
    ↓
B2 Output Storage (jobs/{jobId}/output/{safeFileId})
    ↓
Frontend Result Download (10-Minute Signed Download URL)
    ↓
Automated Cleanup Worker (B2 ~10 min, Telegram ~24 hr, Workspace immediate)
```

### Core System Components
1. **Frontend**: Custom Vanilla CSS and HTML5 UI with a complete 30-tool catalog and frozen design system.
2. **API Server (`src/server/`)**: Built on Node.js standard HTTP modules with zero unnecessary framework overhead.
3. **Storage Abstraction (`src/server/storage/`)**: S3-compatible Backblaze B2 client supporting multi-bucket failover (`B2_1`, `B2_2`, `B2_3`, `B2_4`).
4. **Job System (`src/server/jobs/`)**: Persistent SQLite state machine powered by Node 24's native `node:sqlite` (`DatabaseSync`), stored in `.pra_data/jobs.db`.
5. **Backup Adapter (`src/server/backup/`)**: Telegram Bot API integration for original file backup and retention.
6. **Processor Adapter (`src/server/processor/`)**: External processing server client.
7. **Cleanup Worker (`src/server/cleanup/`)**: Automated 60-second sweep worker enforcing ephemeral file policies.

---

## 3. The 30 Verified Services Implementation Matrix

All 30 canonical operations are fully implemented, verified, and backed by genuine processing engines in `src/processor/engines/`:

| # | Service Name | Service ID | Input Extensions | Output | Batch | Implementation Engine File | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :--- | :---: |
| **1** | JPG to PDF | `jpg-to-pdf` | `.jpg`, `.jpeg` | `.pdf` | Batch 1 | `src/processor/engines/jpgToPdf.ts` | **VERIFIED** |
| **2** | PNG to PDF | `png-to-pdf` | `.png` | `.pdf` | Batch 1 | `src/processor/engines/pngToPdf.ts` | **VERIFIED** |
| **3** | Images to PDF | `images-to-pdf` | `.jpg`, `.png`, `.webp`, `.bmp` | `.pdf` | Batch 1 | `src/processor/engines/imagesToPdf.ts` | **VERIFIED** |
| **4** | Word to PDF | `word-to-pdf` | `.docx`, `.doc` | `.pdf` | Batch 4 | `src/processor/engines/wordToPdf.ts` | **VERIFIED** |
| **5** | Excel to PDF | `excel-to-pdf` | `.xlsx`, `.xls`, `.csv` | `.pdf` | Batch 4 | `src/processor/engines/excelToPdf.ts` | **VERIFIED** |
| **6** | PowerPoint to PDF | `powerpoint-to-pdf` | `.pptx`, `.ppt` | `.pdf` | Batch 4 | `src/processor/engines/powerpointToPdf.ts` | **VERIFIED** |
| **7** | HTML to PDF | `html-to-pdf` | `.html`, `.htm` | `.pdf` | Batch 3 | `src/processor/engines/htmlToPdf.ts` | **VERIFIED** |
| **8** | TXT to PDF | `txt-to-pdf` | `.txt` | `.pdf` | Batch 3 | `src/processor/engines/txtToPdf.ts` | **VERIFIED** |
| **9** | Markdown to PDF | `markdown-to-pdf` | `.md`, `.markdown` | `.pdf` | Batch 3 | `src/processor/engines/markdownToPdf.ts` | **VERIFIED** |
| **10** | PDF to JPG | `pdf-to-jpg` | `.pdf` | `.zip` | Batch 1 | `src/processor/engines/pdfToJpg.ts` | **VERIFIED** |
| **11** | PDF to PNG | `pdf-to-png` | `.pdf` | `.zip` | Batch 1 | `src/processor/engines/pdfToPng.ts` | **VERIFIED** |
| **12** | PDF to Markdown | `pdf-to-markdown` | `.pdf` | `.md` | Batch 3 | `src/processor/engines/pdfToMarkdown.ts` | **VERIFIED** |
| **13** | PDF to Word | `pdf-to-word` | `.pdf` | `.docx` | Batch 4 | `src/processor/engines/pdfToWord.ts` | **VERIFIED** |
| **14** | Merge PDF | `merge-pdf` | `.pdf` (multiple) | `.pdf` | Batch 2 | `src/processor/engines/mergePdf.ts` | **VERIFIED** |
| **15** | Split PDF | `split-pdf` | `.pdf` | `.zip` / `.pdf` | Batch 2 | `src/processor/engines/splitPdf.ts` | **VERIFIED** |
| **16** | Organize PDF Pages | `organize-pdf-pages` | `.pdf` | `.pdf` | Batch 2 | `src/processor/engines/organizePdf.ts` | **VERIFIED** |
| **17** | Delete PDF Pages | `delete-pdf-pages` | `.pdf` | `.pdf` | Batch 2 | `src/processor/engines/deletePdfPages.ts` | **VERIFIED** |
| **18** | Extract PDF Pages | `extract-pdf-pages` | `.pdf` | `.pdf` | Batch 2 | `src/processor/engines/extractPdfPages.ts` | **VERIFIED** |
| **19** | Rotate PDF | `rotate-pdf` | `.pdf` | `.pdf` | Batch 2 | `src/processor/engines/rotatePdf.ts` | **VERIFIED** |
| **20** | Crop PDF | `crop-pdf` | `.pdf` | `.pdf` | Batch 2 | `src/processor/engines/cropPdf.ts` | **VERIFIED** |
| **21** | Compress PDF | `compress-pdf` | `.pdf` | `.pdf` | Batch 5 | `src/processor/engines/compressPdf.ts` | **VERIFIED** |
| **22** | OCR PDF | `ocr-pdf` | `.pdf` | `.pdf` | Batch 5 | `src/processor/engines/ocrPdf.ts` | **VERIFIED** |
| **23** | Add Page Numbers | `add-page-numbers` | `.pdf` | `.pdf` | Batch 6 | `src/processor/engines/addPageNumbers.ts` | **VERIFIED** |
| **24** | Watermark PDF | `watermark-pdf` | `.pdf` | `.pdf` | Batch 6 | `src/processor/engines/watermarkPdf.ts` | **VERIFIED** |
| **25** | Full PDF Editing | `full-pdf-editing` | `.pdf` | `.pdf` | Batch 7 | `src/processor/engines/fullPdfEditor.ts` | **VERIFIED** |
| **26** | Password-Protect PDF | `password-protect-pdf`| `.pdf` | `.pdf` | Batch 6 | `src/processor/engines/protectPdf.ts` | **VERIFIED** |
| **27** | Unlock PDF | `unlock-pdf` | `.pdf` | `.pdf` | Batch 6 | `src/processor/engines/unlockPdf.ts` | **VERIFIED** |
| **28** | Edit PDF Metadata | `edit-pdf-metadata` | `.pdf` | `.pdf` | Batch 6 | `src/processor/engines/editPdfMetadata.ts` | **VERIFIED** |
| **29** | Extract PDF Text | `extract-pdf-text` | `.pdf` | `.txt` | Batch 3 | `src/processor/engines/extractPdfText.ts` | **VERIFIED** |
| **30** | RTF Conversion | `rtf-conversion` | `.rtf`, `.pdf` | `.pdf` / `.rtf` | Batch 4 | `src/processor/engines/rtfConversion.ts` | **VERIFIED** |

*Note: Zero fake mocks. All 30 services use real algorithmic engines.*

---

## 4. Security & Multi-Tier Guards

- **Hard 50 MB Upload Limit**: Enforced server-side upfront on `Content-Length` headers and continuously during streaming byte chunk ingestion (`FILE_TOO_LARGE` / HTTP 413).
- **Safe Storage Keys**: Storage keys follow strict server-generated formats: `jobs/{jobId}/(input|output)/{safeFileId}`. User filenames are preserved in metadata only.
- **Path Traversal Protection**: Rejects all directory traversal sequences (`..`, `/../`, null bytes, absolute paths).
- **Zero Credential Exposure**: Backblaze B2 application keys and Telegram tokens are isolated server-side. Automatic secret scrubbing runs on all structured log outputs.
- **Ephemeral Lifecycle**: B2 temporary files expire and delete in ~10 minutes. Telegram original backups purge after ~24 hours. Local workspace files are deleted immediately upon completion.

---

## 5. Getting Started & Local Execution

### Prerequisites
- Node.js `v20+` or `v24+` (Node 24 recommended for native `node:sqlite`)
- npm

### Installation
```bash
git clone https://github.com/PRAVERSE/PRAPDF.git
cd PRAPDF/pra-pdf

# Install dependencies
npm install
```

### Environment Configuration
Copy the template and supply your credentials:
```bash
cp .env.example .env
```
*(Never commit `.env` to source control. It is explicitly ignored in `.gitignore`.)*

### Running the System
```bash
# 1. Start the Dedicated Processing Server (Port 3002)
npm run processor

# 2. Start the Backend API Server (Port 3001)
npm run server

# 3. Start the Frontend Development Server (Port 5173 with proxy to 3001)
npm run dev

# 4. Run Automated Test Suite
npm test

# 5. Production Bundle Build
npm run build
```

---

## 6. End-to-End Integration Testing
Two dedicated end-to-end integration test runners validate all services across live infrastructure:
```bash
# Test all 30 services across all 7 batches end-to-end
npx tsx scripts/all_batches_integration_test.ts

# Test Batch 1 focused conversions
npx tsx scripts/batch1_integration_test.ts
```

---

## 7. Open Source Attributions & Compliance
PRA PDF incorporates and adapts battle-tested open-source components with full attribution preserved:
- See [`LICENSES-AND-ATTRIBUTIONS.md`](file:///c:/Users/hp/OneDrive/Desktop/PRAPDF/pra-pdf/LICENSES-AND-ATTRIBUTIONS.md) for licenses and notices regarding BentoPDF (AGPL-3.0), Stirling-PDF (MIT), PDFCraft (MIT), PDFArranger (GPL-3.0), pdf-lib (MIT), and related libraries.

---

## 8. License
Copyright © 2026 PRAVERSE. All rights reserved.
