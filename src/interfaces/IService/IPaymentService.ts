export interface IPaymentService {
    createRazorpayOrder(bookingId: string, amount: number, currency: string): Promise<any>;
    verifyRazorpayPayment(
        bookingId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string
    ): Promise<boolean>;
}
