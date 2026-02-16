import { Document } from 'mongoose';

export interface IPlaceToVisit {
    name: string;
    slug: string;
    description: string;
    images: string[];
    coordinates: {
        lat: number;
        lng: number;
    };
    category?: string; // e.g., 'temple', 'beach', 'museum', 'viewpoint', 'park', 'monument'
    entryFee?: number;
    timings?: string;
    bestTimeToVisit?: string;
}

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
    placesToVisit: IPlaceToVisit[];
    createdAt: Date;
    updatedAt: Date;
}
