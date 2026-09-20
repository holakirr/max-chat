import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { Credentials, NotificationBody } from './api/greenApi';
import { createClient, GreenApiError } from './api/greenApi';
import { parseNotification } from './api/notifications';
import { ChatView } from './components/ChatView';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { describe, useNotifications } from './hooks/useNotifications';
import { emptyState, reducer } from './state/chats';
import { loadChats, loadCredentials, saveChats, saveCredentials } from './state/storage';

export default function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCredentials());
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const client = useMemo(() => (creds ? createClient(creds) : null), [creds]);

  const [state, dispatch] = useReducer(reducer, creds?.idInstance ?? null, (id) => (id ? loadChats(id) : emptyState));

  useEffect(() => {
    if (creds) saveChats(creds.idInstance, state);
  }, [creds, state]);

  const onNotification = useCallback((body: NotificationBody) => {
    const event = parseNotification(body);
    if (!event) return;
    if (event.kind === 'state') {
      setNotice(event.state === 'authorized' ? null : `Состояние инстанса: ${event.state}`);
      return;
    }
    dispatch({ type: 'event', event });
  }, []);

  const pollError = useNotifications(client, onNotification);

  const login = async (next: Credentials) => {
    setLoginBusy(true);
    setLoginError(null);
    try {
      const api = createClient(next);
      const stateRes = await api.getStateInstance();
      const instanceState = stateRes?.stateInstance ?? 'unknown';
      if (instanceState !== 'authorized') {
        setLoginError(`Инстанс не авторизован (состояние: ${instanceState}). Свяжите его с MAX в консоли GREEN-API.`);
        return;
      }
      // Для приёма через HTTP API нужны включённые уведомления и пустой webhookUrl.
      const settings = await api.getSettings();
      const needsSetup =
        !settings ||
        Boolean(settings.webhookUrl) ||
        settings.incomingWebhook !== 'yes' ||
        settings.outgoingMessageWebhook !== 'yes' ||
        settings.outgoingAPIMessageWebhook !== 'yes';
      if (needsSetup) {
        await api.setSettings({
          webhookUrl: '',
          incomingWebhook: 'yes',
          outgoingWebhook: 'yes',
          outgoingMessageWebhook: 'yes',
          outgoingAPIMessageWebhook: 'yes',
          stateWebhook: 'yes',
        });
        setNotice(
          'Настройки уведомлений обновлены. GREEN-API применяет их до 5 минут — входящие могут появиться с задержкой.',
        );
      }
      saveCredentials(next);
      setCreds(next);
    } catch (e) {
      setLoginError(
        e instanceof GreenApiError && e.status === 400 ? 'Проверьте idInstance: ожидается число' : describe(e),
      );
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = () => {
    saveCredentials(null);
    setCreds(null);
    setNotice(null);
    dispatch({ type: 'select', key: null });
  };

  const send = async (text: string) => {
    const chat = state.selectedKey ? state.chats[state.selectedKey] : null;
    if (!client || !chat) return;
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    dispatch({
      type: 'sendStart',
      key: chat.key,
      tempId,
      text,
      timestamp: Date.now(),
    });
    try {
      const res = await client.sendMessage(chat.chatId, text);
      if (!res?.idMessage) throw new Error('GREEN-API не вернул idMessage');
      dispatch({
        type: 'sendDone',
        key: chat.key,
        tempId,
        idMessage: res.idMessage,
      });
    } catch (e) {
      dispatch({ type: 'sendFail', key: chat.key, tempId, error: describe(e) });
    }
  };

  if (!creds) {
    return <Login initial={loadCredentials()} busy={loginBusy} error={loginError} onSubmit={login} />;
  }

  const chats = Object.values(state.chats).sort((a, b) => b.lastAt - a.lastAt);
  const lastMessages = Object.fromEntries(chats.map((c) => [c.key, state.messages[c.key]?.at(-1)]));
  const selected = state.selectedKey ? state.chats[state.selectedKey] : null;

  return (
    <div className={`app${selected ? ' app--chat-open' : ''}`}>
      <Sidebar
        idInstance={creds.idInstance}
        chats={chats}
        lastMessages={lastMessages}
        selectedKey={state.selectedKey}
        connectionError={pollError || notice}
        onSelect={(key) => dispatch({ type: 'select', key })}
        onCreate={(phone) => dispatch({ type: 'createChat', phone })}
        onLogout={logout}
      />
      {selected ? (
        <ChatView
          key={selected.key}
          chat={selected}
          messages={state.messages[selected.key] ?? []}
          onSend={send}
          onBack={() => dispatch({ type: 'select', key: null })}
        />
      ) : (
        <section className="chat chat--placeholder">
          <div className="chat__placeholder">Выберите чат или создайте новый</div>
        </section>
      )}
    </div>
  );
}
