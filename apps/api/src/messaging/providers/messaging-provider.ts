import type { MessagingConnectionStatus, ProviderSendResult, ProviderSendTextPayload } from '../messaging.types';

export interface ProviderConnectionStatus {
  status: MessagingConnectionStatus;
  connected: boolean;
  smartphoneConnected: boolean | null;
  connectedPhone?: string | null;
  error?: string | null;
}

export interface ProviderQrCode {
  value: string;
}

export interface MessagingProviderClient<TCredentials> {
  getStatus(credentials: TCredentials): Promise<ProviderConnectionStatus>;
  getQrCode(credentials: TCredentials): Promise<ProviderQrCode>;
  disconnect(credentials: TCredentials): Promise<void>;
  sendText(credentials: TCredentials, payload: ProviderSendTextPayload): Promise<ProviderSendResult>;
  isNumberRegistered?(credentials: TCredentials, phone: string): Promise<boolean>;
  findChats?(credentials: TCredentials, page?: number, pageSize?: number): Promise<unknown>;
  findContacts?(credentials: TCredentials, page?: number, pageSize?: number): Promise<unknown>;
  findGroupInfo?(credentials: TCredentials, groupJid: string): Promise<unknown>;
}
