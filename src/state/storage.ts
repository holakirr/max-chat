import type { Credentials } from '../api/greenApi';
import type { ChatsState } from './chats';
import { emptyState } from './chats';

const CREDS_KEY = 'max-chat:credentials';

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: Credentials | null) {
  try {
    if (creds) localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
    else localStorage.removeItem(CREDS_KEY);
  } catch {
    // Приватный режим или заблокированное хранилище — работаем без сохранения.
  }
}

const chatsKey = (idInstance: string) => `max-chat:chats:${idInstance}`;

export function loadChats(idInstance: string): ChatsState {
  try {
    const raw = localStorage.getItem(chatsKey(idInstance));
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as ChatsState;
    return { ...emptyState, ...parsed, selectedKey: null };
  } catch {
    return emptyState;
  }
}

export function saveChats(idInstance: string, state: ChatsState) {
  try {
    localStorage.setItem(chatsKey(idInstance), JSON.stringify(state));
  } catch {
    // см. saveCredentials
  }
}
