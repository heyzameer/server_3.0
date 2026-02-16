import { Router } from 'express';
import { container } from 'tsyringe';
import { MealPlanController } from '../controllers/MealPlanController';
import { authenticatePartner } from '../middleware/partnerAuth';

const router = Router({ mergeParams: true });
const mealPlanController = container.resolve(MealPlanController);

// Routes for specific property: /api/v1/properties/:propertyId/meal-plans
router.post(
    '/',
    authenticatePartner,
    mealPlanController.createMealPlan
);

router.get(
    '/',
    authenticatePartner,
    mealPlanController.getMealPlans
);

// ID-based routes, we need to handle these carefully if mounted under propertyId
// Actually, in index.ts I mounted:
// router.use('/properties/:propertyId/meal-plans', mealPlanRoutes);
// So these would be /properties/:propertyId/meal-plans/:mealPlanId
// But the controller expects :mealPlanId param.
// Use simpler separate mount or nesting.
// Let's add specific routes here.

router.get(
    '/:mealPlanId',
    authenticatePartner,
    mealPlanController.getMealPlanById
);

router.patch(
    '/:mealPlanId',
    authenticatePartner,
    mealPlanController.updateMealPlan
);

router.delete(
    '/:mealPlanId',
    authenticatePartner,
    mealPlanController.deleteMealPlan
);

export const mealPlanRoutes = router;
