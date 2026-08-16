'use client';

import {
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  MessageCircle,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  Unplug,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getMessagingConnectionQrCode,
  getPrimaryWhatsappConnection,
  refreshMessagingConnectionStatus,
  saveZApiConnection,
  type MessagingConnection,
} from '../../../lib/api';

const statusLabel: Record<string, string> = {
  not_configured: 'Não configurado',
  disconnected: 'Desconectado',
  qr_pending: 'Aguardando QR',
  connected: 'Conectado',
  error: 'Erro',
};

export default function ChannelsSettingsPage() {
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(null);
    setName(connection?.name ?? 'WhatsApp principal');
    setInstanceId(connection?.externalInstanceId ?? '');
    setToken('');
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    setQrCode(null);

    try {
      const result = await saveZApiConnection({ name, instanceId, token, clientToken: '' });
      setConnection(result.connection);
      setToken('');
      setIsModalOpen(false);
      setNotice('Conexão salva.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a conexão.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefreshStatus() {
    if (!connection) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsRefreshing(true);

    try {
      const result = await refreshMessagingConnectionStatus(connection.id);
      setConnection(result.connection);
      setNotice('Status atualizado.');
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Não foi possível atualizar o status.');
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleLoadQrCode() {
    if (!connection) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsLoadingQr(true);

    try {
      const result = await getMessagingConnectionQrCode(connection.id);
      setQrCode(result.qrCode);
      setConnection({ ...connection, status: 'qr_pending' });
      setNotice('QR Code gerado.');
    } catch (qrError) {
      setError(qrError instanceof Error ? qrError.message : 'Não foi possível carregar o QR Code.');
    } finally {
      setIsLoadingQr(false);
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

          {error ? <div className="formError">{error}</div> : null}
          {notice ? <div className="formNotice">{notice}</div> : null}

          <div className="connectionList">
            <article className="connectionRow">
              <div className="connectionIdentity">
                <span className="providerIcon">
                  <MessageCircle size={18} />
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
