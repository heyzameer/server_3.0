"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../src/config"));
const Partner_1 = require("../src/models/Partner");
const User_1 = require("../src/models/User");
const Property_1 = require("../src/models/Property");
const API_URL = 'http://localhost:3000/api/v1';
async function apiRequest(method, path, token, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    try {
        const response = await (0, axios_1.default)({
            method,
            url: `${API_URL}${path}`,
            headers,
            data: body
        });
        return { status: response.status, data: response.data };
    }
    catch (error) {
        if (error.response) {
            return { status: error.response.status, data: error.response.data };
        }
        throw error;
    }
}
async function main() {
    try {
        console.log('🚀 Starting Booking Flow Test...');
        await mongoose_1.default.connect(config_1.default.database.uri);
        console.log('✅ Connected to DB');
        // 1. Create Test Partner
        const partnerEmail = `test_partner_${Date.now()}@example.com`;
        const partnerId = `PRT${Date.now()}`;
        const partner = await Partner_1.Partner.create({
            partnerId, // Manual ID to satisfy validation
            fullName: 'Test Partner',
            email: partnerEmail,
            phone: '9' + Math.floor(Math.random() * 1000000000), // phone field name
            password: 'password123',
            isVerified: true,
            isActive: true, // Auto-activate
            kycStatus: 'approved',
            totalProperties: 0,
            maxProperties: 5
        });
        const partnerToken = jsonwebtoken_1.default.sign({ userId: partner._id.toString(), email: partner.email, role: 'partner' }, config_1.default.jwtSecret, { expiresIn: '1d' });
        console.log(`✅ Created Partner: ${partnerEmail}`);
        // 2. Create Test User
        const userEmail = `test_user_${Date.now()}@example.com`;
        const user = await User_1.User.create({
            fullName: 'Test User',
            email: userEmail,
            phone: '8' + Math.floor(Math.random() * 1000000000), // phone field name
            password: 'password123',
            isActive: true,
            role: 'customer'
        });
        const userToken = jsonwebtoken_1.default.sign({ userId: user._id.toString(), email: user.email, role: 'customer' }, config_1.default.jwtSecret, { expiresIn: '1d' });
        console.log(`✅ Created User: ${userEmail}`);
        // 3. Create Property (Direct DB)
        const property = await Property_1.Property.create({
            partnerId: partner._id,
            propertyId: `PROP${Date.now()}`,
            propertyName: 'Test Resort ' + Date.now(),
            propertyType: 'resort',
            description: 'A lovely test resort',
            address: { street: '123 Test St', city: 'Test City', state: 'TS', pincode: '123456', country: 'Testland' },
            location: { type: 'Point', coordinates: [0, 0] },
            images: [{ url: 'http://example.com/image.jpg', category: 'Facade' }],
            status: 'approved',
            verificationStatus: 'verified'
        });
        console.log(`✅ Created Property: ${property.propertyName} (${property._id})`);
        // 4. Create Room (API)
        console.log('\n--- Creating Room (API) ---');
        const roomRes = await apiRequest('POST', `/properties/${property._id}/rooms`, partnerToken, {
            roomName: 'Deluxe Suite',
            roomType: 'Suite',
            description: 'Luxury suite',
            basePricePerNight: 5000,
            baseOccupancy: 2,
            maxOccupancy: 4,
            minOccupancy: 1,
            sharingType: 'Private',
            bedConfiguration: '1 Queen Bed',
            extraPersonCharge: 1000,
            amenities: ['WiFi', 'AC'],
            images: [{ url: 'http://example.com/room.jpg', category: 'Room' }],
            totalStock: 5
        });
        if (roomRes.status !== 201) {
            console.error('❌ Failed to create room:', JSON.stringify(roomRes.data, null, 2));
            throw new Error('Room creation failed');
        }
        const room = roomRes.data.data;
        console.log(`✅ Created Room: ${room.roomName} (${room._id})`);
        // 5. Calculate Price (API)
        console.log('\n--- Calculating Price (API) ---');
        const checkIn = new Date();
        checkIn.setDate(checkIn.getDate() + 10);
        const checkOut = new Date(checkIn);
        checkOut.setDate(checkIn.getDate() + 2); // 2 nights
        const calcRes = await apiRequest('POST', '/bookings/calculate-price', userToken, {
            propertyId: property._id,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            rooms: [{ roomId: room._id, guests: 2 }]
        });
        if (calcRes.status !== 200) {
            console.error('❌ Failed to calculate price:', JSON.stringify(calcRes.data, null, 2));
            throw new Error('Price calculation failed');
        }
        console.log(`✅ Price Calculated: ${calcRes.data.data.finalPrice}`);
        // 6. Create Booking (API)
        console.log('\n--- Creating Booking (API) ---');
        const bookRes = await apiRequest('POST', '/bookings', userToken, {
            propertyId: property._id,
            partnerId: partner._id,
            checkIn: checkIn.toISOString(),
            checkOut: checkOut.toISOString(),
            rooms: [{ roomId: room._id, guests: 2 }],
            guestDetails: [{ name: 'Test Guest', age: 30, gender: 'Male' }]
        });
        if (bookRes.status !== 201) {
            console.error('❌ Failed to create booking:', JSON.stringify(bookRes.data, null, 2));
            throw new Error('Booking creation failed');
        }
        const booking = bookRes.data.data;
        console.log(`✅ Booking Created: ${booking.bookingId} (${booking._id})`);
        console.log(`   Status: ${booking.status}`);
        console.log(`   Approval: ${booking.partnerApprovalStatus}`);
        // 7. Approve Booking (API)
        console.log('\n--- Approving Booking (API) ---');
        const approveRes = await apiRequest('PATCH', `/partner/bookings/${booking.bookingId}/approve`, partnerToken);
        if (approveRes.status !== 200) {
            console.error('❌ Failed to approve booking:', JSON.stringify(approveRes.data, null, 2));
            throw new Error('Booking approval failed');
        }
        const approvedBooking = approveRes.data.data;
        console.log(`✅ Booking Approved!`);
        console.log(`   Status: ${approvedBooking.status}`);
        console.log(`   Approval: ${approvedBooking.partnerApprovalStatus}`);
        console.log('\n🎉 Test Completed Successfully!');
    }
    catch (error) {
        console.error('Test Failed:', error);
    }
    finally {
        if (mongoose_1.default.connection.readyState === 1) {
            console.log('Cleaning up...');
            await Property_1.Property.deleteMany({ propertyName: { $regex: 'Test Resort' } });
            await Partner_1.Partner.deleteMany({ email: { $regex: 'test_partner_' } });
            await User_1.User.deleteMany({ email: { $regex: 'test_user_' } });
            await mongoose_1.default.disconnect();
            console.log('Disconnected');
        }
    }
}
main();
