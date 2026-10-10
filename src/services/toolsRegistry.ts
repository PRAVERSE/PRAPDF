/**
 * PRA PDF — Canonical 56-Service Master Registry
 * Defines metadata, categories, accepted formats, execution status, and route slugs for all 56 tools.
 * Zero external branding. 100% PRA PDF by PRAVERSE.
 *
 * Status Breakdown:
 *   - 'live': 56 services verified in production Cloudflare Worker (All 56 tools 100% LIVE)
 *   - 'implemented': 0 services
 *   - 'coming-soon': 0 services
 */

export type ToolCategory =
  | 'convert-to-pdf'
  | 'convert-from-pdf'
  | 'organize'
  | 'optimize'
  | 'edit'
  | 'security'
  | 'extract-manage'
  | 'forms-signatures'
  | 'other-conversions';

export type ToolStatus = 'live' | 'implemented' | 'coming-soon';

export interface ToolDefinition {
  id: string;
  serviceNumber: number;
  title: string;
  description: string;
  category: ToolCategory;
  categoryLabel: string;
  acceptedExtensions: string[];
  multiple?: boolean;
  aliases?: string[];
  popular?: boolean;
  accentColor?: string;
  accentBg?: string;
  selectBtnLabel?: string;
  actionBtnLabel?: string;
  status: ToolStatus;
  wave?: number;
}

export const CATEGORY_LABELS: Record<string, string> = {
  'all': 'All Tools',
  'live': 'Verified Live',
  'convert-to-pdf': 'Convert to PDF',
  'convert-from-pdf': 'Convert from PDF',
  'organize': 'Organize PDF',
  'optimize': 'Optimize PDF',
  'edit': 'Edit & Annotate',
  'forms-signatures': 'Forms & Signatures',
  'security': 'PDF Security',
  'extract-manage': 'Extract & Metadata',
  'other-conversions': 'Other Conversions',
};

