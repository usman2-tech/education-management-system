'use client';

/**
 * MODULE: Parent / Guardian Fee Portal
 *
 * PURPOSE:
 * Provides verified parents and legal guardians with a secure, read-only
 * view of fee invoices, payment receipts, outstanding balances, and schedules
 * for their linked enrolled children.
 *
 * SECURITY:
 * Strict tenant and guardian-child linkage scoping. Parents cannot modify,
 * create, or tamper with financial records, nor see unlinked children.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { feesApi } from '@/lib/fees-api';
import {
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  Calendar,
  DollarSign,
  Printer,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowDownCircle,
  User,
  GraduationCap,
} from 'lucide-react';

export default function ParentFeesPortalPage() {
  const { user, effectiveRole } = useAuth();
  const [childrenFees, setChildrenFees] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Print / View Modal states
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await feesApi.getParentChildrenFees();
        setChildrenFees(data || []);
        if (data && data.length > 0) {
          setSelectedChildIndex(0);
        }
      } catch (err: any) {
        console.error('Failed to load parent fees:', err);
        setError(err.message || 'Failed to retrieve fee records.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const activeChildData = childrenFees[selectedChildIndex] || null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Fees & Family Billing
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="h-3 w-3" />
              Verified Guardian Access
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Transparent institutional billing, payment receipts, and balance records for your children.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading family fee profiles...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : childrenFees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No Verified Linked Students</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
            There are currently no enrolled students linked to your guardian profile, or relationship verifications are pending.
          </p>
        </div>
      ) : (
        <>
          {/* Child Selector Tabs */}
          {childrenFees.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground mr-2">Select Student:</span>
              {childrenFees.map((item, idx) => (
                <button
                  key={item.studentId || idx}
                  onClick={() => setSelectedChildIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedChildIndex === idx
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>
                    {item.studentName}
                  </span>
                  <span className="opacity-75 text-[10px]">({item.relationshipType})</span>
                </button>
              ))}
            </div>
          )}

          {activeChildData && (
            <div className="space-y-6">
              {/* Student Overview Header Card */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-lg border border-primary/20">
                      {activeChildData.studentName ? activeChildData.studentName[0] : 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">
                          {activeChildData.studentName}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                          {activeChildData.relationshipType}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Admission #{activeChildData.admissionNumber || 'N/A'} &bull;{' '}
                        Class: {activeChildData.className || 'General Enrolled'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Currency</span>
                    <p className="text-xs font-semibold text-foreground">
                      {activeChildData.currency || 'USD'}
                    </p>
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-xs text-muted-foreground font-medium">Total Billed</span>
                  <div className="text-xl font-bold text-foreground mt-1">
                    ${activeChildData.totalBilled.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Historical charges</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Total Paid
                  </span>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    ${activeChildData.totalPaid.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Cleared payments</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Outstanding Balance
                  </span>
                  <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    ${activeChildData.outstandingBalance.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Remaining balance</span>
                </div>

                <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                    Overdue Balance
                  </span>
                  <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                    ${activeChildData.overdueBalance.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Passed due date</span>
                </div>
              </div>

              {/* Invoices Section */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Issued Invoices</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeChildData.invoices.length} invoices
                  </span>
                </div>

                {activeChildData.invoices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No invoices have been issued for this student.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                          <th className="py-2.5 px-4 font-semibold">Academic Year</th>
                          <th className="py-2.5 px-4 font-semibold">Due Date</th>
                          <th className="py-2.5 px-4 font-semibold">Total</th>
                          <th className="py-2.5 px-4 font-semibold">Paid</th>
                          <th className="py-2.5 px-4 font-semibold">Balance</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {activeChildData.invoices.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-muted/20">
                            <td className="py-3 px-4 font-mono font-bold text-primary">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {inv.academicYearName || 'Current Year'}
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {new Date(inv.dueDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">
                              ${inv.totalAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                              ${inv.paidAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold">
                              ${inv.balanceAmount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : inv.status === 'OVERDUE'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : inv.status === 'VOID'
                                    ? 'bg-muted text-muted-foreground line-through'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setActiveInvoice(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-[11px] font-semibold"
                              >
                                <Printer className="h-3 w-3" />
                                <span>View / Print</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payments & Official Receipts Section */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-sm font-bold text-foreground">Payment Receipts</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activeChildData.payments.length} receipts
                  </span>
                </div>

                {activeChildData.payments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No payment records or receipts found for this student.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Receipt #</th>
                          <th className="py-2.5 px-4 font-semibold">Invoice #</th>
                          <th className="py-2.5 px-4 font-semibold">Date</th>
                          <th className="py-2.5 px-4 font-semibold">Method</th>
                          <th className="py-2.5 px-4 font-semibold">Amount</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-medium">
                        {activeChildData.payments.map((pmt: any) => (
                          <tr key={pmt.id} className="hover:bg-muted/20">
                            <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {pmt.receiptNumber}
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {pmt.invoice?.invoiceNumber || '—'}
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {new Date(pmt.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-foreground capitalize">
                              {pmt.paymentMethod.replace('_', ' ').toLowerCase()}
                            </td>
                            <td className="py-3 px-4 font-bold text-foreground">
                              ${pmt.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              {pmt.isReversed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  Reversed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                  Valid
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={async () => {
                                  try {
                                    const rec = await feesApi.getReceiptById(pmt.id);
                                    setActiveReceipt(rec);
                                  } catch (e) {
                                    alert('Could not load official receipt');
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Official Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* INVOICE VIEW / PRINT MODAL */}
      {/* --------------------------------------------------------------------- */}
      {activeInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Student Fee Invoice</h3>
                <p className="text-xs text-muted-foreground font-mono">#{activeInvoice.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4 print:m-0">
              {/* Institution Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Samahat Taibah Educational Group
                  </h4>
                  <p className="text-xs text-muted-foreground">{activeInvoice.schoolName}</p>
                  <p className="text-xs text-muted-foreground">Official Student Fee Statement</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-semibold text-foreground">Issue Date:</p>
                  <p className="text-muted-foreground">
                    {new Date(activeInvoice.issueDate).toLocaleDateString()}
                  </p>
                  <p className="font-semibold text-rose-600 dark:text-rose-400 mt-1">Due Date:</p>
                  <p className="font-bold text-rose-600 dark:text-rose-400">
                    {new Date(activeInvoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-muted/30 p-3.5 text-xs">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Student Details
                  </span>
                  <p className="font-bold text-foreground">{activeInvoice.studentName}</p>
                  <p className="text-muted-foreground">
                    Admission #: {activeInvoice.admissionNumber || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Billing Period
                  </span>
                  <p className="font-semibold text-foreground">
                    {activeInvoice.academicYearName || 'Academic Year'}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeInvoice.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {activeInvoice.status}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Fee Item / Category</th>
                      <th className="py-2 px-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {activeInvoice.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">{item.description}</p>
                          {item.feeStructure && (
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {item.feeStructure.frequency.toLowerCase()} billing
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                          ${item.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 pt-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">${activeInvoice.subtotal?.toLocaleString()}</span>
                </div>
                {activeInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount / Concession:</span>
                    <span className="font-mono">-${activeInvoice.discountAmount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground border-t border-border pt-2">
                  <span>Total Due:</span>
                  <span className="font-mono">${activeInvoice.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">${activeInvoice.paidAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold border-t border-border pt-1">
                  <span>Remaining Balance:</span>
                  <span className="font-mono">${activeInvoice.balanceAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* OFFICIAL RECEIPT MODAL */}
      {/* --------------------------------------------------------------------- */}
      {activeReceipt && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Official Fee Receipt</h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    #{activeReceipt.receiptNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReceipt(null)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-border">
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Samahat Taibah Educational Group
                </h4>
                <p className="text-xs text-muted-foreground">{activeReceipt.school.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  Institutional Cashier Office &bull; Official Payment Voucher
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3.5">
                <div>
                  <span className="text-[10px] uppercase text-muted-foreground font-bold">
                    Student Information
                  </span>
                  <p className="font-bold text-foreground">
                    {activeReceipt.student.firstName} {activeReceipt.student.lastName}
                  </p>
                  <p className="text-muted-foreground">
                    Admission #{activeReceipt.student.studentProfile?.admissionNumber || 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold">
                    Payment Reference
                  </span>
                  <p className="font-semibold text-foreground">
                    Inv #{activeReceipt.invoice.invoiceNumber}
                  </p>
                  <p className="text-muted-foreground">
                    {new Date(activeReceipt.paymentDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center space-y-1">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
                  Amount Received
                </span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${activeReceipt.amount.toLocaleString()} {activeReceipt.currency}
                </div>
                <p className="text-[11px] text-muted-foreground capitalize">
                  Payment Method: {activeReceipt.paymentMethod.replace('_', ' ').toLowerCase()}
                  {activeReceipt.referenceNumber ? ` (${activeReceipt.referenceNumber})` : ''}
                </p>
              </div>

              <div className="space-y-1.5 border-t border-border pt-3">
                <div className="flex justify-between text-muted-foreground">
                  <span>Invoice Total:</span>
                  <span className="font-mono">${activeReceipt.invoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Invoice Remaining Balance:</span>
                  <span className="font-mono font-bold text-foreground">
                    ${activeReceipt.invoice.balanceAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Recorded By:</span>
                  <span className="font-medium text-foreground">
                    {activeReceipt.recordedBy.firstName} {activeReceipt.recordedBy.lastName}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
