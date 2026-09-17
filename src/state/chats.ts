import type { ChatEvent } from '../api/notifications'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error'

export interface Message {
  id: string
  chatKey: string
  text: string
  direction: 'in' | 'out'
  timestamp: number
  status?: MessageStatus
  error?: string
}

export interface Chat {
  // Ключ чата: цифры телефона, если он известен, иначе chatId из уведомления.
  key: string
  // Идентификатор, в который отправляем (79991234567@c.us или числовой id MAX).
  chatId: string
  name: string
  phone: string | null
  // Дополнительные chatId, под которыми этот же собеседник приходит в уведомлениях.
  aliases: string[]
  unread: number
  lastAt: number
}

export interface ChatsState {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  selectedKey: string | null
}

export const emptyState: ChatsState = { chats: {}, messages: {}, selectedKey: null }

export type Action =
  | { type: 'createChat'; phone: string }
  | { type: 'select'; key: string | null }
  | { type: 'sendStart'; key: string; tempId: string; text: string; timestamp: number }
  | { type: 'sendDone'; key: string; tempId: string; idMessage: string }
  | { type: 'sendFail'; key: string; tempId: string; error: string }
  | { type: 'event'; event: ChatEvent }

export function phoneToChatId(phone: string): string {
  return `${phone}@c.us`
}

export function formatPhone(phone: string): string {
  if (phone.length === 11 && phone.startsWith('7')) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`
  }
  return `+${phone}`
}

function findChat(state: ChatsState, chatId: string, phone: string | null): Chat | undefined {
  if (phone && state.chats[phone]) return state.chats[phone]
  return Object.values(state.chats).find(c => c.chatId === chatId || c.aliases.includes(chatId))
}

function withAlias(chat: Chat, chatId: string): Chat {
  if (chat.chatId === chatId || chat.aliases.includes(chatId)) return chat
  return { ...chat, aliases: [...chat.aliases, chatId] }
}

function upsertMessage(state: ChatsState, chat: Chat, message: Message, bumpUnread: boolean): ChatsState {
  const list = state.messages[chat.key] ?? []
  if (list.some(m => m.id === message.id)) return { ...state, chats: { ...state.chats, [chat.key]: chat } }
  const unread = bumpUnread && state.selectedKey !== chat.key ? chat.unread + 1 : chat.unread
  return {
    ...state,
    chats: { ...state.chats, [chat.key]: { ...chat, unread, lastAt: Math.max(chat.lastAt, message.timestamp) } },
    messages: { ...state.messages, [chat.key]: [...list, message].sort((a, b) => a.timestamp - b.timestamp) },
  }
}

export function reducer(state: ChatsState, action: Action): ChatsState {
  switch (action.type) {
    case 'createChat': {
      const key = action.phone
      const existing = state.chats[key]
      if (existing) return { ...state, selectedKey: key, chats: { ...state.chats, [key]: { ...existing, unread: 0 } } }
      const chat: Chat = {
        key,
        chatId: phoneToChatId(key),
        name: formatPhone(key),
        phone: key,
        aliases: [],
        unread: 0,
        lastAt: Date.now(),
      }
      return { ...state, chats: { ...state.chats, [key]: chat }, selectedKey: key }
    }
    case 'select': {
      if (!action.key) return { ...state, selectedKey: null }
      const chat = state.chats[action.key]
      if (!chat) return state
      return { ...state, selectedKey: action.key, chats: { ...state.chats, [action.key]: { ...chat, unread: 0 } } }
    }
    case 'sendStart': {
      const chat = state.chats[action.key]
      if (!chat) return state
      const message: Message = {
        id: action.tempId,
        chatKey: action.key,
        text: action.text,
        direction: 'out',
        timestamp: action.timestamp,
        status: 'sending',
      }
      return upsertMessage(state, chat, message, false)
    }
    case 'sendDone':
    case 'sendFail': {
      const list = state.messages[action.key]
      if (!list) return state
      const next = list.map(m => {
        if (m.id !== action.tempId) return m
        return action.type === 'sendDone'
          ? { ...m, id: action.idMessage, status: 'sent' as const }
          : { ...m, status: 'error' as const, error: action.error }
      })
      return { ...state, messages: { ...state.messages, [action.key]: next } }
    }
    case 'event':
      return applyEvent(state, action.event)
    default:
      return state
  }
}

function applyEvent(state: ChatsState, event: ChatEvent): ChatsState {
  switch (event.kind) {
    case 'incoming': {
      let chat = findChat(state, event.chatId, event.phone)
      if (!chat) {
        const key = event.phone ?? event.chatId
        chat = {
          key,
          chatId: event.phone ? phoneToChatId(event.phone) : event.chatId,
          name: event.senderName,
          phone: event.phone,
          aliases: [],
          unread: 0,
          lastAt: event.timestamp,
        }
      } else if (chat.name === (chat.phone && formatPhone(chat.phone)) && event.senderName) {
        // Имя собеседника узнаём из первого входящего сообщения.
        chat = { ...chat, name: event.senderName }
      }
      chat = withAlias(chat, event.chatId)
      return upsertMessage(
        state,
        chat,
        { id: event.idMessage, chatKey: chat.key, text: event.text, direction: 'in', timestamp: event.timestamp },
        true,
      )
    }
    case 'outgoing': {
      // Эхо нашего же сообщения: по idMessage узнаём, под каким chatId живёт собеседник.
      for (const [key, list] of Object.entries(state.messages)) {
        if (list.some(m => m.id === event.idMessage)) {
          const chat = state.chats[key]
          return chat ? { ...state, chats: { ...state.chats, [key]: withAlias(chat, event.chatId) } } : state
        }
      }
      let chat = findChat(state, event.chatId, null)
      if (!chat) {
        chat = {
          key: event.chatId,
          chatId: event.chatId,
          name: event.chatId,
          phone: null,
          aliases: [],
          unread: 0,
          lastAt: event.timestamp,
        }
      }
      return upsertMessage(
        state,
        chat,
        { id: event.idMessage, chatKey: chat.key, text: event.text, direction: 'out', timestamp: event.timestamp, status: 'sent' },
        false,
      )
    }
    case 'status': {
      const rank: Record<string, number> = { sent: 1, delivered: 2, read: 3 }
      const next = rank[event.status]
      if (!next) return state
      const messages = { ...state.messages }
      let changed = false
      for (const key of Object.keys(messages)) {
        const list = messages[key]
        const idx = list.findIndex(m => m.id === event.idMessage)
        if (idx === -1) continue
        const current = rank[list[idx].status ?? ''] ?? 0
        if (next <= current) return state
        messages[key] = list.map((m, i) => (i === idx ? { ...m, status: event.status as MessageStatus } : m))
        changed = true
        break
      }
      return changed ? { ...state, messages } : state
    }
    default:
      return state
  }
}
