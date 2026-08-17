'use client';

import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  Pause,
  Play,
  Reply,
  Search,
  Send,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCurrentUser,
  deleteMessagingConversation,
  deleteMessagingMessage,
  getMessagingMessageMediaUrl,
  listMessagingConversations,
  listMessagingMessages,
  sendMessagingText,
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
  const [conversations, setConversations] = useState<MessagingConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessagingMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(() => {
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

  useEffect(() => {
    function refreshFromTopbar() {
      void handleRefresh();
    }

    window.addEventListener('clinic:refresh-conversations', refreshFromTopbar);

    return () => {
      window.removeEventListener('clinic:refresh-conversations', refreshFromTopbar);
    };
  }, [showToast]);

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
    const quotedMessage = replyToMessage;
    setDraft('');
    setReplyToMessage(null);
    setIsSending(true);

    try {
      const result = await sendMessagingText(selectedConversation.id, {
        message: messageText,
        replyToMessageId: quotedMessage?.externalMessageId,
      });
      setMessages((current) => [...current, result.message]);
      await loadConversations();
    } catch (error) {
      setDraft(messageText);
      setReplyToMessage(quotedMessage);
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a mensagem.';
      showToast({ message, tone: 'error' });
    } finally {
      setIsSending(false);
    }
  }

  async function handleDeleteConversation(conversation: MessagingConversation) {
    const confirmed = window.confirm('Excluir esta conversa e todas as mensagens?');

    if (!confirmed) {
      return;
    }

    try {
      await deleteMessagingConversation(conversation.id);
      setOpenConversationMenuId(null);
      setConversations((current) => current.filter((item) => item.id !== conversation.id));

      if (selectedId === conversation.id) {
        setSelectedId(null);
        setMessages([]);
      }

      showToast({ message: 'Conversa excluída.', tone: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a conversa.';
      showToast({ message, tone: 'error' });
    }
  }

  async function handleDeleteMessage(messageToDelete: MessagingMessage) {
    const confirmed = window.confirm('Excluir esta mensagem?');

    if (!confirmed) {
      return;
    }

    try {
      await deleteMessagingMessage(messageToDelete.id);
      setMessages((current) => current.filter((message) => message.id !== messageToDelete.id));
      setOpenMessageMenuId(null);

      if (replyToMessage?.id === messageToDelete.id) {
        setReplyToMessage(null);
      }

      await loadConversations();
      showToast({ message: 'Mensagem excluída.', tone: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a mensagem.';
      showToast({ message, tone: 'error' });
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
              <div className="attendanceConversationWrap" key={conversation.id}>
                <button
                  className={`attendanceConversation ${conversation.id === selectedId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setOpenConversationMenuId(null);
                  }}
                  type="button"
                >
                  <span className="avatar">{conversation.isGroup ? <UsersRound size={18} /> : initials(conversation)}</span>
                  <span className="attendanceConversationText">
                    <strong>{conversation.displayName ?? conversation.phone ?? conversation.waJid}</strong>
                    <small>{conversation.lastMessagePreview ?? 'Sem mensagens'}</small>
                  </span>
                  <span className={`mode mode${conversation.mode.toUpperCase()}`}>{modeLabel[conversation.mode]}</span>
                </button>
                <button
                  aria-expanded={openConversationMenuId === conversation.id}
                  aria-label="Ações da conversa"
                  className="conversationMenuTrigger"
                  onClick={() =>
                    setOpenConversationMenuId((current) => (current === conversation.id ? null : conversation.id))
                  }
                  type="button"
                >
                  <ChevronDown size={16} />
                </button>
                {openConversationMenuId === conversation.id ? (
                  <div className="conversationDropdown">
                    <button onClick={() => handleDeleteConversation(conversation)} type="button">
                      <Trash2 size={15} />
                      Excluir conversa
                    </button>
                  </div>
                ) : null}
              </div>
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
                      <button
                        aria-label="Ações da mensagem"
                        aria-expanded={openMessageMenuId === message.id}
                        className="messageMenuTrigger"
                        onClick={() => setOpenMessageMenuId((current) => (current === message.id ? null : message.id))}
                        type="button"
                      >
                        <ChevronDown size={16} />
                      </button>
                      {openMessageMenuId === message.id ? (
                        <div className="messageDropdown">
                          <button
                            onClick={() => {
                              setReplyToMessage(message);
                              setOpenMessageMenuId(null);
                            }}
                            type="button"
                          >
                            <Reply size={15} />
                            Responder
                          </button>
                          <button onClick={() => handleDeleteMessage(message)} type="button">
                            <Trash2 size={15} />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                      {message.replyToExternalMessageId ? (
                        <div className="quotedMessage">Respondendo {message.replyToExternalMessageId}</div>
                      ) : null}
                      <MessageMedia message={message} />
                      {message.body ? <p>{message.body}</p> : null}
                      {message.messageType !== 'audio' ? (
                        <div className="messageMetaRow">
                          <span>{formatMessageMeta(message)}</span>
                        </div>
                      ) : null}
                    </article>
                  ))
                )}
              </div>

              <form className="composer" onSubmit={handleSend}>
                <div className="composerInputStack">
                  {replyToMessage ? (
                    <div className="replyPreview">
                      <Reply size={14} />
                      <span>{replyPreviewText(replyToMessage)}</span>
                      <button aria-label="Cancelar resposta" onClick={() => setReplyToMessage(null)} type="button">
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                  <input
                    disabled={isSending}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Mensagem"
                    value={draft}
                  />
                </div>
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

function replyPreviewText(message: MessagingMessage): string {
  if (message.body) {
    return message.body;
  }

  switch (message.messageType) {
    case 'image':
      return 'Imagem';
    case 'audio':
      return 'Áudio';
    case 'video':
      return 'Vídeo';
    case 'document':
      return 'Documento';
    default:
      return 'Mensagem';
  }
}

function MessageMedia({ message }: { message: MessagingMessage }) {
  const hasLocalMedia = typeof message.media.localPath === 'string';
  const src = hasLocalMedia ? getMessagingMessageMediaUrl(message.id) : readMediaUrl(message.media);

  if (!src) {
    return null;
  }

  if (message.messageType === 'image') {
    return <img alt={message.body ?? 'Imagem recebida'} className="messageMediaImage" src={src} />;
  }

  if (message.messageType === 'audio') {
    return <AudioMessagePlayer message={message} src={src} />;
  }

  if (message.messageType === 'video') {
    return <video className="messageMediaVideo" controls src={src} />;
  }

  return (
    <a className="messageMediaDocument" href={src} rel="noreferrer" target="_blank">
      Abrir documento
    </a>
  );
}

function readMediaUrl(media: Record<string, unknown>): string | null {
  const url = media.url;

  return typeof url === 'string' && url.trim() ? url : null;
}

const audioRates = [1, 1.5, 2] as const;

function AudioMessagePlayer({ message, src }: { message: MessagingMessage; src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rateIndex, setRateIndex] = useState(0);

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function seek(event: MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextTime = ((event.clientX - rect.left) / rect.width) * duration;
    audio.currentTime = Math.max(0, Math.min(duration, nextTime));
  }

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const playbackRate = audioRates[rateIndex];

  function cyclePlaybackRate() {
    const nextIndex = (rateIndex + 1) % audioRates.length;
    const nextRate = audioRates[nextIndex];

    setRateIndex(nextIndex);

    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  return (
    <div className="audioPlayer">
      <audio
        ref={audioRef}
        src={src}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = playbackRate;
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />
      <button aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'} className="audioPlayButton" onClick={togglePlayback} type="button">
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button aria-label="Progresso do áudio" className="audioProgress" onClick={seek} type="button">
        <span style={{ width: `${progress}%` }} />
      </button>
      <button className="audioRateButton" onClick={cyclePlaybackRate} type="button">
        {formatPlaybackRate(playbackRate)}
      </button>
      <div className="audioMeta">
        <time>{formatAudioTime(currentTime || duration)}</time>
        <span>{message.status}</span>
      </div>
    </div>
  );
}

function formatPlaybackRate(rate: number): string {
  return `${String(rate).replace('.', ',')}x`;
}

function formatAudioTime(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
