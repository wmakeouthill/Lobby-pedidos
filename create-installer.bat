@echo off
chcp 65001 >nul
title Criando Instalador - Lobby Pedidos

echo.
echo ═══════════════════════════════════════════════════════════════
echo    🍔 Criando Instalador com Java Embarcado 🍔
echo ═══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

echo 📦 Compilando projeto...
cd backend
call mvn clean package -DskipTests
if errorlevel 1 (
    echo.
    echo ❌ Erro ao compilar o projeto!
    pause
    exit /b 1
)
cd ..

echo.
echo 🔧 Preparando JRE customizado...

if exist "jre" rmdir /s /q "jre"
if exist "dist" rmdir /s /q "dist"

echo Criando runtime customizado com jlink...
"%JAVA_HOME%\bin\jlink.exe" ^
    --add-modules java.base,java.desktop,java.logging,java.management,java.naming,java.sql,java.xml,java.prefs,java.scripting ^
    --strip-debug ^
    --no-man-pages ^
    --no-header-files ^
    --compress=2 ^
    --output jre

if errorlevel 1 (
    echo.
    echo ⚠️  Erro ao criar JRE customizado. Tentando com java.home...
    where java >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where java') do (
            set JAVA_EXE=%%i
            goto :found_java
        )
    )
    echo.
    echo ❌ Java não encontrado! Certifique-se de ter o JDK 17+ instalado.
    pause
    exit /b 1
    
    :found_java
    set JAVA_HOME=%JAVA_EXE:~0,-9%
    "%JAVA_HOME%\bin\jlink.exe" ^
        --add-modules java.base,java.desktop,java.logging,java.management,java.naming,java.sql,java.xml,java.prefs,java.scripting ^
        --strip-debug ^
        --no-man-pages ^
        --no-header-files ^
        --compress=2 ^
        --output jre
)

echo.
echo 📦 Criando instalador com jpackage...

where jpackage >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ jpackage não encontrado!
    echo Requer JDK 17 ou superior com jpackage.
    echo.
    echo Alternativa: Usando Launch4j sem JRE embarcado...
    call :create_simple_exe
    exit /b 0
)

if exist "icon.ico" (
    set ICON_PARAM=--icon icon.ico
) else (
    set ICON_PARAM=
    echo ⚠️  Arquivo icon.ico não encontrado. Executando sem ícone...
    echo Para adicionar ícone, converta frontend\public\experimenta_ai_banner_circular.png para icon.ico
    echo Use ferramentas online como: https://convertio.co/pt/png-ico/
)

jpackage ^
    --input backend/target ^
    --name "lobby" ^
    --main-jar lobby-pedidos-1.0.0.jar ^
    --main-class com.experimentaai.lobby.Launcher ^
    --type msi ^
    --dest dist ^
    --app-version 1.0.0 ^
    --description "Sistema de fila de pedidos para lanchonete" ^
    --vendor "Experimenta aí" ^
    --copyright "Copyright 2024" ^
    --runtime-image jre ^
    %ICON_PARAM% ^
    --java-options "-Djava.awt.headless=false" ^
    --java-options "-Djava.awt.application.name=lobby" ^
    --java-options "-Xms256m" ^
    --java-options "-Xmx1024m" ^
    --win-dir-chooser ^
    --win-menu ^
    --win-shortcut

if errorlevel 1 (
    echo.
    echo ⚠️  Erro ao criar instalador MSI. Tentando app-image...
    jpackage ^
        --input backend/target ^
        --name "lobby" ^
        --main-jar lobby-pedidos-1.0.0.jar ^
        --main-class com.experimentaai.lobby.Launcher ^
        --type app-image ^
        --dest dist ^
        --app-version 1.0.0 ^
        --description "Sistema de fila de pedidos para lanchonete" ^
        --vendor "Experimenta aí" ^
        --copyright "Copyright 2024" ^
        --runtime-image jre ^
        %ICON_PARAM% ^
        --java-options "-Djava.awt.headless=false" ^
        --java-options "-Djava.awt.application.name=lobby" ^
        --java-options "-Xms256m" ^
        --java-options "-Xmx1024m"
    
    if exist "dist\lobby\lobby.exe" (
        echo.
        echo ✅ Aplicação portátil criada em: dist\lobby\
        echo Execute: dist\lobby\lobby.exe
    )
) else (
    if exist "dist\lobby*.msi" (
        echo.
        echo ✅ Instalador criado com sucesso!
        echo Localização: dist\lobby*.msi
        echo.
        echo O instalador inclui:
        echo - Java Runtime Environment embarcado
        echo - Aplicação completa
        echo - Todas as dependências
        echo.
        echo Execute o arquivo .msi para instalar o sistema.
    )
)

echo.
echo ✅ Concluído!
echo.
pause
exit /b 0

:create_simple_exe
echo Criando executável simples sem JRE embarcado...
cd backend
call mvn package -DskipTests
cd ..
exit /b 0

