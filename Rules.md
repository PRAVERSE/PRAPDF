# PRA PDF — Engineering & Operational Rules
**A PRAVERSE Company**

---

## 1. Absolute Directives

### Rule 1.1: Strict Zero-AI Policy
PRA PDF is engineered as a deterministic document computing platform. Under **no circumstances** may any code, service, script, or configuration include:
- OpenAI API, ChatGPT, GPT-4, Anthropic Claude, or Google Gemini
- AI summarization, AI rewrite, or AI semantic search
- Cloud AI vision APIs or machine-learning OCR models
- External paid or proprietary AI APIs
All document parsing, optical character recognition, and transformations must use deterministic software libraries (e.g., `pdf-lib`, `PDF.js`, `Tesseract.js WASM`, `jsPDF`, `SheetJS`).

### Rule 1.2: Strict 50 MB Maximum File Size
- The absolute maximum file size for any file ingested into PRA PDF is **50 MB** (52,428,800 bytes).
- The legacy 100 MB limit must never appear anywhere in the codebase.
- This rule must be enforced independently across three tiers:
  1. Frontend (immediate dropzone / file input rejection)
  2. API Gateway / Backend (`Content-Length` header check and streaming payload counter)
  3. Processing Engine (byte buffer size guard)

### Rule 1.3: Absolute Prohibition of PDF4QT
As explicitly mandated, **PDF4QT is strictly excluded** from PRA PDF. No binaries, libraries, bindings, submodules, or code from PDF4QT may be copied, referenced, or included.

### Rule 1.4: Real Implementations Only — Zero Fake Functionality
- Every one of the 30 services must have a genuine, operational implementation.
- Never create a placeholder button, fake dialog, or mock progress bar that does not perform the advertised operation.
- Never show a "Success" state or download link if the underlying operation failed or was skipped.

---

## 2. Security & Data Protection Rules

### Rule 2.1: Zero Secret Exposure
- Secrets (Backblaze B2 Application Keys, Telegram Bot Tokens, internal API secrets) must **never** be checked into version control or bundled into client-side JavaScript.
- Secrets must only be accessed via server-side environment variables.

### Rule 2.2: Comprehensive Upload Validation
- Never trust file extensions alone (e.g., a file named `report.pdf` that is actually an executable).
- Validate file size first, followed by MIME type and magic number byte signatures (`%PDF-`, `PK\x03\x04`, `\xFF\xD8\xFF`, etc.).
- Reject malformed, corrupted, or oversized files with helpful, user-friendly error messages.

### Rule 2.3: Safe Temporary Filenames & Path Traversal Prevention
- Never write files to disk using raw user-supplied filenames.
- Always generate cryptographically secure UUID-based filenames for processing (e.g., `crypto.randomUUID() + ".bin"`).
- Ensure file paths cannot escape designated sandboxed directories.

### Rule 2.4: Short-Lived Access & Ephemeral Retention
- All client-side blob URLs must be revoked via `URL.revokeObjectURL()` once the download is triggered or the view is unmounted.
- Server-side temporary storage in B2 or local `/tmp` directories must expire and delete files within **10 minutes** of job completion.
- Telegram backups are restricted strictly to **original uploaded files** with an ephemeral retention window (~24 hours).

---

## 3. Open-Source Compliance & Repository Integrity

### Rule 3.1: Non-Destructive Source Repository Handling
- The cloned source repositories (`Stirling-PDF`, `bentopdf`, `pdfcraft`, `pdfarranger`) are reference material.
- Do not modify them destructively, delete their working files, rename random files inside them, or corrupt their git history.
- PRA PDF application code lives strictly inside its own clean directory (`pra-pdf/`).

### Rule 3.2: Preservation of Licenses & Attribution
- Always preserve original copyright notices, license headers, and attributions of open-source components adapted from reference repositories.
- Never claim third-party code as originally authored by PRA PDF.
- All reused components, dependencies, and algorithms must be accurately chronicled in `LICENSES-AND-ATTRIBUTIONS.md`.

### Rule 3.3: Deduplication of Dependencies
- Avoid bundling multiple competing libraries for the same task without architectural justification.
- Unify PDF generation and manipulation around `pdf-lib` and `PDF.js` across the platform.

---

## 4. Testing & Test Artifact Rules

### Rule 4.1: Test Before Marking Complete
- No service, feature, or component may be marked "Completed" in `Memory.md` until it has undergone empirical testing (both automated unit/integration tests and manual execution).
- Test cases must cover:
  - Valid files
  - Empty files
  - Corrupted files
  - Files exceeding the 50 MB limit
  - Downloadable output verification
  - Cleanup verification

### Rule 4.2: Strict Test Artifact Cleanup
- Any temporary file created during testing (e.g., test PDFs, dummy images, converted documents, temp zip files) is classified as a **Test Artifact**.
- Test artifacts **MUST BE DELETED IMMEDIATELY** once test assertions pass.
- Never commit test outputs, debug dumps, or generated PDFs to the repository.
- Only permanent fixtures required for regression tests may be kept, placed strictly under `pra-pdf/tests/fixtures/` and documented.

---

## 5. UI & User Experience Rules

### Rule 5.1: Unified PRA PDF Identity
- All tools must adhere strictly to the PRA PDF Design System (PRA Navy `#0A0F1D`, Electric Indigo `#6366F1`, Inter typography, consistent card layout).
- The user must experience PRA PDF as **one single, polished product**, never a patchwork of separate projects.

### Rule 5.2: Graceful Error Messaging
- The application must never crash or display an unhandled JavaScript exception to the user.
- If processing fails, display a clear, friendly error explanation (e.g., "File exceeds the 50 MB limit", "Password is incorrect", "Document structure is corrupted") without exposing stack traces or server paths.
