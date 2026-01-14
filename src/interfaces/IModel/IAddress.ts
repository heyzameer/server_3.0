import { Document, Types } from "mongoose";

export interface IAddress extends Document {
  owner: Types.ObjectId;
  ownerModel: 'User' | 'DeliveryPartner';
  street: string;
  isDefault?: boolean;
  streetNumber?: string;
  buildingNumber?: string;
  floorNumber?: string;
  contactName: string;
  contactPhone: string;
  latitude?: number;
  longitude?: number;
  timestamp?: Date;
  type: 'home' | 'work' | 'other';
  createdAt: Date;
  updatedAt: Date;
}
