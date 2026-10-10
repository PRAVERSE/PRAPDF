import { PDFDocument, StandardFonts, rgb, PDFName } from 'pdf-lib';

const WORKER_URL = 'https://pra-pdf.praverse-auth.workers.dev';

async function buildTestPdf(pageCount: number = 2): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([600, 800]);
    page.drawText(`PRA PDF Test Page ${i}`, {
      x: 50,
      y: 720,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  }
  return await doc.save();
}

async function buildAnnotatedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([600, 800]);
  page.drawText('Sample Annotated Document', { x: 50, y: 720, size: 18, font });

  const annotDict = doc.context.obj({
    Type: 'Annot',
    Subtype: 'Text',
    Rect: [50, 650, 100, 680],
    Contents: 'PRA Annotation Note',
  });
  const annotRef = doc.context.register(annotDict);
  page.node.set(PDFName.of('Annots'), doc.context.obj([annotRef]));

  return await doc.save();
}

async function testLiveWave1() {
  console.log('========================================================');
  console.log('PRA PDF — Live Production Verification (Wave 1 Services)');
  console.log('Target Worker:', WORKER_URL);
  console.log('========================================================\n');

  // Step 1: Verify Health Endpoint
  console.log('--- Step 1: Health Endpoint Check ---');
  const healthRes = await fetch(`${WORKER_URL}/api/v1/cf/health`);
  console.log(`Status: ${healthRes.status}`);
  const healthJson = await healthRes.json();
  console.log('Active Production Services Count:', healthJson.activeProductionServices?.length);
  console.log('Active Services List:', healthJson.activeProductionServices);

  const wave1Required = [
    'delete-pdf-annotations',
    'flip-pdf',
    'split-pdf-in-half',
    'alternate-mix-pdf',
    'n-up-pdf',
  ];
  for (const svc of wave1Required) {
    if (!healthJson.activeProductionServices.includes(svc)) {
      throw new Error(`Service ${svc} not reported in live health active services!`);
    }
  }
  console.log('All Wave 1 services are registered and active on production worker!\n');

  // Step 2: Test delete-pdf-annotations live
  console.log('--- Step 2: Test delete-pdf-annotations Live ---');
  const annotPdf = await buildAnnotatedPdf();
  const fdDel = new FormData();
  fdDel.append('service', 'delete-pdf-annotations');
  fdDel.append('file', new Blob([annotPdf], { type: 'application/pdf' }), 'annotated.pdf');

  const resDel = await fetch(`${WORKER_URL}/api/v1/cf/process`, { method: 'POST', body: fdDel });
  console.log(`Status: ${resDel.status}`);
  const jsonDel = await resDel.json();
  const bufDel = Buffer.from(jsonDel.outputBase64, 'base64');
  const sigDel = bufDel.subarray(0, 5).toString('ascii');
  console.log(`Output: ${jsonDel.outputFileName}, MIME: ${jsonDel.mimeType}, Signature: ${sigDel}`);
  if (!sigDel.startsWith('%PDF-')) throw new Error('delete-pdf-annotations output is not a valid PDF!');
  const loadedDel = await PDFDocument.load(bufDel);
  const annotsRemain = loadedDel.getPage(0).node.lookup(PDFName.of('Annots'));
  console.log(`Annotations remaining on page 0: ${annotsRemain === undefined ? 'NONE (Successfully deleted)' : 'PRESENT (Error)'}`);
  if (annotsRemain !== undefined) throw new Error('Annotations were not stripped!');

  // Step 3: Test flip-pdf live
  console.log('\n--- Step 3: Test flip-pdf Live ---');
  const testPdf = await buildTestPdf(2);
  const fdFlip = new FormData();
  fdFlip.append('service', 'flip-pdf');
  fdFlip.append('file', new Blob([testPdf], { type: 'application/pdf' }), 'to_flip.pdf');
  fdFlip.append('options', JSON.stringify({ direction: 'horizontal' }));

  const resFlip = await fetch(`${WORKER_URL}/api/v1/cf/process`, { method: 'POST', body: fdFlip });
  console.log(`Status: ${resFlip.status}`);
  const jsonFlip = await resFlip.json();
  const bufFlip = Buffer.from(jsonFlip.outputBase64, 'base64');
  const sigFlip = bufFlip.subarray(0, 5).toString('ascii');
  console.log(`Output: ${jsonFlip.outputFileName}, MIME: ${jsonFlip.mimeType}, Signature: ${sigFlip}`);
  if (!sigFlip.startsWith('%PDF-')) throw new Error('flip-pdf output is not a valid PDF!');
  const loadedFlip = await PDFDocument.load(bufFlip);
  console.log(`Pages: ${loadedFlip.getPageCount()}`);
  if (loadedFlip.getPageCount() !== 2) throw new Error('flip-pdf page count mismatch!');

  // Step 4: Test split-pdf-in-half live
  console.log('\n--- Step 4: Test split-pdf-in-half Live ---');
  const fdHalf = new FormData();
  fdHalf.append('service', 'split-pdf-in-half');
  fdHalf.append('file', new Blob([testPdf], { type: 'application/pdf' }), 'spreads.pdf');
  fdHalf.append('options', JSON.stringify({ splitDirection: 'vertical' }));

  const resHalf = await fetch(`${WORKER_URL}/api/v1/cf/process`, { method: 'POST', body: fdHalf });
  console.log(`Status: ${resHalf.status}`);
  const jsonHalf = await resHalf.json();
  const bufHalf = Buffer.from(jsonHalf.outputBase64, 'base64');
  const sigHalf = bufHalf.subarray(0, 5).toString('ascii');
  console.log(`Output: ${jsonHalf.outputFileName}, MIME: ${jsonHalf.mimeType}, Signature: ${sigHalf}`);
  if (!sigHalf.startsWith('%PDF-')) throw new Error('split-pdf-in-half output is not a valid PDF!');
  const loadedHalf = await PDFDocument.load(bufHalf);
  console.log(`Pages: ${loadedHalf.getPageCount()} (Expected: 4, halved width: ${loadedHalf.getPage(0).getWidth()} pt)`);
  if (loadedHalf.getPageCount() !== 4) throw new Error('split-pdf-in-half page count was not doubled!');

  // Step 5: Test alternate-mix-pdf live
  console.log('\n--- Step 5: Test alternate-mix-pdf Live ---');
  const docA = await buildTestPdf(2);
  const docB = await buildTestPdf(2);
  const fdMix = new FormData();
  fdMix.append('service', 'alternate-mix-pdf');
  fdMix.append('files', new Blob([docA], { type: 'application/pdf' }), 'docA.pdf');
  fdMix.append('files', new Blob([docB], { type: 'application/pdf' }), 'docB.pdf');
  fdMix.append('options', JSON.stringify({ reverseSecondDocument: false, step: 1 }));

  const resMix = await fetch(`${WORKER_URL}/api/v1/cf/process`, { method: 'POST', body: fdMix });
  console.log(`Status: ${resMix.status}`);
  const jsonMix = await resMix.json();
  const bufMix = Buffer.from(jsonMix.outputBase64, 'base64');
  const sigMix = bufMix.subarray(0, 5).toString('ascii');
  console.log(`Output: ${jsonMix.outputFileName}, MIME: ${jsonMix.mimeType}, Signature: ${sigMix}`);
  if (!sigMix.startsWith('%PDF-')) throw new Error('alternate-mix-pdf output is not a valid PDF!');
  const loadedMix = await PDFDocument.load(bufMix);
  console.log(`Pages: ${loadedMix.getPageCount()} (Expected: 4 interleaved)`);
  if (loadedMix.getPageCount() !== 4) throw new Error('alternate-mix-pdf page count mismatch!');

  // Step 6: Test n-up-pdf live
  console.log('\n--- Step 6: Test n-up-pdf Live ---');
  const doc4Pages = await buildTestPdf(4);
  const fdNup = new FormData();
  fdNup.append('service', 'n-up-pdf');
  fdNup.append('file', new Blob([doc4Pages], { type: 'application/pdf' }), 'doc4.pdf');
  fdNup.append('options', JSON.stringify({ pagesPerSheet: 2, sheetSize: 'A4' }));

  const resNup = await fetch(`${WORKER_URL}/api/v1/cf/process`, { method: 'POST', body: fdNup });
  console.log(`Status: ${resNup.status}`);
  const jsonNup = await resNup.json();
  const bufNup = Buffer.from(jsonNup.outputBase64, 'base64');
  const sigNup = bufNup.subarray(0, 5).toString('ascii');
  console.log(`Output: ${jsonNup.outputFileName}, MIME: ${jsonNup.mimeType}, Signature: ${sigNup}`);
  if (!sigNup.startsWith('%PDF-')) throw new Error('n-up-pdf output is not a valid PDF!');
  const loadedNup = await PDFDocument.load(bufNup);
  console.log(`Resulting Sheets: ${loadedNup.getPageCount()} (Expected: 2 sheets for 4 pages in 2-up)`);
  if (loadedNup.getPageCount() !== 2) throw new Error('n-up-pdf sheet count mismatch!');

  console.log('\n========================================================');
  console.log('ALL WAVE 1 SERVICES VERIFIED LIVE IN PRODUCTION!');
  console.log('========================================================');
}

testLiveWave1().catch((err) => {
  console.error('LIVE VERIFICATION ERROR:', err);
  process.exit(1);
});
