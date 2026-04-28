import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

interface Props {
  versionName: string
  apkUrl: string
  releaseNotes: string
  forceUpdate: boolean
  onDismiss: () => void
}

export function UpdateModal({ versionName, apkUrl, releaseNotes, forceUpdate, onDismiss }: Props) {

  async function handleDownload() {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: apkUrl })
    } else {
      window.open(apkUrl, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-10">
      <div className="card w-full max-w-sm p-5 space-y-4">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Nueva versión disponible</h2>
          <p className="text-primary text-sm font-medium mt-0.5">v{versionName}</p>
        </div>

        {releaseNotes && (
          <p className="text-text-secondary text-sm">{releaseNotes}</p>
        )}

        <p className="text-text-muted text-xs">
          Se abrirá el navegador para descargar e instalar la actualización.
        </p>

        <button
          className="btn-primary w-full"
          onClick={handleDownload}
        >
          Descargar actualización
        </button>

        {!forceUpdate && (
          <button
            className="w-full text-center text-text-muted text-sm py-1 hover:text-text-secondary transition-colors"
            onClick={onDismiss}
          >
            Ahora no
          </button>
        )}
      </div>
    </div>
  )
}
