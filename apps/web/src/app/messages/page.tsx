'use client';

/**
 * MODULE: Institutional Direct Messaging & Threads
 *
 * PURPOSE:
 * Secure, institutional communication threads between Teachers, Parents,
 * Students, and Administrators with tenant school isolation and role permissions.
 *
 * DEPENDENCIES:
 * communicationsApi, useAuth, lucide-react
 *
 * SECURITY:
 * Backend strictly authorizes available recipients by role, class enrollment,
 * and verified parent-child relationships. Cross-school messaging is prohibited.
 */

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  ConversationDto,
  DirectMessageDto,
  RecipientContactDto,
  AnnouncementPreviewDto,
  NotificationPreferenceDto,
} from '@ems/contracts';
import { communicationsApi } from '@/lib/communications-api';
import {
  MessageSquare,
  Send,
  Plus,
  Search,
  User,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Mail,
  Megaphone,
  Settings,
  Bell,
  Inbox,
  SendHorizontal,
  CircleDot,
  RefreshCw,
  Users,
  ShieldCheck,
} from 'lucide-react';

export default function MessagesPage() {
  const { user, effectiveRole } = useAuth();

  const isSchoolAdmin = effectiveRole === UserRole.SCHOOL_ADMIN || effectiveRole === UserRole.PLATFORM_ADMIN;
  const canBroadcast = isSchoolAdmin || effectiveRole === UserRole.TEACHER;

  // Active tab: 'all' | 'inbox' | 'sent' | 'unread'
  const [activeTab, setActiveTab] = React.useState<'all' | 'inbox' | 'sent' | 'unread'>('inbox');
  const [conversations, setConversations] = React.useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<(DirectMessageDto & { isMine: boolean })[]>([]);
  const [replyText, setReplyText] = React.useState('');
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [totalUnread, setTotalUnread] = React.useState(0);

  // New conversation modal
  const [newModalOpen, setNewModalOpen] = React.useState(false);
  const [availableRecipients, setAvailableRecipients] = React.useState<RecipientContactDto[]>([]);
  const [loadingRecipients, setLoadingRecipients] = React.useState(false);
  const [newRecipientId, setNewRecipientId] = React.useState('');
  const [newSubject, setNewSubject] = React.useState('');
  const [newInitialMsg, setNewInitialMsg] = React.useState('');
  const [submittingNew, setSubmittingNew] = React.useState(false);

  // Announcement modal
  const [announcementModalOpen, setAnnouncementModalOpen] = React.useState(false);
  const [aTitle, setATitle] = React.useState('');
  const [aMessage, setAMessage] = React.useState('');
  const [aTargetRole, setATargetRole] = React.useState<string>('ALL');
  const [aSectionId, setASectionId] = React.useState('');
  const [previewData, setPreviewData] = React.useState<AnnouncementPreviewDto | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [submittingAnnouncement, setSubmittingAnnouncement] = React.useState(false);

  // Notification Preferences modal (School Admin)
  const [prefModalOpen, setPrefModalOpen] = React.useState(false);
  const [preferences, setPreferences] = React.useState<NotificationPreferenceDto | null>(null);
  const [savingPrefs, setSavingPrefs] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // 1. Fetch conversations & total unread count
  const loadConversations = React.useCallback(async () => {
    try {
      const [convs, unread] = await Promise.all([
        communicationsApi.getConversations(activeTab, search.trim() || undefined),
        communicationsApi.getUnreadCount(),
      ]);
      setConversations(convs);
      setTotalUnread(unread.unreadCount);

      if (!selectedId && convs.length > 0) {
        setSelectedId(convs[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
    }
  }, [activeTab, search, selectedId]);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Periodic polling for real-time inbox synchronization fallback
  React.useEffect(() => {
    const timer = setInterval(() => {
      loadConversations();
    }, 15000);
    return () => clearInterval(timer);
  }, [loadConversations]);

  // 2. Fetch messages when conversation selected
  React.useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    async function loadThread() {
      setLoadingMessages(true);
      try {
        const msgs = await communicationsApi.getConversationMessages(selectedId!);
        if (isMounted) {
          setMessages(msgs);
          // Refresh conversation list to clear unread badge for this thread
          communicationsApi.getUnreadCount().then((res) => {
            if (isMounted) setTotalUnread(res.unreadCount);
          });
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    loadThread();
    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Load available recipients when new message modal opens
  const openNewMessageModal = async () => {
    setNewModalOpen(true);
    setLoadingRecipients(true);
    try {
      const list = await communicationsApi.getAvailableRecipients();
      setAvailableRecipients(list);
      if (list.length > 0) {
        setNewRecipientId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  // 4. Send a reply
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || sending) return;

    setSending(true);
    try {
      const newMsg = await communicationsApi.sendMessage(selectedId, {
        content: replyText.trim(),
      });
      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      await loadConversations();
    } catch (err: any) {
      alert(err?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 5. Create new conversation
  const handleStartNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipientId || !newInitialMsg.trim()) return;

    setSubmittingNew(true);
    try {
      const res = await communicationsApi.createConversation({
        recipientId: newRecipientId,
        subject: newSubject.trim() || undefined,
        initialMessage: newInitialMsg.trim(),
      });

      setNewModalOpen(false);
      setNewSubject('');
      setNewInitialMsg('');
      setSelectedId(res.conversationId);
      await loadConversations();
    } catch (err: any) {
      alert(err?.message || 'Failed to start conversation');
    } finally {
      setSubmittingNew(false);
    }
  };

  // 6. Preview Announcement
  const handlePreviewAnnouncement = async () => {
    setLoadingPreview(true);
    try {
      const preview = await communicationsApi.previewAnnouncement({
        targetRole: aTargetRole === 'ALL' ? undefined : aTargetRole,
        classSectionId: aSectionId.trim() || undefined,
      });
      setPreviewData(preview);
    } catch (err: any) {
      alert(err?.message || 'Failed to calculate recipient preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // 7. Send Announcement
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aTitle.trim() || !aMessage.trim()) return;

    setSubmittingAnnouncement(true);
    try {
      const res = await communicationsApi.broadcastAnnouncement({
        title: aTitle.trim(),
        message: aMessage.trim(),
        targetRole: aTargetRole === 'ALL' ? undefined : aTargetRole,
        classSectionId: aSectionId.trim() || undefined,
      });
      alert(res.message);
      setAnnouncementModalOpen(false);
      setATitle('');
      setAMessage('');
      setPreviewData(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to broadcast announcement');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  // 8. Open & Save Preferences
  const openPreferencesModal = async () => {
    setPrefModalOpen(true);
    try {
      const data = await communicationsApi.getPreferences();
      setPreferences(data);
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    setSavingPrefs(true);
    try {
      const updated = await communicationsApi.updatePreferences(preferences);
      setPreferences(updated);
      alert('Notification preferences updated successfully');
      setPrefModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === selectedId);
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.userId !== user?.id,
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border p-4 rounded-xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Direct Messages & Communications
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-full border border-rose-500/30">
                {totalUnread} Unread
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Role-governed institutional messaging with verified school and guardian relationships.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Announcements Button */}
          {canBroadcast && (
            <button
              onClick={() => {
                setAnnouncementModalOpen(true);
                handlePreviewAnnouncement();
              }}
              className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border flex items-center gap-1.5 transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5 text-primary" />
              Announcements
            </button>
          )}

          {/* Preferences Button (Admins only) */}
          {isSchoolAdmin && (
            <button
              onClick={openPreferencesModal}
              className="px-3 py-1.5 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border flex items-center gap-1.5 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Preferences
            </button>
          )}

          {/* Compose Message Button */}
          <button
            onClick={openNewMessageModal}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Compose Message
          </button>
        </div>
      </div>

      {/* Main Two-Pane Chat Container */}
      <div className="bg-card border border-border rounded-xl shadow-sm h-[720px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Pane: Filter Tabs & Conversations List */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-border flex flex-col h-full bg-card/60">
          {/* Tabs: Inbox / Sent / Unread / All */}
          <div className="p-2.5 border-b border-border bg-muted/20">
            <div className="grid grid-cols-4 gap-1 p-1 bg-background rounded-lg border border-border text-xs">
              <button
                onClick={() => setActiveTab('inbox')}
                className={`py-1 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'inbox'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Inbox className="h-3 w-3" />
                Inbox
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`py-1 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'unread'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <CircleDot className="h-3 w-3" />
                Unread
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-1 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'sent'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <SendHorizontal className="h-3 w-3" />
                Sent
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`py-1 rounded-md font-medium text-center transition-colors flex items-center justify-center gap-1 ${
                  activeTab === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search subject or contact..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={loadConversations}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingList ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs font-medium text-muted-foreground">No conversations found</p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  {search ? 'Try adjusting your search criteria.' : 'Click "Compose Message" to start a secure thread.'}
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const other = conv.participants.find((p) => p.userId !== user?.id);
                const isSelected = conv.id === selectedId;
                const hasUnread = conv.unreadCount && conv.unreadCount > 0;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : hasUnread
                        ? 'bg-amber-500/5 hover:bg-muted/50 font-medium'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                        hasUnread
                          ? 'bg-primary text-white'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {other?.name ? other.name.substring(0, 2).toUpperCase() : 'EM'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs truncate ${hasUnread ? 'font-bold text-foreground' : 'text-foreground'}`}>
                          {other?.name || 'Contact'}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {new Date(conv.lastMessageAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono uppercase">
                          {other?.role?.replace('_', ' ')}
                        </span>
                        {conv.subject && (
                          <span className="text-[11px] text-foreground/80 truncate">
                            • {conv.subject}
                          </span>
                        )}
                      </div>

                      {conv.lastMessage && (
                        <p className={`text-xs truncate mt-1 ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>

                    {hasUnread ? (
                      <span className="h-4 min-w-4 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {conv.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-background">
          {activeConversation ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center">
                    {otherParticipant?.name ? otherParticipant.name.substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {otherParticipant?.name || 'Conversation'}
                    </h3>
                    <span className="text-[11px] text-muted-foreground block">
                      {otherParticipant?.email} • {otherParticipant?.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {activeConversation.subject && (
                  <span className="text-xs font-medium text-foreground bg-muted/60 border border-border px-2.5 py-1 rounded-md">
                    {activeConversation.subject}
                  </span>
                )}
              </div>

              {/* Messages Scroll View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center items-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    No messages in this thread yet. Send a message to start communicating.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                          m.isMine
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-card border border-border text-foreground rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1 px-1">
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {m.isMine && (
                          m.isRead ? (
                            <span title="Read"><CheckCheck className="h-3 w-3 text-sky-500" /></span>
                          ) : (
                            <span title="Delivered"><Check className="h-3 w-3 text-muted-foreground" /></span>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-card flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="p-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 transition-colors shadow-xs"
                  title="Send"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
              <Mail className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="font-semibold text-foreground text-sm">Select a Conversation</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a thread from the list or start a new direct communication.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Compose New Message Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Compose New Direct Message
              </h3>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartNewConversation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Authorized Recipient *
                </label>
                {loadingRecipients ? (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading authorized contacts...
                  </div>
                ) : availableRecipients.length === 0 ? (
                  <p className="text-xs text-rose-500 py-1">
                    No authorized messaging contacts available for your role.
                  </p>
                ) : (
                  <select
                    required
                    value={newRecipientId}
                    onChange={(e) => setNewRecipientId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                  >
                    {availableRecipients.map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.name} — {rec.context || rec.role}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Permissions are strictly verified against school enrollment and student-guardian records.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Student Progress or Attendance Inquiry"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Message Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your message here..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNew || availableRecipients.length === 0}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submittingNew && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcements Modal with Recipient Preview */}
      {announcementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Broadcast Announcement
              </h3>
              <button
                onClick={() => setAnnouncementModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Target Audience
                </label>
                <select
                  value={aTargetRole}
                  onChange={(e) => {
                    setATargetRole(e.target.value);
                    setTimeout(handlePreviewAnnouncement, 50);
                  }}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                >
                  <option value="ALL">Entire School Community (All Roles)</option>
                  <option value={UserRole.PARENT}>Parents & Guardians Only</option>
                  <option value={UserRole.TEACHER}>Teachers & Faculty Only</option>
                  <option value={UserRole.STUDENT}>Students Only</option>
                </select>
              </div>

              {/* Recipient Preview Box */}
              <div className="p-3 bg-muted/40 border border-border rounded-lg text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Recipient Preview:
                  </span>
                  <button
                    type="button"
                    onClick={handlePreviewAnnouncement}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    {loadingPreview ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh Count'}
                  </button>
                </div>
                {previewData ? (
                  <div>
                    <p className="text-muted-foreground">
                      Will be delivered to <strong className="text-foreground">{previewData.recipientCount}</strong> eligible recipients.
                    </p>
                    {previewData.sampleRecipients?.length > 0 && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Sample recipients: {previewData.sampleRecipients.map((s) => s.name).join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Calculating eligible recipients...</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. School Assembly & Sports Gala Schedule"
                  value={aTitle}
                  onChange={(e) => setATitle(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Announcement Content *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write the full institutional announcement here..."
                  value={aMessage}
                  onChange={(e) => setAMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAnnouncementModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAnnouncement}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {submittingAnnouncement && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Broadcast Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Preferences Modal */}
      {prefModalOpen && preferences && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Automated Notification Settings
              </h3>
              <button
                onClick={() => setPrefModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Configure school-wide automated alert triggers. Mandatory safety and absence alerts are protected by institutional policy.
              </p>

              <div className="space-y-2.5 pt-2">
                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Student Absence Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Dispatches immediate in-app alerts to verified guardians upon attendance finalization.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.absenceAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, absenceAlertsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Attendance Correction Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Notifies parents when finalized absent records are updated.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.attendanceCorrectionAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        attendanceCorrectionAlertsEnabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Homework & Deadline Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Automated reminders for newly published homework assignments.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.homeworkAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, homeworkAlertsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Fee & Invoice Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Automated reminders for upcoming and overdue invoice dates.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.feeAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, feeAlertsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Transport & GPS Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Route updates and transit alerts for enrolled bus riders.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.transportAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, transportAlertsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/20">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">Library Due Date Alerts</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Notifies students and guardians before book loan expiry.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.libraryAlertsEnabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, libraryAlertsEnabled: e.target.checked })
                    }
                    className="h-4 w-4 rounded text-primary"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPrefModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-input rounded-lg hover:bg-muted text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-2"
                >
                  {savingPrefs && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
