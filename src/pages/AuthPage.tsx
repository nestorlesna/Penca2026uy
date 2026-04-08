import { useState, useEffect, type FormEvent } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Trophy, Loader2, Eye, EyeOff, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Captcha } from '../components/ui/Captcha'

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z').getTime()

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(() => TOURNAMENT_START - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(TOURNAMENT_START - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (timeLeft <= 0) return null

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)

  const blocks = [
    { value: days, label: 'días' },
    { value: hours, label: 'horas' },
    { value: minutes, label: 'min' },
    { value: seconds, label: 'seg' },
  ]

  return (
    <div className="mt-8">
      <div className="flex items-center justify-center gap-1.5 text-text-muted text-sm mb-3">
        <Clock size={14} />
        <span>Arranca el Mundial</span>
      </div>
      <div className="flex justify-center gap-2">
        {blocks.map((b) => (
          <div
            key={b.label}
            className="bg-surface border border-border rounded-lg px-3 py-2 min-w-[52px] text-center"
          >
            <div className="text-xl font-bold text-text-primary tabular-nums">
              {String(b.value).padStart(2, '0')}
            </div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type Tab = 'login' | 'register' | 'forgot' | 'reset'

export function AuthPage() {
  const { user, isActive } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    if (t === 'reset') return 'reset'
    return 'login'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  // Campos
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  // Si ya está logueado y activo, redirigir
  if (user && isActive) return <Navigate to="/fixture" replace />

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!captchaToken) {
      setError('Por favor completá la verificación de seguridad.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (error) setError(traducirError(error.message))
    setLoading(false)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!captchaToken) {
      setError('Por favor completá la verificación de seguridad.')
      return
    }
    setLoading(true)

    if (username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres.')
      setLoading(false)
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('El usuario solo puede contener letras, números y _')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: displayName },
        captchaToken,
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setError(traducirError(error.message))
    } else {
      setSuccess('¡Registro exitoso! Tu cuenta está pendiente de aprobación por el administrador.')
      setEmail(''); setPassword(''); setDisplayName(''); setUsername('')
      setCaptchaToken(null)
    }
    setLoading(false)
  }

  async function handleRecover(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!captchaToken) {
      setError('Por favor completá la verificación de seguridad.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?tab=reset`,
      captchaToken
    })
    if (error) {
      setError(traducirError(error.message))
    } else {
      setSuccess('Se ha enviado un correo con instrucciones para restablecer tu contraseña.')
      setEmail('')
      setCaptchaToken(null)
    }
    setLoading(false)
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(traducirError(error.message))
    } else {
      setSuccess('Tu contraseña ha sido actualizada correctamente. Ya podés ingresar.')
      setTab('login')
      setPassword('')
      setSearchParams({})
    }
    setLoading(false)
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Trophy className="text-primary" size={28} />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Penca Mundial 2026</h1>
          <p className="text-text-muted text-sm mt-1">Predicí, competí, ganá</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {/* Tabs */}
          {tab !== 'forgot' && tab !== 'reset' && (
            <div className="flex rounded-lg bg-surface-2 p-1 mb-5">
              {(['login', 'register'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError(null);
                    setSuccess(null);
                    setCaptchaToken(null);
                    setSearchParams({});
                  }}
                  className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    tab === t
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {t === 'login' ? 'Ingresar' : 'Registrarse'}
                </button>
              ))}
            </div>
          )}

          {tab === 'forgot' && (
            <div className="mb-5">
              <button
                onClick={() => { setTab('login'); setError(null); setSuccess(null) }}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                ← Volver al ingreso
              </button>
              <h2 className="text-lg font-bold text-text-primary mt-2">Recuperar contraseña</h2>
              <p className="text-xs text-text-muted mt-1">Ingresá tu email y te enviaremos un link para crear una nueva.</p>
            </div>
          )}

          {tab === 'reset' && (
            <div className="mb-5">
              <h2 className="text-lg font-bold text-text-primary">Nueva contraseña</h2>
              <p className="text-xs text-text-muted mt-1">Elegí una contraseña segura para tu cuenta.</p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {success && (
            <div className="bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg p-3 mb-4">
              {success}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form
            onSubmit={
              tab === 'login' ? handleLogin :
              tab === 'register' ? handleRegister :
              tab === 'reset' ? handleResetPassword :
              handleRecover
            }
            className="space-y-4"
          >
            {tab !== 'forgot' && tab !== 'reset' && (
              <>
                {tab === 'register' && (
                  <>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">Nombre para mostrar</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="input"
                        placeholder="Ej: Juan García"
                        required
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-secondary mb-1.5">
                        Nombre de usuario <span className="text-text-muted">(solo letras, números, _)</span>
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value.toLowerCase())}
                        className="input"
                        placeholder="Ej: juangarcia"
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[a-zA-Z0-9_]+"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input"
                    placeholder="tu@email.com"
                    required
                    autoComplete={tab === 'login' ? 'email' : 'new-email'}
                  />
                </div>
              </>
            )}

            {tab === 'forgot' && (
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="tu@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            )}

            {(tab !== 'forgot') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-text-secondary">
                    {tab === 'reset' ? 'Nueva contraseña' : 'Contraseña'}
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setTab('forgot'); setError(null); setSuccess(null) }}
                      className="text-[11px] text-primary hover:underline focus:outline-none"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : tab === 'reset' ? 'Ingresá tu nueva contraseña' : '••••••••'}
                    required
                    minLength={6}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {tab === 'login' ? 'Ingresar' : tab === 'register' ? 'Crear cuenta' : tab === 'reset' ? 'Guardar nueva contraseña' : 'Enviar instrucciones'}
            </button>
          </form>

          <div className="mt-4">
            <Captcha
              onSuccess={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => {
                setError('Error al cargar la verificación de seguridad.')
                setCaptchaToken(null)
              }}
            />
          </div>

          {tab === 'register' && (
            <p className="text-[11px] text-text-muted text-center mt-4">
              Tu cuenta requiere aprobación del administrador antes de poder predecir.
            </p>
          )}
        </div>

        <CountdownTimer />
      </div>
    </div>
  )
}

function traducirError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (msg.includes('User already registered'))   return 'Ya existe una cuenta con ese email.'
  if (msg.includes('Password should be'))        return 'La contraseña debe tener al menos 6 caracteres.'
  if (msg.includes('Unable to validate email'))  return 'El formato del email no es válido.'
  if (msg.includes('Email rate limit'))          return 'Demasiados intentos. Esperá unos minutos.'
  if (msg.includes('captcha'))                   return 'Error en la verificación de seguridad (Captcha).'
  return msg
}
