/**
 * PRA PDF — Complete UI Routes and 30 Tools Verification Test Suite
 * Validates registry completeness, 50 MB strict limits, routes, and categories.
 */

import { describe, it, expect } from 'vitest';
import { TOOLS_REGISTRY, findToolById, CATEGORY_LABELS } from '../src/services/toolsRegistry';
import { MAX_FILE_SIZE_BYTES, validateFileSize } from '../src/services/core/fileValidator';
import { ICONS, getToolIcon } from '../src/components/icons';

describe('PRA PDF Master Specification Verification', () => {
  it('contains at least 30 baseline tools in the expanding 56-tool registry', () => {
    expect(TOOLS_REGISTRY.length).toBeGreaterThanOrEqual(30);
    // Verify each service number 1 to 30 is present without gaps
    const serviceNumbers = TOOLS_REGISTRY.map((t) => t.serviceNumber);
    for (let i = 1; i <= 30; i++) {
      expect(serviceNumbers).toContain(i);
    }
  });

  it('verifies exact tool IDs for all 30 tools', () => {
    const expectedIds = [
      // 1-9: Document -> PDF
      'jpg-to-pdf',
      'png-to-pdf',
      'images-to-pdf',
      'word-to-pdf',
      'excel-to-pdf',
      'powerpoint-to-pdf',
      'html-to-pdf',
      'txt-to-pdf',
      'markdown-to-pdf',
      // 10-13: PDF -> Other Formats
      'pdf-to-jpg',
      'pdf-to-png',
      'pdf-to-markdown',
      'pdf-to-word',
      // 14-20: PDF Organization
      'merge-pdf',
      'split-pdf',
      'organize-pdf-pages',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'rotate-pdf',
      'crop-pdf',
      // 21-24: PDF Optimization & Processing
      'compress-pdf',
      'ocr-pdf',
      'add-page-numbers',
      'watermark-pdf',
      // 25-28: PDF Editing & Security
      'full-pdf-editing',
      'password-protect-pdf',
      'unlock-pdf',
      'edit-pdf-metadata',
      // 29-30: Extract & Other
      'extract-pdf-text',
      'rtf-conversion',
    ];

    expectedIds.forEach((id) => {
      const found = findToolById(id);
      expect(found, `Tool ID "${id}" must exist in registry`).toBeDefined();
    });
  });

  it('supports route aliases for organize-pdf and editor', () => {
    const organizeDef = findToolById('organize-pdf');
    expect(organizeDef).toBeDefined();
    expect(organizeDef?.serviceNumber).toBe(16);

    const editorDef = findToolById('editor');
    expect(editorDef).toBeDefined();
    expect(editorDef?.serviceNumber).toBe(25);
  });

  it('verifies strict 50 MB upload limit enforcement', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);

    const validFile = new File(['a'.repeat(1024)], 'doc.pdf', { type: 'application/pdf' });
    expect(validateFileSize(validFile).valid).toBe(true);

    const oversizedFile = {
      name: 'large.pdf',
      size: 51 * 1024 * 1024,
      type: 'application/pdf',
    } as File;
    const oversizedResult = validateFileSize(oversizedFile);
    expect(oversizedResult.valid).toBe(false);
    expect(oversizedResult.error).toContain('50 MB');
  });

  it('verifies that each of the 30 tools has a dedicated SVG icon', () => {
    TOOLS_REGISTRY.forEach((tool) => {
      const icon = getToolIcon(tool.id);
      expect(icon).toContain('<svg');
      expect(icon).toContain('</svg>');
    });
  });

  it('verifies all 8 categories + All Tools in category labels', () => {
    const categories = [
      'all',
      'convert-to-pdf',
      'convert-from-pdf',
      'organize',
      'optimize',
      'edit',
      'security',
      'extract-manage',
      'other-conversions',
    ];

    categories.forEach((cat) => {
      expect((CATEGORY_LABELS as any)[cat]).toBeDefined();
    });
  });
});
