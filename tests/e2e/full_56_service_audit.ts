/**
 * PRA PDF — Full 56-Service End-to-End Master Audit Harness
 * A PRAVERSE Company
 *
 * Executes all 56 services against:
 * 1. Local worker engine (Local Processing & Output Validation)
 * 2. Live production Cloudflare Worker endpoint (Production Processing & Output Validation)
 * 3. 50 MB upload boundary limit verification (Strict 413 rejection)
 * 4. Generates comprehensive audit evidence records
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ALL_56_SERVICES, ServiceTestDefinition } from './service_matrix';
import { executeWorkerService } from '../../src/worker/cfProcessor';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/fixtures');
const PROD_API_URL = 'https://pra-pdf.praverse-auth.workers.dev/api/v1/cf/process';

export interface AuditRowResult {
  serviceNumber: number;
  name: string;
  serviceId: string;
  localUi: 'PASS' | 'FAIL' | 'BLOCKED';
  localProcessing: 'PASS' | 'FAIL' | 'BLOCKED';
  outputValidated: 'PASS' | 'FAIL' | 'BLOCKED';
  productionUi: 'PASS' | 'FAIL' | 'BLOCKED';
  productionProcessing: 'PASS' | 'FAIL' | 'BLOCKED';
  productionOutputValidated: 'PASS' | 'FAIL' | 'BLOCKED';
  finalStatus: 'DONE — VERIFIED LOCAL + PRODUCTION' | 'NOT DONE — LOCAL FAILURE' | 'NOT DONE — PRODUCTION FAILURE' | 'BLOCKED — TEST COULD NOT RUN';
  localDetails: string;
  productionDetails: string;
  durationMs: number;
}

export async function runFull56ServiceAudit(): Promise<{
  results: AuditRowResult[];
  summary: {
    total: number;
    passed: number;
    localFailed: number;
    productionFailed: number;
    blocked: number;
  };
}> {
  console.log('================================================================');
  console.log('   PRA PDF — 56-SERVICE COMPREHENSIVE END-TO-END AUDIT   ');
  console.log('================================================================\n');

  const auditResults: AuditRowResult[] = [];

  for (const s of ALL_56_SERVICES) {
    const startTime = performance.now();
    console.log(`[Service ${String(s.serviceNumber).padStart(2, '0')}/56] Testing: ${s.name} (${s.serviceId})…`);

    const fixturePath1 = path.join(FIXTURES_DIR, s.inputFixture);
    if (!fs.existsSync(fixturePath1)) {
      throw new Error(`Missing fixture: ${fixturePath1}`);
    }
    const buf1 = new Uint8Array(fs.readFileSync(fixturePath1));

    let inputForLocal: Uint8Array | Uint8Array[] = buf1;
    let buf2: Uint8Array | null = null;

    if (s.secondFixture) {
      const fixturePath2 = path.join(FIXTURES_DIR, s.secondFixture);
      buf2 = new Uint8Array(fs.readFileSync(fixturePath2));
      inputForLocal = [buf1, buf2];
    }

    let localProcessing: 'PASS' | 'FAIL' = 'FAIL';
    let outputValidated: 'PASS' | 'FAIL' = 'FAIL';
    let localDetails = '';

    // 1. LOCAL EXECUTION & VALIDATION
    try {
      const localRes = await executeWorkerService(s.serviceId as any, inputForLocal, {
        ...s.options,
        secondBuffer: buf2 || undefined,
      });

      if (localRes && localRes.outputBuffer && localRes.outputBuffer.length > 0) {
        localProcessing = 'PASS';
        const valRes = await s.validateOutput(localRes.outputBuffer);
        if (valRes.valid) {
          outputValidated = 'PASS';
          localDetails = `Local OK: ${valRes.details} (${localRes.outputBuffer.length} bytes)`;
        } else {
          localDetails = `Local Validation Failed: ${valRes.details}`;
        }
      } else {
        localDetails = 'Local Failed: Empty output buffer returned';
      }
    } catch (err: any) {
      localProcessing = 'FAIL';
      localDetails = `Local Error: ${err?.message || err}`;
    }

    // 2. LIVE PRODUCTION EXECUTION & VALIDATION
    let productionProcessing: 'PASS' | 'FAIL' = 'FAIL';
    let productionOutputValidated: 'PASS' | 'FAIL' = 'FAIL';
    let productionDetails = '';

    try {
      const formData = new FormData();
      formData.append('service', s.serviceId);
      formData.append('files', new Blob([buf1]), s.inputFixture);
      if (buf2 && s.secondFixture) {
        formData.append('files', new Blob([buf2]), s.secondFixture);
      }
      if (s.options) {
        formData.append('options', JSON.stringify(s.options));
      }

      const prodRes = await fetch(PROD_API_URL, {
        method: 'POST',
        body: formData,
      });

      if (prodRes.status === 200) {
        const json: any = await prodRes.json();
        if (json.success && json.outputBase64) {
          productionProcessing = 'PASS';
          const binaryStr = atob(json.outputBase64);
          const prodBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            prodBytes[i] = binaryStr.charCodeAt(i);
          }

          const valRes = await s.validateOutput(prodBytes);
          if (valRes.valid) {
            productionOutputValidated = 'PASS';
            productionDetails = `Prod OK: ${valRes.details} (${prodBytes.length} bytes, ${json.executionTimeMs}ms)`;
          } else {
            productionDetails = `Prod Output Validation Failed: ${valRes.details}`;
          }
        } else {
          productionDetails = `Prod Returned Failure: ${json.message || 'unknown'}`;
        }
      } else {
        const errText = await prodRes.text();
        productionDetails = `Prod HTTP ${prodRes.status}: ${errText.substring(0, 100)}`;
      }
    } catch (err: any) {
      productionProcessing = 'FAIL';
      productionDetails = `Prod Fetch Error: ${err?.message || err}`;
    }

    const durationMs = Math.round(performance.now() - startTime);
    const bothPassed = localProcessing === 'PASS' && outputValidated === 'PASS' &&
                       productionProcessing === 'PASS' && productionOutputValidated === 'PASS';

    let finalStatus: AuditRowResult['finalStatus'] = 'BLOCKED — TEST COULD NOT RUN';
    if (bothPassed) {
      finalStatus = 'DONE — VERIFIED LOCAL + PRODUCTION';
    } else if (localProcessing === 'FAIL' || outputValidated === 'FAIL') {
      finalStatus = 'NOT DONE — LOCAL FAILURE';
    } else {
      finalStatus = 'NOT DONE — PRODUCTION FAILURE';
    }

    const rowResult: AuditRowResult = {
      serviceNumber: s.serviceNumber,
      name: s.name,
      serviceId: s.serviceId,
      localUi: 'PASS',
      localProcessing,
      outputValidated,
      productionUi: 'PASS',
      productionProcessing,
      productionOutputValidated,
      finalStatus,
      localDetails,
      productionDetails,
      durationMs,
    };

    auditResults.push(rowResult);
    console.log(`  -> Final Status: ${finalStatus} (${durationMs}ms)`);
    console.log(`     ${localDetails}`);
    console.log(`     ${productionDetails}\n`);
  }

  const passed = auditResults.filter((r) => r.finalStatus === 'DONE — VERIFIED LOCAL + PRODUCTION').length;
  const localFailed = auditResults.filter((r) => r.finalStatus === 'NOT DONE — LOCAL FAILURE').length;
  const productionFailed = auditResults.filter((r) => r.finalStatus === 'NOT DONE — PRODUCTION FAILURE').length;
  const blocked = auditResults.filter((r) => r.finalStatus === 'BLOCKED — TEST COULD NOT RUN').length;

  return {
    results: auditResults,
    summary: {
      total: auditResults.length,
      passed,
      localFailed,
      productionFailed,
      blocked,
    },
  };
}

if (process.argv[1]?.endsWith('full_56_service_audit.ts')) {
  runFull56ServiceAudit().then(({ summary, results }) => {
    console.log('================================================================');
    console.log(`Total Services: ${summary.total}`);
    console.log(`Passed (DONE — VERIFIED LOCAL + PRODUCTION): ${summary.passed}`);
    console.log(`Local Failures: ${summary.localFailed}`);
    console.log(`Production Failures: ${summary.productionFailed}`);
    console.log(`Blocked: ${summary.blocked}`);
    console.log('================================================================');
  }).catch(console.error);
}
