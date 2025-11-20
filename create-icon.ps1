# Script para criar icon.ico transparente a partir de icon.png
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pngPath = Join-Path $scriptDir "icon.png"
$iconDir = Join-Path $scriptDir "icon"
$icoPath = Join-Path $iconDir "icon.ico"

# Verificar se icon.png existe
if (-not (Test-Path $pngPath)) {
    Write-Host "ERRO: icon.png nao encontrado na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Criar pasta icon se nao existir
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir | Out-Null
}

Write-Host "Criando icone transparente a partir de icon.png..." -ForegroundColor Yellow

# Tentar usar ImageMagick se disponivel
$magick = Get-Command magick -ErrorAction SilentlyContinue
if ($magick) {
    Write-Host "Usando ImageMagick..." -ForegroundColor Green
    & magick $pngPath -define icon:auto-resize=256,128,96,64,48,32,16 $icoPath
    if (Test-Path $icoPath) {
        Write-Host "OK: Icone criado com sucesso em: $icoPath" -ForegroundColor Green
        exit 0
    }
}

# Fallback: Usar Python com Pillow
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    $python = Get-Command python3 -ErrorAction SilentlyContinue
}

if ($python) {
    Write-Host "Tentando Python com Pillow..." -ForegroundColor Yellow
    
    # Verificar se Pillow esta instalado
    $pillowInstalled = $false
    try {
        & $python -c "import PIL" 2>$null
        $pillowInstalled = $true
    } catch {
        $pillowInstalled = $false
    }
    
    if (-not $pillowInstalled) {
        Write-Host "Instalando Pillow..." -ForegroundColor Yellow
        & $python -m pip install --quiet Pillow 2>$null
    }
    
    # Criar script Python temporario
    $tempScript = Join-Path $env:TEMP "create_icon_$(Get-Random).py"
    @"
from PIL import Image
import sys

img = Image.open(r'$pngPath')
if img.mode != 'RGBA':
    img = img.convert('RGBA')

# Criar ICO com multiplos tamanhos
sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
img.save(r'$icoPath', format='ICO', sizes=sizes)
print("OK")
"@ | Out-File -FilePath $tempScript -Encoding UTF8
    
    & $python $tempScript 2>$null
    Remove-Item $tempScript -ErrorAction SilentlyContinue
    
    if (Test-Path $icoPath) {
        Write-Host "OK: Icone criado com sucesso em: $icoPath" -ForegroundColor Green
        exit 0
    }
}

# Ultimo recurso: PowerShell com .NET (cria ICO basico com transparencia)
Write-Host "Usando PowerShell com .NET (basico)..." -ForegroundColor Yellow
try {
    Add-Type -AssemblyName System.Drawing
    
    $img = [System.Drawing.Image]::FromFile($pngPath)
    
    # Criar bitmap com canal alpha para transparencia
    $bitmap = New-Object System.Drawing.Bitmap(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Desenhar imagem preservando transparencia
    $graphics.DrawImage($img, 0, 0, 256, 256)
    $graphics.Dispose()
    
    # Salvar como PNG primeiro (preserva transparencia)
    $tempPng = Join-Path $env:TEMP "icon_temp_$(Get-Random).png"
    $bitmap.Save($tempPng, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Copiar para .ico (jpackage aceita PNG renomeado como ICO)
    Copy-Item $tempPng $icoPath -Force
    
    # Limpar
    $img.Dispose()
    $bitmap.Dispose()
    Remove-Item $tempPng -ErrorAction SilentlyContinue
    
    if (Test-Path $icoPath) {
        Write-Host "OK: Icone criado (basico) em: $icoPath" -ForegroundColor Green
        Write-Host "AVISO: Para melhor qualidade, instale ImageMagick ou Python com Pillow" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "ERRO: Falha ao criar icone: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "ERRO: Nao foi possivel criar o icone!" -ForegroundColor Red
exit 1

