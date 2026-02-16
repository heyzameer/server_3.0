import Razorpay from 'razorpay';
import crypto from 'crypto';
import { injectable } from 'tsyringe';
import { IPaymentService } from '../interfaces/IService/IPaymentService';
import { Booking } from '../models/Booking';
import { createError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import { ResponseMessages } from '../enums/ResponseMessages';
import { logger } from '../utils/logger';

@injectable()
export class PaymentService implements IPaymentService {
    private razorpay: Razorpay;

    constructor() {
        this.razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });
    }

    async createRazorpayOrder(bookingId: string, amount: number, currency: string = 'INR'): Promise<any> {
        try {
            const booking = await Booking.findById(bookingId);
            if (!booking) {
                throw createError(ResponseMessages.BOOKING_NOT_FOUND, HttpStatus.NOT_FOUND);
            }

            const options = {
                amount: Math.round(amount * 100), // amount in the smallest currency unit (paise)
                currency,
                receipt: booking.bookingId,
            };

            const order = await this.razorpay.orders.create(options);
            return order;
        } catch (error) {
            logger.error('Failed to create Razorpay order:', error);
            throw error;
        }
    }

    async verifyRazorpayPayment(
        bookingId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string
    ): Promise<boolean> {
        try {
            const body = razorpayOrderId + "|" + razorpayPaymentId;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
                .update(body.toString())
                .digest("hex");

            const isSignatureValid = expectedSignature === razorpaySignature;

            if (isSignatureValid) {
                const booking = await Booking.findById(bookingId);
                if (booking) {
                    booking.paymentStatus = 'completed';
                    booking.status = 'payment_completed';
                    booking.paymentId = razorpayPaymentId;
                    await booking.save();

                    logger.info(`Payment verified and booking ${booking.bookingId} confirmed.`);
                }
                return true;
            } else {
                logger.warn(`Invalid Razorpay signature for booking ${bookingId}`);
                return false;
            }
        } catch (error) {
            logger.error('Failed to verify Razorpay payment:', error);
            throw error;
        }
    }
}
