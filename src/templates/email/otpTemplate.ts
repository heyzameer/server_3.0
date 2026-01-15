export function otpEmailHtml(otp: string, year: number = new Date().getFullYear()): string {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
      .header { background-color: #1e3a8a; color: #ffffff; padding: 20px; text-align: center; }
      .logo { font-size: 24px; font-weight: bold; }
      .logo span { color: #f87171; }
      .content { padding: 20px; color: #374151; }
      .otp { font-size: 24px; font-weight: bold; color: #1e3a8a; text-align: center; margin: 20px 0; }
      .footer { background-color: #f3f4f6; padding: 10px; text-align: center; font-size: 14px; color: #6b7280; }
      .button { display: inline-block; padding: 10px 20px; background-color: #1e3a8a; color: #ffffff; text-decoration: none; border-radius: 4px; margin-top: 20px; }
      .button:hover { background-color: #1e40af; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Travel<span>Hub</span></div>
      </div>
      <div class="content">
        <h1>Welcome to Travel!</h1>
        <p>Hello,</p>
        <p>Thank you for joining Travel! To complete your registration, please use the following One-Time Password (OTP) to verify your email address:</p>
        <div class="otp">${otp}</div>
        <p>This OTP is valid for 5 minutes. Enter it in the Travel app to activate your account.</p>
        <a href="http://localhost:3000/otp-verification" class="button">Verify Now</a>
      </div>
      <div class="footer">
        <p>Regards,<br/>Zameer - Travel Team</p>
        <p>&copy; ${year} Travel. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>
  `;
}
