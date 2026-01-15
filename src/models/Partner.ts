import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IPartner } from '../interfaces/IModel/IPartner';

export enum PartnerStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

const deliveryPartnerSchema = new Schema<IPartner>({
  // ============================================
  // REQUIRED FOR REGISTRATION ONLY
  // ============================================
  partnerId: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },

  // ============================================
  // COLLECTED DURING ONBOARDING (All Optional)
  // ============================================

  // Personal Info
  dateOfBirth: {
    type: String,
    required: false
  },
  profilePicture: {
    type: String,
    required: false
  },

  // References
  addressId: {
    type: Schema.Types.ObjectId,
    ref: 'Address',
    required: false
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: false
  },
  ratingId: {
    type: Schema.Types.ObjectId,
    ref: 'Rating',
    required: false
  },
  preferenceId: {
    type: Schema.Types.ObjectId,
    ref: 'Preference',
    required: false
  },
  walletId: {
    type: Schema.Types.ObjectId,
    ref: 'Wallet',
    required: false
  },

  // Personal Documents
  personalDocuments: {
    aadharFront: { type: String, required: false },
    aadharBack: { type: String, required: false },
    aadharStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    aadharRejectionReason: { type: String, required: false },

    panFront: { type: String, required: false },
    panBack: { type: String, required: false },
    panStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    panRejectionReason: { type: String, required: false },

    licenseFront: { type: String, required: false },
    licenseBack: { type: String, required: false },
    licenseStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    licenseRejectionReason: { type: String, required: false }
  },

  // Banking Details
  bankingDetails: {
    accountHolderName: { type: String, required: false },
    accountNumber: { type: String, required: false },
    ifscCode: { type: String, required: false },
    upiId: { type: String, required: false },
    bankingStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: { type: String, required: false }
  },

  // Vehicle Documents
  vehicalDocuments: {
    vehicleType: { type: String, required: false },
    registrationNumber: { type: String, required: false },
    insuranceDocument: { type: String, required: false },
    pollutionDocument: { type: String, required: false },
    insuranceStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    pollutionStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    insuranceRejectionReason: { type: String, required: false },
    pollutionRejectionReason: { type: String, required: false }
  },

  // ============================================
  // STATUS & ACTIVITY
  // ============================================
  isAvailable: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: Object.values(PartnerStatus),
    default: PartnerStatus.PENDING
  },
  hasPendingRequest: {
    type: Boolean,
    default: false
  },

  lastSeen: { type: Date },
  lastRequestTime: { type: Date },
  lastLocationUpdate: { type: Date },
  lastOnline: { type: Date },
  lastLoginAt: { type: Date },
  currentOrderId: { type: String },

  // ============================================
  // COMPLETION FLAGS
  // ============================================
  bankDetailsCompleted: {
    type: Boolean,
    default: false
  },
  personalDocumentsCompleted: {
    type: Boolean,
    default: false
  },
  vehicleDetailsCompleted: {
    type: Boolean,
    default: false
  },

  // ============================================
  // ORDER STATISTICS
  // ============================================
  totalOrders: {
    type: Number,
    default: 0
  },
  ongoingOrders: {
    type: Number,
    default: 0
  },
  completedOrders: {
    type: Number,
    default: 0
  },
  canceledOrders: {
    type: Number,
    default: 0
  },

  // ============================================
  // LOCATION
  // ============================================
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  }

}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
deliveryPartnerSchema.index({ location: '2dsphere' });
deliveryPartnerSchema.index({ isAvailable: 1, isActive: 1, isVerified: 1 });
deliveryPartnerSchema.index({ email: 1 });
deliveryPartnerSchema.index({ partnerId: 1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Generate partnerId automatically
deliveryPartnerSchema.pre('save', async function (next) {
  if (this.isNew && !this.partnerId) {
    const prefix = 'PRT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.partnerId = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Hash password before saving
deliveryPartnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

// Check if profile is complete
deliveryPartnerSchema.methods.isProfileComplete = function (): boolean {
  return this.bankDetailsCompleted &&
    this.personalDocumentsCompleted &&
    this.vehicleDetailsCompleted;
};

// Calculate profile completion percentage
deliveryPartnerSchema.methods.getProfileCompletionPercentage = function (): number {
  let completed = 0;
  const totalSteps = 3;

  if (this.bankDetailsCompleted) completed++;
  if (this.personalDocumentsCompleted) completed++;
  if (this.vehicleDetailsCompleted) completed++;

  return Math.round((completed / totalSteps) * 100);
};

// Get next onboarding step
deliveryPartnerSchema.methods.getNextOnboardingStep = function (): string | null {
  if (!this.personalDocumentsCompleted) {
    return 'personal-documents';
  }
  if (!this.bankDetailsCompleted) {
    return 'banking-details';
  }
  if (!this.vehicleDetailsCompleted) {
    return 'vehicle-details';
  }
  return null; // All steps completed
};

// Check if all documents are approved
deliveryPartnerSchema.methods.isFullyVerified = function (): boolean {
  const docs = this.personalDocuments;
  const vehicleDocs = this.vehicalDocuments;
  const banking = this.bankingDetails;

  return (
    docs?.aadharStatus === 'approved' &&
    docs?.panStatus === 'approved' &&
    docs?.licenseStatus === 'approved' &&
    vehicleDocs?.insuranceStatus === 'approved' &&
    vehicleDocs?.pollutionStatus === 'approved' &&
    banking?.bankingStatus === 'approved'
  );
};

// Get verification status
deliveryPartnerSchema.methods.getVerificationStatus = function () {
  return {
    registration: true, // Always true after registration
    personalDocuments: {
      aadhar: this.personalDocuments?.aadharStatus || 'pending',
      pan: this.personalDocuments?.panStatus || 'pending',
      license: this.personalDocuments?.licenseStatus || 'pending'
    },
    vehicle: {
      insurance: this.vehicalDocuments?.insuranceStatus || 'pending',
      pollution: this.vehicalDocuments?.pollutionStatus || 'pending'
    },
    banking: this.bankingDetails?.bankingStatus || 'pending',
    isFullyVerified: this.isFullyVerified()
  };
};

// Compare password
deliveryPartnerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Partner = mongoose.model<IPartner>('DeliveryPartner', deliveryPartnerSchema);