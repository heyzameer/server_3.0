import { injectable } from 'tsyringe';
import { BaseRepository } from './BaseRepository';
import { IRoom } from '../interfaces/IModel/IRoom';
import { Room } from '../models/Room';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';


@injectable()
export class RoomRepository extends BaseRepository<IRoom> implements IRoomRepository {
    constructor() {
        super(Room);
    }

    async findByPropertyId(propertyId: string): Promise<IRoom[]> {
        return this.model.find({ propertyId, isActive: true });
    }

    async findAvailableRooms(propertyId: string, roomType?: string): Promise<IRoom[]> {
        const query: any = { propertyId, isActive: true };
        if (roomType) {
            query.roomType = roomType;
        }
        return this.model.find(query);
    }
}
