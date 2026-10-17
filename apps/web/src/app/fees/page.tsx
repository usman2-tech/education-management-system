'use client';

/**
 * MODULE: Institutional Fee Management Dashboard
 *
 * PURPOSE:
 * Central financial hub for school administrators:
 * - Real-time KPI aggregation (Invoiced, Collected, Outstanding, Overdue, Collection Rate)
 * - Visual cashflow charts (Monthly trends, payment methods, class breakdowns)
 * - Complete invoice ledger with PDF/printable previews and void controls
 * - Transaction-safe manual payment recording with numbered receipt generation
 * - Fee structures and student fee assignment (individual & bulk)
 * - Discount and scholarship management
 *
 * SECURITY:
 * Strict school-level tenant isolation. Teacher access blocked.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { feesApi } from '@/lib/fees-api';
import { apiClient } from '@/lib/api-client';
import {
  CreditCard,
  Receipt,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Printer,
  X,
  Loader2,
  Calendar,
  Building2,
  FileText,
  ShieldAlert,
  Ban,
  Check,
  Tag,
  BookOpen,
  School,
} from 'lucide-react';

export default function FeeManagementPage() {
  const { user, effectiveRole } = useAuth();

  const isAuthorizedAdmin =
    effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN;

  // Active view tab: 'invoices' | 'payments' | 'structures' | 'assignments' | 'discounts'
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'structures' | 'assignments' | 'discounts'>('invoices');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateStructureOpen, setIsCreateStructureOpen] = useState(false);
  const [isAssignFeeOpen, setIsAssignFeeOpen] = useState(false);
  const [isCreateDiscountOpen, setIsCreateDiscountOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [voidInvoiceTarget, setVoidInvoiceTarget] = useState<any>(null);
  const [voidReason, setVoidReason] = useState('');

  // Form Submission States
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    notes: '',
  });

  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    academicYearId: '',
    discountId: '',
    dueDate: '',
    notes: '',
    itemName: 'Academic Term Tuition',
    itemAmount: '',
  });

  const [structureForm, setStructureForm] = useState({
    name: '',
    categoryId: '',
    academicYearId: '',
    gradeLevel: '',
    amount: '',
    frequency: 'ANNUALLY',
    dueDateDays: '30',
  });

  const [assignmentForm, setAssignmentForm] = useState({
    mode: 'STUDENT', // 'STUDENT' or 'CLASS'
    studentId: '',
    classSectionId: '',
    academicYearId: '',
    feeStructureId: '',
    discountId: '',
    generateInvoice: true,
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'FIXED_AMOUNT',
    value: '',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // DATA FETCHING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isAuthorizedAdmin) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [dashRes, invRes, payRes, structRes, asgnRes, discRes, catRes, stuRes, ayRes, clsRes] =
          await Promise.all([
            feesApi.getDashboard().catch(() => null),
            feesApi.getInvoices().catch(() => []),
            feesApi.getPayments().catch(() => []),
            feesApi.getStructures().catch(() => []),
            feesApi.getAssignments().catch(() => []),
            feesApi.getDiscounts().catch(() => []),
            feesApi.getCategories().catch(() => []),
            apiClient.get<any[]>('/students').catch(() => []),
            apiClient.get<any[]>('/academic-years').catch(() => []),
            apiClient.get<any[]>('/classes/sections').catch(() => []),
          ]);

        if (isMounted) {
          setDashboardData(dashRes);
          setInvoices(invRes || []);
          setPayments(payRes || []);
          setStructures(structRes || []);
          setAssignments(asgnRes || []);
          setDiscounts(discRes || []);
          setCategories(catRes || []);
          setStudents(stuRes || []);
          setAcademicYears(ayRes || []);
          setClasses(clsRes || []);

          if (ayRes && ayRes.length > 0) {
            const currentAy = ayRes.find((y: any) => y.isCurrent) || ayRes[0];
            setInvoiceForm((prev) => ({ ...prev, academicYearId: currentAy.id }));
            setStructureForm((prev) => ({ ...prev, academicYearId: currentAy.id }));
            setAssignmentForm((prev) => ({ ...prev, academicYearId: currentAy.id }));
          }

          if (catRes && catRes.length > 0) {
            setStructureForm((prev) => ({ ...prev, categoryId: catRes[0].id }));
          }
        }
      } catch (err) {
        console.error('Error fetching fee data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [isAuthorizedAdmin, refreshKey]);

  // ---------------------------------------------------------------------------
  // FILTERED INVOICES
  // ---------------------------------------------------------------------------
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        searchQuery === '' ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.admissionNumber && inv.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // ---------------------------------------------------------------------------
  // ACTIONS: RECORD PAYMENT
  // ---------------------------------------------------------------------------
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!paymentForm.invoiceId || !paymentForm.amount) {
      setFormError('Please select an invoice and enter payment amount.');
      return;
    }

    const payVal = parseFloat(paymentForm.amount);
    if (isNaN(payVal) || payVal <= 0) {
      setFormError('Payment amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await feesApi.recordPayment({
        invoiceId: paymentForm.invoiceId,
        amount: payVal,
        paymentMethod: paymentForm.paymentMethod as any,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      });

      setIsRecordPaymentOpen(false);
      setPaymentForm({ invoiceId: '', amount: '', paymentMethod: 'CASH', referenceNumber: '', notes: '' });
      setRefreshKey((k) => k + 1);

      // Open receipt viewer
      const receipt = await feesApi.getReceiptById(result.id);
      setSelectedReceipt(receipt);
    } catch (err: any) {
      setFormError(err.message || 'Payment recording failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE INVOICE
  // ---------------------------------------------------------------------------
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!invoiceForm.studentId || !invoiceForm.academicYearId || !invoiceForm.itemAmount || !invoiceForm.dueDate) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const amountVal = parseFloat(invoiceForm.itemAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFormError('Invoice item amount must be positive.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feesApi.createInvoice({
        studentId: invoiceForm.studentId,
        academicYearId: invoiceForm.academicYearId,
        discountId: invoiceForm.discountId || undefined,
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
        notes: invoiceForm.notes || undefined,
        items: [
          {
            name: invoiceForm.itemName.trim() || 'Academic Tuition Fee',
            amount: amountVal,
          },
        ],
      });

      setIsCreateInvoiceOpen(false);
      setInvoiceForm((prev) => ({ ...prev, studentId: '', itemAmount: '', notes: '' }));
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Invoice generation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE STRUCTURE
  // ---------------------------------------------------------------------------
  const handleCreateStructureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountVal = parseFloat(structureForm.amount);
    if (!structureForm.name || !structureForm.categoryId || isNaN(amountVal) || amountVal <= 0) {
      setFormError('Please provide a valid structure name, category, and positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feesApi.createStructure({
        name: structureForm.name.trim(),
        categoryId: structureForm.categoryId,
        academicYearId: structureForm.academicYearId,
        gradeLevel: structureForm.gradeLevel.trim() || undefined,
        amount: amountVal,
        frequency: structureForm.frequency as any,
        dueDateDays: parseInt(structureForm.dueDateDays, 10) || 30,
      });

      setIsCreateStructureOpen(false);
      setStructureForm((prev) => ({ ...prev, name: '', amount: '', gradeLevel: '' }));
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Fee structure creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: ASSIGN FEES
  // ---------------------------------------------------------------------------
  const handleAssignFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!assignmentForm.feeStructureId || !assignmentForm.academicYearId) {
      setFormError('Please select an academic year and fee structure.');
      return;
    }

    if (assignmentForm.mode === 'STUDENT' && !assignmentForm.studentId) {
      setFormError('Please select a student for assignment.');
      return;
    }

    if (assignmentForm.mode === 'CLASS' && !assignmentForm.classSectionId) {
      setFormError('Please select a class section for bulk assignment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feesApi.assignFee({
        academicYearId: assignmentForm.academicYearId,
        feeStructureId: assignmentForm.feeStructureId,
        studentId: assignmentForm.mode === 'STUDENT' ? assignmentForm.studentId : undefined,
        classSectionId: assignmentForm.mode === 'CLASS' ? assignmentForm.classSectionId : undefined,
        discountId: assignmentForm.discountId || undefined,
        generateInvoice: assignmentForm.generateInvoice,
      });

      setIsAssignFeeOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Fee assignment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: CREATE DISCOUNT
  // ---------------------------------------------------------------------------
  const handleCreateDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(discountForm.value);
    if (!discountForm.name || isNaN(val) || val <= 0) {
      setFormError('Please provide discount title and positive value.');
      return;
    }

    setIsSubmitting(true);
    try {
      await feesApi.createDiscount({
        name: discountForm.name.trim(),
        type: discountForm.type as any,
        value: val,
        reason: discountForm.reason.trim() || undefined,
      });

      setIsCreateDiscountOpen(false);
      setDiscountForm({ name: '', type: 'FIXED_AMOUNT', value: '', reason: '' });
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Discount creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ACTIONS: VOID INVOICE
  // ---------------------------------------------------------------------------
  const handleVoidInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidInvoiceTarget || !voidReason.trim()) return;

    setIsSubmitting(true);
    try {
      await feesApi.voidInvoice(voidInvoiceTarget.id, voidReason.trim());
      setVoidInvoiceTarget(null);
      setVoidReason('');
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to void invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // PERMISSION CHECK
  // ---------------------------------------------------------------------------
  if (!isAuthorizedAdmin) {
    return (
      <div className="flex h-96 flex-col items-center justify-center p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          You do not have financial management permissions. Faculty members and general staff are
          restricted from student financial ledger access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER & QUICK ACTION BUTTONS */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                Institutional Fee Management
              </h1>
              <p className="text-xs text-muted-foreground">
                Comprehensive tuition billing, payment recording, ledger audit, and receipt distribution.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsRecordPaymentOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <CreditCard className="h-4 w-4" />
            <span>Record Payment</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateInvoiceOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>New Invoice</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsAssignFeeOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Assign Fees</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsCreateStructureOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Fee Structure</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* FINANCIAL KPIS */}
      {/* --------------------------------------------------------------------- */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Invoiced */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Total Invoiced</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-foreground">
                ${dashboardData?.totalInvoiced?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Billed institutional tuition</div>
            </div>

            {/* Total Collected */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Total Collected</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ${dashboardData?.totalCollected?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Received offline cashier payments</div>
            </div>

            {/* Outstanding Balance */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Outstanding</span>
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-foreground">
                ${dashboardData?.totalOutstanding?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Active pending balance</div>
            </div>

            {/* Overdue Total */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Overdue Fees</span>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-destructive">
                ${dashboardData?.totalOverdue?.toLocaleString() || '0'}
              </div>
              <div className="mt-1 text-[11px] text-destructive/80">Past due date window</div>
            </div>

            {/* Collection Rate */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Collection Rate</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-foreground">
                {dashboardData?.collectionRate || 0}%
              </div>
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, dashboardData?.collectionRate || 0)}%` }}
                />
              </div>
            </div>

            {/* Students with Due */}
            <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Students With Due</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-lg sm:text-xl font-extrabold text-foreground">
                {dashboardData?.studentsWithOutstandingFees || 0}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">Enrolled student accounts</div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* CASHFLOW & COLLECTION VISUALIZATIONS */}
          {/* ----------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Invoiced vs Collected */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground">Monthly Invoiced vs Collected Cashflow</h3>
                <span className="text-[11px] text-muted-foreground">Rolling 6 Months</span>
              </div>
              <div className="h-40 flex items-end justify-between gap-3 pt-6 px-2">
                {dashboardData?.monthlyBilledVsCollected?.map((item: any, idx: number) => {
                  const maxVal = Math.max(
                    ...dashboardData.monthlyBilledVsCollected.map((i: any) => Math.max(i.billed, i.collected)),
                    1000
                  );
                  const billedHeight = Math.max(6, Math.round((item.billed / maxVal) * 100));
                  const collectedHeight = Math.max(6, Math.round((item.collected / maxVal) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      <div className="flex items-end gap-1 w-full justify-center">
                        <div
                          style={{ height: `${billedHeight}%` }}
                          className="w-3.5 bg-muted-foreground/30 rounded-t-sm hover:bg-muted-foreground/50 transition-colors"
                          title={`Billed: $${item.billed}`}
                        />
                        <div
                          style={{ height: `${collectedHeight}%` }}
                          className="w-3.5 bg-primary rounded-t-sm hover:bg-primary/90 transition-colors"
                          title={`Collected: $${item.collected}`}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">{item.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs bg-muted-foreground/30" />
                  <span>Total Billed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-xs bg-primary" />
                  <span>Collected</span>
                </div>
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">Collection by Method</h3>
                <p className="text-[11px] text-muted-foreground mb-4">Cashier offline payment distribution</p>

                <div className="space-y-3">
                  {dashboardData?.paymentMethodDistribution?.map((item: any, idx: number) => {
                    const totalAll = dashboardData.paymentMethodDistribution.reduce((s: number, m: any) => s + m.total, 0) || 1;
                    const pct = Math.round((item.total / totalAll) * 100);

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground capitalize">
                            {item.method.replace('_', ' ').toLowerCase()}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            ${item.total.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Verified offline receipts</span>
                <span className="font-bold text-primary">{payments.length} Records</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TABBED INTERFACE & CONTROLS */}
      {/* --------------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'invoices'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Invoices Ledger ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'payments'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Payments & Receipts ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('structures')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'structures'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Fee Structures ({structures.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'assignments'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Assignments ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'discounts'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Discounts ({discounts.length})
            </button>
          </div>

          {activeTab === 'invoices' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search invoice or student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-48 sm:w-60 rounded-lg border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs focus:border-primary focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="VOID">Void</option>
              </select>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TAB 1: INVOICES LEDGER */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'invoices' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student & Class</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No fee invoices matching the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{inv.studentName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {inv.admissionNumber || 'STU'} &bull; {inv.className || 'General'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-foreground">
                          ${inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                          ${inv.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-foreground">
                          ${inv.balanceAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : inv.status === 'OVERDUE'
                                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                : inv.status === 'VOID'
                                ? 'bg-muted text-muted-foreground line-through'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted text-foreground"
                            >
                              View
                            </button>
                            {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    invoiceId: inv.id,
                                    amount: inv.balanceAmount.toString(),
                                  }));
                                  setIsRecordPaymentOpen(true);
                                }}
                                className="rounded-lg bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 text-[11px] font-bold"
                              >
                                Pay
                              </button>
                            )}
                            {inv.status !== 'VOID' && inv.paidAmount === 0 && (
                              <button
                                type="button"
                                onClick={() => setVoidInvoiceTarget(inv)}
                                className="rounded-lg text-muted-foreground hover:text-destructive p-1"
                                title="Void invoice"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 2: PAYMENTS & RECEIPTS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'payments' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4 text-right">Amount Received</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Recorded By</th>
                    <th className="py-3 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No payments recorded yet. Click "Record Payment" to process offline cash/cheque collections.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {p.receiptNumber}
                          {p.isReversed && (
                            <span className="ml-1.5 rounded bg-destructive/10 text-destructive text-[9px] px-1 py-0.5">
                              REVERSED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{p.studentName}</div>
                          <div className="text-[10px] text-muted-foreground">{p.admissionNumber || 'STU'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {p.invoice?.invoiceNumber || p.invoiceNumber}
                        </td>
                        <td className="py-3 px-4 capitalize text-foreground">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">
                            {p.paymentMethod.replace('_', ' ').toLowerCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.recordedBy ? `${p.recordedBy.firstName} ${p.recordedBy.lastName}` : p.recordedByName}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              const receipt = await feesApi.getReceiptById(p.id);
                              setSelectedReceipt(receipt);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
                          >
                            <Printer className="h-3 w-3 text-primary" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 3: FEE STRUCTURES */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'structures' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Institutional Fee Structures</h3>
                <p className="text-[11px] text-muted-foreground">
                  Pre-configured fees by category, academic year, and applicable grade level.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStructureOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Structure</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Fee Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Grade Scope</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Due Rule</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {structures.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-foreground">{s.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {s.category?.name || 'General Category'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {s.gradeLevel || 'All Enrolled Grades'}
                      </td>
                      <td className="py-3 px-4 text-foreground capitalize">
                        {s.frequency.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{s.dueDateDays} Days Post-Issue</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ${s.amount.toLocaleString()} {s.currency}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 4: STUDENT ASSIGNMENTS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'assignments' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Assigned Student Fees</h3>
                <p className="text-[11px] text-muted-foreground">
                  Individual and cohort fee structure enrollments with applied scholarships.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignFeeOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assign Fees</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Admission #</th>
                    <th className="py-3 px-4">Assigned Structure</th>
                    <th className="py-3 px-4">Term</th>
                    <th className="py-3 px-4">Concession / Discount</th>
                    <th className="py-3 px-4 text-right">Effective Rate</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-foreground">{a.studentName}</td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">{a.admissionNumber || 'STU'}</td>
                      <td className="py-3 px-4 text-foreground">{a.feeStructureName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{a.academicYearName}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {a.discountName ? (
                          <span className="rounded bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">
                            {a.discountName}
                          </span>
                        ) : (
                          'None (Full)'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        ${a.amount?.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          ASSIGNED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* TAB 5: DISCOUNTS & SCHOLARSHIPS */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'discounts' && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Approved Discounts & Concessions</h3>
                <p className="text-[11px] text-muted-foreground">
                  Institutional merit scholarships, sibling concessions, and faculty fee waivers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDiscountOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Discount</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Discount Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Value / Benefit</th>
                    <th className="py-3 px-4">Eligibility Reason</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {discounts.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/20">
                      <td className="py-3 px-4 font-bold text-foreground">{d.name}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">
                        {d.type.replace('_', ' ').toLowerCase()}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {d.type === 'PERCENTAGE' ? `${d.value}% Off` : `$${d.value.toLocaleString()} Deduction`}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{d.reason || 'Institutional approval'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 1: RECORD MANUAL PAYMENT */}
      {/* --------------------------------------------------------------------- */}
      {isRecordPaymentOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Record Offline Fee Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRecordPaymentOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Target Student Invoice *
                </label>
                <select
                  required
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const inv = invoices.find((i) => i.id === e.target.value);
                    setPaymentForm({
                      ...paymentForm,
                      invoiceId: e.target.value,
                      amount: inv ? inv.balanceAmount.toString() : '',
                    });
                  }}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Select Invoice to settle...</option>
                  {invoices
                    .filter((i) => i.status !== 'PAID' && i.status !== 'VOID')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.invoiceNumber} — {i.studentName} (Due: ${i.balanceAmount})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="CASH">Cash Deposit</option>
                    <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                    <option value="CHEQUE">Bank Cheque</option>
                    <option value="OTHER">Other Manual Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Bank Reference / Cheque Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-98471 or CHQ-4029"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Cashier Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional audit notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <span>Record & Print Receipt</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 2: PRINTABLE OFFICIAL RECEIPT */}
      {/* --------------------------------------------------------------------- */}
      {selectedReceipt && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 rounded p-1 text-muted-foreground hover:bg-muted print:hidden"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Printable Institutional Header */}
            <div className="border-b-2 border-primary/20 pb-4 text-center space-y-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-1">
                <School className="h-6 w-6" />
              </div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                {selectedReceipt.school?.name || user?.school?.name || 'Samahat Taibah Educational Group'}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Institutional Bursar & Financial Treasury &bull; Official Payment Voucher
              </p>
            </div>

            {/* Receipt Summary Pill */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5 border border-border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Receipt Number</span>
                <span className="font-mono font-extrabold text-foreground text-sm">
                  {selectedReceipt.receiptNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Payment Date</span>
                <span className="font-semibold text-foreground">
                  {new Date(selectedReceipt.paymentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Student & Invoice Information */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Student Details</span>
                <div className="font-bold text-foreground">
                  {selectedReceipt.student?.firstName} {selectedReceipt.student?.lastName}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Admission: {selectedReceipt.student?.studentProfile?.admissionNumber || 'STU-ENROLLED'}
                </div>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Settled Invoice</span>
                <div className="font-mono font-bold text-foreground">
                  {selectedReceipt.invoice?.invoiceNumber}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Payment Method: {selectedReceipt.paymentMethod}
                </div>
              </div>
            </div>

            {/* Amount Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">
                      Tuition & Institutional Fee Installment
                      {selectedReceipt.referenceNumber && (
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          Ref: {selectedReceipt.referenceNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      ${selectedReceipt.amount.toLocaleString()} {selectedReceipt.currency}
                    </td>
                  </tr>
                  <tr className="bg-muted/20 font-bold">
                    <td className="py-2.5 px-4 text-muted-foreground">Amount Paid</td>
                    <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                      ${selectedReceipt.amount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold">
                    <td className="py-2.5 px-4 text-muted-foreground">Remaining Invoice Balance</td>
                    <td className="py-2.5 px-4 text-right text-foreground font-mono">
                      ${selectedReceipt.remainingBalance ?? selectedReceipt.invoice?.balanceAmount ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer & Actions */}
            <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <div>
                <span>Cashier Officer: </span>
                <span className="font-semibold text-foreground">
                  {selectedReceipt.recordedBy ? `${selectedReceipt.recordedBy.firstName} ${selectedReceipt.recordedBy.lastName}` : 'Institutional Bursar'}
                </span>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 3: INVOICE DETAILS INSPECTOR */}
      {/* --------------------------------------------------------------------- */}
      {selectedInvoice && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Invoice #{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Billed To</span>
                <div className="font-bold text-foreground">{selectedInvoice.studentName}</div>
                <div className="text-muted-foreground text-[11px]">
                  Admission: {selectedInvoice.admissionNumber || 'STU'} &bull; {selectedInvoice.className || 'General'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] uppercase font-bold">Due Date</span>
                <div className="font-semibold text-foreground">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </div>
                <div className="text-muted-foreground text-[11px]">Status: {selectedInvoice.status}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Fee Item</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedInvoice.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-4 text-foreground">{item.name}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-foreground">
                        ${item.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {selectedInvoice.discountAmount > 0 && (
                    <tr className="bg-muted/10 text-emerald-600 dark:text-emerald-400">
                      <td className="py-2 px-4">Applied Discount</td>
                      <td className="py-2 px-4 text-right font-mono">
                        -${selectedInvoice.discountAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-2.5 px-4 text-foreground">Total Invoiced</td>
                    <td className="py-2.5 px-4 text-right font-mono text-foreground">
                      ${selectedInvoice.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-semibold text-emerald-600 dark:text-emerald-400">
                    <td className="py-2 px-4">Paid to Date</td>
                    <td className="py-2 px-4 text-right font-mono">
                      ${selectedInvoice.paidAmount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="font-bold text-foreground">
                    <td className="py-2 px-4">Outstanding Balance</td>
                    <td className="py-2 px-4 text-right font-mono text-destructive">
                      ${selectedInvoice.balanceAmount.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 4: CREATE CUSTOM INVOICE */}
      {/* --------------------------------------------------------------------- */}
      {isCreateInvoiceOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Create Student Invoice</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateInvoiceOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Enrolled Student *
                </label>
                <select
                  required
                  value={invoiceForm.studentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">Select Enrolled Student...</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.firstName} {stu.lastName} ({stu.studentProfile?.admissionNumber || 'STU'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Academic Year *
                  </label>
                  <select
                    required
                    value={invoiceForm.academicYearId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, academicYearId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fee Item Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.itemName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, itemName: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={invoiceForm.itemAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, itemAmount: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Optional Scholarship / Concession
                </label>
                <select
                  value={invoiceForm.discountId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, discountId: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="">None (Standard Rate)</option>
                  {discounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type === 'PERCENTAGE' ? `${d.value}% Off` : `$${d.value} Off`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Invoice...</span>
                    </>
                  ) : (
                    <span>Issue Invoice</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 5: CREATE FEE STRUCTURE */}
      {/* --------------------------------------------------------------------- */}
      {isCreateStructureOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Create Fee Structure</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStructureOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStructureSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Structure Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High School Annual Tuition"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fee Category *
                  </label>
                  <select
                    required
                    value={structureForm.categoryId}
                    onChange={(e) => setStructureForm({ ...structureForm, categoryId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Academic Year *
                  </label>
                  <select
                    required
                    value={structureForm.academicYearId}
                    onChange={(e) => setStructureForm({ ...structureForm, academicYearId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay.id} value={ay.id}>
                        {ay.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={structureForm.amount}
                    onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Billing Frequency
                  </label>
                  <select
                    value={structureForm.frequency}
                    onChange={(e) => setStructureForm({ ...structureForm, frequency: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="ANNUALLY">Annually</option>
                    <option value="ONE_TIME">One-Time</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Due Window (Days)
                  </label>
                  <input
                    type="number"
                    value={structureForm.dueDateDays}
                    onChange={(e) => setStructureForm({ ...structureForm, dueDateDays: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Grade Scope (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grade 10 (or leave blank for all)"
                  value={structureForm.gradeLevel}
                  onChange={(e) => setStructureForm({ ...structureForm, gradeLevel: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateStructureOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Structure...</span>
                    </>
                  ) : (
                    <span>Save Structure</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 6: ASSIGN FEES (INDIVIDUAL OR BULK) */}
      {/* --------------------------------------------------------------------- */}
      {isAssignFeeOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Assign Student Fees</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignFeeOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleAssignFeeSubmit} className="space-y-4">
              <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAssignmentForm({ ...assignmentForm, mode: 'STUDENT' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    assignmentForm.mode === 'STUDENT'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Individual Student
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentForm({ ...assignmentForm, mode: 'CLASS' })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    assignmentForm.mode === 'CLASS'
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bulk by Class Section
                </button>
              </div>

              {assignmentForm.mode === 'STUDENT' ? (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Student *
                  </label>
                  <select
                    required
                    value={assignmentForm.studentId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, studentId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Select Student...</option>
                    {students.map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.firstName} {stu.lastName} ({stu.studentProfile?.admissionNumber || 'STU'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Class Section *
                  </label>
                  <select
                    required
                    value={assignmentForm.classSectionId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, classSectionId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Select Class Section...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.schoolClass?.name || 'Class'} &bull; {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fee Structure *
                  </label>
                  <select
                    required
                    value={assignmentForm.feeStructureId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, feeStructureId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">Select Structure...</option>
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (${s.amount})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Optional Discount
                  </label>
                  <select
                    value={assignmentForm.discountId}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, discountId: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="">None (Full Amount)</option>
                    {discounts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="gen-invoice-check"
                  checked={assignmentForm.generateInvoice}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, generateInvoice: e.target.checked })}
                  className="rounded border-input text-primary focus:ring-primary/20"
                />
                <label htmlFor="gen-invoice-check" className="text-xs font-medium text-foreground cursor-pointer select-none">
                  Automatically generate invoice upon assignment
                </label>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAssignFeeOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Confirm Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 7: CREATE DISCOUNT */}
      {/* --------------------------------------------------------------------- */}
      {isCreateDiscountOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Add Discount / Concession</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDiscountOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDiscountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Discount Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sibling Enrolment Concession"
                  value={discountForm.name}
                  onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                  className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={discountForm.type}
                    onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs focus:border-primary focus:outline-none"
                  >
                    <option value="FIXED_AMOUNT">Fixed Dollar ($)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="SCHOLARSHIP">Merit Scholarship</option>
                    <option value="SIBLING">Sibling Discount</option>
                    <option value="WAIVER">Full Waiver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Value *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 20 or 500"
                    value={discountForm.value}
                    onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-mono focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Institutional Justification / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="Reason for concession eligibility..."
                  value={discountForm.reason}
                  onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateDiscountOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Discount</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 8: VOID INVOICE CONFIRMATION */}
      {/* --------------------------------------------------------------------- */}
      {voidInvoiceTarget && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">Void Invoice #{voidInvoiceTarget.invoiceNumber}</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to void this invoice? Voiding cancels the billing record permanently
              while maintaining an immutable audit log.
            </p>

            <form onSubmit={handleVoidInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Student transferred or duplicate billing entry..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs focus:border-destructive focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setVoidInvoiceTarget(null);
                    setVoidReason('');
                  }}
                  className="px-3.5 py-2 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Keep Active
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-destructive text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Voiding...</span>
                    </>
                  ) : (
                    <span>Confirm Void</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
