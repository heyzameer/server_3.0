
import { OTPType } from '../types';

export interface RegisterDto {
    user: any; // Ideally this should be a User interface, but keeping it broad for now as per existing logic
    accessToken: string;
    refreshToken: string;
}

export interface RegisterRequestDto {
    [key: string]: any; // To allow any body content for now, or specifying known fields
    // Based on register method usages, usually contains email, password, etc.
}

export interface LoginRequestDto {
    email: string;
    password: string;
}

export interface RequestPasswordResetDto {
    email: string;
}

export interface ResetPasswordDto {
    email: string;
    otp: string;
    password: string;
}

export interface ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}

export interface RequestOTPDto {
    type: OTPType;
}

export interface ResendOTPDto {
    type: OTPType;
    email: string;
}

export interface VerifyOTPDto {
    code: string;
    type: OTPType;
}

export interface ValidateTokenDto {
    token: string;
}
