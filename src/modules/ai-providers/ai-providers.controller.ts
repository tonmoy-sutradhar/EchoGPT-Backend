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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { AiProvidersService } from './ai-providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('AI Providers')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller({ path: 'ai-providers', version: '1' })
export class AiProvidersController {
  constructor(private readonly providersService: AiProvidersService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new AI provider (Admin only)' })
  @ApiCreatedResponse({ description: 'Provider created successfully' })
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
  @ApiOkResponse({ description: 'Providers fetched successfully' })
  async findAll() {
    const providers = await this.providersService.findAll();
    return {
      message: 'Providers fetched successfully',
      data: providers.map((p) => this.providersService.toResponse(p)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID (Admin only)' })
  @ApiOkResponse({ description: 'Provider fetched successfully' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.findById(id);
    return {
      message: 'Provider fetched successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a provider (Admin only)' })
  @ApiOkResponse({ description: 'Provider updated successfully' })
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
  @ApiOperation({ summary: 'Delete a provider (Admin only)' })
  @ApiOkResponse({ description: 'Provider deleted successfully' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.providersService.delete(id);
    return { message: 'Provider deleted successfully', data: null };
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a provider (Admin only)' })
  @ApiOkResponse({ description: 'Provider enabled successfully' })
  async enable(@Param('id', ParseUUIDPipe) id: string) {
    const provider = await this.providersService.setEnabled(id, true);
    return {
      message: 'Provider enabled successfully',
      data: this.providersService.toResponse(provider),
    };
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a provider (Admin only)' })
  @ApiOkResponse({ description: 'Provider disabled successfully' })
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
  })
  @ApiOkResponse({ description: 'Default provider updated successfully' })
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
  })
  @ApiOkResponse({ description: 'Health check completed' })
  async healthCheck(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.providersService.checkHealth(id);
    return { message: 'Health check completed', data: result };
  }

  @Post('health-check/all')
  @ApiOperation({
    summary: 'Run health checks for all enabled providers (Admin only)',
  })
  @ApiOkResponse({ description: 'Health checks completed' })
  async healthCheckAll() {
    const results = await this.providersService.checkAllHealth();
    return { message: 'Health checks completed', data: results };
  }
}
