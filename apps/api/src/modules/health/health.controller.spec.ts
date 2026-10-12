/**
 * UNIT TESTS: HealthController & HealthService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthResponse = {
    status: 'ok' as const,
    service: 'Educational Management System API',
    version: '0.1.0',
    environment: 'test',
    timestamp: new Date().toISOString(),
    uptimeSeconds: 10,
    services: {
      database: { status: 'up' as const, latencyMs: 2 },
      redis: { status: 'up' as const, latencyMs: 1 },
      aiService: { status: 'up' as const, latencyMs: 5 },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getHealthStatus: jest.fn().mockResolvedValue(mockHealthResponse),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            checkHealth: jest.fn().mockResolvedValue({ status: 'up', latencyMs: 2 }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('should return system health status in standard envelope', async () => {
    const result = await controller.check();
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data.status).toBe('ok');
    expect(result.data.services.database.status).toBe('up');
  });
});
