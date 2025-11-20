# Script para configurar DNS local (Windows)
# Execute como Administrador: PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$dnsEntry = "fila.experimentaai"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando DNS local para $dnsEntry" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar permissões de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com o botão direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

# Verificar se o arquivo hosts existe
if (-not (Test-Path $hostsPath)) {
    Write-Host "Erro: Arquivo hosts não encontrado em $hostsPath" -ForegroundColor Red
    exit 1
}

# Ler conteúdo atual do arquivo hosts
try {
    $hostsContent = Get-Content $hostsPath -ErrorAction Stop
} catch {
    Write-Host "Erro ao ler arquivo hosts: $_" -ForegroundColor Red
    exit 1
}

# Verificar se já existe e obter IP atual se existir
$existingEntry = $hostsContent | Where-Object { $_ -match "fila\.experimentaai" } | Select-Object -First 1
$existingIP = $null

if ($existingEntry) {
    Write-Host "Entrada existente encontrada:" -ForegroundColor Yellow
    Write-Host "  $existingEntry" -ForegroundColor Gray
    Write-Host ""
    
    # Extrair IP da entrada existente
    if ($existingEntry -match "^\s*(\d+\.\d+\.\d+\.\d+)\s+fila\.experimentaai") {
        $existingIP = $matches[1]
        Write-Host "IP configurado atualmente: $existingIP" -ForegroundColor Gray
    }
    
    # Remover entrada existente para atualização
    $hostsContent = $hostsContent | Where-Object { $_ -notmatch "fila\.experimentaai" }
}

# Obter IP local da interface de rede principal (física, não virtual)
Write-Host ""
Write-Host "Obtendo IP local da máquina..." -ForegroundColor Cyan
try {
    $ipAddress = $null
    
    # Lista de interfaces virtuais para ignorar
    $virtualInterfaces = @("*WSL*", "*Hyper-V*", "*Docker*", "*VMware*", "*VirtualBox*", "*vEthernet*", "*Loopback*", "*Teredo*", "*isatap*")
    
    # Método 1: Obter IP da interface física principal (Ethernet ou Wi-Fi)
    $netConfigs = Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { 
        $_.IPv4Address -and 
        $_.NetAdapter.Status -eq 'Up' -and
        $_.IPv4Address.IPAddress -notlike "127.*" -and
        $_.IPv4Address.IPAddress -notlike "169.254.*"
    }
    
    # Filtrar interfaces virtuais e priorizar Ethernet/Wi-Fi
    $physicalAdapters = $netConfigs | Where-Object {
        $isVirtual = $false
        foreach ($virtual in $virtualInterfaces) {
            if ($_.NetAdapter.InterfaceAlias -like $virtual) {
                $isVirtual = $true
                break
            }
        }
        -not $isVirtual
    } | Sort-Object @{
        Expression = {
            # Priorizar Ethernet sobre Wi-Fi
            if ($_.NetAdapter.InterfaceAlias -like "*Ethernet*") { 1 }
            elseif ($_.NetAdapter.InterfaceAlias -like "*Wi-Fi*" -or $_.NetAdapter.InterfaceAlias -like "*Wireless*") { 2 }
            else { 3 }
        }
    }
    
    if ($physicalAdapters) {
        $ipAddress = ($physicalAdapters | Select-Object -First 1).IPv4Address.IPAddress
        Write-Host "Interface detectada: $(($physicalAdapters | Select-Object -First 1).NetAdapter.InterfaceAlias)" -ForegroundColor Gray
    }
    
    # Método 2: Se não encontrou interface física, tentar todas as interfaces (exceto virtuais conhecidas)
    if (-not $ipAddress) {
        $allAdapters = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { 
            $_.IPAddress -notlike "127.*" -and 
            $_.IPAddress -notlike "169.254.*"
        }
        
        $physicalIPs = $allAdapters | Where-Object {
            $isVirtual = $false
            foreach ($virtual in $virtualInterfaces) {
                if ($_.InterfaceAlias -like $virtual) {
                    $isVirtual = $true
                    break
                }
            }
            -not $isVirtual
        } | Sort-Object PrefixOrigin -Descending
        
        if ($physicalIPs) {
            $ipAddress = ($physicalIPs | Select-Object -First 1).IPAddress
        }
    }
    
    # Método 3: Última tentativa - usar IP que está escutando na porta 80 (se servidor estiver rodando)
    if (-not $ipAddress) {
        $listeningConnections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 80 }
        if ($listeningConnections) {
            $serverIP = ($listeningConnections | Select-Object -First 1).LocalAddress
            if ($serverIP -and $serverIP -ne "0.0.0.0" -and $serverIP -ne "::") {
                # Se está escutando em 0.0.0.0, tentar obter IP real
                if ($serverIP -eq "0.0.0.0") {
                    $ipConfig = Get-NetIPConfiguration | Where-Object { $_.IPv4Address -and $_.IPv4Address.IPAddress -notlike "127.*" -and $_.IPv4Address.IPAddress -notlike "169.254.*" } | Select-Object -First 1
                    if ($ipConfig) {
                        $ipAddress = $ipConfig.IPv4Address.IPAddress
                    }
                } else {
                    $ipAddress = $serverIP
                }
            }
        }
    }
    
    # Se ainda não encontrou, oferecer opções
    if (-not $ipAddress) {
        Write-Host "Não foi possível determinar o IP automaticamente." -ForegroundColor Yellow
        Write-Host "Opções:" -ForegroundColor Yellow
        Write-Host "  1. Usar 127.0.0.1 (localhost)" -ForegroundColor Gray
        Write-Host "  2. Inserir IP manualmente" -ForegroundColor Gray
        $opcao = Read-Host "Escolha (1 ou 2)"
        if ($opcao -eq "2") {
            $ipAddress = Read-Host "Digite o IP da máquina"
        } else {
            $ipAddress = "127.0.0.1"
        }
    }
    
    # Verificar se o IP detectado é diferente do existente
    if ($existingIP -and $ipAddress -eq $existingIP) {
        Write-Host "IP detectado ($ipAddress) é o mesmo já configurado. Nenhuma alteração necessária." -ForegroundColor Green
        Write-Host "Limpando cache DNS..." -ForegroundColor Cyan
        ipconfig /flushdns | Out-Null
        Write-Host "Cache DNS limpo!" -ForegroundColor Green
        exit 0
    }
    
    Write-Host "IP local detectado: $ipAddress" -ForegroundColor Green
    if ($existingIP) {
        Write-Host "IP anterior: $existingIP -> IP novo: $ipAddress" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Erro ao obter IP: $_" -ForegroundColor Yellow
    $ipAddress = Read-Host "Por favor, insira o IP da máquina manualmente"
}

