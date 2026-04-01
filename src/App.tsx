import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { Layout } from './components/layout/Layout'
import { FixturePage } from './pages/FixturePage'
import { GruposPage } from './pages/GruposPage'
import { RankingPage } from './pages/RankingPage'
import { MisPrediccionesPage } from './pages/MisPrediccionesPage'
import { PerfilPage } from './pages/PerfilPage'
import { AuthPage } from './pages/AuthPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UsuariosPage } from './pages/admin/UsuariosPage'
import { ResultadosPage } from './pages/admin/ResultadosPage'
import { ConfigPage } from './pages/admin/ConfigPage'
import { GrupoDetailPage } from './pages/GrupoDetailPage'
import { EquipoPage } from './pages/EquipoPage'
import { AyudaPage } from './pages/AyudaPage'
import { EquiposAdminPage } from './pages/admin/EquiposAdminPage'
import { PartidosAdminPage } from './pages/admin/PartidosAdminPage'
import { AuditoriaPage } from './pages/admin/AuditoriaPage'
import { TercerosPage } from './pages/admin/TercerosPage'
import { PosicionesGruposPage } from './pages/admin/PosicionesGruposPage'
import { CombinacionesPage } from './pages/admin/CombinacionesPage'
import { BracketPage } from './pages/BracketPage'
import { MasPuntosPage } from './pages/MasPuntosPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/fixture" replace />} />
            <Route path="fixture"           element={<FixturePage />} />
            <Route path="grupos"            element={<GruposPage />} />
            <Route path="grupos/:grupo"     element={<GrupoDetailPage />} />
            <Route path="equipos/:id"       element={<EquipoPage />} />
            <Route path="ranking"           element={<RankingPage />} />
            <Route path="mis-predicciones"  element={<MisPrediccionesPage />} />
            <Route path="perfil"            element={<PerfilPage />} />
            <Route path="auth"              element={<AuthPage />} />
            <Route path="ayuda"             element={<AyudaPage />} />
            <Route path="cuadro"            element={<BracketPage />} />
            <Route path="mas-puntos"        element={<MasPuntosPage />} />
            {/* Admin */}
            <Route path="admin/usuarios"    element={<UsuariosPage />} />
            <Route path="admin/resultados"  element={<ResultadosPage />} />
            <Route path="admin/config"      element={<ConfigPage />} />
            <Route path="admin/equipos"     element={<EquiposAdminPage />} />
            <Route path="admin/auditoria"   element={<AuditoriaPage />} />
            <Route path="admin/partidos"    element={<PartidosAdminPage />} />
            <Route path="admin/terceros"    element={<TercerosPage />} />
            <Route path="admin/posiciones-grupos" element={<PosicionesGruposPage />} />
            <Route path="admin/combinaciones"     element={<CombinacionesPage />} />
            <Route path="*"                 element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#141925',
            border: '1px solid #1E2535',
            color: '#F8FAFC',
          },
        }}
      />
    </QueryClientProvider>
  )
}
