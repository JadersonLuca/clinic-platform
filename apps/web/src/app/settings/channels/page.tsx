'use client';

import {
  CheckCircle2,
  Clock3,
  CircleAlert,
  Copy,
  KeyRound,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  Smartphone,
  Unplug,
  Wifi,
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
  const [notice, setNotice] = useState<string | null>(null);

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
  const qrImageSrc = useMemo(() => {
    if (!qrCode) {
      return null;
    }

    return qrCode.startsWith('data:image') ? qrCode : `data:image/png;base64,${qrCode}`;
  }, [qrCode]);
  const webhookPath = connection ? `/webhooks/zapi/connections/${connection.id}/connection` : null;
  const lastStatusAt =
    connection?.lastStatusAt ?
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(connection.lastStatusAt))
    : 'Sem atualização';

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);
    setQrCode(null);

    try {
      const result = await saveZApiConnection({ name, instanceId, token, clientToken });
      setConnection(result.connection);
      setToken('');
      setClientToken('');
      setNotice('Credenciais salvas.');
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

  async function handleCopyWebhook() {
    if (!webhookPath) {
      return;
    }

    setNotice(null);
    setError(null);
    try {
      await navigator.clipboard.writeText(webhookPath);
      setNotice('Endpoint copiado.');
    } catch {
      setError('Não foi possível copiar o endpoint.');
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

          <div className="providerStrip">
            <span className="providerIcon">
              <MessageCircle size={18} />
            </span>
            <div>
              <strong>WhatsApp via Z-API</strong>
              <span>{connection?.credentialsConfigured ? 'Credenciais configuradas' : 'Credenciais pendentes'}</span>
            </div>
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
            <span>Client-Token opcional</span>
            <input
              value={clientToken}
              onChange={(event) => setClientToken(event.target.value)}
              placeholder={connection?.credentialsConfigured ? 'Deixe vazio para remover' : ''}
              type="password"
            />
            <small className="fieldHint">Deixe vazio se sua Z-API usa apenas Instance ID e Token.</small>
          </label>

          {error ? <div className="formError">{error}</div> : null}
          {notice ? <div className="formNotice">{notice}</div> : null}

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
              <ShieldCheck size={18} />
              <span>Credenciais</span>
              <strong>{connection?.credentialsConfigured ? 'Salvas' : 'Pendentes'}</strong>
            </div>
            <div>
              <Wifi size={18} />
              <span>Instância</span>
              <strong>{connection ? statusLabel[connection.status] : 'Não configurada'}</strong>
            </div>
            <div>
              <Smartphone size={18} />
              <span>Telefone</span>
              <strong>{connection?.connectedPhone ?? 'Não conectado'}</strong>
            </div>
          </div>

          <div className="connectionMetaGrid">
            <div>
              <Clock3 size={17} />
              <span>Atualizado</span>
              <strong>{lastStatusAt}</strong>
            </div>
            <div>
              <CircleAlert size={17} />
              <span>Último erro</span>
              <strong>{connection?.lastError ?? 'Nenhum'}</strong>
            </div>
          </div>

          <div className="webhookBox">
            <div>
              <ServerCog size={18} />
              <span>
                <small>Webhook status</small>
                <strong>{webhookPath ?? 'Disponível após salvar'}</strong>
              </span>
            </div>
            <button
              aria-label="Copiar endpoint do webhook"
              className="iconButton"
              disabled={!webhookPath}
              onClick={handleCopyWebhook}
              type="button"
            >
              <Copy size={17} />
            </button>
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
            {qrImageSrc ?
              <img alt="QR Code para conectar WhatsApp" src={qrImageSrc} />
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
