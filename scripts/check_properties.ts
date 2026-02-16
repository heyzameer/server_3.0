
import mongoose from 'mongoose';
import config from '../src/config';
import { Property } from '../src/models/Property';

const checkProperties = async () => {
    try {
        await mongoose.connect(config.database.uri);
        console.log('Connected to DB');

        const count = await Property.countDocuments({});
        console.log(`Total properties: ${count}`);

        if (count > 0) {
            const properties = await Property.find({}).limit(5);
            console.log('First 5 properties:', JSON.stringify(properties, null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkProperties();
