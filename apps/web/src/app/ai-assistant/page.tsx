'use client';

/**
 * MODULE: Institutional AI Academic Assistant Page
 *
 * PURPOSE:
 * Role-aware institutional conversational assistant entry point powered by Google Gemini.
 * Directs TEACHER to the integrated AI Teacher Copilot ('Ask Assistant' tab) and
 * STUDENT to the integrated AI Student Copilot ('Ask Assistant' tab) while preserving
 * full direct conversational assistant access for PLATFORM_ADMIN and SCHOOL_ADMIN.
 *
 * DEPENDENCIES:
 * AIAssistantView, useAuth, useRouter, useSearchParams, @ems/contracts
 *
 * SECURITY:
 * Authorized role-based isolation; redirects unauthorized parent/guardian access
 * to dedicated Parent Assistant, and unifies Teacher/Student experiences into their
 * single dedicated copilots.
 */

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import { Loader2 } from 'lucide-react';
import { AIAssistantView } from '@/components/ai/ai-assistant-view';

function AIAssistantPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');
  const { user, effectiveRole, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    const role = effectiveRole || user?.role;

    if (role === UserRole.PARENT) {
      router.replace('/parent/assistant');
      return;
    }

    if (role === UserRole.TEACHER) {
      const targetUrl = conversationId
        ? `/teacher/copilot?tab=assistant&conversationId=${encodeURIComponent(conversationId)}`
        : '/teacher/copilot?tab=assistant';
      router.replace(targetUrl);
      return;
    }

    if (role === UserRole.STUDENT) {
      const targetUrl = conversationId
        ? `/student/tutor?tab=assistant&conversationId=${encodeURIComponent(conversationId)}`
        : '/student/tutor?tab=assistant';
      router.replace(targetUrl);
      return;
    }
  }, [authLoading, effectiveRole, user?.role, conversationId, router]);

  // Loading screen during role evaluation or redirect
  if (
    authLoading ||
    effectiveRole === UserRole.PARENT ||
    effectiveRole === UserRole.TEACHER ||
    effectiveRole === UserRole.STUDENT
  ) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          {effectiveRole === UserRole.TEACHER
            ? 'Redirecting to AI Teacher Copilot (Ask Assistant)...'
            : effectiveRole === UserRole.STUDENT
            ? 'Redirecting to AI Student Copilot (Ask Assistant)...'
            : effectiveRole === UserRole.PARENT
            ? 'Redirecting to AI Parent Assistant...'
            : 'Loading AI Assistant...'}
        </p>
      </div>
    );
  }

  // Renders directly for Platform Administrator and Campus Administrator
  return <AIAssistantView initialConversationId={conversationId} />;
}

export default function AIAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading AI Assistant...</p>
        </div>
      }
    >
      <AIAssistantPageContent />
    </Suspense>
  );
}
