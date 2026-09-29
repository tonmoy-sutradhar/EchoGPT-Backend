// src/modules/ai-providers/dto/public-provider.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AiProviderName } from '../../../common/enums/ai-provider-name.enum';

export class PublicProviderDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: AiProviderName })
  name!: AiProviderName;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  isDefault!: boolean;
}