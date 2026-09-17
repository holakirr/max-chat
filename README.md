# MAX-чат на GREEN-API

Минимальный веб-интерфейс для переписки в мессенджере [MAX](https://web.max.ru) через сервис
[GREEN-API](https://green-api.com/max): только текстовые сообщения, внешний вид повторяет веб-версию MAX.

- Отправка — [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/)
- Получение — [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/):
  длинный опрос `ReceiveNotification` → `DeleteNotification`
- React 19 + TypeScript + Vite, без бэкенда: браузер ходит в GREEN-API напрямую (CORS открыт)

Демо: **https://max.holakirr.com**

## Как пользоваться

1. Создайте инстанс MAX в [консоли GREEN-API](https://console.green-api.com) и авторизуйте его по QR-коду.
2. Откройте приложение, введите `idInstance` и `apiTokenInstance`. При входе приложение проверяет
   состояние инстанса (`getStateInstance`) и, если нужно, включает уведомления о входящих и исходящих
   сообщениях с пустым `webhookUrl` (`setSettings`) — иначе очередь `receiveNotification` недоступна.
3. Нажмите «+», введите номер телефона получателя (MAX должен быть установлен у него) и создайте чат.
4. Напишите сообщение — оно уйдёт в MAX. Ответы собеседника появятся в чате автоматически.

Учётные данные и переписка хранятся только в `localStorage` браузера. «Выйти» стирает учётные данные.

## Локальный запуск

Нужен Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

Прочие команды:

```bash
npm run build      # проверка типов и сборка в dist/
npm run lint       # oxlint
npm run preview    # раздача собранного dist/
```

Через Docker (nginx со статикой на http://localhost:3300):

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

## Устройство

```
src/api/greenApi.ts        клиент GREEN-API: getStateInstance, getSettings, setSettings,
                           sendMessage, receiveNotification, deleteNotification
src/api/notifications.ts   разбор уведомлений в события приложения (только текст)
src/hooks/useNotifications.ts  цикл длинного опроса очереди
src/state/chats.ts         редьюсер чатов и сообщений
src/state/storage.ts       сохранение в localStorage
src/components/            Login, Sidebar (список чатов и создание), ChatView (переписка)
infra/                     Dockerfile, compose, скрипт деплоя, блок для edge-прокси
```

Как сопоставляются чаты. Чат создаётся по номеру телефона, отправка идёт в `79991234567@c.us`.
В уведомлениях MAX собеседник приходит с числовым `chatId` и `senderPhoneNumber`; по номеру
входящее попадает в нужный чат, а числовой `chatId` запоминается как псевдоним. Если номера
нет (например, при записи в группе), чат создаётся по `chatId` из уведомления. Эхо собственных
сообщений (`outgoingAPIMessageReceived`) склеивается по `idMessage`, статусы доставки и
прочтения (`outgoingMessageStatus`) подсвечиваются галочками.

## Деплой

Приложение — статика в nginx на домашнем сервере, наружу выходит через edge-прокси Caddy
(блок в `infra/edge.Caddyfile`), как и backgammon.holakirr.com.

```bash
ssh homesrv 'cd ~/max-chat && infra/deploy.sh'
```
