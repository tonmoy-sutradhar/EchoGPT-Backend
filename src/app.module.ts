// src/app.module.ts
import { Module, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import {
  appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  mailConfig,
  stripeConfig,
  validateEnv,
} from './config';
import { createWinstonConfig } from './logger/winston.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { MailerModule } from './modules/mailer/mailer.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        mailConfig,
        stripeConfig,
      ],
      validate: validateEnv,
    }),
    WinstonModule.forRoot(createWinstonConfig()),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: (configService.get<number>('app.throttleTtl') ?? 60) * 1000,
          limit: configService.get<number>('app.throttleLimit') ?? 100,
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('app.env') === 'production';
        const sslEnabled = configService.get<boolean>('database.ssl');

        return {
          type: 'postgres' as const,
          host: configService.getOrThrow<string>('database.host'),
          port: configService.getOrThrow<number>('database.port'),
          username: configService.getOrThrow<string>('database.username'),
          password: configService.getOrThrow<string>('database.password'),
          database: configService.getOrThrow<string>('database.name'),
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
          synchronize: false,
          logging: !isProduction,
          autoLoadEntities: true,
        };
      },
    }),
    RedisModule,
    RolesModule,
    MailerModule,
    StripeModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);
  onModuleInit(): void {
    this.logger.log('Application modules initialized');
  }
}

// import { Module, Logger, OnModuleInit } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
// import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
// import { WinstonModule } from 'nest-winston';
// import {
//   appConfig,
//   databaseConfig,
//   jwtConfig,
//   redisConfig,
//   validateEnv,
// } from './config';
// import { createWinstonConfig } from './logger/winston.config';
// import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
// import { TransformInterceptor } from './common/interceptors/transform.interceptor';
// import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
// import { RolesGuard } from './common/guards/roles.guard';
// import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
// import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
// import { HealthModule } from './modules/health/health.module';
// import { RedisModule } from './modules/redis/redis.module';
// import { User } from './modules/users/entities/user.entity';

// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       cache: true,
//       expandVariables: true,
//       load: [appConfig, databaseConfig, jwtConfig, redisConfig],
//       validate: validateEnv,
//     }),
//     WinstonModule.forRoot(createWinstonConfig()),
//     ThrottlerModule.forRootAsync({
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => [
//         {
//           ttl: (configService.get<number>('app.throttleTtl') ?? 60) * 1000,
//           limit: configService.get<number>('app.throttleLimit') ?? 100,
//         },
//       ],
//     }),
//     TypeOrmModule.forRootAsync({
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => {
//         const isProduction =
//           configService.get<string>('app.env') === 'production';
//         const sslEnabled = configService.get<boolean>('database.ssl');

//         return {
//           type: 'postgres' as const,
//           host: configService.getOrThrow<string>('database.host'),
//           port: configService.getOrThrow<number>('database.port'),
//           username: configService.getOrThrow<string>('database.username'),
//           password: configService.getOrThrow<string>('database.password'),
//           database: configService.getOrThrow<string>('database.name'),
//           ssl: sslEnabled ? { rejectUnauthorized: false } : false,
//           entities: [User],
//           synchronize: false,
//           logging: !isProduction,
//           autoLoadEntities: true,
//         };
//       },
//     }),
//     RedisModule,
//     AuthModule,
//     UsersModule,
//     HealthModule,
//   ],
//   providers: [
//     {
//       provide: APP_FILTER,
//       useClass: GlobalExceptionFilter,
//     },
//     {
//       provide: APP_INTERCEPTOR,
//       useClass: TransformInterceptor,
//     },
//     {
//       provide: APP_INTERCEPTOR,
//       useClass: LoggingInterceptor,
//     },
//     {
//       provide: APP_GUARD,
//       useClass: ThrottlerGuard,
//     },
//     {
//       provide: APP_GUARD,
//       useClass: JwtAuthGuard,
//     },
//     {
//       provide: APP_GUARD,
//       useClass: RolesGuard,
//     },
//   ],
// })
// export class AppModule implements OnModuleInit {
//   private readonly logger = new Logger(AppModule.name);

//   onModuleInit(): void {
//     this.logger.log('Application modules initialized');
//   }
// }
