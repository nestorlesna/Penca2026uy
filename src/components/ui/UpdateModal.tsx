import { useState } from 'react'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { FileOpener } from '@capawesome-team/capacitor-file-opener'
import { Capacitor } from '@capacitor/core'

interface Props {
  versionName: string
  apkUrl: string
  releaseNotes: string
  forceUpdate: boolean
  onDismiss: () => void
}

export function UpdateModal({ versionName, apkUrl, releaseNotes, forceUpdate, onDismiss }: Props) {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState(false)

  async function handleDownload() {
    if (!Capacitor.isNativePlatform()) {
      window.open(apkUrl, '_blank')
      return
    }

    setError(false)
    setProgress(0)

    let progressListener: { remove: () => Promise<void> } | null = null

    try {
      progressListener = await Filesystem.addListener('progress', (event) => {
        if (event.contentLength > 0) {
          setProgress(Math.round((event.bytes / event.contentLength) * 100))
        }
      })

      const { path } = await Filesystem.downloadFile({
        url: apkUrl,
        path: `update_${versionName}.apk`,
        directory: Directory.Cache,
        progress: true,
      })

      setProgress(100)

      await FileOpener.openFile({
        path,
        mimeType: 'application/vnd.android.package-archive',
      })
    } catch {
      setError(true)
      setProgress(null)
    } finally {
      await progressListener?.remove()
    }
  }

  const downloading = progress !== null && progress < 100

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

        {downloading && (
          <div className="space-y-1">
            <div className="w-full bg-border rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-text-muted text-xs text-right">{progress}%</p>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm">Error al descargar. Intentá de nuevo.</p>
        )}

        <button
          className="btn-primary w-full disabled:opacity-50"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? 'Descargando...' : 'Descargar actualización'}
        </button>

        {!forceUpdate && !downloading && (
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

