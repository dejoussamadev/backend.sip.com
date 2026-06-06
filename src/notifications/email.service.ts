import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';
import {
  LOGIN_REQUEST_APPROVED,
  LOGIN_REQUEST_CREATED,
  LOGIN_REQUEST_REJECTED,
} from './notification-types';

export interface EmailContext {
  referenceNumber?: string;
  propertyName?: string;
  agentName?: string;
  agentCode?: string;
  price?: number;
  status?: string;
  userName?: string;
  userEmail?: string;
  reviewerName?: string;
  fingerprint?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
  platform?: string;
  ipAddress?: string | null;
  clientFirstName?: string;
  clientLastName?: string;
  clientEmail?: string;
  reservationId?: number;
  reservationDate?: string;
  propertyRef?: string;
  rejectionReason?: string;
}

/** Builds a key-value detail row for the email body. */
function detailRow(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  return `
    <tr>
      <td style="padding:4px 12px 4px 0;color:#666666;font-size:14px;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:4px 0;color:#333333;font-size:14px;font-weight:600;">${value}</td>
    </tr>`;
}

/** Builds a table of key-value detail rows. */
function detailsTable(rows: string[]): string {
  const filtered = rows.filter(Boolean).join('');
  if (!filtered) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
      ${filtered}
    </table>`;
}

/** Wraps an accent-colored badge around a short string. */
function badge(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color};color:#ffffff;font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:0.5px;">${text}</span>`;
}

