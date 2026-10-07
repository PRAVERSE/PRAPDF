# PRA PDF — Backend Architecture & Foundation Specification
**PRA PDF — A PRAVERSE Company**

---

## 1. Executive Summary & Purpose
PRA PDF is a high-performance document utility suite comprising exactly 30 locked conversion, organization, editing, and security operations. The backend foundation establishes the real infrastructure required to process documents safely at scale without fake processing, mock progress, or premature client-side claims.

### Pipeline Topology
```text
Frontend (Frozen UI)
    ↓  (Multipart / Binary HTTP POST, hard 50 MB server-side limit)
PRA PDF API Server (/api/v1/jobs)
    ↓
B2 Temporary Storage (jobs/{jobId}/input/{safeFileId})
    ↓
Telegram Private Backup (Original Uploaded File Only; message_id, file_id recorded)
    ↓
Processing Server Client (PROCESSOR_BASE_URL: Submit job handshake)
    ↓
B2 Output Storage (jobs/{jobId}/output/{safeFileId})
    ↓
Frontend Result Download (10-Minute Signed Download URL)
    ↓
Automated Idempotent Cleanup (B2 ~10 min, Telegram ~24 hr)
```

---

## 2. Server Configuration & Environment Variables

All configuration is parsed in `src/server/config.ts`. Credentials remain strictly isolated server-side and are automatically scrubbed from structured log outputs.

| Variable Name | Type | Description | Production Status |
| :--- | :--- | :--- | :--- |
| `PRA_ENV` | `string` | Environment (`development`, `production`, `test`) | Active |
| `PORT` | `number` | Backend API port (defaults to `3001`) | Configured (`3001`) |
| `MAX_FILE_SIZE_MB` | `number` | Maximum allowed file size in MB (`50`) | Hard 50 MB limit enforced |
| `B2_1_*` | Credentials | Provider 1 (`praflix` bucket) | Configured |
| `B2_2_*` | Credentials | Provider 2 (`PRAPDF` bucket - Primary default) | Configured |
| `B2_3_*` | Credentials | Provider 3 (`praconnect-15` bucket) | Configured |
| `B2_4_*` | Credentials | Provider 4 (Optional reserve bucket) | Unconfigured / Optional |
| `TELEGRAM_BOT_TOKEN`| `string` | Telegram Bot API token for original backups | Configured |
| `TELEGRAM_CHAT_ID` | `string` | Private channel ID for backups | Configured |
| `PROCESSOR_BASE_URL`| `string` | URL of heavy CPU processing node | Unconfigured (Reports `PROCESSOR_UNAVAILABLE`) |

---

## 3. Storage Abstraction & Backblaze B2 Multi-Provider System

Storage operations are abstracted via the `StorageProvider` interface (`src/server/storage/types.ts`):
- `upload(key, content, contentType)`
- `download(key)`
- `delete(key)`
- `exists(key)`
- `getMetadata(key)`
- `getSignedDownloadUrl(key, expiresInSeconds)`

