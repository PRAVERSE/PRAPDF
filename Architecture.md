# PRA PDF — Architecture Specification
**A PRAVERSE Company**

---

## 1. Architectural Philosophy & Overview

PRA PDF is designed with a modern, hybrid client-server topology that maximizes **speed**, **privacy**, **reliability**, and **cost-effectiveness**.

### Core Architecture Tenants:
1. **Edge & Client-First Execution:** Whenever technically viable, PDF manipulation and document generation occur directly in the user's browser using WebAssembly and modern JavaScript engines (`pdf-lib`, `PDF.js`, `Tesseract.js WASM`, `jsPDF`, `SheetJS`). This guarantees unmatched speed, zero server bandwidth costs, and ironclad user privacy.
2. **Dedicated Heavy Processing Tier:** Heavy document rendering, office conversions, and complex PDF conversions that exceed browser capabilities are routed to a dedicated processing server.
3. **No Heavy Work in Cloudflare Workers:** As per strict requirements, Cloudflare Workers handle only lightweight request routing, header validation, rate-limiting, and signed URL generation. Heavy PDF processing is **never** executed inside Workers runtime.
4. **Zero-AI Dependency:** All conversions and OCR tasks execute deterministically via open-source engines without external AI models or LLM APIs.
5. **Multi-Tier 50 MB Safeguard:** Every tier (Client UI, API Gateway, Processing Server) enforces the strict 50 MB file size limit independently.

```mermaid
graph TD
    User([User Browser]) -->|HTTPS / UI| CFP[Cloudflare Pages - Frontend]
    User -->|Client-Side Tasks (24+ tools)| LocalEngine[Browser Engine (pdf-lib, PDF.js, Tesseract WASM)]
    LocalEngine -->|Instant Output| Download[User Download Result]
    User -->|Heavy Conversion (Office, Complex)| CFW[Cloudflare Workers / API Gateway]
    CFW -->|Enforce 50MB Limit & Auth| ProcServer[Heavy Processing Server - Node.js / Linux]
    ProcServer -->|Temporary Output| B2Storage[(Backblaze B2 - Private)]
    ProcServer -->|Original File Backup Only| Telegram[(Telegram Backup - Bot Server-Side)]
    ProcServer -->|Auto Cleanup (10 min)| CleanupEngine[Auto-Cleanup Engine]
    CFW -->|Signed Download URL| User
```

---

## 2. Layer-by-Layer Architecture

### 2.1. Frontend Tier (Cloudflare Pages)
- **Host / Deployment Target:** Cloudflare Pages (or modern static/SPA server).
- **Technology Stack:** Clean HTML5, Modern TypeScript / JavaScript, Curated CSS Design System (PRA Navy `#0A0F1D` & Electric Indigo `#6366F1`), Lucide icons.
- **Routing:** Lightweight client-side router handling:
  - `/` (Home tool index)
  - `/tools/:toolId` (Dedicated tool interface for each of the 30 tools)
  - `/editor` (Interactive Full PDF Editing Studio)
  - `/privacy`, `/terms`, `/contact` (Legal and support routes)
- **Validation:** Frontend drag-and-drop listener intercepts files, reads byte size immediately (`file.size > 52,428,800` bytes triggers immediate alert), checks MIME signatures, and blocks oversized files before upload or processing starts.

### 2.2. API Gateway Tier (Cloudflare Workers / Lightweight API)
- **Host / Deployment Target:** Cloudflare Workers or lightweight Node.js API router.
- **Role:**
  - Route client requests to appropriate processing endpoints.
  - Enforce `Content-Length <= 52428800` bytes.
  - Rate limiting, origin verification, and CORS controls.
  - Generate short-lived (10-minute) signed download tokens.
- **Strict Limitation:** **No heavy PDF transformations occur here.** Cloudflare Workers only validate, authorize, and proxy.

### 2.3. Processing Tier (Dedicated Node.js / Server Runtime)
- **Host Candidate:** Dedicated compute instance (e.g., Oracle Cloud Infrastructure / Ubuntu compute).
- **Engine Core:**
  - Node.js processing service running headless document engines, `pdf-lib`, `pdfjs-dist`, `canvas`, `tesseract.js`, `docx`, and `xlsx`.
  - Process isolation: Every job is assigned an isolated ephemeral directory:
    ```
    /tmp/pra-pdf-jobs/[job-uuid]/
        ├── input/
        │   └── [sanitized-input-file]
        └── output/
            └── [processed-output-file]
    ```
  - Memory safeguards: Hard process timeout (120 seconds max per job) and memory limit (512 MB max per process worker).

