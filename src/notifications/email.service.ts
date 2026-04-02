import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface PropertyCreatedEmailPayload {
  referenceNumber: string;
  name: string;
  agentName: string;
  price?: number;
  status?: string;
}

interface LoginRequestEmailPayload {
  userName: string;
  userEmail: string;
  fingerprint: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
  platform?: string;
  ipAddress?: string | null;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter = this.buildTransport();

  private buildTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    if (!host || !port) {
      this.logger.warn('SMTP configuration missing: set SMTP_HOST and SMTP_PORT');
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

  async sendPropertyCreatedEmail(recipients: string[], payload: PropertyCreatedEmailPayload) {
    if (!this.transporter) {
      this.logger.warn('Transporter not configured, email not sent');
      return;
    }

    const to = recipients.filter(Boolean);
    if (!to.length) {
      this.logger.warn('No admin recipients found. Email skipped.');
      return;
    }

    const from = process.env.SMTP_FROM || 'no-reply@sip.com';
    const subject = 'New Property Pending Validation';

    const lines = [
      `Reference: ${payload.referenceNumber}`,
      `Property Name: ${payload.name}`,
      `Agent: ${payload.agentName}`,
      payload.price !== undefined ? `Price: ${payload.price}` : null,
      payload.status ? `Status: ${payload.status}` : null,
      '',
      'This property has been created by an agent and requires validation.',
      'Please log in to review and approve it.',
    ].filter(Boolean);

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: lines.join('\n'),
      });
      this.logger.log(`Property creation email sent to admins: ${to.join(', ')}`);
      this.logger.log(`Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send property creation email', error as Error);
    }
  }

  async sendLoginRequestEmail(
    recipients: string[],
    payload: LoginRequestEmailPayload,
  ) {
    if (!this.transporter) {
      this.logger.warn('Transporter not configured, email not sent');
      return;
    }

    const to = recipients.filter(Boolean);
    if (!to.length) {
      this.logger.warn('No admin recipients found. Email skipped.');
      return;
    }

    const from = process.env.SMTP_FROM || 'no-reply@sip.com';
    const subject = 'New Device Login Request';

    const lines = [
      `User: ${payload.userName}`,
      `Email: ${payload.userEmail}`,
      `Fingerprint: ${payload.fingerprint}`,
      payload.deviceName ? `Device: ${payload.deviceName}` : null,
      payload.browser ? `Browser: ${payload.browser}` : null,
      payload.operatingSystem ? `OS: ${payload.operatingSystem}` : null,
      payload.platform ? `Platform: ${payload.platform}` : null,
      payload.ipAddress ? `IP Address: ${payload.ipAddress}` : null,
      '',
      'A user attempted to log in from a new device.',
      'Please review and approve or reject this login request in the admin panel.',
    ].filter(Boolean);

    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text: lines.join('\n'),
      });
      this.logger.log(`Login request email sent to admins: ${to.join(', ')}`);
      this.logger.log(`Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send login request email', error as Error);
    }
  }
}
