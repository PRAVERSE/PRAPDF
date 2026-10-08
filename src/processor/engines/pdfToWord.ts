/**
 * PRA PDF — Real PDF to Word Engine
 * A PRAVERSE Company
 * Converts PDF documents into standard editable Microsoft Word documents (.docx).
 */

import fs from 'fs';
import crypto from 'crypto';
import JSZip from 'jszip';
import { procLogger } from '../logger';

export interface PdfToWordResult {
  service: 'pdf-to-word';
  inputSizeBytes: number;
  outputSizeBytes: number;
  sha256: string;
  pageCount: number;
  paragraphCount: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function processPdfToWord(
  inputPath: string,
  outputPath: string,
  jobId: string,
  options?: any
): Promise<PdfToWordResult> {
  const rawInput = fs.readFileSync(inputPath);
  const inputSize = rawInput.length;

  procLogger.info('ENGINE_PDF_TO_WORD_STARTED', {
    jobId,
    service: 'pdf-to-word',
    inputSizeBytes: inputSize,
  });

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(rawInput),
    useSystemFonts: true,
    disableFontFace: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  if (numPages === 0) {
    throw new Error('PDF document has zero pages.');
  }

  interface ExtractedLine {
    text: string;
    fontSize: number;
    isHeading: boolean;
    headingLevel: number;
  }

  const allLines: ExtractedLine[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    const validItems = items.filter((item) => typeof item.str === 'string' && item.str.trim().length > 0);

    const heights = validItems.map((i) => Math.abs(i.transform[0] || i.height || 10)).filter((h) => h > 0);
    const avgHeight = heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 12;

    // Sort items by Y (descending), X (ascending)
    validItems.sort((a, b) => {
      const diffY = b.transform[5] - a.transform[5];
      if (Math.abs(diffY) > 4) return diffY;
      return a.transform[4] - b.transform[4];
    });

    let currentY: number | null = null;
    let currentWords: string[] = [];
    let currentMaxFont = 0;

    for (const item of validItems) {
      const y = item.transform[5];
      const fontH = Math.abs(item.transform[0] || item.height || 10);

      if (currentY === null || Math.abs(currentY - y) > 4) {
        if (currentWords.length > 0) {
          const lineStr = currentWords.join(' ');
          const isH = currentMaxFont > avgHeight * 1.25;
          const hLevel = currentMaxFont > avgHeight * 1.5 ? 1 : isH ? 2 : 0;
          allLines.push({
            text: lineStr,
            fontSize: currentMaxFont,
            isHeading: isH,
            headingLevel: hLevel,
          });
        }
        currentWords = [item.str.trim()];
        currentMaxFont = fontH;
        currentY = y;
      } else {
        currentWords.push(item.str.trim());
        if (fontH > currentMaxFont) currentMaxFont = fontH;
      }
    }

    if (currentWords.length > 0) {
      const lineStr = currentWords.join(' ');
      const isH = currentMaxFont > avgHeight * 1.25;
      const hLevel = currentMaxFont > avgHeight * 1.5 ? 1 : isH ? 2 : 0;
      allLines.push({
        text: lineStr,
        fontSize: currentMaxFont,
        isHeading: isH,
        headingLevel: hLevel,
      });
    }

    if (pageNum < numPages) {
      // Page break marker
      allLines.push({
        text: '__PAGE_BREAK__',
        fontSize: 0,
        isHeading: false,
        headingLevel: 0,
      });
    }
  }

  // Construct Word Document XML
  let paragraphsXml = '';
  let paragraphCount = 0;

  for (const item of allLines) {
    if (item.text === '__PAGE_BREAK__') {
      paragraphsXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
      continue;
    }

    paragraphCount++;
    const safeText = escapeXml(item.text);

    if (item.isHeading) {
      const styleName = item.headingLevel === 1 ? 'Heading1' : 'Heading2';
      paragraphsXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="${styleName}"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:b/>
              <w:sz w:val="${Math.round(item.fontSize * 2)}"/>
            </w:rPr>
            <w:t xml:space="preserve">${safeText}</w:t>
          </w:r>
        </w:p>`;
    } else {
      paragraphsXml += `
        <w:p>
          <w:r>
            <w:t xml:space="preserve">${safeText}</w:t>
          </w:r>
        </w:p>`;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${paragraphsXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const packageRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="2E74B5"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:rPr>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="2E74B5"/>
    </w:rPr>
  </w:style>
</w:styles>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', packageRelsXml);
  zip.file('word/_rels/document.xml.rels', docRelsXml);
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', stylesXml);

  const docxBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  const outputSize = docxBuffer.length;
  const sha256 = crypto.createHash('sha256').update(docxBuffer).digest('hex');

  fs.writeFileSync(outputPath, docxBuffer);

  procLogger.info('ENGINE_PDF_TO_WORD_COMPLETED', {
    jobId,
    service: 'pdf-to-word',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    pageCount: numPages,
    paragraphCount,
  });

  return {
    service: 'pdf-to-word',
    inputSizeBytes: inputSize,
    outputSizeBytes: outputSize,
    sha256,
    pageCount: numPages,
    paragraphCount,
  };
}
