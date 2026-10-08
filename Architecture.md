# PRA PDF — Architecture Specification
**A PRAVERSE Company**

---

## 1. Architectural Philosophy & Overview

PRA PDF is designed with a modern, hybrid client-server topology that maximizes **speed**, **privacy**, **reliability**, and **cost-effectiveness**.

### Core Architecture Tenets:
1. **Edge & Client-First Execution:** Whenever technically viable, PDF manipulation and document generation occur directly in the user's browser using WebAssembly and modern JavaScript engines (`pdf-lib`, `PDF.js`, `Tesseract.js WASM`, `jsPDF`, `SheetJS`). This guarantees unmatched speed, zero server bandwidth costs, and ironclad user privacy.
2. **Dedicated Heavy Processing Tier:** Heavy document rendering, office conversions, vector rasterization, and complex PDF transformations that exceed browser capabilities are routed to a dedicated Processing Server.
3. **No Heavy Work in Cloudflare Workers / API Gateway:** Cloudflare Workers or the lightweight Node.js API gateway handle only lightweight request routing, header validation, rate-limiting, and signed URL generation. Heavy PDF processing is **never** executed inside gateway runtimes.
4. **Zero-AI Dependency:** All conversions, manipulations, and OCR tasks execute deterministically via open-source engines without external AI models, LLM APIs, or cloud inference subscriptions.
5. **Multi-Tier 50 MB Safeguard:** Every tier (Client UI, API Gateway, Processing Server) enforces the strict 50 MB file size limit independently.
6. **Zero-Watermark Guarantee:** 100% clean, professional outputs. The platform strictly enforces a 0% unsolicited branding policy. No PRA PDF watermark, logo, or promotional stamp is ever added to any document unless explicitly designed by the user in the watermark tool.

```text
Frontend (Frozen UI / Swiss Minimalist)
    ↓  (Multipart / Binary HTTP POST, hard 50 MB server-side limit)
PRA PDF API Gateway Server (:3001)
    ↓
B2 Temporary Storage (jobs/{jobId}/input/{safeFileId})
    ↓
Telegram Private Backup (Original Uploaded File Only; message_id, file_id recorded)
    ↓
Dedicated Processing Server (:3002) (Authenticated via PROCESSOR_SHARED_SECRET)
    ↓
B2 Output Storage (jobs/{jobId}/output/{safeFileId})
    ↓
Frontend Result Download (10-Minute Signed Download URL)
    ↓
Automated Idempotent Cleanup (B2 ~10 min, Telegram ~24 hr, Workspace immediate)
```

---

## 2. Layer-by-Layer Architecture

### 2.1. Frontend Tier (Vite / Static Web App)
- **Host / Deployment Target:** Cloudflare Pages or static web server.
- **Technology Stack:** Clean HTML5, Modern TypeScript / JavaScript, Curated CSS Design System (Minimalist Swiss Slate `#0D1117`, Technical Royal Blue `#2563EB`), Lucide icons.
- **Routing:** Lightweight client-side router handling:
  - `/` (Home tool index with live search & category filters)
  - `/tools/:toolId` (Dedicated tool interface for each of the 30 tools)
  - `/editor` (Interactive Full PDF Editing Studio)
  - `/privacy`, `/terms`, `/contact` (Legal and support routes)
- **Validation:** Frontend drag-and-drop listener intercepts files, reads byte size immediately (`file.size > 52,428,800` bytes triggers immediate alert), checks MIME signatures, and blocks oversized files before upload or processing starts.

### 2.2. API Gateway Tier (Lightweight Node.js API Server — Port 3001)
- **Entry Point:** `src/server/server.ts` / `src/server/apiServer.ts`
- **Role:**
  - Route client requests to appropriate processing endpoints.
  - Enforce `Content-Length <= 52428800` bytes (50 MB) both upfront and during chunked streaming.
  - Rate limiting, origin verification, and CORS controls.
  - Ingest uploads into Backblaze B2 temporary storage.
  - Backup original files to private Telegram channel for audit trails.
  - Dispatch jobs to dedicated processing node via `ProcessorAdapter`.
  - Generate short-lived (10-minute) signed download tokens.
- **Strict Limitation:** **No heavy PDF transformations occur here.** Cloudflare Workers / API Gateway only validate, authorize, and orchestrate.

