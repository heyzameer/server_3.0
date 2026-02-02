import 'reflect-metadata';
import { container } from 'tsyringe';

// Repository interfaces
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { ILocationRepository } from '../interfaces/IRepository/ILocationRepository';
import { IOrderRepository } from '../interfaces/IRepository/IOrderRepository';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';
import { IRoomRepository } from '../interfaces/IRepository/IRoomRepository';
import { IRoomAvailabilityRepository } from '../repositories/RoomAvailabilityRepository';

// Service interfaces
import { IUserService } from '../interfaces/IService/IUserService';
import { IAuthService } from '../interfaces/IService/IAuthService';
import { ILocationService } from '../interfaces/IService/ILocationService';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import { IPropertyService } from '../interfaces/IService/IPropertyService';
import { IRoomService } from '../services/RoomService';
import { IAvailabilityService } from '../services/AvailabilityService';
import { IBookingService } from '../services/BookingService';
import { IEmailNotificationService } from '../services/EmailNotificationService';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { IOCRService } from '../interfaces/IService/IOCRService';

// Implementations
import { UserRepository } from '../repositories/UserRepository';
import { OTPRepository } from '../repositories/OTPRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { PartnerRepository } from '../repositories/PartnerRepository';
import { PropertyRepository } from '../repositories/PropertyRepository';
import { RoomRepository } from '../repositories/RoomRepository';
import { RoomAvailabilityRepository } from '../repositories/RoomAvailabilityRepository';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { LocationService } from '../services/LocationService';
import { PartnerService } from '../services/PartnerService';
import { PropertyService } from '../services/PropertyService';
import { RoomService } from '../services/RoomService';
import { AvailabilityService } from '../services/AvailabilityService';
import { BookingService } from '../services/BookingService';
import { EmailNotificationService } from '../services/EmailNotificationService';
import { EmailService } from '../services/emailService';
import { OCRService } from '../services/OCRService';
import { GeminiOCRService } from '../services/GeminiOCRService';
import { RedisService } from '../services/RedisService';

// Controllers
import { UserController } from '../controllers/UserController';
import { AuthController } from '../controllers/AuthController';
import { LocationController } from '../controllers/LocationController';
import { PartnerController } from '../controllers/PartnerController';
import { PropertyController } from '../controllers/PropertyController';
import { RoomController } from '../controllers/RoomController';
import { MealPlanController } from '../controllers/MealPlanController';
import { ActivityController } from '../controllers/ActivityController';
import { BookingController } from '../controllers/BookingController';

// Interfaces
import { IMealPlanRepository } from '../repositories/MealPlanRepository';
import { IMealPlanService } from '../services/MealPlanService';
import { IActivityRepository } from '../repositories/ActivityRepository';
import { IActivityService } from '../services/ActivityService';
import { IPackageRepository } from '../repositories/PackageRepository';
import { IPackageService } from '../services/PackageService';

// Implementations
import { MealPlanRepository } from '../repositories/MealPlanRepository';
import { MealPlanService } from '../services/MealPlanService';
import { ActivityRepository } from '../repositories/ActivityRepository';
import { ActivityService } from '../services/ActivityService';
import { PackageRepository } from '../repositories/PackageRepository';
import { PackageService } from '../services/PackageService';
import { PackageController } from '../controllers/PackageController';
import { IAddressRepository } from '../interfaces/IRepository/IAddressRepository';
import { AddressRepository } from '../repositories/AddressRepository';
import { AdminController } from '../controllers/AdminController';
import { IDestinationRepository } from '../interfaces/IRepository/IDestinationRepository';
import { DestinationRepository } from '../repositories/DestinationRepository';
import { IDestinationService, DestinationService } from '../services/DestinationService';
import { DestinationController } from '../controllers/DestinationController';

// Register repositories
container.registerSingleton<IUserRepository>('UserRepository', UserRepository);
container.registerSingleton<IOTPRepository>('OTPRepository', OTPRepository);
container.registerSingleton<ILocationRepository>('LocationRepository', LocationRepository);
container.registerSingleton<IOrderRepository>('OrderRepository', OrderRepository);
container.registerSingleton<IPartnerRepository>('PartnerRepository', PartnerRepository);
container.registerSingleton<IPropertyRepository>('PropertyRepository', PropertyRepository);
container.registerSingleton<IAddressRepository>('addressRepository', AddressRepository); // Register AddressRepository

// Register services
container.registerSingleton<IUserService>('UserService', UserService);
container.registerSingleton<IAuthService>('AuthService', AuthService);
container.registerSingleton<ILocationService>('LocationService', LocationService)
container.registerSingleton<IPartnerService>('PartnerService', PartnerService);
container.registerSingleton<IPropertyService>('PropertyService', PropertyService);
container.registerSingleton<IEmailService>('EmailService', EmailService); // Assuming EmailService is also registered
container.registerSingleton<IOCRService>('OCRService', OCRService);
container.registerSingleton<IOCRService>('GeminiOCRService', GeminiOCRService);
container.registerSingleton('RedisService', RedisService);
// Register controllers
container.registerSingleton(UserController);
container.registerSingleton(AuthController);
container.registerSingleton(LocationController);
container.registerSingleton(PartnerController);
container.registerSingleton(PropertyController);
container.registerSingleton(RoomController);
container.registerSingleton(MealPlanController);
container.registerSingleton(BookingController);

// Meal Plans
container.registerSingleton<IMealPlanRepository>('MealPlanRepository', MealPlanRepository);
container.registerSingleton<IMealPlanService>('MealPlanService', MealPlanService);
container.registerSingleton(AdminController);

// Activities
container.registerSingleton<IActivityRepository>('ActivityRepository', ActivityRepository);
container.registerSingleton<IActivityService>('ActivityService', ActivityService);
container.registerSingleton(ActivityController);

// Rooms
container.registerSingleton<IRoomRepository>('RoomRepository', RoomRepository);
container.registerSingleton<IRoomService>('RoomService', RoomService);

// Room Availability
container.registerSingleton<IRoomAvailabilityRepository>('RoomAvailabilityRepository', RoomAvailabilityRepository);
container.registerSingleton<IAvailabilityService>('AvailabilityService', AvailabilityService);

// Booking
container.registerSingleton<IBookingService>('BookingService', BookingService);
container.registerSingleton<IEmailNotificationService>('EmailNotificationService', EmailNotificationService);

// Packages
container.registerSingleton<IDestinationRepository>('DestinationRepository', DestinationRepository);
container.registerSingleton<IDestinationService>('DestinationService', DestinationService);
container.registerSingleton(DestinationController);

container.registerSingleton<IPackageRepository>('PackageRepository', PackageRepository);
container.registerSingleton<IPackageService>('PackageService', PackageService);
container.registerSingleton(PackageController);

export { container };