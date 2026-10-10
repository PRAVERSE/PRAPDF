import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function testSingle() {
  console.log('Launching Chrome...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    acceptDownloads: true,
  });

  const page = await context.newPage();
  
  // Listen for console logs
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER_ERROR:', err));

  const fixturePath = path.resolve(process.cwd(), 'tests/e2e/fixtures/sample.jpg');
  console.log('Navigating to http://localhost:5173/#/tools/jpg-to-pdf ...');
  await page.goto('http://localhost:5173/#/tools/jpg-to-pdf', { waitUntil: 'domcontentloaded' });

  console.log('Waiting for #dz-file-input ...');
  const fileInput = await page.waitForSelector('#dz-file-input', { state: 'attached' });
  await fileInput.setInputFiles([fixturePath]);

  console.log('File selected. Waiting for #tp-process-btn ...');
  const processBtn = await page.waitForSelector('#tp-process-btn', { state: 'visible' });
  await processBtn.click();

  console.log('Process button clicked. Waiting for #rc-download-btn ...');
  const downloadBtn = await page.waitForSelector('#rc-download-btn', { state: 'visible', timeout: 30000 });

  console.log('Result card visible! Clicking download button...');
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    downloadBtn.click(),
  ]);

  const downloadPath = await download.path();
  console.log('Downloaded to:', downloadPath, 'suggestedFilename:', download.suggestedFilename());

  const downloadedBytes = fs.readFileSync(downloadPath!);
  console.log('Downloaded file size:', downloadedBytes.length, 'bytes');

  const pdfDoc = await PDFDocument.load(downloadedBytes);
  console.log('PDF parsed successfully! Page count:', pdfDoc.getPageCount());

  await browser.close();
  console.log('Test PASSED cleanly!');
}

testSingle().catch(err => {
  console.error('Test FAILED:', err);
  process.exit(1);
});
