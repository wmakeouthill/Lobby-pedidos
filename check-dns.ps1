# Script para verificar status do DNS local (Windows)
# Execute: PowerShell -ExecutionPolicy Bypass -File check-dns.ps1

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$dnsEntry = "fila.experimentaai"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verificando configuração DNS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar arquivo hosts
if (-not (Test-Path $hostsPath)) {
    Write-Host "ERRO: Arquivo hosts não encontrado em $hostsPath" -ForegroundColor Red
    exit 1
}

# Ler conteúdo do arquivo hosts
try {
    $hostsContent = Get-Content $hostsPath -ErrorAction Stop
} catch {
    Write-Host "ERRO ao ler arquivo hosts: $_" -ForegroundColor Red
    exit 1
}

# Procurar entrada
$entry = $hostsContent | Where-Object { $_ -match "fila\.experimentaai" } | Select-Object -First 1

if ($entry) {
    Write-Host "Status: Configurado" -ForegroundColor Green
    Write-Host "Entrada encontrada: $entry" -ForegroundColor Cyan
    
    # Extrair IP
    if ($entry -match "^\s*(\d+\.\d+\.\d+\.\d+)\s+fila\.experimentaai") {
        $ip = $matches[1]
        Write-Host "IP configurado: $ip" -ForegroundColor Yellow
        Write-Host ""
        
        # Testar resolução DNS
        Write-Host "Testando resolução DNS..." -ForegroundColor Cyan
        try {
            $result = [System.Net.Dns]::GetHostAddresses($dnsEntry)
            $resolvedIP = $result[0].IPAddressToString
            Write-Host "DNS resolve para: $resolvedIP" -ForegroundColor Green
            
            if ($resolvedIP -eq $ip) {
                Write-Host "Status: DNS configurado corretamente!" -ForegroundColor Green
            } else {
                Write-Host "AVISO: IP resolvido ($resolvedIP) difere do IP no hosts ($ip)" -ForegroundColor Yellow
                Write-Host "Execute: ipconfig /flushdns" -ForegroundColor Gray
            }
        } catch {
            Write-Host "ERRO: Não foi possível resolver o DNS" -ForegroundColor Red
            Write-Host "Execute o script configure-dns.ps1 como Administrador" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Status: NÃO configurado" -ForegroundColor Red
    Write-Host ""
    Write-Host "O DNS fila.experimentaai não está configurado." -ForegroundColor Yellow
    Write-Host "Para configurar, execute:" -ForegroundColor Yellow
    Write-Host "  PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1" -ForegroundColor White
    Write-Host "  (Execute como Administrador)" -ForegroundColor Gray
}

Write-Host ""

