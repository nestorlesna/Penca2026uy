import { NavLink } from 'react-router-dom'
import { Calendar, LayoutGrid, Trophy, Star, User } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { to: '/fixture', icon: Calendar, label: 'Fixture' },
  { to: '/grupos', icon: LayoutGrid, label: 'Grupos' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
  { to: '/mis-predicciones', icon: Star, label: 'Mis apuestas', authRequired: true },
  { to: '/perfil', icon: User, label: 'Perfil', authRequired: true },
]

export function BottomNav() {
  const { user } = useAuth()

  const visibleItems = navItems.filter(item => !item.authRequired || user)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
      <div className="flex items-stretch">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
        {!user && (
          <NavLink
            to="/auth"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text-secondary'
              }`
            }
          >
            <User size={20} />
            <span>Ingresar</span>
          </NavLink>
        )}
      </div>
    </nav>
  )
}
