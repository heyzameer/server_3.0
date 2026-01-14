// src/interfaces/IModel/IVehicle.ts

export interface IVehicle {
  name: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  maxWeight?: string | number;
  pricePerKm?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
