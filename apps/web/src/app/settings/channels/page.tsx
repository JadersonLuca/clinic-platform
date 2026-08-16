'use client';

import {
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  MessageCircle,
  Power,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  Trash2,
  Unplug,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  deleteMessagingConnection,
  disconnectMessagingConnection,
  getMessagingConnectionQrCode,
  getPrimaryWhatsappConnection,
  refreshMessagingConnectionStatus,
  saveZApiConnection,
  type MessagingConnection,
} from '../../../lib/api';
import { useToast } from '../../ToastProvider';

const statusLabel: Record<string, string> = {
  not_configured: 'Não configurado',
  disconnected: 'Desconectado',
  qr_pending: 'Aguardando QR',
  connected: 'Conectado',
  error: 'Erro',
};

export default function ChannelsSettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [connection, setConnection] = useState<MessagingConnection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('WhatsApp principal');
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrimaryWhatsappConnection()
      .then((result) => {
        setConnection(result.connection);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const statusClassName = `connectionBadge status${connection?.status ?? 'not_configured'}`;
  const qrImageSrc = useMemo(() => {
    if (!qrCode) {
      return null;
    }

    return qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`;
  }, [qrCode]);
  const lastStatusAt =
    connection?.lastStatusAt ?
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(connection.lastStatusAt))
    : 'Sem atualização';

  function openConnectionModal() {
    setError(null);
    setName(connection?.name ?? 'WhatsApp principal');
    setInstanceId(connection?.externalInstanceId ?? '');
    setToken('');
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    setQrCode(null);

    try {
      const result = await saveZApiConnection({ name, instanceId, token, clientToken: '' });
      setConnection(result.connection);
      setToken('');
      setIsModalOpen(false);
      showToast({ message: 'Conexão salva.', tone: 'success' });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Não foi possível salvar a conexão.';
      setError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefreshStatus() {
    if (!connection) {
      return;
    }

    setError(null);
    setIsRefreshing(true);

    try {
      const result = await refreshMessagingConnectionStatus(connection.id);
      setConnection(result.connection);
      showToast({ message: 'Status atualizado.', tone: result.connection.status === 'error' ? 'warning' : 'success' });
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Não foi possível atualizar o status.';
      setError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLoadQrCode() {
    if (!connection) {
      return;
    }

    if (connection.status === 'connected') {
      showToast({ message: 'WhatsApp já está conectado. Não é necessário gerar QR Code.', tone: 'warning' });
      return;
    }

    setError(null);
    setIsLoadingQr(true);

    try {
      const result = await getMessagingConnectionQrCode(connection.id);
      setQrCode(result.qrCode);
      setConnection({ ...connection, status: 'qr_pending' });
      showToast({ message: 'QR Code gerado.', tone: 'success' });
    } catch (qrError) {
      const message = qrError instanceof Error ? qrError.message : 'Não foi possível carregar o QR Code.';
      setError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setIsLoadingQr(false);
    }
  }

  async function handleDisconnect() {
    if (!connection) {
      return;
    }

    setError(null);
    setIsDisconnecting(true);
    setQrCode(null);

    try {
      const result = await disconnectMessagingConnection(connection.id);
      setConnection(result.connection);
      showToast({
        message:
          result.connection.status === 'error' ?
            'Não foi possível desconectar o WhatsApp.'
          : 'WhatsApp desconectado.',
        tone: result.connection.status === 'error' ? 'error' : 'success',
      });
    } catch (disconnectError) {
      const message = disconnectError instanceof Error ? disconnectError.message : 'Não foi possível desconectar.';
      setError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleDelete() {
    if (!connection) {
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      await deleteMessagingConnection(connection.id);
      setConnection(null);
      setQrCode(null);
      setName('WhatsApp principal');
      setInstanceId('');
      setToken('');
      setIsModalOpen(false);
      showToast({ message: 'Conexão excluída.', tone: 'success' });
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a conexão.';
      setError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setIsDeleting(false);
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
    <main className="settingsShell">
      <header className="settingsHeader">
        <div>
          <span className="eyebrow">Canais</span>
          <h1>Conexões de atendimento</h1>
        </div>
        <button className="primaryButton compactButton" disabled={Boolean(connection)} onClick={openConnectionModal} type="button">
          <Plus size={17} />
          Nova conexão
        </button>
      </header>

      <section className="teamLayout singleColumn">
        <section className="panel connectionPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Conexões</span>
              <h2>Canais ativos</h2>
            </div>
            <MessageCircle size={20} />
          </div>

          <div className="connectionList">
            <article className="connectionRow">
              <div className="connectionIdentity">
                <span className="providerIcon">
                  <WhatsAppIcon />
                </span>
                <div>
                  <strong>WhatsApp</strong>
                  <span>{connection?.name ?? 'Nenhuma conexão cadastrada'}</span>
                </div>
              </div>

              <span className={statusClassName}>
                {connection?.status === 'connected' ? <CheckCircle2 size={16} /> : <Unplug size={16} />}
                {statusLabel[connection?.status ?? 'not_configured']}
              </span>

              <div className="connectionCell">
                <Smartphone size={16} />
                <span>{connection?.connectedPhone ?? 'Sem telefone'}</span>
              </div>

              <div className="connectionCell">
                <Clock3 size={16} />
                <span>{lastStatusAt}</span>
              </div>

              <div className="connectionRowActions">
                {connection ?
                  <>
                    <button
                      className="iconButton"
                      disabled={isRefreshing}
                      onClick={handleRefreshStatus}
                      title="Atualizar status"
                      type="button"
                    >
                      {isRefreshing ? <Loader2 className="spin" size={17} /> : <RefreshCw size={17} />}
                    </button>
                    <button
                      className="iconButton"
                      disabled={isLoadingQr}
                      onClick={handleLoadQrCode}
                      title="Gerar QR Code"
                      type="button"
                    >
                      {isLoadingQr ? <Loader2 className="spin" size={17} /> : <QrCode size={17} />}
                    </button>
                    <button className="textButton" onClick={openConnectionModal} type="button">
                      <Edit3 size={16} />
                      Editar
                    </button>
                    <button
                      className="textButton dangerTextButton"
                      disabled={connection.status !== 'connected' || isDisconnecting}
                      onClick={handleDisconnect}
                      type="button"
                    >
                      {isDisconnecting ? <Loader2 className="spin" size={16} /> : <Power size={16} />}
                      Desconectar
                    </button>
                  </>
                : <button className="textButton" onClick={openConnectionModal} type="button">
                    <Plus size={16} />
                    Cadastrar
                  </button>
                }
              </div>
            </article>
          </div>

          {connection?.lastError ?
            <div className="formError">
              <strong>Último erro:</strong> {connection.lastError}
            </div>
          : null}

          {qrImageSrc ?
            <div className="qrBox compactQrBox">
              <img alt="QR Code para conectar WhatsApp" src={qrImageSrc} />
            </div>
          : null}
        </section>
      </section>

      {isModalOpen ?
        <div className="modalOverlay" role="presentation">
          <form className="formModal" onSubmit={handleSave}>
            <div className="modalHeader">
              <div>
                <span className="eyebrow">WhatsApp</span>
                <h2>{connection ? 'Editar conexão' : 'Cadastrar conexão'}</h2>
              </div>
              <button
                aria-label="Fechar"
                className="iconButton"
                onClick={() => setIsModalOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            <label className="field">
              <span>Nome da conexão</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>

            <label className="field">
              <span>ID da instância</span>
              <input value={instanceId} onChange={(event) => setInstanceId(event.target.value)} required />
            </label>

            <label className="field">
              <span>Token da API</span>
              <input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={connection?.credentialsConfigured ? 'Token já salvo' : ''}
                required={!connection?.credentialsConfigured}
                type="password"
              />
            </label>

            {error ? <div className="formError">{error}</div> : null}

            {connection ?
              <button className="dangerButton resetButton" disabled={isDeleting} onClick={handleDelete} type="button">
                {isDeleting ? <Loader2 className="spin" size={17} /> : <Trash2 size={17} />}
                Excluir conexão
              </button>
            : null}

            <div className="modalActions">
              <button className="textButton" onClick={() => setIsModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="primaryButton compactButton" disabled={isSaving} type="submit">
                {isSaving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      : null}
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32">
      <path
        d="M16.04 4.4A11.48 11.48 0 0 0 6.2 21.8L4.8 27l5.32-1.4a11.45 11.45 0 0 0 5.92 1.64h.01A11.42 11.42 0 0 0 27.5 15.83 11.48 11.48 0 0 0 16.04 4.4Zm0 20.9h-.01a9.5 9.5 0 0 1-4.84-1.33l-.35-.2-3.16.83.84-3.08-.22-.36a9.53 9.53 0 1 1 7.74 4.14Zm5.22-7.12c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42a8.7 8.7 0 0 1-1.6-1.99c-.17-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.16.19-.28.29-.47.1-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.43 1.03 2.8 1.17 3 .14.2 2.03 3.1 4.92 4.35.69.3 1.22.48 1.64.61.69.22 1.31.19 1.8.12.55-.08 1.7-.7 1.94-1.37.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33Z"
        fill="currentColor"
      />
    </svg>
  );
}
