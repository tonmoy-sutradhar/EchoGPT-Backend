import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { Public } from '../../common/decorators';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Application health check (PostgreSQL + Redis)',
  })
  @ApiOkResponse({ description: 'Service is healthy' })
  async check() {
    const result = await this.healthService.check();
    return {
      message: 'Health check completed',
      data: {
        status: result.status,
        info: result.info,
        error: result.error,
        details: result.details,
      },
    };
  }
}
