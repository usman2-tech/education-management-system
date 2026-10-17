'use client';

/**
 * MODULE: Subscription Code Redemption Interface
 *
 * PURPOSE:
 * Allows students and school members to activate access codes,
 * unlocking curricular courses, learning materials, and institutional entitlements.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { subscriptionCodesApi } from '@/lib/subscription-codes-api';
import {
  KeyRound,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function RedeemCodePage() {
  const { user } = useAuth();
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [successResult, setSuccessResult] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Redemption history
  const [history, setHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(true);

  const loadHistory = React.useCallback(async () => {
    try {
      const data = await subscriptionCodesApi.getMyRedemptions();
      setHistory(data);
    } catch (err) {
      console.error('Failed to load my redemptions:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await subscriptionCodesApi.redeemCode({
        code: code.trim().toUpperCase(),
        schoolId: user?.schoolId || undefined,
      });

      setSuccessResult(res);
      setCode('');
      await loadHistory();
    } catch (err: any) {
      console.error('Redemption failed:', err);
      setError(err?.message || 'Failed to activate code. Please verify your code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/subscriptions"
          className="p-2 border border-border rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Redeem Activation Code
          </h1>
          <p className="text-sm text-muted-foreground">
            Activate subscription vouchers or course access tokens provided by your institution.
          </p>
        </div>
      </div>

      {/* Redemption Form Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        {successResult && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle className="h-5 w-5" />
              <span>{successResult.message}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Plan activated: <strong className="text-foreground">{successResult.redemption?.planName}</strong> for{' '}
              <strong className="text-foreground">{successResult.redemption?.schoolName}</strong>.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1.5">
              Enter 16-Character Activation Code *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={30}
                placeholder="e.g. EMS-A1B2-C3D4-E5F6"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-background border border-input rounded-xl text-base font-mono font-bold tracking-wider uppercase text-center focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
              <Sparkles className="absolute right-3.5 top-3.5 h-5 w-5 text-primary/50 pointer-events-none" />
            </div>
            <span className="text-[11px] text-muted-foreground mt-1.5 block">
              Format: Standard alphanumeric prefix followed by 3 hex segments separated by hyphens.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !code.trim()}
            className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Activate Subscription Code
          </button>
        </form>
      </div>

      {/* Redemption History */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          My Redemptions History ({history.length})
        </h2>

        {loadingHistory ? (
          <div className="flex justify-center items-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No previous activation codes have been redeemed on this account.
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-background rounded-lg border border-border flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-mono font-bold text-foreground">{item.codeValue}</div>
                  <span className="text-muted-foreground text-[11px]">{item.planName} • {item.schoolName}</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold block text-[11px]">
                    Activated
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(item.redeemedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
