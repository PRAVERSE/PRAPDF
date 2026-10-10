/**
 * PRA PDF — Complete UI Routes and 56 Tools Verification Test Suite
 * Validates registry completeness, 50 MB strict limits, routes, categories, and status reconciliation.
 */

import { describe, it, expect } from 'vitest';
import { TOOLS_REGISTRY, findToolById, CATEGORY_LABELS, getLiveTools, getImplementedTools, getComingSoonTools } from '../src/services/toolsRegistry';
import { MAX_FILE_SIZE_BYTES, validateFileSize } from '../src/services/core/fileValidator';
import { ICONS, getToolIcon } from '../src/components/icons';

describe('PRA PDF Master Specification Verification', () => {
  it('contains all 56 canonical tools numbered 1 to 56', () => {
    expect(TOOLS_REGISTRY.length).toBe(56);
    const serviceNumbers = TOOLS_REGISTRY.map((t) => t.serviceNumber);
    for (let i = 1; i <= 56; i++) {
      expect(serviceNumbers).toContain(i);
    }
  });

  it('reconciles exact counts: 43 Live, 0 Implemented, 13 Coming Soon', () => {
    const live = getLiveTools();
    const implemented = getImplementedTools();
    const comingSoon = getComingSoonTools();

    expect(live.length).toBe(43);
    expect(implemented.length).toBe(0);
    expect(comingSoon.length).toBe(13);
    expect(live.length + implemented.length + comingSoon.length).toBe(56);
  });

  it('verifies all 17 Verified Live production services', () => {
    const expectedLiveIds = [
      'jpg-to-pdf',
      'png-to-pdf',
      'merge-pdf',
      'split-pdf',
      'organize-pdf-pages',
      'delete-pdf-pages',
      'extract-pdf-pages',
      'rotate-pdf',
      'crop-pdf',
      'alternate-mix-pdf',
      'split-pdf-in-half',
      'n-up-pdf',
      'flip-pdf',
      'add-page-numbers',
      'delete-pdf-annotations',
      'edit-pdf-metadata',
      'extract-pdf-text',
    ];

    expectedLiveIds.forEach((id) => {
      const tool = findToolById(id);
      expect(tool, `Tool ${id} must exist`).toBeDefined();
      expect(tool?.status, `Tool ${id} must be marked 'live'`).toBe('live');
    });
  });

  it('verifies Wave 1 services individually', () => {
    const wave1Ids = [
      'delete-pdf-annotations',
      'flip-pdf',
      'split-pdf-in-half',
      'alternate-mix-pdf',
      'n-up-pdf',
    ];

    wave1Ids.forEach((id) => {
      const tool = findToolById(id);
      expect(tool).toBeDefined();
      expect(tool?.status).toBe('live');
    });
  });

  it('supports route aliases for organize-pdf, editor, and rtf-conversion', () => {
    const organizeDef = findToolById('organize-pdf');
    expect(organizeDef).toBeDefined();
    expect(organizeDef?.id).toBe('organize-pdf-pages');

    const editorDef = findToolById('editor');
    expect(editorDef).toBeDefined();
    expect(editorDef?.id).toBe('full-pdf-editing');

    const rtfDef = findToolById('rtf-conversion');
    expect(rtfDef).toBeDefined();
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

  it('verifies that every tool in registry has an SVG icon', () => {
    TOOLS_REGISTRY.forEach((tool) => {
      const icon = getToolIcon(tool.id);
      expect(icon).toContain('<svg');
      expect(icon).toContain('</svg>');
    });
  });

  it('verifies all categories in category labels', () => {
    const categories = [
      'all',
      'live',
      'convert-to-pdf',
      'convert-from-pdf',
      'organize',
      'optimize',
      'edit',
      'security',
      'extract-manage',
      'forms-signatures',
    ];

    categories.forEach((cat) => {
      expect((CATEGORY_LABELS as any)[cat]).toBeDefined();
    });
  });
});
