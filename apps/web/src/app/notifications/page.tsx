'use client';

/**
 * MODULE: Institutional Notification Center
 *
 * PURPOSE:
 * Central hub for alerts: homework reminders, exam timetables, grade publication,
 * daily attendance alerts, subscription renewals, and administrative announcements.
 */

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, NotificationDto, NotificationType } from '@ems/contracts';
import { communicationsApi } from '@/lib/communications-api';
import {
  Bell,
  CheckCircle,
  Clock,
  BookOpen,
  Award,
  Calendar,
  AlertTriangle,
  Megaphone,
  CreditCard,
  Info,
  Filter,
  RefreshCw,
  Loader2,
  CheckCheck,
  Send,
  Plus,
} from 'lucide-react';

export default function NotificationsPage() {
  const { user, effectiveRole } = useAuth();
  const canBroadcast =
    effectiveRole === UserRole.PLATFORM_ADMIN ||
    effectiveRole === UserRole.SCHOOL_ADMIN ||
    effectiveRole === UserRole.TEACHER;

  const [notifications, setNotifications] = React.useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = React.useState(false);

  // Broadcast modal
  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [bTitle, setBTitle] = React.useState('');
  const [bMessage, setBMessage] = React.useState('');
  const [bTargetRole, setBTargetRole] = React.useState('');
  const [submittingBroadcast, setSubmittingBroadcast] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await communicationsApi.getNotifications(showUnreadOnly);
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly]);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await communicationsApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await communicationsApi.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle || !bMessage) return;
    setSubmittingBroadcast(true);
    try {
      await communicationsApi.broadcastAnnouncement({
        title: bTitle,
        message: bMessage,
        targetRole: bTargetRole || undefined,
      });
      setBroadcastOpen(false);
      setBTitle('');
      setBMessage('');
      await loadNotifications();
    } catch (err: any) {
      alert(err?.message || 'Failed to broadcast announcement');
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const filtered = notifications.filter((n) => {
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;
    return true;
  });

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'HOMEWORK':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'EXAM':
        return <Award className="h-4 w-4 text-purple-500" />;
      case 'GRADE':
        return <Award className="h-4 w-4 text-emerald-500" />;
      case 'ATTENDANCE':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'SUBSCRIPTION':
        return <CreditCard className="h-4 w-4 text-indigo-500" />;
      case 'ANNOUNCEMENT':
        return <Megaphone className="h-4 w-4 text-rose-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notifications & Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Academic updates, deadlines, school alerts, and operational bulletins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-medium border border-border hover:bg-muted text-foreground rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
              Mark All Read ({unreadCount})
            </button>
          )}

          {canBroadcast && (
            <button
              onClick={() => setBroadcastOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5" />
              Broadcast Notice
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-background border border-input rounded-lg text-xs px-2.5 py-1.5"
          >
            <option value="ALL">All Categories</option>
            <option value="ANNOUNCEMENT">Announcements</option>
            <option value="HOMEWORK">Homework</option>
            <option value="EXAM">Examinations</option>
            <option value="GRADE">Grades</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="SUBSCRIPTION">Subscription</option>
            <option value="INFO">General Info</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="h-3.5 w-3.5 text-primary"
            />
            Unread only
          </label>
        </div>

        <button
          onClick={loadNotifications}
          disabled={loading}
          className="p-1.5 border border-input rounded-lg hover:bg-muted text-muted-foreground self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="font-semibold text-foreground text-sm">No notifications found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {showUnreadOnly ? 'You have caught up with all alerts!' : 'No notifications in this view.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                item.read ? 'bg-background hover:bg-muted/30' : 'bg-primary/5 hover:bg-primary/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-card rounded-lg border border-border mt-0.5">
                  {getTypeIcon(item.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{item.title}</span>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => handleMarkAsRead(item.id)}
                        className="text-primary hover:underline font-medium"
                      >
                        View Details →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!item.read && (
                <button
                  onClick={() => handleMarkAsRead(item.id)}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded hover:bg-muted"
                  title="Mark as read"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Broadcast Institutional Announcement
              </h3>
              <button
                onClick={() => setBroadcastOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Target Audience
                </label>
                <select
                  value={bTargetRole}
                  onChange={(e) => setBTargetRole(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                >
                  <option value="">Entire School (All Roles)</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="PARENT">Parents Only</option>
                  <option value="TEACHER">Faculty / Teachers Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Change: Science Fair"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Message Details *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter details of the institutional announcement..."
                  value={bMessage}
                  onChange={(e) => setBMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBroadcast}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submittingBroadcast && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
