const PDFDocument = require('pdfkit');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const { drawBrandedHeader, drawFooter, addPageNumbers } = require('../utils/pdfHelper');

/**
 * Retrieves the student profile populated with class and section details.
 */
const getStudentForReceipt = async (studentId) => {
  return await Student.findById(studentId)
    .populate('classId', 'name')
    .populate('sectionId', 'name');
};

/**
 * Builds and streams the styled PDF document to the provided write stream.
 */
const buildAdmissionReceiptPDF = async (student, stream) => {
  const doc = new PDFDocument({ 
    margins: { top: 125, bottom: 60, left: 50, right: 50 },
    bufferPages: true
  });
  doc.pipe(stream);

  const settings = await Settings.findOne({ schoolId: 'default' });

  const title = 'Admission Fee Receipt';
  const subtitle = `Reg No: ${student.registrationNumber}`;

  // Draw first page header/footer
  drawBrandedHeader(doc, title, subtitle, settings);
  drawFooter(doc);

  // Subsequent page header/footer
  const onPageAdded = () => {
    drawBrandedHeader(doc, title, subtitle, settings);
    drawFooter(doc);
  };
  doc.on('pageAdded', onPageAdded);

  let currentY = 125;

  // Student Details box
  doc.save();
  doc.rect(50, currentY, 512, 18).fill('#00215E');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('STUDENT REGISTRATION DETAILS', 60, currentY + 5);
  doc.restore();

  currentY += 18;
  doc.save();
  doc.rect(50, currentY, 512, 60).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
  
  doc.text('Full Name:', 65, currentY + 12);
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.fullName || 'N/A', 135, currentY + 11);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Registration No:', 310, currentY + 12);
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.registrationNumber || 'N/A', 400, currentY + 11);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text("Father's Name:", 65, currentY + 28);
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(student.fatherName || 'N/A', 135, currentY + 27);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Class / Section:', 310, currentY + 28);
  const classSec = `${student.classId?.name || 'N/A'} / ${student.sectionId?.name || 'N/A'}`;
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(classSec, 400, currentY + 27);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Date of Birth:', 65, currentY + 44);
  const dob = student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : 'N/A';
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(dob, 135, currentY + 43);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Admission Date:', 310, currentY + 44);
  const admDate = student.createdAt ? new Date(student.createdAt).toISOString().split('T')[0] : 'N/A';
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5).text(admDate, 400, currentY + 43);
  doc.restore();
  
  currentY += 75;

  // Books Purchased section
  doc.save();
  doc.rect(50, currentY, 512, 18).fill('#00215E');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('BOOKS PURCHASED AT ADMISSION', 60, currentY + 5);
  doc.restore();
  currentY += 18;

  const hasBooks = student.books && student.books.length > 0;
  let booksSubtotal = 0;

  if (hasBooks) {
    // Draw sub-table header
    doc.save();
    doc.rect(50, currentY, 512, 18).fill('#4F6EF7');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8).text('Book Title', 65, currentY + 5);
    doc.text('Price', 400, currentY + 5, { width: 150, align: 'right' });
    doc.restore();
    currentY += 18;

    student.books.forEach((book, idx) => {
      booksSubtotal += book.price;
      if (idx % 2 === 0) {
        doc.rect(50, currentY, 512, 16).fill('#F8FAFC');
      }
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8);
      doc.text(book.title, 65, currentY + 4);
      doc.text(`Rs. ${book.price.toFixed(2)}`, 400, currentY + 4, { width: 150, align: 'right' });
      // Underline row
      doc.moveTo(50, currentY + 16).lineTo(562, currentY + 16).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      currentY += 16;
    });

    // Subtotal row
    currentY += 4;
    doc.save();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1E293B');
    doc.text('Books Subtotal', 65, currentY + 2);
    doc.text(`Rs. ${booksSubtotal.toFixed(2)}`, 400, currentY + 2, { width: 150, align: 'right' });
    doc.restore();
    currentY += 18;
  } else {
    doc.save();
    doc.rect(50, currentY, 512, 22).fill('#F8FAFC');
    doc.fillColor('#64748B').font('Helvetica-Oblique').fontSize(8.5).text('No books purchased at admission.', 65, currentY + 7);
    doc.restore();
    currentY += 28;
  }

  // Admission Fee Section
  doc.save();
  doc.rect(50, currentY, 512, 18).fill('#00215E');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('ADMISSION FEES', 60, currentY + 5);
  doc.restore();
  currentY += 18;

  const admissionFeeAmount = student.admissionFee || 0;
  doc.save();
  doc.rect(50, currentY, 512, 22).fill('#F8FAFC');
  doc.fillColor('#1E293B').font('Helvetica').fontSize(8.5);
  if (admissionFeeAmount > 0) {
    doc.text('Standard Admission Registration Fee', 65, currentY + 7);
    doc.text(`Rs. ${admissionFeeAmount.toFixed(2)}`, 400, currentY + 7, { width: 150, align: 'right' });
  } else {
    doc.fillColor('#64748B').font('Helvetica-Oblique').text('No admission fee charged.', 65, currentY + 7);
  }
  doc.restore();
  currentY += 28;

  // Payment Summary & Status
  doc.save();
  doc.rect(50, currentY, 512, 18).fill('#00215E');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5).text('PAYMENT SUMMARY & STATUS', 60, currentY + 5);
  doc.restore();
  currentY += 18;

  const admissionTotal = student.admissionTotal || 0;
  const admissionAmountPaid = student.admissionAmountPaid || 0;
  const remaining = admissionTotal - admissionAmountPaid;

  doc.save();
  doc.rect(50, currentY, 512, 45).fillAndStroke('#F8FAFC', '#E2E8F0');
  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8);
  
  doc.text('Payment Status:', 65, currentY + 12);
  let statusText = 'Fully Paid';
  let statusColor = '#16A34A'; // green
  if (student.admissionPaymentStatus === 'unpaid') {
    statusText = 'Unpaid';
    statusColor = '#EF4444'; // red
  } else if (student.admissionPaymentStatus === 'custom_paid') {
    statusText = 'Partially Paid';
    statusColor = '#D97706'; // amber
  }
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(statusColor).text(statusText.toUpperCase(), 145, currentY + 11);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Total Amount Paid:', 65, currentY + 28);
  doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B').text(`Rs. ${admissionAmountPaid.toFixed(2)}`, 145, currentY + 27);

  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(8).text('Outstanding Balance:', 300, currentY + 20);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(remaining > 0 ? '#DC2626' : '#16A34A').text(`Rs. ${remaining.toFixed(2)}`, 400, currentY + 18, { width: 150, align: 'right' });
  doc.restore();
  currentY += 55;

  // Grand Total box
  const grandTotal = admissionFeeAmount + booksSubtotal;
  doc.save();
  doc.rect(50, currentY, 512, 32).fillAndStroke('#F8FAFC', '#00215E');
  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(11).text('GRAND TOTAL ADMISSION BILL:', 65, currentY + 10);
  doc.fillColor('#00215E').font('Helvetica-Bold').fontSize(12).text(`Rs. ${grandTotal.toFixed(2)}`, 400, currentY + 9, { width: 150, align: 'right' });
  doc.restore();
  currentY += 45;

  // Accounts Signature
  if (currentY > 670) {
    doc.addPage();
    currentY = 125;
  }
  
  doc.save();
  doc.moveTo(380, currentY + 35).lineTo(530, currentY + 35).strokeColor('#64748B').lineWidth(0.5).stroke();
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('Accounts Registrar Signature', 380, currentY + 40, { align: 'center', width: 150 });
  doc.restore();

  // Finalize page numbering
  addPageNumbers(doc, onPageAdded);

  doc.end();
};

module.exports = {
  getStudentForReceipt,
  buildAdmissionReceiptPDF,
};
