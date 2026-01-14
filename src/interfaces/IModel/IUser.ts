import { UserRole } from "../../types";
import { Document, Model, Schema, Types } from "mongoose";

export interface IUser extends Document {
  fullName: string;
  email: string;
  googleId:string;
  phone: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  emailVerifiedAt?: Date;
  phoneVerifiedAt?: Date;
  profilePicture?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
    addressId?: Types.ObjectId;
     preferenceId?: Types.ObjectId;
      ratingId?: Types.ObjectId;
       walletId?: Types.ObjectId;
      
  
}

export interface IUserModel extends Model<IUser> {
  // Optional: if delivery partners are now in a separate collection,
  // you may want to move this method to the DeliveryPartner model.
  findDeliveryPartnersNearby(latitude: number, longitude: number, radiusKm?: number): Promise<IUser[]>;
}
