# PRA PDF — Open-Source Licenses & Attributions
**A PRAVERSE Company**

---

## 1. Compliance Statement

PRA PDF ("A PRAVERSE Company") respects and actively upholds the legal requirements of all open-source projects, libraries, and authors whose work has contributed to, or been adapted into, this software. 

In accordance with open-source licensing principles:
- Original copyright notices and permission notices are preserved intact.
- Derivative algorithms and ported implementations cite their original upstream projects.
- No third-party open-source work is misrepresented as originally authored by PRA PDF.
- Under AGPL v3 and GPL obligations, corresponding source code for covered adaptations is maintained openly.

---

## 2. Upstream Repositories Audited & Reused

### 2.1. BentoPDF
- **Upstream Project:** BentoPDF (alam00000/bentopdf)
- **Reference Audited Commit:** `3a5f146d1b89d54dc7ca576aa6797c8bd3e42b97` (v2.8.8)
- **Primary Authors / Copyright:** Copyright (c) BentoPDF Contributors
- **License:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Reused / Adapted Components:** 
  - Client-side PDF manipulation patterns, node algorithms, and file handling utilities.
  - Tesseract.js WebAssembly integration routines for deterministic (non-AI) OCR.
  - Office spreadsheet parsing patterns and PDF.js rendering routines.
- **Modifications:** Re-architected into PRA PDF's modern unified UI and component hierarchy; restyled using the PRAVERSE luxury design system; enhanced with 50 MB multi-tier validation.
- **Source Availability:** Under AGPL-3.0 Section 13, all source code of modified adaptations is provided within this repository.

### 2.2. Stirling-PDF
- **Upstream Project:** Stirling-PDF (Stirling-Tools/Stirling-PDF)
- **Reference Audited Commit:** `824339edc58d4658f50c2077cda60c8ecf718b6e`
- **Primary Authors / Copyright:** Copyright (c) 2025 Stirling PDF Inc.
- **License:** MIT License (Core Engine and Community Modules)
- **Reused / Adapted Components:**
  - PDF manipulation algorithmic concepts, REST endpoint contracts, and page imposition formulas.
- **Modifications:** Integrated into PRA PDF's TypeScript processing layer; decoupled from proprietary enterprise submodules.
- **Permission Notice:**
  ```
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.
  ```

### 2.3. PDFCraft
- **Upstream Project:** PDFCraft (rad03i2/pdfcraft)
- **Reference Audited Commit:** `3375313c5a3dce4eac748ff9675172026709d6ed`
- **Primary Authors / Copyright:** Copyright (c) 2026 Radwan Abdulhadi Ahmed
- **License:** MIT License
- **Reused / Adapted Components:**
  - Concise page specification parser algorithms (`parse_pages` logic adapted to TypeScript).
  - Clean error handling patterns and document metadata inspection structures.
- **Modifications:** Ported from Python to TypeScript within PRA PDF core services.

### 2.4. PDFArranger
- **Upstream Project:** PDFArranger (pdfarranger/pdfarranger)
- **Reference Audited Commit:** `fb76e09762677fe5c3e205bb89ca474500fce53c`
- **Primary Authors / Copyright:** Copyright (c) Jérôme Robert, Konstantinos Poulios, and contributors
- **License:** GNU General Public License v3.0 (GPL-3.0)
- **Reused / Adapted Components:**
  - Visual page grid rearrangement workflows and duplex collating logic.

---

## 3. Core Third-Party Libraries

The following open-source software libraries are utilized directly or transitively in PRA PDF:

| Library | License | Copyright / Authors | Description / Role |
|---|---|---|---|
| **pdf-lib** | MIT | Copyright (c) 2019 Andrew Dillon | Core PDF creation, merging, splitting, modification, and encryption. |
| **pdfjs-dist** | Apache 2.0 | Copyright (c) 2012 Mozilla Foundation | High-fidelity PDF rendering to HTML5 Canvas and text extraction. |
| **tesseract.js** | Apache 2.0 | Copyright (c) 2016-2024 Naptha | Pure client-side WebAssembly Optical Character Recognition (non-AI). |
| **jspdf** | MIT | Copyright (c) 2010-2023 James Hall | PDF document generation from HTML, markdown, and text. |
| **jspdf-autotable**| MIT | Copyright (c) 2014 Simon Tenggren | Structured table rendering from spreadsheet grids. |
| **xlsx (SheetJS)**| Apache 2.0 | Copyright (c) SheetJS LLC | Spreadsheet workbook parser (.xlsx, .xls, .csv). |
| **markdown-it** | MIT | Copyright (c) 2014 Vitaly Puzrin, Alex Kocharin | Fast Markdown parser. |
| **cropperjs** | MIT | Copyright (c) 2015-present Chen Fengyuan | Interactive visual image and page cropping tool. |
| **jszip** | MIT / GPLv3 | Copyright (c) 2009-2016 Stuart Knightley | Client-side ZIP archive creation for batch exports. |
| **lucide** | ISC | Copyright (c) 2022 Lucide Contributors | Consistent, modern vector iconography. |

---

## 4. Exclusion of Prohibited Components

- **PDF4QT:** Explicitly excluded. Zero files, libraries, or dependencies from PDF4QT are present or used in PRA PDF.
- **AI Libraries:** Zero proprietary or third-party AI APIs (OpenAI, Gemini, Anthropic, etc.) are included in PRA PDF.
