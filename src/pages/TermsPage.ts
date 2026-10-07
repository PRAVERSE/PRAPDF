/**
 * PRA PDF — Terms of Service Page (Section 19)
 * Outlines Use of Service, User Responsibilities, Acceptable Use, File Ownership,
 * 50 MB Service Limitations, Availability, Third-Party Services, IP, Disclaimer, Changes, and Contact.
 */

export class TermsPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="tool-runner-container" style="max-width: 840px; margin: 40px auto;">
        <div class="tool-header-block" style="text-align: left; margin-bottom: 24px;">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag">PRAVERSE TERMS</span>
            <span class="tool-category-tag">LEGAL AGREEMENT</span>
          </div>
          <h1 class="tool-title" style="font-size: 2rem;">Terms of Service</h1>
          <p class="tool-subtitle">Effective: October 2026 • PRA PDF by PRAVERSE</p>
        </div>

        <div class="card-container" style="line-height: 1.8; color: var(--pra-text-secondary);">
          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">1. Use of Service</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF is an online document and PDF toolkit created by PRAVERSE ("by PRAVERSE"). By using PRA PDF, you agree to 
            these Terms of Service. If you do not agree, you must discontinue use immediately.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">2. User Responsibilities & Authorization</h3>
          <p style="margin-bottom: 20px;">
            You are solely responsible for ensuring that you have legal authorization and intellectual property rights to manipulate, 
            convert, watermark, unlock, or edit any documents you submit to the service. For security tools like "Unlock PDF", 
            you agree to only process documents that you are legally authorized to access.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">3. Acceptable Use</h3>
          <p style="margin-bottom: 20px;">
            You agree not to use PRA PDF to process, distribute, or generate unlawful, malicious, harmful, or copyright-infringing content, 
            nor to probe, exploit, or disrupt the website's infrastructure.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">4. File Ownership & Copyright</h3>
          <p style="margin-bottom: 20px;">
            You retain 100% full, unconditional ownership of all uploaded and converted files. PRA PDF and PRAVERSE claim no rights, 
            licenses, or title to your documents.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">5. Service Limitations (50 MB File Upload Limit)</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF enforces a strict maximum file size of <strong>50 MB per file</strong> across all 30 services. 
            Attempting to circumvent this limit is prohibited.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">6. Availability & Service Continuity</h3>
          <p style="margin-bottom: 20px;">
            We strive to maintain continuous availability of PRA PDF. However, services are provided as an online utility 
            and may experience scheduled maintenance, updates, or temporary interruptions without prior liability.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">7. Third-Party Services & Open Source Libraries</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF incorporates reputable open-source document libraries (such as pdf-lib, PDF.js, and Tesseract WebAssembly). 
            All open-source software is licensed under their respective terms.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">8. Intellectual Property of PRA PDF</h3>
          <p style="margin-bottom: 20px;">
            The PRA PDF name, PRAVERSE branding, website interface design, custom styling, and layout are the intellectual property 
            of PRAVERSE.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">9. Disclaimer of Warranties</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied. 
            While we strive for high conversion fidelity, complex documents or corrupted PDFs may exhibit variations.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">10. Changes to Terms</h3>
          <p style="margin-bottom: 20px;">
            PRAVERSE reserves the right to modify these Terms of Service at any time. Changes will be reflected directly on this page 
            with an updated effective date.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">11. Contact</h3>
          <p>
            For any inquiries regarding these Terms of Service, please reach out through our <a href="#/contact">Contact Page</a>.
          </p>
        </div>
      </div>
    `;
  }
}
