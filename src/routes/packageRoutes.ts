import { Router } from 'express';
import { container } from 'tsyringe';
import { PackageController } from '../controllers/PackageController';
import { authenticatePartner } from '../middleware/partnerAuth';

const router = Router({ mergeParams: true });
const packageController = container.resolve(PackageController);

// Routes for specific property: /api/v1/properties/:propertyId/packages
router.post(
    '/',
    authenticatePartner,
    packageController.createPackage
);

router.get(
    '/',
    authenticatePartner,
    packageController.getPackages
);

router.get(
    '/:packageId',
    authenticatePartner,
    packageController.getPackageById
);

router.patch(
    '/:packageId',
    authenticatePartner,
    packageController.updatePackage
);

router.delete(
    '/:packageId',
    authenticatePartner,
    packageController.deletePackage
);

export const packageRoutes = router;
