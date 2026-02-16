import { Router } from 'express';
import { container } from 'tsyringe';
import { BookingController } from '../controllers/BookingController';
import { authenticate } from '../middleware/auth';

const router = Router();
const bookingController = container.resolve(BookingController);

// User routes (authenticated)
router.post('/calculate-price', authenticate, bookingController.calculatePrice);
router.post('/', authenticate, bookingController.createBooking);
router.get('/users/me/bookings', authenticate, bookingController.getUserBookings);
router.get('/:bookingId', authenticate, bookingController.getBookingById);
router.post('/:bookingId/cancel', authenticate, bookingController.cancelBooking);
router.post('/:bookingId/refund-request', authenticate, bookingController.requestRefund);

export default router;
