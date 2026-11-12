# Captures pages of GTA 6 HQ with headless Edge.
#   1. Start the server:   cargo run --release -- --serve --port 4600
#   2. Every page:         powershell -File docs\ui-redesign\capture.ps1 -Prefix after
#      Some pages, another size:
#                          powershell -File docs\ui-redesign\capture.ps1 -Only home,map -Width 1920 -Height 1080
param(
    [string]$Prefix = 'after',
    [int]$Width = 1366,
    [int]$Height = 768,
    [string]$Base = 'http://127.0.0.1:4600',
    [string[]]$Only = @()
)

$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge was not found.' }

$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$out = Join-Path $PSScriptRoot 'screenshots'
New-Item -ItemType Directory -Force $out | Out-Null
$profile = Join-Path $env:TEMP 'gta6hq-capture-profile'

$pages = [ordered]@{
    'home'         = '#/'
    'encyclopedia' = '#/wiki'
    'characters'   = '#/characters'
    'character'    = '#/characters/jason-duval'
    'locations'    = '#/locations'
    'location'     = '#/locations/vice-city'
    'vehicles'     = '#/vehicles'
    'entry'        = '#/wiki/wildlife/alligator'
    'map'          = '#/map'
    'media'        = '#/media'
    'search'       = '#/search?q=keys'
    'intel'        = '#/intel'
    'manual-cover' = '#/manual'
    'manual-law'   = '#/manual/law-enforcement/1'
    'manual-stars' = '#/manual/law-enforcement/2'
    'manual-heat'  = '#/manual/law-enforcement/5'
    'manual-clues' = '#/manual/law-enforcement/10'
    'manual-places' = '#/manual/leonida/1'
    'manual-sources' = '#/manual/sources/1'
    'manual-search' = '#/manual/search?q=heat'
}

foreach ($name in $pages.Keys) {
    if ($Only.Count -and $Only -notcontains $name) { continue }
    $file = Join-Path $out "$Prefix-$name-${Width}x$Height.png"
    $url = "$Base/?nosplash$($pages[$name])"
    & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run "--user-data-dir=$profile" `
        "--window-size=$Width,$Height" --virtual-time-budget=6000 "--screenshot=$file" $url 2>$null | Out-Null
    Start-Sleep -Milliseconds 300
    if (Test-Path $file) { "{0,-14} {1} bytes" -f $name, (Get-Item $file).Length } else { "{0,-14} FAILED" -f $name }
}
