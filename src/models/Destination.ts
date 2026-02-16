import mongoose, { Schema } from 'mongoose';
import { IDestination } from '../interfaces/IModel/IDestination';

const placeToVisitSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    category: { type: String, default: '' },
    entryFee: { type: Number, default: 0 },
    timings: { type: String, default: '' },
    bestTimeToVisit: { type: String, default: '' }
});

const destinationSchema = new Schema<IDestination>({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    coverImage: { type: String, required: true },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    trending: { type: Boolean, default: false },
    placesToVisit: [placeToVisitSchema]
}, {
    timestamps: true
});

destinationSchema.index({ slug: 1 });
destinationSchema.index({ isActive: 1 });
destinationSchema.index({ trending: 1 });

export const Destination = mongoose.model<IDestination>('Destination', destinationSchema);