### 2.3. Processing Tier (Dedicated Node.js Processing Server — Port 3002)
- **Entry Point:** `src/processor/server.ts`
- **Engines:** Modular, deterministic engines in `src/processor/engines/`:
  - Image conversions: `jpgToPdf`, `pngToPdf`, `imagesToPdf`, `pdfToJpg`, `pdfToPng` via `pdf-lib` & `@napi-rs/canvas`.
  - Page operations: `mergePdf`, `splitPdf`, `organizePdf`, `deletePdfPages`, `extractPdfPages`, `rotatePdf`, `cropPdf`.
  - Office & Text: `wordToPdf`, `excelToPdf`, `powerpointToPdf`, `htmlToPdf`, `txtToPdf`, `markdownToPdf`, `pdfToMarkdown`, `pdfToWord`, `rtfConversion`.
  - Optimization & OCR: `compressPdf`, `ocrPdf` (Tesseract.js WASM).
  - Security & Annotations: `protectPdf`, `unlockPdf`, `addPageNumbers`, `watermarkPdf`, `editPdfMetadata`, `extractPdfText`.
  - Studio Editing: `fullPdfEditor`.
- **Process Isolation:** Every job executes inside an ephemeral workspace:
  ```
  .processor_tmp/{jobId}/
      ├── input/{safeFileId}
      └── output/{safeFileId}
  ```
- **Guards:** Hard timeout (300 seconds max per job) and memory limit protection. Ephemeral workspace directory is deleted immediately after output upload.

---

## 3. Storage Abstraction & Backblaze B2 Multi-Provider System

Storage operations are strictly abstracted via the `StorageProvider` interface (`src/server/storage/types.ts`):
- `upload(key, content, contentType)`
- `download(key)`
- `delete(key)`
- `exists(key)`
- `getMetadata(key)`
- `getSignedDownloadUrl(key, expiresInSeconds)`

### Multi-Provider Architecture
- **Provider Implementation:** `B2StorageProvider` (`src/server/storage/b2Provider.ts`) utilizes `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` for high-throughput, S3-compatible Backblaze B2 operations.
- **Failover / Bucket Routing:** `StorageManager` (`src/server/storage/storageManager.ts`) manages multiple bucket profiles:
  - `B2_1`: Alternate bucket profile
  - `B2_2`: Primary default bucket profile
  - `B2_3`: Reserve bucket profile
  - `B2_4`: Secondary reserve bucket profile
