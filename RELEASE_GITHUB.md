# GitHub Releases — APK Distribution Guide

> Guía de implementación para proyectos React + Capacitor + Android.
> Exportable a cualquier proyecto de características similares.

---

## Contexto de referencia

Este documento está basado en el proyecto **CrossFit Session Tracker** con las siguientes características:

| Parámetro | Valor de referencia |
|-----------|---------------------|
| Framework | React 18 + TypeScript + Vite |
| Mobile wrapper | Capacitor 6 |
| App ID | `com.crossfitles.tracker` |
| App Name | `CrossFit Session Tracker` |
| Nombre del APK | `CrossFitLes.apk` |
| Java target | JDK 21 |
| `versionCode` actual | 11 |
| `versionName` actual | `1.0.13` |
| Archivo de versión | `android/app/build.gradle` |

Adaptar estos valores al proyecto destino antes de implementar.

---

## 1. Cómo funciona el flujo

```
Developer                GitHub                  Usuario final
    │                       │                         │
    ├─ git tag v1.0.14 ────►│                         │
    ├─ git push --tags ─────►│                         │
    │                       │ GitHub Actions dispara   │
    │                       ├─ npm install             │
    │                       ├─ npm run build           │
    │                       ├─ npx cap sync            │
    │                       ├─ ./gradlew assembleRelease│
    │                       ├─ Firma APK               │
    │                       ├─ Crea GitHub Release     │
    │                       └─ Sube APK al Release ───►│
    │                                                  ├─ App detecta nueva versión
    │                                                  ├─ Modal "Actualizar ahora"
    │                                                  ├─ Descarga APK en background
    │                                                  └─ Instala automáticamente
```

El trigger es un **tag de git con prefijo `v`**. Cada vez que se hace push de un tag `v*`, el workflow construye y publica automáticamente. La app detecta la nueva versión al arrancar y ofrece un botón de actualización directa.

---

## 2. Prerrequisitos

### 2.1 Keystore para firma del APK

Los APKs de Android deben estar firmados. Se necesita un archivo keystore. Si el proyecto ya tiene uno (por ejemplo, para publicar en Play Store), se reutiliza ese mismo.

**Generar un keystore nuevo** (solo si no existe):

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias <ALIAS_NAME> \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Guardar el archivo `.keystore` de forma segura. **No subir al repositorio.**

**Convertir a base64** para almacenarlo como secret de GitHub:

```bash
# Linux/Mac
base64 -i release.keystore | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore"))
```

### 2.2 Secrets de GitHub requeridos

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Contenido |
|--------|-----------|
| `KEYSTORE_BASE64` | Contenido del `.keystore` en base64 |
| `KEYSTORE_PASSWORD` | Password del keystore |
| `KEY_ALIAS` | Alias de la clave dentro del keystore |
| `KEY_PASSWORD` | Password de la clave (puede ser igual al del keystore) |

### 2.3 Carpeta `android/` en el repositorio

La carpeta `android/` generada por Capacitor **debe estar commiteada** en el repositorio. GitHub Actions hace checkout del repo y luego ejecuta `npx cap sync android` para copiar los assets web, pero no puede crear la carpeta desde cero.

Verificar que `.gitignore` **no excluya** la raíz de `android/`. Solo deben ignorarse los artefactos de build:

```
# Correcto — solo ignorar outputs de build
android/app/build/
android/.gradle/
android/build/

# Incorrecto — esto rompe el workflow
android/
```

Commitear la carpeta si aún no está en el repo:

```bash
git add android/
git commit -m "feat: add android native project"
git push
```

### 2.4 Permisos del workflow

En **Settings → Actions → General → Workflow permissions**: activar **"Read and write permissions"** para que el workflow pueda crear releases.

---

## 3. Configurar `android/app/build.gradle`

### 3.1 Firma con signingConfigs

Agregar `signingConfigs` que lean las variables de entorno inyectadas por el workflow:

```groovy
android {
    // ... configuración existente ...

    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_FILE") ?: "debug.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias System.getenv("KEY_ALIAS") ?: ""
            keyPassword System.getenv("KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release  // ← agregar esta línea
        }
    }
}
```