### Providers Implemented
- `B2StorageProvider` (`src/server/storage/b2Provider.ts`): Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` for S3-compatible B2 integration with bounded retries (2 retries with exponential backoff).
- `StorageManager` (`src/server/storage/storageManager.ts`): Manages providers `B2_1`, `B2_2` (default), `B2_3`, and `B2_4`.

### Canonical Safe Key Format
Storage keys are generated and validated to prevent path traversal:
- Input: `jobs/{jobId}/input/{safeFileId}`
- Output: `jobs/{jobId}/output/{safeFileId}`
- Path traversal sequences (`..`, `\`, `/../`, null bytes `\0`, leading slashes) are strictly rejected.

---

## 4. Telegram Original File Backup System

The Telegram adapter (`src/server/backup/telegramBackup.ts`) isolates backup operations:
- **Scope**: Backs up **only the original uploaded file** for diagnostic audit logs. Output files are never sent to Telegram.
- **Honest Status Reporting**: Captures `message_id`, `file_id`, and `chat_id`. Backup is marked successful only if Telegram returns `ok: true`.
- **Retention**: Preserved for ~24 hours, then safely purged via `deleteBackupMessage(messageId)`.
- **Security**: Bot token and Chat ID are server-side only and never logged.

---

## 5. Processing Server Abstraction & Dedicated Processing Server Integration

Heavy CPU/memory tasks are decoupled into a dedicated Processing Server (`src/processor/`):
- **Client**: `ProcessorAdapter` (`src/server/processor/processorAdapter.ts`).
- **Endpoint**: Configured via `PROCESSOR_BASE_URL` (e.g. `http://127.0.0.1:3002`).
- **Authentication**: Secured with `PROCESSOR_SHARED_SECRET` via `Authorization: Bearer <secret>`.
- **Honest Availability**: When `PROCESSOR_BASE_URL` is empty, the system returns `PROCESSOR_UNAVAILABLE` rather than faking success or fabricating progress bars. When configured, it dispatches jobs to `/internal/v1/process`.
- **First Supported Service**: `compress-pdf` executing real object stream compression, deduplication, and PDF structural validation.
- **Methods**: `submitJob`, `checkStatus`, `cancelJob`.
- **Full Documentation**: See `Processing-Server.md` for dedicated architecture, endpoints, and security details.

---

## 6. Job System & State Machine

Job state is persisted in SQLite (`.pra_data/jobs.db`) using Node.js native zero-dependency `node:sqlite` (`DatabaseSync`):
- Survives application restarts.
- Zero raw PDF bytes stored in the database (only keys and metadata).

### State Transitions
```text
CREATED → VALIDATING → UPLOADING → BACKING_UP → QUEUED → PROCESSING → UPLOADING_OUTPUT → COMPLETED
                                                                                       ↓
                                                                                     FAILED
                                                                                       ↓
                                                                                CLEANUP_PENDING → CLEANED
```

---

## 7. Automated Cleanup Architecture

The cleanup service (`src/server/cleanup/cleanupService.ts`) runs on a 60-second schedule:
- **B2 Temp Files**: Cleaned ~10 minutes after completion / expiration.
- **Telegram Backups**: Purged after 24 hours.
- **Safety**: Safe timestamp parsing; cleanup failures are isolated and never corrupt completed job records.
- **Idempotency**: Multiple sweeps on the same job are safe and bounded.

---

