import 'reflect-metadata';
import { container } from 'tsyringe';

// Repository interfaces
import { IUserRepository } from '../interfaces/IRepository/IUserRepository';
import { IOTPRepository } from '../interfaces/IRepository/IOTPRepository';
import { ILocationRepository } from '../interfaces/IRepository/ILocationRepository';
import { IOrderRepository } from '../interfaces/IRepository/IOrderRepository';
import { IPartnerRepository } from '../interfaces/IRepository/IPartnerRepository';

// Service interfaces
import { IUserService } from '../interfaces/IService/IUserService';
import { IAuthService } from '../interfaces/IService/IAuthService';
import { ILocationService } from '../interfaces/IService/ILocationService';
import { IOrderService } from '../interfaces/IService/IOrderService';
import { IPartnerService } from '../interfaces/IService/IPartnerService';
import { IEmailService } from '../interfaces/IService/IEmailService';

// Implementations
import { UserRepository } from '../repositories/UserRepository';
import { OTPRepository } from '../repositories/OTPRepository';
import { LocationRepository } from '../repositories/LocationRepository';
import { OrderRepository } from '../repositories/OrderRepository';
import { PartnerRepository } from '../repositories/PartnerRepository';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import { LocationService } from '../services/LocationService';
import { OrderService } from '../services/OrderService';
import { PartnerService } from '../services/PartnerService';
import { EmailService } from '../services/emailService';

// Controllers
import { UserController } from '../controllers/UserController';
import { AuthController } from '../controllers/AuthController';
import { LocationController } from '../controllers/LocationController';
import { OrderController } from '../controllers/OrderController';
import { PartnerController } from '../controllers/PartnerController';
import { IAddressRepository } from '../interfaces/IRepository/IAddressRepository';
import { AddressRepository } from '../repositories/AddressRepository';
import { AdminController } from '../controllers/AdminController';

// Register repositories
container.registerSingleton<IUserRepository>('UserRepository', UserRepository);
container.registerSingleton<IOTPRepository>('OTPRepository', OTPRepository);
container.registerSingleton<ILocationRepository>('LocationRepository', LocationRepository);
container.registerSingleton<IOrderRepository>('OrderRepository', OrderRepository);
container.registerSingleton<IPartnerRepository>('PartnerRepository', PartnerRepository);
container.registerSingleton<IAddressRepository>('addressRepository', AddressRepository); // Register AddressRepository

// Register services
container.registerSingleton<IUserService>('UserService', UserService);
container.registerSingleton<IAuthService>('AuthService', AuthService);
container.registerSingleton<ILocationService>('LocationService', LocationService)
container.registerSingleton<IOrderService>('OrderService', OrderService);
container.registerSingleton<IPartnerService>('PartnerService', PartnerService);
container.registerSingleton<IEmailService>('EmailService', EmailService); // Assuming EmailService is also registered
// Register controllers
container.registerSingleton(UserController);
container.registerSingleton(AuthController);
container.registerSingleton(LocationController);
container.registerSingleton(OrderController);
container.registerSingleton(PartnerController);
container.registerSingleton(AdminController);

export { container };