import { injectable, inject } from 'tsyringe';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IRoom } from '../interfaces/IModel/IRoom';
import { AppError } from '../utils/errorHandler';
import { HttpStatus } from '../enums/HttpStatus';
import mongoose from 'mongoose';
import { getSignedFileUrl } from '../middleware/upload';

export interface IRoomService {
    createRoom(propertyId: string, roomData: Partial<IRoom>): Promise<IRoom | IRoom[]>;
    getRoomsByProperty(propertyId: string): Promise<IRoom[]>;
    getRoomById(roomId: string): Promise<IRoom>;
    updateRoom(roomId: string, roomData: Partial<IRoom>): Promise<IRoom>;
    deleteRoom(roomId: string): Promise<boolean>;
    uploadRoomImages(roomId: string, files: Express.Multer.File[], metadata: any[]): Promise<IRoom>;
}

@injectable()
export class RoomService implements IRoomService {
    constructor(
        @inject('RoomRepository') private roomRepository: IRoomRepository,
        @inject('PropertyRepository') private propertyRepository: IPropertyRepository
    ) { }

    private async resolveProperty(id: string) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            const prop = await this.propertyRepository.findById(id);
            if (prop) return prop;
        }
        return this.propertyRepository.findByPropertyId(id);
    }

    private async injectSignedUrls(room: IRoom): Promise<IRoom> {
        const roomObj = room.toObject ? room.toObject() : room;

        if (roomObj.images && roomObj.images.length > 0) {
            roomObj.images = await Promise.all(roomObj.images.map(async (img: any) => {
                if (img.url) {
                    img.url = await getSignedFileUrl(img.url);
                }
                return img;
            }));
        }
        return roomObj as IRoom;
    }

    async createRoom(propertyId: string, roomData: Partial<IRoom>): Promise<IRoom | IRoom[]> {
        const property = await this.resolveProperty(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }

        // Extract quantity and roomNumbers if provided
        const quantity = (roomData as any).quantity || 1;
        const roomNumbers = (roomData as any).roomNumbers || [];

        // Remove only quantity and roomNumbers from roomData
        const cleanRoomData: any = { ...roomData };
        delete cleanRoomData.quantity;
        delete cleanRoomData.roomNumbers;

        // If quantity is 1, create a single room
        if (quantity === 1) {
            const room = await this.roomRepository.create({
                ...cleanRoomData,
                roomNumber: roomNumbers[0] || 'Room-1',
                propertyId: property._id as any
            });
            return this.injectSignedUrls(room);
        }

        // For multiple rooms, create them using the provided room numbers
        const rooms: IRoom[] = [];
        for (let i = 0; i < quantity; i++) {
            const room = await this.roomRepository.create({
                ...cleanRoomData,
                roomNumber: roomNumbers[i] || `Room-${i + 1}`,
                propertyId: property._id as any
            });
            rooms.push(room);
        }

        // Return all created rooms (batched signing not strictly needed for create return but good for consistency)
        return Promise.all(rooms.map(room => this.injectSignedUrls(room)));
    }

    async getRoomsByProperty(propertyId: string): Promise<IRoom[]> {
        const property = await this.resolveProperty(propertyId);
        if (!property) {
            throw new AppError('Property not found', HttpStatus.NOT_FOUND);
        }
        const rooms = await this.roomRepository.findByPropertyId(property._id as any);
        return Promise.all(rooms.map(room => this.injectSignedUrls(room)));
    }

    async getRoomById(roomId: string): Promise<IRoom> {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new AppError('Room not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(room);
    }

    async updateRoom(roomId: string, roomData: Partial<IRoom>): Promise<IRoom> {
        const room = await this.roomRepository.update(roomId, roomData);
        if (!room) {
            throw new AppError('Room not found', HttpStatus.NOT_FOUND);
        }
        return this.injectSignedUrls(room);
    }

    async deleteRoom(roomId: string): Promise<boolean> {
        // Soft delete by setting isActive to false
        const room = await this.roomRepository.update(roomId, { isActive: false } as any);
        return !!room;
    }

    async uploadRoomImages(roomId: string, files: Express.Multer.File[], metadata: any[]): Promise<IRoom> {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new AppError('Room not found', HttpStatus.NOT_FOUND);
        }

        const newImages = files.map((file, index) => ({
            url: (file as any).key || (file as any).location, // Prefer key for S3 signing
            category: metadata[index]?.category || 'Others',
            label: metadata[index]?.label || ''
        }));

        const updatedImages = [...room.images, ...newImages];
        const updatedRoom = await this.roomRepository.update(roomId, { images: updatedImages });

        if (!updatedRoom) {
            throw new AppError('Failed to update room images', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.injectSignedUrls(updatedRoom);
    }
}
