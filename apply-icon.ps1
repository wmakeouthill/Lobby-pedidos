# Script para aplicar ícone ao executável usando ResourceHacker
# Uso: .\apply-icon.ps1

$ErrorActionPreference = "Stop"

Write-Host "Aplicando icone ao executavel..." -ForegroundColor Cyan
Write-Host ""

$resourceHacker = "C:\Program Files (x86)\Resource Hacker\ResourceHacker.exe"
$exePath = Join-Path $PSScriptRoot "dist\Lobby Pedidos\Lobby Pedidos.exe"
$iconPath = Join-Path $PSScriptRoot "icon\icon.ico"

# Verificar se os arquivos existem
if (-not (Test-Path $resourceHacker)) {
    Write-Host "ERRO: ResourceHacker nao encontrado em: $resourceHacker" -ForegroundColor Red
    Write-Host "Ajuste o caminho do ResourceHacker no script se necessario." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $exePath)) {
    Write-Host "ERRO: Executavel nao encontrado: $exePath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $iconPath)) {
    Write-Host "ERRO: Icone nao encontrado: $iconPath" -ForegroundColor Red
    exit 1
}

Write-Host "ResourceHacker: $resourceHacker" -ForegroundColor Gray
Write-Host "Executavel: $exePath" -ForegroundColor Gray
Write-Host "Icone: $iconPath" -ForegroundColor Gray
Write-Host ""

# Verificar se o executável está em execução e fechar se necessário
$exeName = Split-Path $exePath -Leaf
$exeBaseName = [System.IO.Path]::GetFileNameWithoutExtension($exeName)
$runningProcesses = Get-Process -Name $exeBaseName -ErrorAction SilentlyContinue
if ($runningProcesses) {
    Write-Host "AVISO: O executavel esta em execucao. Fechando processo..." -ForegroundColor Yellow
    $runningProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Verificar se o arquivo está bloqueado por outro processo
$fileInUse = $false
try {
    $file = [System.IO.File]::Open($exePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
    $file.Close()
} catch {
    $fileInUse = $true
    Write-Host "AVISO: Arquivo pode estar em uso. Aguardando..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

# Criar backup do executável original
$backupPath = "$exePath.backup"
if (Test-Path $backupPath) {
    Remove-Item $backupPath -Force
}
Copy-Item $exePath $backupPath
Write-Host "Backup criado: $backupPath" -ForegroundColor Green

# Criar executável temporário com ícone
$tempExe = "$exePath.tmp"

try {
    # ResourceHacker comando:
    # -open: arquivo a modificar
    # -save: arquivo de saída
    # -action: ação a realizar (addoverwrite = adicionar/sobrescrever)
    # -res: recurso a adicionar (ícone)
    # -mask: máscara para identificar o recurso (ICONGROUP,1,0 = grupo de ícones principal)
    
    Write-Host "Aplicando icone..." -ForegroundColor Cyan
    
    # Aplicar ícone em MAINICON:0 (primeiro ícone)
    Write-Host "Aplicando icone em MAINICON:0..." -ForegroundColor Gray
    $args1 = @("-open", $exePath, "-save", $tempExe, "-action", "addoverwrite", "-res", $iconPath, "-mask", "ICONGROUP,MAINICON,0,1033")
    $result1 = & $resourceHacker $args1 2>&1
    
    # Se o arquivo foi criado, aplicar também em MAINICON:1 (segundo ícone)
    if (Test-Path $tempExe) {
        Write-Host "Aplicando icone em MAINICON:1..." -ForegroundColor Gray
        $tempExe2 = "$exePath.tmp2"
        $args2 = @("-open", $tempExe, "-save", $tempExe2, "-action", "addoverwrite", "-res", $iconPath, "-mask", "ICONGROUP,MAINICON,1,1033")
        $result2 = & $resourceHacker $args2 2>&1
        
        if (Test-Path $tempExe2) {
            Remove-Item $tempExe -Force
            Move-Item $tempExe2 $tempExe -Force
            Write-Host "Icone aplicado em ambos recursos (MAINICON:0 e MAINICON:1)" -ForegroundColor Green
        } else {
            Write-Host "MAINICON:0 aplicado, MAINICON:1 nao foi encontrado (normal)" -ForegroundColor Yellow
        }
    }
    
    $exitCode = $LASTEXITCODE
    
    if ($result1) {
        Write-Host "Output do ResourceHacker:" -ForegroundColor Gray
        $result1 | ForEach-Object { Write-Host $_ }
    }
    
    if ($LASTEXITCODE -eq 0 -and (Test-Path $tempExe)) {
        # Substituir o executável original pelo novo com ícone
        Remove-Item $exePath -Force
        Move-Item $tempExe $exePath -Force
        Write-Host ""
        Write-Host "OK: Icone aplicado com sucesso!" -ForegroundColor Green
        Write-Host "Executavel atualizado: $exePath" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "ERRO: Falha ao aplicar icone" -ForegroundColor Red
        Write-Host "O executavel original foi preservado." -ForegroundColor Yellow
        if (Test-Path $backupPath) {
            Copy-Item $backupPath $exePath -Force
        }
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERRO: Excecao ao aplicar icone: $_" -ForegroundColor Red
    Write-Host "O executavel original foi preservado." -ForegroundColor Yellow
    if (Test-Path $backupPath) {
        Copy-Item $backupPath $exePath -Force
    }
    exit 1
} finally {
    # Limpar arquivo temporário se existir
    if (Test-Path $tempExe) {
        Remove-Item $tempExe -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "Limpando cache de icones do Windows..." -ForegroundColor Cyan

# Limpar cache de ícones do Windows para forçar atualização
try {
    # Parar processo do Explorer (reinicie automaticamente)
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Start-Process explorer
    Write-Host "Cache de icones limpo! Explorer reiniciado." -ForegroundColor Green
} catch {
    Write-Host "Nao foi possivel limpar cache automaticamente." -ForegroundColor Yellow
    Write-Host "Para limpar manualmente:" -ForegroundColor Yellow
    Write-Host "1. Feche todas as janelas do Explorer" -ForegroundColor Gray
    Write-Host "2. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)" -ForegroundColor Gray
    Write-Host "3. Finalize o processo 'Windows Explorer'" -ForegroundColor Gray
    Write-Host "4. No Gerenciador de Tarefas, Arquivo -> Executar nova tarefa -> explorer.exe" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Concluido!" -ForegroundColor Green
Write-Host "O icone foi aplicado ao executavel." -ForegroundColor Green
Write-Host "Se ainda nao aparecer, reinicie o Windows ou limpe o cache manualmente." -ForegroundColor Yellow

