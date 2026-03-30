import { useState, useRef, type ChangeEvent } from 'react'
import { Camera, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { updateProfile, uploadAvatar } from '../services/profileService'
import { RequireAuth } from '../components/auth/AuthGuard'

export function PerfilPage() {
  return (
    <RequireAuth>
      <PerfilContent />
    </RequireAuth>
  )
}

function PerfilContent() {
  const { user, profile, loading: authLoading } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (authLoading || !profile || !user) return null

  const initials = (profile.display_name || profile.username)[0].toUpperCase()

  async function handleSave() {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      await updateProfile(user!.id, { display_name: displayName.trim() })
      toast.success('Perfil actualizado')
    } catch {
      toast.error('Error al guardar')
    }
    setSaving(false)
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview local
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(user!.id, file)
      await updateProfile(user!.id, { avatar_url: url })
      toast.success('Avatar actualizado')
    } catch {
      setAvatarPreview(null)
      toast.error('Error al subir la imagen. Máximo 2 MB.')
    }
    setUploadingAvatar(false)
  }

  const avatarSrc = avatarPreview ?? profile.avatar_url

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-bold text-text-primary mb-6">Mi perfil</h1>

      {/* Avatar */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-border">
                <span className="text-2xl font-bold text-primary">{initials}</span>
              </div>
            )}

            {/* Botón cambiar avatar */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary-hover transition-colors"
            >
              {uploadingAvatar
                ? <Loader2 size={14} className="animate-spin text-white" />
                : <Camera size={14} className="text-white" />
              }
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <p className="font-semibold text-text-primary">{profile.display_name}</p>
            <p className="text-sm text-text-muted">@{profile.username}</p>
            {profile.is_admin && (
              <span className="badge-accent text-[10px] mt-1">Admin</span>
            )}
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">
          Formatos: JPG, PNG, WEBP · Máximo 2 MB
        </p>
      </div>

      {/* Datos editables */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary mb-4">Información</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Nombre para mostrar</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="input"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Usuario</label>
            <input
              type="text"
              value={`@${profile.username}`}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={user.email ?? ''}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || displayName.trim() === profile.display_name}
          className="btn-primary w-full mt-5 flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Guardando...</>
            : <><Check size={15} /> Guardar cambios</>
          }
        </button>
      </div>

      {/* Estado de cuenta */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Estado de cuenta</span>
          {profile.is_active
            ? <span className="badge-primary">Activa</span>
            : <span className="badge bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full">Pendiente</span>
          }
        </div>
      </div>
    </div>
  )
}
