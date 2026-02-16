import mongoose, { Schema } from 'mongoose';
import { IDestination } from '../interfaces/IModel/IDestination';

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
    trending: { type: Boolean, default: false }
}, {
    timestamps: true
});

destinationSchema.index({ slug: 1 });
destinationSchema.index({ isActive: 1 });
destinationSchema.index({ trending: 1 });

export const Destination = mongoose.model<IDestination>('Destination', destinationSchema);
