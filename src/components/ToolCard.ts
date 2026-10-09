/**
 * PRA PDF — Premium Tool Card Component
 * Inspired by the best UX patterns of iLovePDF:
 * Vibrant tool icon container, high-contrast title, concise description,
 * popular badge, and smooth micro-interactions.
 */

import { ToolDefinition, getToolVisualMeta } from '../services/toolsRegistry';
import { getToolIcon } from './icons';

export function renderToolCard(tool: ToolDefinition): string {
  const targetHref = `#/tools/${tool.id}`;
  const visual = getToolVisualMeta(tool.id);
  const badgeHtml = visual.badge
    ? `<span class="tool-card-badge" style="background-color: ${visual.accentBg}; color: ${visual.accentColor}; border: 1px solid ${visual.accentColor}40;">${visual.badge}</span>`
    : '';

  return `
    <a 
      href="${targetHref}" 
      class="ilove-tool-card" 
      id="tool-item-${tool.id}"
      data-tool-id="${tool.id}"
      style="--card-accent: ${visual.accentColor}; --card-accent-bg: ${visual.accentBg};"
    >
      <div class="tool-card-top">
        <div class="tool-card-icon-box" style="background-color: ${visual.accentBg}; color: ${visual.accentColor};">
          ${getToolIcon(tool.id)}
        </div>
        ${badgeHtml}
      </div>
      <div class="tool-card-content">
        <h3 class="tool-card-title">${tool.title}</h3>
        <p class="tool-card-desc">${tool.description}</p>
      </div>
      <div class="tool-card-action">
        <span class="tool-card-action-text" style="color: ${visual.accentColor};">
          Open Tool
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      </div>
    </a>
  `;
}
