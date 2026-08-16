import type { MessagingConnectionStatus } from '../messaging.types';

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
}

