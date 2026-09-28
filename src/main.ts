// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  ValidationPipe,
  VersioningType,
  Logger,
  LoggerService,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const port = configService.get<number>('app.port') ?? 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [
    'http://localhost:3000',
  ];
  const appName = configService.get<string>('app.name') ?? 'EchoGPT Backend';

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // const swaggerConfig = new DocumentBuilder()
  //   .setTitle(appName)
  //   .setDescription(
  //     [
  //       'AI Platform backend: authentication, users, Stripe subscriptions, multi-provider AI, chat, web search and admin APIs.',
  //       '',
  //       '**Authentication:** call `POST /auth/login`, copy `data.tokens.accessToken`, click **Authorize** and paste it.',
  //       '',
  //       '**Response envelope:** every response is `{ success, statusCode, message, data }`. Errors are `{ success: false, statusCode, message, errors?, timestamp, path }`.',
  //       '',
  //       '**Plan limits:** chat/search return `403` when the monthly plan limit is reached (`-1` in a plan means unlimited).',
  //     ].join('\n'),
  //   )
  //   .setVersion('1.0')
  //   .addServer(`http://localhost:${port}`, 'Local')
  //   .addBearerAuth(
  //     {
  //       type: 'http',
  //       scheme: 'bearer',
  //       bearerFormat: 'JWT',
  //       description: 'Enter JWT access token',
  //     },
  //     'access-token',
  //   )
  //   .addTag(
  //     'Auth',
  //     'Registration, login, sessions, email verification, password reset',
  //   )
  //   .addTag('Users', 'Profile management and admin user management')
  //   .addTag(
  //     'Subscriptions',
  //     'Plans, subscription status, usage, Stripe checkout',
  //   )
  //   .addTag(
  //     'AI Providers',
  //     'Admin: manage OpenAI / Anthropic / Gemini providers',
  //   )
  //   .addTag('Chat', 'Conversations, prompts and streaming responses')
  //   .addTag('Web Search', 'AI-assisted web search, history and suggestions')
  //   .addTag('Admin', 'Admin: dashboard, analytics, logs, system health')
  //   .addTag('Health', 'Public health check')
  //   .build();

  const swaggerConfig = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(
      'AI Platform Backend — Auth, Users, Subscriptions, AI Providers, Chat, Search',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'access-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Subscriptions', 'Subscription & billing endpoints')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  const nestLogger = new Logger('Bootstrap');
  nestLogger.log(`${appName} is running on http://localhost:${port}`);
  nestLogger.log(`Swagger docs: http://localhost:${port}/docs`);
}

void bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { ConfigService } from '@nestjs/config';
// import {
//   ValidationPipe,
//   VersioningType,
//   Logger,
//   LoggerService,
// } from '@nestjs/common';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
// import helmet from 'helmet';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule, {
//     bufferLogs: true,
//   });

//   const configService = app.get(ConfigService);
//   const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
//   app.useLogger(logger);

//   const port = configService.get<number>('app.port') ?? 3000;
//   const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';
//   const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [
//     'http://localhost:3000',
//   ];
//   const appName = configService.get<string>('app.name') ?? 'Backend Template';

//   app.use(helmet());
//   app.enableCors({
//     origin: corsOrigins,
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//   });

//   app.setGlobalPrefix(apiPrefix);
//   app.enableVersioning({
//     type: VersioningType.URI,
//     defaultVersion: '1',
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       forbidNonWhitelisted: true,
//       transform: true,
//       transformOptions: {
//         enableImplicitConversion: true,
//       },
//     }),
//   );

//   const swaggerConfig = new DocumentBuilder()
//     .setTitle(appName)
//     .setDescription(
//       'Production-ready NestJS backend template with JWT auth, PostgreSQL, Redis, and Docker.',
//     )
//     .setVersion('1.0')
//     .addBearerAuth(
//       {
//         type: 'http',
//         scheme: 'bearer',
//         bearerFormat: 'JWT',
//         description: 'Enter JWT access token',
//       },
//       'access-token',
//     )
//     .addTag('Auth', 'Authentication endpoints')
//     .addTag('Users', 'User management endpoints')
//     .addTag('Health', 'Health check endpoints')
//     .build();

//   const document = SwaggerModule.createDocument(app, swaggerConfig);
//   SwaggerModule.setup('docs', app, document, {
//     swaggerOptions: {
//       persistAuthorization: true,
//     },
//   });

//   await app.listen(port);

//   const nestLogger = new Logger('Bootstrap');
//   nestLogger.log(`${appName} is running on http://localhost:${port}`);
//   nestLogger.log(`Swagger docs: http://localhost:${port}/docs`);
//   nestLogger.log(`API base: http://localhost:${port}/${apiPrefix}/v1`);
// }

// void bootstrap();
