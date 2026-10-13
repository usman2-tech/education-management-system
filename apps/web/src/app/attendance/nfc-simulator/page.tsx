'use client';

/**
 * MODULE: Attendance Management - NFC Scan Simulation Studio
 *
 * PURPOSE:
 * Simulates institutional NFC gate terminal hardware:
 * - Provision student RFID/NFC cards (cryptographically hashed in backend)
 * - Simulate gate scans into live attendance sessions
 * - Instant feedback: ACCEPTED, DUPLICATE, or REJECTED
 * - Displays live event audit trail
 *
 * SECURITY:
 * Authenticated operators only. Token values are securely hashed via SHA-256.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import {
  AttendanceSessionDto,
  NFCScanResultDto,
  NFCAttendanceEventDto,
  ProvisionNFCIdentityResponse,
  NFCEventStatus,
} from '@ems/contracts';
import {
  fetchAttendanceSessions,
  provisionNFCIdentity,
  scanNFC,
  fetchNFCEvents,
} from '@/lib/attendance-api';
import {
  Radio,
  ArrowLeft,
  CreditCard,
  Scan,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function NFCSimulatorPage() {
  const { user } = useAuth();

  const [sessions, setSessions] = React.useState<AttendanceSessionDto[]>([]);
  const [events, setEvents] = React.useState<NFCAttendanceEventDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Scan Simulator State
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>('');
  const [scanToken, setScanToken] = React.useState<string>('NFC-STJUDE-1001');
  const [scanning, setScanning] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<NFCScanResultDto | null>(null);
  const [scanError, setScanError] = React.useState<string | null>(null);

  // Provisioning State
  const [provisionStudentId, setProvisionStudentId] = React.useState<string>('');
  const [provisionToken, setProvisionToken] = React.useState<string>('NFC-STJUDE-1001');
  const [provisioning, setProvisioning] = React.useState(false);
  const [provisionResult, setProvisionResult] = React.useState<ProvisionNFCIdentityResponse | null>(null);
  const [provisionError, setProvisionError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [sessList, evtList] = await Promise.all([
        fetchAttendanceSessions(),
        fetchNFCEvents(),
      ]);
      setSessions(sessList);
      setEvents(evtList);
      if (sessList.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessList[0].id);
      }
    } catch (err) {
      console.error('Failed to load simulator data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSimulateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !scanToken.trim()) return;

    setScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const res = await scanNFC({
        attendanceSessionId: selectedSessionId,
        cardToken: scanToken.trim(),
      });
      setScanResult(res);
      // Refresh events
      const evtList = await fetchNFCEvents(selectedSessionId);
      setEvents(evtList);
    } catch (err: any) {
      console.error('Scan simulation rejected:', err);
      const msg = err.response?.data?.message || err.message || 'Scan rejected.';
      setScanError(msg);
      // Refresh events anyway to capture the rejection audit
      const evtList = await fetchNFCEvents(selectedSessionId);
      setEvents(evtList);
    } finally {
      setScanning(false);
    }
  };

  const handleProvisionCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionStudentId.trim() || !provisionToken.trim()) return;

    setProvisioning(true);
    setProvisionResult(null);
    setProvisionError(null);

    try {
      const res = await provisionNFCIdentity({
        studentId: provisionStudentId.trim(),
        cardToken: provisionToken.trim(),
      });
      setProvisionResult(res);
    } catch (err: any) {
      console.error('Failed to provision card:', err);
      const msg = err.response?.data?.message || err.message || 'Provisioning failed.';
      setProvisionError(msg);
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Nav */}
      <Link
        href="/attendance"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attendance Dashboard
      </Link>

      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Radio className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          NFC Gate Scanner & Simulation Studio
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
          Simulate institutional NFC entrance terminals and classroom card readers. Card tokens are cryptographically hashed using SHA-256; duplicate and cross-school scans are detected and rejected in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel 1: Live Gate Scan Terminal */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scan className="h-5 w-5 text-emerald-600" />
              Simulate Gate Terminal Scan
            </h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              Terminal Online
            </span>
          </div>

          <form onSubmit={handleSimulateScan} className="space-y-4">
            {/* Target Session */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Attendance Session
              </label>
              {loading ? (
                <div className="text-xs text-slate-500">Loading active sessions...</div>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select session...</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.className} — {s.sectionName} ({s.attendanceDate}) [{s.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Card Token Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Simulated NFC Card Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. NFC-STJUDE-1001"
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={scanning || !selectedSessionId}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Simulate Tap
                </button>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Quick Test Token Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScanToken('NFC-STJUDE-1001')}
                  className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Liam Chen (Valid: NFC-STJUDE-1001)
                </button>
                <button
                  type="button"
                  onClick={() => setScanToken('NFC-CROSS-9999')}
                  className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cross-School Token
                </button>
                <button
                  type="button"
                  onClick={() => setScanToken('NFC-UNREGISTERED-0000')}
                  className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Unregistered Card
                </button>
              </div>
            </div>
          </form>

          {/* Scan Result Feedback */}
          {scanResult && (
            <div
              className={`rounded-xl border p-4 space-y-1.5 ${
                scanResult.eventStatus === 'ACCEPTED'
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {scanResult.eventStatus === 'ACCEPTED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                )}
                <span className="font-bold text-sm">
                  {scanResult.eventStatus === 'ACCEPTED' ? 'Access Granted & Marked Present' : 'Duplicate Scan Detected'}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 pl-7">{scanResult.message}</p>
            </div>
          )}

          {scanError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
                <span className="font-bold text-sm text-rose-700 dark:text-rose-400">
                  NFC Terminal Scan Rejected
                </span>
              </div>
              <p className="text-xs text-rose-600 dark:text-rose-300 pl-7">{scanError}</p>
            </div>
          )}
        </div>

        {/* Panel 2: Provision Student Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Provision New Student NFC Card
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Admin Protected
            </span>
          </div>

          <form onSubmit={handleProvisionCard} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Student User UUID
              </label>
              <input
                type="text"
                placeholder="Enter Student UUID or pick from session roster"
                value={provisionStudentId}
                onChange={(e) => setProvisionStudentId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400">
                Tip: Copy UUID from attendance register student roster or student directory.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Physical Card Chip Token Identifier
              </label>
              <input
                type="text"
                placeholder="e.g. NFC-STJUDE-4091"
                value={provisionToken}
                onChange={(e) => setProvisionToken(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-400">
                Plaintext value is encrypted with SHA-256; only the token hash is permanently stored.
              </p>
            </div>

            <button
              type="submit"
              disabled={provisioning}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {provisioning ? 'Registering Card Identity...' : 'Provision Simulated Card'}
            </button>
          </form>

          {provisionResult && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {provisionResult.message}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400">
                Student: <strong>{provisionResult.identity.studentName}</strong> ({provisionResult.maskedToken})
              </div>
            </div>
          )}

          {provisionError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30">
              {provisionError}
            </div>
          )}
        </div>
      </div>

      {/* Audit Events Trail Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Live NFC Scanner Event Audit Log ({events.length})
          </h3>
          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {events.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No NFC scan events recorded in this session window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Timestamp</th>
                  <th className="px-6 py-3 font-semibold">Identified Student</th>
                  <th className="px-6 py-3 font-semibold">Scan Result</th>
                  <th className="px-6 py-3 font-semibold">Rejection / Audit Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                      {evt.studentName || 'Unresolved Token'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          evt.eventStatus === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : evt.eventStatus === 'DUPLICATE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        {evt.eventStatus}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {evt.rejectionReason || 'Physical entry verified and marked PRESENT.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
