/**
 * MODULE: Transport Management Service (TASK 027)
 *
 * PURPOSE:
 * Core business logic for fleet management, driver assignment, route planning,
 * capacity-validated student allocations, trip tracking, real-time GPS ingestion,
 * transport attendance recording, parent child tracking, and maintenance records.
 *
 * SECURITY:
 * Enforces school-level tenant isolation, RBAC role validation, and verified
 * parent-child relationship checks.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  CreateDriverDto,
  UpdateDriverDto,
  CreateRouteDto,
  UpdateRouteDto,
  CreateAllocationDto,
  UpdateAllocationDto,
  StartTripDto,
  GpsUpdateDto,
  RecordTransportAttendanceDto,
  CreateMaintenanceDto,
  CreateExpenseDto,
} from './dto/transport.dto';

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveSchoolId(user: AuthUser, explicitSchoolId?: string): string {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (explicitSchoolId) return explicitSchoolId;
      if (user.schoolId) return user.schoolId;
      throw new BadRequestException('schoolId is required for platform administrator actions');
    }
    if (!user.schoolId) {
      throw new ForbiddenException('User is not associated with an institutional school tenant');
    }
    if (explicitSchoolId && explicitSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school operations are strictly prohibited');
    }
    return user.schoolId;
  }

  // ===========================================================================
  // 1. VEHICLE MANAGEMENT
  // ===========================================================================

  async listVehicles(user: AuthUser, explicitSchoolId?: string, isActive?: boolean) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.vehicle.findMany({
      where: {
        schoolId,
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: {
        drivers: {
          select: { id: true, name: true, phone: true },
        },
        _count: {
          select: { allocations: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getVehicle(id: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, schoolId },
      include: {
        drivers: true,
        routes: true,
        allocations: {
          include: { student: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        maintenances: { orderBy: { serviceDate: 'desc' }, take: 5 },
        expenses: { orderBy: { date: 'desc' }, take: 5 },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found in this school');
    return vehicle;
  }

  async createVehicle(dto: CreateVehicleDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const existing = await this.prisma.vehicle.findFirst({
      where: { schoolId, registrationNumber: dto.registrationNumber.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Vehicle with registration ${dto.registrationNumber} already exists in this school`);
    }

    return this.prisma.vehicle.create({
      data: {
        schoolId,
        registrationNumber: dto.registrationNumber.trim().toUpperCase(),
        vehicleCode: dto.vehicleCode.trim().toUpperCase(),
        vehicleType: dto.vehicleType || 'BUS',
        seatingCapacity: dto.seatingCapacity,
        insuranceNumber: dto.insuranceNumber,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        registrationExpiry: dto.registrationExpiry ? new Date(dto.registrationExpiry) : null,
        maintenanceStatus: dto.maintenanceStatus || 'GOOD',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateVehicle(id: string, dto: UpdateVehicleDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (dto.registrationNumber && dto.registrationNumber.trim().toUpperCase() !== vehicle.registrationNumber) {
      const conflict = await this.prisma.vehicle.findFirst({
        where: { schoolId, registrationNumber: dto.registrationNumber.trim().toUpperCase(), id: { not: id } },
      });
      if (conflict) throw new ConflictException('Registration number already in use');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        registrationNumber: dto.registrationNumber ? dto.registrationNumber.trim().toUpperCase() : undefined,
        vehicleCode: dto.vehicleCode ? dto.vehicleCode.trim().toUpperCase() : undefined,
        vehicleType: dto.vehicleType,
        seatingCapacity: dto.seatingCapacity,
        insuranceNumber: dto.insuranceNumber,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        registrationExpiry: dto.registrationExpiry ? new Date(dto.registrationExpiry) : undefined,
        maintenanceStatus: dto.maintenanceStatus,
        isActive: dto.isActive,
      },
    });
  }

  async archiveVehicle(id: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // 2. DRIVER MANAGEMENT
  // ===========================================================================

  async listDrivers(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.driver.findMany({
      where: { schoolId },
      include: {
        assignedVehicle: {
          select: { id: true, registrationNumber: true, vehicleCode: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createDriver(dto: CreateDriverDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    if (dto.assignedVehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.assignedVehicleId, schoolId },
      });
      if (!vehicle) throw new NotFoundException('Assigned vehicle not found in this school');
    }

    return this.prisma.driver.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        phone: dto.phone.trim(),
        licenseNumber: dto.licenseNumber.trim().toUpperCase(),
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : null,
        status: dto.status || 'ACTIVE',
        assignedVehicleId: dto.assignedVehicleId || null,
        userId: dto.userId || null,
      },
      include: {
        assignedVehicle: true,
      },
    });
  }

  async updateDriver(id: string, dto: UpdateDriverDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const driver = await this.prisma.driver.findFirst({ where: { id, schoolId } });
    if (!driver) throw new NotFoundException('Driver not found');

    if (dto.assignedVehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: dto.assignedVehicleId, schoolId },
      });
      if (!vehicle) throw new NotFoundException('Assigned vehicle not found');
    }

    return this.prisma.driver.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        phone: dto.phone ? dto.phone.trim() : undefined,
        licenseNumber: dto.licenseNumber ? dto.licenseNumber.trim().toUpperCase() : undefined,
        licenseExpiry: dto.licenseExpiry ? new Date(dto.licenseExpiry) : undefined,
        status: dto.status,
        assignedVehicleId: dto.assignedVehicleId,
        userId: dto.userId,
      },
      include: {
        assignedVehicle: true,
      },
    });
  }

  // ===========================================================================
  // 3. ROUTES & STOPS
  // ===========================================================================

  async listRoutes(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.transportRoute.findMany({
      where: { schoolId },
      include: {
        assignedVehicle: true,
        assignedDriver: true,
        stops: { orderBy: { stopOrder: 'asc' } },
        _count: {
          select: { allocations: { where: { status: 'ACTIVE' } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRoute(id: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const route = await this.prisma.transportRoute.findFirst({
      where: { id, schoolId },
      include: {
        assignedVehicle: true,
        assignedDriver: true,
        stops: { orderBy: { stopOrder: 'asc' } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
            pickupStop: true,
            dropoffStop: true,
          },
        },
      },
    });
    if (!route) throw new NotFoundException('Transport route not found');
    return route;
  }

  async createRoute(dto: CreateRouteDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const existing = await this.prisma.transportRoute.findFirst({
      where: { schoolId, code: dto.code.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Route with code ${dto.code} already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const route = await tx.transportRoute.create({
        data: {
          schoolId,
          name: dto.name.trim(),
          code: dto.code.trim().toUpperCase(),
          direction: dto.direction || 'ROUND_TRIP',
          assignedVehicleId: dto.assignedVehicleId || null,
          assignedDriverId: dto.assignedDriverId || null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
        },
      });

      if (dto.stops && dto.stops.length > 0) {
        await tx.routeStop.createMany({
          data: dto.stops.map((stop, index) => ({
            routeId: route.id,
            stopName: stop.stopName.trim(),
            stopOrder: stop.stopOrder || index + 1,
            latitude: stop.latitude,
            longitude: stop.longitude,
            scheduledTime: stop.scheduledTime || null,
          })),
        });
      }

      return tx.transportRoute.findUnique({
        where: { id: route.id },
        include: { stops: { orderBy: { stopOrder: 'asc' } }, assignedVehicle: true, assignedDriver: true },
      });
    });
  }

  async updateRoute(id: string, dto: UpdateRouteDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const route = await this.prisma.transportRoute.findFirst({ where: { id, schoolId } });
    if (!route) throw new NotFoundException('Route not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.transportRoute.update({
        where: { id },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          code: dto.code ? dto.code.trim().toUpperCase() : undefined,
          direction: dto.direction,
          assignedVehicleId: dto.assignedVehicleId,
          assignedDriverId: dto.assignedDriverId,
          isActive: dto.isActive,
        },
      });

      if (dto.stops) {
        await tx.routeStop.deleteMany({ where: { routeId: id } });
        await tx.routeStop.createMany({
          data: dto.stops.map((stop, index) => ({
            routeId: id,
            stopName: stop.stopName.trim(),
            stopOrder: stop.stopOrder || index + 1,
            latitude: stop.latitude,
            longitude: stop.longitude,
            scheduledTime: stop.scheduledTime || null,
          })),
        });
      }

      return tx.transportRoute.findUnique({
        where: { id },
        include: { stops: { orderBy: { stopOrder: 'asc' } }, assignedVehicle: true, assignedDriver: true },
      });
    });
  }

  // ===========================================================================
  // 4. STUDENT TRANSPORT ALLOCATION (CAPACITY VALIDATED)
  // ===========================================================================

  async listAllocations(user: AuthUser, explicitSchoolId?: string, routeId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.studentTransportAllocation.findMany({
      where: {
        schoolId,
        ...(routeId ? { routeId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
          },
        },
        route: { select: { id: true, name: true, code: true } },
        pickupStop: true,
        dropoffStop: true,
        vehicle: { select: { id: true, registrationNumber: true, vehicleCode: true, seatingCapacity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAllocation(dto: CreateAllocationDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    // Verify student belongs to this school
    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, schoolId, role: UserRole.STUDENT },
    });
    if (!student) throw new NotFoundException('Student not found in this school');

    // Verify route belongs to this school
    const route = await this.prisma.transportRoute.findFirst({
      where: { id: dto.routeId, schoolId },
      include: { assignedVehicle: true },
    });
    if (!route) throw new NotFoundException('Route not found in this school');

    // Resolve vehicle
    const vehicleId = dto.vehicleId || route.assignedVehicleId;
    if (vehicleId) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: vehicleId, schoolId },
        include: {
          _count: {
            select: { allocations: { where: { status: 'ACTIVE' } } },
          },
        },
      });
      if (!vehicle) throw new NotFoundException('Allocated vehicle not found');

      // Enforce capacity validation!
      if (vehicle._count.allocations >= vehicle.seatingCapacity) {
        throw new BadRequestException(
          `Vehicle ${vehicle.registrationNumber} is at maximum capacity (${vehicle.seatingCapacity} seats). Cannot allocate more students.`
        );
      }
    }

    // Check for existing active allocation for this student on this route
    const existing = await this.prisma.studentTransportAllocation.findFirst({
      where: { studentId: dto.studentId, routeId: dto.routeId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new ConflictException('Student already has an active allocation on this route');
    }

    return this.prisma.studentTransportAllocation.create({
      data: {
        schoolId,
        studentId: dto.studentId,
        routeId: dto.routeId,
        pickupStopId: dto.pickupStopId || null,
        dropoffStopId: dto.dropoffStopId || null,
        vehicleId: vehicleId || null,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        monthlyFee: dto.monthlyFee || 0,
        status: 'ACTIVE',
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        route: true,
        pickupStop: true,
        dropoffStop: true,
        vehicle: true,
      },
    });
  }

  async updateAllocation(id: string, dto: UpdateAllocationDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const allocation = await this.prisma.studentTransportAllocation.findFirst({
      where: { id, schoolId },
    });
    if (!allocation) throw new NotFoundException('Allocation not found');

    return this.prisma.studentTransportAllocation.update({
      where: { id },
      data: {
        pickupStopId: dto.pickupStopId,
        dropoffStopId: dto.dropoffStopId,
        vehicleId: dto.vehicleId,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        monthlyFee: dto.monthlyFee,
        status: dto.status,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        route: true,
        pickupStop: true,
        dropoffStop: true,
        vehicle: true,
      },
    });
  }

  // ===========================================================================
  // 5. TRIP MANAGEMENT & REAL-TIME GPS TRACKING
  // ===========================================================================

  async startTrip(dto: StartTripDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    // Verify vehicle & route
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const route = await this.prisma.transportRoute.findFirst({ where: { id: dto.routeId, schoolId } });
    if (!route) throw new NotFoundException('Route not found');

    // Find driver profile if user is linked as a driver
    const driver = await this.prisma.driver.findFirst({
      where: { schoolId, OR: [{ userId: user.id }, { assignedVehicleId: vehicle.id }] },
    });

    // Check for any currently active trip for this vehicle
    const activeTrip = await this.prisma.transportTrip.findFirst({
      where: { vehicleId: dto.vehicleId, status: 'IN_PROGRESS' },
    });
    if (activeTrip) {
      return activeTrip; // Return existing active trip to resume tracking
    }

    return this.prisma.transportTrip.create({
      data: {
        schoolId,
        routeId: dto.routeId,
        vehicleId: dto.vehicleId,
        driverId: driver?.id || null,
        tripType: dto.tripType || 'PICKUP',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: {
        route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } },
        vehicle: true,
        driver: true,
      },
    });
  }

  async endTrip(tripId: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const trip = await this.prisma.transportTrip.findFirst({ where: { id: tripId, schoolId } });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.prisma.transportTrip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });
  }

  async recordGpsUpdate(dto: GpsUpdateDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    // Validate trip status
    const trip = await this.prisma.transportTrip.findFirst({
      where: { id: dto.tripId, schoolId },
    });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'IN_PROGRESS') {
      throw new BadRequestException('GPS updates are only accepted for active trips (IN_PROGRESS)');
    }

    // Validate coordinates
    if (dto.latitude < -90 || dto.latitude > 90 || dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Coordinates are outside valid geographical bounds');
    }

    return this.prisma.vehicleLocation.create({
      data: {
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        accuracy: dto.accuracy || null,
        speed: dto.speed || null,
        heading: dto.heading || null,
        isSimulated: dto.isSimulated || false,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      },
    });
  }

  async getLatestVehicleLocation(vehicleId: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const latest = await this.prisma.vehicleLocation.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
      include: { trip: { select: { id: true, status: true, tripType: true } } },
    });

    const isStale = latest ? (Date.now() - new Date(latest.timestamp).getTime()) > 5 * 60 * 1000 : true;

    return {
      vehicleId,
      vehicleCode: vehicle.vehicleCode,
      registrationNumber: vehicle.registrationNumber,
      latestLocation: latest,
      isStale,
    };
  }

  async getActiveTripsWithLocations(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    const trips = await this.prisma.transportTrip.findMany({
      where: { schoolId, status: 'IN_PROGRESS' },
      include: {
        route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } },
        vehicle: true,
        driver: true,
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return trips.map((t) => {
      const loc = t.locations[0] || null;
      const isStale = loc ? (Date.now() - new Date(loc.timestamp).getTime()) > 5 * 60 * 1000 : true;
      return {
        ...t,
        latestLocation: loc,
        isStale,
      };
    });
  }

  // ===========================================================================
  // 6. TRANSPORT ATTENDANCE
  // ===========================================================================

  async recordAttendance(dto: RecordTransportAttendanceDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    const trip = await this.prisma.transportTrip.findFirst({
      where: { id: dto.tripId, schoolId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    // Prevent duplicate boarding or drop-off for same student on this trip
    const existing = await this.prisma.transportAttendance.findUnique({
      where: {
        tripId_studentId_status: {
          tripId: dto.tripId,
          studentId: dto.studentId,
          status: dto.status,
        },
      },
    });
    if (existing) {
      return existing; // Idempotent return
    }

    return this.prisma.transportAttendance.create({
      data: {
        tripId: dto.tripId,
        studentId: dto.studentId,
        vehicleId: trip.vehicleId,
        status: dto.status,
        recordedById: user.id,
        notes: dto.notes || null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getTripAttendance(tripId: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const trip = await this.prisma.transportTrip.findFirst({ where: { id: tripId, schoolId } });
    if (!trip) throw new NotFoundException('Trip not found');

    return this.prisma.transportAttendance.findMany({
      where: { tripId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { recordedAt: 'desc' },
    });
  }

  // ===========================================================================
  // 7. PARENT & STUDENT ACCESS (STRICT GUARDIAN-CHILD VERIFICATION)
  // ===========================================================================

  async getParentChildTransport(childId: string, user: AuthUser) {
    if (user.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only parent users can access the parent transport tracker');
    }

    // Verify verified guardian relationship
    const relationship = await this.prisma.studentGuardianRelationship.findFirst({
      where: {
        guardianId: user.id,
        studentId: childId,
        verificationStatus: 'VERIFIED',
      },
    });
    if (!relationship) {
      throw new ForbiddenException('Access denied: You are not authorized to view transport records for this student');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, firstName: true, lastName: true, schoolId: true },
    });
    if (!student) throw new NotFoundException('Student record not found');

    const allocation = await this.prisma.studentTransportAllocation.findFirst({
      where: { studentId: childId, status: 'ACTIVE' },
      include: {
        route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } },
        pickupStop: true,
        dropoffStop: true,
        vehicle: true,
      },
    });

    let activeTrip: any = null;
    let latestLocation: any = null;

    if (allocation?.vehicleId) {
      activeTrip = await this.prisma.transportTrip.findFirst({
        where: { vehicleId: allocation.vehicleId, status: 'IN_PROGRESS' },
        include: { route: true, vehicle: true, driver: true },
      });

      if (activeTrip) {
        latestLocation = await this.prisma.vehicleLocation.findFirst({
          where: { tripId: activeTrip.id },
          orderBy: { timestamp: 'desc' },
        });
      }
    }

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAttendance = await this.prisma.transportAttendance.findMany({
      where: { studentId: childId, recordedAt: { gte: today } },
      orderBy: { recordedAt: 'desc' },
    });

    return {
      studentId: childId,
      studentName: `${student.firstName} ${student.lastName}`,
      allocation,
      activeTrip,
      latestLocation,
      todayAttendance,
    };
  }

  async getStudentMyTransport(user: AuthUser) {
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only student accounts can access personal transport portal');
    }

    const allocation = await this.prisma.studentTransportAllocation.findFirst({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: {
        route: { include: { stops: { orderBy: { stopOrder: 'asc' } } } },
        pickupStop: true,
        dropoffStop: true,
        vehicle: true,
      },
    });

    let activeTrip: any = null;
    let latestLocation: any = null;

    if (allocation?.vehicleId) {
      activeTrip = await this.prisma.transportTrip.findFirst({
        where: { vehicleId: allocation.vehicleId, status: 'IN_PROGRESS' },
        include: { driver: true },
      });

      if (activeTrip) {
        latestLocation = await this.prisma.vehicleLocation.findFirst({
          where: { tripId: activeTrip.id },
          orderBy: { timestamp: 'desc' },
        });
      }
    }

    return {
      allocation,
      activeTrip,
      latestLocation,
    };
  }

  // ===========================================================================
  // 8. MAINTENANCE & EXPENSES
  // ===========================================================================

  async listMaintenance(user: AuthUser, explicitSchoolId?: string, vehicleId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.vehicleMaintenance.findMany({
      where: {
        schoolId,
        ...(vehicleId ? { vehicleId } : {}),
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, vehicleCode: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async createMaintenance(dto: CreateMaintenanceDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.vehicleMaintenance.create({
      data: {
        schoolId,
        vehicleId: dto.vehicleId,
        maintenanceType: dto.maintenanceType,
        description: dto.description,
        cost: dto.cost || 0,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        nextServiceDue: dto.nextServiceDue ? new Date(dto.nextServiceDue) : null,
        serviceProvider: dto.serviceProvider || null,
      },
      include: { vehicle: true },
    });
  }

  async listExpenses(user: AuthUser, explicitSchoolId?: string, vehicleId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.vehicleExpense.findMany({
      where: {
        schoolId,
        ...(vehicleId ? { vehicleId } : {}),
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, vehicleCode: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async createExpense(dto: CreateExpenseDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: dto.vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    return this.prisma.vehicleExpense.create({
      data: {
        schoolId,
        vehicleId: dto.vehicleId,
        expenseType: dto.expenseType || 'FUEL',
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        receiptNumber: dto.receiptNumber || null,
        description: dto.description || null,
      },
      include: { vehicle: true },
    });
  }

  // ===========================================================================
  // 9. DASHBOARD SUMMARY
  // ===========================================================================

  async getDashboardSummary(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const [
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeRoutes,
      assignedStudents,
      activeTrips,
      maintenanceDueCount,
      recentTrips,
    ] = await Promise.all([
      this.prisma.vehicle.count({ where: { schoolId } }),
      this.prisma.vehicle.count({ where: { schoolId, isActive: true } }),
      this.prisma.driver.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.transportRoute.count({ where: { schoolId, isActive: true } }),
      this.prisma.studentTransportAllocation.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.transportTrip.count({ where: { schoolId, status: 'IN_PROGRESS' } }),
      this.prisma.vehicle.count({
        where: { schoolId, maintenanceStatus: { in: ['NEEDS_SERVICE', 'UNDER_MAINTENANCE'] } },
      }),
      this.prisma.transportTrip.findMany({
        where: { schoolId },
        include: { route: true, vehicle: true, driver: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Today attendance counts
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [boarded, droppedOff, absent] = await Promise.all([
      this.prisma.transportAttendance.count({
        where: { trip: { schoolId }, status: 'BOARDED', recordedAt: { gte: startOfToday } },
      }),
      this.prisma.transportAttendance.count({
        where: { trip: { schoolId }, status: 'DROPPED_OFF', recordedAt: { gte: startOfToday } },
      }),
      this.prisma.transportAttendance.count({
        where: { trip: { schoolId }, status: 'ABSENT', recordedAt: { gte: startOfToday } },
      }),
    ]);

    return {
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeRoutes,
      assignedStudents,
      activeTrips,
      attendanceToday: { boarded, droppedOff, absent },
      maintenanceDueCount,
      recentTrips,
    };
  }
}
