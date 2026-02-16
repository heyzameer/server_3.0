"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const Destination_1 = require("../src/models/Destination");
dotenv_1.default.config();
const activateAll = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel_db');
        console.log('Connected to DB');
        const result = await Destination_1.Destination.updateMany({}, { isActive: true });
        console.log(`Updated ${result.modifiedCount} destinations to be active.`);
        const all = await Destination_1.Destination.find({});
        console.log('Current Destinations:', all.map(d => ({ name: d.name, isActive: d.isActive })));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
};
activateAll();
