'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  Lock, 
  MessageCircle, 
  Layers, 
  Loader2, 
  User, 
  AlertCircle,
  Inbox,
  Check,
  PlusCircle
} from 'lucide-react';
import { Thread, Message, Platform, Participant } from '@/lib/providers/types';
import XConnect from '@/components/XConnect';

// Custom Brand SVGs since Lucide v0.400+ removed social brand icons
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; avatarUrl?: string } | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isXConnected, setIsXConnected] = useState<boolean>(false);
  const [globalApiCallCount, setGlobalApiCallCount] = useState<number>(0);
  
  // API Budget Limits
  const [apiCallCount, setApiCallCount] = useState<number>(0);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  
  // Modals
  const [soonModalPlatform, setSoonModalPlatform] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  
  // Ref for auto-scroll in chat
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user session ID and check status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('user_id');
    
    if (id) {
      localStorage.setItem('x_user_id', id);
      setUserId(id);
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      const storedId = localStorage.getItem('x_user_id');
      if (storedId) {
        setUserId(storedId);
      } else {
        const randomId = self.crypto?.randomUUID ? self.crypto.randomUUID() : 'usr_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('x_user_id', randomId);
        setUserId(randomId);
      }
    }

    const storedCount = localStorage.getItem('x_api_call_count');
    if (storedCount) {
      setApiCallCount(parseInt(storedCount, 10));
    }
  }, []);

  // Fetch connection status (does NOT call X API, only queries local Supabase DB)
  useEffect(() => {
    if (!userId) return;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/user?user_id=${userId}`);
        const data = await res.json();
        if (data.success) {
          setIsXConnected(data.connected);
          if (data.connected) {
            setCurrentUser(data.user);
          }
          if (data.globalApiCallCount !== undefined) {
            setGlobalApiCallCount(data.globalApiCallCount);
          }
        }
      } catch (err) {
        console.error("Erreur statut X initial :", err);
      }
    };

    checkStatus();
  }, [userId]);

  // Sync API count with localStorage
  const incrementApiCallCount = (amount: number = 1) => {
    setApiCallCount(prev => {
      const newCount = prev + amount;
      localStorage.setItem('x_api_call_count', newCount.toString());
      return newCount;
    });
  };

  // Cooldown countdown timer logic
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    
    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, selectedThreadId]);

  // --- ACTIONS ---

  // Fetch Twitter DMs & Profile
  const handleRefreshTwitter = async () => {
    if (cooldownSeconds > 0 || isFetching || !userId) return;

    setIsFetching(true);
    setConfigError(null);

    try {
      // 1. Fetch conversations
      const messagesRes = await fetch(`/api/messages?user_id=${userId}`);
      const messagesData = await messagesRes.json();

      if (messagesData.success) {
        setThreads(messagesData.threads || []);
        setNextToken(messagesData.nextToken || null);
        setIsXConnected(true);
        // Auto-select first thread if none is selected
        if (messagesData.threads && messagesData.threads.length > 0 && !selectedThreadId) {
          setSelectedThreadId(messagesData.threads[0].id);
        }
        if (messagesData.globalApiCallCount !== undefined) {
          setGlobalApiCallCount(messagesData.globalApiCallCount);
        }
      } else {
        if (messagesRes.status === 401) {
          setIsXConnected(false);
          setCurrentUser(null);
        }
        throw new Error(messagesData.error || "Erreur de récupération des messages");
      }

      // Set cooldown for 60 seconds
      setCooldownSeconds(60);
    } catch (err: any) {
      console.error(err);
      setConfigError(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsFetching(false);
    }
  };

  // Send Message confirmation triggers
  const handleSendClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;
    setShowConfirmModal(true);
  };

  // Confirm and perform send API call
  const handleConfirmSend = async () => {
    if (!selectedThreadId || !replyText.trim() || isSending || !userId) return;
    
    setIsSending(true);
    setShowConfirmModal(false);
    incrementApiCallCount(1); // 1 POST API call to send DM

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          threadId: selectedThreadId,
          text: replyText
        })
      });

      const data = await res.json();

      if (data.success && data.message) {
        // Update local thread messages list
        setThreads(prevThreads => 
          prevThreads.map(thread => {
            if (thread.id === selectedThreadId) {
              const updatedMessages = [...thread.messages, data.message];
              return {
                ...thread,
                messages: updatedMessages,
                lastMessage: data.message
              };
            }
            return thread;
          })
        );
        setReplyText('');
        if (data.globalApiCallCount !== undefined) {
          setGlobalApiCallCount(data.globalApiCallCount);
        }
      } else {
        alert(data.error || "Impossible d'envoyer le message.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Erreur de connexion lors de l'envoi.");
    } finally {
      setIsSending(false);
    }
  };

  // Charger les 5 messages suivants (Pagination)
  const handleLoadMore = async () => {
    if (cooldownSeconds > 0 || isFetching || !nextToken || !userId) return;

    setIsFetching(true);
    setConfigError(null);
    incrementApiCallCount(1); // 1 appel d'API GET messages avec token

    try {
      const res = await fetch(`/api/messages?user_id=${userId}&nextToken=${nextToken}`);
      const data = await res.json();

      if (data.success) {
        const incoming = data.threads || [];
        
        setThreads(prev => {
          const merged = mergeThreads(prev, incoming);
          
          // Si aucune conversation n'est sélectionnée, on prend la première
          if (merged.length > 0 && !selectedThreadId) {
            setSelectedThreadId(merged[0].id);
          }
          
          return merged;
        });
        
        setNextToken(data.nextToken || null);
        if (data.globalApiCallCount !== undefined) {
          setGlobalApiCallCount(data.globalApiCallCount);
        }
        setCooldownSeconds(60);
      } else {
        if (res.status === 401) {
          setIsXConnected(false);
          setCurrentUser(null);
        }
        throw new Error(data.error || "Erreur lors du chargement des messages supplémentaires");
      }
    } catch (err: any) {
      console.error(err);
      setConfigError(err.message || "Une erreur est survenue lors du chargement.");
    } finally {
      setIsFetching(false);
    }
  };

  // Find active thread object
  const activeThread = threads.find(t => t.id === selectedThreadId);

  // Helper: Find other participant profile (not current user)
  const getThreadPartner = (thread: Thread) => {
    if (!currentUser) return thread.participants[0] || { id: 'unknown', name: 'Utilisateur X' };
    const partner = thread.participants.find(p => p.username !== currentUser.username);
    return partner || thread.participants[0] || { id: 'unknown', name: 'Utilisateur X' };
  };

  // Helper: Formatter Date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-[#fafafa] font-sans selection:bg-[#27272a] selection:text-white antialiased overflow-hidden">
      
      {/* --- TOP FILTERS BAR --- */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e24] bg-[#09090b]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent tracking-tight">
            Antigravity Omni
          </span>
          <span className="px-2 py-0.5 text-xs font-semibold bg-zinc-800 text-zinc-400 rounded-full">
            MVP
          </span>
        </div>

        {/* Tab Filters */}
        <nav className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
          <button 
            onClick={() => setActivePlatform('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activePlatform === 'all' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Tous
          </button>
          
          <button 
            onClick={() => setActivePlatform('twitter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activePlatform === 'twitter' 
                ? 'bg-zinc-800 text-white shadow-sm' 
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TwitterIcon className="w-3.5 h-3.5 text-sky-400" />
            Twitter/X
          </button>

          {/* Disabled Platforms */}
          {[
            { id: 'instagram', label: 'Instagram', icon: <InstagramIcon className="w-3.5 h-3.5" /> },
            { id: 'messenger', label: 'Messenger', icon: <MessageCircle className="w-3.5 h-3.5" /> },
            { id: 'threads', label: 'Threads', icon: <Layers className="w-3.5 h-3.5" /> }
          ].map(platform => (
            <button
              key={platform.id}
              onClick={() => setSoonModalPlatform(platform.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-600 hover:text-zinc-400 transition-all cursor-pointer"
            >
              {platform.icon}
              <span>{platform.label}</span>
              <Lock className="w-2.5 h-2.5 opacity-60" />
            </button>
          ))}
        </nav>

        {/* API Budget Counter */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 bg-[#18181b] px-3.5 py-1.5 rounded-lg border ${
            globalApiCallCount >= 150 ? 'border-red-900/60 text-red-400' : 'border-[#27272a]'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              globalApiCallCount >= 150 ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'
            }`}></span>
            <span className="text-xs font-mono text-zinc-400">
              {globalApiCallCount >= 150 ? (
                <strong className="text-red-400 font-bold">Quota API atteint (150/150)</strong>
              ) : (
                <>
                  Appels API Globaux : <strong className="text-white font-bold">{globalApiCallCount} / 150</strong>
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      {/* --- MAIN INTERFACE (SIDEBAR + CHAT) --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR: CONVERSATION LIST */}
        <aside className="w-80 flex flex-col border-r border-[#1e1e24] bg-[#09090b] shrink-0">
          
          {/* Status Widget */}
          <div className="p-4 border-b border-[#1e1e24] bg-[#121214]/30">
            <XConnect 
              userId={userId}
              isConnected={isXConnected}
              username={currentUser?.username}
              isFetching={isFetching}
            />
          </div>

          {/* Action Trigger Button (BUDGET CONSTRAINED) */}
          <div className="p-4 border-b border-[#1e1e24]">
            <button
              onClick={handleRefreshTwitter}
              disabled={cooldownSeconds > 0 || isFetching || globalApiCallCount >= 150 || !isXConnected}
              className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                cooldownSeconds > 0 || globalApiCallCount >= 150 || !isXConnected
                  ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-white hover:bg-zinc-200 text-black shadow-lg font-bold cursor-pointer'
              }`}
            >
              {isFetching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement...
                </>
              ) : globalApiCallCount >= 150 ? (
                "Quota API atteint (Démo)"
              ) : !isXConnected ? (
                "Liez votre compte X d'abord"
              ) : cooldownSeconds > 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Rafraîchir ({cooldownSeconds}s)
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rafraîchir les messages X
                </>
              )}
            </button>
          </div>

          {/* Config Error Banner */}
          {configError && (
            <div className="m-3 p-3 bg-red-950/30 border border-red-900/60 rounded-lg flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-red-200 leading-normal font-sans">
                {configError}
              </div>
            </div>
          )}

          {/* Inbox Threads */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 flex items-center justify-between text-zinc-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Conversations</span>
              <span className="text-xs font-mono">({threads.length})</span>
            </div>

            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-zinc-500">
                <Inbox className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs leading-normal">
                  Aucun message chargé dans cette session.
                </p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  Cliquez sur "Rafraîchir" ci-dessus pour interroger les serveurs X.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#121214]">
                {threads.map(thread => {
                  const partner = getThreadPartner(thread);
                  const isSelected = thread.id === selectedThreadId;
                  
                  return (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full text-left p-4 flex gap-3 transition-colors ${
                        isSelected 
                          ? 'bg-[#18181b] border-l-2 border-white' 
                          : 'hover:bg-[#121214]/50'
                      }`}
                    >
                      {/* Avatar */}
                      {partner.avatarUrl ? (
                        <img 
                          src={partner.avatarUrl} 
                          alt={partner.name} 
                          className="w-10 h-10 rounded-full bg-zinc-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-zinc-400" />
                        </div>
                      )}

                      {/* Preview Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <h4 className="text-xs font-semibold text-zinc-200 truncate pr-1">
                            {partner.name || `Utilisateur ${partner.id}`}
                          </h4>
                          {thread.lastMessage && (
                            <span className="text-[9px] text-zinc-500 font-mono shrink-0">
                              {formatDate(thread.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-zinc-400 truncate leading-snug">
                          {thread.lastMessage ? thread.lastMessage.text : "Aucun message"}
                        </p>
                        
                        <div className="flex items-center gap-1.5 mt-2">
                          <TwitterIcon className="w-2.5 h-2.5 text-sky-400" />
                          <span className="text-[9px] text-zinc-500 font-mono">@{partner.username}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {threads.length > 0 && nextToken && (
              <div className="p-4 border-t border-[#1e1e24] bg-[#09090b]">
                <button
                  onClick={handleLoadMore}
                  disabled={cooldownSeconds > 0 || isFetching || globalApiCallCount >= 150}
                  className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    cooldownSeconds > 0 || globalApiCallCount >= 150
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white cursor-pointer'
                  }`}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Chargement...
                    </>
                  ) : globalApiCallCount >= 150 ? (
                    "Quota global atteint"
                  ) : cooldownSeconds > 0 ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Charger plus ({cooldownSeconds}s)
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5 text-white" />
                      Charger les 5 suivants
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* CENTRAL CHAT CONTAINER */}
        <main className="flex-1 flex flex-col bg-[#0d0d0f] relative">
          
          {activeThread ? (
            <>
              {/* Chat Window Header */}
              <div className="px-6 py-4 border-b border-[#1e1e24] flex items-center justify-between bg-[#0d0d0f]/90 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  {getThreadPartner(activeThread).avatarUrl ? (
                    <img 
                      src={getThreadPartner(activeThread).avatarUrl} 
                      alt={getThreadPartner(activeThread).name} 
                      className="w-8 h-8 rounded-full bg-zinc-800"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      {getThreadPartner(activeThread).name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      @{getThreadPartner(activeThread).username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/40 text-sky-400 border border-sky-900/60">
                    <TwitterIcon className="w-2.5 h-2.5" />
                    Twitter/X DM
                  </span>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeThread.messages.map((message) => {
                  const isMe = currentUser ? message.senderId === currentUser.username || message.senderUsername === currentUser.username : false;
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Sender name for group clarity, hidden in 1-1 if needed */}
                        {!isMe && (
                          <span className="text-[9px] text-zinc-500 mb-1 ml-2.5 font-medium">
                            {message.senderName}
                          </span>
                        )}
                        
                        {/* Bubble */}
                        <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMe 
                            ? 'bg-white text-black font-medium rounded-tr-sm' 
                            : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700/50'
                        }`}>
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[8px] text-zinc-500 mt-1 mx-2.5 font-mono">
                          {formatTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Area */}
              <div className="p-4 border-t border-[#1e1e24] bg-[#09090b]/80 backdrop-blur-md">
                <form onSubmit={handleSendClick} className="flex items-end gap-3 max-w-4xl mx-auto">
                  <div className="flex-1 relative bg-[#18181b] border border-[#27272a] focus-within:border-zinc-500 rounded-xl overflow-hidden transition-colors">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Répondre à ${getThreadPartner(activeThread).name}...`}
                      className="w-full bg-transparent border-0 px-4 py-3 text-xs text-white placeholder-zinc-500 focus:ring-0 focus:outline-none resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendClick(e);
                        }
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="p-3 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border-zinc-800 disabled:border rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
                <div className="text-[10px] text-center text-zinc-500 mt-2 font-mono">
                  Press Enter to send. API cost confirmation will be required.
                </div>
              </div>
            </>
          ) : (
            /* EMPTY DASHBOARD STATE */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_center,rgba(24,24,27,0.4),rgba(9,9,11,1))]">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-6 shadow-xl">
                <MessageSquare className="w-8 h-8 text-zinc-500" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2 tracking-tight">
                Messagerie SaaS Unifiée
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed mb-6">
                Connectez et centralisez vos conversations en temps réel. Seul l'onglet Twitter/X est opérationnel pour ce MVP.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleRefreshTwitter}
                  disabled={cooldownSeconds > 0 || isFetching}
                  className="px-4 py-2 bg-[#18181b] border border-[#27272a] hover:bg-zinc-800 disabled:opacity-50 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  {isFetching ? "Chargement..." : cooldownSeconds > 0 ? `Attendre ${cooldownSeconds}s` : "Interroger Twitter/X"}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* --- MODAL 1: PLATFORM COMING SOON --- */}
      {soonModalPlatform && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f11] border border-[#27272a] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-indigo-500"></div>
            
            <div className="w-12 h-12 bg-indigo-950/40 text-indigo-400 border border-indigo-900/60 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-bold text-white mb-2">
              Intégration {soonModalPlatform} bientôt disponible
            </h3>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Nous finalisons l'intégration de l'API de {soonModalPlatform}. Cette fonctionnalité sera disponible dans la prochaine mise à jour de la plateforme.
            </p>

            <button
              onClick={() => setSoonModalPlatform(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
            >
              D'accord
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SEND MESSAGE CONFIRMATION (BUDGET CONTROL) --- */}
      {showConfirmModal && activeThread && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f0f11] border border-[#27272a] rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-950/40 text-amber-500 border border-amber-900/60 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-2">
                  Confirmer l'envoi facturé ?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                  Chaque message envoyé effectue une requête d'écriture sur l'API X (Twitter) payante. Cet envoi vous sera comptabilisé.
                </p>

                {/* Preview of the message */}
                <div className="bg-zinc-950/70 p-3 rounded-lg border border-zinc-900/60 mb-6">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 block mb-1">Aperçu du message :</span>
                  <p className="text-xs text-zinc-300 font-mono leading-relaxed truncate-3-lines">
                    {replyText}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2 bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmSend}
                    className="flex-1 py-2 bg-white text-black font-bold text-xs rounded-lg hover:bg-zinc-200 transition-colors shadow-lg cursor-pointer"
                  >
                    Confirmer l'envoi
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper for formatting time (HH:MM)
function formatTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// Helper for merging threads in pagination
function mergeThreads(existing: Thread[], incoming: Thread[]): Thread[] {
  const mergedMap = new Map<string, Thread>();
  
  // Add existing threads
  for (const t of existing) {
    mergedMap.set(t.id, { ...t, messages: [...t.messages] });
  }
  
  // Merge incoming threads
  for (const inc of incoming) {
    if (mergedMap.has(inc.id)) {
      const existingThread = mergedMap.get(inc.id)!;
      
      // Merge messages and filter out duplicates by id
      const allMessages = [...existingThread.messages, ...inc.messages];
      const uniqueMessagesMap = new Map<string, Message>();
      for (const m of allMessages) {
        uniqueMessagesMap.set(m.id, m);
      }
      const uniqueMessages = Array.from(uniqueMessagesMap.values());
      // Sort messages chronologically
      uniqueMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      // Merge unique participants
      const participantMap = new Map<string, Participant>();
      for (const p of [...existingThread.participants, ...inc.participants]) {
        participantMap.set(p.id, p);
      }
      
      mergedMap.set(inc.id, {
        ...existingThread,
        participants: Array.from(participantMap.values()),
        messages: uniqueMessages,
        lastMessage: uniqueMessages[uniqueMessages.length - 1]
      });
    } else {
      mergedMap.set(inc.id, inc);
    }
  }
  
  // Convert back to array and sort by last message date descending
  const result = Array.from(mergedMap.values());
  result.sort((a, b) => {
    const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  
  return result;
}
