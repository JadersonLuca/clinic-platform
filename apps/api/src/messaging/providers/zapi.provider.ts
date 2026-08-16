import { BadGatewayException, Injectable } from '@nestjs/common';
import type { MessagingProviderClient, ProviderConnectionStatus, ProviderQrCode } from './messaging-provider';
import type { ZApiCredentials } from '../messaging.types';

interface ZApiStatusResponse {
  connected?: boolean;
  smartphoneConnected?: boolean;
  error?: string;
}

interface ZApiQrCodeResponse {
  value?: string;
}

@Injectable()
export class ZApiProvider implements MessagingProviderClient<ZApiCredentials> {
  private readonly baseUrl = process.env.ZAPI_BASE_URL ?? 'https://api.z-api.io';

  async getStatus(credentials: ZApiCredentials): Promise<ProviderConnectionStatus> {
    const body = await this.request<ZApiStatusResponse>(credentials, 'status');
    const connected = body.connected === true;

    return {
      status: connected ? 'connected' : 'disconnected',
      connected,
      smartphoneConnected: typeof body.smartphoneConnected === 'boolean' ? body.smartphoneConnected : null,
      error: body.error ?? null,
    };
  }

  async getQrCode(credentials: ZApiCredentials): Promise<ProviderQrCode> {
    const body = await this.request<ZApiQrCodeResponse>(credentials, 'qr-code');

    if (!body.value) {
      throw new BadGatewayException('Z-API did not return a QR code');
    }

    return {
      value: body.value,
    };
  }

  private async request<T>(credentials: ZApiCredentials, path: string): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.clientToken) {
      headers['Client-Token'] = credentials.clientToken;
    }

    const response = await fetch(this.buildUrl(credentials, path), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new BadGatewayException(`Z-API status ${response.status}: ${await readProviderError(response)}`);
    }

    return response.json() as Promise<T>;
  }

  private buildUrl(credentials: ZApiCredentials, path: string): string {
    const instanceId = encodeURIComponent(credentials.instanceId);
    const token = encodeURIComponent(credentials.token);

    return `${this.baseUrl.replace(/\/$/, '')}/instances/${instanceId}/token/${token}/${path}`;
  }
}

async function readProviderError(response: Response): Promise<string> {
  const fallback = response.statusText || 'request failed';

  try {
    const text = await response.text();

    if (!text.trim()) {
      return fallback;
    }

    try {
      const body = JSON.parse(text) as Record<string, unknown>;
      const message = readString(body.message) ?? readString(body.error) ?? readString(body.value);

      return message ?? text.slice(0, 300);
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    return fallback;
  }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
