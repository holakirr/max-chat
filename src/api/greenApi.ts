// Тонкий клиент GREEN-API (v3, мессенджер MAX).
// Методы: https://green-api.com/v3/docs/api/

export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}

export const DEFAULT_API_URL = 'https://api.green-api.com';

export interface InstanceSettings {
  webhookUrl?: string;
  incomingWebhook?: 'yes' | 'no';
  outgoingWebhook?: 'yes' | 'no';
  outgoingMessageWebhook?: 'yes' | 'no';
  outgoingAPIMessageWebhook?: 'yes' | 'no';
  stateWebhook?: 'yes' | 'no';
}

export interface ReceivedNotification {
  receiptId: number;
  body: NotificationBody;
}

// Минимальная форма уведомления, которая нужна приложению.
// Формат: https://green-api.com/v3/docs/api/receiving/notifications-format/
export interface NotificationBody {
  typeWebhook: string;
  timestamp?: number;
  idMessage?: string;
  stateInstance?: string;
  status?: string;
  senderData?: {
    chatId?: string;
    chatName?: string;
    sender?: string;
    senderName?: string;
    senderContactName?: string;
    senderPhoneNumber?: number | string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: { textMessage?: string };
    extendedTextMessageData?: { text?: string };
  };
}

export class GreenApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    return json.message ?? json.error ?? text;
  } catch {
    return text || res.statusText;
  }
}

export function createClient(creds: Credentials) {
  const base = `${creds.apiUrl.replace(/\/+$/, '')}/waInstance${creds.idInstance.trim()}`;
  const token = creds.apiTokenInstance.trim();

  async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T | null> {
    const res = await fetch(`${base}/${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    if (!res.ok) throw new GreenApiError(res.status, await readError(res));
    const text = await res.text();
    if (!text || text === 'null') return null;
    return JSON.parse(text) as T;
  }

  return {
    // https://green-api.com/v3/docs/api/account/GetStateInstance/
    getStateInstance: () => request<{ stateInstance: string }>('GET', `getStateInstance/${token}`),

    // https://green-api.com/v3/docs/api/account/GetSettings/
    getSettings: () => request<InstanceSettings>('GET', `getSettings/${token}`),

    // https://green-api.com/v3/docs/api/account/SetSettings/
    setSettings: (settings: InstanceSettings) =>
      request<{ saveSettings: boolean }>('POST', `setSettings/${token}`, settings),

    // https://green-api.com/v3/docs/api/sending/SendMessage/
    sendMessage: (chatId: string, message: string) =>
      request<{ idMessage: string }>('POST', `sendMessage/${token}`, { chatId, message }),

    // https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/
    receiveNotification: (receiveTimeout: number, signal?: AbortSignal) =>
      request<ReceivedNotification>(
        'GET',
        `receiveNotification/${token}?receiveTimeout=${receiveTimeout}`,
        undefined,
        signal,
      ),

    // https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/
    deleteNotification: (receiptId: number) =>
      request<{ result: boolean }>('DELETE', `deleteNotification/${token}/${receiptId}`),
  };
}

export type GreenApiClient = ReturnType<typeof createClient>;
