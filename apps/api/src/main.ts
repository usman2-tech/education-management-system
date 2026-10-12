/**
 * MODULE: Core Backend Bootstrap Entrypoint
 *
 * PURPOSE:
 * Initializes and starts the NestJS HTTP application with enterprise security,
 * CORS policies, OpenAPI documentation, and global validation pipes.
 *
 * DEPENDENCIES:
 * AppModule, GlobalHttpExceptionFilter, AppLogger, SwaggerModule.
 *
 * SECURITY:
 * Applies global validation pipes, restricts CORS to whitelist, enables shutdown hooks.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppLogger } from './common/logger/app.logger';
import { config } from './config/env.config';

async function bootstrap() {
  const logger = new AppLogger();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Enable graceful termination hooks for Docker / Kubernetes
  app.enableShutdownHooks();

  // Set standard API route prefix
  app.setGlobalPrefix(config.apiPrefix);

  // Configure Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (
        config.corsOrigins.includes('*') ||
        config.corsOrigins.includes(origin) ||
        !config.isProduction
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed by policy`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-School-Id'],
  });

  // Apply strict global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Standardize error responses across all controllers
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Configure Swagger/OpenAPI Documentation
  if (config.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Educational Management System API')
      .setDescription(
        'Enterprise multi-tenant educational management platform REST API documentation.',
      )
      .setVersion('0.1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter your JWT authorization token',
          in: 'header',
        },
        'JWT-Auth',
      )
      .addTag('System', 'Health, observability, and diagnostics')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'EMS API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    logger.log(`OpenAPI documentation configured at /api/docs`);
  }

  await app.listen(config.port, '0.0.0.0');
  logger.log(
    `Educational Management System API running at http://localhost:${config.port}/${config.apiPrefix}`,
  );
  logger.log(`Swagger Documentation available at http://localhost:${config.port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during API bootstrap:', err);
  process.exit(1);
});
