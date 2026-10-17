import { Test, TestingModule } from '@nestjs/testing';
import { TransportService } from './transport.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@ems/contracts';

describe('TransportService', () => {
  let service: TransportService;

  const mockPrisma = {
    vehicle: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    driver: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    transportRoute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    studentTransportAllocation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    transportTrip: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vehicleLocation: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    transportAttendance: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    vehicleMaintenance: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    vehicleExpense: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    studentGuardianRelationship: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<TransportService>(TransportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Vehicle Management & School Isolation', () => {
    it('should prevent cross-school vehicle creation when schoolId differs', async () => {
      const user: any = {
        id: 'usr-admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-100',
      };

      await expect(
        service.createVehicle(
          {
            registrationNumber: 'ST-BUS-999',
            vehicleCode: 'BUS-99',
            seatingCapacity: 40,
          },
          user,
          'school-200'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate vehicle registration numbers within the same school', async () => {
      const user: any = {
        id: 'usr-admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-100',
      };

      mockPrisma.vehicle.findFirst.mockResolvedValueOnce({
        id: 'v-existing',
        registrationNumber: 'ST-BUS-101',
      });

      await expect(
        service.createVehicle(
          {
            registrationNumber: 'ST-BUS-101',
            vehicleCode: 'BUS-01',
            seatingCapacity: 40,
          },
          user
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Capacity Validation for Allocations', () => {
    it('should reject allocation if vehicle capacity is exceeded', async () => {
      const user: any = {
        id: 'usr-admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-100',
      };

      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'stud-3' });
      mockPrisma.transportRoute.findFirst.mockResolvedValueOnce({
        id: 'route-1',
        assignedVehicleId: 'veh-1',
      });
      mockPrisma.vehicle.findFirst.mockResolvedValueOnce({
        id: 'veh-1',
        seatingCapacity: 2,
        registrationNumber: 'ST-BUS-01',
        _count: { allocations: 2 },
      });
      mockPrisma.studentTransportAllocation.count.mockResolvedValueOnce(2);

      await expect(
        service.createAllocation(
          {
            studentId: 'stud-3',
            routeId: 'route-1',
            vehicleId: 'veh-1',
          },
          user
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Parent Access Control', () => {
    it('should reject parent tracking if child is not linked to guardian', async () => {
      const user: any = {
        id: 'usr-parent-1',
        role: UserRole.PARENT,
        schoolId: 'school-100',
      };

      mockPrisma.studentGuardianRelationship.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getParentChildTransport('unlinked-student-id', user)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
