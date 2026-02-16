import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IPaymentService } from '../interfaces/IService/IPaymentService';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';

@injectable()
export class PaymentController {
    constructor(
        @inject('PaymentService') private paymentService: IPaymentService
    ) { }

    createOrder = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId, amount, currency } = req.body;

        if (!bookingId || amount === undefined || amount === null) {
            return sendError(res, `Booking ID (${bookingId}) and amount (${amount}) are required`, HttpStatus.BAD_REQUEST);
        }

        const order = await this.paymentService.createRazorpayOrder(bookingId, amount, currency);
        sendSuccess(res, 'Razorpay order created successfully', order);
    });

    verifyPayment = asyncHandler(async (req: Request, res: Response) => {
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return sendError(res, 'All payment details are required', HttpStatus.BAD_REQUEST);
        }

        const isValid = await this.paymentService.verifyRazorpayPayment(
            bookingId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature
        );

        if (isValid) {
            sendSuccess(res, 'Payment verified successfully', { success: true });
        } else {
            sendError(res, 'Payment verification failed', HttpStatus.BAD_REQUEST);
        }
    });
}