## 8. Versioned API Specifications (`/api/v1/...`)

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
  "processorConfigured": false,
  "timestamp": "2026-10-07T15:15:00.000Z"
}
```

### 2. Services Registry
`GET /api/v1/services`
- Returns all 30 locked canonical services, accepted file extensions, and processing statuses (`AVAILABLE`, `PROCESSOR_REQUIRED`).

### 3. Submit Processing Job
`POST /api/v1/jobs`
- **Headers**:
  - `Content-Type: multipart/form-data` with `file` and `serviceId` fields.
  - Or `application/octet-stream` with headers `x-service-id`, `x-filename`.
- **Response (201 Created)**:
```json
{
  "success": true,
  "jobId": "b1b13531-1588-466d-8c44-59e8ca3705ee",
  "serviceId": "compress-pdf",
  "originalFilename": "report.pdf",
  "status": "VALIDATING",
  "inputSize": 1048576,
  "createdAt": "2026-10-07T15:15:00.000Z"
}
```
- **Error Response (413 Payload Too Large)**:
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
```json
{
  "success": true,
  "job": {
    "jobId": "b1b13531-1588-466d-8c44-59e8ca3705ee",
    "serviceId": "compress-pdf",
    "originalFilename": "report.pdf",
    "status": "COMPLETED",
    "createdAt": "2026-10-07T15:15:00.000Z",
    "updatedAt": "2026-10-07T15:15:05.000Z"
  }
}
```

### 5. Download Result
`GET /api/v1/jobs/:jobId/result`
```json
{
  "success": true,
  "jobId": "b1b13531-1588-466d-8c44-59e8ca3705ee",
  "downloadUrl": "https://f006.backblazeb2.com/file/PRAPDF/jobs/...?X-Amz-Signature=...",
  "expiresAt": "2026-10-07T15:25:00.000Z"
}
```

### 6. Cancel / Delete Job
`DELETE /api/v1/jobs/:jobId`
```json
{
  "success": true,
  "jobId": "b1b13531-1588-466d-8c44-59e8ca3705ee",
  "message": "Job cancelled and scheduled for cleanup."
}
```

---

## 9. Canonical 30 Locked Services

| # | Service ID | Display Name | Category | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `jpg-to-pdf` | JPG to PDF | Convert to PDF | AVAILABLE |
| 2 | `png-to-pdf` | PNG to PDF | Convert to PDF | AVAILABLE |
| 3 | `images-to-pdf` | Images to PDF | Convert to PDF | AVAILABLE |
| 4 | `word-to-pdf` | Word to PDF | Convert to PDF | PROCESSOR_REQUIRED |
| 5 | `excel-to-pdf` | Excel to PDF | Convert to PDF | PROCESSOR_REQUIRED |
| 6 | `powerpoint-to-pdf` | PowerPoint to PDF | Convert to PDF | PROCESSOR_REQUIRED |
| 7 | `html-to-pdf` | HTML to PDF | Convert to PDF | AVAILABLE |
| 8 | `txt-to-pdf` | TXT to PDF | Convert to PDF | AVAILABLE |
| 9 | `markdown-to-pdf` | Markdown to PDF | Convert to PDF | AVAILABLE |
| 10 | `pdf-to-jpg` | PDF to JPG | Convert from PDF | AVAILABLE |
| 11 | `pdf-to-png` | PDF to PNG | Convert from PDF | AVAILABLE |
| 12 | `pdf-to-markdown` | PDF to Markdown | Convert from PDF | AVAILABLE |
| 13 | `pdf-to-word` | PDF to Word | Convert from PDF | PROCESSOR_REQUIRED |
| 14 | `merge-pdf` | Merge PDF | Organize | AVAILABLE |
| 15 | `split-pdf` | Split PDF | Organize | AVAILABLE |
| 16 | `organize-pdf-pages`| Organize PDF Pages | Organize | AVAILABLE |
| 17 | `delete-pdf-pages` | Delete PDF Pages | Organize | AVAILABLE |
| 18 | `extract-pdf-pages`| Extract PDF Pages | Organize | AVAILABLE |
| 19 | `rotate-pdf` | Rotate PDF | Organize | AVAILABLE |
| 20 | `crop-pdf` | Crop PDF | Organize | AVAILABLE |
| 21 | `compress-pdf` | Compress PDF | Optimize | AVAILABLE |
| 22 | `ocr-pdf` | OCR PDF | Optimize | PROCESSOR_REQUIRED |
| 23 | `add-page-numbers` | Add Page Numbers | Edit | AVAILABLE |
| 24 | `watermark-pdf` | Watermark PDF | Edit | AVAILABLE |
| 25 | `full-pdf-editing` | Full PDF Editing | Edit | AVAILABLE |
| 26 | `password-protect-pdf` | Password-Protect PDF | Security | AVAILABLE |
| 27 | `unlock-pdf` | Unlock PDF | Security | AVAILABLE |
| 28 | `edit-pdf-metadata` | Edit PDF Metadata | Extract & Manage | AVAILABLE |
| 29 | `extract-pdf-text` | Extract PDF Text | Extract & Manage | AVAILABLE |
| 30 | `rtf-conversion` | RTF Conversion | Other Conversions | PROCESSOR_REQUIRED |

---

## 10. Local Development & Testing Instructions

### Run Tests
```bash
npm test
```
Executes all 42 automated tests covering security, storage abstraction, 50 MB enforcement, Telegram backup, processor honesty, and SQLite persistence.

### Start Backend API Server
```bash
npm run server
```
Listens on `http://localhost:3001` with automated cleanup running every 60 seconds.

### Start Frontend Dev Server
```bash
npm run dev
```
Listens on `http://localhost:5173` with automatic proxy of `/api` requests to `http://localhost:3001`.
