/**
 * PRA PDF — Tool Item Component
 * Professional, high-density utility directory entry.
 * Eliminates generic SaaS cards and repetitive boxed framing in favor of a clean directory row.
 */

import { ToolDefinition } from '../services/toolsRegistry';
import { getToolIcon } from './icons';

export function renderToolCard(tool: ToolDefinition): string {
  const targetHref = tool.id === 'full-pdf-editing' ? '#/editor' : `#/tools/${tool.id}`;

  return `
    <a href="${targetHref}" class="tool-row-item" id="tool-item-${tool.id}">
      <span class="tool-row-icon" aria-hidden="true">
        ${getToolIcon(tool.id)}
      </span>
      <div class="tool-row-body">
        <span class="tool-row-title">${tool.title}</span>
        <span class="tool-row-desc">${tool.description}</span>
      </div>
      <span class="tool-row-arrow" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </span>
    </a>
  `;
}
