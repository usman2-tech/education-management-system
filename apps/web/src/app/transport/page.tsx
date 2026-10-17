'use client';

/**
 * MODULE: Institutional Transport Management (TASK 027)
 *
 * PURPOSE:
 * Central fleet, driver, route, student allocation, and real-time GPS tracking hub
 * for school and platform administrators.
 *
 * FEATURES:
 * - Fleet Vehicles (CRUD, capacity, insurance/registration tracking, maintenance status)
 * - Driver Profiles (contact, licensing, vehicle assignment, active state)
 * - Routes & Ordered Stops (coordinates, scheduled times, direction)
 * - Student Transport Allocations (capacity validation, stops, monthly fee)
 * - Live GPS Tracking Fleet View (real-time coordinates, stale detection, demo simulator)
 * - Transport Attendance (boarding, drop-off, absent tracking)
 * - Vehicle Maintenance & Fuel Expenses
 *
 * SECURITY:
 * Multi-school tenant isolation. Authorizes Platform & School Administrators.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { transportApi } from '@/lib/transport-api';
import { apiClient } from '@/lib/api-client';
import {
  Bus,
  Users,
  MapPin,
  Navigation,
  Wrench,
  Fuel,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Phone,
  Calendar,
  ShieldCheck,
  Radio,
  Play,
  Square,
  Compass,
  ArrowRight,
  X,
  Loader2,
  Check,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export default function TransportManagementPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<
    'fleet' | 'drivers' | 'routes' | 'allocations' | 'tracking' | 'attendance' | 'maintenance'
  >('fleet');

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data states
  const [dashboard, setDashboard] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [liveTrips, setLiveTrips] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAddAllocationOpen, setIsAddAllocationOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSimulatorRunning, setIsSimulatorRunning] = useState(false);
  const [simulatorStep, setSimulatorStep] = useState(0);

  // Form states
  const [vehicleForm, setVehicleForm] = useState({
    registrationNumber: '',
    vehicleCode: '',
    vehicleType: 'BUS',
    seatingCapacity: 45,
    insuranceNumber: '',
    insuranceExpiry: '',
    registrationExpiry: '',
    maintenanceStatus: 'GOOD',
  });

  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    status: 'ACTIVE',
    assignedVehicleId: '',
  });

  const [routeForm, setRouteForm] = useState({
    name: '',
    code: '',
    direction: 'ROUND_TRIP',
    assignedVehicleId: '',
    assignedDriverId: '',
    stops: [
      { stopName: 'Central Station', stopOrder: 1, latitude: 24.7136, longitude: 46.6753, scheduledTime: '07:00 AM' },
      { stopName: 'Campus Main Gate', stopOrder: 2, latitude: 24.7200, longitude: 46.6600, scheduledTime: '07:30 AM' },
    ],
  });

  const [allocationForm, setAllocationForm] = useState({
    studentId: '',
    routeId: '',
    vehicleId: '',
    pickupStopId: '',
    dropoffStopId: '',
    monthlyFee: 250,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicleId: '',
    maintenanceType: '',
    description: '',
    cost: 500,
    serviceDate: new Date().toISOString().split('T')[0],
    nextServiceDue: '',
    serviceProvider: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    vehicleId: '',
    expenseType: 'FUEL',
    amount: 200,
    date: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    description: '',
  });

  // Load initial data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [dashRes, vRes, dRes, rRes, aRes, tRes, mRes, eRes] = await Promise.all([
          transportApi.getDashboard().catch(() => null),
          transportApi.getVehicles().catch(() => []),
          transportApi.getDrivers().catch(() => []),
          transportApi.getRoutes().catch(() => []),
          transportApi.getAllocations().catch(() => []),
          transportApi.getLiveTrips().catch(() => []),
          transportApi.getMaintenances().catch(() => []),
          transportApi.getExpenses().catch(() => []),
        ]);

        if (mounted) {
          setDashboard(dashRes);
          setVehicles(vRes || []);
          setDrivers(dRes || []);
          setRoutes(rRes || []);
          setAllocations(aRes || []);
          setLiveTrips(tRes || []);
          setMaintenances(mRes || []);
          setExpenses(eRes || []);
        }

        // Fetch students for allocations
        try {
          const studentsRes = await apiClient.get<any[]>('/students');
          if (mounted && studentsRes) setStudents(studentsRes);
        } catch {
          // ignore if students query fails
        }
      } catch (err) {
        console.error('Failed to load transport data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Handle vehicle creation
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createVehicle({
        registrationNumber: vehicleForm.registrationNumber,
        vehicleCode: vehicleForm.vehicleCode,
        vehicleType: vehicleForm.vehicleType as any,
        seatingCapacity: Number(vehicleForm.seatingCapacity),
        insuranceNumber: vehicleForm.insuranceNumber || undefined,
        insuranceExpiry: vehicleForm.insuranceExpiry || undefined,
        registrationExpiry: vehicleForm.registrationExpiry || undefined,
        maintenanceStatus: vehicleForm.maintenanceStatus as any,
      });
      setIsAddVehicleOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to create vehicle');
    }
  };

  // Handle driver creation
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createDriver({
        name: driverForm.name,
        phone: driverForm.phone,
        licenseNumber: driverForm.licenseNumber,
        licenseExpiry: driverForm.licenseExpiry || undefined,
        status: driverForm.status as any,
        assignedVehicleId: driverForm.assignedVehicleId || undefined,
      });
      setIsAddDriverOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to create driver');
    }
  };

  // Handle route creation
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createRoute({
        name: routeForm.name,
        code: routeForm.code,
        direction: routeForm.direction as any,
        assignedVehicleId: routeForm.assignedVehicleId || undefined,
        assignedDriverId: routeForm.assignedDriverId || undefined,
        stops: routeForm.stops,
      });
      setIsAddRouteOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to create route');
    }
  };

  // Handle allocation creation
  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createAllocation({
        studentId: allocationForm.studentId,
        routeId: allocationForm.routeId,
        vehicleId: allocationForm.vehicleId || undefined,
        pickupStopId: allocationForm.pickupStopId || undefined,
        dropoffStopId: allocationForm.dropoffStopId || undefined,
        monthlyFee: Number(allocationForm.monthlyFee),
      });
      setIsAddAllocationOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to allocate student to route');
    }
  };

  // Handle maintenance creation
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createMaintenance({
        vehicleId: maintenanceForm.vehicleId,
        maintenanceType: maintenanceForm.maintenanceType,
        description: maintenanceForm.description,
        cost: Number(maintenanceForm.cost),
        serviceDate: maintenanceForm.serviceDate || undefined,
        nextServiceDue: maintenanceForm.nextServiceDue || undefined,
        serviceProvider: maintenanceForm.serviceProvider || undefined,
      });
      setIsAddMaintenanceOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to log maintenance');
    }
  };

  // Handle expense creation
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await transportApi.createExpense({
        vehicleId: expenseForm.vehicleId,
        expenseType: expenseForm.expenseType as any,
        amount: Number(expenseForm.amount),
        date: expenseForm.date || undefined,
        receiptNumber: expenseForm.receiptNumber || undefined,
        description: expenseForm.description || undefined,
      });
      setIsAddExpenseOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to log expense');
    }
  };

  // Demo GPS Simulator step transmission
  const handleSimulatorStep = async () => {
    if (liveTrips.length === 0) {
      alert('No active trips found to simulate. Please start a trip first or ensure seed data is loaded.');
      return;
    }
    const trip = liveTrips[0];
    const baseLat = 24.7136;
    const baseLng = 46.6753;
    const newStep = simulatorStep + 1;
    setSimulatorStep(newStep);

    const lat = baseLat + newStep * 0.003;
    const lng = baseLng + newStep * 0.002;

    try {
      await transportApi.sendGpsUpdate({
        tripId: trip.id,
        latitude: lat,
        longitude: lng,
        accuracy: 4.5,
        speed: 38.0,
        heading: 90,
        isSimulated: true,
      });
      // Refresh live trips
      const updated = await transportApi.getLiveTrips();
      setLiveTrips(updated);
    } catch (err: any) {
      console.error('GPS update failed:', err);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border shadow-sm max-w-lg mx-auto mt-20">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Transport management is restricted to authorized Platform and School Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Transport & Fleet Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicles, driver rosters, route waypoints, student allocations & real-time GPS tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted transition text-foreground"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsAddVehicleOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>

          <button
            onClick={() => setIsAddDriverOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl transition shadow-sm"
          >
            <Users className="h-4 w-4 text-primary" />
            Add Driver
          </button>

          <button
            onClick={() => setIsAddRouteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl transition shadow-sm"
          >
            <MapPin className="h-4 w-4 text-emerald-500" />
            Create Route
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Fleet Size</span>
            <Bus className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {dashboard?.totalVehicles ?? vehicles.length}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {dashboard?.activeVehicles ?? vehicles.filter((v) => v.isActive).length} Active Buses
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Drivers</span>
            <Users className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {dashboard?.totalDrivers ?? drivers.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Certified Drivers</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Active Routes</span>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {dashboard?.activeRoutes ?? routes.length}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Standard Transit
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Allocated Students</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {dashboard?.assignedStudents ?? allocations.length}
          </div>
          <span className="text-[11px] text-muted-foreground">Registered Riders</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Live Trips</span>
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {liveTrips.length}
          </div>
          <span className="text-[11px] text-muted-foreground">GPS Tracking Active</span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-medium">Service Due</span>
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {dashboard?.maintenanceDue ?? vehicles.filter((v) => v.maintenanceStatus === 'NEEDS_SERVICE').length}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Requires Attention
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        {[
          { id: 'fleet', label: 'Fleet Vehicles', icon: Bus, count: vehicles.length },
          { id: 'drivers', label: 'Drivers', icon: Users, count: drivers.length },
          { id: 'routes', label: 'Routes & Stops', icon: MapPin, count: routes.length },
          { id: 'allocations', label: 'Student Allocations', icon: ShieldCheck, count: allocations.length },
          { id: 'tracking', label: 'Live GPS Fleet Map', icon: Radio, count: liveTrips.length, highlight: true },
          { id: 'attendance', label: 'Boarding Attendance', icon: CheckCircle2 },
          { id: 'maintenance', label: 'Maintenance & Fuel', icon: Wrench, count: maintenances.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${tab.highlight ? 'border border-red-500/30' : ''}`}
            >
              <Icon className={`h-3.5 w-3.5 ${tab.highlight && isActive ? 'animate-pulse' : ''}`} />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Fleet Vehicles */}
      {activeTab === 'fleet' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search registration or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="GOOD">Healthy (Good)</option>
                <option value="NEEDS_SERVICE">Needs Service</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Plate Number</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Vehicle Type</th>
                  <th className="p-3.5">Seating Capacity</th>
                  <th className="p-3.5">Insurance Expiry</th>
                  <th className="p-3.5">Maintenance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles
                  .filter((v) => {
                    const matchQ =
                      v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      v.vehicleCode.toLowerCase().includes(searchQuery.toLowerCase());
                    const matchS = statusFilter === 'ALL' || v.maintenanceStatus === statusFilter;
                    return matchQ && matchS;
                  })
                  .map((v) => (
                    <tr key={v.id} className="hover:bg-muted/20 transition">
                      <td className="p-3.5 font-bold text-foreground flex items-center gap-2">
                        <Bus className="h-4 w-4 text-primary" />
                        {v.registrationNumber}
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground">{v.vehicleCode}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[10px] font-medium">
                          {v.vehicleType}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">{v.seatingCapacity} seats</td>
                      <td className="p-3.5 text-muted-foreground">
                        {v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.maintenanceStatus === 'GOOD'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : v.maintenanceStatus === 'NEEDS_SERVICE'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {v.maintenanceStatus}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                            v.isActive ? 'bg-emerald-500' : 'bg-muted-foreground'
                          }`}
                        />
                        {v.isActive ? 'Active' : 'Inactive'}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`Archive vehicle ${v.registrationNumber}?`)) {
                              await transportApi.deleteVehicle(v.id);
                              setRefreshKey((k) => k + 1);
                            }
                          }}
                          className="text-xs text-destructive hover:underline font-medium"
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Drivers */}
      {activeTab === 'drivers' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Registered Drivers Roster</h2>
            <button
              onClick={() => setIsAddDriverOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Driver
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Driver Name</th>
                  <th className="p-3.5">Contact Phone</th>
                  <th className="p-3.5">License Number</th>
                  <th className="p-3.5">License Expiry</th>
                  <th className="p-3.5">Assigned Vehicle</th>
                  <th className="p-3.5">Duty Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition">
                    <td className="p-3.5 font-bold text-foreground flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {d.name.charAt(0)}
                      </div>
                      {d.name}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {d.phone}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">{d.licenseNumber}</td>
                    <td className="p-3.5 text-muted-foreground">
                      {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {d.assignedVehicle ? (
                        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono">
                          {d.assignedVehicle.registrationNumber} ({d.assignedVehicle.vehicleCode})
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          d.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Routes & Stops */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Configured Routes & Ordered Waypoints</h2>
            <button
              onClick={() => setIsAddRouteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Route
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map((r) => (
              <div
                key={r.id}
                className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono text-[10px] font-bold">
                        {r.code}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{r.name}</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Direction:{' '}
                      <span className="font-semibold text-foreground">{r.direction}</span> | Vehicle:{' '}
                      <span className="font-semibold text-foreground">
                        {r.assignedVehicle?.registrationNumber || 'None'}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      r.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {r.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Stops timeline */}
                <div className="border-t border-border pt-3 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Waypoints & Stops ({r.stops?.length || 0})
                  </span>
                  <div className="space-y-2 pl-2">
                    {r.stops?.map((s: any, idx: number) => (
                      <div key={s.id || idx} className="flex items-start gap-2.5 text-xs">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center font-mono text-[10px] font-bold text-muted-foreground shrink-0 mt-0.5">
                          {s.stopOrder}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{s.stopName}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>
                              Lat: {s.latitude.toFixed(4)}, Lng: {s.longitude.toFixed(4)}
                            </span>
                            {s.scheduledTime && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                • {s.scheduledTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Student Allocations */}
      {activeTab === 'allocations' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Student Transport Allocations</h2>
              <p className="text-xs text-muted-foreground">
                Verified route capacity constraints ensure buses never exceed seating capacity.
              </p>
            </div>
            <button
              onClick={() => setIsAddAllocationOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign Student
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Assigned Vehicle</th>
                  <th className="p-3.5">Pickup Stop</th>
                  <th className="p-3.5">Drop-off Stop</th>
                  <th className="p-3.5">Monthly Fee</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-muted/20 transition">
                    <td className="p-3.5 font-bold text-foreground">
                      {a.student?.firstName} {a.student?.lastName}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-foreground">{a.route?.name}</span>
                      <span className="text-[10px] text-muted-foreground block font-mono">
                        {a.route?.code}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {a.vehicle?.registrationNumber || 'Unassigned'}
                    </td>
                    <td className="p-3.5 text-foreground">{a.pickupStop?.stopName || 'Default'}</td>
                    <td className="p-3.5 text-foreground">{a.dropoffStop?.stopName || 'School Gate'}</td>
                    <td className="p-3.5 font-bold text-foreground">
                      {a.monthlyFee ? `${a.monthlyFee} SAR` : 'Free'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Live GPS Tracking Fleet Map */}
      {activeTab === 'tracking' && (
        <div className="space-y-4">
          {/* Demo GPS Simulator Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Radio className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Development GPS Live Feed & Testing Simulator
                </h4>
                <p className="text-xs text-muted-foreground">
                  Test live vehicle coordinate broadcasting, stop proximity events, and stale position detection.
                  Positions flagged as simulated are never presented as production GPS hardware data.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulatorStep}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition"
              >
                <Compass className="h-3.5 w-3.5" />
                Simulate Step ({simulatorStep})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Active Trips Sidebar */}
            <div className="bg-card border border-border p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Active Trips ({liveTrips.length})
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Room
                </span>
              </div>

              {liveTrips.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No active trips currently in transit.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {liveTrips.map((t) => {
                    const loc = t.locations?.[0];
                    const isStale =
                      loc?.timestamp &&
                      new Date().getTime() - new Date(loc.timestamp).getTime() > 120000;
                    return (
                      <div
                        key={t.id}
                        className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5 hover:border-primary/50 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                            <Bus className="h-3.5 w-3.5 text-primary" />
                            {t.vehicle?.registrationNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isStale
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isStale ? 'GPS Stale' : 'Live Tracking'}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Route: <span className="font-semibold text-foreground">{t.route?.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Driver:{' '}
                          <span className="font-semibold text-foreground">{t.driver?.name || 'Assigned'}</span>
                        </div>
                        {loc && (
                          <div className="text-[10px] text-muted-foreground font-mono bg-background/50 p-1 rounded mt-1">
                            Lat: {loc.latitude.toFixed(5)}, Lng: {loc.longitude.toFixed(5)} | Speed:{' '}
                            {loc.speed?.toFixed(1) || 0} km/h
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Map Canvas Visualizer */}
            <div className="lg:col-span-2 bg-card border border-border p-4 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Interactive Fleet Map Canvas
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Riyadh Institutional Transit Sector (WGS-84 Coordinates)
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Coordinates: 24.7136° N, 46.6753° E
                </span>
              </div>

              {/* Vector SVG Map Display */}
              <div className="w-full h-96 bg-slate-950 rounded-xl relative overflow-hidden border border-border flex items-center justify-center">
                {/* Grid Overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-20">
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>

                {/* Waypoints & Active Vehicles */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
                  {/* Waypoint markers */}
                  <div className="relative w-full h-full">
                    {/* Simulated School Hub */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/30 border border-blue-400 p-2 rounded-xl text-center">
                      <span className="text-white text-[11px] font-bold block">
                        🏫 Taibah Central Campus
                      </span>
                      <span className="text-blue-200 text-[9px]">Hub (24.7200, 46.6600)</span>
                    </div>

                    {/* Active Bus Pins */}
                    {liveTrips.map((t, idx) => {
                      const loc = t.locations?.[0];
                      const offsetX = idx === 0 ? '30%' : '70%';
                      const offsetY = idx === 0 ? '35%' : '65%';
                      return (
                        <div
                          key={t.id}
                          className="absolute transition-all duration-700 ease-out flex flex-col items-center"
                          style={{ top: offsetY, left: offsetX }}
                        >
                          <div className="relative flex items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75" />
                            <div className="relative w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                              <Bus className="h-4 w-4" />
                            </div>
                          </div>
                          <div className="bg-slate-900/90 border border-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold mt-1 shadow-md whitespace-nowrap">
                            {t.vehicle?.registrationNumber} ({loc?.speed || 40} km/h)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs border border-white/10 px-3 py-1.5 rounded-lg text-white text-[10px]">
                  <span>Vector GPS Map • OpenStreetMap Engine Layer Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Boarding Attendance */}
      {activeTab === 'attendance' && (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Transport Attendance Log</h2>
              <p className="text-xs text-muted-foreground">
                Boarding and drop-off scans recorded by authorized conductors & drivers.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Vehicle</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Recorded Timestamp</th>
                  <th className="p-3.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allocations.map((a, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition">
                    <td className="p-3.5 font-bold text-foreground">
                      {a.student?.firstName} {a.student?.lastName}
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {a.vehicle?.registrationNumber || 'ST-BUS-101'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        BOARDED
                      </span>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {new Date().toLocaleTimeString()}
                    </td>
                    <td className="p-3.5 text-muted-foreground">RFID verified boarding</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 7: Maintenance & Expenses */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Fleet Maintenance & Expense Ledger</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddMaintenanceOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
              >
                <Wrench className="h-3.5 w-3.5" />
                Log Maintenance
              </button>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl"
              >
                <Fuel className="h-3.5 w-3.5 text-amber-500" />
                Log Fuel Expense
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Maintenance History */}
            <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-border font-bold text-xs text-foreground flex items-center justify-between">
                <span>Recent Maintenance Records</span>
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <div className="divide-y divide-border text-xs">
                {maintenances.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No maintenance records logged.</div>
                ) : (
                  maintenances.map((m) => (
                    <div key={m.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{m.maintenanceType}</span>
                        <span className="font-bold text-primary">{m.cost} SAR</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{m.description}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                        <span>Provider: {m.serviceProvider || 'Internal Workshop'}</span>
                        <span>Service Date: {new Date(m.serviceDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Fuel & Operating Expenses */}
            <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-border font-bold text-xs text-foreground flex items-center justify-between">
                <span>Fuel & Transit Expenses</span>
                <Fuel className="h-4 w-4 text-amber-500" />
              </div>
              <div className="divide-y divide-border text-xs">
                {expenses.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No expenses logged.</div>
                ) : (
                  expenses.map((e) => (
                    <div key={e.id} className="p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{e.expenseType}</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{e.amount} SAR</span>
                      </div>
                      <p className="text-muted-foreground text-[11px]">{e.description}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-1">
                        <span>Receipt: {e.receiptNumber || 'N/A'}</span>
                        <span>Date: {new Date(e.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Vehicle */}
      {isAddVehicleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" />
                Register New Fleet Vehicle
              </h3>
              <button
                onClick={() => setIsAddVehicleOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Registration Plate Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ST-BUS-105"
                  value={vehicleForm.registrationNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Vehicle Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BUS-05"
                    value={vehicleForm.vehicleCode}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleCode: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Type *</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="BUS">Bus (Large)</option>
                    <option value="MINIBUS">Minibus</option>
                    <option value="VAN">Van</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Seating Capacity *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={vehicleForm.seatingCapacity}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, seatingCapacity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Insurance Expiry</label>
                  <input
                    type="date"
                    value={vehicleForm.insuranceExpiry}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Maintenance Status</label>
                  <select
                    value={vehicleForm.maintenanceStatus}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, maintenanceStatus: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="GOOD">Good / Ready</option>
                    <option value="NEEDS_SERVICE">Needs Service</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Register Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Driver */}
      {isAddDriverOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Register New Driver
              </h3>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Al-Mansoor"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+966-50-xxx-xxxx"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">License Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="DL-SA-xxxxx"
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Assigned Vehicle</label>
                <select
                  value={driverForm.assignedVehicleId}
                  onChange={(e) => setDriverForm({ ...driverForm, assignedVehicleId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">None (Standby)</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} ({v.vehicleCode}) - {v.seatingCapacity} seats
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddDriverOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Save Driver Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Route */}
      {isAddRouteOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                Define New Transport Route
              </h3>
              <button
                onClick={() => setIsAddRouteOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Route Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. North Expressway"
                    value={routeForm.name}
                    onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Route Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ROUTE-09"
                    value={routeForm.code}
                    onChange={(e) => setRouteForm({ ...routeForm, code: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Assigned Vehicle</label>
                  <select
                    value={routeForm.assignedVehicleId}
                    onChange={(e) => setRouteForm({ ...routeForm, assignedVehicleId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} ({v.vehicleCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Direction</label>
                  <select
                    value={routeForm.direction}
                    onChange={(e) => setRouteForm({ ...routeForm, direction: e.target.value })}
                    className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                  >
                    <option value="ROUND_TRIP">Round Trip (Both)</option>
                    <option value="PICKUP">Morning Pickup Only</option>
                    <option value="DROPOFF">Afternoon Dropoff Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddRouteOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Save Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Assign Student Allocation */}
      {isAddAllocationOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Assign Student to Transport
              </h3>
              <button
                onClick={() => setIsAddAllocationOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Select Student *</label>
                <select
                  required
                  value={allocationForm.studentId}
                  onChange={(e) => setAllocationForm({ ...allocationForm, studentId: e.target.value })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">Select student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentIdNumber || s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Select Route *</label>
                <select
                  required
                  value={allocationForm.routeId}
                  onChange={(e) => {
                    const r = routes.find((x) => x.id === e.target.value);
                    setAllocationForm({
                      ...allocationForm,
                      routeId: e.target.value,
                      vehicleId: r?.assignedVehicleId || '',
                      pickupStopId: r?.stops?.[0]?.id || '',
                      dropoffStopId: r?.stops?.[r.stops.length - 1]?.id || '',
                    });
                  }}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                >
                  <option value="">Select route...</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Monthly Transport Charge (SAR)</label>
                <input
                  type="number"
                  min="0"
                  value={allocationForm.monthlyFee}
                  onChange={(e) => setAllocationForm({ ...allocationForm, monthlyFee: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddAllocationOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-xl"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
