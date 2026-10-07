/**
 * PRA PDF — Privacy Policy Page (Section 18)
 * Clean, compliant privacy documentation covering Information Handled, Uploaded Files,
 * Processing, Storage, Retention, Cookies, Security, Third-Party Services, User Rights, and Contact.
 */

export class PrivacyPage {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="tool-runner-container" style="max-width: 840px; margin: 40px auto;">
        <div class="tool-header-block" style="text-align: left; margin-bottom: 24px;">
          <div class="tool-header-top-meta">
            <span class="tool-service-tag">PRAVERSE COMPLIANCE</span>
            <span class="tool-category-tag">DATA PRIVACY</span>
          </div>
          <h1 class="tool-title" style="font-size: 2rem;">Privacy Policy</h1>
          <p class="tool-subtitle">Last updated: October 2026 • PRA PDF by PRAVERSE</p>
        </div>

        <div class="card-container" style="line-height: 1.8; color: var(--pra-text-secondary);">
          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">1. Information Handled</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF is an online document and PDF utility platform provided by PRAVERSE. We believe in minimal data footprint. 
            We do not require user accounts, email registration, or personal profiling to access the core 30 document utilities.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">2. Uploaded Files & Zero-AI Guarantee</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF is strictly a document utility platform and <strong>NOT an AI product</strong>. 
            Your uploaded files and documents are never provided to, trained on, or shared with third-party Artificial Intelligence, 
            machine learning language models, or automated scrapers.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">3. Processing Workflow</h3>
          <p style="margin-bottom: 20px;">
            Document operations (including PDF rendering, page merging, splitting, rotation, watermarking, metadata inspection, and optical text recognition) 
            are processed client-side within modern WebAssembly/JavaScript environments where supported, or ephemeral memory-isolated processing workers.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">4. Storage & Ephemeral Lifecycle</h3>
          <p style="margin-bottom: 20px;">
            Documents processed within your web browser reside in ephemeral client memory (Blob URLs) and are released when you navigate away or close your browser tab. 
            PRA PDF does not maintain permanent archives or public directory listings of user files.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">5. Retention Policy & 50 MB Upload Limit</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF enforces a strict upload limit of <strong>50 MB per file</strong> across all 30 tools. 
            Files exceeding this threshold are immediately rejected by the client validation layer.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">6. Cookies and Analytics</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF operates without intrusive cross-site tracking cookies, behavioral tracking pixels, or third-party advertising networks. 
            Any client-side storage is utilized strictly for interface preferences (such as selected tool options and UI state).
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">7. Security Measures</h3>
          <p style="margin-bottom: 20px;">
            All web communication with PRA PDF is encrypted using Transport Layer Security (HTTPS / TLS 1.3). 
            Client-side file operations are protected by standard browser sandboxing and Content Security Policy boundaries.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">8. Third-Party Services</h3>
          <p style="margin-bottom: 20px;">
            PRA PDF uses standard CDN infrastructure for serving static assets and open-source WebAssembly engines. 
            No third-party analytics SDKs or advertising brokers have access to your document contents.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">9. User Rights</h3>
          <p style="margin-bottom: 20px;">
            You retain 100% full copyright, intellectual property, and privacy rights over your documents. 
            You may remove or clear any active document in the interface at any time with the click of a button.
          </p>

          <h3 style="color: var(--pra-text-primary); margin-bottom: 12px;">10. Contact Information</h3>
          <p>
            If you have questions about privacy or document security on PRA PDF, please visit our <a href="#/contact">Contact Page</a> 
            or reach out to the PRAVERSE team.
          </p>
        </div>
      </div>
    `;
  }
}
