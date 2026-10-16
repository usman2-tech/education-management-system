/**
 * MODULE: Transport Management API Client (TASK 027)
 *
 * PURPOSE:
 * Typed HTTP client interfacing with NestJS /api/v1/transport endpoints.
 * Provides client-side helpers for fleet vehicles, drivers, routes, stops,
 * student allocations, live GPS tracking, trip management, attendance,
 * maintenance, and parent/student views.
 *
 * DEPENDENCIES:
 * apiClient, @ems/contracts
 */

import { apiClient } from './api-client';
import {
  VehicleDto,
  CreateVehicleDto,
  UpdateVehicleDto,
  DriverDto,
  CreateDriverDto,
  UpdateDriverDto,
  TransportRouteDto,
  CreateRouteDto,
  UpdateRouteDto,
  StudentTransportAllocationDto,
  CreateAllocationDto,
  UpdateAllocationDto,
  TransportTripDto,
  StartTripDto,
  GpsUpdateDto,
  TransportAttendanceDto,
  RecordTransportAttendanceDto,
  VehicleMaintenanceDto,
  CreateMaintenanceDto,
  VehicleExpenseDto,
  CreateExpenseDto,
  TransportDashboardSummaryDto,
  ParentChildTransportDto,
} from '@ems/contracts';

export const transportApi = {
  // 1. Dashboard
  async getDashboard(schoolId?: string): Promise<TransportDashboardSummaryDto> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<TransportDashboardSummaryDto>(`/transport/dashboard${query}`);
  },

  // 2. Vehicles
  async getVehicles(schoolId?: string): Promise<VehicleDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<VehicleDto[]>(`/transport/vehicles${query}`);
  },

  async getVehicle(id: string): Promise<VehicleDto> {
    return apiClient.get<VehicleDto>(`/transport/vehicles/${id}`);
  },

  async createVehicle(data: CreateVehicleDto): Promise<VehicleDto> {
    return apiClient.post<VehicleDto>('/transport/vehicles', data);
  },

  async updateVehicle(id: string, data: UpdateVehicleDto): Promise<VehicleDto> {
    return apiClient.put<VehicleDto>(`/transport/vehicles/${id}`, data);
  },

  async deleteVehicle(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/transport/vehicles/${id}`);
  },

  // 3. Drivers
  async getDrivers(schoolId?: string): Promise<DriverDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<DriverDto[]>(`/transport/drivers${query}`);
  },

  async createDriver(data: CreateDriverDto): Promise<DriverDto> {
    return apiClient.post<DriverDto>('/transport/drivers', data);
  },

  async updateDriver(id: string, data: UpdateDriverDto): Promise<DriverDto> {
    return apiClient.put<DriverDto>(`/transport/drivers/${id}`, data);
  },

  // 4. Routes & Stops
  async getRoutes(schoolId?: string): Promise<TransportRouteDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<TransportRouteDto[]>(`/transport/routes${query}`);
  },

  async getRoute(id: string): Promise<TransportRouteDto> {
    return apiClient.get<TransportRouteDto>(`/transport/routes/${id}`);
  },

  async createRoute(data: CreateRouteDto): Promise<TransportRouteDto> {
    return apiClient.post<TransportRouteDto>('/transport/routes', data);
  },

  async updateRoute(id: string, data: UpdateRouteDto): Promise<TransportRouteDto> {
    return apiClient.put<TransportRouteDto>(`/transport/routes/${id}`, data);
  },

  // 5. Student Allocations
  async getAllocations(filters?: {
    schoolId?: string;
    routeId?: string;
    studentId?: string;
  }): Promise<StudentTransportAllocationDto[]> {
    const params = new URLSearchParams();
    if (filters?.schoolId) params.append('schoolId', filters.schoolId);
    if (filters?.routeId) params.append('routeId', filters.routeId);
    if (filters?.studentId) params.append('studentId', filters.studentId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<StudentTransportAllocationDto[]>(`/transport/allocations${query}`);
  },

  async createAllocation(data: CreateAllocationDto): Promise<StudentTransportAllocationDto> {
    return apiClient.post<StudentTransportAllocationDto>('/transport/allocations', data);
  },

  async updateAllocation(id: string, data: UpdateAllocationDto): Promise<StudentTransportAllocationDto> {
    return apiClient.put<StudentTransportAllocationDto>(`/transport/allocations/${id}`, data);
  },

  // 6. Trips & GPS
  async startTrip(data: StartTripDto): Promise<TransportTripDto> {
    return apiClient.post<TransportTripDto>('/transport/trips/start', data);
  },

  async endTrip(id: string): Promise<TransportTripDto> {
    return apiClient.post<TransportTripDto>(`/transport/trips/${id}/end`, {});
  },

  async sendGpsUpdate(data: GpsUpdateDto): Promise<{ success: boolean; recordedAt: string }> {
    return apiClient.post<{ success: boolean; recordedAt: string }>('/transport/gps-update', data);
  },

  async getLiveVehicleLocation(vehicleId: string): Promise<any> {
    return apiClient.get<any>(`/transport/vehicles/${vehicleId}/live-location`);
  },

  async getLiveTrips(schoolId?: string): Promise<TransportTripDto[]> {
    const query = schoolId ? `?schoolId=${encodeURIComponent(schoolId)}` : '';
    return apiClient.get<TransportTripDto[]>(`/transport/trips/live${query}`);
  },

  // 7. Attendance
  async recordAttendance(data: RecordTransportAttendanceDto): Promise<TransportAttendanceDto> {
    return apiClient.post<TransportAttendanceDto>('/transport/attendance', data);
  },

  async getTripAttendance(tripId: string): Promise<TransportAttendanceDto[]> {
    return apiClient.get<TransportAttendanceDto[]>(`/transport/trips/${tripId}/attendance`);
  },

  // 8. Parent & Student Views
  async getParentChildTransport(childId: string): Promise<ParentChildTransportDto> {
    return apiClient.get<ParentChildTransportDto>(`/transport/parent/child/${childId}`);
  },

  async getStudentTransport(): Promise<any> {
    return apiClient.get<any>('/transport/student/my-transport');
  },

  // 9. Maintenance & Expenses
  async getMaintenances(vehicleId?: string, schoolId?: string): Promise<VehicleMaintenanceDto[]> {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (schoolId) params.append('schoolId', schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<VehicleMaintenanceDto[]>(`/transport/maintenance${query}`);
  },

  async createMaintenance(data: CreateMaintenanceDto): Promise<VehicleMaintenanceDto> {
    return apiClient.post<VehicleMaintenanceDto>('/transport/maintenance', data);
  },

  async getExpenses(vehicleId?: string, schoolId?: string): Promise<VehicleExpenseDto[]> {
    const params = new URLSearchParams();
    if (vehicleId) params.append('vehicleId', vehicleId);
    if (schoolId) params.append('schoolId', schoolId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get<VehicleExpenseDto[]>(`/transport/expenses${query}`);
  },

  async createExpense(data: CreateExpenseDto): Promise<VehicleExpenseDto> {
    return apiClient.post<VehicleExpenseDto>('/transport/expenses', data);
  },
};
