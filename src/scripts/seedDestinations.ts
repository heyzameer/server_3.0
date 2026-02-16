import 'reflect-metadata';
import mongoose from 'mongoose';
import { Destination } from '../models/Destination';
import config from '../config';

const destinations = [
    {
        name: 'Dandeli',
        slug: 'dandeli',
        description: 'Adventure capital of South India known for river rafting and wildlife.',
        coverImage: 'https://diplomatvisa.com/wp-content/uploads/2024/12/Best-Places-to-Visit-in-Dandeli.jpg',
        coordinates: { lat: 15.2477, lng: 74.6206 },
        trending: true,
        isActive: true
    },
    {
        name: 'Coorg',
        slug: 'coorg',
        description: 'The Scotland of India, famous for coffee plantations and misty hills.',
        coverImage: 'https://www.trypdeals.com/wp-content/uploads/2024/10/coorg-karnataka.jpg',
        coordinates: { lat: 12.3375, lng: 75.8069 },
        trending: true,
        isActive: true
    },
    {
        name: 'Gokarna',
        slug: 'gokarna',
        description: 'A temple town with pristine beaches and breathtaking sunsets.',
        coverImage: 'https://www.thestupidbear.com/wp-content/uploads/2020/01/Gokarna_4-1.jpg',
        coordinates: { lat: 14.5479, lng: 74.3188 },
        trending: true,
        isActive: true
    },
    {
        name: 'Ooty',
        slug: 'ooty',
        description: 'Queen of Hill Stations, nestled in the Nilgiri hills.',
        coverImage: 'https://travel-hub-bucket.s3.ap-south-1.amazonaws.com/destinations/ooty.jpg',
        coordinates: { lat: 11.4102, lng: 76.6950 },
        trending: false,
        isActive: true
    },
    {
        name: 'Chikmagalur',
        slug: 'chikmagalur',
        description: 'Coffee land of Karnataka with Mullayanagiri peak.',
        coverImage: 'https://res.cloudinary.com/dyiffrkzh/image/upload/c_fill,f_auto,fl_progressive.strip_profile,g_center,h_350,q_auto,w_550/v1702447807/bbj/yjygfj9q19iaw3ynyvyv.jpg',
        coordinates: { lat: 13.3161, lng: 75.7720 },
        trending: false,
        isActive: true
    }
];

const seedDestinations = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(config.database.uri);
        console.log('Connected to MongoDB');

        for (const dest of destinations) {
            const existing = await Destination.findOne({ slug: dest.slug });
            if (!existing) {
                await Destination.create(dest);
                console.log(`Created destination: ${dest.name}`);
            } else {
                console.log(`Destination already exists: ${dest.name}`);
            }
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding destinations:', error);
        process.exit(1);
    }
};

seedDestinations();
