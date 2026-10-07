# PRA PDF — Professional UI/UX Design System Specification
**Product Identity:** Document Productivity Tool & Utility Workspace  
**Parent Brand:** PRAVERSE  
**Design Intelligence Source:** UI UX Pro Max (`Minimalism & Swiss Style` + `Developer Mono / Modern Technical`)  
**Design Philosophy:** Human-Designed, Utility-First, Zero AI Fluff, Architectural Precision

---

## 1. Visual Direction & Identity

PRA PDF is a serious, document-centric productivity platform built for professionals, students, and businesses who need fast, reliable PDF operations without software bloat, subscriptions, or generic marketing distractions.

### Core Visual Tenets:
- **Product Over Marketing:** Immediate access to tools. Users arrive to accomplish a task (e.g. merge contracts, compress reports, convert spreadsheets); the interface immediately facilitates that task.
- **Architectural Utility (Swiss Minimalist):** Structural clarity through typographic hierarchy, grid alignment, open layouts, and hairline dividers—not floating cards or glowing containers.
- **Calm, High-Contrast Precision:** Deep slate surfaces with crisp foreground text and a single purposeful royal blue primary accent (`#2563EB`). No AI purple (`#6366F1`), no neon pinks, no ambient glow or fake glassmorphism.
- **Human-Crafted Restraint:** Every border, margin, font-weight, and transition is intentional. Avoid repetitive "icon in rounded square inside card inside container" visual noise.

---

## 2. Layout Philosophy & Hierarchy of Containment

### The Anti-Card Rule
Containers are used **only** when enclosing interactive content enhances scannability. Floating cards with rounded corners and thick borders are eliminated.

### Levels of Containment:
1. **Level 0 (Base Canvas):** Background `#0D1117` — Deep neutral slate canvas.
2. **Level 1 (Structural Sections & Header):** Open layout segmented by subtle 1px dividers (`#21262D` / `rgba(240, 246, 252, 0.08)`).
3. **Level 2 (Workspace Panels):** `#161B22` — Clean, rectangular panels for tool dropzones, file tables, and options. Minimal radius (`6px`).
4. **Level 3 (Interactive Controls):** `#21262D` — Inputs, select dropdowns, secondary buttons, tool items.
5. **Level 4 (Active / Highlight States):** `#2563EB` (Primary Action) or `#30363D` (Subtle control hover).

---

## 3. Color System

Derived from UI UX Pro Max productivity standards (high contrast, WCAG AAA compliant, zero AI purple):

```css
:root {
  /* Canvas & Surfaces */
  --pra-bg-base: #0D1117;          /* Root canvas slate */
  --pra-bg-surface: #161B22;       /* Workspace panel surface */
  --pra-bg-subtle: #1C2128;        /* Subtle secondary surface */
  --pra-bg-control: #21262D;       /* Interactive inputs & button background */
  --pra-bg-control-hover: #30363D; /* Hover on controls */
  --pra-bg-overlay: rgba(13, 17, 23, 0.85); /* Modal & mobile drawer backdrop */

  /* Primary Utility Accent (Technical Royal Blue) */
  --pra-primary: #2563EB;          /* Primary CTA, active selections */
  --pra-primary-hover: #1D4ED8;    /* Primary hover state */
  --pra-primary-subtle: rgba(37, 99, 235, 0.12); /* Subtle blue selection tint */
  --pra-primary-border: #3B82F6;   /* Active focus rings & drop target hover */

  /* Semantic Document Colors */
  --pra-pdf-red: #DC2626;          /* Document PDF badge, delete buttons */
  --pra-pdf-red-subtle: rgba(220, 38, 38, 0.12);
  --pra-success: #10B981;          /* Completed processing, valid checks */
  --pra-success-subtle: rgba(16, 185, 129, 0.12);
  --pra-warning: #F59E0B;          /* Cautions & warnings */
  --pra-error: #EF4444;            /* Validation errors & file size rejection */
  --pra-error-subtle: rgba(239, 68, 68, 0.12);

  /* Typography / Foreground */
  --pra-text-primary: #F0F6FC;    /* High-contrast crisp text (13:1 contrast) */
  --pra-text-secondary: #8B949E;  /* Readable muted text (5.8:1 contrast) */
  --pra-text-muted: #6E7681;      /* Secondary metadata, hints, shortcuts */
  --pra-text-on-primary: #FFFFFF; /* High contrast text on primary buttons */

  /* Structural Borders & Dividers */
  --pra-border: #30363D;          /* Standard structural border */
  --pra-border-subtle: #21262D;   /* Hairline internal dividers */
  --pra-border-focus: #3B82F6;    /* Keyboard focus ring */

  /* Restrained Shadows (Utility Depth Only) */
  --pra-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --pra-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --pra-shadow-modal: 0 12px 36px rgba(0, 0, 0, 0.6);

  /* Corner Radius System (Tight, Architectural) */
  --pra-radius-xs: 3px;
  --pra-radius-sm: 4px;
  --pra-radius-md: 6px;
  --pra-radius-lg: 8px;
  /* NO radius > 8px (No 16px/24px pill cards) */
}
```

