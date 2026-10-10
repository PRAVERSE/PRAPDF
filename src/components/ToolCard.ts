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
  const isComingSoon = tool.status === 'coming-soon';
  const isLive = tool.status === 'live';

  let badgeHtml = '';
  if (isLive) {
    const label = visual.badge && visual.badge !== 'AVAILABLE' ? visual.badge : 'LIVE';
    badgeHtml = `<span class="tool-card-badge live-badge" title="Verified active in production">${label}</span>`;
  } else if (isComingSoon) {
    badgeHtml = `<span class="tool-card-badge coming-soon-badge" title="Scheduled for development">COMING SOON</span>`;
  } else if (visual.badge) {
    badgeHtml = `<span class="tool-card-badge available-badge">${visual.badge}</span>`;
  } else {
    badgeHtml = `<span class="tool-card-badge available-badge">AVAILABLE</span>`;
  }

  const actionText = isComingSoon ? 'Coming Soon' : 'Open Tool';
  const actionColor = isComingSoon ? 'var(--pra-text-muted)' : visual.accentColor;

  return `
    <a 
      href="${targetHref}" 
      class="ilove-tool-card ${isComingSoon ? 'is-coming-soon' : ''}" 
      id="tool-item-${tool.id}"
      data-tool-id="${tool.id}"
      data-tool-status="${tool.status}"
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
        <span class="tool-card-action-text" style="color: ${actionColor};">
          ${actionText}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
      </div>
    </a>
  `;
}
