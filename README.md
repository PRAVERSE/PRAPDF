# PRA PDF — Professional Document & PDF Utility Suite
**PRA PDF — A PRAVERSE Company**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24%2B-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-42%20Passing-brightgreen.svg)]()
[![Zero AI](https://img.shields.io/badge/Zero%20AI-Guaranteed-informational.svg)]()

---

## 1. Overview
**PRA PDF** is a professional online document and PDF toolkit created by **PRAVERSE**. It consolidates common document and PDF manipulation workflows into a unified, high-performance platform.

- **Strict Zero-AI Architecture**: PRA PDF uses pure algorithmic and programmatic document manipulation (PDF specification parsing, geometry transforms, format transcoders). No AI chatbots, AI summaries, LLM hallucinations, or third-party AI APIs.
- **Privacy & Security**: Files are uploaded to private temporary cloud storage (Backblaze B2), retained only during active processing, and automatically purged.
- **Audit Trails**: Original uploads are backed up to a dedicated private Telegram audit channel with metadata tracking (`message_id`, `file_id`).
- **Separation of Concerns**: Lightweight API gateway handles security, upload ingestion, validation, and job orchestration. Heavy CPU/memory tasks are routed to a dedicated processing server.

---

## 2. Architecture & Pipeline Topology

```text
Frontend (Frozen UI / Vanilla CSS)
    ↓  [Multipart or Streaming Binary Upload, hard 50 MB server-side limit]
API Gateway Server (/api/v1/jobs)
    ↓
B2 Temporary Storage (jobs/{jobId}/input/{safeFileId})
    ↓
Telegram Private Channel (Original File Backup Only; message_id, file_id recorded)
    ↓
Processing Server Client (PROCESSOR_BASE_URL: Submit job handshake)
    ↓
B2 Output Storage (jobs/{jobId}/output/{safeFileId})
    ↓
Frontend Result Download (10-Minute Signed Download URL)
    ↓
Automated Cleanup Worker (B2 ~10 min, Telegram ~24 hr)
```

### Components
1. **Frontend**: Custom Vanilla CSS and HTML5 UI with a complete 30-tool catalog and frozen design system.
2. **API Server (`src/server/`)**: Built on Node.js standard HTTP modules with zero unnecessary framework overhead.
3. **Storage Abstraction (`src/server/storage/`)**: S3-compatible Backblaze B2 client supporting multi-bucket failover (`B2_1`, `B2_2`, `B2_3`, `B2_4`).
4. **Job System (`src/server/jobs/`)**: Persistent SQLite state machine powered by Node 24's native `node:sqlite` (`DatabaseSync`), stored in `.pra_data/jobs.db`.
5. **Backup Adapter (`src/server/backup/`)**: Telegram Bot API integration for original file backup and retention.
6. **Processor Adapter (`src/server/processor/`)**: External processing server client.
7. **Cleanup Worker (`src/server/cleanup/`)**: Automated 60-second sweep worker enforcing ephemeral file policies.

---

## 3. The 30 Locked Services Catalog

The platform supports exactly 30 locked canonical operations across 6 categories:

| # | Service Name | Service ID | Input Extensions | Output Extension | Processing Status |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | JPG to PDF | `jpg-to-pdf` | `.jpg`, `.jpeg` | `.pdf` | `AVAILABLE` |
| **2** | PNG to PDF | `png-to-pdf` | `.png` | `.pdf` | `AVAILABLE` |
| **3** | Images to PDF | `images-to-pdf` | `.jpg`, `.png`, `.webp`, `.bmp` | `.pdf` | `AVAILABLE` |
| **4** | Word to PDF | `word-to-pdf` | `.docx`, `.doc` | `.pdf` | `PROCESSOR_REQUIRED` |
| **5** | Excel to PDF | `excel-to-pdf` | `.xlsx`, `.xls`, `.csv` | `.pdf` | `PROCESSOR_REQUIRED` |
| **6** | PowerPoint to PDF | `powerpoint-to-pdf` | `.pptx`, `.ppt` | `.pdf` | `PROCESSOR_REQUIRED` |
| **7** | HTML to PDF | `html-to-pdf` | `.html`, `.htm` | `.pdf` | `AVAILABLE` |
| **8** | TXT to PDF | `txt-to-pdf` | `.txt` | `.pdf` | `AVAILABLE` |
| **9** | Markdown to PDF | `markdown-to-pdf` | `.md`, `.markdown` | `.pdf` | `AVAILABLE` |
| **10** | PDF to JPG | `pdf-to-jpg` | `.pdf` | `.zip` | `AVAILABLE` |
| **11** | PDF to PNG | `pdf-to-png` | `.pdf` | `.zip` | `AVAILABLE` |
| **12** | PDF to Markdown | `pdf-to-markdown` | `.pdf` | `.md` | `AVAILABLE` |
| **13** | PDF to Word | `pdf-to-word` | `.pdf` | `.docx` | `PROCESSOR_REQUIRED` |
| **14** | Merge PDF | `merge-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **15** | Split PDF | `split-pdf` | `.pdf` | `.zip` | `AVAILABLE` |
| **16** | Organize PDF Pages | `organize-pdf-pages` | `.pdf` | `.pdf` | `AVAILABLE` |
| **17** | Delete PDF Pages | `delete-pdf-pages` | `.pdf` | `.pdf` | `AVAILABLE` |
| **18** | Extract PDF Pages | `extract-pdf-pages` | `.pdf` | `.pdf` | `AVAILABLE` |
| **19** | Rotate PDF | `rotate-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **20** | Crop PDF | `crop-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **21** | Compress PDF | `compress-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **22** | OCR PDF | `ocr-pdf` | `.pdf` | `.pdf` | `PROCESSOR_REQUIRED` |
| **23** | Add Page Numbers | `add-page-numbers` | `.pdf` | `.pdf` | `AVAILABLE` |
| **24** | Watermark PDF | `watermark-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **25** | Full PDF Editing | `full-pdf-editing` | `.pdf` | `.pdf` | `AVAILABLE` |
| **26** | Password-Protect PDF | `password-protect-pdf`| `.pdf` | `.pdf` | `AVAILABLE` |
| **27** | Unlock PDF | `unlock-pdf` | `.pdf` | `.pdf` | `AVAILABLE` |
| **28** | Edit PDF Metadata | `edit-pdf-metadata` | `.pdf` | `.pdf` | `AVAILABLE` |
| **29** | Extract PDF Text | `extract-pdf-text` | `.pdf` | `.txt` | `AVAILABLE` |
| **30** | RTF Conversion | `rtf-conversion` | `.rtf`, `.pdf` | `.pdf` | `PROCESSOR_REQUIRED` |

*Note: There is exactly ONE RTF Conversion service.*

---

## 4. Current Processing Server Status

> [!IMPORTANT]
> **Honest Processing Capability Notice**  
> Heavy office conversions (Word, Excel, PowerPoint, RTF) and OCR require native binaries (LibreOffice, Tesseract OCR, Ghostscript) that reside on a separate heavy processing server (`PROCESSOR_BASE_URL`).
> 
> In this foundation phase, when `PROCESSOR_BASE_URL` is empty, the system truthfully returns HTTP 503 `PROCESSOR_UNAVAILABLE` rather than pretending completion or faking progress bars. Real engines will be connected in the processor implementation phase.

---

## 5. Security & Limits

- **Hard 50 MB Upload Limit**: Enforced server-side upfront on `Content-Length` headers and continuously during streaming byte chunk ingestion (`FILE_TOO_LARGE` / HTTP 413).
- **Safe Storage Keys**: Storage keys follow strict server-generated formats: `jobs/{jobId}/(input|output)/{safeFileId}`. User filenames are preserved in metadata only.
- **Path Traversal Protection**: Rejects all directory traversal sequences (`..`, `/../`, null bytes, absolute paths).
- **Zero Credential Exposure**: Backblaze B2 application keys and Telegram tokens are isolated server-side. Automatic secret scrubbing runs on all structured log outputs.

---

## 6. Getting Started & Local Development

### Prerequisites
- Node.js `v20+` or `v24+` (Node 24 recommended for native `node:sqlite`)
- npm

### Installation
```bash
# Clone repository
git clone https://github.com/PRAVERSE/PRAPDF.git
cd PRAPDF

# Install dependencies
npm install
```

### Environment Configuration
Copy the template and supply your credentials:
```bash
cp .env.example .env
```
*(Never commit `.env` to source control. It is explicitly ignored in `.gitignore`.)*

### Running the Services
```bash
# 1. Start the Backend API Server (Port 3001)
npm run server

# 2. Start the Frontend Development Server (Port 5173 with proxy to 3001)
npm run dev

# 3. Run Automated Tests (All 42 tests)
npm test

# 4. Production Build Verification
npm run build
```

---

## 7. Open Source Attributions & Licenses
PRA PDF incorporates and adapts battle-tested open-source components with full attribution preserved:
- See [`LICENSES-AND-ATTRIBUTIONS.md`](file:///c:/Users/hp/OneDrive/Desktop/PRAPDF/pra-pdf/LICENSES-AND-ATTRIBUTIONS.md) for licenses regarding Stirling-PDF, BentoPDF, PDFArranger, PDFCraft, pdf-lib, and related libraries.

---

## 8. License
Copyright © 2026 PRAVERSE. All rights reserved.
