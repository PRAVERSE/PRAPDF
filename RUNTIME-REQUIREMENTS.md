# PRA PDF — Runtime & Dependency Requirements
**A PRAVERSE Company**

## 1. Architecture Overview
PRA PDF utilizes a decoupled microservice architecture:
1. **Lightweight API Gateway (`:3001`)**: Coordinates security validation, Backblaze B2 object storage, Telegram original-file backup, job scheduling, and result delivery.
2. **Dedicated Heavy Processing Server (`:3002`)**: Executes CPU/memory-intensive document transformations, vector rasterization, OpenXML generation, and OCR.

---

## 2. Core Runtime Requirements

| Dependency | Required Version | Purpose |
|------------|------------------|---------|
| **Node.js** | `>= 20.0.0` (Tested on Node 24.19.0) | Core JavaScript runtime for API & Processor servers |
| **npm** | `>= 9.0.0` | Dependency and package management |
| **node:sqlite** | Built-in (Node 22+) | ACID-compliant job persistence (`DatabaseSync`) |

---

## 3. Dedicated PDF & Document Processing Engines

| Capability | Engine / Library | Binaries Required | Status |
|------------|------------------|-------------------|--------|
| **PDF Manipulation & Geometry** | `pdf-lib` + `@cantoo/pdf-lib` | Pure JavaScript (zero external dependencies) | **Active (All 30 Services)** |
| **PDF Password Security & Encryption** | `@cantoo/pdf-lib` | Pure JavaScript | **Active (Batch 6)** |
| **Vector Rasterization (PDF → Image)** | `pdfjs-dist` + `@napi-rs/canvas` | Pre-compiled N-API binary (bundled in `@napi-rs/canvas`) | **Active (Batch 1, Batch 5)** |
| **Image Encoding / Decoding (JPG, PNG)** | `@napi-rs/canvas` | Pre-compiled N-API binary | **Active (Batch 1)** |
| **Archive Packaging (ZIP / Burst)** | `jszip` | Pure JavaScript | **Active (Batch 1, 2, 4)** |
| **OpenXML Word Processing (.docx)** | Native OpenXML Parser & Generator via `jszip` | Pure JavaScript | **Active (Batch 4)** |
| **Spreadsheet Processing (.xlsx/.xls/.csv)** | `xlsx` | Pure JavaScript | **Active (Batch 4)** |
| **Presentation Processing (.pptx)** | Native OpenXML Parser via `jszip` | Pure JavaScript | **Active (Batch 4)** |
| **Markdown & HTML Rendering** | `markdown-it` + Custom Geometry Layout | Pure JavaScript | **Active (Batch 3)** |
| **Optical Character Recognition (OCR)** | `tesseract.js` | WebAssembly engine | **Active (Batch 5)** |
| **Text Extraction with Spatial Geometry** | `pdfjs-dist/legacy` | Pure JavaScript | **Active (Batch 3, 4)** |

---

## 4. Environment Variables Configuration

```bash
# Server Ports
API_PORT=3001
PROCESSOR_PORT=3002
PROCESSOR_URL=http://127.0.0.1:3002

# Server-to-Server Security
PROCESSOR_SHARED_SECRET=<secure_token>

# Backblaze B2 S3-Compatible Storage
B2_2_ENDPOINT=https://s3.ca-east-006.backblazeb2.com
B2_2_REGION=ca-east-006
B2_2_BUCKET_ID=<bucket_id>
B2_2_BUCKET_NAME=prapdf1
B2_2_KEY_ID=<key_id>
B2_2_APPLICATION_KEY=<application_key>

# Telegram Audit Backup
TELEGRAM_BOT_TOKEN=<bot_token>
TELEGRAM_BACKUP_CHAT_ID=-1003919166623
```

---

## 5. Operating System Compatibility
- **Windows (x64)**: 100% verified and operational.
- **Linux (x64/ARM64)**: Fully supported via `@napi-rs/canvas` pre-built wheels and standard Node.js runtime.
- **macOS (Apple Silicon/Intel)**: Fully supported.
