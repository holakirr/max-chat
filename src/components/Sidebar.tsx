import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Chat, Message } from '../state/chats'
import { Avatar } from './Avatar'
import { LogoutIcon, PlusIcon } from './Icons'
import { formatTime } from '../format'

interface Props {
  idInstance: string
  chats: Chat[]
  lastMessages: Record<string, Message | undefined>
  selectedKey: string | null
  connectionError: string | null
  onSelect: (key: string) => void
  onCreate: (phone: string) => void
  onLogout: () => void
}

export function Sidebar({ idInstance, chats, lastMessages, selectedKey, connectionError, onSelect, onCreate, onLogout }: Props) {
  const [phone, setPhone] = useState('')
  const [creating, setCreating] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    let digits = phone.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`
    if (digits.length === 10) digits = `7${digits}`
    if (digits.length < 10 || digits.length > 15) {
      setPhoneError('Введите номер в международном формате, например +7 999 123-45-67')
      return
    }
    onCreate(digits)
    setPhone('')
    setPhoneError(null)
    setCreating(false)
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div className="sidebar__title">
          <span>Чаты</span>
          <span className="sidebar__instance" title="idInstance">
            {idInstance}
          </span>
        </div>
        <div className="sidebar__actions">
          <button
            type="button"
            className="icon-button"
            title="Новый чат"
            aria-label="Новый чат"
            aria-expanded={creating}
            onClick={() => setCreating(v => !v)}
          >
            <PlusIcon />
          </button>
          <button type="button" className="icon-button" title="Выйти" aria-label="Выйти" onClick={onLogout}>
            <LogoutIcon />
          </button>
        </div>
      </header>

      {creating && (
        <form className="new-chat" onSubmit={submit}>
          <input
            className="field__input"
            type="tel"
            autoFocus
            placeholder="Номер телефона получателя"
            value={phone}
            onChange={e => {
              setPhone(e.target.value)
              setPhoneError(null)
            }}
          />
          <button type="submit" className="button button--primary">
            Создать
          </button>
          {phoneError && <div className="new-chat__error">{phoneError}</div>}
        </form>
      )}

      {connectionError && <div className="sidebar__banner">{connectionError}</div>}

      <ul className="chat-list">
        {chats.length === 0 && (
          <li className="chat-list__empty">
            Нажмите <PlusIcon /> и введите номер получателя, чтобы начать переписку
          </li>
        )}
        {chats.map(chat => {
          const last = lastMessages[chat.key]
          return (
            <li key={chat.key}>
              <button
                type="button"
                className={`chat-item${chat.key === selectedKey ? ' chat-item--active' : ''}`}
                onClick={() => onSelect(chat.key)}
              >
                <Avatar name={chat.name} seed={chat.key} />
                <div className="chat-item__body">
                  <div className="chat-item__row">
                    <span className="chat-item__name">{chat.name}</span>
                    {last && <span className="chat-item__time">{formatTime(last.timestamp)}</span>}
                  </div>
                  <div className="chat-item__row">
                    <span className="chat-item__preview">
                      {last ? `${last.direction === 'out' ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                    </span>
                    {chat.unread > 0 && <span className="chat-item__badge">{chat.unread}</span>}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
