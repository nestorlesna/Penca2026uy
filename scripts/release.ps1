# Uso: .\scripts\release.ps1 1.0.7 "Novedades de esta versión"
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [string]$ReleaseNotes = "Nueva versión disponible"
)

$GradlePath   = "android/app/build.gradle"
$VersionJson  = "version.json"
$GithubOwner  = "nestorlesna"
$GithubRepo   = "Penca2026uy"
$ApkName      = "Penca2026uy.apk"

# ── 1. build.gradle ────────────────────────────────────────────────────────────
$Gradle = Get-Content $GradlePath -Raw

$CurrentCode = [regex]::Match($Gradle, 'versionCode\s+(\d+)').Groups[1].Value
$NewCode     = [int]$CurrentCode + 1

Write-Host "build.gradle: versionCode $CurrentCode → $NewCode  |  versionName → $Version"

$Gradle = $Gradle -replace "versionCode\s+$CurrentCode",      "versionCode $NewCode"
$Gradle = $Gradle -replace 'versionName\s+"[^"]*"',           "versionName `"$Version`""
Set-Content $GradlePath $Gradle -NoNewline -Encoding UTF8

# ── 2. version.json ────────────────────────────────────────────────────────────
$ApkUrl = "https://github.com/$GithubOwner/$GithubRepo/releases/download/v$Version/$ApkName"

$Json = [ordered]@{
    version_code   = $NewCode
    version_name   = $Version
    apk_url        = $ApkUrl
    release_notes  = $ReleaseNotes
    force_update   = $false
} | ConvertTo-Json

Set-Content $VersionJson $Json -NoNewline -Encoding UTF8
Write-Host "version.json: version_code=$NewCode  version_name=$Version"
Write-Host "             apk_url=$ApkUrl"

# ── 3. Commit, tag y push ──────────────────────────────────────────────────────
git add $GradlePath $VersionJson
git commit -m "chore: bump version to $Version"
git tag "v$Version"
git push origin HEAD
git push origin "v$Version"

Write-Host ""
Write-Host "Release v$Version iniciado. Ver progreso en:"
Write-Host "https://github.com/$GithubOwner/$GithubRepo/actions"
