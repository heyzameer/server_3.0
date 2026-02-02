import { Document, ObjectId } from 'mongoose';

interface GuestDetail {
    name: string;
    age: number;
    gender: string;
}

interface RoomBooking {
    roomId: ObjectId;
    roomNumber: string;
    numberOfGuests: number;
    pricePerNight: number;
    totalRoomPrice: number;
}

interface ActivityBooking {
    activityId: ObjectId;
    date: Date;
    timeSlot: string;
    participants: number;
    pricePerPerson: number;
    totalActivityPrice: number;
}

export interface IBooking extends Document {
    _id: ObjectId;
    bookingId: string;
    userId: ObjectId;
    propertyId: ObjectId;
    partnerId: ObjectId;

    bookingType: 'accommodation' | 'activity_only' | 'package';

    checkInDate: Date;
    checkOutDate: Date;
    numberOfNights: number;

    totalGuests: number;
    guestDetails: GuestDetail[];

    roomBookings: RoomBooking[];

    mealPlanId?: ObjectId;
    mealPlanPrice: number;

    activityBookings: ActivityBooking[];

    packageId?: ObjectId;

    roomTotalPrice: number;
    mealTotalPrice: number;
    activityTotalPrice: number;
    packageDiscount: number;
    finalPrice: number;

    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentId?: string;

    status: 'pending_payment' | 'payment_completed' | 'confirmed' | 'rejected' | 'checked_in' | 'checked_out' | 'cancelled';

    // Partner approval workflow
    partnerApprovalStatus: 'pending' | 'approved' | 'rejected';
    approvedAt?: Date;
    rejectionReason?: string;
    rejectedAt?: Date;

    cancellationReason?: string;

    bookedAt: Date;
    confirmedAt?: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
