export function Footer() {
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 text-center">
        <p className="text-text-muted text-xs leading-relaxed">
          &copy; {new Date().getFullYear()} PencaLes — Creado por Nestor Lesna
          <br />
          <a href="mailto:nestor.lesna@gmail.com" className="text-primary hover:underline">
            nestor.lesna@gmail.com
          </a>
        </p>

        <div className="mt-4 p-3 bg-surface-2 border border-border rounded-lg text-xs text-text-secondary leading-relaxed">
          <p className="font-medium text-text-primary mb-1">
            &iexcl;Esto es para divertirse! &iexcl;El premio? El glorioso honor de saber que sos el mejor.
          </p>
          <p className="mt-2">
            El administrador se reserva el derecho de dar de baja usuarios, grupos o cualquier contenido
            que no respete las normas básicas de convivencia. Acá venimos a pasarla bien.
          </p>
        </div>
      </div>
    </footer>
  )
}
