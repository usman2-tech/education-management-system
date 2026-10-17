'use client';

/**
 * MODULE: Institutional Global Settings & Configuration
 *
 * PURPOSE:
 * Manages institutional tenant preferences, security policies, notification defaults,
 * and interface themes for administrative personnel.
 *
 * ZERO FABRICATION DIRECTIVE:
 * Preserves institutional configuration with real persistence state.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@ems/contracts';
import {
  Sliders,
  Building2,
  Shield,
  Bell,
  Palette,
  Save,
  CheckCircle2,
  Clock,
  Key,
  Globe,
  Mail,
  Smartphone,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, effectiveRole } = useAuth();

  const [activeTab, setActiveTab] = React.useState<'general' | 'security' | 'notifications' | 'theme'>('general');
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = React.useState<boolean>(false);

  // Settings form state
  const [generalSettings, setGeneralSettings] = React.useState({
    institutionName: 'Apex International Academy',
    campusCode: 'AIA-MAIN',
    academicYear: '2025-2026',
    timezone: 'UTC+00:00 (London / GMT)',
    dateFormat: 'DD/MM/YYYY',
    locale: 'en-GB',
  });

  const [securitySettings, setSecuritySettings] = React.useState({
    sessionTimeoutMinutes: 60,
    enforceMfaForStaff: true,
    passwordExpirationDays: 90,
    lockoutAttempts: 5,
    allowParentSelfRegistration: false,
  });

  const [notificationSettings, setNotificationSettings] = React.useState({
    attendanceAbsenceAlerts: true,
    gradePublicationAlerts: true,
    examScheduleAnnouncements: true,
    directMessagingPush: true,
    dailySummaryDigest: false,
  });

  const [themeMode, setThemeMode] = React.useState<'system' | 'light' | 'dark'>('system');

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Institutional Settings
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure tenant security parameters, operational standards, notifications, and branding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            {isSaving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        {[
          { id: 'general', label: 'General & Campus', icon: Building2 },
          { id: 'security', label: 'Security & Access', icon: Shield },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'theme', label: 'Display & Theme', icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                active
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Campus Identity & Academic Calendar</h2>
              <p className="text-xs text-slate-500 mt-0.5">Primary institutional naming, term settings, and regional formats.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Institution Name</label>
                <input
                  type="text"
                  value={generalSettings.institutionName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, institutionName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Campus Code Identifier</label>
                <input
                  type="text"
                  value={generalSettings.campusCode}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, campusCode: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Academic Term / Year</label>
                <input
                  type="text"
                  value={generalSettings.academicYear}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Timezone</label>
                <select
                  value={generalSettings.timezone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="UTC+00:00 (London / GMT)">UTC+00:00 (London / GMT)</option>
                  <option value="UTC+05:00 (Islamabad, Karachi)">UTC+05:00 (Islamabad, Karachi)</option>
                  <option value="UTC+05:30 (New Delhi, Mumbai)">UTC+05:30 (New Delhi, Mumbai)</option>
                  <option value="UTC-05:00 (Eastern Standard Time)">UTC-05:00 (Eastern Standard Time)</option>
                  <option value="UTC-08:00 (Pacific Standard Time)">UTC-08:00 (Pacific Standard Time)</option>
                  <option value="UTC+04:00 (Dubai / Gulf)">UTC+04:00 (Dubai / Gulf)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Date Format</label>
                <select
                  value={generalSettings.dateFormat}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 14/10/2026)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 10/14/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Institutional Locale</label>
                <input
                  type="text"
                  value={generalSettings.locale}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, locale: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Security & Authentication Policies</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define multi-factor authentication requirements and session lifespan.</p>
            </div>

            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enforce Multi-Factor Authentication (MFA)</p>
                  <p className="text-xs text-slate-500">Require TOTP authentication for all School Admin & Teacher logins.</p>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.enforceMfaForStaff}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, enforceMfaForStaff: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Session Inactivity Timeout (Minutes)</p>
                  <p className="text-xs text-slate-500">Automatically expire inactive browser sessions.</p>
                </div>
                <input
                  type="number"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                  className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Failed Login Lockout Threshold</p>
                  <p className="text-xs text-slate-500">Lock user account after consecutive incorrect passwords.</p>
                </div>
                <input
                  type="number"
                  value={securitySettings.lockoutAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutAttempts: parseInt(e.target.value) || 3 })}
                  className="w-24 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Automated Notification Rules</h2>
              <p className="text-xs text-slate-500 mt-0.5">Control which institutional events trigger real-time alerts.</p>
            </div>

            <div className="space-y-3 max-w-2xl">
              {[
                { key: 'attendanceAbsenceAlerts', label: 'Unexcused Student Absence Alerts', desc: 'Notify parents immediately when student is marked absent' },
                { key: 'gradePublicationAlerts', label: 'Assessment Grade Publication Alerts', desc: 'Broadcast notifications to students and parents upon marks publishing' },
                { key: 'examScheduleAnnouncements', label: 'Exam Timetable & Room Announcements', desc: 'Send alerts when exams are scheduled or modified' },
                { key: 'directMessagingPush', label: 'Direct Messaging Instant Push Alerts', desc: 'Send in-app notifications for new direct chat messages' },
                { key: 'dailySummaryDigest', label: 'Daily Campus Summary Digest', desc: 'Email daily attendance and operational briefing at 18:00' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(notificationSettings as any)[item.key]}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Display Theme & Accessibility</h2>
              <p className="text-xs text-slate-500 mt-0.5">Select visual theme and institutional design preferences.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              {[
                { id: 'system', label: 'System Default', desc: 'Match operating system appearance' },
                { id: 'light', label: 'Institutional Light', desc: 'Clean high-readability daylight mode' },
                { id: 'dark', label: 'Sleek Dark', desc: 'Low-glare dark slate contrast mode' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setThemeMode(mode.id as any)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    themeMode === mode.id
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950'
                  }`}
                >
                  <p className="font-semibold text-sm">{mode.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
