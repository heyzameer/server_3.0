import { Router } from 'express';
import { container } from '../container/container';
import { PaymentController } from '../controllers/PaymentController';
import { authenticate } from '../middleware/auth';

const router = Router();
const paymentController = container.resolve(PaymentController);

// All payment routes require authentication
router.use(authenticate);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);

export default router;
