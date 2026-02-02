import { injectable, inject } from 'tsyringe';
import { IBooking } from '../interfaces/IModel/IBooking';
import { IUser } from '../interfaces/IModel/IUser';
import { IEmailService } from '../interfaces/IService/IEmailService';

export interface IEmailNotificationService {
    sendBookingConfirmation(booking: IBooking, user: IUser): Promise<void>;
    sendBookingApproval(booking: IBooking, user: IUser): Promise<void>;
    sendBookingRejection(booking: IBooking, user: IUser, reason: string): Promise<void>;
}

@injectable()
export class EmailNotificationService implements IEmailNotificationService {
    constructor(
        @inject('EmailService') private emailService: IEmailService
    ) { }

    /**
     * Send booking confirmation email (awaiting partner approval)
     */
    async sendBookingConfirmation(booking: IBooking, user: IUser): Promise<void> {
        const property = booking.propertyId as any;

        const html = this.getBookingConfirmationTemplate(booking, user, property);

        await this.emailService.sendEmail({
            to: user.email,
            subject: `Booking Confirmation - ${booking.bookingId}`,
            text: `Your booking ${booking.bookingId} has been received and is pending approval.`,
            html
        });
    }

    /**
     * Send booking approval email
     */
    async sendBookingApproval(booking: IBooking, user: IUser): Promise<void> {
        const property = booking.propertyId as any;

        const html = this.getBookingApprovalTemplate(booking, user, property);

        await this.emailService.sendEmail({
            to: user.email,
            subject: `Booking Confirmed! - ${booking.bookingId}`,
            text: `Great news! Your booking ${booking.bookingId} has been confirmed.`,
            html
        });
    }

    /**
     * Send booking rejection email
     */
    async sendBookingRejection(booking: IBooking, user: IUser, reason: string): Promise<void> {
        const property = booking.propertyId as any;

        const html = this.getBookingRejectionTemplate(booking, user, property, reason);

        await this.emailService.sendEmail({
            to: user.email,
            subject: `Booking Request Declined - ${booking.bookingId}`,
            text: `Unfortunately, your booking request ${booking.bookingId} has been declined.`,
            html
        });
    }

    /**
     * Booking Confirmation Email Template
     */
    private getBookingConfirmationTemplate(booking: IBooking, user: IUser, property: any): string {
        const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
        const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString();

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #6b7280; }
        .value { color: #1f2937; }
        .status-badge { display: inline-block; padding: 6px 12px; background: #fbbf24; color: #78350f; border-radius: 4px; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Booking Received!</h1>
            <p>Thank you for choosing TravelHub</p>
        </div>
        <div class="content">
            <p>Hello ${user.firstName || 'Traveler'},</p>
            <p>Your booking request has been successfully received and is currently pending approval from the property owner.</p>
            
            <div class="booking-info">
                <h3 style="margin-top: 0; color: #ef4444;">Booking Details</h3>
                <div class="info-row">
                    <span class="label">Booking ID:</span>
                    <span class="value">${booking.bookingId}</span>
                </div>
                <div class="info-row">
                    <span class="label">Property:</span>
                    <span class="value">${property.propertyName || 'Property'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-in:</span>
                    <span class="value">${checkInDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-out:</span>
                    <span class="value">${checkOutDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Guests:</span>
                    <span class="value">${booking.totalGuests}</span>
                </div>
                <div class="info-row">
                    <span class="label">Total Amount:</span>
                    <span class="value">₹${booking.finalPrice.toLocaleString()}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                    <span class="label">Status:</span>
                    <span class="status-badge">⏳ Pending Approval</span>
                </div>
            </div>

            <p><strong>What's next?</strong></p>
            <ul>
                <li>The property owner will review your booking request</li>
                <li>You'll receive an email notification once they approve or respond</li>
                <li>This typically takes 12-24 hours</li>
            </ul>

            <div class="footer">
                <p>Questions? Reply to this email or contact us at support@travelhub.com</p>
                <p>&copy; ${new Date().getFullYear()} TravelHub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Booking Approval Email Template
     */
    private getBookingApprovalTemplate(booking: IBooking, user: IUser, property: any): string {
        const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
        const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString();

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #6b7280; }
        .value { color: #1f2937; }
        .status-badge { display: inline-block; padding: 6px 12px; background: #10b981; color: white; border-radius: 4px; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Booking Confirmed!</h1>
            <p>Your stay is all set</p>
        </div>
        <div class="content">
            <p>Hello ${user.firstName || 'Traveler'},</p>
            <p>Great news! Your booking has been confirmed by the property owner. We can't wait to host you!</p>
            
            <div class="booking-info">
                <h3 style="margin-top: 0; color: #10b981;">Booking Details</h3>
                <div class="info-row">
                    <span class="label">Booking ID:</span>
                    <span class="value">${booking.bookingId}</span>
                </div>
                <div class="info-row">
                    <span class="label">Property:</span>
                    <span class="value">${property.propertyName || 'Property'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-in:</span>
                    <span class="value">${checkInDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Check-out:</span>
                    <span class="value">${checkOutDate}</span>
                </div>
                <div class="info-row">
                    <span class="label">Guests:</span>
                    <span class="value">${booking.totalGuests}</span>
                </div>
                <div class="info-row">
                    <span class="label">Total Paid:</span>
                    <span class="value">₹${booking.finalPrice.toLocaleString()}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                    <span class="label">Status:</span>
                    <span class="status-badge">✓ Confirmed</span>
                </div>
            </div>

            <p><strong>Before you arrive:</strong></p>
            <ul>
                <li>Standard check-in time is 2:00 PM</li>
                <li>Standard check-out time is 11:00 AM</li>
                <li>Bring a valid photo ID</li>
                <li>Contact the property for any special requests</li>
            </ul>

            <div class="footer">
                <p>Have a wonderful stay! Questions? Reply to this email</p>
                <p>&copy; ${new Date().getFullYear()} TravelHub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Booking Rejection Email Template
     */
    private getBookingRejectionTemplate(booking: IBooking, user: IUser, property: any, reason: string): string {
        const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
        const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString();

        return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-info { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: bold; color: #6b7280; }
        .value { color: #1f2937; }
        .reason-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Request Declined</h1>
        </div>
        <div class="content">
            <p>Hello ${user.firstName || 'Traveler'},</p>
            <p>We regret to inform you that your booking request could not be confirmed at this time.</p>
            
            <div class="booking-info">
                <h3 style="margin-top: 0; color: #ef4444;">Booking Details</h3>
                <div class="info-row">
                    <span class="label">Booking ID:</span>
                    <span class="value">${booking.bookingId}</span>
                </div>
                <div class="info-row">
                    <span class="label">Property:</span>
                    <span class="value">${property.propertyName || 'Property'}</span>
                </div>
                <div class="info-row">
                    <span class="label">Dates:</span>
                    <span class="value">${checkInDate} - ${checkOutDate}</span>
                </div>
            </div>

            <div class="reason-box">
                <strong>Reason:</strong> ${reason || 'Not available for selected dates'}
            </div>

            <p><strong>What you can do:</strong></p>
            <ul>
                <li>Your payment will be refunded within 5-7 business days</li>
                <li>Try searching for other properties in the same location</li>
                <li>Contact us for alternative recommendations</li>
            </ul>

            <div style="text-align: center;">
                <a href="https://travelhub.com/search" class="button">Find Alternative Properties</a>
            </div>

            <div class="footer">
                <p>We apologize for the inconvenience. Contact support@travelhub.com for assistance</p>
                <p>&copy; ${new Date().getFullYear()} TravelHub. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }
}
