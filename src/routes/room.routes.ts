import { Router } from 'express';
import { RoomController } from '../controllers/RoomController';
import { authenticatePartner } from '../middleware/partnerAuth';
import { upload } from '../middleware/upload';

const router = Router({ mergeParams: true });

// Routes for /api/v1/properties/:propertyId/rooms
// OR /api/v1/rooms based on mount point. 

// Public routes for consumers
router.get('/', RoomController.getRooms); // Public - consumers need to see rooms
router.get('/:roomId/availability', RoomController.getAvailabilityCalendar); // Public - consumers need to check availability

// Partner-only routes
router.post('/', authenticatePartner, RoomController.createRoom);

// Direct room operations
router.get('/:roomId', authenticatePartner, RoomController.getRoomById);
router.patch('/:roomId', authenticatePartner, RoomController.updateRoom);
router.delete('/:roomId', authenticatePartner, RoomController.deleteRoom);

// Images
router.post('/:roomId/images', authenticatePartner, upload.array('images', 10), RoomController.uploadRoomImages);

// ============ AVAILABILITY MANAGEMENT ============
// Manually block dates
router.post('/:roomId/block-dates', authenticatePartner, RoomController.blockDates);

// Unblock manually blocked dates
router.delete('/:roomId/unblock-dates', authenticatePartner, RoomController.unblockDates);

// Set custom pricing for specific dates
router.put('/:roomId/custom-pricing', authenticatePartner, RoomController.setCustomPricing);

export default router;
