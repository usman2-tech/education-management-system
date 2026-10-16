/**
 * MODULE: Transport Management Controller (TASK 027)
 *
 * PURPOSE:
 * Exposes REST endpoints for fleet, drivers, routes, stops, student allocations,
 * real-time GPS tracking ingestion, transport attendance, parent child tracking,
 * and vehicle maintenance.
 *
 * SECURITY:
 * Guarded by JwtAuthGuard and RolesGuard.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransportService } from './transport.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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

@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // ---------------------------------------------------------------------------
  // 1. DASHBOARD & FLEET OVERVIEW
  // ---------------------------------------------------------------------------

  @Get('dashboard')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getDashboard(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.getDashboardSummary(user, schoolId);
  }

  // ---------------------------------------------------------------------------
  // 2. VEHICLE MANAGEMENT
  // ---------------------------------------------------------------------------

  @Get('vehicles')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async listVehicles(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('isActive') isActive?: string
  ) {
    const activeFilter = isActive !== undefined ? isActive === 'true' : undefined;
    return this.transportService.listVehicles(user, schoolId, activeFilter);
  }

  @Get('vehicles/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getVehicle(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.getVehicle(id, user);
  }

  @Post('vehicles')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createVehicle(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.createVehicle(dto, user, schoolId);
  }

  @Put('vehicles/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateVehicle(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.updateVehicle(id, dto, user);
  }

  @Delete('vehicles/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async archiveVehicle(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.archiveVehicle(id, user);
  }

  // ---------------------------------------------------------------------------
  // 3. DRIVER MANAGEMENT
  // ---------------------------------------------------------------------------

  @Get('drivers')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listDrivers(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.listDrivers(user, schoolId);
  }

  @Post('drivers')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createDriver(
    @Body() dto: CreateDriverDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.createDriver(dto, user, schoolId);
  }

  @Put('drivers/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateDriver(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.updateDriver(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 4. ROUTES & STOPS
  // ---------------------------------------------------------------------------

  @Get('routes')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  async listRoutes(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.listRoutes(user, schoolId);
  }

  @Get('routes/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT)
  async getRoute(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.getRoute(id, user);
  }

  @Post('routes')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createRoute(
    @Body() dto: CreateRouteDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.createRoute(dto, user, schoolId);
  }

  @Put('routes/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.updateRoute(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 5. STUDENT ALLOCATIONS
  // ---------------------------------------------------------------------------

  @Get('allocations')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listAllocations(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('routeId') routeId?: string
  ) {
    return this.transportService.listAllocations(user, schoolId, routeId);
  }

  @Post('allocations')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createAllocation(
    @Body() dto: CreateAllocationDto,
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.createAllocation(dto, user, schoolId);
  }

  @Put('allocations/:id')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async updateAllocation(
    @Param('id') id: string,
    @Body() dto: UpdateAllocationDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.updateAllocation(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // 6. TRIPS & REAL-TIME GPS TRACKING
  // ---------------------------------------------------------------------------

  @Post('trips/start')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async startTrip(@Body() dto: StartTripDto, @CurrentUser() user: AuthUser) {
    return this.transportService.startTrip(dto, user);
  }

  @Post('trips/:id/end')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async endTrip(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.endTrip(id, user);
  }

  @Post('gps-update')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async recordGpsUpdate(@Body() dto: GpsUpdateDto, @CurrentUser() user: AuthUser) {
    return this.transportService.recordGpsUpdate(dto, user);
  }

  @Get('vehicles/:id/live-location')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT)
  async getLatestVehicleLocation(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.getLatestVehicleLocation(id, user);
  }

  @Get('trips/live')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getActiveTripsWithLocations(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.transportService.getActiveTripsWithLocations(user, schoolId);
  }

  // ---------------------------------------------------------------------------
  // 7. TRANSPORT ATTENDANCE
  // ---------------------------------------------------------------------------

  @Post('attendance')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async recordAttendance(
    @Body() dto: RecordTransportAttendanceDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.recordAttendance(dto, user);
  }

  @Get('trips/:id/attendance')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  async getTripAttendance(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.transportService.getTripAttendance(id, user);
  }

  // ---------------------------------------------------------------------------
  // 8. PARENT & STUDENT ACCESS
  // ---------------------------------------------------------------------------

  @Get('parent/child/:childId')
  @Roles(UserRole.PARENT)
  async getParentChildTransport(
    @Param('childId') childId: string,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.getParentChildTransport(childId, user);
  }

  @Get('student/my-transport')
  @Roles(UserRole.STUDENT)
  async getStudentMyTransport(@CurrentUser() user: AuthUser) {
    return this.transportService.getStudentMyTransport(user);
  }

  // ---------------------------------------------------------------------------
  // 9. MAINTENANCE & EXPENSES
  // ---------------------------------------------------------------------------

  @Get('maintenance')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listMaintenance(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('vehicleId') vehicleId?: string
  ) {
    return this.transportService.listMaintenance(user, schoolId, vehicleId);
  }

  @Post('maintenance')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createMaintenance(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.createMaintenance(dto, user);
  }

  @Get('expenses')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async listExpenses(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
    @Query('vehicleId') vehicleId?: string
  ) {
    return this.transportService.listExpenses(user, schoolId, vehicleId);
  }

  @Post('expenses')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createExpense(
    @Body() dto: CreateExpenseDto,
    @CurrentUser() user: AuthUser
  ) {
    return this.transportService.createExpense(dto, user);
  }
}