> **Nota:** En desarrollo local sin esas variables de entorno, el build de release fallará la firma pero el debug seguirá funcionando normalmente.

### 3.2 Nombre fijo del APK (recomendado)

Para que el APK salga del build ya con el nombre correcto y evitar el paso de renombrado en el workflow, agregar dentro del bloque `android {}`:

```groovy
android {
    // ... resto de la configuración ...

    applicationVariants.all { variant ->
        variant.outputs.all {
            outputFileName = "CrossFitLes.apk"  // ← nombre deseado del APK
        }
    }
}
```

Con esto, Gradle genera directamente `android/app/build/outputs/apk/release/CrossFitLes.apk` sin necesitar un `mv` posterior. El step 11 del workflow igual lo maneja correctamente en ambos casos.

---

## 4. El workflow de GitHub Actions

Archivo: `.github/workflows/release-apk.yml`

```yaml
name: Build & Release APK

on:
  push:
    tags:
      - 'v*'          # Dispara en cualquier tag que empiece con "v"

permissions:
  contents: write     # Necesario para crear GitHub Releases

jobs:
  build-apk:
    name: Build APK and Create Release
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout del código en el tag
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Configurar Node.js (≥22 requerido por Capacitor 8)
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      # 3. Instalar dependencias web
      # npm install en lugar de npm ci: el lock file generado en Windows no incluye
      # los binarios nativos de Linux (@emnapi/*) que sharp y otros paquetes nativos
      # requieren en el runner de Ubuntu. npm ci falla con "Missing from lock file".
      - name: Install dependencies
        run: npm install

      # 4. Build del proyecto web (Vite)
      - name: Build web app
        run: npm run build

      # 5. Sincronizar Capacitor (copia dist/ a android/app/src/main/assets)
      - name: Sync Capacitor
        run: npx cap sync android

      # 6. Configurar JDK 21
      - name: Setup Java JDK
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      # 7. Cache de Gradle para acelerar builds posteriores (~8 min → ~3 min)
      - name: Cache Gradle packages
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: |
            ${{ runner.os }}-gradle-

      # 8. Dar permisos de ejecución a Gradle wrapper
      - name: Make Gradle executable
        run: chmod +x android/gradlew

      # 9. Decodificar el keystore desde el secret
      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 --decode > android/app/release.keystore

      # 10. Build del APK release (firmado)
      - name: Build Release APK
        working-directory: android
        env:
          KEYSTORE_FILE: release.keystore
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: ./gradlew assembleRelease --no-daemon

      # 11. Encontrar el APK generado y renombrar si hace falta
      #     Se excluye el nombre destino del find para evitar "same file" error
      #     (si se configuró outputFileName en build.gradle, el APK ya tiene el nombre correcto)
      - name: Find and rename APK
        id: find_apk
        run: |
          APK_DEST="android/app/build/outputs/apk/release/CrossFitLes.apk"
          APK_SOURCE=$(find android/app/build/outputs/apk/release/ -name "*.apk" ! -name "CrossFitLes.apk" | head -1)
          if [ -n "$APK_SOURCE" ]; then
            mv "$APK_SOURCE" "$APK_DEST"
          fi
          echo "apk_path=$APK_DEST" >> $GITHUB_OUTPUT

      # 12. Extraer versión del tag (quita el prefijo "v")
      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      # 13. Crear GitHub Release y subir el APK
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          name: "CrossFitLes v${{ steps.version.outputs.version }}"
          tag_name: ${{ github.ref_name }}
          body: |
            ## Instalación

            1. Descargar **CrossFitLes.apk** desde los assets de abajo
            2. En Android: **Configuración → Seguridad → Instalar apps desconocidas** (activar para el navegador/explorador usado)
            3. Abrir el APK descargado e instalar
            4. Si ya tenías la app instalada, se actualizará automáticamente manteniendo tus datos

            ---
            *Build generado automáticamente desde el tag `${{ github.ref_name }}`*
          files: ${{ steps.find_apk.outputs.apk_path }}
          draft: false
          prerelease: false
```

---

## 5. Gestión de versiones

### Dónde vive la versión