/** Wraps inner HTML content in the full email layout. */
function wrapLayout(subject: string, body: string): string {
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F5F5F5;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1E4DCC;padding:24px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:1px;">STEP IN PROPERTY</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E6E6E6;margin:0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#999999;">Leading You Home With Trust At Every Step</p>
              <p style="margin:0;font-size:12px;color:#999999;">&copy; ${year} Step In Property. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Strips HTML tags from a string for the plain-text fallback. */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&copy;/g, '(c)')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface EmailTemplate {
  subject: string;
  buildHtml: (ctx: EmailContext) => string;
  buildText: (ctx: EmailContext) => string;
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  [NotificationType.PROPERTY_CREATED]: {
    subject: 'New Property Pending Validation',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reference', ctx.referenceNumber),
        detailRow('Property', ctx.propertyName),
        detailRow('Agent', ctx.agentName),
        detailRow('Price', ctx.price),
        detailRow('Status', ctx.status),
      ]);
      return `
        ${badge('Pending Review', '#EBA00E')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">New Property Created</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A new property has been created and requires your validation.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to the admin panel to review and approve it.</p>`;
    },
    buildText: (ctx) =>
      [`New Property Pending Validation`, ``, `Reference: ${ctx.referenceNumber}`, `Property: ${ctx.propertyName}`, `Agent: ${ctx.agentName}`,
        ctx.price !== undefined ? `Price: ${ctx.price}` : '', ctx.status ? `Status: ${ctx.status}` : '',
        ``, `A new property has been created and requires your validation.`, `Please log in to the admin panel to review and approve it.`]
        .filter(Boolean).join('\n'),
  },

  [NotificationType.PROPERTY_UPDATED]: {
    subject: 'Property Updated',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reference', ctx.referenceNumber),
        detailRow('Property', ctx.propertyName),
        detailRow('Updated by', ctx.agentName),
      ]);
      return `
        ${badge('Updated', '#1E4DCC')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Property Updated</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A property has been updated and may require your review.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to review the changes.</p>`;
    },
    buildText: (ctx) =>
      [`Property Updated`, ``, `Reference: ${ctx.referenceNumber}`, `Property: ${ctx.propertyName}`, `Updated by: ${ctx.agentName}`,
        ``, `A property has been updated. Please log in to review the changes.`].filter(Boolean).join('\n'),
  },

  [NotificationType.PROPERTY_DELETED]: {
    subject: 'Property Deleted',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reference', ctx.referenceNumber),
        detailRow('Property', ctx.propertyName),
        detailRow('Deleted by', ctx.agentName),
      ]);
      return `
        ${badge('Deleted', '#C13E28')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Property Deleted</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A property has been deleted from the system.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Property Deleted`, ``, `Reference: ${ctx.referenceNumber}`, `Property: ${ctx.propertyName}`, `Deleted by: ${ctx.agentName}`,
        ``, `A property has been deleted from the system.`].filter(Boolean).join('\n'),
  },

  [NotificationType.AGENT_CREATED]: {
    subject: 'New Agent Created',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Agent Name', ctx.agentName),
        detailRow('Agent Code', ctx.agentCode),
      ]);
      return `
        ${badge('New Agent', '#688E26')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">New Agent Created</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A new agent has been added to the system.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to review the details.</p>`;
    },
    buildText: (ctx) =>
      [`New Agent Created`, ``, `Agent Name: ${ctx.agentName}`, `Agent Code: ${ctx.agentCode}`,
        ``, `A new agent has been created. Please log in to review the details.`].filter(Boolean).join('\n'),
  },

  [NotificationType.AGENT_UPDATED]: {
    subject: 'Agent Profile Updated',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Agent Name', ctx.agentName),
        detailRow('Agent Code', ctx.agentCode),
      ]);
      return `
        ${badge('Updated', '#1E4DCC')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Agent Profile Updated</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">An agent profile has been updated.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to review the changes.</p>`;
    },
    buildText: (ctx) =>
      [`Agent Profile Updated`, ``, `Agent Name: ${ctx.agentName}`, `Agent Code: ${ctx.agentCode}`,
        ``, `An agent profile has been updated. Please log in to review the changes.`].filter(Boolean).join('\n'),
  },

  [NotificationType.AGENT_DELETED]: {
    subject: 'Agent Deleted',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Agent Name', ctx.agentName),
        detailRow('Agent Code', ctx.agentCode),
      ]);
      return `
        ${badge('Deleted', '#C13E28')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Agent Deleted</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">An agent has been removed from the system.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Agent Deleted`, ``, `Agent Name: ${ctx.agentName}`, `Agent Code: ${ctx.agentCode}`,
        ``, `An agent has been deleted from the system.`].filter(Boolean).join('\n'),
  },

  [LOGIN_REQUEST_CREATED]: {
    subject: 'New Device Login Request',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('User', ctx.userName),
        detailRow('Email', ctx.userEmail),
        detailRow('Device', ctx.deviceName),
        detailRow('Browser', ctx.browser),
        detailRow('OS', ctx.operatingSystem),
        detailRow('Platform', ctx.platform),
        detailRow('IP Address', ctx.ipAddress),
      ]);
      return `
        ${badge('Action Required', '#EBA00E')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">New Device Login Request</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A user attempted to log in from a new device and needs your approval.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to the admin panel to approve or reject this request.</p>`;
    },
    buildText: (ctx) =>
      [`New Device Login Request`, ``, `User: ${ctx.userName}`, `Email: ${ctx.userEmail}`,
        ctx.deviceName ? `Device: ${ctx.deviceName}` : '', ctx.browser ? `Browser: ${ctx.browser}` : '',
        ctx.operatingSystem ? `OS: ${ctx.operatingSystem}` : '', ctx.platform ? `Platform: ${ctx.platform}` : '',
        ctx.ipAddress ? `IP Address: ${ctx.ipAddress}` : '',
        ``, `A user attempted to log in from a new device.`, `Please review and approve or reject this login request in the admin panel.`]
        .filter(Boolean).join('\n'),
  },

  [LOGIN_REQUEST_APPROVED]: {
    subject: 'Your Login Request Was Approved',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Device', ctx.deviceName),
        detailRow('Browser', ctx.browser),
        detailRow('OS', ctx.operatingSystem),
        detailRow('Reviewed by', ctx.reviewerName),
      ]);
      return `
        ${badge('Approved', '#688E26')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Login Request Approved</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Hi ${ctx.userName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Your login request for a new device has been approved. You can now sign in from this device.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Hi ${ctx.userName},`, ``, `Your login request for this device has been approved.`, `You can now sign in from this device.`,
        ``, ctx.deviceName ? `Device: ${ctx.deviceName}` : '', ctx.browser ? `Browser: ${ctx.browser}` : '',
        ctx.reviewerName ? `Reviewed by: ${ctx.reviewerName}` : ''].filter(Boolean).join('\n'),
  },

  [LOGIN_REQUEST_REJECTED]: {
    subject: 'Your Login Request Was Rejected',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Device', ctx.deviceName),
        detailRow('Browser', ctx.browser),
        detailRow('OS', ctx.operatingSystem),
        detailRow('Reviewed by', ctx.reviewerName),
      ]);
      return `
        ${badge('Rejected', '#C13E28')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Login Request Rejected</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Hi ${ctx.userName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Your login request for a new device has been rejected. Please contact an administrator if you believe this was a mistake.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Hi ${ctx.userName},`, ``, `Your login request for this device has been rejected.`, `Please contact an administrator if you think this was a mistake.`,
        ``, ctx.deviceName ? `Device: ${ctx.deviceName}` : '', ctx.browser ? `Browser: ${ctx.browser}` : '',
        ctx.reviewerName ? `Reviewed by: ${ctx.reviewerName}` : ''].filter(Boolean).join('\n'),
  },

  RESERVATION_SUBMITTED_INTERNAL: {
    subject: 'New Reservation Pending Approval',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reservation', `#${ctx.reservationId}`),
        detailRow('Client', `${ctx.clientFirstName} ${ctx.clientLastName}`),
        detailRow('Client Email', ctx.clientEmail),
        detailRow('Property', ctx.propertyName),
        detailRow('Reference', ctx.propertyRef),
        detailRow('Date', ctx.reservationDate),
      ]);
      return `
        ${badge('Pending Approval', '#EBA00E')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">New Reservation Submitted</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A new reservation has been submitted and is pending your approval.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please log in to the admin panel to review and approve or reject it.</p>`;
    },
    buildText: (ctx) =>
      [`New Reservation Pending Approval`, ``, `Reservation #${ctx.reservationId}`,
        `Client: ${ctx.clientFirstName} ${ctx.clientLastName} (${ctx.clientEmail})`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : '', ctx.propertyRef ? `Reference: ${ctx.propertyRef}` : '',
        ctx.reservationDate ? `Date: ${ctx.reservationDate}` : '',
        ``, `A new reservation has been submitted and is pending your approval.`,
        `Please log in to the admin panel to review and approve or reject it.`].filter(Boolean).join('\n'),
  },

  RESERVATION_SUBMITTED_CLIENT: {
    subject: 'Your Reservation Was Received',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Property', ctx.propertyName),
        detailRow('Reference', ctx.propertyRef),
      ]);
      return `
        <h2 style="margin:0 0 8px;font-size:20px;color:#1E4DCC;">Reservation Received</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Dear ${ctx.clientFirstName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Thank you for your reservation request. We have received it and it is currently being reviewed by our team.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">You will receive an email once your reservation has been reviewed. If you have any questions, please don't hesitate to contact us.</p>
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Warm regards,<br><strong style="color:#1E4DCC;">Step In Property</strong></p>`;
    },
    buildText: (ctx) =>
      [`Dear ${ctx.clientFirstName},`, ``, `Thank you for your reservation request.`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : '', ctx.propertyRef ? `Reference: ${ctx.propertyRef}` : '',
        ``, `Your reservation is currently pending approval. You will receive an email once it has been reviewed.`,
        ``, `Warm regards,`, `Step In Property`].filter(Boolean).join('\n'),
  },

  RESERVATION_APPROVED_INTERNAL: {
    subject: 'Reservation Approved',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reservation', `#${ctx.reservationId}`),
        detailRow('Client', `${ctx.clientFirstName} ${ctx.clientLastName}`),
        detailRow('Property', ctx.propertyName),
      ]);
      return `
        ${badge('Approved', '#688E26')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Reservation Approved</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A reservation has been approved.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Reservation Approved`, ``, `Reservation #${ctx.reservationId} for ${ctx.clientFirstName} ${ctx.clientLastName} has been approved.`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : ''].filter(Boolean).join('\n'),
  },

  RESERVATION_APPROVED_CLIENT: {
    subject: 'Your Reservation Has Been Approved',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Property', ctx.propertyName),
      ]);
      return `
        ${badge('Approved', '#688E26')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Great News!</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Dear ${ctx.clientFirstName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Your reservation has been approved. Our team will be in touch with you shortly to finalise the details.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Warm regards,<br><strong style="color:#1E4DCC;">Step In Property</strong></p>`;
    },
    buildText: (ctx) =>
      [`Dear ${ctx.clientFirstName},`, ``, `Great news! Your reservation has been approved.`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : '',
        ``, `Our team will be in touch with you shortly to finalise the details.`,
        ``, `Warm regards,`, `Step In Property`].filter(Boolean).join('\n'),
  },

  RESERVATION_REJECTED_INTERNAL: {
    subject: 'Reservation Rejected',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Reservation', `#${ctx.reservationId}`),
        detailRow('Client', `${ctx.clientFirstName} ${ctx.clientLastName}`),
        detailRow('Property', ctx.propertyName),
        detailRow('Reason', ctx.rejectionReason),
      ]);
      return `
        ${badge('Rejected', '#C13E28')}
        <h2 style="margin:16px 0 8px;font-size:20px;color:#1E4DCC;">Reservation Rejected</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">A reservation has been rejected.</p>
        ${details}`;
    },
    buildText: (ctx) =>
      [`Reservation Rejected`, ``, `Reservation #${ctx.reservationId} for ${ctx.clientFirstName} ${ctx.clientLastName} has been rejected.`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : '',
        ctx.rejectionReason ? `Reason: ${ctx.rejectionReason}` : ''].filter(Boolean).join('\n'),
  },

  RESERVATION_REJECTED_CLIENT: {
    subject: 'Update on Your Reservation',
    buildHtml: (ctx) => {
      const details = detailsTable([
        detailRow('Property', ctx.propertyName),
        detailRow('Reason', ctx.rejectionReason),
      ]);
      return `
        <h2 style="margin:0 0 8px;font-size:20px;color:#1E4DCC;">Reservation Update</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Dear ${ctx.clientFirstName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#333333;line-height:1.5;">Unfortunately, your reservation could not be approved at this time.</p>
        ${details}
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Please contact our team for more information.</p>
        <p style="margin:16px 0 0;font-size:14px;color:#333333;line-height:1.5;">Warm regards,<br><strong style="color:#1E4DCC;">Step In Property</strong></p>`;
    },
    buildText: (ctx) =>
      [`Dear ${ctx.clientFirstName},`, ``, `Unfortunately, your reservation could not be approved at this time.`,
        ctx.propertyName ? `Property: ${ctx.propertyName}` : '',
        ctx.rejectionReason ? `Reason: ${ctx.rejectionReason}` : '',
        ``, `Please contact our team for more information.`,
        ``, `Warm regards,`, `Step In Property`].filter(Boolean).join('\n'),
  },
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter = this.buildTransport();

  private buildTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : undefined;
    if (!host || !port) {
      this.logger.warn(
        'SMTP configuration missing: set SMTP_HOST and SMTP_PORT',
      );
      return null;
    }

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  /** Sends a notification email using a registered template key. */
  async sendNotificationEmail(
    type: NotificationType,
    recipients: string[],
    context: EmailContext,
  ) {
    await this.dispatch(type, recipients, context);
  }

  /** Sends an email using a registered template key. */
  async sendEmail(templateKey: string, recipients: string[], context: EmailContext) {
    await this.dispatch(templateKey, recipients, context);
  }

  private async dispatch(templateKey: string, recipients: string[], context: EmailContext) {
    if (!this.transporter) {
      this.logger.warn('Transporter not configured, email not sent');
      return;
    }

    const to = recipients.filter(Boolean);
    if (!to.length) {
      this.logger.warn('No recipients for notification email. Skipped.');
      return;
    }

    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) {
      this.logger.warn(`No email template found for key: ${templateKey}`);
      return;
    }

    const from = `"Step In Property" <${process.env.SMTP_FROM || 'no-reply@stepinproperty.qa'}>`;
    const bodyHtml = template.buildHtml(context);
    const html = wrapLayout(template.subject, bodyHtml);
    const text = template.buildText(context);

    try {
      const info = await this.transporter.sendMail({ from, to, subject: template.subject, html, text });
      this.logger.log(`[${templateKey}] email sent to: ${to.join(', ')} (${info.messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send [${templateKey}] email`, error as Error);
    }
  }
}
