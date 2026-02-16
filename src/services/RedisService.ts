import { injectable } from 'tsyringe';
import Redis from 'ioredis';
import config from '../config';
import { logger } from '../utils/logger';

@injectable()
export class RedisService {
    private client: Redis;

    constructor() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('error', (err) => {
            logger.error('Redis Client Error', err);
        });

        this.client.on('connect', () => {
            logger.info('Redis Client Connected');
        });
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}
