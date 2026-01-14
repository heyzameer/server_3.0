import { Document, Types } from 'mongoose';

export interface IPartner extends Document {
  // 1. Identity
  partnerId: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  profilePicture?: string;

  // 2. References
  addressId?: Types.ObjectId;
  vehicleId?: Types.ObjectId;
  ratingId?: Types.ObjectId;
  preferenceId?: Types.ObjectId;
  walletId?: Types.ObjectId;

  // 3. Personal Documents
  personalDocuments?: {
    
      aadharFront?: string;
      aadharBack?: string;
      aadharStatus?: string;
      aadharRejectionReason?: string;
    
   
      panFront?: string;
      panBack?: string;
      panStatus?: string;
      panRejectionReason?: string;
 
    
      licenseFront?: string;
      licenseBack?: string;
      licenseStatus?: string;
      licenseRejectionReason?: string;
    
  };

  // 4. Bank Details
  bankingDetails?: {
    bankingStatus?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };

  // 5. Vehicle Details
  vehicalDocuments?: {
    insuranceDocument?: string;
    pollutionDocument?: string;
    insuranceStatus?: string;
    pollutionStatus?: string;
    insuranceRejectionReason?: string;
    pollutionRejectionReason?: string;
    registrationNumber?: string;
    vehicleType?: string;
  };

  // 6. Status & Activity
  isAvailable?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  status?: boolean;
  hasPendingRequest?: boolean;
  lastSeen?: Date;
  lastRequestTime?: Date;
  lastLocationUpdate?: Date;
  lastOnline?: Date;
  lastLoginAt?: Date;
  currentOrderId?: string;

  // 7. Completion Status
  bankDetailsCompleted?: boolean;
  personalDocumentsCompleted?: boolean;
  vehicleDetailsCompleted?: boolean;

  // 8. Order Stats
  totalOrders?: number;
  ongoingOrders?: number;
  completedOrders?: number;
  canceledOrders?: number;

  // 9. Location (if you need geolocation)
  location?: {
    type: {
      type: string;
      enum: ['Point'];
      default: 'Point';
    };
    coordinates: {
      type: [number]; // [longitude, latitude]
      default: [0, 0];
    };
  };

  // Timestamps (automatically added by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;
}