# Validar formato do IP
if ($ipAddress -notmatch "^\d+\.\d+\.\d+\.\d+$") {
    Write-Host "IP inválido: $ipAddress" -ForegroundColor Red
    exit 1
}

$newEntry = "$ipAddress    $dnsEntry"

# Atualizar arquivo hosts
try {
    # Fazer backup apenas se houver mudança
    if ($existingIP -and $ipAddress -ne $existingIP) {
        $backupPath = "$hostsPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $hostsPath $backupPath -Force
        Write-Host ""
        Write-Host "Backup criado: $backupPath" -ForegroundColor Green
    }
    
    # Salvar conteúdo atualizado (sem a entrada antiga, se existia)
    $hostsContent | Set-Content $hostsPath -Encoding ASCII -Force
    
    # Adicionar nova entrada
    Add-Content -Path $hostsPath -Value $newEntry -Encoding ASCII -Force
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DNS configurado com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Entrada adicionada: $newEntry" -ForegroundColor Cyan
    Write-Host ""
    
    # Limpar cache DNS do Windows
    Write-Host "Limpando cache DNS do Windows..." -ForegroundColor Cyan
    try {
        ipconfig /flushdns | Out-Null
        Write-Host "Cache DNS limpo com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "Aviso: Não foi possível limpar o cache DNS automaticamente." -ForegroundColor Yellow
        Write-Host "Execute manualmente: ipconfig /flushdns" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "Agora você pode acessar o sistema em:" -ForegroundColor Yellow
    Write-Host "  http://fila.experimentaai" -ForegroundColor White
    Write-Host ""
    Write-Host "Nota: Se ainda não funcionar, tente:" -ForegroundColor Gray
    Write-Host "  1. Limpar cache do navegador (Ctrl+Shift+Delete)" -ForegroundColor Gray
    Write-Host "  2. Executar: ipconfig /flushdns" -ForegroundColor Gray
    Write-Host "  3. Reiniciar o navegador" -ForegroundColor Gray
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao configurar DNS: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tentando restaurar backup..." -ForegroundColor Yellow
    if (Test-Path $backupPath) {
        try {
            Copy-Item $backupPath $hostsPath -Force
            Write-Host "Backup restaurado com sucesso." -ForegroundColor Green
        } catch {
            Write-Host "Erro ao restaurar backup!" -ForegroundColor Red
        }
    }
    Write-Host "Certifique-se de executar como Administrador!" -ForegroundColor Yellow
    exit 1
}

