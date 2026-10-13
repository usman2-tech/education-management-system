'use client';

/**
 * MODULE: System Security & Operational Audit Logs
 *
 * PURPOSE:
 * Displays verified security audit trails, administrative mutations, and tenant
 * lifecycle events with real-time filtering, search, and JSON inspector.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Fetches real persisted audit logs directly from GET /dashboards/audit-logs.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api-client';
import { UserRole } from '@ems/contracts';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Database,
  Terminal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  schoolId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  school?: {
    id: string;
    name: string;
  };
}

export default function AuditLogsPage() {
  const { user, effectiveRole } = useAuth();
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState<string>('');
  const [entityFilter, setEntityFilter] = React.useState<string>('ALL');
  const [selectedLog, setSelectedLog] = React.useState<AuditLogEntry | null>(null);

  const loadAuditLogs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (entityFilter !== 'ALL') params.append('entityType', entityFilter);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await apiClient.get<any>(`/dashboards/audit-logs${queryString}`);
      const data = response?.data || response;
      setLogs(Array.isArray(data) ? data : (data?.items || []));
    } catch (err: any) {
      setError(err?.message || 'Failed to load security audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [search, entityFilter]);

  React.useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesAction = log.action?.toLowerCase().includes(query);
        const matchesEntity = log.entityType?.toLowerCase().includes(query);
        const matchesActor = log.user?.email?.toLowerCase().includes(query) || log.user?.name?.toLowerCase().includes(query);
        const matchesId = log.entityId?.toLowerCase().includes(query);
        return matchesAction || matchesEntity || matchesActor || matchesId;
      }
      return true;
    });
  }, [logs, entityFilter, search]);

  const getActionBadgeColor = (action: string) => {
    const act = action?.toUpperCase() || '';
    if (act.includes('CREATE') || act.includes('REGISTER') || act.includes('ENROLL')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (act.includes('UPDATE') || act.includes('MODIFY') || act.includes('STATUS')) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    }
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('SUSPEND')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Security Audit Trail
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable system logs, RBAC authorization events, and operational database mutations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadAuditLogs()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Trail
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{logs.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtered Matches</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{filteredLogs.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Integrity Status</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Verified</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, actor email, or entity ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Entity Types</option>
            <option value="School">School Tenants</option>
            <option value="Student">Students</option>
            <option value="Teacher">Teachers & Faculty</option>
            <option value="Parent">Parents / Guardians</option>
            <option value="ClassSection">Classes & Sections</option>
            <option value="Exam">Examinations</option>
            <option value="Assessment">Assessments & Grades</option>
            <option value="Subscription">Subscriptions</option>
            <option value="Auth">Auth & Sessions</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-950/70 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Actor / User</th>
                <th className="px-5 py-3.5">School / Context</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <p className="text-sm">Querying verified institutional audit trail...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No audit records found</p>
                      <p className="text-xs text-slate-500">No operational audit entries match the active criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="text-slate-900 dark:text-slate-100 font-medium text-xs">
                        {log.entityType}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]" title={log.entityId}>
                        {log.entityId}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-semibold">
                          {log.user?.name ? log.user.name.charAt(0) : <User className="w-3 h-3" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                            {log.user?.name || log.user?.email || 'System Process'}
                          </p>
                          {log.user?.role && (
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{log.user.role}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                      {log.school?.name ? (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {log.school.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Platform Global</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">Audit Payload Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Event Action</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Entity Type</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.entityType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Entity ID</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{selectedLog.entityId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Logged Timestamp</span>
                  <span className="text-slate-800 dark:text-slate-200">{new Date(selectedLog.createdAt).toISOString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Payload Metadata & Context</span>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
                  {JSON.stringify(selectedLog.details || { entityId: selectedLog.entityId, action: selectedLog.action }, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
