import { PaginatedResult, PaginationOptions } from "../../types";
import { IAddress } from "../IModel/IAddress";

export interface IAddressRepository {
    findByUserId(userId: string): Promise<IAddress[]>;
    findById(id: string): Promise<IAddress | null>;
    // findByIdAndUserId(id: string, userId: string): Promise<IAddress | null>;
    createAddress(addressData: Partial<IAddress>): Promise<IAddress>;
    updateAddress(id: string, userId: string, updateData: Partial<IAddress>): Promise<IAddress | null>;
    deleteAddress(id: string, userId: string): Promise<boolean>;
    setDefaultAddress(userId: string, addressId: string, isDefault: boolean): Promise<IAddress | null>;
    // getPaginatedAddresses(userId: string, options: PaginationOptions): Promise<PaginatedResult<IAddress>>;
}