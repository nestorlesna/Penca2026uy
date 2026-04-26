# Uso: .\scripts\release.ps1 1.0.7 "Novedades de esta version"
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,

    [string]$ReleaseNotes = "Nueva version disponible"
)

$GradlePath   = "android/app/build.gradle"
$VersionJson  = "version.json"
$GithubOwner  = "nestorlesna"
$GithubRepo   = "Penca2026uy"
$ApkName      = "Penca2026uy.apk"
$Utf8NoBom    = [System.Text.UTF8Encoding]::new($false)

# -- 1. build.gradle -----------------------------------------------------------
$Gradle = Get-Content $GradlePath -Raw -Encoding UTF8

$CurrentCode = [regex]::Match($Gradle, 'versionCode\s+(\d+)').Groups[1].Value
$NewCode     = [int]$CurrentCode + 1

Write-Host "build.gradle: versionCode $CurrentCode -> $NewCode  |  versionName -> $Version"

$Gradle = $Gradle -replace "versionCode\s+$CurrentCode",      "versionCode $NewCode"
$Gradle = $Gradle -replace 'versionName\s+"[^"]*"',           "versionName `"$Version`""
[System.IO.File]::WriteAllText((Resolve-Path $GradlePath), $Gradle, $Utf8NoBom)

# -- 2. version.json -----------------------------------------------------------
$ApkUrl = "https://github.com/$GithubOwner/$GithubRepo/releases/download/v$Version/$ApkName"

$Json = [ordered]@{
    version_code   = $NewCode
    version_name   = $Version
    apk_url        = $ApkUrl
    release_notes  = $ReleaseNotes
    force_update   = $false
} | ConvertTo-Json

[System.IO.File]::WriteAllText((Resolve-Path $VersionJson), $Json, $Utf8NoBom)
Write-Host "version.json: version_code=$NewCode  version_name=$Version"
Write-Host "              apk_url=$ApkUrl"

# -- 3. Commit en develop ------------------------------------------------------
$CurrentBranch = git rev-parse --abbrev-ref HEAD
git add $GradlePath $VersionJson
git commit -m "chore: bump version to $Version"
git push origin $CurrentBranch
Write-Host "develop: push OK"

# -- 4. Merge a main y push (despliega en Vercel) ------------------------------
git checkout main
git merge $CurrentBranch --no-edit
git push origin main
Write-Host "main: push OK - Vercel deploy iniciado"

# -- 5. Tag sobre main y push (dispara GitHub Actions para el APK) -------------
git tag "v$Version"
git push origin "v$Version"
Write-Host "tag v${Version}: push OK - GitHub Actions build APK iniciado"

# -- 6. Volver a develop -------------------------------------------------------
git checkout $CurrentBranch

Write-Host ""
Write-Host "Release v$Version lanzado:"
Write-Host "  Web (Vercel)  -> https://penca2026uy.vercel.app"
Write-Host "  APK (Actions) -> https://github.com/$GithubOwner/$GithubRepo/actions"
