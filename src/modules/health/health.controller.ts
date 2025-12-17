import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) { }

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  check() {
    return this.health.check([
      // Check if app has enough memory (less than 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      // Check if app has enough disk space (less than 90% used)
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }

  @Public()
  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe' })
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}