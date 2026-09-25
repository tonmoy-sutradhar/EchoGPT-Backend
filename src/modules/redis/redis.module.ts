import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/constants';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const password = configService.get<string>('redis.password');

        const client = new Redis({
          host: configService.getOrThrow<string>('redis.host'),
          port: configService.getOrThrow<number>('redis.port'),
          password: password || undefined,
          db: configService.get<number>('redis.db') ?? 0,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        });

        client.on('ready', () => logger.log('Redis client ready'));
        client.on('error', (error: Error) =>
          logger.error(`Redis client error: ${error.message}`),
        );

        return client;
      },
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