export const TOOLS_REGISTRY: ToolDefinition[] = [
  // ==========================================
  // 1–11: CONVERT TO PDF (11 SERVICES)
  // ==========================================
  {
    id: 'jpg-to-pdf',
    serviceNumber: 1,
    title: 'JPG to PDF',
    description: 'Convert JPG images into a high-quality PDF document with custom page formatting.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.jpg', '.jpeg'],
    multiple: true,
    popular: true,
    status: 'live',
  },
  {
    id: 'png-to-pdf',
    serviceNumber: 2,
    title: 'PNG to PDF',
    description: 'Convert PNG images to PDF while preserving alpha transparency and crisp resolution.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.png'],
    multiple: true,
    status: 'live',
  },
  {
    id: 'images-to-pdf',
    serviceNumber: 3,
    title: 'Images to PDF',
    description: 'Combine multiple mixed images (JPG, PNG, WebP) into a single multi-page PDF document.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.zip'],
    multiple: true,
    status: 'live',
  },
  {
    id: 'word-to-pdf',
    serviceNumber: 4,
    title: 'Word to PDF',
    description: 'Convert Microsoft Word (.docx, .doc) documents to clean, formatted PDF files.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.docx', '.doc'],
    popular: true,
    status: 'live',
  },
  {
    id: 'excel-to-pdf',
    serviceNumber: 5,
    title: 'Excel to PDF',
    description: 'Render Excel workbooks (.xlsx, .xls) and spreadsheets into paginated, auto-fitted PDF tables.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.xlsx', '.xls', '.csv'],
    status: 'live',
  },
  {
    id: 'powerpoint-to-pdf',
    serviceNumber: 6,
    title: 'PowerPoint to PDF',
    description: 'Convert PowerPoint presentations (.pptx, .ppt) into sequential widescreen PDF slides.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.pptx', '.ppt'],
    status: 'live',
  },
  {
    id: 'html-to-pdf',
    serviceNumber: 7,
    title: 'HTML to PDF',
    description: 'Convert web pages, HTML files, or raw HTML code into paginated, styled PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.html', '.htm'],
    status: 'live',
  },
  {
    id: 'txt-to-pdf',
    serviceNumber: 8,
    title: 'TXT to PDF',
    description: 'Convert raw plain text files or typed content into neatly formatted, paginated PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.txt'],
    status: 'live',
  },
  {
    id: 'markdown-to-pdf',
    serviceNumber: 9,
    title: 'Markdown to PDF',
    description: 'Convert Markdown (.md) documents and notes into beautifully styled PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.md', '.markdown'],
    status: 'live',
  },
  {
    id: 'rtf-to-pdf',
    serviceNumber: 10,
    title: 'RTF to PDF',
    description: 'Convert Rich Text Format (.rtf) documents to cleanly formatted PDF files.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.rtf'],
    aliases: ['rtf-conversion'],
    status: 'live',
  },
  {
    id: 'scan-to-pdf',
    serviceNumber: 11,
    title: 'Scan to PDF',
    description: 'Capture documents directly from your camera with real-time perspective correction and auto-cropping.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.jpg', '.png', '.pdf'],
    status: 'live',
  },

  // ==========================================
  // 12–20: CONVERT FROM PDF (9 SERVICES)
  // ==========================================
  {
    id: 'pdf-to-jpg',
    serviceNumber: 12,
    title: 'PDF to JPG',
    description: 'Extract and render PDF pages into crisp high-resolution JPG images packaged in a ZIP.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
    status: 'live',
  },
  {
    id: 'pdf-to-png',
    serviceNumber: 13,
    title: 'PDF to PNG',
    description: 'Render PDF pages into lossless PNG images with transparent background support.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-tiff',
    serviceNumber: 14,
    title: 'PDF to TIFF',
    description: 'Convert PDF document pages into archival multi-page TIFF images for legal and enterprise storage.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-markdown',
    serviceNumber: 15,
    title: 'PDF to Markdown',
    description: 'Extract structured text blocks, headings, and lists from PDF into clean Markdown formatting.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-word',
    serviceNumber: 16,
    title: 'PDF to Word',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) documents with flow preservation.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
    status: 'live',
  },
  {
    id: 'pdf-to-excel',
    serviceNumber: 17,
    title: 'PDF to Excel',
    description: 'Extract tabular PDF data into structured Microsoft Excel workbooks (.xlsx) with clean column grids.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-csv',
    serviceNumber: 18,
    title: 'PDF to CSV',
    description: 'Extract tables and delimited data from PDF pages directly into lightweight CSV format.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-powerpoint',
    serviceNumber: 19,
    title: 'PDF to PowerPoint',
    description: 'Convert PDF pages into editable PowerPoint slide presentations (.pptx) with retained layouts.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'pdf-to-rtf',
    serviceNumber: 20,
    title: 'PDF to RTF',
    description: 'Export PDF documents into formatted Rich Text Format (.rtf) documents compatible with legacy word processors.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    aliases: ['rtf-conversion'],
    status: 'live',
  },

  // ==========================================
  // 21–31: ORGANIZE PDF (11 SERVICES - ALL 11 VERIFIED LIVE)
  // ==========================================
  {
    id: 'merge-pdf',
    serviceNumber: 21,
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one document with visual reordering controls.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    multiple: true,
    popular: true,
    status: 'live',
  },
  {
    id: 'split-pdf',
    serviceNumber: 22,
    title: 'Split PDF',
    description: 'Split PDF by page ranges (e.g. 1-3, 5) or separate into standalone single-page files.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
    status: 'live',
  },
  {
    id: 'organize-pdf-pages',
    serviceNumber: 23,
    title: 'Organize PDF Pages',
    description: 'Interactive page grid to reorder, rotate, duplicate, or delete PDF pages visually.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    aliases: ['organize-pdf'],
    status: 'live',
  },
  {
    id: 'delete-pdf-pages',
    serviceNumber: 24,
    title: 'Delete PDF Pages',
    description: 'Remove unwanted pages from a PDF document by selecting specific page numbers or ranges.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'extract-pdf-pages',
    serviceNumber: 25,
    title: 'Extract PDF Pages',
    description: 'Extract selected pages from an existing PDF document into a brand new standalone file.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'rotate-pdf',
    serviceNumber: 26,
    title: 'Rotate PDF',
    description: 'Rotate PDF pages clockwise by 90°, 180°, or 270° per-page or document-wide.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'crop-pdf',
    serviceNumber: 27,
    title: 'Crop PDF',
    description: 'Trim outer margins and adjust visible page boundaries with interactive margin controls.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'alternate-mix-pdf',
    serviceNumber: 28,
    title: 'Alternate & Mix PDF',
    description: 'Collate and interleave pages from two or more PDFs (e.g. alternating odd and even scan passes).',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    multiple: true,
    status: 'live',
  },
  {
    id: 'split-pdf-in-half',
    serviceNumber: 29,
    title: 'Split PDF in Half',
    description: 'Split double-page book spreads or side-by-side scans down the middle into two individual pages.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'n-up-pdf',
    serviceNumber: 30,
    title: 'N-up PDF',
    description: 'Print or impose 2, 4, or 8 pages per sheet to create compact handouts and booklet proofs.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'flip-pdf',
    serviceNumber: 31,
    title: 'Flip PDF',
    description: 'Mirror PDF pages horizontally or vertically with lossless vector transformation.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },

  // ==========================================
  // 32–36: OPTIMIZE PDF (5 SERVICES)
  // ==========================================
  {
    id: 'compress-pdf',
    serviceNumber: 32,
    title: 'Compress PDF',
    description: 'Reduce PDF file size while keeping the document usable with selectable compression profiles.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
    status: 'live',
  },
  {
    id: 'ocr-pdf',
    serviceNumber: 33,
    title: 'OCR PDF',
    description: 'Recognize text from scanned image PDFs using client-side WebAssembly OCR.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'grayscale-pdf',
    serviceNumber: 34,
    title: 'Grayscale PDF',
    description: 'Convert color documents and images into clean black-and-white monochrome for print cost savings.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'deskew-pdf',
    serviceNumber: 35,
    title: 'Deskew PDF',
    description: 'Automatically straighten crooked, rotated, or slanted document scans with Hough line detection.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'repair-pdf',
    serviceNumber: 36,
    title: 'Repair PDF',
    description: 'Rebuild damaged cross-reference tables and recover readable text streams from corrupted PDF files.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },

  // ==========================================
  // 37–44: EDIT & ANNOTATE (8 SERVICES)
  // ==========================================
  {
    id: 'add-page-numbers',
    serviceNumber: 37,
    title: 'Add Page Numbers',
    description: 'Insert customizable page numbers with positioning, custom format styles, and start numbers.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'watermark-pdf',
    serviceNumber: 38,
    title: 'Watermark PDF',
    description: 'Apply text or image watermarks with angle, opacity, color, and page selection controls.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'header-footer-pdf',
    serviceNumber: 39,
    title: 'Header & Footer',
    description: 'Add custom recurring headers, footers, timestamps, and document codes to page margins.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'bates-numbering-pdf',
    serviceNumber: 40,
    title: 'Bates Numbering',
    description: 'Apply indexed sequential legal Bates stamps with custom prefixes and zero-padding across batches.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    multiple: true,
    status: 'live',
  },
  {
    id: 'annotate-pdf',
    serviceNumber: 41,
    title: 'Annotate PDF',
    description: 'Add comments, text callouts, shapes, stamps, and highlighters to review documents easily.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'delete-pdf-annotations',
    serviceNumber: 42,
    title: 'Delete Annotations',
    description: 'Remove all comments, highlights, stamps, and strikeouts from PDF pages while preserving text.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'flatten-pdf',
    serviceNumber: 43,
    title: 'Flatten PDF',
    description: 'Merge form fields, layers, and interactive annotations permanently into static page geometry.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'resize-pdf',
    serviceNumber: 44,
    title: 'Resize PDF Pages',
    description: 'Scale and reformat page sizes to standard paper dimensions (A4, A3, Letter, Legal, Tabloid).',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },

  // ==========================================
  // 45–47: FORMS & SIGNATURES (3 SERVICES)
  // ==========================================
  {
    id: 'fill-pdf-forms',
    serviceNumber: 45,
    title: 'Fill PDF Forms',
    description: 'Interactive browser form filler for AcroForm text fields, checkboxes, radios, and dropdowns.',
    category: 'forms-signatures',
    categoryLabel: 'Forms & Signatures',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'create-pdf-forms',
    serviceNumber: 46,
    title: 'Create PDF Forms',
    description: 'Add fillable input boxes, signature lines, checkboxes, and buttons to convert flat PDFs into forms.',
    category: 'forms-signatures',
    categoryLabel: 'Forms & Signatures',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'sign-pdf',
    serviceNumber: 47,
    title: 'Sign PDF',
    description: 'Apply visual electronic signatures with SHA-256 document audit hash and timestamp (visual electronic signing, non-PKI).',
    category: 'forms-signatures',
    categoryLabel: 'Forms & Signatures',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },

  // ==========================================
  // 48–50: SECURITY (3 SERVICES)
  // ==========================================
  {
    id: 'password-protect-pdf',
    serviceNumber: 48,
    title: 'Password-Protect PDF',
    description: 'Encrypt your PDF with standard encryption requiring a password to open and view.',
    category: 'security',
    categoryLabel: 'PDF Security',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'unlock-pdf',
    serviceNumber: 49,
    title: 'Unlock PDF',
    description: 'Remove password protection and viewing restrictions from an authorized PDF document.',
    category: 'security',
    categoryLabel: 'PDF Security',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'redact-pdf',
    serviceNumber: 50,
    title: 'Redact PDF',
    description: 'Permanently black out and sanitize confidential text, personal IDs, and sensitive data.',
    category: 'security',
    categoryLabel: 'PDF Security',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },

  // ==========================================
  // 51–56: EXTRACT, METADATA & STUDIO (6 SERVICES)
  // ==========================================
  {
    id: 'pdf-to-pdfa',
    serviceNumber: 51,
    title: 'PDF to PDF/A',
    description: 'Enhance PDF archival structure with ISO 19005-1 PDF/A-1b metadata, GTS_PDFA1 OutputIntent, and script removal (best-effort).',
    category: 'extract-manage',
    categoryLabel: 'Extract & Metadata',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'compare-pdf',
    serviceNumber: 52,
    title: 'Compare PDF',
    description: 'Compare two PDF documents side-by-side to highlight differences in text and layout.',
    category: 'extract-manage',
    categoryLabel: 'Extract & Metadata',
    acceptedExtensions: ['.pdf'],
    multiple: true,
    status: 'live',
  },
  {
    id: 'extract-images-from-pdf',
    serviceNumber: 53,
    title: 'Extract Images',
    description: 'Extract all embedded raster images from PDF pages and download them in a ZIP archive.',
    category: 'extract-manage',
    categoryLabel: 'Extract & Metadata',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'edit-pdf-metadata',
    serviceNumber: 54,
    title: 'Edit PDF Metadata',
    description: 'Inspect and edit document properties (Title, Author, Subject, Keywords, Creator, Producer).',
    category: 'extract-manage',
    categoryLabel: 'Extract & Metadata',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'extract-pdf-text',
    serviceNumber: 55,
    title: 'Extract PDF Text',
    description: 'Extract clean, raw plaintext from PDF pages with dual preview, copy, and download controls.',
    category: 'extract-manage',
    categoryLabel: 'Extract & Metadata',
    acceptedExtensions: ['.pdf'],
    status: 'live',
  },
  {
    id: 'full-pdf-editing',
    serviceNumber: 56,
    title: 'Full PDF Editing',
    description: 'Full studio: Add & edit text, images, markup, shapes, highlights, and annotations.',
    category: 'edit',
    categoryLabel: 'Edit & Annotate',
    acceptedExtensions: ['.pdf'],
    aliases: ['editor'],
    popular: true,
    status: 'live',
  },
];

export function findToolById(id: string): ToolDefinition | undefined {
  return TOOLS_REGISTRY.find(
    (t) => t.id === id || (t.aliases && t.aliases.includes(id))
  );
}

export function getLiveTools(): ToolDefinition[] {
  return TOOLS_REGISTRY.filter((t) => t.status === 'live');
}

export function getImplementedTools(): ToolDefinition[] {
  return TOOLS_REGISTRY.filter((t) => t.status === 'implemented');
}

export function getComingSoonTools(): ToolDefinition[] {
  return TOOLS_REGISTRY.filter((t) => t.status === 'coming-soon');
}

export interface ToolVisualMeta {
  accentColor: string;
  accentBg: string;
  selectBtnLabel: string;
  actionBtnLabel: string;
  badge?: string;
}

const TOOL_VISUALS: Record<string, ToolVisualMeta> = {
  // Convert to PDF
  'jpg-to-pdf': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select JPG images', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'png-to-pdf': { accentColor: '#E11D48', accentBg: 'rgba(225, 29, 72, 0.12)', selectBtnLabel: 'Select PNG images', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'images-to-pdf': { accentColor: '#FB7185', accentBg: 'rgba(251, 113, 133, 0.12)', selectBtnLabel: 'Select Images', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'word-to-pdf': { accentColor: '#1D4ED8', accentBg: 'rgba(29, 78, 216, 0.12)', selectBtnLabel: 'Select WORD files', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'excel-to-pdf': { accentColor: '#059669', accentBg: 'rgba(5, 150, 105, 0.12)', selectBtnLabel: 'Select EXCEL files', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'powerpoint-to-pdf': { accentColor: '#EA580C', accentBg: 'rgba(234, 88, 12, 0.12)', selectBtnLabel: 'Select POWERPOINT files', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'html-to-pdf': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select HTML file', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'txt-to-pdf': { accentColor: '#64748B', accentBg: 'rgba(100, 116, 139, 0.12)', selectBtnLabel: 'Select TXT file', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'markdown-to-pdf': { accentColor: '#06B6D4', accentBg: 'rgba(6, 182, 212, 0.12)', selectBtnLabel: 'Select MARKDOWN file', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'rtf-to-pdf': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select RTF file', actionBtnLabel: 'Convert to PDF', badge: 'LIVE' },
  'scan-to-pdf': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Scan from Camera', actionBtnLabel: 'Capture & Convert', badge: 'LIVE' },

  // Convert from PDF
  'pdf-to-jpg': { accentColor: '#F59E0B', accentBg: 'rgba(245, 158, 11, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to JPG', badge: 'LIVE' },
  'pdf-to-png': { accentColor: '#D97706', accentBg: 'rgba(217, 119, 6, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to PNG', badge: 'LIVE' },
  'pdf-to-tiff': { accentColor: '#B45309', accentBg: 'rgba(180, 83, 9, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to TIFF', badge: 'LIVE' },
  'pdf-to-markdown': { accentColor: '#0891B2', accentBg: 'rgba(8, 145, 178, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to Markdown', badge: 'LIVE' },
  'pdf-to-word': { accentColor: '#2563EB', accentBg: 'rgba(37, 99, 235, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to WORD', badge: 'LIVE' },
  'pdf-to-excel': { accentColor: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to Excel', badge: 'LIVE' },
  'pdf-to-csv': { accentColor: '#059669', accentBg: 'rgba(5, 150, 105, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to CSV', badge: 'LIVE' },
  'pdf-to-powerpoint': { accentColor: '#F97316', accentBg: 'rgba(249, 115, 22, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to PowerPoint', badge: 'LIVE' },
  'pdf-to-rtf': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to RTF', badge: 'LIVE' },

  // Organize PDF
  'merge-pdf': { accentColor: '#E11D48', accentBg: 'rgba(225, 29, 72, 0.12)', selectBtnLabel: 'Select PDF files', actionBtnLabel: 'Merge PDF', badge: 'LIVE' },
  'split-pdf': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Split PDF', badge: 'LIVE' },
  'organize-pdf-pages': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Organize Pages', badge: 'LIVE' },
  'organize-pdf': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Organize Pages', badge: 'LIVE' },
  'delete-pdf-pages': { accentColor: '#DC2626', accentBg: 'rgba(220, 38, 38, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Delete Selected Pages', badge: 'LIVE' },
  'extract-pdf-pages': { accentColor: '#9333EA', accentBg: 'rgba(147, 51, 234, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Extract Pages', badge: 'LIVE' },
  'rotate-pdf': { accentColor: '#4F46E5', accentBg: 'rgba(79, 70, 229, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Rotate PDF', badge: 'LIVE' },
  'crop-pdf': { accentColor: '#2563EB', accentBg: 'rgba(37, 99, 235, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Crop PDF', badge: 'LIVE' },
  'alternate-mix-pdf': { accentColor: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)', selectBtnLabel: 'Select PDF files', actionBtnLabel: 'Alternate & Mix', badge: 'LIVE' },
  'split-pdf-in-half': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Split in Half', badge: 'LIVE' },
  'n-up-pdf': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Impose N-up', badge: 'LIVE' },
  'flip-pdf': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Flip PDF', badge: 'LIVE' },

  // Optimize PDF
  'compress-pdf': { accentColor: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Compress PDF', badge: 'LIVE' },
  'ocr-pdf': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Run OCR', badge: 'LIVE' },
  'grayscale-pdf': { accentColor: '#6B7280', accentBg: 'rgba(107, 114, 128, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to Grayscale', badge: 'LIVE' },
  'deskew-pdf': { accentColor: '#14B8A6', accentBg: 'rgba(20, 184, 166, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Auto-Deskew PDF', badge: 'LIVE' },
  'repair-pdf': { accentColor: '#EF4444', accentBg: 'rgba(239, 68, 68, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Repair Document', badge: 'LIVE' },

  // Edit & Annotate
  'add-page-numbers': { accentColor: '#3B82F6', accentBg: 'rgba(59, 130, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Add Page Numbers', badge: 'LIVE' },
  'watermark-pdf': { accentColor: '#A855F7', accentBg: 'rgba(168, 85, 247, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Apply Watermark', badge: 'LIVE' },
  'header-footer-pdf': { accentColor: '#3B82F6', accentBg: 'rgba(59, 130, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Add Header & Footer', badge: 'LIVE' },
  'bates-numbering-pdf': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select PDF files', actionBtnLabel: 'Add Bates Numbers', badge: 'LIVE' },
  'annotate-pdf': { accentColor: '#EC4899', accentBg: 'rgba(236, 72, 153, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Annotate PDF', badge: 'LIVE' },
  'delete-pdf-annotations': { accentColor: '#EF4444', accentBg: 'rgba(239, 68, 68, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Delete Annotations', badge: 'LIVE' },
  'flatten-pdf': { accentColor: '#F59E0B', accentBg: 'rgba(245, 158, 11, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Flatten PDF', badge: 'LIVE' },
  'resize-pdf': { accentColor: '#06B6D4', accentBg: 'rgba(6, 182, 212, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Resize Pages', badge: 'LIVE' },

  // Forms & Signatures
  'fill-pdf-forms': { accentColor: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)', selectBtnLabel: 'Select PDF Form', actionBtnLabel: 'Fill Form Fields', badge: 'LIVE' },
  'create-pdf-forms': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Build Form Fields', badge: 'LIVE' },
  'sign-pdf': { accentColor: '#E11D48', accentBg: 'rgba(225, 29, 72, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Sign Document', badge: 'LIVE' },

  // Security
  'password-protect-pdf': { accentColor: '#7C3AED', accentBg: 'rgba(124, 58, 237, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Protect PDF', badge: 'LIVE' },
  'unlock-pdf': { accentColor: '#EC4899', accentBg: 'rgba(236, 72, 153, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Unlock PDF', badge: 'LIVE' },
  'redact-pdf': { accentColor: '#DC2626', accentBg: 'rgba(220, 38, 38, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Redact Text & Areas', badge: 'LIVE' },

  // Extract & Metadata
  'pdf-to-pdfa': { accentColor: '#059669', accentBg: 'rgba(5, 150, 105, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to PDF/A', badge: 'LIVE' },
  'compare-pdf': { accentColor: '#F59E0B', accentBg: 'rgba(245, 158, 11, 0.12)', selectBtnLabel: 'Select 2 PDF files', actionBtnLabel: 'Compare Documents', badge: 'LIVE' },
  'extract-images-from-pdf': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Extract Images', badge: 'LIVE' },
  'edit-pdf-metadata': { accentColor: '#475569', accentBg: 'rgba(71, 85, 105, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Save Metadata', badge: 'LIVE' },
  'extract-pdf-text': { accentColor: '#0D9488', accentBg: 'rgba(13, 148, 136, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Extract Text', badge: 'LIVE' },
  'full-pdf-editing': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Open PDF Studio', badge: 'LIVE' },

  // Fallback RTF
  'rtf-conversion': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select Document', actionBtnLabel: 'Convert Document', badge: 'LIVE' },
};

export function getToolVisualMeta(toolId: string): ToolVisualMeta {
  return TOOL_VISUALS[toolId] || {
    accentColor: '#E11D48',
    accentBg: 'rgba(225, 29, 72, 0.12)',
    selectBtnLabel: 'Select files',
    actionBtnLabel: 'Convert to PDF',
  };
}
