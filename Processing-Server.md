# PRA PDF — Dedicated PDF Processing Server Documentation
**PRA PDF — A PRAVERSE Company**

---

## 1. Executive Summary & Architecture

The PRA PDF Processing Server is a dedicated, decoupled processing engine built to execute heavy CPU and memory-intensive PDF transformations in complete isolation from the public API gateway and client-facing web application.

### Pipeline Topology
```text
Client / Frontend (FROZEN UI)
       │
       ▼ (HTTP POST /api/v1/jobs)
PRA PDF API Server (localhost:3001)
       │
       ├─► Validates file (size <= 50 MB, signature %PDF-)
       ├─► Uploads original input to Backblaze B2 (jobs/{jobId}/input/{safeFileId})
       ├─► Backs up original to Telegram private audit channel
       │
       ▼ (Internal authenticated HTTP POST /internal/v1/process)
Dedicated Processing Server (localhost:3002)
       │
       ├─► Verifies Bearer token (PROCESSOR_SHARED_SECRET)
       ├─► Creates isolated job workspace (.processor_tmp/{jobId}/)
       ├─► Downloads original PDF from Backblaze B2
       ├─► Executes genuine PDF operation (e.g. compress-pdf)
       ├─► Validates output (signature, size, parser integrity)
       ├─► Uploads processed output to Backblaze B2 (jobs/{jobId}/output/{safeFileId})
       ├─► Cleans up workspace (.processor_tmp/{jobId}/)
       │
       ▼ (Returns structured status & metadata)
PRA PDF API Server
       │
       ▼ (10-minute signed URL / result ready)
Client / Frontend Download
```

---

## 2. Server Installation & Dependencies

The Processing Server is implemented natively in TypeScript within `src/processor/` and leverages:
- Node.js runtime (v20+ / v24+)
- `pdf-lib` for standards-compliant PDF manipulation, stream compression, object deduplication, and metadata compaction
- `@aws-sdk/client-s3` for high-throughput S3-compatible Backblaze B2 object operations
- Built-in `node:http` and `node:crypto` modules for zero-overhead internal networking and cryptographic verification

```bash
cd pra-pdf
npm install
```

---

## 3. Environment Configuration

The Processing Server is configured via server-side environment variables (`.env`). Credentials are never exposed to clients, logs, or Git commits.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PROCESSOR_HOST` | `127.0.0.1` | Host interface to bind internal processing server |
| `PROCESSOR_PORT` | `3002` | Port for the dedicated processing server |
| `PROCESSOR_SHARED_SECRET` | `pra-pdf-processor-internal-secret-2026` | Shared secret for server-to-server Bearer authentication |
| `PROCESSOR_MAX_FILE_SIZE_MB` | `50` | Maximum allowable document size (enforced server-side) |
| `PROCESSOR_TIMEOUT_SECONDS` | `300` | Job processing timeout before aborting stuck tasks |
| `PROCESSOR_MAX_CONCURRENCY` | `1` | Concurrency limit for resource protection |
| `B2_1_*`, `B2_2_*`, `B2_3_*`, `B2_4_*` | — | Multi-bucket Backblaze B2 credentials for input download & output upload |

Safe placeholder templates are maintained in `.env.example`.

---

## 4. Startup & Execution

### Starting the Dedicated Processing Server
```bash
npm run processor
```
This boots `src/processor/server.ts` listening on `http://127.0.0.1:3002`.

### Starting the API Gateway
```bash
npm run server
```
Listens on `http://localhost:3001`.

### Connecting Backend Gateway to Processor
Set `PROCESSOR_BASE_URL` in `.env`:
```env
PROCESSOR_BASE_URL=http://127.0.0.1:3002
PROCESSOR_SHARED_SECRET=pra-pdf-processor-internal-secret-2026
```
When `PROCESSOR_BASE_URL` is empty, the API gateway truthfully reports `PROCESSOR_UNAVAILABLE` without fabricating progress or faking output files.

---

## 5. Internal API Contract

All internal processing endpoints require HTTP Bearer token authentication:
`Authorization: Bearer <PROCESSOR_SHARED_SECRET>`

### 1. Health Endpoint
- **Path**: `GET /health` or `GET /internal/v1/health`
- **Auth**: None (internal network)
- **Response**:
```json
{
  "ok": true,
  "service": "pra-pdf-processor",
  "status": "healthy",
  "version": "1.0.0",
  "supportedServices": ["compress-pdf"],
  "maxFileSizeMb": 50,
  "timestamp": "2026-10-07T18:00:00.000Z"
}
```