---

## 3. Storage & Backup Strategy

### 3.1. Temporary Storage (Private Backblaze B2)
- **Status:** Planned production storage.
- **Access Model:** Strict private bucket with zero public read access.
- **Credential Safety:** B2 Application Key and Key ID are stored strictly in server-side environment variables (`B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`). Never exposed to frontend code or client bundles.
- **Retention Policy:** Both original uploads and processed output files stored in B2 are automatically purged **10 minutes** after job completion using B2 lifecycle rules and active server deletion webhooks.

### 3.2. Original-File Backup (Telegram)
- **Status:** Planned production backup mechanism.
- **Scope:** **Original uploaded files only.** Generated output files are never sent to Telegram.
- **Credential Safety:** Telegram Bot Token and Chat ID (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) exist only on the backend processing server.
- **Retention & Privacy:** Telegram backups are retained for an ephemeral retention window (~24 hours) for audit/diagnostic recovery and then automatically purged via bot API cleanup sweeps.
- **Legal Notice:** Clearly disclosed in Privacy Policy that Telegram is a standard cloud transport, not end-to-end encrypted.

---

## 4. End-to-End Processing Flows

### Flow A: Client-Side Browser Processing (Privacy & Speed Optimized)
Used for tools: JPG to PDF, PNG to PDF, Images to PDF, Excel to PDF, TXT to PDF, Markdown to PDF, PDF to JPG, PDF to PNG, PDF to Markdown, Merge, Split, Organize, Delete, Extract, Rotate, Crop, Compress, OCR, Page Numbers, Watermark, Password-Protect, Unlock, Edit Metadata, Extract Text, Full PDF Editing.

```
[User Dropzone]
       │
   (50MB Check) ───[Over 50MB]───> Show Error: "File exceeds 50 MB limit"
       │ [Valid <= 50MB]
   (FileReader / ArrayBuffer)
       │
   (In-Memory Engine: pdf-lib / PDF.js / Tesseract WASM)
       │
   (Progress Events: 25% -> 50% -> 75% -> 100%)
       │
   (Blob Construction & Memory URL)
       │
   [Direct Instant Download]
       │
   (Revoke Blob URL & Free Memory)
```

### Flow B: Server-Side Processing (Complex Conversions)
Used for tools requiring heavy office conversion engines: Word to PDF, PowerPoint to PDF, RTF to PDF.

```
[User Dropzone]
       │
   (50MB Check) ───[Over 50MB]───> Show Error: "File exceeds 50 MB limit"
       │ [Valid <= 50MB]
   [POST /api/v1/jobs/convert]
       │
   [API Gateway (Cloudflare Workers)]
       │ (Validate Content-Length <= 50MB & MIME)
       ▼
   [Processing Server]
       │ (Generate jobUUID)
       │ (Write to /tmp/pra-pdf-jobs/[jobUUID]/input)
       │ (Dispatch to Processing Engine)
       │ (Stream Original File to Telegram Backup asynchronously)
       │ (Produce Output in /tmp/pra-pdf-jobs/[jobUUID]/output)
       │ (Upload Output to Private B2 with 10-min signed URL)
       ▼
   [Return Signed Download URL & Trigger 10-Minute Expiry Timer]
       ▼
   [Client Downloads Output]
       ▼
   [Cleanup Worker unlinks local /tmp files immediately]
```

---

## 5. Security Architecture

1. **Untrusted Input Sanitation:**
   - Raw filenames from client `multipart/form-data` are never passed to file system paths or shell commands.
   - System renames all incoming files to safe UUIDs: `crypto.randomUUID() + ".bin"`.
2. **No Shell Command Injection:**
   - All internal processing commands pass strict arrays of arguments directly via `execFile` without shell expansion (`shell: false`).
