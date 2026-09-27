// src/modules/ai-providers/dto/provider-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AiProviderName } from '../../../common/enums/ai-provider-name.enum';
import { HealthStatus } from '../../../common/enums/health-status.enum';

export class ProviderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AiProviderName })
  name!: AiProviderName;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  apiBaseUrl!: string;

  @ApiProperty({ description: 'Masked key, e.g. sk-****1234' })
  maskedApiKey!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty({ enum: HealthStatus })
  healthStatus!: HealthStatus;

  @ApiProperty({ nullable: true })
  lastHealthCheckAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
