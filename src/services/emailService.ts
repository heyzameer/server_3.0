import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { IEmailService } from '../interfaces/IService/IEmailService';
import config from '../config';
import { injectable } from 'tsyringe';
import { otpEmailHtml } from '../templates/email/otpTemplate';
import { customEmailHtml } from '../templates/email/customTemplate';
import { ResponseMessages } from '../enums/ResponseMessages';

dotenv.config();
/**
 * EmailService class to handle email operations.
 */
@injectable()
export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
      },
    });
  }

  /**
   * 
   * @param to 
   * @param otp 
   * @param subject
   * @param message
   * Sends an OTP email to the specified address.
   */
  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const subject = 'Verify Your travel Account';
    const text = `Hello,\n\nThank you for joining Travel! Your One-Time Password (OTP) to verify your email is: ${otp}\n\nThis OTP is valid for 5 minutes. Please enter it in the app to complete your registration.\n\nRegards,\nAjmal - Travel Team`;

    const html = otpEmailHtml(otp);

    const mailOptions = {
      from: `"Travel Team" <${config.email.auth.user}>`,
      to,
      subject,
      text,
      html,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error(`Error sending email to ${to}:`, error);
      throw new Error(ResponseMessages.OTP_EMAIL_SEND_FAILED);
    }
  }

  /**
   * 
   * @param email 
   * @param subject 
   * @param message 
   * @returns 
   */
  sendCustomEmail(email: string, subject: string, message: string): Promise<void> {
    const mailOptions = {
      from: `"Travel Team" <${config.email.auth.user}>`,
      to: email,
      subject,
      text: message,
      html: customEmailHtml(subject, message),
    };
    return this.transporter.sendMail(mailOptions).then(info => {
      console.log(`Email sent to ${email}: ${info.messageId}`);
    }
    ).catch(error => {
      console.error(`Error sending email to ${email}:`, error);
      throw new Error(ResponseMessages.EMAIL_SEND_FAILED);
    });
  }

}