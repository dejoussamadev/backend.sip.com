import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { NotificationType } from '@prisma/client';

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
}

const EMAIL_TEMPLATES: Record<
  NotificationType,
  { subject: string; buildBody: (ctx: EmailContext) => string }
> = {
  [NotificationType.PROPERTY_CREATED]: {
    subject: 'New Property Pending Validation',
    buildBody: (ctx) =>
      [
        `Reference: ${ctx.referenceNumber}`,
        `Property Name: ${ctx.propertyName}`,
        `Agent: ${ctx.agentName}`,
        ctx.price !== undefined ? `Price: ${ctx.price}` : null,
        ctx.status ? `Status: ${ctx.status}` : null,
        '',
        'A new property has been created and requires validation.',
        'Please log in to review and approve it.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  [NotificationType.PROPERTY_UPDATED]: {
    subject: 'Property Updated',
    buildBody: (ctx) =>
      [
        `Reference: ${ctx.referenceNumber}`,
        `Property Name: ${ctx.propertyName}`,
        `Updated by: ${ctx.agentName}`,
        '',
        'A property has been updated.',
        'Please log in to review the changes.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  [NotificationType.PROPERTY_DELETED]: {
    subject: 'Property Deleted',
    buildBody: (ctx) =>
      [
        `Reference: ${ctx.referenceNumber}`,
        `Property Name: ${ctx.propertyName}`,
        `Deleted by: ${ctx.agentName}`,
        '',
        'A property has been deleted from the system.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  [NotificationType.AGENT_CREATED]: {
    subject: 'New Agent Created',
    buildBody: (ctx) =>
      [
        `Agent Name: ${ctx.agentName}`,
        `Agent Code: ${ctx.agentCode}`,
        '',
        'A new agent has been created.',
        'Please log in to review the details.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  [NotificationType.AGENT_UPDATED]: {
    subject: 'Agent Profile Updated',
    buildBody: (ctx) =>
      [
        `Agent Name: ${ctx.agentName}`,
        `Agent Code: ${ctx.agentCode}`,
        '',
        'An agent profile has been updated.',
        'Please log in to review the changes.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  [NotificationType.AGENT_DELETED]: {
    subject: 'Agent Deleted',
    buildBody: (ctx) =>
      [
        `Agent Name: ${ctx.agentName}`,
        `Agent Code: ${ctx.agentCode}`,
        '',
        'An agent has been deleted from the system.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  LOGIN_REQUEST_CREATED: {
    subject: 'New Device Login Request',
    buildBody: (ctx) =>
      [
        `User: ${ctx.userName}`,
        `Email: ${ctx.userEmail}`,
        `Fingerprint: ${ctx.fingerprint}`,
        ctx.deviceName ? `Device: ${ctx.deviceName}` : null,
        ctx.browser ? `Browser: ${ctx.browser}` : null,
        ctx.operatingSystem ? `OS: ${ctx.operatingSystem}` : null,
        ctx.platform ? `Platform: ${ctx.platform}` : null,
        ctx.ipAddress ? `IP Address: ${ctx.ipAddress}` : null,
        '',
        'A user attempted to log in from a new device.',
        'Please review and approve or reject this login request in the admin panel.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  LOGIN_REQUEST_APPROVED: {
    subject: 'Your Login Request Was Approved',
    buildBody: (ctx) =>
      [
        `User: ${ctx.userName}`,
        `Email: ${ctx.userEmail}`,
        ctx.deviceName ? `Device: ${ctx.deviceName}` : null,
        ctx.browser ? `Browser: ${ctx.browser}` : null,
        ctx.operatingSystem ? `OS: ${ctx.operatingSystem}` : null,
        ctx.platform ? `Platform: ${ctx.platform}` : null,
        ctx.ipAddress ? `IP Address: ${ctx.ipAddress}` : null,
        ctx.reviewerName ? `Reviewed by: ${ctx.reviewerName}` : null,
        '',
        'Your login request for this device has been approved.',
        'You can now sign in from this device.',
      ]
        .filter(Boolean)
        .join('\n'),
  },
  LOGIN_REQUEST_REJECTED: {
    subject: 'Your Login Request Was Rejected',
    buildBody: (ctx) =>
      [
        `User: ${ctx.userName}`,
        `Email: ${ctx.userEmail}`,
        ctx.deviceName ? `Device: ${ctx.deviceName}` : null,
        ctx.browser ? `Browser: ${ctx.browser}` : null,
        ctx.operatingSystem ? `OS: ${ctx.operatingSystem}` : null,
        ctx.platform ? `Platform: ${ctx.platform}` : null,
        ctx.ipAddress ? `IP Address: ${ctx.ipAddress}` : null,
        ctx.reviewerName ? `Reviewed by: ${ctx.reviewerName}` : null,
        '',
        'Your login request for this device has been rejected.',
        'Please contact an administrator if you think this was a mistake.',
      ]
        .filter(Boolean)
        .join('\n'),
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

  async sendNotificationEmail(
    type: NotificationType,
    recipients: string[],
    context: EmailContext,
  ) {
    if (!this.transporter) {
      this.logger.warn('Transporter not configured, email not sent');
      return;
    }

    const to = recipients.filter(Boolean);
    if (!to.length) {
      this.logger.warn('No recipients for notification email. Skipped.');
      return;
    }

    const template = EMAIL_TEMPLATES[type];
    const from = process.env.SMTP_FROM || 'no-reply@sip.com';

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject: template.subject,
        text: template.buildBody(context),
      });
      this.logger.log(
        `[${type}] email sent to: ${to.join(', ')} (${info.messageId})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send [${type}] email`, error as Error);
    }
  }
}
