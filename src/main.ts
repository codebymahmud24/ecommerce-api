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
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create Nest app
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  console.log('🔥 HOT RELOAD WORKS , Is it', new Date().toISOString());

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const port = configService.get('PORT') || 3000;
  const apiPrefix = configService.get('API_PREFIX') || 'api/v1';

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
    console.warn('✅ Database connection successful!');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
  }

  // Start server
  await app.listen(port);
  
  logger.log(`🚀 Application running in ${nodeEnv} mode`);  // Fixed: added opening backtick
  logger.log(`🌐 Server: http://localhost:${port}`);  // Fixed: added opening backtick
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);  // Fixed: added opening backtick
  logger.log(`🔐 API Prefix: /${apiPrefix}`);  // Fixed: added opening backtick
  logger.log(`📊 Health Check: http://localhost:${port}/health`);  // Fixed: added opening backtick

  if (nodeEnv === 'development') {
    logger.warn('⚠️  Running in DEVELOPMENT mode');
    logger.warn('⚠️  Make sure to set NODE_ENV=production before deploying');
  }

  // Graceful shutdown and error handling
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down...');
    await app.close();
    logger.log('HTTP server closed');
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down...');
    await app.close();
    logger.log('HTTP server closed');
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