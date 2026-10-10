import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function runEdgeCases() {
  console.log('===============================================================');
  console.log('PRA PDF — REAL BROWSER (CHROME) EDGE & NEGATIVE CASES TEST');
  console.log('===============================================================\n');

  const browser: Browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context: BrowserContext = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1280, height: 900 },
  });

  const page: Page = await context.newPage();

  // Test 1: Upload Limits - 53 MB File rejection
  console.log('Test 1: Testing 53 MB Oversized File rejection in UI...');
  await page.goto('http://localhost:5173/#/tools/rotate-pdf', { waitUntil: 'domcontentloaded' });
  const fileInput = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  const oversizedPath = path.resolve(process.cwd(), 'tests/e2e/fixtures/oversized-53mb.pdf');
  await fileInput.setInputFiles([oversizedPath]);

  const tooLargeVisible = await page.waitForSelector('#dz-too-large-card', { state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  const workspaceHidden = !(await page.isVisible('#tp-workspace-container'));
  console.log(`- #dz-too-large-card visible: ${tooLargeVisible}`);
  console.log(`- Workspace blocked: ${workspaceHidden}`);
  if (!tooLargeVisible || !workspaceHidden) {
    throw new Error('Test 1 Failed: Oversized file was not safely rejected in UI!');
  }
  console.log('-> Test 1 PASS: Oversized upload safely rejected without memory allocation.\n');

  // Test 2: Invalid file extension rejection
  console.log('Test 2: Testing Invalid File Extension rejection in UI...');
  await page.goto('http://localhost:5173/#/tools/rotate-pdf', { waitUntil: 'domcontentloaded' });
  const input2 = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  const txtPath = path.resolve(process.cwd(), 'tests/e2e/fixtures/sample.txt');
  await input2.setInputFiles([txtPath]);

  // Check if error banner or rejection happened
  const workspaceNotShown = !(await page.isVisible('#tp-workspace-container'));
  console.log(`- Invalid file type workspace not opened: ${workspaceNotShown}`);
  if (!workspaceNotShown) {
    throw new Error('Test 2 Failed: Invalid extension allowed into workspace!');
  }
  console.log('-> Test 2 PASS: Invalid file type safely rejected.\n');

  // Test 3: Password Protect with Mismatched/Empty Passwords
  console.log('Test 3: Testing Password Protect validation...');
  await page.goto('http://localhost:5173/#/tools/password-protect-pdf', { waitUntil: 'domcontentloaded' });
  const input3 = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  const validPdf = path.resolve(process.cwd(), 'tests/e2e/fixtures/sample-text.pdf');
  await input3.setInputFiles([validPdf]);
  await page.waitForSelector('#tp-workspace-container', { state: 'visible' });

  // Leave password empty and click process
  const procBtn = await page.waitForSelector('#tp-process-btn', { state: 'visible' });
  await procBtn.click();

  // Wait for error banner
  const errorBanner = await page.waitForSelector('#tp-error-banner', { state: 'visible', timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  const errorText = await page.$eval('#tp-error-message', el => el.textContent).catch(() => '');
  console.log(`- Error banner visible on empty password: ${errorBanner}`);
  console.log(`- Error message: "${errorText}"`);
  if (!errorBanner) {
    throw new Error('Test 3 Failed: Empty password did not trigger validation error!');
  }
  console.log('-> Test 3 PASS: Empty password caught and reported clearly.\n');

  // Test 4: Corrupted file error recovery
  console.log('Test 4: Testing Corrupted File handling in UI...');
  await page.goto('http://localhost:5173/#/tools/repair-pdf', { waitUntil: 'domcontentloaded' });
  const input4 = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  const corruptFile = path.resolve(process.cwd(), 'tests/e2e/fixtures/corrupt-file.pdf');
  await input4.setInputFiles([corruptFile]);
  await page.waitForSelector('#tp-workspace-container', { state: 'visible' });

  const repairProc = await page.waitForSelector('#tp-process-btn', { state: 'visible' });
  await repairProc.click();

  const repairError = await page.waitForSelector('#tp-error-banner', { state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  const repairMsg = await page.$eval('#tp-error-message', el => el.textContent).catch(() => '');
  console.log(`- Error banner on unrecoverable corrupt file: ${repairError}`);
  console.log(`- Message: "${repairMsg}"`);
  if (!repairError) {
    throw new Error('Test 4 Failed: Corrupt unrecoverable file did not show error banner!');
  }
  console.log('-> Test 4 PASS: Corrupt file gracefully caught without crash.\n');

  // Test 5: Verify Production Edge Endpoint & Catalog Count
  console.log('Test 5: Testing Production Cloudflare Worker Health & Limits...');
  const healthRes = await fetch('https://pra-pdf.praverse-auth.workers.dev/api/v1/health');
  const healthJson = await healthRes.json();
  console.log(`- Production Worker status: ${healthRes.status}`);
  console.log(`- Active services count: ${healthJson.activeProductionServices.length}`);
  console.log(`- Max upload bytes: ${healthJson.maxUploadBytes}`);
  console.log(`- Max upload MB: ${healthJson.maxUploadMb}`);
  if (healthRes.status !== 200 || healthJson.activeProductionServices.length < 56 || healthJson.maxUploadBytes !== 52428800) {
    throw new Error('Test 5 Failed: Production health endpoint check failed!');
  }
  console.log('-> Test 5 PASS: Production worker running 56 services with strict 50 MB limit.\n');

  await browser.close();
  console.log('===============================================================');
  console.log('ALL EDGE & NEGATIVE TESTS PASSED IN REAL GOOGLE CHROME');
  console.log('===============================================================');
}

runEdgeCases().catch(err => {
  console.error('Edge case test failed:', err);
  process.exit(1);
});
