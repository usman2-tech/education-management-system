import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  VehicleType,
  VehicleMaintenanceStatus,
  DriverStatus,
  RouteDirection,
  TransportAttendanceStatus,
  VehicleExpenseType,
} from '@prisma/client';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  registrationNumber!: string;

  @IsString()
  @IsNotEmpty()
  vehicleCode!: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsNumber()
  @Min(1)
  seatingCapacity!: number;

  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsString()
  registrationExpiry?: string;

  @IsOptional()
  @IsEnum(VehicleMaintenanceStatus)
  maintenanceStatus?: VehicleMaintenanceStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  vehicleCode?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  seatingCapacity?: number;

  @IsOptional()
  @IsString()
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;

  @IsOptional()
  @IsString()
  registrationExpiry?: string;

  @IsOptional()
  @IsEnum(VehicleMaintenanceStatus)
  maintenanceStatus?: VehicleMaintenanceStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsString()
  assignedVehicleId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string;

  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsString()
  assignedVehicleId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

export class CreateStopDto {
  @IsString()
  @IsNotEmpty()
  stopName!: string;

  @IsNumber()
  @Min(1)
  stopOrder!: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsString()
  scheduledTime?: string;
}

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsEnum(RouteDirection)
  direction?: RouteDirection;

  @IsOptional()
  @IsString()
  assignedVehicleId?: string;

  @IsOptional()
  @IsString()
  assignedDriverId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStopDto)
  stops?: CreateStopDto[];
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(RouteDirection)
  direction?: RouteDirection;

  @IsOptional()
  @IsString()
  assignedVehicleId?: string;

  @IsOptional()
  @IsString()
  assignedDriverId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStopDto)
  stops?: CreateStopDto[];
}

export class CreateAllocationDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  routeId!: string;

  @IsOptional()
  @IsString()
  pickupStopId?: string;

  @IsOptional()
  @IsString()
  dropoffStopId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;
}

export class UpdateAllocationDto {
  @IsOptional()
  @IsString()
  pickupStopId?: string;

  @IsOptional()
  @IsString()
  dropoffStopId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class StartTripDto {
  @IsString()
  @IsNotEmpty()
  routeId!: string;

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsOptional()
  @IsEnum(RouteDirection)
  tripType?: RouteDirection;
}

export class GpsUpdateDto {
  @IsString()
  @IsNotEmpty()
  tripId!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsBoolean()
  isSimulated?: boolean;
}

export class RecordTransportAttendanceDto {
  @IsString()
  @IsNotEmpty()
  tripId!: string;

  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsEnum(TransportAttendanceStatus)
  status!: TransportAttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  maintenanceType!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  serviceDate?: string;

  @IsOptional()
  @IsString()
  nextServiceDue?: string;

  @IsOptional()
  @IsString()
  serviceProvider?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsOptional()
  @IsEnum(VehicleExpenseType)
  expenseType?: VehicleExpenseType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
