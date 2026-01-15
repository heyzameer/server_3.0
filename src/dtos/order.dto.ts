
import { OrderStatus } from "../types";

export interface CreateOrderDto {
    pickupAddress: string;
    deliveryAddress: string;
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
    deliveryPartnerId: string;
}