- **Canonical Safe Key Format:** Storage keys prevent path traversal and collision:
  - Input: `jobs/{jobId}/input/{safeFileId}`
  - Output: `jobs/{jobId}/output/{safeFileId}`
  - Path traversal sequences (`..`, `\`, `/../`, null bytes `\0`, leading slashes) are strictly rejected.

---

## 4. Telegram Private Backup System

The Telegram adapter (`src/server/backup/telegramBackup.ts`) isolates original file auditing:
- **Scope:** Backs up **only the original uploaded file** for diagnostic audit logs. Output files are never sent to Telegram.
- **Honest Status Reporting:** Captures `message_id`, `file_id`, and `chat_id`. Backup is marked successful only if Telegram returns `ok: true`.
- **Retention:** Preserved for ~24 hours, then safely purged via `deleteBackupMessage(messageId)`.
- **Security:** Bot token and Chat ID are server-side only and never logged or exposed in client bundles.

---

## 5. Job System & State Machine

Job state is persisted in SQLite (`.pra_data/jobs.db`) using Node.js native zero-dependency `node:sqlite` (`DatabaseSync`):
- Survives application restarts.
- Zero raw PDF bytes stored in the database (only keys, IDs, and metadata).

### State Machine Transitions
```text
CREATED → VALIDATING → UPLOADING → BACKING_UP → QUEUED → PROCESSING → UPLOADING_OUTPUT → COMPLETED
                                                                                       ↓
                                                                                     FAILED
                                                                                       ↓
                                                                                CLEANUP_PENDING → CLEANED
```

---

## 6. Automated Cleanup Architecture

The cleanup service (`src/server/cleanup/cleanupService.ts`) runs on a continuous 60-second schedule:
- **B2 Temp Files:** Cleaned ~10 minutes after completion / expiration.
- **Telegram Backups:** Purged after 24 hours.
- **Processor Workspaces:** Purged immediately upon output upload or failure.
- **Safety & Idempotency:** Safe timestamp parsing; cleanup failures are isolated and never corrupt completed job records. Multiple sweeps on the same job are safe and bounded.

---

## 7. Versioned REST API Specifications (`/api/v1/...`)

### 1. Health Check
`GET /api/v1/health`
```json
{
  "success": true,
  "status": "healthy",
  "product": "PRA PDF",
  "company": "A PRAVERSE Company",
  "version": "1.0.0",
  "maxFileSizeMb": 50,
  "maxFileSizeBytes": 52428800,
  "zeroAI": true,
  "storageProviders": {
    "B2_1": { "id": "B2_1", "isConfigured": true },
    "B2_2": { "id": "B2_2", "isConfigured": true },
    "B2_3": { "id": "B2_3", "isConfigured": true },
    "B2_4": { "id": "B2_4", "isConfigured": false }
  },
  "telegramConfigured": true,
  "processorConfigured": true,
  "timestamp": "2026-10-08T10:00:00.000Z"
}
```

### 2. Services Registry
`GET /api/v1/services`
- Returns all 30 locked canonical services, accepted file extensions, and processing statuses (`AVAILABLE`, `PROCESSOR_REQUIRED`).

### 3. Submit Processing Job
`POST /api/v1/jobs`
- **Headers:** `Content-Type: multipart/form-data` with `file` and `serviceId`, or `application/octet-stream` with `x-service-id`, `x-filename`.
- **Response (201 Created):**
```json
{
  "success": true,
  "jobId": "b1b13531-1588-466d-8c44-59e8ca3705ee",
  "serviceId": "compress-pdf",
  "originalFilename": "report.pdf",
  "status": "VALIDATING",
  "inputSize": 1048576,
  "createdAt": "2026-10-08T10:00:00.000Z"
}
```
- **Error Response (413 Payload Too Large):**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "Maximum file size is 50 MB."
  }
}
```

### 4. Job Status
`GET /api/v1/jobs/:jobId`
- Returns current processing status, progression, and error details if failed.

### 5. Download Result
`GET /api/v1/jobs/:jobId/result`
- Returns 10-minute presigned B2 download URL.

### 6. Cancel / Delete Job
`DELETE /api/v1/jobs/:jobId`
- Cancels job execution and immediately schedules B2/Telegram cleanup.

---

## 8. UI/UX Design System Integration

PRA PDF implements a minimalist Swiss architectural design system:
- **Root Palette:** Deep Neutral Slate Canvas (`#0D1117`), Surface (`#161B22`), Control (`#21262D`), Primary Accent (`#2563EB`).
- **Typography:** `Inter` (sans-serif) for high-contrast legible UI; `JetBrains Mono` for metadata, coordinates, and file sizes.
- **Anti-Card Containment:** Eliminates nested card clutter in favor of crisp 1px structural dividers (`#30363D`).
- **No Marketing Fluff:** Direct, instant access to tools with responsive drag-and-drop dropzones and live size validation.

---

## 9. Security Architecture

1. **Untrusted Input Sanitation:**
   - Raw filenames from client `multipart/form-data` are never passed to file system paths or shell commands.
   - System renames all incoming files to safe UUIDs: `crypto.randomUUID() + ".bin"`.
2. **No Shell Command Injection:**
   - All internal processing commands pass strict arrays of arguments directly via `execFile` without shell expansion (`shell: false`).
3. **MIME Magic Number Verification:**
   - Files are validated by checking initial magic byte signatures:
     - PDF: `%PDF-` (`0x25 0x50 0x44 0x46`)
     - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47`)
     - JPG: `\xFF\xD8\xFF`
     - DOCX / XLSX / PPTX: `PK\x03\x04`
4. **Memory Leak Mitigation:**
   - Large ArrayBuffers and Object URLs are explicitly revoked via `URL.revokeObjectURL()` once downloaded.
   - Canvas buffers are garbage collected after page rendering.

---

## 10. Clean Repository Directory Structure

```
pra-pdf/
├── README.md                       # Master project overview & quickstart
├── PRD.md                          # Product requirements & business constraints
├── Architecture.md                 # System architecture (this document)
├── Processing-Server.md            # Dedicated processing engine specification
├── RUNTIME-REQUIREMENTS.md         # Runtime, library & OS requirements
├── LICENSES-AND-ATTRIBUTIONS.md    # Open-source compliance & licenses
│
├── package.json                    # Dependencies, engine definitions & scripts
├── package-lock.json               # Deterministic dependency lockfile
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite build bundler configuration
├── index.html                      # Single page application host
├── eng.traineddata                 # Tesseract OCR English trained dataset
├── .env.example                    # Configuration template (zero secrets)
├── .gitignore                      # Git exclusion rules (node_modules, .env, etc.)
│
├── src/                            # Application source code
│   ├── app.ts                      # Client router & page lifecycle
│   ├── index.css                   # PRAVERSE design system & CSS tokens
│   ├── index.html                  # HTML template
│   ├── components/                 # Reusable UI components
│   │   ├── Dropzone.ts             # 50 MB validated drag-and-drop zone
│   │   ├── Footer.ts               # Footer & copyright
│   │   ├── Navbar.ts               # Header & search
│   │   ├── ProgressBar.ts          # Job progression indicator
│   │   ├── ResultCard.ts           # Result display & download button
│   │   └── ToolCard.ts             # Tool catalog card
│   ├── pages/                      # Page views
│   │   ├── HomePage.ts             # 30-tool catalog & search
│   │   ├── ToolPage.ts             # Universal tool runner
│   │   ├── EditorPage.ts           # Interactive PDF Editor Studio
│   │   ├── PrivacyPage.ts          # Privacy policy
│   │   ├── TermsPage.ts            # Terms of service
│   │   └── ContactPage.ts          # Support & contact
│   ├── services/                   # Frontend tool runners & utilities
│   │   ├── types.ts                # Service interfaces & tool definitions
│   │   ├── core/                   # Shared validation & PDF engines
│   │   ├── convertToPdf.ts         # Services 1-9 client helpers
│   │   ├── convertFromPdf.ts       # Services 10-13, 29, 30 client helpers
│   │   ├── organizePdf.ts          # Services 14-20 client helpers
│   │   ├── optimizeAndOcr.ts       # Services 21-22 client helpers
│   │   ├── annotatePdf.ts          # Services 23-24 client helpers
│   │   ├── fullPdfEditor.ts        # Service 25 studio client engine
│   │   ├── securityPdf.ts          # Services 26-27 client helpers
│   │   └── metadataPdf.ts          # Service 28 client helpers
│   ├── server/                     # API Gateway (Port 3001)
│   │   ├── server.ts               # HTTP server entry point
│   │   ├── apiServer.ts            # REST API router & job dispatcher
│   │   ├── config.ts               # Environment configuration parser
│   │   ├── backup/                 # Telegram audit backup provider
│   │   ├── cleanup/                # Automated 60-second cleanup service
│   │   ├── jobs/                   # SQLite state machine & job repository
│   │   ├── processor/              # Processing Server client adapter
│   │   └── storage/                # Backblaze B2 multi-bucket storage manager
│   └── processor/                  # Dedicated Processing Server (Port 3002)
│       ├── server.ts               # Processing server HTTP entry point
│       ├── types.ts                # Processor contracts & error codes
│       └── engines/                # 30 Real processing engine implementations
│           ├── jpgToPdf.ts         # Engine 1: JPG to PDF
│           ├── pngToPdf.ts         # Engine 2: PNG to PDF
│           ├── imagesToPdf.ts      # Engine 3: Images to PDF
│           ├── wordToPdf.ts        # Engine 4: Word (.docx) to PDF
│           ├── excelToPdf.ts       # Engine 5: Excel (.xlsx/.csv) to PDF
│           ├── powerpointToPdf.ts  # Engine 6: PowerPoint (.pptx) to PDF
│           ├── htmlToPdf.ts        # Engine 7: HTML to PDF
│           ├── txtToPdf.ts         # Engine 8: TXT to PDF
│           ├── markdownToPdf.ts    # Engine 9: Markdown to PDF
│           ├── pdfToJpg.ts         # Engine 10: PDF to JPG (ZIP)
│           ├── pdfToPng.ts         # Engine 11: PDF to PNG (ZIP)
│           ├── pdfToMarkdown.ts    # Engine 12: PDF to Markdown
│           ├── pdfToWord.ts        # Engine 13: PDF to Word (.docx)
│           ├── mergePdf.ts         # Engine 14: Merge PDF
│           ├── splitPdf.ts         # Engine 15: Split PDF (Ranges / ZIP)
│           ├── organizePdf.ts      # Engine 16: Organize PDF Pages
│           ├── deletePdfPages.ts   # Engine 17: Delete PDF Pages
│           ├── extractPdfPages.ts  # Engine 18: Extract PDF Pages
│           ├── rotatePdf.ts        # Engine 19: Rotate PDF (90°/180°/270°)
│           ├── cropPdf.ts          # Engine 20: Crop PDF margins
│           ├── compressPdf.ts      # Engine 21: Stream compression & deduplication
│           ├── ocrPdf.ts           # Engine 22: Deterministic Tesseract OCR
│           ├── addPageNumbers.ts   # Engine 23: Dynamic page numbering
│           ├── watermarkPdf.ts     # Engine 24: User-defined watermark
│           ├── fullPdfEditor.ts    # Engine 25: Studio markup & element editor
│           ├── protectPdf.ts       # Engine 26: AES encryption & password lock
│           ├── unlockPdf.ts        # Engine 27: Decryption & permission removal
│           ├── editPdfMetadata.ts  # Engine 28: Metadata modification
│           ├── extractPdfText.ts   # Engine 29: Spatial plaintext extraction
│           └── rtfConversion.ts    # Engine 30: Bi-directional RTF conversion
│
├── tests/                          # Test suite
│   ├── suite.test.ts               # Core unit & integration test suite
│   └── processor.test.ts           # Dedicated processing server test suite
└── scripts/                        # Maintenance & integration scripts
    ├── all_batches_integration_test.ts # Full 30-service end-to-end integration test
    └── batch1_integration_test.ts      # Batch 1 focused integration test
```
