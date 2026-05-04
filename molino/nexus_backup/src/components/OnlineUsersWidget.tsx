'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Users, X, Send, ChevronLeft, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { usePresence, type PresenceUser } from '@/hooks/usePresence';
import {
  useDirectMessages,
  useConversationMessages,
} from '@/hooks/useDirectMessages';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();
}

function timeLabel(date: Date | null): string {
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Ahora';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

// Truncar módulo para mostrar en la lista (e.g. "/daily-reports" → "REPORTES")
const PATH_LABELS: Record<string, string> = {
  '/': 'INICIO',
  '/daily-reports': 'REPORTES',
  '/equipos': 'EQUIPOS',
  '/fotos-campo': 'GALERÍA',
  '/quality-ncs': 'CALIDAD',
  '/planos': 'PLANOS',
  '/chat': 'CHAT IA',
  '/pdt-schedule': 'PDT',
  '/bitacora': 'BITÁCORA',
  '/settings': 'AJUSTES',
};

function pathLabel(path: string): string {
  return PATH_LABELS[path] ?? path.replace('/', '').toUpperCase().slice(0, 12);
}

// ─── Sub-vistas ───────────────────────────────────────────────────────────────

interface UserListViewProps {
  onlineUsers: PresenceUser[];
  conversations: ReturnType<typeof useDirectMessages>['conversations'];
  onSelectUser: (user: PresenceUser) => void;
  onClose: () => void;
}

function UserListView({ onlineUsers, conversations, onSelectUser, onClose }: UserListViewProps) {
  const unreadByUser: Record<string, number> = {};
  conversations.forEach(c => {
    unreadByUser[c.otherUser.uid] = (unreadByUser[c.otherUser.uid] ?? 0) + c.unreadCount;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15">
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-green-400 animate-pulse" />
          <span className="text-[10px] font-mono-tech text-primary/80 uppercase tracking-widest">
            Usuarios en línea
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {onlineUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <WifiOff className="w-8 h-8 text-primary/20" />
            <p className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest">
              Sin otros usuarios en línea
            </p>
          </div>
        ) : (
          onlineUsers.map(u => {
            const unread = unreadByUser[u.uid] ?? 0;
            return (
              <button
                key={u.uid}
                onClick={() => onSelectUser(u)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/5 transition-colors border-b border-primary/5 group"
              >
                {/* Avatar + indicador verde */}
                <div className="relative flex-shrink-0">
                  <Avatar className="w-9 h-9 border border-primary/20">
                    <AvatarImage src={u.photoURL ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-mono-tech">
                      {initials(u.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#020617]" />
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[10px] font-mono-tech text-primary/90 truncate leading-tight">
                    {u.profesionalName}
                  </p>
                  <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                    {pathLabel(u.currentPath)}
                  </p>
                </div>

                {/* Badge mensajes no leídos + ícono mensaje */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-cyan-500 text-[8px] font-bold text-black flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                  <MessageSquare className="w-3.5 h-3.5 text-primary/30 group-hover:text-primary/70 transition-colors" />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-primary/10">
        <p className="text-[8px] font-mono text-muted-foreground/50 uppercase tracking-widest text-center">
          {onlineUsers.length} {onlineUsers.length === 1 ? 'usuario' : 'usuarios'} conectado{onlineUsers.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}

// ─── Vista de Chat ─────────────────────────────────────────────────────────────

interface ChatViewProps {
  conversationId: string | null;
  otherUser: PresenceUser | null;
  currentUid: string;
  onSend: (content: string) => void;
  onBack: () => void;
  onClose: () => void;
}

function ChatView({ conversationId, otherUser, currentUid, onSend, onBack, onClose }: ChatViewProps) {
  const messages = useConversationMessages(conversationId);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-primary/15">
        <button onClick={onBack} className="text-muted-foreground hover:text-primary transition-colors p-1">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="relative flex-shrink-0">
          <Avatar className="w-7 h-7 border border-primary/20">
            <AvatarImage src={otherUser?.photoURL ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-mono-tech">
              {initials(otherUser?.displayName ?? '?')}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#020617]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono-tech text-primary/90 truncate leading-tight">
            {otherUser?.profesionalName ?? 'Usuario'}
          </p>
          <p className="text-[7px] font-mono text-green-400/70 uppercase tracking-widest">
            En línea · {pathLabel(otherUser?.currentPath ?? '/')}
          </p>
        </div>

        <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest text-center">
              Inicio de conversación
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.senderId === currentUid;
          return (
            <div key={msg.id} className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'max-w-[80%] px-3 py-2 rounded-sm text-[10px] font-mono leading-relaxed',
                  isOwn
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/5 text-foreground border border-white/10',
                )}
              >
                {msg.content}
              </div>
              <span className="text-[7px] font-mono text-muted-foreground/40 mt-0.5 px-1">
                {timeLabel(msg.timestamp)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-primary/10 flex gap-2">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escriba un mensaje..."
          className="flex-1 h-9 bg-primary/5 border-primary/20 rounded-none font-mono text-[10px] placeholder:text-muted-foreground/40"
          autoFocus
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!text.trim()}
          className="h-9 w-9 rounded-none bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary flex-shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Componente raíz ──────────────────────────────────────────────────────────

function OnlineUsersWidgetInner() {
  const pathname = usePathname();
  const { user } = useUser();

  const [panelOpen, setPanelOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<PresenceUser | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { onlineUsers } = usePresence(pathname);
  const { conversations, totalUnread, getOrCreateConversation, sendMessage, markAsRead } =
    useDirectMessages();

  useEffect(() => { setMounted(true); }, []);

  const handleSelectUser = useCallback(async (other: PresenceUser) => {
    const convId = await getOrCreateConversation(other);
    if (!convId) return;
    setActiveUser(other);
    setActiveConvId(convId);
    await markAsRead(convId);
  }, [getOrCreateConversation, markAsRead]);

  const handleSend = useCallback(async (content: string) => {
    if (!activeConvId || !activeUser) return;
    await sendMessage(activeConvId, content, activeUser.uid);
  }, [activeConvId, activeUser, sendMessage]);

  const handleBack = () => {
    setActiveUser(null);
    setActiveConvId(null);
  };

  const handleClose = () => {
    setPanelOpen(false);
    setActiveUser(null);
    setActiveConvId(null);
  };

  const handleOpenPanel = async () => {
    setPanelOpen(true);
    // Si ya hay una conversación activa, marcar como leída
    if (activeConvId) await markAsRead(activeConvId);
  };

  if (!mounted || !user || user.isAnonymous) return null;

  const showChat = panelOpen && activeUser !== null;
  const showUsers = panelOpen && activeUser === null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2">
      {/* Panel flotante */}
      {panelOpen && (
        <div
          className={cn(
            'w-80 bg-[#020617]/95 backdrop-blur-xl border border-primary/20',
            'shadow-[0_0_40px_rgba(0,229,255,0.12)] rounded-sm',
            'animate-in slide-in-from-bottom-4 fade-in duration-200',
            showChat ? 'h-[420px]' : 'h-auto max-h-[480px]',
          )}
        >
          {showUsers && (
            <UserListView
              onlineUsers={onlineUsers}
              conversations={conversations}
              onSelectUser={handleSelectUser}
              onClose={handleClose}
            />
          )}
          {showChat && (
            <ChatView
              conversationId={activeConvId}
              otherUser={activeUser}
              currentUid={user.uid}
              onSend={handleSend}
              onBack={handleBack}
              onClose={handleClose}
            />
          )}
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={panelOpen ? handleClose : handleOpenPanel}
        className={cn(
          'relative w-12 h-12 rounded-sm border flex items-center justify-center',
          'transition-all duration-200',
          panelOpen
            ? 'bg-primary/20 border-primary/50 text-primary shadow-[0_0_20px_rgba(0,229,255,0.3)]'
            : 'bg-[#020617]/90 border-primary/20 text-primary/60 hover:border-primary/40 hover:text-primary hover:shadow-[0_0_15px_rgba(0,229,255,0.2)]',
        )}
        title="Usuarios en línea"
      >
        <Users className="w-5 h-5" />

        {/* Badge: usuarios en línea */}
        {onlineUsers.length > 0 && (
          <span className={cn(
            'absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] rounded-full',
            'bg-green-500 text-black text-[8px] font-bold flex items-center justify-center px-1',
            'border border-[#020617]',
          )}>
            {onlineUsers.length > 9 ? '9+' : onlineUsers.length}
          </span>
        )}

        {/* Badge: mensajes no leídos */}
        {totalUnread > 0 && (
          <span className={cn(
            'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full',
            'bg-cyan-500 text-black text-[8px] font-bold flex items-center justify-center px-1',
            'border border-[#020617] animate-pulse',
          )}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>
    </div>
  );
}

// Wrapper que solo monta el widget cuando Firebase está disponible
export function OnlineUsersWidget() {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  // No mostrar en la página de auth ni mientras carga
  if (isUserLoading || !user || user.isAnonymous || pathname === '/auth') return null;

  return <OnlineUsersWidgetInner />;
}
