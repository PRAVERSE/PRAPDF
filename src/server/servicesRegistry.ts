/**
 * PRA PDF — Backend 30 Services Canonical Registry
 * A PRAVERSE Company
 * Defines exact service IDs, MIME/extension requirements, output formats,
 * and current processing status (AVAILABLE, PLANNED, PROCESSOR_REQUIRED, TEMPORARILY_UNAVAILABLE).
 */

export type ServiceStatus =
  | 'AVAILABLE'
  | 'PLANNED'
  | 'PROCESSOR_REQUIRED'
  | 'TEMPORARILY_UNAVAILABLE';

export interface BackendServiceDef {
  serviceId: string;
  serviceNumber: number;
  displayName: string;
  category: string;
  acceptedExtensions: string[];
  outputExtension: string;
  status: ServiceStatus;
  multiple?: boolean;
}

export const LOCKED_30_SERVICES: BackendServiceDef[] = [
  // 1–9: Document → PDF
  {
    serviceId: 'jpg-to-pdf',
    serviceNumber: 1,
    displayName: 'JPG to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.jpg', '.jpeg'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'png-to-pdf',
    serviceNumber: 2,
    displayName: 'PNG to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.png'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'images-to-pdf',
    serviceNumber: 3,
    displayName: 'Images to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.bmp'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
    multiple: true,
  },
  {
    serviceId: 'word-to-pdf',
    serviceNumber: 4,
    displayName: 'Word to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.docx', '.doc'],
    outputExtension: '.pdf',
    status: 'PROCESSOR_REQUIRED',
  },
  {
    serviceId: 'excel-to-pdf',
    serviceNumber: 5,
    displayName: 'Excel to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.xlsx', '.xls', '.csv'],
    outputExtension: '.pdf',
    status: 'PROCESSOR_REQUIRED',
  },
  {
    serviceId: 'powerpoint-to-pdf',
    serviceNumber: 6,
    displayName: 'PowerPoint to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.pptx', '.ppt'],
    outputExtension: '.pdf',
    status: 'PROCESSOR_REQUIRED',
  },
  {
    serviceId: 'html-to-pdf',
    serviceNumber: 7,
    displayName: 'HTML to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.html', '.htm'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'txt-to-pdf',
    serviceNumber: 8,
    displayName: 'TXT to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.txt'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'markdown-to-pdf',
    serviceNumber: 9,
    displayName: 'Markdown to PDF',
    category: 'convert-to-pdf',
    acceptedExtensions: ['.md', '.markdown'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },

  // 10–13: PDF → Other Formats
  {
    serviceId: 'pdf-to-jpg',
    serviceNumber: 10,
    displayName: 'PDF to JPG',
    category: 'convert-from-pdf',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.zip',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'pdf-to-png',
    serviceNumber: 11,
    displayName: 'PDF to PNG',
    category: 'convert-from-pdf',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.zip',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'pdf-to-markdown',
    serviceNumber: 12,
    displayName: 'PDF to Markdown',
    category: 'convert-from-pdf',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.md',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'pdf-to-word',
    serviceNumber: 13,
    displayName: 'PDF to Word',
    category: 'convert-from-pdf',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.docx',
    status: 'PROCESSOR_REQUIRED',
  },

  // 14–20: PDF Organization
  {
    serviceId: 'merge-pdf',
    serviceNumber: 14,
    displayName: 'Merge PDF',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
    multiple: true,
  },
  {
    serviceId: 'split-pdf',
    serviceNumber: 15,
    displayName: 'Split PDF',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.zip',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'organize-pdf-pages',
    serviceNumber: 16,
    displayName: 'Organize PDF Pages',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'delete-pdf-pages',
    serviceNumber: 17,
    displayName: 'Delete PDF Pages',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'extract-pdf-pages',
    serviceNumber: 18,
    displayName: 'Extract PDF Pages',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'rotate-pdf',
    serviceNumber: 19,
    displayName: 'Rotate PDF',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'crop-pdf',
    serviceNumber: 20,
    displayName: 'Crop PDF',
    category: 'organize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },

  // 21–24: PDF Optimization & Processing
  {
    serviceId: 'compress-pdf',
    serviceNumber: 21,
    displayName: 'Compress PDF',
    category: 'optimize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'ocr-pdf',
    serviceNumber: 22,
    displayName: 'OCR PDF',
    category: 'optimize',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'PROCESSOR_REQUIRED',
  },
  {
    serviceId: 'add-page-numbers',
    serviceNumber: 23,
    displayName: 'Add Page Numbers',
    category: 'edit',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'watermark-pdf',
    serviceNumber: 24,
    displayName: 'Watermark PDF',
    category: 'edit',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },

  // 25–28: PDF Editing / Security / Information
  {
    serviceId: 'full-pdf-editing',
    serviceNumber: 25,
    displayName: 'Full PDF Editing',
    category: 'edit',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'password-protect-pdf',
    serviceNumber: 26,
    displayName: 'Password-Protect PDF',
    category: 'security',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'unlock-pdf',
    serviceNumber: 27,
    displayName: 'Unlock PDF',
    category: 'security',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'edit-pdf-metadata',
    serviceNumber: 28,
    displayName: 'Edit PDF Metadata',
    category: 'extract-manage',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.pdf',
    status: 'AVAILABLE',
  },
  {
    serviceId: 'extract-pdf-text',
    serviceNumber: 29,
    displayName: 'Extract PDF Text',
    category: 'extract-manage',
    acceptedExtensions: ['.pdf'],
    outputExtension: '.txt',
    status: 'AVAILABLE',
  },

  // 30: RTF Conversion (Exactly One)
  {
    serviceId: 'rtf-conversion',
    serviceNumber: 30,
    displayName: 'RTF Conversion',
    category: 'other-conversions',
    acceptedExtensions: ['.rtf', '.pdf'],
    outputExtension: '.pdf',
    status: 'PROCESSOR_REQUIRED',
  },
];

export function getAllServices(): BackendServiceDef[] {
  return LOCKED_30_SERVICES;
}

export function getServiceById(serviceId: string): BackendServiceDef | undefined {
  return LOCKED_30_SERVICES.find((s) => s.serviceId === serviceId);
}

export function isValidServiceId(serviceId: string): boolean {
  return LOCKED_30_SERVICES.some((s) => s.serviceId === serviceId);
}