3. **MIME Magic Number Verification:**
   - Files are validated by checking their initial magic byte signatures:
     - PDF: `%PDF-` (`0x25 0x50 0x44 0x46`)
     - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47`)
     - JPG: `\xFF\xD8\xFF`
     - DOCX / XLSX / PPTX: `PK\x03\x04`
4. **Memory Leak Mitigation:**
   - Large ArrayBuffers and Object URLs are explicitly revoked via `URL.revokeObjectURL()` once downloaded.
   - Canvas buffers are garbage collected after page rendering.

---

## 6. Directory Structure

```
c:/Users/hp/OneDrive/Desktop/PRAPDF/
├── pra-pdf/                         # The unified PRA PDF application
│   ├── PRD.md                       # Product requirements document
│   ├── Architecture.md              # Architectural specification (this document)
│   ├── Rules.md                     # Engineering & operational rules
│   ├── Phases.md                    # Roadmap & phase breakdown
│   ├── Design.md                    # PRAVERSE design system specification
│   ├── Memory.md                    # Living project memory & changelog
│   ├── Repository-Analysis.md       # Audit of source repositories & service mapping
│   ├── LICENSES-AND-ATTRIBUTIONS.md # Open-source licenses & attributions
│   │
│   ├── package.json                 # Unified PRA PDF package definition
│   ├── vite.config.ts               # Vite build & dev server configuration
│   ├── tsconfig.json                # TypeScript configuration
│   │
│   ├── public/                      # Static assets, branding, WASM binaries
│   │   ├── favicon.svg              # PRA PDF brand logo
│   │   └── wasm/                    # Client-side WASM binaries (Tesseract, QPDF)
│   │
│   ├── src/                         # Application source code
│   │   ├── index.html               # Main application entry point
│   │   ├── index.css                # PRAVERSE design tokens & styling
│   │   ├── app.ts                   # Main application router & lifecycle
│   │   │
│   │   ├── components/              # Reusable UI components
│   │   │   ├── Navbar.ts            # Header with PRA branding & navigation
│   │   │   ├── Footer.ts            # Footer with legal links & company attribution
│   │   │   ├── Dropzone.ts          # Unified 50MB drag-and-drop file upload zone
│   │   │   ├── ProgressBar.ts       # Processing progress & status indicator
│   │   │   ├── ResultCard.ts        # Download & file comparison result card
│   │   │   └── ToolCard.ts          # Homepage tool catalog cards
│   │   │
│   │   ├── pages/                   # Application views
│   │   │   ├── HomePage.ts          # Catalog of all 30 tools + search & filters
│   │   │   ├── ToolPage.ts          # Universal runner for individual tools
│   │   │   ├── EditorPage.ts        # Full interactive PDF Editing Studio
│   │   │   ├── PrivacyPage.ts       # Privacy Policy page
│   │   │   ├── TermsPage.ts         # Terms & Conditions page
│   │   │   └── ContactPage.ts       # Contact Us page
│   │   │
│   │   ├── services/                # The 30 service implementations
│   │   │   ├── core/                # Engine helpers & validators
│   │   │   │   ├── fileValidator.ts # 50 MB limiter & magic number checker
│   │   │   │   ├── pdfEngine.ts     # Core PDF.js & pdf-lib abstractions
│   │   │   │   └── cleanup.ts       # Blob & memory cleanup manager
│   │   │   │
│   │   │   ├── convertToPdf.ts      # Tools 1-9: JPG, PNG, Images, Word, Excel, PPT, HTML, TXT, MD to PDF
│   │   │   ├── convertFromPdf.ts    # Tools 10-13, 29, 30: PDF to JPG, PNG, MD, Word, Text, RTF
│   │   │   ├── organizePdf.ts       # Tools 14-20: Merge, Split, Organize, Delete, Extract, Rotate, Crop
│   │   │   ├── optimizeAndOcr.ts    # Tools 21-22: Compress, OCR (Tesseract WASM)
│   │   │   ├── annotatePdf.ts       # Tools 23-24: Page Numbers, Watermark
│   │   │   ├── fullPdfEditor.ts     # Tool 25: Full PDF Editing Studio engine
│   │   │   ├── securityPdf.ts       # Tools 26-27: Password Protect, Unlock
│   │   │   └── metadataPdf.ts       # Tool 28: PDF Metadata Editor
│   │   │
│   │   └── server/                  # Lightweight API & processing service
│   │       ├── apiServer.ts         # Express / Node.js API with 50MB limit
│   │       ├── backupService.ts     # Telegram original-file backup provider
│   │       └── storageService.ts    # Backblaze B2 temporary storage provider
│   │
│   └── tests/                       # Automated test suite
│       ├── unit/                    # Unit tests for validators, services, 50MB limit
│       └── integration/             # Integration tests for tool execution & cleanup
│
├── bentopdf/                        # Cloned source repository (Untouched reference)
├── Stirling-PDF/                    # Cloned source repository (Untouched reference)
├── pdfcraft/                        # Cloned source repository (Untouched reference)
└── pdfarranger/                     # Cloned source repository (Untouched reference)
```
