// src/modules/ai-providers/ai-providers.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../common/interfaces';
import {
  ApiSuccess,
  ApiProtectedErrors,
  ApiForbidden,
  ApiNotFound,
  ApiConflict,
} from '../../common/swagger';

const providerExample = {
  id: 'd8f6541e-22b8-4be6-8e25-950b7bfaecfd',
  name: 'openai',
  displayName: 'OpenAI GPT-4',
  apiBaseUrl: 'https://api.openai.com/v1',
  maskedApiKey: '****abcd',
  isEnabled: true,
  isDefault: true,
  healthStatus: 'healthy',
  lastHealthCheckAt: '2026-09-28T10:00:00.000Z',
  createdAt: '2026-09-28T09:00:00.000Z',
  updatedAt: '2026-09-28T10:00:00.000Z',
};

@ApiTags('AI Providers')
@ApiBearerAuth('access-token')
@ApiProtectedErrors()
@ApiForbidden('Admin role required')
@Roles(Role.ADMIN)
@Controller({ path: 'ai-providers', version: '1' })
export class AiProvidersController {
  constructor(private readonly providersService: AiProvidersService) {}

  @Post()
  @ApiOperation({
    summary: 'Add a new AI provider (Admin only)',
    description:
      'The API key is encrypted (AES-256-GCM) before being stored and is never returned in full.',
  })
  @ApiSuccess({
    status: HttpStatus.CREATED,
    description: 'Provider created',
    message: 'Provider created successfully',
    data: {
      ...providerExample,
      isDefault: false,
      healthStatus: 'unknown',
      lastHealthCheckAt: null,
    },
  })
  async create(
    @Body() dto: CreateProviderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const provider = await this.providersService.create(dto, user.id);
    return {
      message: 'Provider created successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all AI providers (Admin only)' })
  @ApiSuccess({
    description: 'Providers fetched',
    message: 'Providers fetched successfully',
    data: [providerExample],
  })
  async findAll() {
    const providers = await this.providersService.findAll();
    return {
      message: 'Providers fetched successfully',
      data: providers.map((p) => this.providersService.toResponse(p)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID (Admin only)' })
  @ApiSuccess({
    description: 'Provider fetched',
    message: 'Provider fetched successfully',
    data: providerExample,
  })
  @ApiNotFound('Provider not found')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.findById(id);
    return {
      message: 'Provider fetched successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a provider (Admin only)',
    description:
      'Send `apiKey` only if you want to rotate it. All fields are optional.',
  })
  @ApiSuccess({
    description: 'Provider updated',
    message: 'Provider updated successfully',
    data: { ...providerExample, displayName: 'OpenAI GPT-4 Turbo' },
  })
  @ApiNotFound('Provider not found')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    const provider = await this.providersService.update(id, dto);
    return {
      message: 'Provider updated successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a provider (Admin only)',
    description:
      'Soft delete. If it was the default provider, no provider will be default until one is set again.',
  })
  @ApiSuccess({
    description: 'Provider deleted',
    message: 'Provider deleted successfully',
  })
  @ApiNotFound('Provider not found')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.providersService.delete(id);
    return { message: 'Provider deleted successfully', data: null };
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a provider (Admin only)' })
  @ApiSuccess({
    description: 'Provider enabled',
    message: 'Provider enabled successfully',
    data: { ...providerExample, isEnabled: true },
  })
  @ApiNotFound('Provider not found')
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.setEnabled(id, true);
    return {
      message: 'Provider enabled successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Patch(':id/disable')
  @ApiOperation({
    summary: 'Disable a provider (Admin only)',
    description:
      'Disabled providers cannot be used for chat/search and cannot be set as default.',
  })
  @ApiSuccess({
    description: 'Provider disabled',
    message: 'Provider disabled successfully',
    data: { ...providerExample, isEnabled: false, isDefault: false },
  })
  @ApiNotFound('Provider not found')
  async disable(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.setEnabled(id, false);
    return {
      message: 'Provider disabled successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Patch(':id/set-default')
  @ApiOperation({
    summary: 'Set a provider as the system default (Admin only)',
    description:
      'Used by chat/search when the request does not specify a `providerId`. Must be enabled.',
  })
  @ApiSuccess({
    description: 'Default provider updated',
    message: 'Default provider updated successfully',
    data: providerExample,
  })
  @ApiNotFound('Provider not found')
  @ApiConflict('Provider is disabled and cannot be set as default')
  async setDefault(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.setDefault(id);
    return {
      message: 'Default provider updated successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Post(':id/health-check')
  @ApiOperation({
    summary: 'Run a health check for a specific provider (Admin only)',
    description:
      'Makes a real call to the provider API and records latency and status.',
  })
  @ApiSuccess({
    description: 'Health check result',
    message: 'Health check completed',
    data: {
      id: 'hc-1a2b...',
      providerId: 'd8f6541e-22b8-4be6-8e25-950b7bfaecfd',
      status: 'healthy',
      latencyMs: 412,
      errorMessage: null,
      checkedAt: '2026-09-28T10:00:00.000Z',
    },
  })
  @ApiNotFound('Provider not found')
  async healthCheck(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.providersService.checkHealth(id);
    return { message: 'Health check completed', data: result };
  }

  @Post('health-check/all')
  @ApiOperation({
    summary: 'Run health checks for all enabled providers (Admin only)',
  })
  @ApiSuccess({
    description: 'Health check results',
    message: 'Health checks completed',
    data: [
      {
        id: 'hc-1a2b...',
        providerId: 'd8f6541e-22b8-4be6-8e25-950b7bfaecfd',
        status: 'healthy',
        latencyMs: 412,
        errorMessage: null,
        checkedAt: '2026-09-28T10:00:00.000Z',
      },
    ],
  })
  async healthCheckAll() {
    const results = await this.providersService.checkAllHealth();
    return { message: 'Health checks completed', data: results };
  }
}

// // src/modules/ai-providers/ai-providers.controller.ts
// import {
//   Controller,
//   Get,
//   Post,
//   Patch,
//   Delete,
//   Param,
//   Body,
//   ParseUUIDPipe,
//   HttpCode,
//   HttpStatus,
// } from '@nestjs/common';
// import {
//   ApiBearerAuth,
//   ApiOperation,
//   ApiTags,
//   ApiOkResponse,
//   ApiCreatedResponse,
// } from '@nestjs/swagger';
// import { AiProvidersService } from './ai-providers.service';
// import { CreateProviderDto } from './dto/create-provider.dto';
// import { UpdateProviderDto } from './dto/update-provider.dto';
// import { Roles, CurrentUser } from '../../common/decorators';
// import { Role } from '../../common/enums/role.enum';
// import type { AuthenticatedUser } from '../../common/interfaces';

// @ApiTags('AI Providers')
// @ApiBearerAuth('access-token')
// @Roles(Role.ADMIN)
// @Controller({ path: 'ai-providers', version: '1' })
// export class AiProvidersController {
//   constructor(private readonly providersService: AiProvidersService) {}

//   @Post()
//   @ApiOperation({ summary: 'Add a new AI provider (Admin only)' })
//   @ApiCreatedResponse({ description: 'Provider created successfully' })
//   async create(
//     @Body() dto: CreateProviderDto,
//     @CurrentUser() user: AuthenticatedUser,
//   ) {
//     const provider = await this.providersService.create(dto, user.id);
//     return {
//       message: 'Provider created successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Get()
//   @ApiOperation({ summary: 'List all AI providers (Admin only)' })
//   @ApiOkResponse({ description: 'Providers fetched successfully' })
//   async findAll() {
//     const providers = await this.providersService.findAll();
//     return {
//       message: 'Providers fetched successfully',
//       data: providers.map((p) => this.providersService.toResponse(p)),
//     };
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get provider by ID (Admin only)' })
//   @ApiOkResponse({ description: 'Provider fetched successfully' })
//   async findOne(@Param('id', ParseUUIDPipe) id: string) {
//     const provider = await this.providersService.findById(id);
//     return {
//       message: 'Provider fetched successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Patch(':id')
//   @ApiOperation({ summary: 'Edit a provider (Admin only)' })
//   @ApiOkResponse({ description: 'Provider updated successfully' })
//   async update(
//     @Param('id', ParseUUIDPipe) id: string,
//     @Body() dto: UpdateProviderDto,
//   ) {
//     const provider = await this.providersService.update(id, dto);
//     return {
//       message: 'Provider updated successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Delete(':id')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Delete a provider (Admin only)' })
//   @ApiOkResponse({ description: 'Provider deleted successfully' })
//   async delete(@Param('id', ParseUUIDPipe) id: string) {
//     await this.providersService.delete(id);
//     return { message: 'Provider deleted successfully', data: null };
//   }

//   @Patch(':id/enable')
//   @ApiOperation({ summary: 'Enable a provider (Admin only)' })
//   @ApiOkResponse({ description: 'Provider enabled successfully' })
//   async enable(@Param('id', ParseUUIDPipe) id: string) {
//     const provider = await this.providersService.setEnabled(id, true);
//     return {
//       message: 'Provider enabled successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Patch(':id/disable')
//   @ApiOperation({ summary: 'Disable a provider (Admin only)' })
//   @ApiOkResponse({ description: 'Provider disabled successfully' })
//   async disable(@Param('id', ParseUUIDPipe) id: string) {
//     const provider = await this.providersService.setEnabled(id, false);
//     return {
//       message: 'Provider disabled successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Patch(':id/set-default')
//   @ApiOperation({
//     summary: 'Set a provider as the system default (Admin only)',
//   })
//   @ApiOkResponse({ description: 'Default provider updated successfully' })
//   async setDefault(@Param('id', ParseUUIDPipe) id: string) {
//     const provider = await this.providersService.setDefault(id);
//     return {
//       message: 'Default provider updated successfully',
//       data: this.providersService.toResponse(provider),
//     };
//   }

//   @Post(':id/health-check')
//   @ApiOperation({
//     summary: 'Run a health check for a specific provider (Admin only)',
//   })
//   @ApiOkResponse({ description: 'Health check completed' })
//   async healthCheck(@Param('id', ParseUUIDPipe) id: string) {
//     const result = await this.providersService.checkHealth(id);
//     return { message: 'Health check completed', data: result };
//   }

//   @Post('health-check/all')
//   @ApiOperation({
//     summary: 'Run health checks for all enabled providers (Admin only)',
//   })
//   @ApiOkResponse({ description: 'Health checks completed' })
//   async healthCheckAll() {
//     const results = await this.providersService.checkAllHealth();
//     return { message: 'Health checks completed', data: results };
//   }
// }
