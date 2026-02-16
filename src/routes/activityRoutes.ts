import { Router } from 'express';
import { container } from 'tsyringe';
import { ActivityController } from '../controllers/ActivityController';
import { authenticatePartner } from '../middleware/partnerAuth';

const router = Router({ mergeParams: true });
const activityController = container.resolve(ActivityController);

// Routes for specific property: /api/v1/properties/:propertyId/activities
router.post(
    '/',
    authenticatePartner,
    activityController.createActivity
);

router.get(
    '/',
    authenticatePartner,
    activityController.getActivities
);

router.get(
    '/:activityId',
    authenticatePartner,
    activityController.getActivityById
);

router.patch(
    '/:activityId',
    authenticatePartner,
    activityController.updateActivity
);

router.delete(
    '/:activityId',
    authenticatePartner,
    activityController.deleteActivity
);

export const activityRoutes = router;
