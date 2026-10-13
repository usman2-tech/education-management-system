'use client';

/**
 * MODULE: Institutional Dashboard Visualizations
 *
 * PURPOSE:
 * Professional, zero-dependency SVG visualization components for
 * multi-school enrollment trends, attendance trends, circular gauges,
 * grade distributions, and tenant comparisons.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Building2 } from 'lucide-react';

// ==============================================================================
// 1. DONUT / CIRCULAR METRIC GAUGE
// ==============================================================================
interface DonutMetricProps {
  percentage: number;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function DonutMetricChart({
  percentage,
  label,
  sublabel,
  size = 140,
  strokeWidth = 12,
  color = 'stroke-primary',
}: DonutMetricProps) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="stroke-muted/50"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={`${color} transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {clamped}%
          </span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
      </div>
      {sublabel && (
        <span className="mt-2 text-xs text-muted-foreground text-center">
          {sublabel}
        </span>
      )}
    </div>
  );
}

// ==============================================================================
// 2. ATTENDANCE TREND LINE / AREA CHART
// ==============================================================================
interface AttendancePoint {
  date: string;
  percentage: number;
}

export function AttendanceTrendChart({ points }: { points: AttendancePoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        No finalized attendance sessions recorded yet
      </div>
    );
  }

  const height = 180;
  const width = 500;
  const padX = 40;
  const padY = 25;

  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1 ? width / 2 : padX + (idx / (points.length - 1)) * innerW;
    const y = padY + innerH - (Math.min(100, Math.max(0, p.percentage)) / 100) * innerH;
    return { x, y, ...p };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        {/* Horizontal grid */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = padY + innerH - (pct / 100) * innerH;
          return (
            <g key={pct}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="4,4"
              />
              <text
                x={padX - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Gradient fill */}
        {points.length > 1 && (
          <>
            <defs>
              <linearGradient id="attGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon
              points={`${coords[0].x},${height - padY} ${polyline} ${
                coords[coords.length - 1].x
              },${height - padY}`}
              fill="url(#attGradient)"
            />
          </>
        )}

        {/* Polyline */}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(16, 185, 129)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        )}

        {/* Dots */}
        {coords.map((c, idx) => (
          <circle
            key={idx}
            cx={c.x}
            cy={c.y}
            r={hoveredIdx === idx ? 5 : 3.5}
            className="fill-emerald-600 stroke-background stroke-2 cursor-pointer transition-all"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredIdx !== null && coords[hoveredIdx] && (
        <div
          className="absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1 text-xs shadow-md pointer-events-none"
          style={{
            left: `${(coords[hoveredIdx].x / width) * 100}%`,
            top: '8px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-foreground">
            {coords[hoveredIdx].percentage}% Attendance
          </div>
          <div className="text-[10px] text-muted-foreground">{coords[hoveredIdx].date}</div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 3. ENROLLMENT TREND GROUPED BAR CHART
// ==============================================================================
interface EnrollmentTrendPoint {
  month: string;
  students: number;
  teachers: number;
}

export function EnrollmentTrendChart({ data }: { data: EnrollmentTrendPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        No enrollment trend data available
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.students, d.teachers]),
    10,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Students</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400" />
          <span className="text-muted-foreground">Faculty</span>
        </div>
      </div>

      <div className="flex h-44 items-end justify-between gap-3 pt-4">
        {data.map((item) => {
          const studentHeight = Math.max(6, (item.students / maxVal) * 100);
          const teacherHeight = Math.max(6, (item.teachers / maxVal) * 100);

          return (
            <div key={item.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
              <div className="flex items-end gap-1 w-full justify-center h-full">
                {/* Student Bar */}
                <div
                  className="w-1/2 max-w-[18px] rounded-t-sm bg-primary transition-all duration-300 hover:opacity-85"
                  style={{ height: `${studentHeight}%` }}
                  title={`${item.month}: ${item.students} students`}
                />
                {/* Teacher Bar */}
                <div
                  className="w-1/2 max-w-[18px] rounded-t-sm bg-indigo-400 transition-all duration-300 hover:opacity-85"
                  style={{ height: `${teacherHeight}%` }}
                  title={`${item.month}: ${item.teachers} teachers`}
                />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================================================
// 4. GRADE DISTRIBUTION BAR CHART
// ==============================================================================
interface GradeDistPoint {
  letterGrade: string;
  count: number;
}

export function GradeDistributionChart({ data }: { data: GradeDistPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        No grades recorded for this term
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.count), 1);

  const getBarColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-500';
    if (grade.startsWith('B')) return 'bg-blue-500';
    if (grade.startsWith('C')) return 'bg-amber-500';
    if (grade.startsWith('D')) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  return (
    <div className="flex h-44 items-end justify-between gap-3 pt-6">
      {data.map((item) => {
        const heightPct = Math.max(8, (item.count / maxVal) * 100);

        return (
          <div key={item.letterGrade} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {item.count}
            </span>
            <div className="w-full flex-1 flex items-end justify-center">
              <div
                className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${getBarColor(
                  item.letterGrade,
                )}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">{item.letterGrade}</span>
          </div>
        );
      })}
    </div>
  );
}

// ==============================================================================
// 5. SUBJECT PERFORMANCE PROGRESS BARS
// ==============================================================================
interface SubjectPerformancePoint {
  subjectName: string;
  averagePercentage: number;
}

export function SubjectPerformanceChart({
  data,
}: {
  data: SubjectPerformancePoint[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        No subject assessments evaluated yet
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {data.map((subj) => (
        <div key={subj.subjectName} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{subj.subjectName}</span>
            <span className="font-semibold text-primary">{subj.averagePercentage}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                subj.averagePercentage >= 75
                  ? 'bg-emerald-500'
                  : subj.averagePercentage >= 50
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, subj.averagePercentage))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==============================================================================
// 6. SCHOOL COMPARISON TABLE (PLATFORM ADMIN)
// ==============================================================================
interface SchoolComparisonItem {
  schoolId: string;
  schoolName: string;
  code: string;
  studentsCount: number;
  teachersCount: number;
  status: string;
}

export function SchoolComparisonTable({
  schools,
}: {
  schools: SchoolComparisonItem[];
}) {
  if (!schools || schools.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        No school tenants configured
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="py-2.5 px-4 font-semibold">Institutional Tenant</th>
            <th className="py-2.5 px-4 font-semibold">Code</th>
            <th className="py-2.5 px-4 font-semibold text-right">Students</th>
            <th className="py-2.5 px-4 font-semibold text-right">Teachers</th>
            <th className="py-2.5 px-4 font-semibold text-center">Status</th>
            <th className="py-2.5 px-4 font-semibold text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {schools.map((s) => (
            <tr key={s.schoolId} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 px-4 font-medium text-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{s.schoolName}</span>
              </td>
              <td className="py-2.5 px-4 text-muted-foreground font-mono">{s.code}</td>
              <td className="py-2.5 px-4 text-right font-semibold text-foreground">
                {s.studentsCount}
              </td>
              <td className="py-2.5 px-4 text-right font-semibold text-foreground">
                {s.teachersCount}
              </td>
              <td className="py-2.5 px-4 text-center">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="py-2.5 px-4 text-center">
                <Link
                  href={`/schools/${s.schoolId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Inspect
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
