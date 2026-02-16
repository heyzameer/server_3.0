"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../src/config"));
const Property_1 = require("../src/models/Property");
const checkProperties = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.database.uri);
        console.log('Connected to DB');
        const count = await Property_1.Property.countDocuments({});
        console.log(`Total properties: ${count}`);
        if (count > 0) {
            const properties = await Property_1.Property.find({}).limit(5);
            console.log('First 5 properties:', JSON.stringify(properties, null, 2));
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
    }
};
checkProperties();
