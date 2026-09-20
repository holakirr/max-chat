const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dayWithYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatTime(ts: number): string {
  return time.format(ts);
}

export function formatDay(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return 'Сегодня';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Вчера';
  return d.getFullYear() === now.getFullYear() ? day.format(d) : dayWithYear.format(d);
}

export function dayKey(ts: number): string {
  return new Date(ts).toDateString();
}
