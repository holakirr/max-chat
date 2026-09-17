import { useState } from 'react'
import type { FormEvent } from 'react'
import { DEFAULT_API_URL } from '../api/greenApi'
import type { Credentials } from '../api/greenApi'
import { Logo } from './Icons'

interface Props {
  initial: Credentials | null
  busy: boolean
  error: string | null
  onSubmit: (creds: Credentials) => void
}

export function Login({ initial, busy, error, onSubmit }: Props) {
  const [idInstance, setIdInstance] = useState(initial?.idInstance ?? '')
  const [apiTokenInstance, setApiTokenInstance] = useState(initial?.apiTokenInstance ?? '')
  const [apiUrl, setApiUrl] = useState(initial?.apiUrl ?? DEFAULT_API_URL)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim(), apiUrl: apiUrl.trim() || DEFAULT_API_URL })
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">
          <Logo />
        </div>
        <h1 className="login__title">Вход в MAX</h1>
        <p className="login__hint">
          Учётные данные инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            консоли GREEN-API
          </a>
        </p>

        <label className="field">
          <span className="field__label">idInstance</span>
          <input
            className="field__input"
            inputMode="numeric"
            autoComplete="username"
            placeholder="3100000001"
            value={idInstance}
            onChange={e => setIdInstance(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field__label">apiTokenInstance</span>
          <input
            className="field__input"
            type="password"
            autoComplete="current-password"
            placeholder="d75b3a66374942c5b3c019c6…"
            value={apiTokenInstance}
            onChange={e => setApiTokenInstance(e.target.value)}
            required
          />
        </label>
        <details className="login__advanced">
          <summary>Адрес API</summary>
          <label className="field">
            <span className="field__label">apiUrl</span>
            <input className="field__input" value={apiUrl} onChange={e => setApiUrl(e.target.value)} placeholder={DEFAULT_API_URL} />
          </label>
        </details>

        {error && <div className="login__error">{error}</div>}

        <button className="button button--primary login__submit" type="submit" disabled={busy}>
          {busy ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
