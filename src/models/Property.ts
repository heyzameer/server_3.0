import mongoose, { Schema } from 'mongoose';
import { IProperty } from '../interfaces/IModel/IProperty';

const propertySchema = new Schema<IProperty>({
    propertyId: { type: String, required: true, unique: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    propertyName: { type: String, required: true, trim: true },
    propertyType: {
        type: String,
        required: true,
        enum: ['hotel', 'homestay', 'apartment', 'resort', 'villa'],
        index: true
    },
    description: { type: String, required: true },
    amenities: [{ type: String }],

    address: {
        street: { type: String, required: true },
        city: { type: String, required: true, index: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        country: { type: String, required: true, default: 'India' }
    },

    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },

    ownershipDocuments: {
        ownershipProof: { type: String },
        ownershipProofStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'incomplete'],
            default: 'incomplete'
        },
        ownerKYC: { type: String },
        ownerKYCStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'incomplete'],
            default: 'incomplete'
        },
        rejectionReason: { type: String }
    },

    taxDocuments: {
        gstNumber: { type: String },
        gstCertificate: { type: String },
        panNumber: { type: String },
        panCard: { type: String },
        taxStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'incomplete'],
            default: 'incomplete'
        },
        rejectionReason: { type: String }
    },

    bankingDetails: {
        accountHolderName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        upiId: { type: String },
        bankingStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'incomplete'],
            default: 'incomplete'
        },
        rejectionReason: { type: String }
    },

    images: [{ type: String }],
    coverImage: { type: String },

    pricePerNight: { type: Number, required: true },
    maxGuests: { type: Number, required: true },
    totalRooms: { type: Number, required: true },
    availableRooms: { type: Number, required: true },

    isActive: { type: Boolean, default: false, index: true },
    isVerified: { type: Boolean, default: false, index: true },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'suspended'],
        default: 'pending',
        index: true
    },
    overallRejectionReason: { type: String },
    onboardingCompleted: { type: Boolean, default: false, index: true },

    ownershipDocumentsCompleted: { type: Boolean, default: false },
    taxDocumentsCompleted: { type: Boolean, default: false },
    bankingDetailsCompleted: { type: Boolean, default: false },
    propertyDetailsCompleted: { type: Boolean, default: false },
    imagesUploaded: { type: Boolean, default: false },

    totalBookings: { type: Number, default: 0 },
    activeBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    canceledBookings: { type: Number, default: 0 },

    averageRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },

    verifiedAt: { type: Date },
    submittedForVerificationAt: { type: Date }

}, {
    timestamps: true
});

// Indexes
propertySchema.index({ location: '2dsphere' });
propertySchema.index({ propertyName: 'text', description: 'text' });

// Methods
propertySchema.methods.isOnboardingComplete = function (): boolean {
    return this.ownershipDocumentsCompleted &&
        this.taxDocumentsCompleted &&
        this.bankingDetailsCompleted &&
        this.propertyDetailsCompleted &&
        this.imagesUploaded;
};

propertySchema.methods.getOnboardingProgress = function (): number {
    let steps = 0;
    if (this.ownershipDocumentsCompleted) steps++;
    if (this.taxDocumentsCompleted) steps++;
    if (this.bankingDetailsCompleted) steps++;
    if (this.propertyDetailsCompleted) steps++;
    if (this.imagesUploaded) steps++;
    return (steps / 5) * 100;
};

propertySchema.methods.getNextOnboardingStep = function (): string {
    if (!this.propertyDetailsCompleted) return 'property_details';
    if (!this.ownershipDocumentsCompleted) return 'ownership_documents';
    if (!this.taxDocumentsCompleted) return 'tax_documents';
    if (!this.bankingDetailsCompleted) return 'banking_details';
    if (!this.imagesUploaded) return 'property_images';
    return 'completed';
};

export const Property = mongoose.model<IProperty>('Property', propertySchema);
