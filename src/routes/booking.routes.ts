import { Router } from 'express';
import { container } from 'tsyringe';
import { BookingController } from '../controllers/BookingController';
import { authenticate } from '../middleware/auth';

const router = Router();
const bookingController = container.resolve(BookingController);

// User routes (authenticated)
router.post('/calculate-price', authenticate, bookingController.calculatePrice.bind(bookingController));
router.post('/', authenticate, bookingController.createBooking.bind(bookingController));
router.get('/:bookingId', authenticate, bookingController.getBookingById.bind(bookingController));
router.get('/users/me/bookings', authenticate, bookingController.getUserBookings.bind(bookingController));

export default router;
