
import mongoose from 'mongoose';
import config from '../config';
import { Property } from '../models/Property';

const fixLocation = async () => {
    try {
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('Connected to MongoDB');

        const propertyId = '69803e9edb9ab09bdc3192bf'; // The ID from the URL

        // Coordinates for Dandeli, Karnataka: 15.2361° N, 74.6241° E
        // MongoDB stores as [longitude, latitude]
        const longitude = 74.6241;
        const latitude = 15.2361;

        const result = await Property.findOneAndUpdate(
            { propertyId: propertyId }, // Try finding by custom propertyId element if that's what it is, or _id
            {
                $set: {
                    'location.coordinates': [longitude, latitude],
                    'address.city': 'Dandeli',
                    'address.state': 'Karnataka',
                    'address.country': 'India',
                    'propertyName': 'POTOLI Nature Stay' // Optional: Update name if needed to match what user calls it, but user said POTOLI is the place
                }
            },
            { new: true }
        );

        // Usage check: In seedDestinations, we see IProperty usage.
        // Wait, propertyId field in schema vs _id.
        // The URL param "69803e9edb9ab09bdc3192bf" looks like a custom ID string rather than ObjectId (which are 24 hex chars).
        // Let's check the length. 24 chars is ObjectId.
        // 69803e9edb9ab09bdc3192bf is 24 characters?
        // 6-9-8-0... 
        // 24 chars. It could be an ObjectId OR the string propertyId.
        // The schema says: propertyId: { type: String, required: true, unique: true, index: true }
        // BUT also _id exists.
        // If the URL is properties/XYZ, usually it's the _id unless custom routing uses propertyId.
        // The previous logs showed: GET /api/v1/properties/PROP123...
        // But the user URL is: properties/69803e9edb9ab09bdc3192bf
        // That looks like an ObjectId.
        // So I will query by _id.

        if (!result) {
            // Try by _id
            const resultById = await Property.findByIdAndUpdate(
                propertyId,
                {
                    $set: {
                        'location.coordinates': [longitude, latitude]
                    }
                },
                { new: true }
            );

            if (resultById) {
                console.log('Successfully updated property location by _id:', resultById.propertyName);
                console.log('New Coordinates:', resultById.location.coordinates);
            } else {
                console.log('Property not found with ID:', propertyId);
            }
        } else {
            console.log('Successfully updated property location by propertyId:', result.propertyName);
            console.log('New Coordinates:', result.location.coordinates);
        }

        await mongoose.disconnect();
        console.log('Disconnected');
    } catch (error) {
        console.error('Error fixing location:', error);
        process.exit(1);
    }
};

fixLocation();
