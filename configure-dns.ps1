# Script para configurar DNS local (Windows)
# Execute como Administrador: PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$dnsEntry = "fila.experimentaai"

Write-Host "Configurando DNS local para $dnsEntry..." -ForegroundColor Cyan

# Verificar se já existe
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue
if ($hostsContent -match "fila\.experimentaai") {
    Write-Host "A entrada já existe no arquivo hosts." -ForegroundColor Yellow
    Write-Host "Conteúdo atual:" -ForegroundColor Gray
    $hostsContent | Select-String "fila.experimentaai"
    Write-Host ""
    $resposta = Read-Host "Deseja atualizar? (S/N)"
    if ($resposta -ne "S" -and $resposta -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit
    }
    # Remover entrada existente
    $hostsContent = $hostsContent | Where-Object { $_ -notmatch "fila\.experimentaai" }
}

# Obter IP local
try {
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" 
    } | Select-Object -First 1).IPAddress
    
    if (-not $ipAddress) {
        # Fallback: obter IP via InetAddress
        $ipAddress = (Test-Connection -ComputerName $env:COMPUTERNAME -Count 1).IPv4Address.IPAddressToString
    }
} catch {
    Write-Host "Erro ao obter IP. Usando 127.0.0.1 como padrão." -ForegroundColor Yellow
    $ipAddress = "127.0.0.1"
}

if (-not $ipAddress) {
    Write-Host "Não foi possível determinar o IP local. Por favor, insira manualmente:" -ForegroundColor Red
    $ipAddress = Read-Host "IP da máquina"
}

$newEntry = "$ipAddress    $dnsEntry"

# Adicionar nova entrada
try {
    # Fazer backup
    $backupPath = "$hostsPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $hostsPath $backupPath -Force
    Write-Host "Backup criado: $backupPath" -ForegroundColor Green
    
    # Adicionar entrada
    Add-Content -Path $hostsPath -Value $newEntry -Force
    Write-Host "DNS configurado com sucesso!" -ForegroundColor Green
    Write-Host "Entrada adicionada: $newEntry" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Agora você pode acessar o sistema em:" -ForegroundColor Yellow
    Write-Host "  http://fila.experimentaai" -ForegroundColor White
    Write-Host ""
    Write-Host "Nota: Pode levar alguns segundos para o DNS ser atualizado." -ForegroundColor Gray
} catch {
    Write-Host "Erro ao configurar DNS: $_" -ForegroundColor Red
    Write-Host "Certifique-se de executar como Administrador!" -ForegroundColor Yellow
    exit 1
}

