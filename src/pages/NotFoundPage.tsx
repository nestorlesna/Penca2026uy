import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <p className="text-6xl font-bold text-border mb-4">404</p>
      <h1 className="text-xl font-semibold text-text-primary mb-2">Página no encontrada</h1>
      <p className="text-text-secondary mb-6">Esta página no existe o fue movida.</p>
      <Link to="/fixture" className="btn-primary">
        Volver al fixture
      </Link>
    </div>
  )
}
