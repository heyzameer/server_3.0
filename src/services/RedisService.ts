import { injectable } from 'tsyringe';
import Redis from 'ioredis';
import config from '../config';
import { logger } from '../utils/logger';

@injectable()
export class RedisService {
    private client: Redis;
    private lastErrorLog: number = 0;

    constructor() {
        this.client = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            retryStrategy: (times) => {
                // Max retry delay of 10 seconds, starting from 100ms
                return Math.min(times * 100, 10000);
            },
            maxRetriesPerRequest: null, // Keep trying to connect
        });

        this.client.on('error', (err) => {
            // Only log once every 30 seconds to avoid spamming
            const now = Date.now();
            if (!this.lastErrorLog || now - this.lastErrorLog > 30000) {
                logger.error('Redis Connection Error (retrying...):', err.message);
                this.lastErrorLog = now;
            }
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
