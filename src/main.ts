import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { db } from './database';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import  cookieParser from 'cookie-parser';
import * as express from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create Nest app
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log',  'debug', 'verbose'],
  });

  logger.verbose('🔥 HOT RELOAD WORKS , Is it' + new Date().toISOString());

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const port = configService.get('PORT') || 3000;
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';

  // Stripe webhook endpoint and its takes raw body so we need to parse the raw body manually
  app.use(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      if (req.body && Buffer.isBuffer(req.body)) {
        req.rawBody = req.body;
      }
      next();
    },
  );

  app.use(express.json());

  // Cookies
  app.use(cookieParser());

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
  });

  // API prefix
  app.setGlobalPrefix(apiPrefix);

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('E-Commerce API')
    .setDescription('API Documentation for E-Commerce Project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  try {
    // Test DB connection
    await db.execute('SELECT 1');
    logger.verbose('✅ Database connection successful!');
  } catch (err) {
    logger.verbose('❌ Database connection failed:', err);
  }

  // Start server
  await app.listen(port);
  
  logger.verbose(`🚀 Application running in ${nodeEnv} mode`);  // Fixed: added opening backtick
  logger.verbose(`🌐 Server: http://localhost:${port}`);  // Fixed: added opening backtick
  logger.verbose(`📚 Swagger Docs: http://localhost:${port}/api/docs`);  // Fixed: added opening backtick
  logger.verbose(`🔐 API Prefix: /${apiPrefix}`);  // Fixed: added opening backtick
  logger.verbose(`📊 Health Check: http://localhost:${port}/health`);  // Fixed: added opening backtick

  if (nodeEnv === 'development') {
    logger.verbose('⚠️  Running in DEVELOPMENT mode');
    logger.warn('⚠️  Make sure to set NODE_ENV=production before deploying');
  }

  // Graceful shutdown and error handling
  process.on('SIGTERM', async () => {
    logger.warn('SIGTERM received, shutting down...');
    await app.close();
    logger.warn('HTTP server closed');
  });

  process.on('SIGINT', async () => {
    logger.warn('SIGINT received, shutting down...');
    await app.close();
    logger.warn('HTTP server closed');
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application:', error);
  process.exit(1);
});