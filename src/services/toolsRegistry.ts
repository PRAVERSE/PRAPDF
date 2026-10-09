/**
 * PRA PDF — 30 Services Master Registry
 * Defines metadata, categories, accepted formats, and route slugs for all 30 tools.
 * Zero external branding. 100% PRA PDF by PRAVERSE.
 */

export type ToolCategory =
  | 'convert-to-pdf'
  | 'convert-from-pdf'
  | 'organize'
  | 'optimize'
  | 'edit'
  | 'security'
  | 'extract-manage'
  | 'other-conversions';

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
}

export const CATEGORY_LABELS: Record<ToolCategory | 'all', string> = {
  'all': 'All Tools',
  'convert-to-pdf': 'Convert to PDF',
  'convert-from-pdf': 'Convert from PDF',
  'organize': 'Organize PDF',
  'optimize': 'Optimize PDF',
  'edit': 'Edit PDF',
  'security': 'Security',
  'extract-manage': 'Extract & Manage',
  'other-conversions': 'Other Conversions',
};

export const TOOLS_REGISTRY: ToolDefinition[] = [
  // 1–9: DOCUMENT → PDF
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
  },
  {
    id: 'word-to-pdf',
    serviceNumber: 4,
    title: 'Word to PDF',
    description: 'Convert Microsoft Word (.docx, .doc) documents to clean, formatted PDF files.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.docx', '.doc'],
  },
  {
    id: 'excel-to-pdf',
    serviceNumber: 5,
    title: 'Excel to PDF',
    description: 'Render Excel workbooks (.xlsx, .xls) and spreadsheets into paginated, auto-fitted PDF tables.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.xlsx', '.xls', '.csv'],
  },
  {
    id: 'powerpoint-to-pdf',
    serviceNumber: 6,
    title: 'PowerPoint to PDF',
    description: 'Convert PowerPoint presentations (.pptx, .ppt) into sequential widescreen PDF slides.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.pptx', '.ppt'],
  },
  {
    id: 'html-to-pdf',
    serviceNumber: 7,
    title: 'HTML to PDF',
    description: 'Convert web pages, HTML files, or raw HTML code into paginated, styled PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.html', '.htm'],
  },
  {
    id: 'txt-to-pdf',
    serviceNumber: 8,
    title: 'TXT to PDF',
    description: 'Convert raw plain text files or typed content into neatly formatted, paginated PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.txt'],
  },
  {
    id: 'markdown-to-pdf',
    serviceNumber: 9,
    title: 'Markdown to PDF',
    description: 'Convert Markdown (.md) documents and notes into beautifully styled PDF documents.',
    category: 'convert-to-pdf',
    categoryLabel: 'Convert to PDF',
    acceptedExtensions: ['.md', '.markdown'],
  },

  // 10–13: PDF → OTHER FORMATS
  {
    id: 'pdf-to-jpg',
    serviceNumber: 10,
    title: 'PDF to JPG',
    description: 'Extract and render PDF pages into crisp high-resolution JPG images packaged in a ZIP.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
  },
  {
    id: 'pdf-to-png',
    serviceNumber: 11,
    title: 'PDF to PNG',
    description: 'Render PDF pages into lossless PNG images with transparent background support.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'pdf-to-markdown',
    serviceNumber: 12,
    title: 'PDF to Markdown',
    description: 'Extract structured text blocks, headings, and lists from PDF into clean Markdown formatting.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'pdf-to-word',
    serviceNumber: 13,
    title: 'PDF to Word',
    description: 'Convert PDF documents into editable Microsoft Word (.docx) documents with flow preservation.',
    category: 'convert-from-pdf',
    categoryLabel: 'Convert from PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
  },

  // 14–20: PDF ORGANIZATION
  {
    id: 'merge-pdf',
    serviceNumber: 14,
    title: 'Merge PDF',
    description: 'Combine multiple PDF files into one document with visual reordering controls.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    multiple: true,
    popular: true,
  },
  {
    id: 'split-pdf',
    serviceNumber: 15,
    title: 'Split PDF',
    description: 'Split PDF by page ranges (e.g. 1-3, 5) or separate into standalone single-page files.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
  },
  {
    id: 'organize-pdf-pages',
    serviceNumber: 16,
    title: 'Organize PDF Pages',
    description: 'Interactive page grid to reorder, rotate, duplicate, or delete PDF pages visually.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
    aliases: ['organize-pdf'],
  },
  {
    id: 'delete-pdf-pages',
    serviceNumber: 17,
    title: 'Delete PDF Pages',
    description: 'Remove unwanted pages from a PDF document by selecting specific page numbers or ranges.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'extract-pdf-pages',
    serviceNumber: 18,
    title: 'Extract PDF Pages',
    description: 'Extract selected pages from an existing PDF document into a brand new standalone file.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'rotate-pdf',
    serviceNumber: 19,
    title: 'Rotate PDF',
    description: 'Rotate PDF pages clockwise by 90°, 180°, or 270° per-page or document-wide.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'crop-pdf',
    serviceNumber: 20,
    title: 'Crop PDF',
    description: 'Trim outer margins and adjust visible page boundaries with interactive margin controls.',
    category: 'organize',
    categoryLabel: 'Organize PDF',
    acceptedExtensions: ['.pdf'],
  },

  // 21–24: PDF OPTIMIZATION / PROCESSING
  {
    id: 'compress-pdf',
    serviceNumber: 21,
    title: 'Compress PDF',
    description: 'Reduce PDF file size while keeping the document usable with selectable compression profiles.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
    popular: true,
  },
  {
    id: 'ocr-pdf',
    serviceNumber: 22,
    title: 'OCR PDF',
    description: 'Recognize text from scanned image PDFs using client-side WebAssembly OCR.',
    category: 'optimize',
    categoryLabel: 'Optimize PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'add-page-numbers',
    serviceNumber: 23,
    title: 'Add Page Numbers',
    description: 'Insert customizable page numbers with positioning, custom format styles, and start numbers.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'watermark-pdf',
    serviceNumber: 24,
    title: 'Watermark PDF',
    description: 'Apply text or image watermarks with angle, opacity, color, and page selection controls.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    acceptedExtensions: ['.pdf'],
  },

  // 25–28: PDF EDITING / SECURITY / INFORMATION
  {
    id: 'full-pdf-editing',
    serviceNumber: 25,
    title: 'Full PDF Editing',
    description: 'Full studio: Add & edit text, images, markup, shapes, highlights, and annotations.',
    category: 'edit',
    categoryLabel: 'Edit PDF',
    acceptedExtensions: ['.pdf'],
    aliases: ['editor'],
    popular: true,
  },
  {
    id: 'password-protect-pdf',
    serviceNumber: 26,
    title: 'Password-Protect PDF',
    description: 'Encrypt your PDF with standard encryption requiring a password to open and view.',
    category: 'security',
    categoryLabel: 'Security',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'unlock-pdf',
    serviceNumber: 27,
    title: 'Unlock PDF',
    description: 'Remove password protection and viewing restrictions from an authorized PDF document.',
    category: 'security',
    categoryLabel: 'Security',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'edit-pdf-metadata',
    serviceNumber: 28,
    title: 'Edit PDF Metadata',
    description: 'Inspect and edit document properties (Title, Author, Subject, Keywords, Creator, Producer).',
    category: 'extract-manage',
    categoryLabel: 'Extract & Manage',
    acceptedExtensions: ['.pdf'],
  },
  {
    id: 'extract-pdf-text',
    serviceNumber: 29,
    title: 'Extract PDF Text',
    description: 'Extract clean, raw plaintext from PDF pages with dual preview, copy, and download controls.',
    category: 'extract-manage',
    categoryLabel: 'Extract & Manage',
    acceptedExtensions: ['.pdf'],
  },

  // 30: OTHER DOCUMENT CONVERSION
  {
    id: 'rtf-conversion',
    serviceNumber: 30,
    title: 'RTF Conversion',
    description: 'Convert Rich Text Format (.rtf) to PDF or extract PDF documents into formatted RTF files.',
    category: 'other-conversions',
    categoryLabel: 'Other Conversions',
    acceptedExtensions: ['.rtf', '.pdf'],
  },
];

