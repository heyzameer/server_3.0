import { LocationCoordinates } from "../../types";
import mongoose, { Document } from "mongoose";

export interface ILocation extends Document {
  userId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId | undefined;
  coordinates: LocationCoordinates;
  heading?: number;
  speed?: number;
  address?: string;
  isOnline: boolean;
  batteryLevel?: number;
  networkType?: string;
  createdAt: Date;
  updatedAt: Date;
}