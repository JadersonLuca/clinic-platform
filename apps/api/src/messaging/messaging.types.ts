export type MessagingChannel = 'whatsapp';
export type MessagingProvider = 'zapi' | 'evolution';
export type MessagingConnectionStatus = 'not_configured' | 'disconnected' | 'qr_pending' | 'connected' | 'error';
export type MessagingConversationMode = 'ai' | 'human' | 'paused';
export type MessagingDirection = 'in' | 'out';
export type MessagingMessageType = 'text' | 'image' | 'audio' | 'video' | 'document';
export type MessagingMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'received' | 'failed';

export interface ZApiCredentials {
  instanceId: string;
  token: string;
  clientToken?: string;
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
  instanceId?: string;
  token?: string;
  clientToken?: string;
}

export interface SendConversationTextInput {
  conversationId: string;
  message: string;
  replyToMessageId?: string;
}

export interface ProviderSendTextPayload {
  number: string;
  text: string;
  remoteJid?: string;
  messageId?: string;
  quoted?: Record<string, unknown>;
}

export interface ProviderSendResult {
  provider: MessagingProvider;
  externalMessageId: string | null;
  response: Record<string, unknown>;
  httpCode?: number;
}

export interface MessagingConversationView {
  id: string;
  connectionId: string;
  provider: MessagingProvider;
  waJid: string;
  phone: string | null;
  displayName: string | null;
  isGroup: boolean;
  mode: MessagingConversationMode;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  lastInboundAt: Date | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessagingMessageView {
  id: string;
  conversationId: string;
  connectionId: string;
  provider: MessagingProvider;
  externalMessageId: string;
  direction: MessagingDirection;
  messageType: MessagingMessageType;
  status: MessagingMessageStatus;
  senderJid: string | null;
  senderName: string | null;
  body: string | null;
  replyToExternalMessageId: string | null;
  media: Record<string, unknown>;
  sentAt: Date | null;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
