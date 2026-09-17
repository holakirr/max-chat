// Градиенты аватаров взяты из палитры web.max.ru.
const GRADIENTS = [
  ['#ff48b6', '#ff8a35'],
  ['#ffc93d', '#ff832a'],
  ['#14e1d5', '#03c722'],
  ['#08d7f3', '#5398ff'],
  ['#bf97ff', '#526eff'],
  ['#79bcff', '#4289ed'],
]

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

export function Avatar({ name, seed, size = 48 }: { name: string; seed: string; size?: number }) {
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length]
  const letter = name.replace(/^\+/, '').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
