import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { IEmailService } from '../interfaces/IService/IEmailService';
import config from '../config';
import { injectable } from 'tsyringe';
import { otpEmailHtml } from '../templates/email/otpTemplate';
import { customEmailHtml } from '../templates/email/customTemplate';

dotenv.config();

/**
 * EmailService class to handle email operations.
 */
@injectable()
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isDevMode: boolean = false;

  constructor() {
    if (config.email.auth.user && config.email.auth.pass) {
      this.transporter = nodemailer.createTransport({
        service: config.email.service,
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass,
        },
      });
    } else {
      console.warn('⚠️ EmailService: No SMTP credentials found. Running in Dev Mode (logging emails to console).');
      this.isDevMode = true;
    }
  }

  /**
   * Universal send email method
   */
  async sendEmail(options: { to: string; subject: string; text?: string; html?: string }): Promise<void> {
    if (this.isDevMode || !this.transporter) {
      console.log('📧 [DEV MODE] Sending Email:');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Text: ${options.text || '(no text version)'}`);
      // Don't log full HTML to avoid clutter, maybe just a snippet
      console.log(`HTML: ${options.html ? '(HTML content present)' : '(no html)'}`);
      return;
    }

    const mailOptions = {
      from: `"Travel Team" <${config.email.auth.user}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${options.to}: ${info.messageId}`);
    } catch (error) {
      console.error(`Error sending email to ${options.to}:`, error);
      // In production, we might want to throw, but for now we'll log
      // throw new Error(ResponseMessages.EMAIL_SEND_FAILED);
    }
  }

  /**
   * Sends an OTP email to the specified address.
   */
  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Verify Your travel Account';
    const text = `Hello,\n\nThank you for joining Travel! Your One-Time Password (OTP) to verify your email is: ${otp}\n\nThis OTP is valid for 5 minutes. Please enter it in the app to complete your registration.\n\nRegards,\nAjmal - Travel Team`;
    const html = otpEmailHtml(otp);

    await this.sendEmail({ to, subject, text, html });
  }

  /**
   * Sends a custom email
   */
  async sendCustomEmail(email: string, subject: string, message: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject,
      text: message,
      html: customEmailHtml(subject, message)
    });
  }
}