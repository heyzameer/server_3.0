
export interface UpdateLocationDto {
    coordinates: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        timestamp?: Date;
    };
    heading?: number;
    speed?: number;
    address?: string;
    isOnline?: boolean;
    batteryLevel?: number;
    networkType?: string;
    orderId?: string;
}

export interface TrackOrderDto {
    orderId: string;
}

export interface OnlineStatusDto {
    isOnline: boolean;
}

export interface GetHeatmapDto {
    northEastLat: string;
    northEastLng: string;
    southWestLat: string;
    southWestLng: string;
    startDate?: string;
    endDate?: string;
}

export interface CleanupOldLocationsDto {
    daysOld: number;
}
