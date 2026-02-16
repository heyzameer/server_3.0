
import { IRoom } from '../IModel/IRoom';

export interface IRoomRepository {
    create(data: Partial<IRoom>): Promise<IRoom>;
    findById(id: string): Promise<IRoom | null>;
    update(id: string, data: Partial<IRoom>): Promise<IRoom | null>;
    delete(id: string): Promise<IRoom | null>;
    find(query: any): Promise<IRoom[]>;
    findByPropertyId(propertyId: string): Promise<IRoom[]>;
    findAvailableRooms(propertyId: string, roomType?: string): Promise<IRoom[]>;
}
