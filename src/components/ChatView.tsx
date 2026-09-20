import { useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Chat, Message } from '../state/chats';
import { formatPhone } from '../state/chats';
import { Avatar } from './Avatar';
import { BackIcon, CheckIcon, ClockIcon, ErrorIcon, SendIcon } from './Icons';
import { dayKey, formatDay, formatTime } from '../format';

interface Props {
  chat: Chat;
  messages: Message[];
  onSend: (text: string) => void;
  onBack: () => void;
}

const MAX_LENGTH = 4000;

export function ChatView({ chat, messages, onSend, onBack }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chat.key]);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed.slice(0, MAX_LENGTH));
    setText('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const subtitle = chat.phone ? formatPhone(chat.phone) : chat.chatId;
  const showSubtitle = subtitle !== chat.name;

  return (
    <section className="chat">
      <header className="chat__header">
        <button type="button" className="icon-button chat__back" aria-label="Назад к чатам" onClick={onBack}>
          <BackIcon />
        </button>
        <Avatar name={chat.name} seed={chat.key} size={40} />
        <div className="chat__peer">
          <div className="chat__name">{chat.name}</div>
          {showSubtitle && <div className="chat__subtitle">{subtitle}</div>}
        </div>
      </header>

      <div className="chat__messages" ref={listRef}>
        {messages.length === 0 && <div className="chat__empty">Напишите первое сообщение</div>}
        {messages.map((m, i) => {
          const newDay = i === 0 || dayKey(messages[i - 1].timestamp) !== dayKey(m.timestamp);
          return (
            <div key={m.id} className="chat__group">
              {newDay && <div className="chat__day">{formatDay(m.timestamp)}</div>}
              <div className={`bubble bubble--${m.direction}${m.status === 'error' ? ' bubble--error' : ''}`}>
                <div className="bubble__text">{m.text}</div>
                <div className="bubble__meta">
                  <span>{formatTime(m.timestamp)}</span>
                  {m.direction === 'out' && <Status status={m.status} />}
                </div>
                {m.error && <div className="bubble__error">Не отправлено: {m.error}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="composer">
        <textarea
          ref={inputRef}
          className="composer__input"
          placeholder="Сообщение"
          rows={1}
          autoFocus
          maxLength={MAX_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="composer__send" aria-label="Отправить" disabled={!text.trim()} onClick={send}>
          <SendIcon />
        </button>
      </footer>
    </section>
  );
}

function Status({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sending':
      return <ClockIcon />;
    case 'delivered':
      return <CheckIcon double />;
    case 'read':
      return (
        <span className="bubble__read">
          <CheckIcon double />
        </span>
      );
    case 'error':
      return <ErrorIcon />;
    default:
      return <CheckIcon />;
  }
}
