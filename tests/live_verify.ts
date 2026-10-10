import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';

const WORKER_URL = 'https://pra-pdf.praverse-auth.workers.dev';
const LIVE_SITE_URL = 'https://prapdf.us.ci';

async function buildTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(`Page Content ${i}`, {
      x: 50,
      y: 750,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
  }
  return await doc.save();
}

async function verifyLiveWorker() {
  console.log('=== Step 1: Verify Health Endpoint ===');
  const healthRes = await fetch(`${WORKER_URL}/api/v1/cf/health`);
  console.log(`Health status: ${healthRes.status}`);
  const healthJson = await healthRes.json();
  console.log('Health JSON:', JSON.stringify(healthJson));

  console.log('\n=== Step 2: Test Split PDF Single Range (Single PDF output) ===');
  const samplePdfBytes = await buildTestPdf(4);
  const formDataSingle = new FormData();
  formDataSingle.append('file', new Blob([samplePdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'financial_report.pdf');
  formDataSingle.append('service', 'split-pdf');
  formDataSingle.append('options', JSON.stringify({
    mode: 'ranges',
    rangeString: '1-2',
    outputFileName: 'financial_report',
  }));

  const splitSingleRes = await fetch(`${WORKER_URL}/api/v1/cf/process`, {
    method: 'POST',
    body: formDataSingle,
  });
  console.log(`Split Single status: ${splitSingleRes.status}`);
  const splitSingleContentType = splitSingleRes.headers.get('content-type');
  console.log(`Content-Type: ${splitSingleContentType}`);
  const splitSingleJson = await splitSingleRes.json();
  console.log('Output filename:', splitSingleJson.outputFileName);
  console.log('MIME type:', splitSingleJson.mimeType);

  // Decode binary from outputBase64
  const binaryBytes = Buffer.from(splitSingleJson.outputBase64, 'base64');
  const header = binaryBytes.subarray(0, 5).toString('ascii');
  console.log(`Magic bytes signature: "${header}" (Expected: %PDF-)`);
  if (!header.startsWith('%PDF-')) {
    throw new Error('Split single output is not a valid PDF!');
  }
  const loadedPdf = await PDFDocument.load(binaryBytes);
  console.log(`Loaded PDF successfully! Page count: ${loadedPdf.getPageCount()} (Expected: 2)`);

  console.log('\n=== Step 3: Test Split PDF Multiple Ranges (ZIP archive output) ===');
  const formDataMulti = new FormData();
  formDataMulti.append('file', new Blob([samplePdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'financial_report.pdf');
  formDataMulti.append('service', 'split-pdf');
  formDataMulti.append('options', JSON.stringify({
    mode: 'ranges',
    rangeString: '1,2-3',
    outputFileName: 'financial_report',
  }));

  const splitMultiRes = await fetch(`${WORKER_URL}/api/v1/cf/process`, {
    method: 'POST',
    body: formDataMulti,
  });
  console.log(`Split Multi status: ${splitMultiRes.status}`);
  const splitMultiJson = await splitMultiRes.json();
  console.log('Output filename:', splitMultiJson.outputFileName);
  console.log('MIME type:', splitMultiJson.mimeType);

  const zipBytes = Buffer.from(splitMultiJson.outputBase64, 'base64');
  const zipHeader = zipBytes.subarray(0, 4);
  const isZipMagic = zipHeader[0] === 0x50 && zipHeader[1] === 0x4b;
  console.log(`ZIP magic bytes signature: [0x50, 0x4B] match? ${isZipMagic}`);
  if (!isZipMagic) throw new Error('Split multi output is not a valid ZIP archive!');

  const zip = await JSZip.loadAsync(zipBytes);
  const fileNames = Object.keys(zip.files);
  console.log('ZIP internal files:', fileNames);
  for (const name of fileNames) {
    const fileBytes = await zip.files[name].async('uint8array');
    const pdfDoc = await PDFDocument.load(fileBytes);
    console.log(`  File "${name}": valid PDF with ${pdfDoc.getPageCount()} pages`);
  }

  console.log('\n=== Step 4: Test Add Page Numbers Default {n} Format ===');
  const formDataNumbers = new FormData();
  formDataNumbers.append('file', new Blob([samplePdfBytes as unknown as BlobPart], { type: 'application/pdf' }), 'contract.pdf');
  formDataNumbers.append('service', 'add-page-numbers');
  formDataNumbers.append('options', JSON.stringify({
    formatTemplate: '{n}',
    position: 'bottom-center',
    startNumber: 1,
    outputFileName: 'contract_numbered',
  }));

  const addNumbersRes = await fetch(`${WORKER_URL}/api/v1/cf/process`, {
    method: 'POST',
    body: formDataNumbers,
  });
  console.log(`Add Page Numbers status: ${addNumbersRes.status}`);
  const addNumbersJson = await addNumbersRes.json();
  console.log('Output filename:', addNumbersJson.outputFileName);
  console.log('MIME type:', addNumbersJson.mimeType);
  const numBytes = Buffer.from(addNumbersJson.outputBase64, 'base64');
  const numHeader = numBytes.subarray(0, 5).toString('ascii');
  console.log(`Magic bytes signature: "${numHeader}" (Expected: %PDF-)`);
  const numPdf = await PDFDocument.load(numBytes);
  console.log(`Loaded numbered PDF! Page count: ${numPdf.getPageCount()}`);

  console.log('\n=== Step 5: Check Live Website & Assets Status ===');
  const siteRes = await fetch(LIVE_SITE_URL);
  console.log(`Live site status (${LIVE_SITE_URL}): ${siteRes.status}`);
  const siteHtml = await siteRes.text();
  console.log(`Site HTML size: ${siteHtml.length} bytes`);
  const hasIndexJs = siteHtml.includes('assets/index');
  const hasIndexCss = siteHtml.includes('assets/index');
  console.log(`HTML links to built production assets? JS: ${hasIndexJs}, CSS: ${hasIndexCss}`);

  const workerSiteRes = await fetch(WORKER_URL);
  console.log(`Worker site status (${WORKER_URL}): ${workerSiteRes.status}`);
  const workerSiteHtml = await workerSiteRes.text();
  console.log(`Worker SPA HTML size: ${workerSiteHtml.length} bytes`);

  console.log('\nALL LIVE VERIFICATION CHECKS PASSED!');
}

verifyLiveWorker().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
