
import { PartnerRegistrationData } from "../types";

export interface RegisterPartnerReqDto {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
}

export interface PartnerFullRegistrationDto extends PartnerRegistrationData { }

export interface PartnerLoginOtpDto {
    email: string;
}

export interface PartnerVerifyOtpDto {
    email: string;
    otp: string;
}
