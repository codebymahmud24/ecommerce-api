// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'A NEW DAY A NEW START! 🚀' };
  }
}
