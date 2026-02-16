
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Destination } from '../src/models/Destination';

dotenv.config();

const activateAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_db');
        console.log('Connected to DB');

        const result = await Destination.updateMany({}, { isActive: true });
        console.log(`Updated ${result.modifiedCount} destinations to be active.`);

        const all = await Destination.find({});
        console.log('Current Destinations:', all.map(d => ({ name: d.name, isActive: d.isActive })));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

activateAll();
