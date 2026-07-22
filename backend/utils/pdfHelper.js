/**
 * PDF Helper for IQRA SCHOOL MANAGEMENT SYSTEM (IHASS)
 * Provides standardized, high-quality, branded styling for all exported PDF documents.
 */

/**
 * Draws a professional header banner with the IHASS logo and school brand identity.
 * @param {object} doc - PDFKit document instance
 * @param {string} title - Main title of the report / document
 * @param {string} subtitle - Optional description or filter info
 */
const drawBrandedHeader = (doc, title, subtitle = '') => {
  const pageWidth = doc.page.width;
  
  doc.save();
  
  // 1. Navy Blue Background Banner (#00215E)
  doc.rect(0, 0, pageWidth, 100).fill('#00215E');
  
  // 2. School Logo Icon (Vector Graphic Graduation Cap)
  doc.fillColor('#FFFFFF');
  // Graduation Cap Diamond:
  doc.moveTo(35, 48)
     .lineTo(52, 40)
     .lineTo(69, 48)
     .lineTo(52, 56)
     .closePath()
     .fill();
  // Cap body/base:
  doc.moveTo(43, 51)
     .lineTo(43, 57)
     .quadraticCurveTo(52, 61, 61, 57)
     .lineTo(61, 51)
     .lineTo(52, 54)
     .closePath()
     .fill();
  // Tassel:
  doc.strokeColor('#FFFFFF');
  doc.lineWidth(1.2);
  doc.moveTo(52, 48)
     .lineTo(62, 57)
     .lineTo(62, 63)
     .stroke();
  
  // 3. School Name & Branding
  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(18)
     .text('IHASS SCHOOL SYSTEM', 80, 28, { characterSpacing: 0.5 });
     
  doc.fontSize(8)
     .font('Helvetica-Bold')
     .fillColor('#93C5FD') // Brighter cyan/blue for contrast
     .text('IQRA HADIQA TUL ATFAL SCHOOL SYSTEM', 80, 48);
     
  // 4. Report Title (Right-aligned)
  doc.fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .fontSize(11)
     .text(title.toUpperCase(), 250, 30, { align: 'right', width: pageWidth - 300 });
     
  if (subtitle) {
    doc.fillColor('#CBD5E1')
       .font('Helvetica-Oblique')
       .fontSize(8)
       .text(subtitle, 250, 48, { align: 'right', width: pageWidth - 300 });
  }

  // 5. Branded Primary Accent Line (#4F6EF7)
  doc.rect(0, 100, pageWidth, 4).fill('#4F6EF7');
  
  doc.restore();
  
  // Reset text properties and set coordinate to body start
  doc.fillColor('#1E293B').font('Helvetica').fontSize(9);
  doc.y = 125;
};

/**
 * Draws a clean separator line and school metadata at the bottom of the page.
 * @param {object} doc - PDFKit document instance
 */
const drawFooter = (doc) => {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  
  // Temporarily disable bottom margin to prevent infinite layout page-addition loop
  const oldBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  
  doc.save();
  
  // Footer divider line
  doc.moveTo(50, pageHeight - 50)
     .lineTo(pageWidth - 50, pageHeight - 50)
     .strokeColor('#E2E8F0')
     .lineWidth(0.5)
     .stroke();
     
  // Left-aligned system branding
  doc.fillColor('#94A3B8')
     .font('Helvetica')
     .fontSize(7)
     .text('IHASS Suite • IQRA School Management System', 50, pageHeight - 40, { width: pageWidth - 250, lineBreak: false });
     
  // Center-aligned date timestamp
  const nowStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  doc.text(`Generated: ${nowStr}`, 50, pageHeight - 40, { align: 'center', width: pageWidth - 100, lineBreak: false });
  
  doc.restore();

  // Restore original bottom margin
  doc.page.margins.bottom = oldBottomMargin;
};

/**
 * Iterates over all buffered pages of a PDFKit document to append page numbers.
 * Requires `bufferPages: true` in the PDFDocument initialization options.
 * @param {object} doc - PDFKit document instance
 * @param {function} listenerToRemove - Optional pageAdded event listener callback to unbind before page switching
 */
const addPageNumbers = (doc, listenerToRemove = null) => {
  if (listenerToRemove) {
    doc.removeListener('pageAdded', listenerToRemove);
  }

  const range = doc.bufferedPageRange();
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  
  const oldBottomMargin = doc.page.margins.bottom;
  
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.save();
    doc.fillColor('#94A3B8')
       .font('Helvetica')
       .fontSize(7)
       .text(`Page ${i + 1} of ${range.count}`, pageWidth - 150, pageHeight - 40, { align: 'right', width: 100, lineBreak: false });
    doc.restore();
  }

  doc.page.margins.bottom = oldBottomMargin;
};

module.exports = {
  drawBrandedHeader,
  drawFooter,
  addPageNumbers
};
