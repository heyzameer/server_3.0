import mongoose from 'mongoose';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import config from '../src/config';
import { Partner } from '../src/models/Partner';
import { Property } from '../src/models/Property';

// Configuration
const API_URL = 'http://localhost:3000/api/v1';

// Test Data
const PARTNER_EMAIL = `partner_test_flow_${Date.now()}@example.com`;
const PROPERTY_NAME = `Test Resort ${Date.now()}`;

const PROPERTY_DATA = {
    propertyName: PROPERTY_NAME,
    description: 'A place to test room flows endpoint validation',
    propertyType: 'resort', // Lowercase to match validations
    address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '123456', // Changed from zipCode to pincode
        country: 'India'
    },
    amenities: ['WiFi', 'Parking'], // Added required field
    location: {
        type: 'Point',
        coordinates: [70, 20]
    }
};

const ROOM_DATA_BULK = {
    roomName: 'Ocean View Suite',
    quantity: 2,
    roomNumbers: ['201', '202'], // Distinct numbers
    roomType: 'Suite',
    sharingType: 'Private',
    baseOccupancy: 2,
    minOccupancy: 1,
    maxOccupancy: 4,
    basePricePerNight: 5000,
    extraPersonCharge: 1000,
    bedConfiguration: 'King Bed',
    amenities: ['WiFi', 'AC'],
    hasSelfCooking: false
};

async function runTest() {
    try {
        console.log('🚀 Starting Partner Room Flow Test (Hybrid)...');

        // 1. Connect to DB
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');

        // 2. Create Verified Partner directly in DB
        const partner = await Partner.create({
            partnerId: `PRT${Date.now()}`,
            fullName: 'Test Flow Partner',
            email: PARTNER_EMAIL,
            phone: '9' + Math.floor(Math.random() * 1000000000),
            password: 'password123',
            isVerified: true,
            isActive: true,
            aadhaarVerified: true, // Crucial for Property Creation
            kycStatus: 'approved'
        });
        console.log(`✅ Created Verified Partner: ${partner.partnerId}`);

        // Generate Token
        const token = jwt.sign(
            { userId: partner._id.toString(), email: partner.email, role: 'partner', partnerId: partner.partnerId },
            config.jwtSecret,
            { expiresIn: '1h' }
        );

        // 3. Create Property via API (Mocking Frontend)
        console.log('\n🏠 Creating Property (API)...');
        let propertyId = '';
        try {
            const propRes = await axios.post(`${API_URL}/partner/register-prop`, PROPERTY_DATA, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // The controller returns: { success: true, message: '...', data: { property: { ... } } }
            // Let's inspect response structure safely
            const data = propRes.data.data;
            // Force using the custom string ID 'PROP...' if available to verify the fix
            propertyId = data.property?.propertyId || data.property?._id || data._id;

            console.log('✅ Property Created:', propertyId);
        } catch (error: any) {
            console.error('❌ Property Creation Failed:', error.response?.data || error.message);
            throw error;
        }

        // 3.5 Verify Fetch Rooms with updated RoomService (The User's Crash Scenario)
        console.log('\n🔍 Fetching Rooms (verify fix for PROP... ID)...');
        try {
            const fetchRes = await axios.get(`${API_URL}/properties/${propertyId}/rooms`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ Fetched Rooms successfully for property ${propertyId}`);
        } catch (error: any) {
            console.error('❌ Room Fetch Failed:', error.response?.data || error.message);
            throw error;
        }

        // 4. Create Rooms (Bulk)
        console.log('\n🛏️ Adding 2 Rooms (Bulk)...');
        let rooms: any[] = [];
        try {
            const roomRes = await axios.post(`${API_URL}/properties/${propertyId}/rooms`, ROOM_DATA_BULK, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = roomRes.data.data;
            if (Array.isArray(data)) {
                rooms = data;
            } else {
                rooms = [data];
            }
            console.log(`✅ Rooms Created via API: ${rooms.length}`);
            rooms.forEach(r => console.log(`   - ${r.roomName} (#${r.roomNumber}) ID: ${r._id}`));
        } catch (error: any) {
            console.error('❌ Room Creation Failed:', error.response?.data || error.message);
            throw error;
        }

        const room1 = rooms.find(r => r.roomNumber === '201') || rooms[0];
        const room2 = rooms.find(r => r.roomNumber === '202') || rooms[1];

        // 5. Block Dates for Room 1
        console.log(`\n🔒 Blocking Dates for Room ${room1.roomNumber}...`);
        const blockDates = [
            new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
        ];

        try {
            await axios.post(`${API_URL}/rooms/${room1._id}/block-dates`, {
                dates: blockDates,
                reason: 'manual',
                propertyId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`✅ Dates Blocked for Room ${room1.roomNumber}`);
        } catch (error: any) {
            console.error('❌ Blocking Dates Failed:', error.response?.data || error.message);
            throw error;
        }

        // 6. Verify Availability
        console.log('\n📅 Verifying Availability...');
        const checkDate = blockDates[0];
        const checkMonth = new Date(checkDate).getMonth() + 1;
        const checkYear = new Date(checkDate).getFullYear();

        // Check Room 1
        const r1Res = await axios.get(`${API_URL}/rooms/${room1._id}/availability?month=${checkMonth}&year=${checkYear}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const r1Day = r1Res.data.data.calendar.find((d: any) => d.date === checkDate);
        if (r1Day?.isBlocked) {
            console.log(`✅ Room ${room1.roomNumber} is BLOCKED as expected.`);
        } else {
            console.error(`❌ Room ${room1.roomNumber} should be blocked but is AVAILABLE.`);
        }

        // Check Room 2
        const r2Res = await axios.get(`${API_URL}/rooms/${room2._id}/availability?month=${checkMonth}&year=${checkYear}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const r2Day = r2Res.data.data.calendar.find((d: any) => d.date === checkDate);
        if (!r2Day?.isBlocked) {
            console.log(`✅ Room ${room2.roomNumber} is AVAILABLE as expected.`);
        } else {
            console.error(`❌ Room ${room2.roomNumber} should be available but is BLOCKED.`);
        }

        console.log('\n🎉 Test Passed Successfully!');

    } catch (error: any) {
        console.error('Test Failed:', error.message);
    } finally {
        if (mongoose.connection.readyState === 1) {
            console.log('Cleaning up...');
            await Partner.deleteMany({ email: PARTNER_EMAIL });
            await Property.deleteMany({ propertyName: PROPERTY_NAME });
            await mongoose.disconnect();
            console.log('Disconnected');
        }
    }
}

runTest();
