@echo off
chcp 65001 >nul
title Criando Executável - Lobby Pedidos

echo.
echo ═══════════════════════════════════════════════════════════════
echo    🍔 Criando Executável - Lobby Pedidos 🍔
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
echo 🔧 Criando executável...

if exist "lobby-pedidos.exe" del /q "lobby-pedidos.exe"

where jpackage >nul 2>&1
if %errorlevel% equ 0 (
    echo Usando jpackage...
    jpackage ^
        --input backend/target ^
        --name "Lobby Pedidos" ^
        --main-jar lobby-pedidos-1.0.0.jar ^
        --main-class com.experimentaai.lobby.Launcher ^
        --type app-image ^
        --dest . ^
        --app-version 1.0.0 ^
        --description "Sistema de fila de pedidos para lanchonete" ^
        --vendor "Experimenta aí" ^
        --copyright "Copyright 2024"
    
    if exist "Lobby Pedidos\Lobby Pedidos.exe" (
        move /Y "Lobby Pedidos\Lobby Pedidos.exe" "lobby-pedidos.exe"
        rmdir /s /q "Lobby Pedidos"
        echo.
        echo ✅ Executável criado: lobby-pedidos.exe
    ) else (
        echo.
        echo ⚠️  jpackage não criou o executável esperado
        echo Criando launcher alternativo...
        call :create-launcher-bat
    )
) else (
    echo jpackage não encontrado. Criando launcher .bat...
    call :create-launcher-bat
)

echo.
echo ✅ Concluído!
echo.
pause
exit /b 0

:create-launcher-bat
echo Criando launcher.bat...
(
echo @echo off
echo java -jar "%%~dp0backend\target\lobby-pedidos-1.0.0.jar" %%*
) > launcher.bat
echo.
echo ✅ Launcher criado: launcher.bat
echo Para converter em .exe, use um conversor como Bat To Exe Converter
exit /b 0

