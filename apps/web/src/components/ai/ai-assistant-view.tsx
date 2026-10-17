'use client';

/**
 * MODULE: Institutional AI Assistant View
 *
 * PURPOSE:
 * Reusable, role-aware institutional AI Assistant component powered by Google Gemini
 * and integrated with verified read-only EMS institutional data tools, conversation
 * history, document intelligence, and usage metrics.
 *
 * DEPENDENCIES:
 * aiApi, useAuth, lucide-react, @ems/contracts
 *
 * SECURITY:
 * All queries are scoped strictly by authenticated session, role context, and school isolation.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { aiApi } from '@/lib/ai-api';
import {
  AIConversationDto,
  AIMessageDto,
  AIMessageSender,
  AIUsageSummaryDto,
  UserRole,
} from '@ems/contracts';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Sparkles,
  Shield,
  Loader2,
  AlertCircle,
  MessageSquare,
  School,
  GraduationCap,
  Users,
  BookOpen,
  ChevronRight,
  FolderGit2,
} from 'lucide-react';

export interface AIAssistantViewProps {
  initialConversationId?: string | null;
  embedded?: boolean;
  className?: string;
}

export function AIAssistantView({
  initialConversationId,
  embedded = false,
  className = '',
}: AIAssistantViewProps) {
  const { user, effectiveRole, isLoading: authLoading } = useAuth();

  // State
  const [conversations, setConversations] = useState<AIConversationDto[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<AIMessageDto[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [usage, setUsage] = useState<AIUsageSummaryDto | null>(null);
  const [showHistoryMobile, setShowHistoryMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Initial load: conversations, prompts, usage
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        const [convList, promptsData, usageData] = await Promise.all([
          aiApi.listConversations().catch((e) => {
            console.warn('Could not load AI conversations:', e?.message);
            return [] as AIConversationDto[];
          }),
          aiApi.getSuggestedPrompts().catch((e) => {
            console.warn('Could not load AI prompts:', e?.message);
            return { role: effectiveRole, prompts: [] };
          }),
          aiApi.getUsage().catch(() => null),
        ]);

        setConversations(convList);
        setSuggestedPrompts(promptsData?.prompts || []);
        if (usageData) setUsage(usageData);

        const targetId = initialConversationId || (convList.length > 0 ? convList[0].id : null);
        if (targetId) {
          await loadConversation(targetId).catch(() => {});
        }
      } catch (err: any) {
        console.error('AI Assistant initialization notice:', err);
        setError('AI Assistant is currently operating in limited offline mode. Other institutional modules remain fully operational.');
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, [effectiveRole, user?.role, initialConversationId]);

  // Load a specific conversation's history
  const loadConversation = async (id: string) => {
    setError(null);
    setActiveConversationId(id);
    setShowHistoryMobile(false);
    try {
      const fullConv = await aiApi.getConversation(id);
      setMessages(fullConv.messages || []);
    } catch (err: any) {
      console.error('Failed to load conversation:', err);
      setError(err.message || 'Failed to load conversation history.');
    }
  };

  // Start a fresh conversation
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setShowHistoryMobile(false);
  };

  // Delete an existing conversation
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await aiApi.deleteConversation(id);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);

      if (activeConversationId === id) {
        if (updated.length > 0) {
          await loadConversation(updated[0].id);
        } else {
          handleNewConversation();
        }
      }
    } catch (err: any) {
      console.error('Failed to delete conversation:', err);
      setError(err.message || 'Failed to delete conversation.');
    }
  };

  // Send message
  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isSending) return;

    setError(null);
    setInputPrompt('');
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: AIMessageDto = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversationId || 'new',
      sender: AIMessageSender.USER,
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await aiApi.chat({
        conversationId: activeConversationId || undefined,
        message: text,
      });

      if (!activeConversationId) {
        setActiveConversationId(response.conversationId);
      }

      // Append assistant response
      setMessages((prev) => [...prev, response.message]);

      // Refresh conversations list to update snippet & order
      aiApi.listConversations().then(setConversations).catch(() => {});
      aiApi.getUsage().then(setUsage).catch(() => {});
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'An error occurred while communicating with Google Gemini.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Role details helper
  const getRoleBadge = () => {
    switch (effectiveRole) {
      case UserRole.PLATFORM_ADMIN:
        return { label: 'Platform Administrator Scope', icon: Shield, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
      case UserRole.SCHOOL_ADMIN:
        return { label: 'Campus Administrator Scope', icon: School, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
      case UserRole.TEACHER:
        return { label: 'Teacher & Instructor Scope', icon: BookOpen, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case UserRole.STUDENT:
        return { label: 'Student Learning Scope', icon: GraduationCap, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      case UserRole.PARENT:
        return { label: 'Parent / Guardian Scope', icon: Users, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' };
      default:
        return { label: 'Academic Scope', icon: Bot, color: 'text-primary bg-primary/10 border-primary/20' };
    }
  };

  const roleBadge = getRoleBadge();
  const RoleIcon = roleBadge.icon;

  const containerHeight = embedded
    ? 'h-[750px] min-h-[580px]'
    : 'h-[calc(100vh-140px)] min-h-[580px]';

  return (
    <div className={`flex flex-col ${containerHeight} rounded-2xl border border-border bg-card shadow-sm overflow-hidden ${className}`}>
      
      {/* Top Header Bar - Standardized to "AI Assistant" */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-foreground">
                AI Assistant
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Google Gemini
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>Role-Aware Academic Advisor</span>
              <span>&bull;</span>
              <span>Live PostgreSQL Tools</span>
              {usage && (
                <>
                  <span>&bull;</span>
                  <span className="text-primary font-medium">
                    {usage.totalRequests} queries ({usage.totalTokens} tokens)
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Role Scope Badge */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${roleBadge.color}`}>
            <RoleIcon className="h-3.5 w-3.5" />
            <span>{roleBadge.label}</span>
          </div>

          {/* Mobile History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistoryMobile(!showHistoryMobile)}
            className="sm:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chats</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Content */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* LEFT PANEL: Conversation History List */}
        <div
          className={`w-64 sm:w-72 border-r border-border bg-muted/10 flex flex-col shrink-0 transition-transform duration-200 z-10 sm:relative absolute inset-y-0 left-0 sm:translate-x-0 ${
            showHistoryMobile ? 'translate-x-0 bg-card shadow-xl' : '-translate-x-full sm:translate-x-0'
          }`}
        >
          {/* New Chat Button */}
          <div className="p-3 border-b border-border">
            <button
              type="button"
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground py-2 px-3 shadow-xs hover:bg-primary/90 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading sessions...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No past conversations. Click "New Conversation" to start.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`group w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs'
                        : 'text-foreground hover:bg-muted/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="truncate">
                        <div className="truncate leading-tight">{conv.title}</div>
                        <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                          {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive rounded transition-opacity"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Usage Metrics in Sidebar Footer */}
          {usage && (
            <div className="p-3 border-t border-border bg-background/50 text-[11px] text-muted-foreground space-y-1">
              <div className="flex justify-between items-center">
                <span>Total Usage</span>
                <span className="font-semibold text-foreground">
                  {usage.totalRequests} queries
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/75">
                {usage.totalTokens} tokens &bull; {usage.modelName || 'Google Gemini'}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Chat Messages Thread & Dock */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[11px] underline font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Scrollable Message Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center p-6 space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Institutional AI Assistant
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Powered by Google Gemini and connected to your verified institutional records. Ask questions about your courses, homework, schedules, attendance, policy documents, or school rules.
                  </p>
                </div>

                {/* Suggested Starters */}
                {suggestedPrompts.length > 0 && (
                  <div className="w-full pt-2 space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground text-left">
                      Suggested prompts for your role:
                    </p>
                    <div className="grid grid-cols-1 gap-2 text-left">
                      {suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(prompt)}
                          className="w-full p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 text-xs text-foreground flex items-center justify-between transition-colors shadow-2xs group"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.sender === AIMessageSender.USER;
                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-br-xs'
                          : 'bg-muted/40 text-foreground border border-border rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.content}
                      </div>

                      {/* Assistant Metadata */}
                      {!isUser && (
                        <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground">
                              <span>Verified Tool: {msg.toolCalls.map((t) => t.name).join(', ')}</span>
                            </span>
                          )}
                          {msg.modelName && (
                            <span className="text-[9px] opacity-70">
                              {msg.modelName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* In-Flight Thinking Indicator */}
            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl p-3 bg-muted/40 border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  <span>Consulting Google Gemini and querying EMS records...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Bar */}
          <div className="px-3 sm:px-4 py-1.5 border-t border-border/40 bg-muted/10 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
            <span className="text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
              <FolderGit2 className="h-3 w-3 text-accent" />
              <span>Doc Intelligence:</span>
            </span>
            <button
              type="button"
              onClick={() => handleSendMessage('What are the official attendance thresholds and examination eligibility rules?')}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium hover:border-accent hover:text-accent transition-colors shrink-0"
            >
              Ask School Documents
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Summarize the institutional examination policy and student grading guidelines.')}
              className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium hover:border-accent hover:text-accent transition-colors shrink-0"
            >
              Summarize Policy
            </button>
            {(effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN || effectiveRole === UserRole.TEACHER) && (
              <button
                type="button"
                onClick={() => handleSendMessage('Draft an administrative notice announcing the upcoming parent-teacher conference schedule.')}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium hover:border-accent hover:text-accent transition-colors shrink-0"
              >
                Draft Announcement
              </button>
            )}
            {(effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN) && (
              <button
                type="button"
                onClick={() => handleSendMessage('Generate an institutional executive narrative report on campus attendance and academic operations.')}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 font-medium hover:border-accent hover:text-accent transition-colors shrink-0"
              >
                Generate Report
              </button>
            )}
          </div>

          {/* Bottom Message Input Dock */}
          <div className="p-3 sm:p-4 border-t border-border bg-card shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative rounded-2xl border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2 flex flex-col gap-2 shadow-xs"
            >
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${
                  effectiveRole === UserRole.STUDENT
                    ? 'your attendance, grades, homework, exam rules or policies...'
                    : effectiveRole === UserRole.TEACHER
                    ? 'your classes, lesson planning, staff guidelines or drafting notices...'
                    : effectiveRole === UserRole.PARENT
                    ? 'your child’s attendance, homework, report card or tuition...'
                    : 'campus operations, policies, notice drafts or executive reports...'
                }`}
                rows={2}
                className="w-full resize-none border-0 bg-transparent p-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">
                  Press <kbd className="rounded border px-1 text-[9px]">Enter</kbd> to send, <kbd className="rounded border px-1 text-[9px]">Shift+Enter</kbd> for new line
                </span>

                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isSending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Send</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center text-[10px] text-muted-foreground mt-2">
              Gemini AI Academic Assistant &bull; Grounded strictly in authorized institutional records &bull; Respects RBAC and school isolation.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
