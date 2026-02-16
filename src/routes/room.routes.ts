import { Router } from 'express';
import { container } from 'tsyringe';
import { RoomController } from '../controllers/RoomController';
import { authenticatePartner } from '../middleware/partnerAuth';
import { upload } from '../middleware/upload';

const router = Router({ mergeParams: true });
const roomController = container.resolve(RoomController);

// Routes for /api/v1/properties/:propertyId/rooms
// OR /api/v1/rooms based on mount point. 

// Public routes for consumers
router.get('/', roomController.getRooms); // Public - consumers need to see rooms
router.get('/:roomId/availability', roomController.getAvailabilityCalendar); // Public - consumers need to check availability

// Partner-only routes
router.post('/', authenticatePartner, roomController.createRoom);

// Direct room operations
router.get('/:roomId', authenticatePartner, roomController.getRoomById);
router.patch('/:roomId', authenticatePartner, roomController.updateRoom);
router.delete('/:roomId', authenticatePartner, roomController.deleteRoom);

// Images
router.post('/:roomId/images', authenticatePartner, upload.array('images', 10), roomController.uploadRoomImages);

// ============ AVAILABILITY MANAGEMENT ============
// Manually block dates
router.post('/:roomId/block-dates', authenticatePartner, roomController.blockDates);

// Unblock manually blocked dates
router.delete('/:roomId/unblock-dates', authenticatePartner, roomController.unblockDates);

// Set custom pricing for specific dates
router.put('/:roomId/custom-pricing', authenticatePartner, roomController.setCustomPricing);

export default router;
