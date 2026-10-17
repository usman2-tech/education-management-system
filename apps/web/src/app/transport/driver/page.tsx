'use client';

/**
 * MODULE: Mobile Driver GPS Tracking & Attendance Portal (TASK 027)
 *
 * PURPOSE:
 * Smartphone-optimized tracking interface for vehicle drivers & transit conductors:
 * - Start / End Trip with assigned route & vehicle validation
 * - Native browser Geolocation API integration (watchPosition)
 * - Transmits lat, lng, accuracy, speed, heading, tripId
 * - Live connection status & satellite accuracy indicator
 * - Transport attendance marking desk for student boarding & drop-off
 * - Clearly labeled fallback simulator for testing in developer environments
 *
 * SECURITY:
 * Authenticated driver session. Server verifies vehicle & school tenancy.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { transportApi } from '@/lib/transport-api';
import {
  Bus,
  Navigation,
  Radio,
  Play,
  Square,
  Compass,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  Check,
  X,
  Loader2,
} from 'lucide-react';

export default function DriverTrackingPage() {
  const { user } = useAuth();

  const [routes, setRoutes] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [activeTrip, setActiveTrip] = useState<any>(null);

  const [trackingActive, setTrackingActive] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
  } | null>(null);

  const [allocations, setAllocations] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const watchIdRef = useRef<number | null>(null);

  // Load available routes & vehicles
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [rRes, vRes] = await Promise.all([
          transportApi.getRoutes(),
          transportApi.getVehicles(),
        ]);
        setRoutes(rRes || []);
        setVehicles(vRes || []);
        if (rRes && rRes.length > 0) setSelectedRouteId(rRes[0].id);
        if (vRes && vRes.length > 0) setSelectedVehicleId(vRes[0].id);
      } catch (err) {
        console.error('Failed to load driver options:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // When route changes, fetch students allocated to that route
  useEffect(() => {
    if (!selectedRouteId) return;
    transportApi.getAllocations({ routeId: selectedRouteId }).then((allocs) => {
      setAllocations(allocs || []);
    });
  }, [selectedRouteId]);

  // Start trip handler
  const handleStartTrip = async () => {
    if (!selectedRouteId || !selectedVehicleId) {
      alert('Please select both route and vehicle.');
      return;
    }
    try {
      const trip = await transportApi.startTrip({
        routeId: selectedRouteId,
        vehicleId: selectedVehicleId,
        tripType: 'PICKUP',
      });
      setActiveTrip(trip);
      startBrowserGpsTracking(trip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to start trip');
    }
  };

  // End trip handler
  const handleEndTrip = async () => {
    if (!activeTrip) return;
    try {
      await transportApi.endTrip(activeTrip.id);
      stopBrowserGpsTracking();
      setActiveTrip(null);
      setCurrentCoords(null);
      alert('Trip ended successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to end trip');
    }
  };

  // Browser Geolocation API tracking
  const startBrowserGpsTracking = (tripId: string) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }

    setTrackingActive(true);
    setGpsError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        setCurrentCoords({ latitude, longitude, accuracy, speed });

        try {
          await transportApi.sendGpsUpdate({
            tripId,
            latitude,
            longitude,
            accuracy: accuracy || undefined,
            speed: speed !== null ? speed * 3.6 : undefined, // m/s to km/h
            heading: heading !== null && !isNaN(heading) ? heading : undefined,
            isSimulated: false,
          });
        } catch (e) {
          console.error('GPS transmission error:', e);
        }
      },
      (err) => {
        console.warn('Geolocation watch error:', err.message);
        setGpsError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  const stopBrowserGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);
  };

  // Simulated GPS step for local desktop testing
  const handleSimulateStep = async () => {
    if (!activeTrip) return;
    const baseLat = 24.7136;
    const baseLng = 46.6753;
    const step = Object.keys(attendanceRecords).length + 1;
    const lat = baseLat + step * 0.002;
    const lng = baseLng + step * 0.0015;

    setCurrentCoords({ latitude: lat, longitude: lng, accuracy: 5, speed: 40 });

    try {
      await transportApi.sendGpsUpdate({
        tripId: activeTrip.id,
        latitude: lat,
        longitude: lng,
        accuracy: 5.0,
        speed: 40.0,
        heading: 90,
        isSimulated: true,
      });
    } catch (e) {
      console.error('Simulated GPS failed:', e);
    }
  };

  // Record transport attendance
  const handleMarkAttendance = async (studentId: string, status: 'BOARDED' | 'DROPPED_OFF' | 'ABSENT') => {
    if (!activeTrip) {
      alert('You must start a trip before recording passenger attendance.');
      return;
    }
    try {
      await transportApi.recordAttendance({
        tripId: activeTrip.id,
        studentId,
        status,
        notes: `Marked from driver portal at ${new Date().toLocaleTimeString()}`,
      });
      setAttendanceRecords((prev) => ({ ...prev, [studentId]: status }));
    } catch (err: any) {
      alert(err.message || 'Failed to record attendance');
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 pb-20">
      {/* Driver Header */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
          <Bus className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Driver Live GPS Portal</h1>
        <p className="text-xs text-muted-foreground">
          Mobile tracking console for transit drivers and authorized conductors
        </p>

        {trackingActive && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold animate-pulse">
            <Radio className="h-3.5 w-3.5" />
            LIVE SATELLITE TRACKING ACTIVE
          </div>
        )}
      </div>

      {/* Trip Configuration / Active Status Card */}
      {!activeTrip ? (
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary" />
            Configure Scheduled Trip
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-foreground block mb-1">Assigned Route</label>
              <select
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:outline-hidden"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Vehicle Plate</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground font-medium focus:outline-hidden"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.vehicleCode}) - {v.seatingCapacity} seats
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartTrip}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm mt-2"
            >
              <Play className="h-4 w-4 fill-white" />
              Start Trip & Enable GPS
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Transit Trip
              </span>
              <h3 className="text-base font-bold text-foreground">
                {routes.find((r) => r.id === selectedRouteId)?.name}
              </h3>
            </div>
            <button
              onClick={handleEndTrip}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              End Trip
            </button>
          </div>

          {/* Coordinate Telemetry Card */}
          <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Latitude:</span>
              <span className="font-bold text-foreground">
                {currentCoords ? currentCoords.latitude.toFixed(5) : 'Acquiring...'}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Longitude:</span>
              <span className="font-bold text-foreground">
                {currentCoords ? currentCoords.longitude.toFixed(5) : 'Acquiring...'}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Speed:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {currentCoords?.speed ? `${currentCoords.speed.toFixed(1)} km/h` : '0 km/h'}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="font-bold text-foreground">
                {currentCoords?.accuracy ? `±${Math.round(currentCoords.accuracy)}m` : '—'}
              </span>
            </div>
          </div>

          {gpsError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{gpsError} (You can use the simulator button below for desktop testing)</span>
            </div>
          )}

          {/* Desktop Simulator Button */}
          <button
            onClick={handleSimulateStep}
            className="w-full py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
          >
            <Compass className="h-3.5 w-3.5" />
            Send Test GPS Step (Simulator)
          </button>
        </div>
      )}

      {/* Passenger Boarding & Drop-off Attendance Checklist */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Student Passengers ({allocations.length})
          </h2>
          <span className="text-[10px] text-muted-foreground font-medium">Route Roster</span>
        </div>

        {allocations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No students currently allocated to this route.
          </p>
        ) : (
          <div className="space-y-2">
            {allocations.map((a) => {
              const status = attendanceRecords[a.studentId];
              return (
                <div
                  key={a.id}
                  className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground block">
                      {a.student?.firstName} {a.student?.lastName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Stop: {a.pickupStop?.stopName || 'Standard Pickup'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleMarkAttendance(a.studentId, 'BOARDED')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                        status === 'BOARDED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-muted hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                      }`}
                    >
                      Board
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(a.studentId, 'DROPPED_OFF')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                        status === 'DROPPED_OFF'
                          ? 'bg-blue-600 text-white'
                          : 'bg-muted hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600'
                      }`}
                    >
                      Drop
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(a.studentId, 'ABSENT')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                        status === 'ABSENT'
                          ? 'bg-red-600 text-white'
                          : 'bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-600'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
