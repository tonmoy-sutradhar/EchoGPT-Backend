// src/modules/ai-providers/ai-providers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProvider } from './entities/ai-provider.entity';
import { ProviderModel } from './entities/provider-model.entity';
import { ProviderHealthCheck } from './entities/provider-health-check.entity';
import { AiProvidersService } from './ai-providers.service';
import { AiProvidersController } from './ai-providers.controller';
import { PublicProvidersController } from './public-providers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiProvider, ProviderModel, ProviderHealthCheck]),
  ],
  controllers: [AiProvidersController, PublicProvidersController],
  providers: [AiProvidersService],
  exports: [AiProvidersService],
})
export class AiProvidersModule {}
