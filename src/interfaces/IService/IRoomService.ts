import { IRoom } from '../IModel/IRoom';

export interface IRoomService {
    createRoom(propertyId: string, roomData: Partial<IRoom>): Promise<IRoom | IRoom[]>;
    getRoomsByProperty(propertyId: string): Promise<IRoom[]>;
    getRoomById(roomId: string): Promise<IRoom>;
    updateRoom(roomId: string, roomData: Partial<IRoom>): Promise<IRoom>;
    deleteRoom(roomId: string): Promise<boolean>;
    uploadRoomImages(roomId: string, files: Express.Multer.File[], metadata: any[]): Promise<IRoom>;
}
