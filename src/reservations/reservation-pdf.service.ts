import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function fmtMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toLocaleString()} QAR`;
}

function fmtDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  try {
    return new Date(String(value)).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

@Injectable()
export class ReservationPdfService {
  async generate(reservation: any, property: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ──────────────────────────────────────────────
      doc
        .font('Helvetica-Bold')
        .fontSize(20)
        .fillColor('#1a1a2e')
        .text('Reservation Confirmation', { align: 'center' });

      doc.moveDown(0.3);
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#666666')
        .text(
          `Reservation #${fmt(reservation.id)}  |  Submitted: ${fmtDate(reservation.createdAt)}`,
          { align: 'center' },
        );

      doc
        .moveTo(50, doc.y + 8)
        .lineTo(545, doc.y + 8)
        .strokeColor('#cccccc')
        .stroke();
      doc.moveDown(1.2);

      // ── Helper: section heading ──────────────────────────────
      const sectionHeading = (title: string) => {
        doc.moveDown(0.5);
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('#2c3e50')
          .text(title);
        doc
          .moveTo(50, doc.y + 2)
          .lineTo(545, doc.y + 2)
          .strokeColor('#aaaaaa')
          .stroke();
        doc.moveDown(0.6);
      };

      // ── Helper: field row ────────────────────────────────────
      const fieldRow = (label: string, value: string) => {
        const y = doc.y;
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#888888')
          .text(label, 50, y, { width: 200, continued: false });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#222222')
          .text(value, 260, y, { width: 285 });
        doc.moveDown(0.25);
      };

      // ── Section 1: Client ────────────────────────────────────
      sectionHeading('Client Information');
      fieldRow('First Name', fmt(reservation.firstName));
      fieldRow('Last Name', fmt(reservation.lastName));
      fieldRow('Email', fmt(reservation.email));
      fieldRow(
        'Phone',
        reservation.countryCode || reservation.phone
          ? `${fmt(reservation.countryCode)} ${fmt(reservation.phone)}`.trim()
          : '—',
      );
      fieldRow('Nationality', fmt(reservation.nationality));
      fieldRow('ID Type', fmt(reservation.idType));
      fieldRow('ID Number', fmt(reservation.idNumber));

      // ── Section 2: Property ──────────────────────────────────
      sectionHeading('Property Details');
      fieldRow('Property Name', fmt(property?.name));
      fieldRow('Reference Number', fmt(property?.referenceNumber));
      fieldRow(
        'Unit Number',
        fmt(reservation.unitNumber ?? property?.unitNumber),
      );

      // ── Section 3: Booking ───────────────────────────────────
      sectionHeading('Booking Terms');
      fieldRow('Reservation Date', fmtDate(reservation.reservationDate));
      fieldRow('Contract Period', fmt(reservation.contractPeriod));
      fieldRow('Payment Modality', fmt(reservation.paymentModality));
      fieldRow('Move-in Date', fmtDate(reservation.moveInDate));
      fieldRow('Contract Start Date', fmtDate(reservation.contractStartDate));

      // ── Section 4: Financials ────────────────────────────────
      sectionHeading('Financials');
      fieldRow('Selling Price', fmtMoney(reservation.sellingPrice));
      const downPct = reservation.downPaymentPct;
      if (downPct !== null && downPct !== undefined) {
        const price = Number(reservation.sellingPrice ?? 0);
        const pctNum = Number(downPct);
        const amount =
          Number.isFinite(pctNum) && Number.isFinite(price)
            ? Math.round(price * (pctNum / 100) * 100) / 100
            : null;
        const downDisplay =
          amount !== null
            ? `${pctNum}% (${amount.toLocaleString()} QAR)`
            : `${pctNum}%`;
        fieldRow('Down Payment', downDisplay);
      }
      fieldRow('Reservation Fee', fmtMoney(reservation.reservationFeeAmount));
      fieldRow('Payment Mode', fmt(reservation.paymentMode));
      fieldRow('Payment Amount', fmtMoney(reservation.paymentAmount));
      fieldRow('Payment Method', fmt(reservation.paymentMethod));

      // ── Footer ───────────────────────────────────────────────
      const pageHeight = doc.page.height;
      doc
        .moveTo(50, pageHeight - 60)
        .lineTo(545, pageHeight - 60)
        .strokeColor('#cccccc')
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#aaaaaa')
        .text(
          `Step In Property  |  Generated on: ${new Date().toLocaleString('en-GB')}`,
          50,
          pageHeight - 48,
          { align: 'center', width: 495 },
        );

      doc.end();
    });
  }
}
