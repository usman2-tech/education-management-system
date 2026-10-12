'use client';

/**
 * MODULE: Institutional Module Grid Card
 *
 * PURPOSE:
 * Displays active institutional modules and architecture readiness cards.
 * Adheres strictly to Zero Fabrication Directive: does not show fake student counts.
 */

import * as React from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Bot,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

interface ModuleCardItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  status: 'Ready' | 'Next' | 'Roadmap';
  badge: string;
  scope: string;
}

const MODULES: ModuleCardItem[] = [
  {
    id: 'foundation',
    title: 'Architecture & Foundation',
    description: 'Monorepo workspace, Next.js App Router, NestJS API, FastAPI AI Service, Prisma & theme engine.',
    icon: ShieldCheck,
    status: 'Ready',
    badge: 'Task 001',
    scope: 'Core System',
  },
  {
    id: 'auth',
    title: 'Authentication & Multi-Tenant RBAC',
    description: 'JWT sessions, school boundaries, password hashing, and granular permissions for all 5 roles.',
    icon: Users,
    status: 'Next',
    badge: 'Task 002',
    scope: 'Security',
  },
  {
    id: 'schools',
    title: 'Multi-School Institutional Registry',
    description: 'Tenant creation, campus configuration, academic years, terms, and institutional licensing.',
    icon: Building2,
    status: 'Roadmap',
    badge: 'Task 003',
    scope: 'Platform Admin',
  },
  {
    id: 'academics',
    title: 'Academics, Classes & Timetables',
    description: 'Classrooms, subject allocation, schedule collision avoidance, and student enrollment records.',
    icon: GraduationCap,
    status: 'Roadmap',
    badge: 'Task 004',
    scope: 'School Admin / Teachers',
  },
  {
    id: 'assessments',
    title: 'Grading, Exams & Homework',
    description: 'Weighted grading rubrics, examination timetables, report card generation, and homework tracking.',
    icon: FileText,
    status: 'Roadmap',
    badge: 'Task 005',
    scope: 'Academic Oversight',
  },
  {
    id: 'ai-agents',
    title: 'Agentic AI & Study Copilot',
    description: 'FastAPI LangGraph agents, personalized study tutor, teacher lesson plan summarization, and RAG.',
    icon: Bot,
    status: 'Roadmap',
    badge: 'Task 006+',
    scope: 'AI Microservice',
  },
];

export function RoleNavigationCard() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            System Modules & Architectural Roadmap
          </h2>
          <p className="text-xs text-muted-foreground">
            Modular monolith delivery — systematic verification and role-specific capabilities
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          const isReady = mod.status === 'Ready';
          const isNext = mod.status === 'Next';

          return (
            <div
              key={mod.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isReady
                  ? 'border-accent/40 bg-card shadow-sm hover:border-accent'
                  : isNext
                  ? 'border-primary/30 bg-card/90 shadow-sm hover:border-primary'
                  : 'border-border/70 bg-card/60 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      isReady
                        ? 'bg-accent/10 text-accent'
                        : isNext
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${
                      isReady
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : isNext
                        ? 'bg-accent/10 text-accent'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {mod.badge} &bull; {mod.status}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] font-medium text-muted-foreground">
                    {mod.scope}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {mod.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-border/60 pt-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  {isReady ? 'Active in Task 001' : isNext ? 'Scheduled Next in Task 002' : 'Planned Milestone'}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