---

## 4. Typography System

- **Primary UI Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- **Monospace Metadata Font:** `'JetBrains Mono', 'SF Mono', Consolas, monospace`
- **Typographic Tone:** Deliberate, technical, calm. Headings use medium/semibold weights (`500` / `600`), avoiding bloated `800` / `900` marketing weights.

### Type Scale:
| Role | Size | Line Height | Weight | Font | Usage |
|---|---|---|---|---|---|
| **App Title / Page Title** | `1.75rem` (28px) | 1.25 | 600 | Inter | Page headers, Hero title |
| **Section Title (H2)** | `1.25rem` (20px) | 1.3 | 600 | Inter | Category groups, workspace titles |
| **Tool Title / Group (H3)** | `0.9375rem` (15px) | 1.35 | 600 | Inter | Tool list items, panel headers |
| **Body Standard** | `0.875rem` (14px) | 1.5 | 400 | Inter | Descriptions, form labels, body text |
| **Helper / Caption** | `0.75rem` (12px) | 1.4 | 400 | Inter | Hints, file types, instructions |
| **Monospace Badges** | `0.75rem` (12px) | 1.2 | 500 | JetBrains Mono | Sizes (`14.2 MB`), counts, shortcuts (`/`) |

---

## 5. Spacing System

Based on a strict 4px/8px modular rhythm:
- `4px` (`0.25rem`): Inline micro-gaps (badge icons, tags).
- `8px` (`0.5rem`): Control inner padding, tight list item gap.
- `12px` (`0.75rem`): Input padding, tool item padding.
- `16px` (`1rem`): Standard container padding, form field gap.
- `24px` (`1.5rem`): Section gaps, workspace grid column gaps.
- `32px` (`2rem`): Major section vertical spacing.
- `48px` (`3rem`): Maximum vertical rhythm between page blocks (no massive empty wastelands).

---

## 6. Border & Corner-Radius System

- **Borders:** Thin `1px solid var(--pra-border)`. No thick `2px` or `3px` decorative strokes.
- **Corner Radii:**
  - Buttons & Inputs: `4px` (`var(--pra-radius-sm)`).
  - Panels & Workspace Box: `6px` (`var(--pra-radius-md)`).
  - Modal Containers: `8px` (`var(--pra-radius-lg)`).
  - **No 24px/9999px pills:** Badges and tabs are compact rounded rectangles (`4px`), not rounded sausages.

---

## 7. Iconography

- **Library:** Crisp, unadorned 24x24 SVG icons with a uniform `1.75px` to `2px` stroke weight.
- **Presentation:** Icons live directly beside tool titles or action labels. No unnecessary multi-layer nested containers (e.g. no "icon inside colored circle inside square inside card").
- **Semantic Usage:** Icons reinforce tool utility (e.g. split scissor, merge arrows, lock, watermark stamp), not decorative eye-candy.

---

## 8. Buttons & Actions

1. **Primary Button (`.btn-primary`):**
   - Background: `#2563EB`, text: `#FFFFFF`.
   - Crisp rectangular shape (`border-radius: 4px`, `padding: 9px 18px`).
   - Solid presence; no glowing dropshadows or neon gradients.
2. **Secondary Button (`.btn-secondary`):**
   - Background: `#21262D`, border: `1px solid #30363D`, text: `#F0F6FC`.
   - Hover: `#30363D`.
3. **Tertiary / Ghost Button (`.btn-ghost`):**
   - Transparent background, text: `#8B949E`. Hover: `#F0F6FC` + subtle background.
4. **Destructive Button (`.btn-danger`):**
   - Background: `#DC2626`, text: `#FFFFFF`. Hover: `#B91C1C`.

---

## 9. Forms & Inputs

- Background: `#161B22`, border: `1px solid #30363D`, text: `#F0F6FC`.
- Focus State: Visible `2px solid #3B82F6` with clean outline, zero layout shift.
- Labels: `13px`, weight `500`, color `#8B949E`.
- Grouping: Logical parameter grids (e.g., Page Size + Orientation in 2-column inline layout).

---

