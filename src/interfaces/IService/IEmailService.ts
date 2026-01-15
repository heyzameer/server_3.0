export interface IEmailService {
  sendOtpEmail(email: string, otp: string): Promise<void>;
  sendCustomEmail(email: string, subject: string, message: string): Promise<void>;
}