El archivo canónico es `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 11       // ← entero, incrementar en cada release
    versionName "1.0.13" // ← string visible al usuario
}
```

**Reglas:**
- `versionCode` debe ser siempre mayor al anterior (Android no instala un APK con versionCode igual o menor al instalado)
- `versionName` es libre, pero seguir semver: `MAJOR.MINOR.PATCH`

La versión también vive en `src/config/version.ts` (ver sección 8) y debe mantenerse sincronizada.

### Proceso de release

```bash
# 1. Usar el script de release (ver sección 6) — actualiza ambos archivos de versión
.\scripts\release.ps1 1.0.14

# El workflow se dispara automáticamente en GitHub
```

> **Importante:** el tag puede pushearse desde cualquier rama — GitHub Actions toma el código del commit apuntado por el tag, no de una rama específica. Lo habitual es hacer el bump en `develop`, pushearlo a `develop`, y luego crear y pushear solo el tag.

---

## 6. Script de release — PowerShell (Windows)

El script actualiza `android/app/build.gradle` y `src/config/version.ts` en un solo paso, y luego hace commit + tag + push.

Crear `scripts/release.ps1`:

```powershell
# Uso: .\scripts\release.ps1 1.0.14
param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

$GradlePath    = "android/app/build.gradle"
$VersionTsPath = "src/config/version.ts"

# Set-Content con -Encoding UTF8 en PowerShell 5 escribe UTF-8 CON BOM, lo que
# rompe Gradle ("Unexpected character: '﻿'") y Vite ("stream did not contain valid UTF-8").
# [System.IO.File]::WriteAllText() con UTF8Encoding($false) escribe siempre sin BOM.
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# ── 1. build.gradle ────────────────────────────────────────────────────────────
$Content = Get-Content $GradlePath -Raw -Encoding UTF8

$CurrentCode = [regex]::Match($Content, 'versionCode\s+(\d+)').Groups[1].Value
$NewCode     = [int]$CurrentCode + 1

Write-Host "Bumping build.gradle: versionCode $CurrentCode → $NewCode, versionName → $Version"

$Content = $Content -replace "versionCode\s+$CurrentCode", "versionCode $NewCode"
$Content = $Content -replace 'versionName\s+"[^"]*"',      "versionName `"$Version`""
[System.IO.File]::WriteAllText((Resolve-Path $GradlePath), $Content, $Utf8NoBom)

# ── 2. src/config/version.ts ───────────────────────────────────────────────────
# APP_VERSION debe coincidir con versionName para que el sistema de actualización
# automática compare correctamente la versión instalada contra la del servidor.
$VTs = Get-Content $VersionTsPath -Raw -Encoding UTF8
$VTs = $VTs -replace "APP_VERSION = '[^']*'", "APP_VERSION = '$Version'"
[System.IO.File]::WriteAllText((Resolve-Path $VersionTsPath), $VTs, $Utf8NoBom)
Write-Host "Bumped src/config/version.ts: APP_VERSION → '$Version'"

# ── 3. Commit y tag ────────────────────────────────────────────────────────────
git add android/app/build.gradle src/config/version.ts
git commit -m "chore: bump version to $Version"
git tag "v$Version"
git push origin HEAD
git push origin "v$Version"

Write-Host "Release v$Version iniciado. Ver progreso en GitHub Actions."
```

```powershell
# Uso:
.\scripts\release.ps1 1.0.14
```

> **Nota:** El script actualiza dos archivos en simultáneo: `build.gradle` (para el APK firmado) y `version.ts` (para que la app detecte la nueva versión al comparar contra GitHub). Si se omite actualizar `version.ts`, los usuarios instalados nunca verán el modal de actualización porque la app creerá que ya tiene la versión más reciente.

---

## 7. Variables de entorno adicionales (si aplica)

Si la app usa variables de entorno en el build web (por ejemplo, Supabase keys en `.env`), agregarlas como secrets y pasarlas en el step de build:

```yaml
# En el step "Build web app" del workflow:
- name: Build web app
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  run: npm run build
```

Agregar los secrets correspondientes en GitHub igual que los del keystore.

---

## 8. Detección y descarga automática de actualizaciones en la app

La app consulta el endpoint público de GitHub al arrancar y, si hay una versión nueva, muestra un modal con botón de descarga e instalación directa. No requiere ir al navegador ni buscar el APK manualmente.

### 8.1 Dependencias necesarias

```bash
npm install @capacitor-community/file-opener
npx cap sync android
```

`@capacitor-community/file-opener` permite abrir el APK descargado directamente desde la app para lanzar el instalador del sistema. Si el plugin no está disponible, el hook cae en fallback abriendo la URL en el navegador externo.

### 8.2 Archivo de versión centralizado

Crear `src/config/version.ts`. **Este archivo es actualizado automáticamente por el script de release** (sección 6):

```typescript
// Versión actual — mantener sincronizada con versionName en android/app/build.gradle
export const APP_VERSION = '1.0.13';

