/**
 * PRA PDF — Contact Page
 * A PRAVERSE Company
 * Clean, established software contact directory.
 * Direct email channels with zero form bloat or artificial support CRM templates.
 */

export class ContactPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="contact-page-container">
        <!-- Page Header -->
        <header class="contact-page-header">
          <h1 class="contact-page-title">Contact</h1>
          <p class="contact-page-intro">
            Have a question, found an issue, or want to get in touch with the PRA PDF team? Contact us directly by email.
          </p>
        </header>

        <hr class="contact-divider" />

        <!-- Contact Directory Sections -->
        <div class="contact-sections">
          <!-- Section 1: General Support -->
          <section class="contact-block">
            <div class="contact-block-label">General Support</div>
            <div class="contact-block-body">
              <a href="mailto:support@praverse.com" class="contact-email-link">support@praverse.com</a>
              <p class="contact-block-desc">
                For general questions, technical issues, feedback, and problems with PRA PDF.
              </p>
              <a href="mailto:support@praverse.com" class="contact-action-link" aria-label="Email General Support">
                Email Support <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>

          <hr class="contact-divider-subtle" />

          <!-- Section 2: Security -->
          <section class="contact-block">
            <div class="contact-block-label">Security</div>
            <div class="contact-block-body">
              <a href="mailto:security@praverse.com" class="contact-email-link">security@praverse.com</a>
              <p class="contact-block-desc">
                For responsible disclosure of security vulnerabilities or security-related concerns.
              </p>
              <a href="mailto:security@praverse.com" class="contact-action-link" aria-label="Email Security Team">
                Email Security Team <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>

          <hr class="contact-divider-subtle" />

          <!-- Section 3: Privacy Notice -->
          <section class="contact-block">
            <div class="contact-block-label">Privacy</div>
            <div class="contact-block-body">
              <p class="contact-block-desc" style="color: var(--pra-text-secondary); max-width: 580px;">
                Please do not send confidential documents or sensitive personal information by email. All PRA PDF document operations run client-side in your web browser.
              </p>
            </div>
          </section>
        </div>

        <hr class="contact-divider" style="margin-top: 40px;" />

        <!-- Footer Signature -->
        <footer class="contact-page-footer">
          <div class="contact-brand-name">PRA PDF</div>
          <div class="contact-brand-sub">A PRAVERSE Company</div>
        </footer>
      </div>
    `;
  }
}
