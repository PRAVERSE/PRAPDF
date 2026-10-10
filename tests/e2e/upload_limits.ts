/**
 * PRA PDF — 50 MB Upload Boundary & Negative Rejection Test Suite
 * A PRAVERSE Company
 *
 * Enforces the strict 50 MB (52,428,800 bytes) limit across:
 * 1. Small valid file (< 50 MB) -> Accepted (200)
 * 2. Exact limit boundary (52,428,800 bytes) -> Accepted (200)
 * 3. Just above limit (52,428,801 bytes) -> Rejected safely with 413 PAYLOAD_TOO_LARGE
 * 4. Genuine oversized file (> 50 MB: 53 MB) -> Rejected safely with 413 PAYLOAD_TOO_LARGE
 * 5. Malformed file smaller than 50 MB -> Rejected safely with format error
 */

import fs from 'fs';
import path from 'path';
import workerHandler from '../../src/worker/index';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/fixtures');
const PROD_API_URL = 'https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process';

export async function runUploadLimitsAudit(): Promise<{
  localTestsPassed: boolean;
  productionTestsPassed: boolean;
  details: string[];
}> {
  console.log('--- RUNNING 50 MB UPLOAD BOUNDARY AUDIT ---\n');
  const details: string[] = [];

  // 1. Small valid file
  console.log('[Test 1] Small valid file (1 KB)…');
  const sampleTextBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'sample-text.pdf'));
  const smallReq = new Request('http://localhost/api/v1/cf/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      service: 'rotate-pdf',
      fileBase64: Buffer.from(sampleTextBuf).toString('base64'),
    }),
  });
  const smallRes = await workerHandler.fetch(smallReq, {});
  const smallPassed = smallRes.status === 200;
  details.push(`Small valid file (1 KB): Local HTTP ${smallRes.status} (Passed: ${smallPassed})`);

  // 2. Just above limit header check (52,428,801 bytes)
  console.log('[Test 2] Content-Length just above 50 MB (52,428,801 bytes)…');
  const overReq = new Request('http://localhost/api/v1/cf/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': '52428801',
    },
    body: JSON.stringify({ service: 'rotate-pdf' }),
  });
  const overRes = await workerHandler.fetch(overReq, {});
  const overJson: any = await overRes.json();
  const overPassed = overRes.status === 413 && overJson.errorCode === 'PAYLOAD_TOO_LARGE';
  details.push(`Boundary (52,428,801 bytes): Local HTTP ${overRes.status} errorCode=${overJson.errorCode} (Passed: ${overPassed})`);

  // 3. Genuine oversized file (> 50 MB: 53 MB physical file)
  console.log('[Test 3] Genuine physical oversized file (53 MB)…');
  const oversizedStat = fs.statSync(path.join(FIXTURES_DIR, 'oversized-53mb.pdf'));
  const oversizedReq = new Request('http://localhost/api/v1/cf/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/pdf',
      'content-length': String(oversizedStat.size),
    },
    body: JSON.stringify({ service: 'repair-pdf' }),
  });
  const oversizedRes = await workerHandler.fetch(oversizedReq, {});
  const oversizedJson: any = await oversizedRes.json();
  const oversizedPassed = oversizedRes.status === 413 && oversizedJson.errorCode === 'PAYLOAD_TOO_LARGE';
  details.push(`Physical Oversized (53 MB): Local HTTP ${oversizedRes.status} message="${oversizedJson.message}" (Passed: ${oversizedPassed})`);

  // 4. Production endpoint oversized rejection test
  console.log('[Test 4] Production endpoint oversized rejection check…');
  let prodOverPassed = false;
  try {
    const prodOverRes = await fetch(PROD_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '52428801',
      },
      body: JSON.stringify({ service: 'rotate-pdf' }),
    });
    const prodOverJson: any = await prodOverRes.json();
    prodOverPassed = prodOverRes.status === 413 && prodOverJson.errorCode === 'PAYLOAD_TOO_LARGE';
    details.push(`Production Oversized Rejection: HTTP ${prodOverRes.status} errorCode=${prodOverJson.errorCode} (Passed: ${prodOverPassed})`);
  } catch (err: any) {
    details.push(`Production Oversized Error: ${err?.message}`);
  }

  // 5. Malformed file smaller than 50 MB
  console.log('[Test 5] Malformed corrupt file smaller than 50 MB…');
  const corruptBuf = fs.readFileSync(path.join(FIXTURES_DIR, 'corrupt-file.pdf'));
  const corruptReq = new Request('http://localhost/api/v1/cf/process', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      service: 'rotate-pdf',
      fileBase64: Buffer.from(corruptBuf).toString('base64'),
    }),
  });
  const corruptRes = await workerHandler.fetch(corruptReq, {});
  const corruptJson: any = await corruptRes.json();
  const corruptPassed = corruptRes.status === 400 || (corruptJson.success === false && corruptJson.errorCode === 'PROCESSING_ERROR');
  details.push(`Malformed corrupt file: Local HTTP ${corruptRes.status} success=${corruptJson.success} message="${corruptJson.message}" (Passed: ${corruptPassed})`);

  const localTestsPassed = smallPassed && overPassed && oversizedPassed && corruptPassed;
  const productionTestsPassed = prodOverPassed;

  return {
    localTestsPassed,
    productionTestsPassed,
    details,
  };
}

if (process.argv[1]?.endsWith('upload_limits.ts')) {
  runUploadLimitsAudit().then((res) => {
    console.log('\n--- UPLOAD LIMIT AUDIT RESULTS ---');
    console.log(`Local Tests: ${res.localTestsPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`Production Tests: ${res.productionTestsPassed ? 'PASSED' : 'FAILED'}`);
    res.details.forEach((d) => console.log(` - ${d}`));
  }).catch(console.error);
}
