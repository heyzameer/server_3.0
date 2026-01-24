
import { OrderStatus } from "../types";

export interface CreateOrderDto {
    checkInAddress: string;
    checkOutAddress: string;
    items: any[];
    [key: string]: any;
}

export interface UpdateOrderStatusDto {
    status: OrderStatus;
    notes?: string;
}

export interface CancelOrderDto {
    reason: string;
}

export interface VerifyOTPDto {
    code: string;
}

export interface RateOrderDto {
    rating: number;
    comment?: string;
    ratingType?: string;
}

export interface AssignPartnerDto {
    orderId: string;
    partnerId: string;
}
