import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });
  // Apply /api prefix to everything EXCEPT webhooks
  app.setGlobalPrefix('api', { exclude: ['webhooks/(.*)'] });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Seed default admin user
  const usersService = app.get(UsersService);
  await usersService.seedAdmin();

  console.log(`🚀 NestJS backend running on http://localhost:${port}`);
  console.log(`📊 API available at http://localhost:${port}/api`);
}
bootstrap();
