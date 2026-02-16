import { UserRole } from "../../types";
import { Document, Model, Types } from "mongoose";

export interface IPartnerInfo {
  isOnline: boolean;
  lastLocationUpdate?: Date;
  lastOnlineStatusUpdate?: Date;
  rating: number;
  totalBookings: number;
  documentsVerified: boolean;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  googleId: string;
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

  partnerInfo?: IPartnerInfo;
  wishlist: Types.ObjectId[];
}

export interface IUserModel extends Model<IUser> {
  // Optional: if partners are now in a separate collection,
  // you may want to move this method to the Partner model.
  findPartnersNearby(latitude: number, longitude: number, radiusKm?: number): Promise<IUser[]>;
}
