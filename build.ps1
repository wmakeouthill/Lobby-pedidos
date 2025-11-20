# Script para criar executável Java - Lobby Pedidos
# PowerShell versão - mais robusta e fácil de manter

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Criar Executavel - Lobby Pedidos" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Verificar se o JAR existe
$jarPath = Join-Path $scriptDir "backend\target\lobby-pedidos-1.0.0.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "ERRO: JAR nao encontrado!" -ForegroundColor Red
    Write-Host "Execute o build do projeto primeiro: mvn clean package" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar jlink
Write-Host "Verificando jlink..." -NoNewline
$jlinkAvailable = $false
try {
    $null = Get-Command jlink -ErrorAction Stop
    $jlinkAvailable = $true
    Write-Host " OK" -ForegroundColor Green
    Write-Host "jlink encontrado - sera criado runtime customizado mais leve"
} catch {
    Write-Host " nao encontrado" -ForegroundColor Yellow
    Write-Host "AVISO: jlink nao encontrado - usando JRE completo (pode ser muito grande)"
}

# Verificar jpackage
Write-Host "Verificando jpackage..." -NoNewline
try {
    $null = Get-Command jpackage -ErrorAction Stop
    Write-Host " OK" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERRO: jpackage nao encontrado!" -ForegroundColor Red
    Write-Host "Requer JDK 17 ou superior com jpackage." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar ícone
$iconFile = $null
$useIcon = $false
$iconPath = Join-Path $scriptDir "icon\icon.ico"
if (Test-Path $iconPath) {
    $iconFile = (Resolve-Path $iconPath).Path
    $iconSize = (Get-Item $iconPath).Length
    $useIcon = $true
    Write-Host "Icone encontrado: $iconFile (tamanho: $([math]::Round($iconSize/1KB, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "AVISO: Icone nao encontrado em icon\icon.ico" -ForegroundColor Yellow
    Write-Host "Execute create-icon.ps1 para criar o icone primeiro" -ForegroundColor Yellow
    Write-Host "Continuando sem icone..."
}

# Limpar dist anterior
if (Test-Path "dist") {
    Write-Host "Removendo build anterior..." -ForegroundColor Yellow
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
}

# Criar runtime customizado leve usando jlink (se disponível)
# jlink cria o runtime a partir do JDK, não precisa do JRE existente
$customRuntime = $null
if ($jlinkAvailable) {
    Write-Host ""
    Write-Host "Criando runtime customizado leve com jlink..." -ForegroundColor Cyan
    Write-Host "Isso inclui apenas os modulos Java necessarios para Spring Boot" -ForegroundColor Cyan
    Write-Host ""
    
    # Limpar runtime customizado anterior
    if (Test-Path "jre-custom") {
        Remove-Item -Path "jre-custom" -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Tentar encontrar JDK (para acessar jmods)
    $jdkHome = $null
    
    # Verificar JAVA_HOME
    if ($env:JAVA_HOME) {
        $jmodsPath = Join-Path $env:JAVA_HOME "jmods"
        if (Test-Path $jmodsPath) {
            $jdkHome = $env:JAVA_HOME
            Write-Host "JDK encontrado em JAVA_HOME: $jdkHome" -ForegroundColor Green
        }
    }
    
    # Se não encontrou, tentar encontrar JDK através do java.exe
    if (-not $jdkHome) {
        try {
            $javaExe = (Get-Command java -ErrorAction Stop).Source
            $javaDir = Split-Path $javaExe -Parent
            $possibleJdk1 = Split-Path $javaDir -Parent
            $possibleJdk2 = Split-Path $possibleJdk1 -Parent
            
            $jmodsPath = Join-Path $possibleJdk1 "jmods"
            if (Test-Path $jmodsPath) {
                $jdkHome = $possibleJdk1
                Write-Host "JDK encontrado em: $jdkHome" -ForegroundColor Green
            } else {
                $jmodsPath = Join-Path $possibleJdk2 "jmods"
                if (Test-Path $jmodsPath) {
                    $jdkHome = $possibleJdk2
                    Write-Host "JDK encontrado em: $jdkHome" -ForegroundColor Green
                }
            }
        } catch {
            # Ignorar erro
        }
    }
    
    # Se ainda não encontrou, não pode criar runtime customizado
    if (-not $jdkHome -or -not (Test-Path (Join-Path $jdkHome "jmods"))) {
        Write-Host "ERRO: JDK nao encontrado com pasta jmods" -ForegroundColor Red
        Write-Host "Para criar runtime customizado leve, e necessario ter JDK instalado" -ForegroundColor Yellow
        Write-Host "Continuando sem runtime customizado (usara JRE completo - ~3GB)..." -ForegroundColor Yellow
        $customRuntime = "jre"
    } else {
        # Criar runtime customizado apenas com módulos necessários
        # Módulos essenciais para Spring Boot 3.x:
        # - java.base: sempre necessário
        # - java.desktop: necessário para AWT/Swing (interface gráfica)
        # - java.sql: necessário para JPA/Hibernate/H2
        # - java.naming: necessário para JNDI
        # - java.management: necessário para JMX
        # - java.net.http: necessário para HTTP client
        # - java.security.jgss: necessário para algumas features de segurança
        # - java.xml: necessário para XML parsing
        # - jdk.unsupported: necessário para algumas features internas do Spring
        
        $jmodsPath = Join-Path $jdkHome "jmods"
        $modules = "java.base,java.desktop,java.sql,java.naming,java.management,java.net.http,java.security.jgss,java.xml,jdk.unsupported,java.logging,java.prefs,java.datatransfer"
        
        Write-Host "Usando JDK em: $jdkHome" -ForegroundColor Green
        Write-Host "Modulos incluidos: $modules" -ForegroundColor Gray
        
        $jlinkArgs = @(
            "--add-modules", $modules,
            "--output", "jre-custom",
            "--strip-debug",
            "--no-man-pages",
            "--no-header-files",
            "--compress=2",
            "--module-path", $jmodsPath
        )
        
        try {
            & jlink $jlinkArgs
            if ($LASTEXITCODE -eq 0 -and (Test-Path "jre-custom\bin\java.exe")) {
                $customRuntime = "jre-custom"
                Write-Host "OK: Runtime customizado criado com sucesso!" -ForegroundColor Green
                
                # Verificar tamanho do runtime
                $runtimeSize = (Get-ChildItem -Path "jre-custom" -Recurse -ErrorAction SilentlyContinue | 
                    Measure-Object -Property Length -Sum).Sum / 1MB
                Write-Host "Tamanho do runtime customizado: $([math]::Round($runtimeSize, 2)) MB" -ForegroundColor Green
            } else {
                Write-Host "ERRO: Falha ao criar runtime customizado com jlink" -ForegroundColor Red
                Write-Host "Usando JRE completo..." -ForegroundColor Yellow
                $customRuntime = "jre"
            }
        } catch {
            Write-Host "ERRO: Falha ao criar runtime customizado: $_" -ForegroundColor Red
            Write-Host "Usando JRE completo..." -ForegroundColor Yellow
            $customRuntime = "jre"
        }
    }
} else {
    Write-Host "AVISO: jlink nao disponivel - jpackage usara o JDK do sistema" -ForegroundColor Yellow
    $customRuntime = $null
}

Write-Host ""
Write-Host "Criando executavel (isso pode demorar alguns minutos)..." -ForegroundColor Cyan
Write-Host "Configurando limitacoes de memoria para o processo de build..." -ForegroundColor Gray
Write-Host ""

# Configurar limites de memória para o processo de build do jpackage
$env:JAVA_OPTS = "-Xms512m -Xmx4g"
$env:JPACKAGE_JAVA_OPTIONS = "-Xms512m -Xmx4g"

# Preparar argumentos base do jpackage
$jpackageBaseArgs = @(
    "--input", "backend/target",
    "--name", "Lobby Pedidos",
    "--main-jar", "lobby-pedidos-1.0.0.jar",
    "--main-class", "com.experimentaai.lobby.Launcher",
    "--type", "app-image",
    "--dest", "dist",
    "--app-version", "1.0.0",
    "--description", "Sistema de fila de pedidos para lanchonete",
    "--vendor", "Experimenta ai",
    "--copyright", "Copyright 2024"
)

# Adicionar ícone se disponível
if ($useIcon -and $iconFile) {
    $jpackageBaseArgs += "--icon", $iconFile
}

# Adicionar runtime customizado se disponível
if ($customRuntime -and (Test-Path "$customRuntime\bin\java.exe")) {
    $jpackageBaseArgs += "--runtime-image", $customRuntime
    Write-Host "Usando runtime customizado embarcado: $customRuntime" -ForegroundColor Green
    Write-Host "(Runtime criado a partir do JDK - bem mais leve que JRE completo)" -ForegroundColor Gray
} else {
    Write-Host "Usando JDK do sistema (jpackage criara runtime automaticamente)" -ForegroundColor Yellow
}

# Adicionar opções Java
$javaOptions = @(
    "-Djava.awt.headless=false",
    "-Djava.awt.application.name=lobby",
    "-Xms128m",
    "-Xmx512m",
    "-Dfile.encoding=UTF-8",
    "-Dserver.port=80",
    "-Dspring.profiles.active=prod",
    "-XX:+UseG1GC",
    "-XX:MaxGCPauseMillis=200",
    "-XX:+UseStringDeduplication",
    "-XX:MinHeapFreeRatio=20",
    "-XX:MaxHeapFreeRatio=40"
)

foreach ($option in $javaOptions) {
    $jpackageBaseArgs += "--java-options", $option
}

# Executar jpackage
try {
    Write-Host "Executando jpackage..." -ForegroundColor Cyan
    & jpackage $jpackageBaseArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERRO: Erro ao criar executavel!" -ForegroundColor Red
        Read-Host "Pressione Enter para sair"
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERRO: Erro ao executar jpackage: $_" -ForegroundColor Red
    Read-Host "Pressione Enter para sair"
    exit 1
}

# Verificar se o executável foi criado (nome pode variar)
$exePath = $null
$possiblePaths = @(
    "dist\Lobby Pedidos\Lobby Pedidos.exe",
    "dist\Lobby Pedidos\lobby-pedidos.exe",
    "dist\lobby\lobby.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $exePath = (Resolve-Path $path).Path
        break
    }
}

if (-not $exePath) {
    Write-Host ""
    Write-Host "ERRO: Executavel nao foi criado!" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""
Write-Host "OK: Executavel criado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Localizacao: $exePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "O executavel esta pronto para uso!" -ForegroundColor Green
Write-Host "Ele inicia diretamente a interface Java com o backend rodando em background." -ForegroundColor Gray
Write-Host "Configurado para rodar na porta 80 (ou 8080 se 80 estiver ocupada)." -ForegroundColor Gray
Write-Host ""

# Verificar tamanho do executável final
$exeSize = (Get-ChildItem -Path (Split-Path $exePath -Parent) -Recurse -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Tamanho total do executavel: $([math]::Round($exeSize, 2)) MB" -ForegroundColor Green
Write-Host ""

if ($useIcon) {
    Write-Host "Icone aplicado ao executavel" -ForegroundColor Green
} else {
    Write-Host "AVISO: Executavel criado sem icone" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Pressione Enter para sair"

