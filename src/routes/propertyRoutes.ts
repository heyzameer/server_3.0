import { Router } from 'express';
import { PropertyController } from '../controllers/PropertyController';
import { container } from '../container/container';
import { authenticatePartner } from '../middleware/partnerAuth';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';
import {
    propertyOwnershipUpload,
    propertyTaxUpload,
    propertyImagesUpload,
    handleUploadError
} from '../middleware/upload';

const router = Router();
const propertyController = container.resolve(PropertyController);

// Public Routes
router.get('/public', propertyController.getPublicProperties);
router.get('/details/:id', propertyController.getPublicPropertyById); // Public details route
router.get('/search', propertyController.searchProperties);

// Partner Routes
router.use(authenticatePartner);

router.post('/', propertyController.createProperty);
router.get('/partner-properties', propertyController.getPartnerProperties);
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', propertyController.updateProperty);
router.delete('/:id', propertyController.deleteProperty);

// Onboarding Steps
router.get('/:id/onboarding-status', propertyController.getOnboardingStatus);
router.patch('/:id/details', propertyController.registerPropertyDetails);
router.patch('/:id/ownership', propertyOwnershipUpload, handleUploadError, propertyController.uploadOwnershipDocuments);
router.patch('/:id/tax', propertyTaxUpload, handleUploadError, propertyController.uploadTaxDocuments);
router.patch('/:id/banking', propertyController.uploadBankingDetails);
router.patch('/:id/images', propertyImagesUpload, handleUploadError, propertyController.uploadPropertyImages);

// Admin Routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));
router.patch('/:id/document-status', propertyController.updateDocumentStatus);
router.patch('/:id/verify', propertyController.verifyProperty);

export default router;
