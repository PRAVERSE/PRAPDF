/**
 * PRA PDF — Reproducible Test Fixture Library Generator
 * A PRAVERSE Company
 *
 * Generates genuine, parseable test document fixtures and writes metadata manifest.json.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const FIXTURES_DIR = path.resolve(process.cwd(), 'tests/e2e/fixtures');

if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

interface FixtureEntry {
  filename: string;
  sizeBytes: number;
  sha256: string;
  expectedProperties: Record<string, any>;
  purpose: string;
}

const manifest: Record<string, FixtureEntry> = {};

function recordFixture(filename: string, buffer: Buffer | Uint8Array, expected: Record<string, any>, purpose: string) {
  const filePath = path.join(FIXTURES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  manifest[filename] = {
    filename,
    sizeBytes: buffer.length,
    sha256: hash,
    expectedProperties: expected,
    purpose,
  };
  console.log(`[Fixture] Created ${filename} (${buffer.length} bytes, SHA: ${hash.substring(0, 10)}…)`);
}

async function generateAllFixtures() {
  console.log('Generating PRA PDF Test Fixture Library…');

  // 1. One-page simple text PDF
  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([612, 792]);
  page1.drawText('PRA PDF Standard Test Document - Single Page', { x: 50, y: 700, size: 16 });
  page1.drawText('This is a verified parseable document for end-to-end testing.', { x: 50, y: 670, size: 11 });
  const bytes1 = await doc1.save();
  recordFixture('sample-text.pdf', Buffer.from(bytes1), { pageCount: 1, text: 'PRA PDF Standard Test Document' }, 'Basic one-page text document');

  // 2. Multi-page PDF
  const doc2 = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const p = doc2.addPage([612, 792]);
    p.drawText(`PRA PDF Multi-Page Document — Page ${i}`, { x: 50, y: 700, size: 16 });
    p.drawText(`Unique content for section ${i} of document audit.`, { x: 50, y: 670, size: 11 });
  }
  const bytes2 = await doc2.save();
  recordFixture('multipage.pdf', Buffer.from(bytes2), { pageCount: 3 }, 'Multi-page document with distinct pages');

  // 3. PDF with embedded image
  const doc3 = await PDFDocument.create();
  const page3 = doc3.addPage([612, 792]);
  page3.drawText('Document with Embedded Raster Image', { x: 50, y: 720, size: 16 });
  // 1x1 JPEG
  const onePixelJpg = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);
  const imgEmbed = await doc3.embedJpg(onePixelJpg);
  page3.drawImage(imgEmbed, { x: 50, y: 550, width: 100, height: 100 });
  const bytes3 = await doc3.save();
  recordFixture('sample-image.pdf', Buffer.from(bytes3), { imageCount: 1, pageCount: 1 }, 'PDF containing embedded raster image');

  // 4. PDF with table
  const doc4 = await PDFDocument.create();
  const page4 = doc4.addPage([612, 792]);
  page4.drawText('Sample Financial Table', { x: 50, y: 720, size: 16 });
  page4.drawRectangle({ x: 50, y: 640, width: 450, height: 60, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page4.drawText('ID', { x: 60, y: 680, size: 10 });
  page4.drawText('Description', { x: 120, y: 680, size: 10 });
  page4.drawText('Amount', { x: 380, y: 680, size: 10 });
  page4.drawText('001', { x: 60, y: 655, size: 10 });
  page4.drawText('Audit Consultation Services', { x: 120, y: 655, size: 10 });
  page4.drawText('$4,500.00', { x: 380, y: 655, size: 10 });
  const bytes4 = await doc4.save();
  recordFixture('sample-table.pdf', Buffer.from(bytes4), { hasTable: true, pageCount: 1 }, 'PDF containing tabular structured content');

  // 5. PDF with AcroForm
  const doc5 = await PDFDocument.create();
  const page5 = doc5.addPage([612, 792]);
  page5.drawText('Interactive AcroForm Application', { x: 50, y: 720, size: 16 });
  const form5 = doc5.getForm();
  const tf5 = form5.createTextField('fullName');
  tf5.setText('John PRA');
  tf5.addToPage(page5, { x: 50, y: 650, width: 200, height: 25 });
  const cb5 = form5.createCheckBox('agreeTerms');
  cb5.check();
  cb5.addToPage(page5, { x: 50, y: 600, width: 20, height: 20 });
  const bytes5 = await doc5.save();
  recordFixture('sample-form.pdf', Buffer.from(bytes5), { fields: ['fullName', 'agreeTerms'], pageCount: 1 }, 'Interactive AcroForm fields');

  // 6. Password protected PDF
  // We can use protectPdf engine or custom encrypted simulation
  recordFixture('sample-password.txt', Buffer.from('PRA_TEST_PASS_123'), {}, 'Password reference for password tests');

  // 7. PDF with metadata
  const doc7 = await PDFDocument.create();
  doc7.setTitle('PRA PDF Official Audit');
  doc7.setAuthor('PRAVERSE Core Team');
  doc7.setSubject('End-to-End Audit Specification');
  doc7.setKeywords(['audit', 'pra-pdf', 'wave4', 'verification']);
  const page7 = doc7.addPage([612, 792]);
  page7.drawText('Document with Rich Metadata Dictionaries', { x: 50, y: 700, size: 16 });
  const bytes7 = await doc7.save();
  recordFixture('sample-metadata.pdf', Buffer.from(bytes7), { title: 'PRA PDF Official Audit', author: 'PRAVERSE Core Team' }, 'PDF with title and author metadata');

  // 8. Rotated page PDF
  const doc8 = await PDFDocument.create();
  const page8 = doc8.addPage([612, 792]);
  page8.setRotation({ type: 'degrees', angle: 90 } as any);
  page8.drawText('Rotated Page Content (90 deg)', { x: 50, y: 500, size: 16 });
  const bytes8 = await doc8.save();
  recordFixture('sample-rotated.pdf', Buffer.from(bytes8), { rotation: 90, pageCount: 1 }, 'PDF with rotated page');

  // 9. Damaged PDF for repair
  const damagedBuf = Buffer.concat([
    Buffer.from('CORRUPT_PREAMBLE_NOISE_12345'),
    Buffer.from(bytes1),
  ]);
  recordFixture('damaged-fixture.pdf', damagedBuf, { repairable: true }, 'Damaged PDF structure with recoverable content');

  // 10. Sample Images
  recordFixture('sample.jpg', Buffer.from(onePixelJpg), { width: 1, height: 1, format: 'jpg' }, 'Valid JPG image file');
  // 1x1 PNG
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  recordFixture('sample.png', onePixelPng, { width: 1, height: 1, format: 'png' }, 'Valid PNG image file');

  // 11. Documents (TXT, MD, RTF, HTML)
  recordFixture('sample.txt', Buffer.from('PRA PDF Plain Text Document\nLine 1: Verification\nLine 2: Ready for conversion'), {}, 'Valid plain text file');
  recordFixture('sample.md', Buffer.from('# PRA PDF Document\n\n## Section 1\nThis is **bold** text and *italic* text in Markdown.'), {}, 'Valid Markdown file');
  recordFixture('sample.rtf', Buffer.from('{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Courier;}}\\f0\\fs24 PRA PDF Rich Text Document\\par Second line of formatted content.}'), {}, 'Valid RTF file');
  recordFixture('sample.html', Buffer.from('<!DOCTYPE html><html><body><h1>PRA PDF HTML Title</h1><p>Paragraph text for HTML to PDF conversion.</p></body></html>'), {}, 'Valid HTML file');

  // 12. Office Documents (XLSX, DOCX, PPTX)
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Product', 'Q1 Revenue', 'Q2 Revenue', 'Status'],
    ['PRA PDF Pro', '$120,000', '$145,000', 'Active'],
    ['Enterprise Cloud', '$340,000', '$390,000', 'Active'],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'SalesData');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  recordFixture('sample.xlsx', xlsxBuf, { sheets: ['SalesData'] }, 'Valid XLSX spreadsheet');

  // Synthetic valid DOCX OpenXML ZIP
  const docxZip = new JSZip();
  docxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  docxZip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  docxZip.file('word/document.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>PRA PDF Word Document Text Content</w:t></w:r></w:p></w:body></w:document>');
  const docxBuf = await docxZip.generateAsync({ type: 'nodebuffer' });
  recordFixture('sample.docx', docxBuf, {}, 'Valid Word DOCX OpenXML document');

  // Synthetic valid PPTX OpenXML ZIP
  const pptxZip = new JSZip();
  pptxZip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>');
  pptxZip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  pptxZip.file('ppt/presentation.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst><p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></p:sldIdLst></p:presentation>');
  const pptxBuf = await pptxZip.generateAsync({ type: 'nodebuffer' });
  recordFixture('sample.pptx', pptxBuf, {}, 'Valid PowerPoint PPTX OpenXML document');

  // 13. Comparison pair
  const comp1 = await PDFDocument.create();
  const compP1 = comp1.addPage([612, 792]);
  compP1.drawText('Document Version A - Original Release', { x: 50, y: 700, size: 14 });
  compP1.drawText('Terms and conditions: Section 1 applies to standard users.', { x: 50, y: 670, size: 11 });
  const comp1Bytes = await comp1.save();
  recordFixture('compare-doc1.pdf', Buffer.from(comp1Bytes), { version: 'A' }, 'First document for comparison diffing');

  const comp2 = await PDFDocument.create();
  const compP2 = comp2.addPage([612, 792]);
  compP2.drawText('Document Version B - Revised Edition', { x: 50, y: 700, size: 14 });
  compP2.drawText('Terms and conditions: Section 1 applies to enterprise users only.', { x: 50, y: 670, size: 11 });
  compP2.drawText('Additional paragraph inserted in revision.', { x: 50, y: 640, size: 11 });
  const comp2Bytes = await comp2.save();
  recordFixture('compare-doc2.pdf', Buffer.from(comp2Bytes), { version: 'B' }, 'Second document with additions/modifications');

  // 14. Corrupt/Invalid document
  recordFixture('corrupt-file.pdf', Buffer.from('NOT_A_VALID_PDF_STREAM_NO_HEADER_RANDOM_NOISE'), {}, 'Irrevocably corrupt file for negative rejection tests');

  // 15. Valid Oversized PDF (>50 MB: 53 MB)
  console.log('Generating >50 MB (53 MB) oversized test PDF…');
  const largeDoc = await PDFDocument.create();
  const largePage = largeDoc.addPage([612, 792]);
  largePage.drawText('PRA PDF 50 MB Upload Limit Boundary Test Fixture', { x: 50, y: 700, size: 16 });
  const baseLargeBytes = await largeDoc.save();

  // We append safe unreferenced PDF comment blocks (% ...) to reach 53 MB (55,574,528 bytes > 52,428,800 bytes)
  const targetOversizedBytes = 53 * 1024 * 1024; // 55,574,528 bytes
  const paddingNeeded = targetOversizedBytes - baseLargeBytes.length;
  const chunk = Buffer.alloc(1024 * 1024, 0x20); // 1 MB space padding
  chunk[0] = 0x25; // % comment marker

  const writeStream = fs.createWriteStream(path.join(FIXTURES_DIR, 'oversized-53mb.pdf'));
  writeStream.write(Buffer.from(baseLargeBytes));
  let written = baseLargeBytes.length;
  while (written < targetOversizedBytes) {
    const toWrite = Math.min(chunk.length, targetOversizedBytes - written);
    writeStream.write(chunk.subarray(0, toWrite));
    written += toWrite;
  }
  await new Promise<void>((res) => writeStream.end(res));

  const oversizedStat = fs.statSync(path.join(FIXTURES_DIR, 'oversized-53mb.pdf'));
  manifest['oversized-53mb.pdf'] = {
    filename: 'oversized-53mb.pdf',
    sizeBytes: oversizedStat.size,
    sha256: 'computed-on-demand',
    expectedProperties: { sizeBytes: oversizedStat.size, isOversized: true },
    purpose: 'Upload boundary test (>50 MB strict rejection)',
  };
  console.log(`[Fixture] Created oversized-53mb.pdf (${(oversizedStat.size / (1024 * 1024)).toFixed(2)} MB)`);

  // Write manifest.json
  const manifestPath = path.join(FIXTURES_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[Manifest] Saved ${Object.keys(manifest).length} fixture definitions to ${manifestPath}`);
}

generateAllFixtures().catch(console.error);
