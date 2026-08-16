'use client';

import {
  CheckCircle2,
  CircleAlert,
  KeyRound,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  Smartphone,
  Unplug,
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
  const [name, setName] = useState('WhatsApp principal');
  const [instanceId, setInstanceId] = useState('');
  const [token, setToken] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrimaryWhatsappConnection()
      .then((result) => {
        setConnection(result.connection);

        if (result.connection) {
          setName(result.connection.name);
          setInstanceId(result.connection.externalInstanceId ?? '');
        }
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const statusClassName = useMemo(() => `connectionBadge status${connection?.status ?? 'not_configured'}`, [connection]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    setQrCode(null);

    try {
      const result = await saveZApiConnection({ name, instanceId, token, clientToken });
      setConnection(result.connection);
      setToken('');
      setClientToken('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar as credenciais.');
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
    setIsLoadingQr(true);

    try {
      const result = await getMessagingConnectionQrCode(connection.id);
      setQrCode(result.qrCode);
      setConnection({ ...connection, status: 'qr_pending' });
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
          <h1>Conexão do WhatsApp</h1>
        </div>
        <a className="textButton" href="/">
          Voltar
        </a>
      </header>

      <section className="connectionLayout">
        <form className="panel connectionForm" onSubmit={handleSave}>
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Provider</span>
              <h2>Z-API</h2>
            </div>
            <KeyRound size={20} />
          </div>

          <label className="field">
            <span>Nome da conexão</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label className="field">
            <span>Instance ID</span>
            <input value={instanceId} onChange={(event) => setInstanceId(event.target.value)} required />
          </label>

          <label className="field">
            <span>Token da instância</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={connection?.credentialsConfigured ? 'Token já salvo' : ''}
              required={!connection?.credentialsConfigured}
              type="password"
            />
          </label>

          <label className="field">
            <span>Client-Token</span>
            <input
              value={clientToken}
              onChange={(event) => setClientToken(event.target.value)}
              placeholder={connection?.credentialsConfigured ? 'Client-Token já salvo' : ''}
              required={!connection?.credentialsConfigured}
              type="password"
            />
          </label>

          {error ? <div className="formError">{error}</div> : null}

          <button className="primaryButton" disabled={isSaving} type="submit">
            {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Salvar credenciais
          </button>
        </form>

        <section className="panel connectionPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Status</span>
              <h2>{connection ? connection.name : 'WhatsApp principal'}</h2>
            </div>
            <span className={statusClassName}>
              {connection?.status === 'connected' ? <CheckCircle2 size={16} /> : <Unplug size={16} />}
              {statusLabel[connection?.status ?? 'not_configured']}
            </span>
          </div>

          <div className="connectionFacts">
            <div>
              <MessageCircle size={18} />
              <span>Canal</span>
              <strong>WhatsApp</strong>
            </div>
            <div>
              <Smartphone size={18} />
              <span>Telefone</span>
              <strong>{connection?.connectedPhone ?? 'Não conectado'}</strong>
            </div>
            <div>
              <CircleAlert size={18} />
              <span>Último retorno</span>
              <strong>{connection?.lastError ?? 'Sem erro registrado'}</strong>
            </div>
          </div>

          <div className="connectionActions">
            <button className="textButton" disabled={!connection || isRefreshing} onClick={handleRefreshStatus} type="button">
              {isRefreshing ? <Loader2 className="spin" size={16} /> : <RefreshCw size={16} />}
              Atualizar status
            </button>
            <button className="textButton" disabled={!connection || isLoadingQr} onClick={handleLoadQrCode} type="button">
              {isLoadingQr ? <Loader2 className="spin" size={16} /> : <QrCode size={16} />}
              Gerar QR Code
            </button>
          </div>

          <div className="qrBox">
            {qrCode ?
              <img alt="QR Code para conectar WhatsApp" src={qrCode} />
            : <div>
                <QrCode size={44} />
                <span>QR Code ainda não gerado.</span>
              </div>
            }
          </div>
        </section>
      </section>
    </main>
  );
}
