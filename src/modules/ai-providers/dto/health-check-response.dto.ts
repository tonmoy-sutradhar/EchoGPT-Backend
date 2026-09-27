// src/modules/ai-providers/dto/health-check-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { HealthStatus } from '../../../common/enums/health-status.enum';

export class HealthCheckResponseDto {
  @ApiProperty({ format: 'uuid' })
  providerId!: string;

  @ApiProperty({ enum: HealthStatus })
  status!: HealthStatus;

  @ApiProperty({ nullable: true })
  latencyMs!: number | null;

  @ApiProperty({ nullable: true })
  errorMessage!: string | null;

  @ApiProperty()
  checkedAt!: Date;
}
