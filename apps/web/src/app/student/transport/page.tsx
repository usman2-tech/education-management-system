'use client';

/**
 * MODULE: Student My Transport Portal (TASK 027)
 *
 * PURPOSE:
 * Student-facing portal to inspect assigned school bus route, stops,
 * pickup schedule, active vehicle location radar, and attendance boarding history.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { transportApi } from '@/lib/transport-api';
import {
  Bus,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Phone,
} from 'lucide-react';

export default function StudentTransportPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTransport() {
      try {
        const res = await transportApi.getStudentTransport();
        setData(res);
      } catch (err) {
        console.error('Failed to load student transport:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTransport();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <span className="text-sm text-muted-foreground">Loading your transport details...</span>
      </div>
    );
  }

  const allocation = data?.allocation;
  const activeTrip = data?.activeTrip;
  const latestLocation = data?.latestLocation;
  const attendance = data?.attendance || [];

  if (!allocation) {
    return (
      <div className="p-8 max-w-md mx-auto text-center bg-card border border-border rounded-2xl shadow-sm mt-12 space-y-3">
        <Bus className="h-10 w-10 text-muted-foreground mx-auto" />
        <h2 className="text-base font-bold text-foreground">No Transport Assigned</h2>
        <p className="text-xs text-muted-foreground">
          You are not currently enrolled in the school transit service. If you need bus transport,
          please ask your school administrator or guardian to allocate a route.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Bus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My School Transport</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assigned route, scheduled stops, and live bus tracking
            </p>
          </div>
        </div>

        {activeTrip ? (
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Bus In Transit
          </span>
        ) : (
          <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
            Scheduled
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Route Details */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" />
            Route & Vehicle Assignment
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Route:</span>
              <span className="font-bold text-foreground">{allocation.route?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bus Plate:</span>
              <span className="font-bold text-foreground font-mono">
                {allocation.vehicle?.registrationNumber || 'ST-BUS-101'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pickup Stop:</span>
              <span className="font-semibold text-foreground">
                {allocation.pickupStop?.stopName || 'Morning Waypoint'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Drop-off Stop:</span>
              <span className="font-semibold text-foreground">
                {allocation.dropoffStop?.stopName || 'School Main Gate'}
              </span>
            </div>
          </div>
        </div>

        {/* Boarding History */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            My Recent Boarding Logs
          </h2>

          {attendance.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No boarding records logged today.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {attendance.map((att: any) => (
                <div
                  key={att.id}
                  className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-foreground block">Status: {att.status}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(att.recordedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Recorded
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
