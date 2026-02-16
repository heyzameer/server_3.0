import { Document } from 'mongoose';

export interface IDestination extends Document {
    name: string;
    slug: string;
    description: string;
    coverImage: string;
    images: string[];
    isActive: boolean;
    coordinates: {
        lat: number;
        lng: number;
    };
    trending: boolean;
    createdAt: Date;
    updatedAt: Date;
}
