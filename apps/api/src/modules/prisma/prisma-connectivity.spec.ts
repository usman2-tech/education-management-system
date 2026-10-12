/**
 * AUTOMATED INTEGRATION TESTS: Database & Infrastructure Connectivity
 *
 * PURPOSE:
 * Verifies live PostgreSQL 18 read/write operations with disposable test data
 * and validates Redis TCP socket connectivity.
 */

import { PrismaClient } from '@prisma/client';
import * as net from 'net';

describe('Infrastructure Connectivity & Persistence Verification', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            'postgresql://postgres:postgres@127.0.0.1:5433/ems_database?schema=public',
        },
      },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PostgreSQL: should execute safe transactional write, read, and delete of disposable test data', async () => {
    const testTag = `health-check-${Date.now()}`;

    // 1. Write disposable test record
    const created = await prisma.systemHealthCheck.create({
      data: {
        service: 'automated-test-runner',
        status: testTag,
        metadata: {
          environment: 'test',
          verifiedAt: new Date().toISOString(),
        },
      },
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.status).toBe(testTag);

    // 2. Read back the disposable record
    const retrieved = await prisma.systemHealthCheck.findUnique({
      where: { id: created.id },
    });

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(created.id);
    expect(retrieved?.service).toBe('automated-test-runner');

    // 3. Clean up disposable record immediately
    const deleted = await prisma.systemHealthCheck.delete({
      where: { id: created.id },
    });

    expect(deleted.id).toBe(created.id);

    // 4. Confirm clean state
    const afterDelete = await prisma.systemHealthCheck.findUnique({
      where: { id: created.id },
    });
    expect(afterDelete).toBeNull();
  });

  it('Redis: should successfully complete TCP handshake on port 6379', async () => {
    const isRedisListening = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);

      socket.connect(6379, '127.0.0.1', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });

    expect(isRedisListening).toBe(true);
  });
});
