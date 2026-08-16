'use client';

import { Bot, Loader2, MessageCircle, RefreshCw, Search, Send, UserRound, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  listMessagingConversations,
  listMessagingMessages,
  sendMessagingText,
  type AuthenticatedUser,
  type MessagingConversation,
  type MessagingMessage,
} from '../../lib/api';
import { useToast } from '../ToastProvider';

const modeLabel = {
  ai: 'IA',
  human: 'Humano',
  paused: 'Pausado',
};

export default function ConversationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((result) => {
        setUser(result.user);
        return loadConversations();
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    listMessagingMessages(selectedId)
      .then((result) => {
        setMessages(result.messages);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar mensagens.';
        showToast({ message, tone: 'error' });
      })
      .finally(() => {
        setIsLoadingMessages(false);
      });
  }, [selectedId, showToast]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const label = conversation.displayName ?? conversation.phone ?? conversation.waJid;

      return label.toLowerCase().includes(term) || (conversation.lastMessagePreview ?? '').toLowerCase().includes(term);
    });
  }, [conversations, search]);

  async function loadConversations() {
    const result = await listMessagingConversations();
    setConversations(result.conversations);
    setSelectedId((current) => current ?? result.conversations[0]?.id ?? null);
  }

  async function handleRefresh() {
    try {
      await loadConversations();
      showToast({ message: 'Conversas atualizadas.', tone: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar conversas.';
      showToast({ message, tone: 'error' });
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversation || !draft.trim()) {
      return;
    }

    const messageText = draft.trim();
    setDraft('');
    setIsSending(true);

    try {
      const result = await sendMessagingText(selectedConversation.id, { message: messageText });
      setMessages((current) => [...current, result.message]);
      await loadConversations();
    } catch (error) {
      setDraft(messageText);
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.';
      showToast({ message, tone: 'error' });
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return (
      <main className="loadingShell">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="attendanceShell">
      <header className="settingsHeader attendanceHeader">
        <div>
          <span className="eyebrow">Atendimento</span>
          <h1>{user?.organizationName ?? user?.tenantName ?? 'Conversas'}</h1>
        </div>
        <button className="textButton" onClick={handleRefresh} type="button">
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      <section className="attendanceLayout">
        <aside className="attendanceSidebar panel">
          <div className="attendanceSearch">
            <Search size={17} />
            <input
              aria-label="Buscar conversa"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversa"
              value={search}
            />
          </div>

          <div className="attendanceList">
            {filteredConversations.map((conversation) => (
              <button
                className={`attendanceConversation ${conversation.id === selectedId ? 'active' : ''}`}
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                type="button"
              >
                <span className="avatar">{conversation.isGroup ? <UsersRound size={18} /> : initials(conversation)}</span>
                <span className="attendanceConversationText">
                  <strong>{conversation.displayName ?? conversation.phone ?? conversation.waJid}</strong>
                  <small>{conversation.lastMessagePreview ?? 'Sem mensagens'}</small>
                </span>
                <span className={`mode mode${conversation.mode.toUpperCase()}`}>{modeLabel[conversation.mode]}</span>
              </button>
            ))}

            {filteredConversations.length === 0 ? (
              <div className="emptyState">
                <MessageCircle size={22} />
                <strong>Nenhuma conversa</strong>
                <span>As mensagens recebidas pelos webhooks aparecem aqui.</span>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="attendanceThread panel">
          {selectedConversation ? (
            <>
              <header className="threadHeader">
                <div className="threadIdentity">
                  <span className="avatar">{selectedConversation.isGroup ? <UsersRound size={18} /> : initials(selectedConversation)}</span>
                  <div>
                    <strong>{selectedConversation.displayName ?? selectedConversation.phone ?? selectedConversation.waJid}</strong>
                    <span>{selectedConversation.provider.toUpperCase()} · {selectedConversation.isGroup ? 'Grupo' : 'Contato'}</span>
                  </div>
                </div>
                <span className={`mode mode${selectedConversation.mode.toUpperCase()}`}>
                  {selectedConversation.mode === 'ai' ? <Bot size={13} /> : <UserRound size={13} />}
                  {modeLabel[selectedConversation.mode]}
                </span>
              </header>

              <div className="messageList">
                {isLoadingMessages ? (
                  <div className="messageLoading">
                    <Loader2 className="spin" size={22} />
                  </div>
                ) : (
                  messages.map((message) => (
                    <article className={`messageBubble ${message.direction === 'out' ? 'out' : 'in'}`} key={message.id}>
                      <p>{message.body || mediaLabel(message.messageType)}</p>
                      <span>{formatMessageMeta(message)}</span>
                    </article>
                  ))
                )}
              </div>

              <form className="composer" onSubmit={handleSend}>
                <input
                  disabled={isSending}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Mensagem"
                  value={draft}
                />
                <button className="primaryButton compactButton" disabled={isSending || !draft.trim()} type="submit">
                  {isSending ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
                  Enviar
                </button>
              </form>
            </>
          ) : (
            <div className="emptyThread">
              <MessageCircle size={26} />
              <strong>Selecione uma conversa</strong>
              <span>Quando um webhook criar atendimentos, o histórico será exibido nesta área.</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function initials(conversation: MessagingConversation): string {
  const label = conversation.displayName ?? conversation.phone ?? conversation.waJid;
  const letters = label
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  return letters.toUpperCase();
}

function formatMessageMeta(message: MessagingMessage): string {
  const createdAt = new Date(message.createdAt);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(createdAt);

  return `${time} · ${message.status}`;
}

function mediaLabel(type: MessagingMessage['messageType']): string {
  return type === 'text' ? '' : `[${type}]`;
}
