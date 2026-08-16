export type MessagingChannel = 'whatsapp';
export type MessagingProvider = 'zapi';
export type MessagingConnectionStatus = 'not_configured' | 'disconnected' | 'qr_pending' | 'connected' | 'error';

export interface ZApiCredentials {
  instanceId: string;
  token: string;
  clientToken: string;
}

export interface MessagingConnectionView {
  id: string;
  name: string;
  channel: MessagingChannel;
  provider: MessagingProvider;
  status: MessagingConnectionStatus;
  externalInstanceId: string | null;
  connectedPhone: string | null;
  credentialsConfigured: boolean;
  lastError: string | null;
  lastStatusAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveZApiConnectionInput {
  name: string;
  instanceId: string;
  token?: string;
  clientToken?: string;
}
