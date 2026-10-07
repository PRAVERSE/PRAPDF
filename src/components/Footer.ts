/**
 * PRA PDF — Footer Component
 * Architectural, high-density utility footer.
 * Features PRA PDF by PRAVERSE brand, fast links, 50 MB limits, and legal links.
 */

export function renderFooter(): string {
  const year = new Date().getFullYear();
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-top">
          <div class="footer-brand-col">
            <div class="brand-wrapper">
              <div class="brand-logo-icon">P</div>
              <div class="brand-text-block">
                <span class="brand-title">PRA PDF</span>
                <span class="brand-subtitle">by PRAVERSE</span>
              </div>
            </div>
            <p class="footer-brand-desc">
              Professional document productivity platform. Convert, edit, organize, compress, protect, and extract PDF files with absolute privacy.
            </p>
            <div style="font-family: var(--pra-font-mono); font-size: 0.75rem; color: var(--pra-text-muted);">
              Max upload: 50 MB per file • Zero AI tracking
            </div>
          </div>

          <div>
            <h4 class="footer-heading">Convert & Organize</h4>
            <ul class="footer-links">
              <li><a href="#/tools" class="footer-link">All 30 Tools</a></li>
              <li><a href="#/tools/merge-pdf" class="footer-link">Merge PDF</a></li>
              <li><a href="#/tools/split-pdf" class="footer-link">Split PDF</a></li>
              <li><a href="#/tools/compress-pdf" class="footer-link">Compress PDF</a></li>
              <li><a href="#/tools/pdf-to-word" class="footer-link">PDF to Word</a></li>
              <li><a href="#/tools/jpg-to-pdf" class="footer-link">JPG to PDF</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Studio & Security</h4>
            <ul class="footer-links">
              <li><a href="#/editor" class="footer-link">Full PDF Editor</a></li>
              <li><a href="#/tools/ocr-pdf" class="footer-link">OCR PDF</a></li>
              <li><a href="#/tools/watermark-pdf" class="footer-link">Watermark PDF</a></li>
              <li><a href="#/tools/password-protect-pdf" class="footer-link">Protect PDF</a></li>
              <li><a href="#/tools/unlock-pdf" class="footer-link">Unlock PDF</a></li>
            </ul>
          </div>

          <div>
            <h4 class="footer-heading">Company & Legal</h4>
            <ul class="footer-links">
              <li><a href="#/contact" id="footer-contact-link" class="footer-link">Support & Contact</a></li>
              <li><a href="#/privacy" id="footer-privacy-link" class="footer-link">Privacy Policy</a></li>
              <li><a href="#/terms" id="footer-terms-link" class="footer-link">Terms of Service</a></li>
            </ul>
            <p style="font-size: 0.75rem; color: var(--pra-text-muted); margin-top: 12px; line-height: 1.4;">
              Engineered by PRAVERSE.
            </p>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© ${year} PRAVERSE. All rights reserved.</p>
          <p>PRA PDF is an independent document productivity platform.</p>
        </div>
      </div>
    </footer>
  `;
}
