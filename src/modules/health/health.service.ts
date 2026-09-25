import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthIndicatorResult,
  TypeOrmHealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redisService: RedisService,
  ) {}

  check() {
    return this.health.check([
      () => this.db.pingCheck('postgres'),
      () => this.checkRedis(),
    ]);
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    const isHealthy = await this.redisService.ping();
    const result: HealthIndicatorResult = {
      redis: {
        status: isHealthy ? 'up' : 'down',
      },
    };

    if (!isHealthy) {
      throw new HealthCheckError('Redis check failed', result);
    }

    return result;
  }
}
