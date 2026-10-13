'use client';

/**
 * MODULE: Institutional Direct Messaging & Threads
 *
 * PURPOSE:
 * Secure, institutional communication threads between Teachers, Parents,
 * Students, and Administrators with tenant school isolation and role permissions.
 */

import * as React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { UserRole, ConversationDto, DirectMessageDto } from '@ems/contracts';
import { communicationsApi } from '@/lib/communications-api';
import { fetchTeachers } from '@/lib/teachers-api';
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
} from 'lucide-react';

export default function MessagesPage() {
  const { user, effectiveRole } = useAuth();

  const [conversations, setConversations] = React.useState<ConversationDto[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<(DirectMessageDto & { isMine: boolean })[]>([]);
  const [replyText, setReplyText] = React.useState('');
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState('');

  // New conversation modal
  const [newModalOpen, setNewModalOpen] = React.useState(false);
  const [availableRecipients, setAvailableRecipients] = React.useState<any[]>([]);
  const [newRecipientId, setNewRecipientId] = React.useState('');
  const [newSubject, setNewSubject] = React.useState('');
  const [newInitialMsg, setNewInitialMsg] = React.useState('');
  const [submittingNew, setSubmittingNew] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const loadConversations = React.useCallback(async () => {
    try {
      const data = await communicationsApi.getConversations();
      setConversations(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

  React.useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever selectedId changes
  React.useEffect(() => {
    if (!selectedId) return;

    let isMounted = true;
    async function loadThread() {
      setLoadingMessages(true);
      try {
        const msgs = await communicationsApi.getConversationMessages(selectedId!);
        if (isMounted) setMessages(msgs);
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

  // Load faculty contacts for new message modal
  React.useEffect(() => {
    async function loadContacts() {
      try {
        const teachersRes = await fetchTeachers({ limit: 50 });
        const list = teachersRes.items || [];
        setAvailableRecipients(list);
        if (list.length > 0) setNewRecipientId(list[0].id);
      } catch (err) {
        console.error('Failed to load teacher contacts:', err);
      }
    }
    loadContacts();
  }, []);

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

  const activeConversation = conversations.find((c) => c.id === selectedId);
  const otherParticipant = activeConversation?.participants.find(
    (p) => p.userId !== user?.id,
  );

  const filteredConversations = conversations.filter((c) => {
    const participantNames = c.participants.map((p) => p.name.toLowerCase()).join(' ');
    const subject = (c.subject || '').toLowerCase();
    const q = search.toLowerCase();
    return participantNames.includes(q) || subject.includes(q);
  });

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Direct Messages & Communications
          </h1>
          <p className="text-xs text-muted-foreground">
            Role-governed communication threads with tenant school isolation.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="px-3.5 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          New Message
        </button>
      </div>

      {/* Main Two-Pane Chat Container */}
      <div className="bg-card border border-border rounded-xl shadow-sm h-[680px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Pane: Conversations List */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-border flex flex-col h-full bg-card/60">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loadingList ? (
              <div className="flex justify-center items-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground p-4">
                No conversations yet. Start a new communication thread with a faculty member.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = conv.participants.find((p) => p.userId !== user?.id);
                const isSelected = conv.id === selectedId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {other?.name ? other.name.substring(0, 2).toUpperCase() : 'EM'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {other?.name || 'Contact'}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-mono inline-block mt-0.5">
                        {other?.role}
                      </span>

                      {conv.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>

                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
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
              {/* Header */}
              <div className="p-3.5 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                    {otherParticipant?.name ? otherParticipant.name.substring(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {otherParticipant?.name || 'Conversation'}
                    </h3>
                    <span className="text-[11px] text-muted-foreground block">
                      {otherParticipant?.email} • {otherParticipant?.role}
                    </span>
                  </div>
                </div>

                {activeConversation.subject && (
                  <span className="text-xs font-medium text-muted-foreground border border-border px-2 py-0.5 rounded">
                    Subject: {activeConversation.subject}
                  </span>
                )}
              </div>

              {/* Messages Flow */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center items-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    No messages in this conversation yet. Send the first message below.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.isMine ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                          m.isMine
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-card border border-border text-foreground rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
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
                  className="p-2 bg-primary hover:bg-primary/90 text-white rounded-xl disabled:opacity-50 transition-colors"
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
                Choose a thread from the left or create a new message.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Start New Conversation Modal */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Start Direct Communication Thread
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
                  Recipient Faculty / Staff *
                </label>
                <select
                  required
                  value={newRecipientId}
                  onChange={(e) => setNewRecipientId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                >
                  {availableRecipients.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.firstName} {rec.lastName} ({rec.email || rec.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Progress Inquiry"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                  Initial Message *
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
                  disabled={submittingNew}
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
    </div>
  );
}
