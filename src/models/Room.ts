import mongoose, { Schema } from 'mongoose';
import { IRoom } from '../interfaces/IModel/IRoom';

const roomSchema = new Schema<IRoom>({
    propertyId: {
        type: Schema.Types.ObjectId,
        ref: 'Property',
        required: true,
        index: true
    },

    roomName: {
        type: String,
        required: true,
        trim: true
    },
    roomNumber: {
        type: String,
        required: true,
        trim: true
    },
    roomType: {
        type: String,
        required: true,
        enum: ['Deluxe', 'Standard', 'Suite', 'Dormitory', 'Cottage', 'Villa', 'Apartment'],
        index: true
    },
    sharingType: {
        type: String,
        required: true,
        enum: ['Private', '2-Sharing', '3-Sharing', '4-Sharing', '6-Sharing', '8-Sharing', '10-Sharing']
    },

    baseOccupancy: {
        type: Number,
        required: true,
        min: 1
    },
    minOccupancy: {
        type: Number,
        required: true,
        min: 1
    },
    maxOccupancy: {
        type: Number,
        required: true,
        min: 1
    },

    basePricePerNight: {
        type: Number,
        required: true,
        min: 0
    },
    extraPersonCharge: {
        type: Number,
        default: 0,
        min: 0
    },

    amenities: [{ type: String }],
    bedConfiguration: {
        type: String,
        required: true
    },
    hasSelfCooking: {
        type: Boolean,
        default: false
    },

    images: [{
        url: { type: String, required: true },
        category: {
            type: String,
            required: true,
            enum: ['Room', 'Bathroom', 'View', 'Others'],
            default: 'Others'
        },
        label: { type: String }
    }],
    isActive: { type: Boolean, default: true, index: true }
}, {
    timestamps: true
});

// Index for querying rooms by property (non-unique to allow multiple rooms with same number)
roomSchema.index({ propertyId: 1, roomNumber: 1 });

// Methods
roomSchema.methods.calculatePrice = function (numberOfGuests: number): number {
    if (numberOfGuests < this.minOccupancy) {
        throw new Error(`Minimum ${this.minOccupancy} guests required`);
    }
    if (numberOfGuests > this.maxOccupancy) {
        throw new Error(`Maximum ${this.maxOccupancy} guests allowed`);
    }

    if (numberOfGuests <= this.baseOccupancy) {
        return this.basePricePerNight;
    } else {
        const extraGuests = numberOfGuests - this.baseOccupancy;
        return this.basePricePerNight + (extraGuests * this.extraPersonCharge);
    }
};

roomSchema.methods.isAvailable = async function (date: Date): Promise<boolean> {
    const RoomAvailability = mongoose.model('RoomAvailability');
    const availability = await RoomAvailability.findOne({
        roomId: this._id,
        date: date,
        isAvailable: false
    });
    return !availability;
};

export const Room = mongoose.model<IRoom>('Room', roomSchema);
