import type { NotificationBody } from './greenApi';

// Разбор уведомления в событие, понятное приложению. Всё, что не текст, игнорируем.
export type ChatEvent =
  | {
      kind: 'incoming';
      idMessage: string;
      chatId: string;
      senderName: string;
      phone: string | null;
      text: string;
      timestamp: number;
    }
  | { kind: 'outgoing'; idMessage: string; chatId: string; text: string; timestamp: number }
  | { kind: 'status'; idMessage: string; status: string }
  | { kind: 'state'; state: string };

function extractText(body: NotificationBody): string | null {
  const data = body.messageData;
  if (!data) return null;
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  if (data.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text ?? null;
  return null;
}

export function normalizePhone(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

export function parseNotification(body: NotificationBody): ChatEvent | null {
  const ts = (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000;
  switch (body.typeWebhook) {
    case 'incomingMessageReceived': {
      const text = extractText(body);
      const chatId = body.senderData?.chatId;
      if (!text || !chatId || !body.idMessage) return null;
      const s = body.senderData ?? {};
      return {
        kind: 'incoming',
        idMessage: body.idMessage,
        chatId,
        senderName: s.senderContactName || s.senderName || s.chatName || chatId,
        phone: normalizePhone(s.senderPhoneNumber) ?? (chatId.endsWith('@c.us') ? normalizePhone(chatId) : null),
        text,
        timestamp: ts,
      };
    }
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const text = extractText(body);
      const chatId = body.senderData?.chatId;
      if (!text || !chatId || !body.idMessage) return null;
      return { kind: 'outgoing', idMessage: body.idMessage, chatId, text, timestamp: ts };
    }
    case 'outgoingMessageStatus':
      if (!body.idMessage || !body.status) return null;
      return { kind: 'status', idMessage: body.idMessage, status: body.status };
    case 'stateInstanceChanged':
      return body.stateInstance ? { kind: 'state', state: body.stateInstance } : null;
    default:
      return null;
  }
}
