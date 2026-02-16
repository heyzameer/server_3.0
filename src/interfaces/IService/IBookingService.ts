import { IBooking } from '../IModel/IBooking';

export interface RoomBookingInput {
    roomId: string;
    guests: number;
}

export interface PriceBreakdown {
    roomPrices: {
        roomId: string;
        roomName: string;
        nights: number;
        pricePerNight: number;
        totalGuests: number;
        subtotal: number;
    }[];
    roomTotal: number;
    mealPlanPrice?: number;
    activityPrices?: {
        activityId: string;
        activityName: string;
        participants: number;
        pricePerPerson: number;
        subtotal: number;
    }[];
    activityTotal?: number;
    subtotal: number;
    taxes: number;
    finalPrice: number;
}

export interface CreateBookingDto {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    rooms: RoomBookingInput[];
    mealPlanId?: string;
    activityIds?: string[];
    guestDetails: {
        name: string;
        age: number;
        gender: string;
    }[];
}

export interface IBookingService {
    calculateBookingPrice(input: {
        propertyId: string;
        checkIn: Date;
        checkOut: Date;
        rooms: RoomBookingInput[];
        mealPlanId?: string;
        activityIds?: string[];
        packageId?: string;
        userId?: string;
    }): Promise<PriceBreakdown>;
    createBooking(userId: string, partnerId: string, bookingDto: CreateBookingDto): Promise<IBooking>;
    approveBooking(bookingId: string, partnerId: string): Promise<IBooking>;
    rejectBooking(bookingId: string, partnerId: string, reason: string): Promise<IBooking>;
    checkInBooking(bookingId: string, partnerId: string): Promise<IBooking>;
    checkOutBooking(bookingId: string, partnerId: string): Promise<IBooking>;
    completeBooking(bookingId: string, partnerId: string): Promise<IBooking>;
    cancelBooking(bookingId: string, userId: string, reason: string): Promise<IBooking>;
    requestRefund(bookingId: string, userId: string, reason: string): Promise<IBooking>;
    processRefund(bookingId: string, approved: boolean, adminNote?: string): Promise<IBooking>;
    getPartnerBookings(partnerId: string, filters?: {
        status?: string;
        approvalStatus?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }): Promise<IBooking[]>;
    getUserBookings(userId: string): Promise<IBooking[]>;
    getBookingById(bookingId: string): Promise<IBooking>;
    getAllBookings(filters?: any): Promise<IBooking[]>;
    updateBooking(bookingId: string, updateData: any): Promise<IBooking>;
    deleteBooking(bookingId: string): Promise<void>;
}
