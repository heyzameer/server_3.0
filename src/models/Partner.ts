import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IPartner } from '../interfaces/IModel/IPartner';

export enum PartnerStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

const partnerSchema = new Schema<IPartner>({
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

  // Aadhaar Verification (Identity Verification)
  personalDocuments: {
    aadharFront: { type: String, required: false },
    aadharBack: { type: String, required: false },
    aadharNumber: { type: String, required: false }, // Added for manual/admin view
    aadharStatus: {
      type: String,
      enum: ['pending', 'not_submitted', 'approved', 'rejected'],
      default: 'not_submitted'
    },
    aadharRejectionReason: { type: String, required: false }
  },

  // Extracted Aadhaar Details (Encrypted)
  aadharDetails: {
    aadharNumber: { type: String, required: false },
    fullName: { type: String, required: false },
    dob: { type: String, required: false },
    gender: { type: String, required: false }
  },

  // ============================================
  // STATUS & ACTIVITY
  // ============================================
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
  aadhaarVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  verifiedAt: {
    type: Date,
    required: false
  },

  lastOnline: { type: Date },
  lastLoginAt: { type: Date },

  // ============================================
  // PROPERTY MANAGEMENT
  // ============================================
  totalProperties: {
    type: Number,
    default: 0,
    index: true
  },
  maxProperties: {
    type: Number,
    default: 5 // Default limit, can be configured per partner
  },

  // Banking Details (optional - for partner account)
  bankingDetails: {
    accountHolderName: { type: String, required: false },
    accountNumber: { type: String, required: false },
    ifscCode: { type: String, required: false },
    upiId: { type: String, required: false }
  }

}, {
  timestamps: true
});

// ============================================
// INDEXES
// ============================================
partnerSchema.index({ email: 1 });
partnerSchema.index({ partnerId: 1 });
partnerSchema.index({ isActive: 1, aadhaarVerified: 1 });
partnerSchema.index({ totalProperties: 1 });

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Generate partnerId automatically
partnerSchema.pre('save', async function (next) {
  if (this.isNew && !this.partnerId) {
    const prefix = 'PRT';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.partnerId = `${prefix}${timestamp}${random}`;
  }
  next();
});

// Hash password before saving
partnerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

// Check if partner can add more properties
partnerSchema.methods.canAddProperty = function (): boolean {
  return this.aadhaarVerified && this.totalProperties < this.maxProperties;
};

// Get remaining property slots
partnerSchema.methods.getRemainingPropertySlots = function (): number {
  return Math.max(0, this.maxProperties - this.totalProperties);
};

// Check if Aadhaar is verified
partnerSchema.methods.isAadhaarVerified = function (): boolean {
  return this.personalDocuments?.aadharStatus === 'approved';
};

// Compare password
partnerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const Partner = mongoose.model<IPartner>('Partner', partnerSchema);