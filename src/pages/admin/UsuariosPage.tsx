import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, ShieldCheck, ShieldOff, UserCheck, UserX, Search } from 'lucide-react'
import { toast } from 'sonner'
import { RequireAdmin } from '../../components/auth/AuthGuard'
import { fetchAllProfiles, setUserActive, setUserAdmin } from '../../services/profileService'
import { useAuth } from '../../hooks/useAuth'
import type { Profile } from '../../types'

export function UsuariosPage() {
  return (
    <RequireAdmin>
      <UsuariosContent />
    </RequireAdmin>
  )
}

function UsuariosContent() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['admin_profiles'],
    queryFn: fetchAllProfiles,
  })

  const mutateActive = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setUserActive(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_profiles'] }),
    onError: () => toast.error('Error al actualizar'),
  })

  const mutateAdmin = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setUserAdmin(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_profiles'] }),
    onError: () => toast.error('Error al actualizar'),
  })

  const filtered = (profiles ?? []).filter(p =>
    p.username.includes(search.toLowerCase()) ||
    p.display_name.toLowerCase().includes(search.toLowerCase())
  )

  const pending = filtered.filter(p => !p.is_active).length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Usuarios</h1>
          {pending > 0 && (
            <p className="text-xs text-error mt-0.5">
              {pending} usuario{pending > 1 ? 's' : ''} inactivo{pending > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <span className="badge-primary">{profiles?.length ?? 0} total</span>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-text-muted text-sm text-center py-8">Sin resultados</p>
          )}

          {filtered.map(profile => (
            <UserRow
              key={profile.id}
              profile={profile}
              isMe={profile.id === me?.id}
              onToggleActive={(val) => {
                mutateActive.mutate({ id: profile.id, val })
                toast.success(val ? `${profile.username} activado` : `${profile.username} desactivado`)
              }}
              onToggleAdmin={(val) => {
                mutateAdmin.mutate({ id: profile.id, val })
                toast.success(val ? `${profile.username} es admin` : `${profile.username} ya no es admin`)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UserRowProps {
  profile: Profile
  isMe: boolean
  onToggleActive: (val: boolean) => void
  onToggleAdmin: (val: boolean) => void
}

function UserRow({ profile, isMe, onToggleActive, onToggleAdmin }: UserRowProps) {
  const initials = (profile.display_name || profile.username)[0].toUpperCase()

  return (
    <div className="card p-4 flex items-center gap-3">
      {/* Avatar */}
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-bold text-sm">{initials}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary truncate">{profile.display_name}</span>
          {isMe && <span className="badge bg-border text-text-muted text-[10px]">Yo</span>}
          {profile.is_admin && <span className="badge-accent text-[10px]">Admin</span>}
        </div>
        <p className="text-xs text-text-muted">@{profile.username}</p>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-1">
        {profile.is_active
          ? <span className="badge-primary text-[10px] hidden sm:inline-flex">Activo</span>
          : <span className="badge bg-error/20 text-error text-[10px] hidden sm:inline-flex">Inactivo</span>
        }
      </div>

      {/* Acciones — no puede editarse a sí mismo */}
      {!isMe && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleActive(!profile.is_active)}
            title={profile.is_active ? 'Inactivar usuario' : 'Activar usuario'}
            className={`p-2 rounded-lg transition-colors ${
              profile.is_active
                ? 'text-text-muted hover:text-error hover:bg-error/10'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            {profile.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
          </button>

          <button
            onClick={() => onToggleAdmin(!profile.is_admin)}
            title={profile.is_admin ? 'Quitar admin' : 'Hacer admin'}
            className={`p-2 rounded-lg transition-colors ${
              profile.is_admin
                ? 'text-accent hover:bg-error/10 hover:text-error'
                : 'text-text-muted hover:text-accent hover:bg-accent/10'
            }`}
          >
            {profile.is_admin ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
          </button>
        </div>
      )}
    </div>
  )
}
