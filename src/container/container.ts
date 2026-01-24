import 'reflect-metadata';
import { container } from 'tsyringe';

// Repository interfaces
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { ILocationRepository } from '../interfaces/IRepository/ILocationRepository';
import { IOrderRepository } from '../interfaces/IRepository/IOrderRepository';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';
import { IPropertyRepository } from '../interfaces/IRepository/IPropertyRepository';

// Service interfaces
import { IUserService } from '../interfaces/IService/IUserService';
import { IAuthService } from '../interfaces/IService/IAuthService';
import { ILocationService } from '../interfaces/IService/ILocationService';
import { IOrderService } from '../interfaces/IService/IOrderService';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import { IPropertyService } from '../interfaces/IService/IPropertyService';
import { IEmailService } from '../interfaces/IService/IEmailService';
import { IOCRService } from '../interfaces/IService/IOCRService';

// Implementations
import { UserRepository } from '../repositories/UserRepository';
import { OTPRepository } from '../repositories/OTPRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { PartnerRepository } from '../repositories/PartnerRepository';
import { PropertyRepository } from '../repositories/PropertyRepository';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { LocationService } from '../services/LocationService';
import { PartnerService } from '../services/PartnerService';
import { PropertyService } from '../services/PropertyService';
import { EmailService } from '../services/emailService';
import { OCRService } from '../services/OCRService';
import { GeminiOCRService } from '../services/GeminiOCRService';

// Controllers
import { UserController } from '../controllers/UserController';
import { AuthController } from '../controllers/AuthController';
import { LocationController } from '../controllers/LocationController';
import { PartnerController } from '../controllers/PartnerController';
import { PropertyController } from '../controllers/PropertyController';
import { IAddressRepository } from '../interfaces/IRepository/IAddressRepository';
import { AddressRepository } from '../repositories/AddressRepository';
import { AdminController } from '../controllers/AdminController';

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
// Register controllers
container.registerSingleton(UserController);
container.registerSingleton(AuthController);
container.registerSingleton(LocationController);
container.registerSingleton(PartnerController);
container.registerSingleton(PropertyController);
container.registerSingleton(AdminController);

export { container };