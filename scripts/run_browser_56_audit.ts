import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { ALL_56_SERVICES, ServiceTestDefinition } from '../tests/e2e/service_matrix';
import { PDFDocument } from 'pdf-lib';

interface ServiceAuditResult {
  serviceNumber: number;
  serviceId: string;
  name: string;
  category: string;
  wave: string;
  uiLoaded: boolean;
  fileSelected: boolean;
  processTriggered: boolean;
  resultRendered: boolean;
  downloadTriggered: boolean;
  downloadedBytes: number;
  outputValidated: boolean;
  validationDetails: string;
  durationMs: number;
  error?: string;
  screenshotPath?: string;
}

async function runBrowserAudit() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log('PRA PDF — FULL 56-SERVICE REAL BROWSER (CHROME) UI AUDIT');
  console.log('Company: A PRAVERSE Company');
  console.log('Browser: Google Chrome');
  console.log('Target URL: http://localhost:5173/');
  console.log('===============================================================\n');

  const screenshotsDir = path.resolve(process.cwd(), 'tests/e2e/screenshots');
  const downloadsDir = path.resolve(process.cwd(), 'tests/e2e/downloads');
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(downloadsDir, { recursive: true });

  console.log('Launching installed Google Chrome...');
  const browser: Browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context: BrowserContext = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });

  const page: Page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.warn(`[BROWSER_CONSOLE_WARN] ${msg.text()}`);
    }
  });

  // -------------------------------------------------------------
  // STEP 1: VERIFY HOMEPAGE & ALL TOOLS CATALOG
  // -------------------------------------------------------------
  console.log('\n--- STEP 1: Verifying Homepage & Catalog Navigation ---');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  const title = await page.title();
  console.log(`Homepage loaded. Title: "${title}"`);
  if (!title.includes('PRA PDF')) {
    throw new Error(`Unexpected page title: ${title}`);
  }

  // Navigate to All Tools
  console.log('Navigating to #/tools catalog...');
  await page.goto('http://localhost:5173/#/tools', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.tool-card, .catalog-card, a[href*="#/tools/"]', { timeout: 10000 });
  
  const toolLinks = await page.$$eval('a[href*="#/tools/"]', (els) => {
    const ids = new Set<string>();
    els.forEach((el) => {
      const href = el.getAttribute('href') || '';
      const match = href.match(/#\/tools\/([a-z0-9-]+)/);
      if (match && match[1]) ids.add(match[1]);
    });
    return Array.from(ids);
  });
  console.log(`Catalog verified: found ${toolLinks.length} distinct service routes.`);
  await page.screenshot({ path: path.join(screenshotsDir, 'catalog_overview.png') });

  // -------------------------------------------------------------
  // STEP 2: TEST UPLOAD LIMITS & EDGE REJECTIONS IN UI
  // -------------------------------------------------------------
  console.log('\n--- STEP 2: Testing 50 MB Upload Limits & Boundary in UI ---');
  await page.goto('http://localhost:5173/#/tools/rotate-pdf', { waitUntil: 'domcontentloaded' });
  
  const oversizedFile = path.resolve(process.cwd(), 'tests/e2e/fixtures/oversized-53mb.pdf');
  const fileInput = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  await fileInput.setInputFiles([oversizedFile]);

  // Check for State 7 file-too-large rejection banner
  const tooLargeVisible = await page.waitForSelector('#dz-too-large-card', { state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);

  const workspaceVisible = await page.isVisible('#tp-workspace-container');
  console.log(`Oversized (53 MB) upload test:`);
  console.log(`- #dz-too-large-card displayed: ${tooLargeVisible}`);
  console.log(`- #tp-workspace-container blocked (should be false): ${workspaceVisible}`);

  if (!tooLargeVisible || workspaceVisible) {
    throw new Error('Upload limit UI enforcement failed: 53 MB file was not rejected safely in the UI!');
  }
  await page.screenshot({ path: path.join(screenshotsDir, 'upload_limit_rejection_ui.png') });
  console.log('Upload limit UI rejection verified: 53 MB upload safely blocked with alert card.');

  // -------------------------------------------------------------
  // STEP 3: TEST ALL 56 SERVICES THROUGH THE REAL UI
  // -------------------------------------------------------------
  console.log('\n--- STEP 3: Testing All 56 Services Individually via UI ---');
  const auditResults: ServiceAuditResult[] = [];

  for (const service of ALL_56_SERVICES) {
    const t0 = Date.now();
    const result: ServiceAuditResult = {
      serviceNumber: service.serviceNumber,
      serviceId: service.serviceId,
      name: service.name,
      category: service.category,
      wave: service.wave,
      uiLoaded: false,
      fileSelected: false,
      processTriggered: false,
      resultRendered: false,
      downloadTriggered: false,
      downloadedBytes: 0,
      outputValidated: false,
      validationDetails: '',
      durationMs: 0,
    };

    try {
      // 1. Navigate to service URL
      await page.goto(`http://localhost:5173/#/tools/${service.serviceId}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#tp-dropzone-container', { state: 'visible', timeout: 10000 });
      result.uiLoaded = true;

      // 2. Select Input Fixture(s)
      const inputPath = path.resolve(process.cwd(), `tests/e2e/fixtures/${service.inputFixture}`);
      const filesToUpload = [inputPath];

      if (service.secondFixture) {
        const secondPath = path.resolve(process.cwd(), `tests/e2e/fixtures/${service.secondFixture}`);
        filesToUpload.push(secondPath);
      }

      const inputSelector = await page.waitForSelector('#dz-file-input', { state: 'attached' });
      await inputSelector.setInputFiles(filesToUpload);
      result.fileSelected = true;

      // Wait for workspace to open
      await page.waitForSelector('#tp-workspace-container', { state: 'visible', timeout: 10000 });

      // 3. Configure service-specific UI options where needed
      if (service.serviceId === 'delete-pdf-pages') {
        const delInput = await page.$('#opt-delete-pages');
        if (delInput) await delInput.fill('2');
      } else if (service.serviceId === 'split-pdf') {
        const rangeInput = await page.$('#opt-split-ranges');
        if (rangeInput) await rangeInput.fill('1, 2-3');
      } else if (service.serviceId === 'extract-pdf-pages') {
        const extInput = await page.$('#opt-extract-pages');
        if (extInput) await extInput.fill('1-2');
      } else if (service.serviceId === 'password-protect-pdf') {
        await page.fill('#opt-protect-pass', 'TestPass123');
        await page.fill('#opt-protect-pass-confirm', 'TestPass123');
      } else if (service.serviceId === 'unlock-pdf') {
        const unlockInput = await page.$('#opt-unlock-pass');
        if (unlockInput) await unlockInput.fill('');
      } else if (service.serviceId === 'watermark-pdf') {
        const wmInput = await page.$('#opt-watermark-text');
        if (wmInput) await wmInput.fill('PRA CONFIDENTIAL');
      } else if (service.serviceId === 'edit-pdf-metadata') {
        const titleInput = await page.$('#opt-meta-title');
        if (titleInput) await titleInput.fill('Updated Audit Title');
      } else if (service.serviceId === 'bates-numbering-pdf') {
        const prefixInput = await page.$('#opt-bates-prefix');
        if (prefixInput) await prefixInput.fill('LEGAL-');
      } else if (service.serviceId === 'header-footer-pdf') {
        const hInput = await page.$('#opt-header-text');
        if (hInput) await hInput.fill('AUDIT REPORT');
        const fInput = await page.$('#opt-footer-text');
        if (fInput) await fInput.fill('Page {page} of {total}');
      } else if (service.serviceId === 'redact-pdf') {
        const redactInput = await page.$('#opt-redact-terms, #opt-redact-text');
        if (redactInput) await redactInput.fill('Standard Test Document');
      } else if (service.serviceId === 'full-pdf-editing') {
        const studioInput = await page.$('#opt-studio-text');
        if (studioInput) await studioInput.fill('Studio Edited Text');
      }

      // 4. Click process button
      const processBtn = await page.waitForSelector('#tp-process-btn', { state: 'visible', timeout: 5000 });
      await processBtn.click();
      result.processTriggered = true;

      // 5. Wait for result card download button
      const downloadBtn = await page.waitForSelector('#rc-download-btn', { state: 'visible', timeout: 45000 });
      result.resultRendered = true;

      // Capture screenshot as evidence
      const screenshotFile = path.join(screenshotsDir, `service_${service.serviceNumber.toString().padStart(2, '0')}_${service.serviceId}.png`);
      await page.screenshot({ path: screenshotFile });
      result.screenshotPath = screenshotFile;

      // 6. Trigger and intercept download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        downloadBtn.click(),
      ]);
      result.downloadTriggered = true;

      const downloadedDest = path.join(downloadsDir, `${service.serviceId}_output${service.expectedExtension}`);
      await download.saveAs(downloadedDest);

      const downloadedBuffer = fs.readFileSync(downloadedDest);
      result.downloadedBytes = downloadedBuffer.length;

      // 7. Validate downloaded output buffer
      const validation = await service.validateOutput(downloadedBuffer);
      result.outputValidated = validation.valid;
      result.validationDetails = validation.details;

      result.durationMs = Date.now() - t0;
      console.log(`[PASS] Service #${service.serviceNumber.toString().padStart(2, '0')} ${service.name.padEnd(25)} | Size: ${result.downloadedBytes.toString().padStart(7)} B | Time: ${result.durationMs}ms | ${validation.details}`);
    } catch (err: any) {
      result.durationMs = Date.now() - t0;
      result.error = err.message || String(err);
      console.error(`[FAIL] Service #${service.serviceNumber.toString().padStart(2, '0')} ${service.name.padEnd(25)} | ERROR: ${result.error}`);
    }

    auditResults.push(result);
  }

  await browser.close();

  // -------------------------------------------------------------
  // STEP 4: RECONCILIATION & REPORT GENERATION
  // -------------------------------------------------------------
  const passedCount = auditResults.filter((r) => r.outputValidated && r.resultRendered).length;
  const failedCount = auditResults.length - passedCount;

  console.log('\n===============================================================');
  console.log('REAL BROWSER 56-SERVICE AUDIT COMPLETE');
  console.log(`Total Services Tested: ${auditResults.length}`);
  console.log(`Passed (Real UI + Download + Validated): ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total Execution Time: ${Math.round((Date.now() - startTime) / 1000)}s`);
  console.log('===============================================================\n');

  const reportPath = path.resolve(process.cwd(), 'docs/browser_audit_results.json');
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2), 'utf-8');
  console.log(`Saved detailed JSON audit report to ${reportPath}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runBrowserAudit().catch((err) => {
  console.error('Browser audit crashed:', err);
  process.exit(1);
});
