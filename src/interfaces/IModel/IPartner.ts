import { Document } from 'mongoose';

export interface IPartner extends Document {
  // 1. Identity
  partnerId: string;
  password: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date;
  profilePicture?: string;

  // 2. Aadhaar Verification (Personal Documents)
  personalDocuments?: {
    aadharFront?: string;
    aadharBack?: string;
    aadharStatus?: string;
    aadharRejectionReason?: string;
  };

  // 3. Extracted Aadhaar Details (Encrypted)
  aadharDetails?: {
    aadharNumber?: string;
    fullName?: string;
    dob?: string;
    gender?: string;
  };

  // 4. Bank Details (Optional - for partner account)
  bankingDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };

  // 4. Status & Activity
  isActive?: boolean;
  isVerified?: boolean;
  status?: string;
  aadhaarVerified?: boolean;
  verifiedAt?: Date;
  lastOnline?: Date;
  lastLoginAt?: Date;

  // 5. Property Management
  totalProperties?: number;
  maxProperties?: number;

  // 6. Timestamps (automatically added by Mongoose)
  createdAt?: Date;
  updatedAt?: Date;

  // 7. Methods
  canAddProperty(): boolean;
  getRemainingPropertySlots(): number;
  isAadhaarVerified(): boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}