// Repositorio GitHub donde se publican las releases con la APK
const GITHUB_OWNER = 'nestorlesna';        // ← reemplazar con el usuario/org
const GITHUB_REPO  = 'CrossFitLes';        // ← reemplazar con el repo
export const VERSION_CHECK_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
```

### 8.3 Hook `useUpdateCheck`

Crear `src/hooks/useUpdateCheck.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { APP_VERSION, VERSION_CHECK_URL } from '../config/version';

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
}

// Retorna true si a es estrictamente mayor que b (semver simple X.Y.Z)
function semverGt(a: string, b: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const [aMaj, aMin, aPat] = parse(a);
  const [bMaj, bMin, bPat] = parse(b);
  if (aMaj !== bMaj) return aMaj > bMaj;
  if (aMin !== bMin) return aMin > bMin;
  return aPat > bPat;
}

type FileOpenerPlugin = { open: (opts: { filePath: string; contentType: string }) => Promise<void> };

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installError, setInstallError] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    // Solo en Android nativo y una única vez por sesión
    if (!Capacitor.isNativePlatform() || checked.current) return;
    checked.current = true;

    (async () => {
      try {
        const res = await fetch(VERSION_CHECK_URL);
        if (!res.ok) return;

        const data = await res.json();
        const serverVersion = String(data.tag_name ?? '').replace(/^v/, '');
        if (!serverVersion) return;

        type GithubAsset = { name: string; browser_download_url: string };
        const apkAsset = (data.assets as GithubAsset[] | undefined)
          ?.find(a => a.name.toLowerCase().endsWith('.apk'));
        if (!apkAsset) return;

        if (semverGt(serverVersion, APP_VERSION)) {
          setUpdateInfo({ version: serverVersion, downloadUrl: apkAsset.browser_download_url });
        }
      } catch {
        // Fallos de red se ignoran silenciosamente
      }
    })();
  }, []);

  const startDownload = async () => {
    if (!updateInfo) return;
    setInstallError(false);

    // Intentar cargar @capacitor-community/file-opener (plugin opcional)
    let fileOpener: FileOpenerPlugin | null = null;
    try {
      const mod = await import('@capacitor-community/file-opener');
      fileOpener = mod.FileOpener;
    } catch {
      // Plugin no instalado — abrir URL en browser externo como fallback
      window.open(updateInfo.downloadUrl, '_system');
      setUpdateInfo(null);
      return;
    }

    if (!fileOpener) {
      window.open(updateInfo.downloadUrl, '_system');
      setUpdateInfo(null);
      return;
    }

    setDownloading(true);
    setProgress(0);

    const downloadUrl = updateInfo.downloadUrl;
    const handle = await Filesystem.addListener('progress', ({ url, bytes, contentLength }) => {
      if (url === downloadUrl && contentLength > 0) {
        setProgress(Math.round((bytes / contentLength) * 100));
      }
    });

    try {
      const result = await Filesystem.downloadFile({
        url: downloadUrl,
        path: 'app-update.apk',            // ← ajustar al nombre del proyecto
        directory: Directory.Cache,
        recursive: true,
        progress: true,
      });

      await handle.remove();

      if (!result.path) throw new Error('No se obtuvo la ruta del archivo descargado');

      await fileOpener.open({
        filePath: result.path,
        contentType: 'application/vnd.android.package-archive',
      });
    } catch {
      await handle.remove();
      setInstallError(true);
      window.open(downloadUrl, '_system');  // Fallback: abrir en browser externo
    } finally {
      setDownloading(false);
    }
  };

  return {
    updateInfo,
    downloading,
    progress,
    installError,
    startDownload,
    dismiss: () => setUpdateInfo(null),
  };
}
```

### 8.4 Componente `UpdateModal`

Crear `src/components/UpdateModal.tsx`. Muestra un modal bottom-sheet con barra de progreso durante la descarga y maneja el estado de error con fallback:

```tsx
import { Download, X, RefreshCw, AlertCircle } from 'lucide-react';