## 10. Tool Discovery & Presentation (30 Tools)

Rather than 30 identical floating cards, tool discovery uses an **editorial structured matrix**:
- **Categorized Sections:**
  1. **Convert to PDF** (JPG, PNG, Images, Word, Excel, PowerPoint, HTML, TXT, Markdown)
  2. **Convert from PDF** (PDF to JPG, PNG, Word, Markdown, Text, RTF, RTF to PDF)
  3. **Organize & Pages** (Merge, Split, Delete, Extract, Rotate, Crop, Metadata)
  4. **Optimize & Inspect** (Compress, OCR)
  5. **Security & Protection** (Password Protect, Unlock)
  6. **Annotate & Stamp** (Page Numbers, Watermark)
  7. **Full PDF Editor Studio**
- **Tool Item Presentation:**
  - High information density.
  - Left: Clean functional tool icon.
  - Middle: Tool Title (`14px`, weight 600) + concise utility description (`12px`, muted).
  - Right: Subtle arrow icon indicator on hover.
  - Fast scan, keyboard navigable, responsive grid.

---

## 11. Tool Workspace & Dropzone Design

A focused document workspace that feels like a desktop utility:
- **Title Block:** Breadcrumb + Tool name + concise 1-sentence function summary.
- **Dropzone:**
  - Neutral dark slate background (`#161B22`).
  - Subtle `1px dashed #30363D` border. Hover/Dragover transitions to `1px solid #3B82F6`.
  - Icon + "Drop files here or browse".
  - **Prominent 50 MB Limit Notice:** Monospace tag stating `Maximum file size: 50 MB per file`.
- **Selected Files List (Data Table / Document Rows):**
  - Clean rows with `1px` hairlines separating documents.
  - Columns: `#`, Document Icon, File Name, Formatted Size (`JetBrains Mono`), Move Up/Down controls, Remove button.
  - Reorderable via drag-and-drop or accessible arrow buttons.
- **Options Panel:**
  - Grouped clean parameters without nested cards.
- **Action Bar:**
  - Dedicated bottom action bar with primary action button and clear status.

---

## 12. Full PDF Editor Studio

- **Visual Concept:** Native web document workstation (similar to Adobe Acrobat / Figma).
- **Top Bar:** Document name with file icon, Undo/Redo history buttons, Zoom stepper (`-`, `100%`, `+`, `Fit`), Page indicator, Primary Export button.
- **Left Panel:** Scrollable thumbnail strip displaying scaled page previews with active page ring.
- **Canvas:** Deep neutral background (`#0D1117`), crisp white document page with 1px border and real document shadow.
- **Right Inspector Panel:** Clean tabbed controls for text formatting, shape strokes, colors, and opacity.

---

## 13. Contact Page

Replaced generic AI-generated form with a professional support center:
- **Two-Column Split Layout:**
  - **Left Column (Direct Support Channels):** Technical support email (`support@praverse.com`), response time SLA (typically under 24 hours), security bug bounty guidelines, PRAVERSE headquarters metadata.
  - **Right Column (Structured Inquiry Form):** Name, Work Email, Subject Category (Feedback, Bug, Enterprise, General), Detailed Message, and Send Action.

---

## 14. Responsive Behavior

Explicitly tested and optimized at:
- **375px (Mobile):** Single column tool rows, compact header with clean slide drawer, stacked upload controls, full-width primary CTA.
- **768px (Tablet):** 2-column tool sections, side-by-side file row info.
- **1024px (Desktop):** 3-column tool sections, persistent editor panels.
- **1440px (Wide):** Centered max-width container (`1200px`), optimal line length (`65-75ch`).

---

## 15. Accessibility & Anti-Patterns Banned

### Accessibility (WCAG 2.1 AA):
- Text contrast ratios exceed 4.5:1 for body and 3:1 for large text.
- High-visibility keyboard focus rings (`outline: 2px solid #3B82F6; outline-offset: 2px;`).
- Semantic HTML tags (`<header>`, `<main>`, `<nav>`, `<section>`, `<article>`, `<button>`).
- Full support for `prefers-reduced-motion`.
- Explicit 44x44px minimum touch targets on mobile.

### Banned Anti-Patterns:
1. ❌ Generic AI purple (`#6366F1`) and pink/cyan gradients.
2. ❌ Glowing buttons, radial ambient gradient blobs.
3. ❌ Card-inside-card syndrome.
4. ❌ Pill badges on every card.
5. ❌ Huge marketing hero before tools.
6. ❌ 30 identical card containers.
7. ❌ Fake glassmorphism with heavy blur and low-contrast text.
