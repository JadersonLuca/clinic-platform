import { BadGatewayException, Injectable } from '@nestjs/common';
import type { MessagingProviderClient, ProviderConnectionStatus, ProviderQrCode } from './messaging-provider';
import type { ProviderSendResult, ProviderSendTextPayload, ZApiCredentials } from '../messaging.types';

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
    const { body } = await this.request<ZApiStatusResponse>(credentials, 'status');
    const connected = body.connected === true;

    return {
      status: connected ? 'connected' : 'disconnected',
      connected,
      smartphoneConnected: typeof body.smartphoneConnected === 'boolean' ? body.smartphoneConnected : null,
      error: body.error ?? null,
    };
  }

  async getQrCode(credentials: ZApiCredentials): Promise<ProviderQrCode> {
    const { body } = await this.request<ZApiQrCodeResponse>(credentials, 'qr-code/image');

    if (!body.value) {
      throw new BadGatewayException('Z-API did not return a QR code');
    }

    return {
      value: body.value,
    };
  }

  async disconnect(credentials: ZApiCredentials): Promise<void> {
    await this.request<{ value?: boolean }>(credentials, 'disconnect');
  }

  async sendText(credentials: ZApiCredentials, payload: ProviderSendTextPayload): Promise<ProviderSendResult> {
    const requestBody: Record<string, unknown> = {
      phone: payload.remoteJid ?? payload.number,
      message: payload.text,
    };

    if (payload.messageId) {
      requestBody.messageId = payload.messageId;
    }

    if (payload.quoted) {
      requestBody.quoted = payload.quoted;
    }

    const { body, httpCode } = await this.request<Record<string, unknown>>(credentials, 'send-text', {
      method: 'POST',
      body: requestBody,
    });

    return {
      provider: 'zapi',
      externalMessageId: extractExternalMessageId(body),
      response: body,
      httpCode,
    };
  }

  async isNumberRegistered(credentials: ZApiCredentials, phone: string): Promise<boolean> {
    const { body } = await this.request<Record<string, unknown>>(credentials, `phone-exists/${onlyDigits(phone)}`);

    return body.exists === true || body.exist === true || body.value === true;
  }

  async findChats(credentials: ZApiCredentials, page = 1, pageSize = 50): Promise<unknown> {
    const { body } = await this.request<unknown>(credentials, `chats?page=${page}&pageSize=${pageSize}`);

    return body;
  }

  async findContacts(credentials: ZApiCredentials, page = 1, pageSize = 50): Promise<unknown> {
    const { body } = await this.request<unknown>(credentials, `contacts?page=${page}&pageSize=${pageSize}`);

    return body;
  }

  async findGroupInfo(credentials: ZApiCredentials, groupJid: string): Promise<unknown> {
    const { body } = await this.request<unknown>(credentials, `chats/${encodeURIComponent(groupJid)}`);

    return body;
  }

  private async request<T>(
    credentials: ZApiCredentials,
    path: string,
    options: { method?: 'GET' | 'POST'; body?: Record<string, unknown> } = {},
  ): Promise<{ body: T; httpCode: number }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (credentials.clientToken) {
      headers['Client-Token'] = credentials.clientToken;
    }

    const response = await fetch(this.buildUrl(credentials, path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      throw new BadGatewayException(`Z-API status ${response.status}: ${await readProviderError(response)}`);
    }

    return {
      body: (await response.json()) as T,
      httpCode: response.status,
    };
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

function extractExternalMessageId(body: Record<string, unknown>): string | null {
  return (
    readPath(body, ['key', 'id']) ??
    readPath(body, ['data', 'key', 'id']) ??
    readPath(body, ['message', 'key', 'id']) ??
    readPath(body, ['messageId']) ??
    readPath(body, ['data', 'messageId']) ??
    readPath(body, ['id']) ??
    readPath(body, ['data', 'id'])
  );
}

function readPath(body: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = body;

  for (const key of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[key];
  }

  return readString(current);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}
