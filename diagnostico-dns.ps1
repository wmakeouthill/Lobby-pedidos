# Script de diagnóstico completo para problemas de DNS e conectividade
# Execute: PowerShell -ExecutionPolicy Bypass -File diagnostico-dns.ps1

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$dnsEntry = "fila.experimentaai"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNÓSTICO DE DNS E CONECTIVIDADE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar arquivo hosts
Write-Host "1. Verificando arquivo hosts..." -ForegroundColor Yellow
if (-not (Test-Path $hostsPath)) {
    Write-Host "   ❌ ERRO: Arquivo hosts não encontrado em $hostsPath" -ForegroundColor Red
} else {
    Write-Host "   ✅ Arquivo hosts encontrado" -ForegroundColor Green
    
    try {
        $hostsContent = Get-Content $hostsPath -ErrorAction Stop
        $entry = $hostsContent | Where-Object { $_ -match "fila\.experimentaai" } | Select-Object -First 1
        
        if ($entry) {
            Write-Host "   ✅ Entrada encontrada: $entry" -ForegroundColor Green
            if ($entry -match "^\s*(\d+\.\d+\.\d+\.\d+)\s+fila\.experimentaai") {
                $ip = $matches[1]
                Write-Host "   📍 IP configurado: $ip" -ForegroundColor Cyan
            }
        } else {
            Write-Host "   ❌ Entrada para fila.experimentaai NÃO encontrada" -ForegroundColor Red
            Write-Host "   💡 Execute: PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1 (como Administrador)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ❌ Erro ao ler arquivo hosts: $_" -ForegroundColor Red
    }
}

Write-Host ""

# 2. Testar resolução DNS
Write-Host "2. Testando resolução DNS..." -ForegroundColor Yellow
try {
    $result = [System.Net.Dns]::GetHostAddresses($dnsEntry)
    $resolvedIP = $result[0].IPAddressToString
    Write-Host "   ✅ DNS resolve para: $resolvedIP" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ERRO: Não foi possível resolver $dnsEntry" -ForegroundColor Red
    Write-Host "   💡 Execute: PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1 (como Administrador)" -ForegroundColor Yellow
    Write-Host "   💡 Depois execute: ipconfig /flushdns" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar se o servidor está rodando
Write-Host "3. Verificando se o servidor está rodando..." -ForegroundColor Yellow
try {
    $listening = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 80 }
    if ($listening) {
        $serverIP = ($listening | Select-Object -First 1).LocalAddress
        Write-Host "   ✅ Servidor escutando na porta 80" -ForegroundColor Green
        Write-Host "   📍 Endereço: $serverIP" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  Nenhum servidor escutando na porta 80" -ForegroundColor Yellow
        Write-Host "   💡 Certifique-se de que o backend está rodando" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️  Não foi possível verificar porta 80: $_" -ForegroundColor Yellow
}

Write-Host ""

# 4. Testar conectividade HTTP
Write-Host "4. Testando conectividade HTTP..." -ForegroundColor Yellow
$testUrls = @(
    "http://fila.experimentaai",
    "http://localhost",
    "http://127.0.0.1"
)

foreach ($url in $testUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host "   ✅ $url - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode) {
            Write-Host "   ⚠️  $url - Status: $statusCode (servidor respondeu)" -ForegroundColor Yellow
        } else {
            Write-Host "   ❌ $url - Erro: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# 5. Verificar cache DNS
Write-Host "5. Informações sobre cache DNS..." -ForegroundColor Yellow
Write-Host "   💡 Para limpar cache DNS, execute: ipconfig /flushdns" -ForegroundColor Cyan
Write-Host "   💡 Execute como Administrador para garantir que funcione" -ForegroundColor Cyan

Write-Host ""

# 6. Resumo e recomendações
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMO E RECOMENDAÇÕES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se o DNS não está funcionando:" -ForegroundColor Yellow
Write-Host "  1. Execute como Administrador: PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1" -ForegroundColor White
Write-Host "  2. Execute: ipconfig /flushdns" -ForegroundColor White
Write-Host "  3. Limpe o cache do navegador (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  4. Reinicie o navegador" -ForegroundColor White
Write-Host ""
Write-Host "Se o servidor não está respondendo:" -ForegroundColor Yellow
Write-Host "  1. Verifique se o backend está rodando" -ForegroundColor White
Write-Host "  2. Verifique se a porta 80 está disponível (pode precisar de privilégios de administrador)" -ForegroundColor White
Write-Host "  3. Verifique os logs do backend para erros" -ForegroundColor White
Write-Host ""

