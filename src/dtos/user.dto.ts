
export interface UpdateProfileDto {
    fullName?: string;
    phone?: string;
    dateOfBirth?: Date;
    profilePicture?: string;
    [key: string]: any;
}

export interface AddAddressDto {
    street: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
    streetNumber?: string;
    buildingNumber?: string;
    floorNumber?: string;
    contactName: string;
    contactPhone: string;
    type?: 'home' | 'work' | 'other';
    label?: string; // e.g., 'Home', 'Work'
}

export interface UpdateAddressDto extends Partial<AddAddressDto> {
    street: string;
    contactName: string;
    contactPhone: string;
}

export interface UpdatePartnerInfoDto {
    // Define specific fields for partner documentation/info if needed
    [key: string]: any;
}

export interface UpdateOnlineStatusDto {
    isOnline: boolean;
}
