'use client';

/**
 * MODULE: Subscription Management & Licensing Dashboard
 *
 * PURPOSE:
 * Replaces previous 404 route with a complete institutional subscription management interface.
 * Platform Admins configure global plans, monitor school licensing, and assign subscriptions.
 * School Admins view institutional seat entitlements, validity countdowns, and initiate renewals.
 */

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, SubscriptionPlanDto, SchoolSubscriptionDto } from '@ems/contracts';
import { subscriptionsApi, SubscriptionOverviewDto } from '@/lib/subscriptions-api';
import { fetchSchools } from '@/lib/schools-api';
import {
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Users,
  Check,
  X,
  Loader2,
  Tag,
  ArrowRight,
} from 'lucide-react';

export default function SubscriptionsPage() {
  const { user, effectiveRole } = useAuth();
  const isPlatformAdmin = effectiveRole === UserRole.PLATFORM_ADMIN;
  const isSchoolAdmin = effectiveRole === UserRole.SCHOOL_ADMIN;

  const [loading, setLoading] = React.useState(true);
  const [plans, setPlans] = React.useState<SubscriptionPlanDto[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<SchoolSubscriptionDto[]>([]);
  const [overview, setOverview] = React.useState<SubscriptionOverviewDto | null>(null);
  const [schools, setSchools] = React.useState<any[]>([]);

  // Search and filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  // Modal states
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = React.useState('');
  const [selectedPlanId, setSelectedPlanId] = React.useState('');
  const [assignAutoRenew, setAssignAutoRenew] = React.useState(true);
  const [submittingAssign, setSubmittingAssign] = React.useState(false);

  // Create plan modal
  const [planModalOpen, setPlanModalOpen] = React.useState(false);
  const [newPlanName, setNewPlanName] = React.useState('');
  const [newPlanCode, setNewPlanCode] = React.useState('');
  const [newPlanDesc, setNewPlanDesc] = React.useState('');
  const [newPlanPrice, setNewPlanPrice] = React.useState(1999);
  const [newPlanDuration, setNewPlanDuration] = React.useState(365);
  const [newPlanStudents, setNewPlanStudents] = React.useState(1000);
  const [newPlanTeachers, setNewPlanTeachers] = React.useState(80);
  const [submittingPlan, setSubmittingPlan] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, overviewData, subsData] = await Promise.all([
        subscriptionsApi.getPlans(true),
        subscriptionsApi.getOverview(),
        subscriptionsApi.getSchoolSubscriptions(),
      ]);

      setPlans(plansData);
      setOverview(overviewData);
      setSubscriptions(subsData);

      if (isPlatformAdmin) {
        const schoolsRes = await fetchSchools({ limit: 100 });
        const schoolList = schoolsRes.items || [];
        setSchools(schoolList);
        if (schoolList.length > 0) setSelectedSchoolId(schoolList[0].id);
      }
      if (plansData.length > 0) setSelectedPlanId(plansData[0].id);
    } catch (err) {
      console.error('Failed to load subscriptions data:', err);
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssignSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !selectedPlanId) return;
    setSubmittingAssign(true);
    try {
      await subscriptionsApi.assignSubscription({
        schoolId: selectedSchoolId,
        planId: selectedPlanId,
        autoRenew: assignAutoRenew,
      });
      setAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign subscription');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName || !newPlanCode) return;
    setSubmittingPlan(true);
    try {
      await subscriptionsApi.createPlan({
        name: newPlanName,
        code: newPlanCode.toUpperCase(),
        description: newPlanDesc,
        price: Number(newPlanPrice),
        durationDays: Number(newPlanDuration),
        maxStudents: Number(newPlanStudents),
        maxTeachers: Number(newPlanTeachers),
        features: ['STUDENT_PORTAL', 'ATTENDANCE_NFC', 'ONLINE_EXAMS', 'GRADEBOOK'],
      });
      setPlanModalOpen(false);
      // Reset form
      setNewPlanName('');
      setNewPlanCode('');
      setNewPlanDesc('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create plan');
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleRenew = async (subId: string) => {
    if (!window.confirm('Renew subscription for another billing period?')) return;
    try {
      await subscriptionsApi.renewSubscription(subId);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Renewal failed');
    }
  };

  const handleCancel = async (subId: string) => {
    if (!window.confirm('Mark this school subscription as CANCELLED?')) return;
    try {
      await subscriptionsApi.updateStatus(subId, { status: 'CANCELLED' });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Cancellation failed');
    }
  };

  const filteredSubs = subscriptions.filter((s) => {
    const matchSearch =
      s.schoolName.toLowerCase().includes(search.toLowerCase()) ||
      s.planName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Institutional Subscriptions & Licensing
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPlatformAdmin
              ? 'Multi-tenant subscription plans, school licenses, seat entitlement allocations, and renewals.'
              : 'Institutional software license, student/faculty caps, and active module entitlements.'}
          </p>
        </div>

        {isPlatformAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlanModalOpen(true)}
              className="px-3.5 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Plan
            </button>
            <button
              onClick={() => setAssignModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="h-3.5 w-3.5" />
              Assign Subscription
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Total Subscriptions</span>
          <div className="text-2xl font-bold text-foreground mt-1">
            {overview?.totalSubscriptions ?? 0}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Across all tenants</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Active Licenses</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {overview?.activeCount ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block">In good standing</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Expiring Soon (30d)</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {overview?.expiringSoonCount ?? 0}
          </div>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 block">Renewal alerts</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <span className="text-xs text-muted-foreground font-medium">Expired / Inactive</span>
          <div className="text-2xl font-bold text-muted-foreground mt-1">
            {(overview?.expiredCount ?? 0) + (overview?.pendingCount ?? 0)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">Require reactivation</span>
        </div>
      </div>

      {/* Subscription Plans Catalog */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Institutional Subscription Tiers ({plans.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                p.isActive
                  ? 'bg-background border-border hover:border-primary/50'
                  : 'bg-muted/40 border-border opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-primary/10 text-primary rounded">
                    {p.code}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {p.durationDays} Days
                  </span>
                </div>

                <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                <div className="text-2xl font-extrabold text-foreground mt-2">
                  ${p.price.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-muted-foreground">/ billing cycle</span>
                </div>

                {p.description && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {p.description}
                  </p>
                )}

                <div className="my-4 pt-3 border-t border-border space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Max Students:
                    </span>
                    <strong className="text-foreground">{p.maxStudents.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                      Max Teachers:
                    </span>
                    <strong className="text-foreground">{p.maxTeachers.toLocaleString()}</strong>
                  </div>
                </div>

                {p.features && p.features.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                      Included Modules:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.features.map((feat, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 bg-muted rounded font-medium text-foreground"
                        >
                          {feat.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isPlatformAdmin && (
                <div className="pt-4 mt-3 border-t border-border">
                  <button
                    onClick={() => {
                      setSelectedPlanId(p.id);
                      setAssignModalOpen(true);
                    }}
                    className="w-full text-center py-1.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Assign to School</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* School Subscriptions Table */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Active Institutional Licenses ({subscriptions.length})
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search school or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-background border border-input rounded-lg text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background border border-input rounded-lg text-xs px-2.5 py-1.5"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="SUSPENDED">Suspended</option>
            </select>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 border border-input rounded-lg hover:bg-muted text-muted-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No institutional subscriptions found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2.5 px-3">School Tenant</th>
                  <th className="py-2.5 px-3">Tier Plan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Valid Until</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Auto-Renew</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubs.map((sub) => {
                  const isExpiringSoon =
                    new Date(sub.endDate).getTime() - Date.now() < 30 * 86400000 &&
                    new Date(sub.endDate).getTime() > Date.now();

                  return (
                    <tr key={sub.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {sub.schoolName}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        {sub.planName}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : sub.status === 'EXPIRED'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <span className={isExpiringSoon ? 'text-amber-600 font-bold' : 'text-muted-foreground'}>
                          {new Date(sub.endDate).toLocaleDateString()}
                          {isExpiringSoon && ' (Expiring soon)'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">
                        {sub.maxStudents} Students • {sub.maxTeachers} Teachers
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {sub.autoRenew ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Manual</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => handleRenew(sub.id)}
                          className="px-2.5 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary font-medium rounded transition-colors"
                          title="Renew Subscription"
                        >
                          Renew
                        </button>
                        {isPlatformAdmin && sub.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleCancel(sub.id)}
                            className="px-2 py-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                            title="Cancel Subscription"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Subscription Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Assign Subscription to School</h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  School Tenant *
                </label>
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || s.id.substring(0, 6)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Subscription Plan Tier *
                </label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price} ({p.durationDays} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoRenewCheck"
                  checked={assignAutoRenew}
                  onChange={(e) => setAssignAutoRenew(e.target.checked)}
                  className="h-4 w-4 text-primary"
                />
                <label htmlFor="autoRenewCheck" className="text-xs text-foreground cursor-pointer font-medium">
                  Enable automatic renewal upon period conclusion
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submittingAssign && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {planModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Create Global Subscription Plan</h3>
              <button
                onClick={() => setPlanModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Tier"
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ENTERPRISE"
                    value={newPlanCode}
                    onChange={(e) => setNewPlanCode(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Plan features and target institution scale..."
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Price (USD) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newPlanPrice}
                    onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanDuration}
                    onChange={(e) => setNewPlanDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Max Students *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanStudents}
                    onChange={(e) => setNewPlanStudents(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                    Max Teachers *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPlanTeachers}
                    onChange={(e) => setNewPlanTeachers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submittingPlan && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
