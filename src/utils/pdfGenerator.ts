import jsPDF from 'jspdf';
import { Loan, Language } from '../types';
import { sanitizeForFilename } from './sanitizer';

export const generateTenderReceipt = (loan: Loan, t: (key: string) => string, lang: Language) => {
  const doc = new jsPDF();
  doc.setFontSize(22);
  doc.setTextColor('#1E3A8A');
  doc.text(t('Sri Vinayaka Tenders'), 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.setTextColor('#333333');
  doc.text(t('LOAN RECEIPT'), 105, 30, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`${t('Loan ID')}: ${loan.id}`, 20, 50);
  doc.text(`${t('Issue Date')}: ${new Date(loan.created_at).toLocaleDateString()}`, 20, 60);

  doc.text(`${t('Customer Name')}:`, 20, 75);
  doc.setFont('helvetica', 'bold');
  doc.text(loan.customerName, 20, 82);
  doc.setFont('helvetica', 'normal');
  if (loan.phone) doc.text(`${t('Phone Number')}: ${loan.phone}`, 20, 89);

  let yPos = 105;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(t('Transaction History'), 20, yPos);
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  if (loan.transactions && loan.transactions.length > 0) {
    const lastPayment = loan.transactions[0];
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('Last Payment Date')}:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(lastPayment.payment_date).toLocaleDateString(), 70, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('Last Payment Amount')}:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`₹${lastPayment.amount.toLocaleString('en-IN')}`, 70, yPos);
    yPos += 12;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(t('Date'), 25, yPos);
    doc.text(t('Amount'), 185, yPos, { align: 'right' });
    yPos += 3;
    doc.line(20, yPos, 190, yPos);
    doc.setFont('helvetica', 'normal');

    loan.transactions.forEach(txn => {
      yPos += 7;
      if (yPos > 270) { doc.addPage(); yPos = 20; }
      doc.text(new Date(txn.payment_date).toLocaleDateString(), 25, yPos);
      doc.text(`₹${txn.amount.toLocaleString('en-IN')}`, 185, yPos, { align: 'right' });
    });
  } else {
    doc.text(t('No transactions yet.'), 20, yPos);
  }

  doc.setFontSize(10);
  doc.setTextColor('#888888');
  doc.text(t('Thank you for your business.'), 105, 280, { align: 'center' });

  const safeFilename = sanitizeForFilename(loan.customerName);
  doc.save(`Loan-Receipt-${safeFilename}.pdf`);
};
