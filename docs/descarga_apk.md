# Flujo de detección y actualización de APK

Descripción completa del ciclo: desde que se publica una nueva versión en GitHub hasta que el usuario instala el APK en su dispositivo Android.

---

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `src/config/version.ts` | Versión actual de la app y URL de la API de GitHub |
| `src/hooks/useUpdateCheck.ts` | Lógica de detección, descarga y apertura del APK |
| `src/components/UpdateModal.tsx` | Modal de UI que muestra el aviso, progreso y errores |
| `src/App.tsx` | Componente `UpdateChecker` que conecta hook y modal |
| `.github/workflows/release-apk.yml` | CI/CD que construye y publica el APK en GitHub Releases |

---

## 1. Publicación en GitHub (CI/CD)

**Archivo:** `.github/workflows/release-apk.yml`

Se dispara automáticamente cuando se hace push de un tag con formato `v*` (ej. `v1.0.15`).

Pasos del workflow:
1. Checkout del código.
2. Instala dependencias (`npm ci`) y hace build web (`npm run build`).
3. Sincroniza Capacitor (`npx cap sync android`).
4. Configura Java 21 y cachea Gradle.
5. Decodifica el keystore desde el secret `KEYSTORE_BASE64`.
6. Compila el APK firmado con `./gradlew assembleRelease`.
7. Renombra el APK a `CrossFitLes.apk`.
8. Crea un GitHub Release con el tag, nombre `CrossFitLes vX.Y.Z` y adjunta el APK como asset.

El asset queda disponible en:
```
https://github.com/nestorlesna/CrossFitLes/releases/latest
```

---

## 2. Configuración de versión local

**Archivo:** `src/config/version.ts`

```ts
export const APP_VERSION = '1.0.14';  // versión instalada en el dispositivo

const GITHUB_OWNER = 'nestorlesna';
const GITHUB_REPO  = 'CrossFitLes';
export const VERSION_CHECK_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
```

- `APP_VERSION` debe mantenerse sincronizada con `versionName` en `android/app/build.gradle`.
- `VERSION_CHECK_URL` apunta al endpoint de la API de GitHub que devuelve la última release.

---

## 3. Detección de nueva versión

**Archivo:** `src/hooks/useUpdateCheck.ts` — función `useUpdateCheck()`

### Cuándo se ejecuta
- Una sola vez por sesión (`checked.current = true` evita re-chequeos).
- Solo en plataforma nativa Android (`Capacitor.isNativePlatform()`).
- En web/browser no hace nada.

### Qué hace
```
fetch(VERSION_CHECK_URL)
  └─ GET https://api.github.com/repos/nestorlesna/CrossFitLes/releases/latest
       → { tag_name: "v1.0.15", assets: [{ name: "CrossFitLes.apk", browser_download_url: "..." }] }
```

1. Extrae `tag_name` y lo normaliza (quita el prefijo `v`).
2. Busca en `assets` el archivo que termina en `.apk`.
3. Compara versiones con `semverGt(serverVersion, APP_VERSION)`:
   - Compara Major → Minor → Patch.
   - Si la versión del servidor es mayor, guarda `updateInfo` en el estado.
4. Si hay error de red, lo ignora silenciosamente (sin toasts ni crashes).

### Estado expuesto
```ts
{
  updateInfo:    { version: string; downloadUrl: string } | null,
  downloading:   boolean,
  progress:      number,   // 0–100
  installError:  boolean,
  startDownload: () => Promise<void>,
  dismiss:       () => void,
}
```

---

## 4. Modal de aviso al usuario

**Archivo:** `src/App.tsx` — componente `UpdateChecker`

```tsx
function UpdateChecker() {
  const { updateInfo, downloading, progress, installError, startDownload, dismiss } = useUpdateCheck();
  if (!updateInfo) return null;
  return (
    <UpdateModal
      version={updateInfo.version}
      downloading={downloading}
      progress={progress}
      installError={installError}
      onUpdate={startDownload}
      onDismiss={dismiss}
    />
  );
}
```

`UpdateChecker` se monta dentro de `<DbProvider>` en `App`, por lo que se ejecuta una vez que la base de datos está lista.

---

## 5. UI del modal

**Archivo:** `src/components/UpdateModal.tsx`

El modal ocupa toda la pantalla (`fixed inset-0 z-50`) con fondo oscuro y aparece anclado en la parte inferior (`items-end`).

### Estado 1 — Aviso inicial
- Ícono `RefreshCw` + título "Nueva versión disponible" + versión.
- Botón **"Más tarde"** → llama `onDismiss`, cierra el modal.
- Botón **"Actualizar"** → llama `onUpdate` → inicia descarga.

### Estado 2 — Descargando
- Barra de progreso animada con porcentaje (`0%`→`100%`).
- Botón de cierre y botones de acción desaparecen mientras descarga.
- Mensaje "No cierres la app".

### Estado 3 — Error de instalación (`installError = true`)
- Aviso amarillo: "Se abrió el navegador para descargar la APK."
- Solo aparece el botón "Más tarde".

---

## 6. Descarga e instalación

**Archivo:** `src/hooks/useUpdateCheck.ts` — función `startDownload()`

### Flujo principal (plugin disponible)

```
startDownload()
  │
  ├─ import('@capacitor-community/file-opener')  ← carga dinámica
  │
  ├─ Filesystem.addListener('progress', handler) ← registra listener de progreso
  │
  ├─ Filesystem.downloadFile({
  │    url: downloadUrl,
  │    path: 'crossfitles-update.apk',
  │    directory: Directory.Cache,
  │    progress: true,
  │  })
  │    → actualiza setProgress() en tiempo real
  │
  ├─ handle.remove()  ← desuscribe listener
  │
  └─ fileOpener.open({
       filePath: result.path,
       contentType: 'application/vnd.android.package-archive',
     })
       → Android abre el instalador del sistema
```

El APK se guarda en el directorio **Cache** del dispositivo como `crossfitles-update.apk`.

### Fallback (plugin no instalado o error)

Si `@capacitor-community/file-opener` no está disponible o la descarga falla:

```
window.open(downloadUrl, '_system')
```

Abre el URL de descarga directamente en el browser externo. El usuario debe instalar el APK manualmente desde la carpeta de descargas.

En caso de error en descarga se activa `installError = true`, mostrando el aviso amarillo en el modal.

---

## 7. Instalación por el usuario

Una vez que el instalador del sistema Android se abre:

1. Android muestra la pantalla de confirmación de instalación del APK.
2. Si ya existe una versión instalada, Android la actualiza manteniendo los datos de la app.
3. Si es instalación nueva, requiere que el usuario tenga activado **"Instalar apps desconocidas"** en Configuración → Seguridad.

---

## Diagrama de flujo resumido

```
[Push tag vX.Y.Z]
       │
       ▼
[GitHub Actions]
  build + firma APK
  crea GitHub Release
       │
       ▼
[App arranca en Android]
       │
       ▼
[useUpdateCheck — 1 vez/sesión]
  GET /releases/latest
       │
  serverVersion > APP_VERSION?
       │ sí
       ▼
[UpdateModal — "Nueva versión disponible"]
  Usuario pulsa "Actualizar"
       │
       ▼
[Filesystem.downloadFile + progress]
  Barra de progreso 0→100%
       │
       ▼
[fileOpener.open — APK]
  Instalador de Android
       │
       ▼
[App actualizada]
```