### 2. Service Capabilities Endpoint
- **Path**: `GET /internal/v1/services`
- **Auth**: None
- **Response**: Honestly reports only services with real engine implementations:
```json
{
  "ok": true,
  "services": [
    {
      "serviceId": "compress-pdf",
      "displayName": "Compress PDF",
      "category": "optimize",
      "status": "AVAILABLE"
    }
  ]
}
```

### 3. Process Execution Endpoint
- **Path**: `POST /internal/v1/process`
- **Auth**: `Bearer <PROCESSOR_SHARED_SECRET>`
- **Request Body**:
```json
{
  "jobId": "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
  "serviceId": "compress-pdf",
  "inputStorageKey": "jobs/e1f2a3b4.../input/in.pdf",
  "outputStorageKey": "jobs/e1f2a3b4.../output/out.pdf",
  "storageProvider": "B2_2",
  "options": {}
}
```
- **Success Response (HTTP 200)**:
```json
{
  "ok": true,
  "jobId": "e1f2a3b4-c5d6-7890-abcd-ef1234567890",
  "status": "COMPLETED",
  "serviceId": "compress-pdf",
  "output": {
    "storageProvider": "B2_2",
    "storageKey": "jobs/e1f2a3b4.../output/out.pdf",
    "sizeBytes": 1048576,
    "sha256": "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
    "reductionBytes": 524288,
    "reductionPercentage": 33.33
  },
  "processingTimeMs": 412
}
```

### 4. Job Status Endpoint
- **Path**: `GET /internal/v1/jobs/:jobId/status`
- **Auth**: `Bearer <PROCESSOR_SHARED_SECRET>`

### 5. Job Cancellation Endpoint
- **Path**: `POST /internal/v1/jobs/:jobId/cancel`
- **Auth**: `Bearer <PROCESSOR_SHARED_SECRET>`
- Cleans workspace and aborts processing.

---

## 6. Security Model & Isolation

1. **Server-to-Server Authentication**:
   - Unauthorized requests return HTTP 401 `PROCESSOR_UNAUTHORIZED`.
   - Client applications never receive `PROCESSOR_SHARED_SECRET`.
2. **Strict Path Traversal Protection**:
   - Job IDs validated against `/^[a-zA-Z0-9_\-]{8,64}$/`.
   - Attempts containing `..`, `/`, `\`, or `\0` immediately throw and are rejected.
3. **Workspace Isolation & Guaranteed Cleanup**:
   - Each job processes in `.processor_tmp/<jobId>/`.
   - The workspace directory is unconditionally removed in the `finally` block upon job completion, engine failure, or cancellation.
4. **Independent 50 MB Size Limit**:
   - Validated both at the buffer level and the HTTP request level.
   - Files exceeding 50 MB rejected with HTTP 413 `FILE_TOO_LARGE`.
5. **Magic Byte & Output Validation**:
   - Inputs verified for `%PDF-` signature before engine processing.
   - Outputs verified on disk for non-empty size and parseable PDF structure before B2 upload.

---

## 7. Error Codes

| Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `PROCESSOR_UNAUTHORIZED` | 401 | Missing or invalid shared secret Bearer token |
| `PROCESSOR_BAD_REQUEST` | 400 | Malformed JSON or missing required fields |
| `SERVICE_UNSUPPORTED` | 400 | Service not yet implemented on engine |
| `FILE_TOO_LARGE` | 413 | Payload or document exceeds 50 MB |
| `INVALID_PDF` | 400 | Document lacks valid `%PDF-` header signature |
| `B2_DOWNLOAD_FAILED` | 404 | Storage object could not be retrieved from B2 |
| `PROCESSING_OUTPUT_INVALID` | 500 | Engine output failed structural validation |
| `PDF_PROCESSING_FAILED` | 500 | Processing engine execution error |
| `INTERNAL_PROCESSOR_ERROR` | 500 | Unhandled internal server error |
| `PROCESSOR_UNAVAILABLE` | 503 | Gateway cannot reach processing server |

---

## 8. Supported PDF Operations

### Phase 1 Implemented Operation: `compress-pdf`
- **Engine**: `src/processor/engines/compressPdf.ts`
- **Transformation**: Re-serializes the PDF document with object stream compression enabled, deduplicates redundant objects, and strips non-essential metadata streams.
- **Verification**: Outputs a genuinely processed, valid PDF file verified with SHA-256 and structural parse tests.

*All other 29 services will plug into this modular engine framework in subsequent phases.*