export function findToolById(id: string): ToolDefinition | undefined {
  return TOOLS_REGISTRY.find(
    (t) => t.id === id || (t.aliases && t.aliases.includes(id))
  );
}

export interface ToolVisualMeta {
  accentColor: string;
  accentBg: string;
  selectBtnLabel: string;
  actionBtnLabel: string;
  badge?: string;
}

const TOOL_VISUALS: Record<string, ToolVisualMeta> = {
  'merge-pdf': { accentColor: '#E11D48', accentBg: 'rgba(225, 29, 72, 0.12)', selectBtnLabel: 'Select PDF files', actionBtnLabel: 'Merge PDF', badge: 'POPULAR' },
  'split-pdf': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Split PDF', badge: 'POPULAR' },
  'compress-pdf': { accentColor: '#10B981', accentBg: 'rgba(16, 185, 129, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Compress PDF', badge: 'RECOMMENDED' },
  'pdf-to-word': { accentColor: '#2563EB', accentBg: 'rgba(37, 99, 235, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to WORD', badge: 'POPULAR' },
  'pdf-to-jpg': { accentColor: '#F59E0B', accentBg: 'rgba(245, 158, 11, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to JPG', badge: 'POPULAR' },
  'pdf-to-png': { accentColor: '#D97706', accentBg: 'rgba(217, 119, 6, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to PNG' },
  'pdf-to-markdown': { accentColor: '#0891B2', accentBg: 'rgba(8, 145, 178, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Convert to Markdown' },
  'word-to-pdf': { accentColor: '#1D4ED8', accentBg: 'rgba(29, 78, 216, 0.12)', selectBtnLabel: 'Select WORD files', actionBtnLabel: 'Convert to PDF' },
  'excel-to-pdf': { accentColor: '#059669', accentBg: 'rgba(5, 150, 105, 0.12)', selectBtnLabel: 'Select EXCEL files', actionBtnLabel: 'Convert to PDF' },
  'powerpoint-to-pdf': { accentColor: '#EA580C', accentBg: 'rgba(234, 88, 12, 0.12)', selectBtnLabel: 'Select POWERPOINT files', actionBtnLabel: 'Convert to PDF' },
  'jpg-to-pdf': { accentColor: '#F43F5E', accentBg: 'rgba(244, 63, 94, 0.12)', selectBtnLabel: 'Select JPG images', actionBtnLabel: 'Convert to PDF', badge: 'POPULAR' },
  'png-to-pdf': { accentColor: '#E11D48', accentBg: 'rgba(225, 29, 72, 0.12)', selectBtnLabel: 'Select PNG images', actionBtnLabel: 'Convert to PDF' },
  'images-to-pdf': { accentColor: '#FB7185', accentBg: 'rgba(251, 113, 133, 0.12)', selectBtnLabel: 'Select Images', actionBtnLabel: 'Convert to PDF' },
  'html-to-pdf': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select HTML file', actionBtnLabel: 'Convert to PDF' },
  'txt-to-pdf': { accentColor: '#64748B', accentBg: 'rgba(100, 116, 139, 0.12)', selectBtnLabel: 'Select TXT file', actionBtnLabel: 'Convert to PDF' },
  'markdown-to-pdf': { accentColor: '#06B6D4', accentBg: 'rgba(6, 182, 212, 0.12)', selectBtnLabel: 'Select MARKDOWN file', actionBtnLabel: 'Convert to PDF' },
  'organize-pdf-pages': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Organize Pages' },
  'organize-pdf': { accentColor: '#8B5CF6', accentBg: 'rgba(139, 92, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Organize Pages' },
  'delete-pdf-pages': { accentColor: '#DC2626', accentBg: 'rgba(220, 38, 38, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Delete Selected Pages' },
  'extract-pdf-pages': { accentColor: '#9333EA', accentBg: 'rgba(147, 51, 234, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Extract Pages' },
  'rotate-pdf': { accentColor: '#4F46E5', accentBg: 'rgba(79, 70, 229, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Rotate PDF' },
  'crop-pdf': { accentColor: '#2563EB', accentBg: 'rgba(37, 99, 235, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Crop PDF' },
  'ocr-pdf': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Run OCR' },
  'add-page-numbers': { accentColor: '#3B82F6', accentBg: 'rgba(59, 130, 246, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Add Page Numbers' },
  'watermark-pdf': { accentColor: '#A855F7', accentBg: 'rgba(168, 85, 247, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Apply Watermark' },
  'full-pdf-editing': { accentColor: '#6366F1', accentBg: 'rgba(99, 102, 241, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Open PDF Studio', badge: 'STUDIO' },
  'password-protect-pdf': { accentColor: '#7C3AED', accentBg: 'rgba(124, 58, 237, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Protect PDF' },
  'unlock-pdf': { accentColor: '#EC4899', accentBg: 'rgba(236, 72, 153, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Unlock PDF' },
  'edit-pdf-metadata': { accentColor: '#475569', accentBg: 'rgba(71, 85, 105, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Save Metadata' },
  'extract-pdf-text': { accentColor: '#0D9488', accentBg: 'rgba(13, 148, 136, 0.12)', selectBtnLabel: 'Select PDF file', actionBtnLabel: 'Extract Text' },
  'rtf-conversion': { accentColor: '#0284C7', accentBg: 'rgba(2, 132, 199, 0.12)', selectBtnLabel: 'Select Document', actionBtnLabel: 'Convert Document' },
};

export function getToolVisualMeta(toolId: string): ToolVisualMeta {
  return TOOL_VISUALS[toolId] || {
    accentColor: '#E11D48',
    accentBg: 'rgba(225, 29, 72, 0.12)',
    selectBtnLabel: 'Select files',
    actionBtnLabel: 'Convert to PDF',
  };
}