interface Props {
  version: string;
  downloading: boolean;
  progress: number;
  installError: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateModal({ version, downloading, progress, installError, onUpdate, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl p-5 space-y-4 shadow-2xl">

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary-900/40 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw size={20} className="text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">Nueva versión disponible</h2>
            <p className="text-sm text-gray-400 mt-0.5">Mi App v{version}</p>
          </div>
          {!downloading && (
            <button
              onClick={onDismiss}
              className="text-gray-600 p-1 hover:text-gray-400 transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {downloading ? (
          <div className="space-y-2 py-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Descargando actualización…</span>
              <span className="text-sm font-semibold text-primary-400">{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 text-center">No cierres la app</p>
          </div>
        ) : installError ? (
          <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2.5">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/80">
              Se abrió el navegador para descargar la APK. Instalá el archivo descargado desde tu carpeta de descargas.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-300">
            ¿Descargar e instalar la versión {version} ahora?
          </p>
        )}

        {!downloading && (
          <div className="flex gap-3 pt-1">
            <button
              onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <X size={15} />
              Más tarde
            </button>
            {!installError && (
              <button
                onClick={onUpdate}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 text-sm text-white font-semibold hover:bg-primary-500 active:bg-primary-700 transition-colors"
              >
                <Download size={15} />
                Actualizar
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
```

### 8.5 Integración en `App.tsx`

```tsx
import { UpdateModal } from './components/UpdateModal';
import { useUpdateCheck } from './hooks/useUpdateCheck';

// Componente separado para que el hook no contamine el árbol principal
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

export default function App() {
  return (
    <DbProvider>
      <UpdateChecker />
      {/* ... resto de la app ... */}
    </DbProvider>
  );
}
```

### 8.6 Flujo de actualización

| Estado | Comportamiento |
|--------|----------------|
| Nueva versión detectada | Modal con botón "Actualizar" y "Más tarde" |
| Usuario presiona "Actualizar" | Descarga en background con barra de progreso |
| Descarga completada | `file-opener` lanza el instalador nativo del sistema |
| Plugin no disponible / error de red | Fallback: abre la URL en el browser externo |

---

## 9. Checklist de implementación

```
[ ] Keystore generado y guardado en lugar seguro
[ ] Keystore convertido a base64
[ ] 4 secrets cargados en GitHub (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD)
[ ] Secrets de variables de entorno cargados (VITE_SUPABASE_URL, etc.) si aplica
[ ] Permisos del workflow configurados (Settings → Actions → General → Read and write)
[ ] signingConfigs agregado a android/app/build.gradle
[ ] applicationVariants.all con outputFileName configurado en android/app/build.gradle
[ ] Carpeta android/ commiteada en el repositorio (verificar .gitignore — ver sección 2.3)
[ ] Archivo .github/workflows/release-apk.yml creado
[ ] src/config/version.ts creado con APP_VERSION y VERSION_CHECK_URL correctos
[ ] @capacitor-community/file-opener instalado y sincronizado (npx cap sync android)
[ ] src/hooks/useUpdateCheck.ts creado
[ ] src/components/UpdateModal.tsx creado
[ ] UpdateChecker integrado en App.tsx
[ ] scripts/release.ps1 creado y funcional
[ ] Primer release de prueba ejecutado (.\scripts\release.ps1 0.0.1)
[ ] APK verificado: descargado e instalado en Android físico
[ ] Modal de actualización verificado: instalar versión anterior y confirmar que aparece el aviso
```

---

## 10. Troubleshooting frecuente

### "cannot access 'android/gradlew': No such file or directory"

La carpeta `android/` no está commiteada en el repositorio. El workflow hace checkout del repo y si `android/` no existe, `chmod +x android/gradlew` falla.

Solución: ver sección 2.3 — commitear la carpeta `android/` completa.

### "'CrossFitLes.apk' and 'CrossFitLes.apk' are the same file"

El APK ya salió del build con ese nombre exacto (por `outputFileName` en `build.gradle`), por lo que el `mv` intenta renombrarlo a sí mismo. La solución es excluir el nombre destino del `find`:

```bash
# En lugar de:
APK_SOURCE=$(find ... -name "*.apk" | head -1)

# Usar:
APK_SOURCE=$(find ... -name "*.apk" ! -name "CrossFitLes.apk" | head -1)
if [ -n "$APK_SOURCE" ]; then mv "$APK_SOURCE" "$APK_DEST"; fi
```

El workflow de la sección 4 ya incluye esta versión corregida.

### El APK no se instala ("App no instalada")
- El `versionCode` del APK nuevo debe ser **mayor** al instalado
- Si hubo un build de debug anterior, desinstalar la app primero

### El workflow falla en el paso de firma
- Verificar que `signingConfigs.release` esté referenciado en `buildTypes.release` en `build.gradle`
- Verificar que las variables de entorno `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` estén seteadas en el step de Gradle
- El path del keystore en el step es relativo a `android/app/` (donde se ejecuta Gradle)

### "Permission denied" al crear el release
- Verificar **Settings → Actions → General → Workflow permissions → Read and write permissions**

### El APK no tiene el contenido web actualizado
- Verificar que el step `npx cap sync android` esté **después** del build de Vite (`npm run build`)
- Capacitor copia `dist/` a los assets de Android en ese step

### Variables de entorno VITE_ no disponibles en el build
- Las variables `VITE_*` deben pasarse como `env:` en el step específico de build, no solo como secrets

### Build lento (más de 10 minutos)
- El cache de Gradle (step 7) reduce builds posteriores de ~8 min a ~3 min
- Verificar que el cache key incluya los archivos `.gradle` correctos

### "npm ci" falla con "Missing from lock file" (@emnapi/runtime, @emnapi/core)

El lock file fue generado en Windows y no incluye los binarios nativos de Linux que `sharp` y otras dependencias nativas requieren en el runner Ubuntu. `npm ci` exige el lock perfecto.

Solución: usar `npm install` en el step del workflow (ya corregido en la sección 4). `npm install` resuelve las dependencias de plataforma en tiempo de ejecución sin requerir lock exacto.

### "Unexpected character: '﻿'" en build.gradle (BOM)

`Set-Content -Encoding UTF8` en **PowerShell 5** escribe UTF-8 **con BOM** (`EF BB BF`). Gradle no acepta ese carácter al inicio del archivo.

Solución: usar `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))` en el script de release (ya corregido en la sección 6). Esta API escribe UTF-8 sin BOM tanto en PS5 como en PS7.

El mismo BOM en `version.json` rompe Vite con `"stream did not contain valid UTF-8"`.

### "npm warn EBADENGINE — required: { node: '>=22.0.0' }"

Capacitor 8 requiere Node.js ≥ 22. Si el workflow usa `node-version: '20'`, npm muestra el warning y puede fallar en la instalación de `@capacitor/cli`.

Solución: `node-version: '22'` en el step de Setup Node.js (ya corregido en la sección 4).

### El modal de actualización no aparece
- Confirmar que `APP_VERSION` en `src/config/version.ts` es menor al tag publicado en GitHub
- El hook solo actúa en plataforma nativa (`Capacitor.isNativePlatform()`); en el browser de desarrollo no se dispara
- Verificar que `VERSION_CHECK_URL` apunta al repositorio correcto

### El tag puede pushearse desde cualquier rama
- GitHub Actions dispara el workflow en el commit apuntado por el tag, independientemente de la rama
- Es válido hacer el bump en `develop`, pushear a `develop`, y luego crear y pushear solo el tag sin mergear a `master`
