// src/modules/ai-providers/public-providers.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { ApiSuccess, ApiProtectedErrors } from '../../common/swagger';

@ApiTags('Providers')
@ApiBearerAuth('access-token')
@ApiProtectedErrors()
@Controller({ path: 'providers', version: '1' })
export class PublicProvidersController {
  constructor(private readonly providersService: AiProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'List enabled AI providers available for chat and search',
    description:
      'Returns only id, name, display name and default flag — no API keys or admin-only fields. Use the `id` as `providerId` when sending a chat message or search query.',
  })
  @ApiSuccess({
    description: 'Available providers',
    message: 'Providers fetched successfully',
    data: [
      {
        id: 'd8f6541e-22b8-4be6-8e25-950b7bfaecfd',
        name: 'openai',
        displayName: 'OpenAI GPT-4',
        isDefault: true,
      },
      {
        id: 'a1b2c3d4-5678-4e9f-9abc-1234567890ab',
        name: 'anthropic',
        displayName: 'Claude 3.5 Sonnet',
        isDefault: false,
      },
    ],
  })
  async list() {
    const providers = await this.providersService.listPublicProviders();
    return { message: 'Providers fetched successfully', data: providers };
  }
}
