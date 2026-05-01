import { QRCodeSVG } from 'qrcode.react'
import { Download, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const APK_URL = 'https://github.com/nestorlesna/Penca2026uy/releases/download/v1.1.0/Penca2026uy.apk'

export function DescargarAppPage() {
  const apkUrl = APK_URL

  return (
    <div className="max-w-md mx-auto">
      <Link to="/perfil" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors">
        <ArrowLeft size={14} /> Volver al perfil
      </Link>

      <h1 className="text-xl font-bold text-text-primary mb-2">Descargar aplicación</h1>
      <p className="text-sm text-text-secondary mb-6">
        Escaneá el código QR con tu celular para descargar la app de PencaLes 2026.
      </p>

      <div className="card p-8 flex flex-col items-center">
        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG
            value={apkUrl}
            size={220}
            level="H"
            includeMargin
          />
        </div>

        <a
          href={apkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-6 flex items-center gap-2"
        >
          <Download size={16} />
          Descargar APK
        </a>

        <p className="text-xs text-text-muted mt-4">
          Versión 1.1.0
        </p>
      </div>
    </div>
  )
}
