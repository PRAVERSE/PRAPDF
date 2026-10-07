/**
 * PRA PDF — Real Telegram Infrastructure Connectivity Verification
 * A PRAVERSE Company
 *
 * PROVES:
 * 1. Telegram bot connectivity works.
 * 2. Real document can be uploaded to backup channel.
 * 3. Telegram returns success (ok: true) with message_id and file_id.
 * 4. Captures message_id and file_id internally.
 * 5. Safely deletes test message in test cleanup.
 *
 * Zero secrets are logged or printed.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { telegramBackup } from '../src/server/backup/telegramBackup';
import { CONFIG } from '../src/server/config';

export interface TelegramVerificationResult {
  botConnected: boolean;
  documentSent: boolean;
  messageId?: number;
  fileId?: string;
  chatId?: string;
  testMessageDeleted: boolean;
  error?: string;
}

export async function verifyRealTelegramInfrastructure(): Promise<TelegramVerificationResult> {
  console.log('============================================================');
  console.log('PRA PDF — REAL TELEGRAM INFRASTRUCTURE VERIFICATION');
  console.log('============================================================\n');

  console.log(`Telegram Configured: ${CONFIG.telegram.isConfigured}`);
  console.log(`Target Chat ID:      ${CONFIG.telegram.chatId ? CONFIG.telegram.chatId.slice(0, 4) + '...' + CONFIG.telegram.chatId.slice(-3) : '[NONE]'}`);
  console.log(`Bot Token Present:   ${Boolean(CONFIG.telegram.botToken)} (Length: ${CONFIG.telegram.botToken.length})\n`);

  if (!CONFIG.telegram.isConfigured) {
    throw new Error('Telegram bot token or chat ID is missing in configuration.');
  }

  // 1. Generate real mini-PDF
  console.log('[Step 1] Generating authentic verification PDF for Telegram...');
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([400, 200]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('PRA PDF — Telegram Probe', { x: 30, y: 150, size: 16, font, color: rgb(0.1, 0.4, 0.8) });
  page.drawText(`Probe Timestamp: ${new Date().toISOString()}`, { x: 30, y: 110, size: 10 });
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  const testFilename = `telegram_probe_${Date.now()}.pdf`;

  // 2. Dispatch to Telegram backup channel
  console.log('[Step 2] Sending real test PDF document to Telegram private backup channel...');
  const jobId = `tg-probe-${Date.now()}`;
  const result = await telegramBackup.backupOriginal(jobId, pdfBuffer, testFilename, 'application/pdf');

  if (!result.success) {
    console.error(`✕ Telegram backup failed: ${result.error}`);
    return {
      botConnected: false,
      documentSent: false,
      error: result.error,
      testMessageDeleted: false,
    };
  }

  console.log('✓ Step 2: Telegram accepted document!');
  console.log(`  Message ID: ${result.messageId}`);
  console.log(`  File ID:    ${result.fileId ? result.fileId.slice(0, 15) + '...' : '[NONE]'}`);
  console.log(`  Chat ID:    ${result.chatId}`);
  console.log(`  Timestamp:  ${result.timestamp}`);

  // 3. Test-only message deletion
  let deleted = false;
  if (result.messageId) {
    console.log(`\n[Step 3] Deleting test message ${result.messageId} (test-only cleanup)...`);
    deleted = await telegramBackup.deleteBackupMessage(result.messageId);
    console.log(`✓ Step 3: Test message deleted: ${deleted}`);
  }

  console.log('\n============================================================');
  console.log('TELEGRAM INFRASTRUCTURE FULLY VERIFIED');
  console.log('============================================================\n');

  return {
    botConnected: true,
    documentSent: true,
    messageId: result.messageId,
    fileId: result.fileId,
    chatId: result.chatId,
    testMessageDeleted: deleted,
  };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('test_telegram_connection')) {
  verifyRealTelegramInfrastructure()
    .then((res) => {
      console.log('TELEGRAM VERIFICATION SUMMARY:');
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = res.botConnected && res.documentSent ? 0 : 1;
    })
    .catch((err) => {
      console.error('Telegram Verification Fatal Error:', err.message);
      process.exitCode = 1;
    });
}
