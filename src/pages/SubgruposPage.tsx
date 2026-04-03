import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, Users, Plus, Trophy, LogOut, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import {
  fetchMySubgrupos,
  createSubgrupo,
  leaveSubgrupo,
  getUserSubgrupoCount,
  toggleSubgrupoActive,
} from '../services/subgrupoService'
import { Modal } from '../components/ui/Modal'

export function SubgruposPage() {
  const { user, isActive, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: mySubgrupos = [], isLoading } = useQuery({
    queryKey: ['my_subgrupos', user?.id],
    queryFn: () => (user ? fetchMySubgrupos(user.id) : Promise.resolve([])),
    enabled: !!user && !!isActive,
  })

  const { data: mySubgrupoCount = 0 } = useQuery({
    queryKey: ['subgrupo_count', user?.id],
    queryFn: () => (user ? getUserSubgrupoCount(user.id) : Promise.resolve(0)),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: () => createSubgrupo(newName.trim(), user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_subgrupos'] })
      qc.invalidateQueries({ queryKey: ['subgrupo_count'] })
      setShowCreate(false)
      setNewName('')
      toast.success('Subgrupo creado')
    },
    onError: (e: any) => toast.error(e.message || 'Error al crear el subgrupo'),
  })

  const leaveMutation = useMutation({
    mutationFn: (subgrupoId: string) => leaveSubgrupo(subgrupoId, user!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_subgrupos'] })
      toast.success('Saliste del subgrupo')
    },
    onError: () => toast.error('Error al salir del subgrupo'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => toggleSubgrupoActive(id, val),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my_subgrupos'] })
      toast.success('Subgrupo actualizado')
    },
    onError: () => toast.error('Error al actualizar el subgrupo'),
  })

  if (!user || !isActive) {
    return (
      <div className="card p-8 text-center">
        <Users size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">
          Necesitás estar logueado y con cuenta activa para ver subgrupos.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-primary" />
          <h1 className="text-xl font-bold text-text-primary">Subgrupos</h1>
        </div>
        {mySubgrupoCount < 3 && (
          <button
            onClick={() => { setShowCreate(true); setNewName('') }}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Plus size={14} /> Crear
          </button>
        )}
      </div>

      {mySubgrupoCount >= 3 && (
        <p className="text-xs text-text-muted mb-3">
          Llegaste al límite de 3 subgrupos como creador.
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      )}

      {!isLoading && mySubgrupos.length === 0 && (
        <div className="card p-8 text-center">
          <Users size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm mb-4">
            No pertenecés a ningún subgrupo todavía.
          </p>
          <p className="text-xs text-text-muted">
            Creá uno e invitá a tus amigos, o pedile a alguien que te sume al suyo.
          </p>
        </div>
      )}

      {!isLoading && mySubgrupos.length > 0 && (
        <div className="space-y-2">
          {mySubgrupos.map(sg => (
            <div
              key={sg.id}
              className={`card p-4 flex items-center gap-3 transition-colors ${
                !sg.is_active ? 'opacity-60 border-error/30' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/subgrupos/${sg.id}`}
                    className="text-sm font-medium text-text-primary hover:text-primary transition-colors truncate block"
                  >
                    {sg.name}
                  </Link>
                  {!sg.is_active && (
                    <span className="badge bg-error/20 text-error text-[10px] flex-shrink-0">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">
                  {sg.creator_id === user.id ? 'Tu subgrupo' : 'Te invitaron'}
                </p>
              </div>
              {sg.is_active && (
                <Link
                  to={`/subgrupos/${sg.id}`}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                >
                  <Trophy size={12} /> Ranking
                </Link>
              )}
              {sg.creator_id !== user.id && (
                <button
                  onClick={() => {
                    if (confirm(`¿Seguro que querés salir de "${sg.name}"?`)) {
                      leaveMutation.mutate(sg.id)
                    }
                  }}
                  title="Salir del subgrupo"
                  className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
                >
                  <LogOut size={16} />
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    toggleMutation.mutate({ id: sg.id, val: !sg.is_active })
                  }}
                  title={sg.is_active ? 'Deshabilitar subgrupo' : 'Habilitar subgrupo'}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    sg.is_active
                      ? 'text-text-muted hover:text-error hover:bg-error/10'
                      : 'text-text-muted hover:text-primary hover:bg-primary/10'
                  }`}
                >
                  {sg.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear subgrupo */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear subgrupo">
        <form
          onSubmit={e => {
            e.preventDefault()
            if (newName.trim().length < 2) return
            createMutation.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Nombre del subgrupo</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="input"
              placeholder="Ej: La banda del gol"
              required
              minLength={2}
              maxLength={50}
              autoFocus
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full">
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Crear subgrupo'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
