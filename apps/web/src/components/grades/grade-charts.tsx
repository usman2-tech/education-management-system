'use client';

/**
 * MODULE: Grades & Academic Performance - Visualizations
 *
 * PURPOSE:
 * Lightweight, zero-dependency, high-performance SVG chart components
 * for subject performance, grade distribution, and student progress trends.
 */

import React, { useState } from 'react';

interface SubjectBarData {
  subjectName: string;
  averagePercentage: number;
  letterGrade?: string;
  totalAssessments?: number;
}

export function SubjectPerformanceBarChart({ data }: { data: SubjectBarData[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No assessment data recorded for this selection
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.averagePercentage), 100);

  const getBarColor = (pct: number) => {
    if (pct >= 85) return 'from-emerald-500 to-teal-600';
    if (pct >= 70) return 'from-indigo-500 to-blue-600';
    if (pct >= 50) return 'from-amber-500 to-yellow-600';
    return 'from-rose-500 to-red-600';
  };

  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const widthPct = Math.min(100, Math.max(4, (item.averagePercentage / maxVal) * 100));
        const isHovered = hoveredIdx === idx;

        return (
          <div
            key={item.subjectName + idx}
            className="group relative cursor-pointer"
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="mb-1 flex items-center justify-between text-xs font-medium">
              <span className="truncate text-foreground group-hover:text-primary transition-colors">
                {item.subjectName}
              </span>
              <div className="flex items-center gap-2">
                {item.letterGrade && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                    {item.letterGrade}
                  </span>
                )}
                <span className="font-semibold text-foreground">{item.averagePercentage}%</span>
              </div>
            </div>

            <div className="h-4 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${getBarColor(
                  item.averagePercentage,
                )} transition-all duration-500 ease-out`}
                style={{ width: `${widthPct}%` }}
              />
            </div>

            {isHovered && item.totalAssessments !== undefined && (
              <div className="absolute right-0 top-6 z-10 rounded-md bg-popover px-2 py-1 text-[11px] text-popover-foreground shadow-md border border-border">
                {item.totalAssessments} assessment{item.totalAssessments === 1 ? '' : 's'} factored
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface GradeDistData {
  letterGrade: string;
  count: number;
}

export function GradeDistributionChart({ data }: { data: GradeDistData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No grade distribution data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-500 hover:bg-emerald-600';
    if (grade.startsWith('B')) return 'bg-indigo-500 hover:bg-indigo-600';
    if (grade.startsWith('C')) return 'bg-amber-500 hover:bg-amber-600';
    if (grade.startsWith('D')) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-rose-500 hover:bg-rose-600';
  };

  return (
    <div className="flex h-56 items-end justify-between gap-2 pt-6">
      {data.map((item) => {
        const heightPct = Math.max(8, (item.count / maxCount) * 100);

        return (
          <div
            key={item.letterGrade}
            className="group flex flex-1 flex-col items-center gap-2 h-full justify-end"
          >
            <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
              {item.count}
            </span>
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-300 ${getGradeColor(
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

interface TrendPoint {
  title: string;
  date: string;
  percentage: number;
  letterGrade?: string;
}

export function StudentTrendLineChart({ points }: { points: TrendPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!points || points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        No completed assessments to chart trend
      </div>
    );
  }

  const height = 180;
  const width = 500;
  const paddingX = 40;
  const paddingY = 25;

  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? width / 2
        : paddingX + (idx / (points.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - (Math.min(100, Math.max(0, p.percentage)) / 100) * innerHeight;
    return { x, y, ...p };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 overflow-visible"
      >
        {/* Horizontal gridlines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = paddingY + innerHeight - (pct / 100) * innerHeight;
          return (
            <g key={pct}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4,4"
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[9px]"
              >
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Gradient fill under curve */}
        {points.length > 1 && (
          <>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon
              points={`${coords[0].x},${height - paddingY} ${polylinePoints} ${
                coords[coords.length - 1].x
              },${height - paddingY}`}
              fill="url(#trendGradient)"
            />
          </>
        )}

        {/* Trend Polyline */}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(99, 102, 241)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
        )}

        {/* Data points */}
        {coords.map((c, idx) => (
          <g key={idx} className="cursor-pointer">
            <circle
              cx={c.x}
              cy={c.y}
              r={hoveredIndex === idx ? 6 : 4}
              className="fill-primary stroke-background stroke-2 transition-all duration-200"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}
      </svg>

      {/* Hover Card */}
      {hoveredIndex !== null && coords[hoveredIndex] && (
        <div
          className="absolute z-20 rounded-md border border-border bg-popover px-3 py-1.5 text-xs shadow-lg pointer-events-none transition-all"
          style={{
            left: `${(coords[hoveredIndex].x / width) * 100}%`,
            top: '10px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-semibold text-foreground truncate max-w-[160px]">
            {coords[hoveredIndex].title}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {new Date(coords[hoveredIndex].date).toLocaleDateString()}
          </div>
          <div className="mt-1 flex items-center gap-1 font-bold text-primary">
            <span>{coords[hoveredIndex].percentage}%</span>
            {coords[hoveredIndex].letterGrade && (
              <span className="text-[10px] bg-muted px-1 rounded text-foreground">
                ({coords[hoveredIndex].letterGrade})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
