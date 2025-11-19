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
echo 🔧 Criando wrapper executável...

if exist "lobby-pedidos.exe" del /q "lobby-pedidos.exe"

echo Criando wrapper simples que executa o JAR...

(
echo @echo off
echo cd /d "%%~dp0"
echo start "" "%%~dp0backend\target\lobby-pedidos-1.0.0.jar"
) > lobby-pedidos-temp.bat

where java >nul 2>&1
if %errorlevel% equ 0 (
    where javaw >nul 2>&1
    if %errorlevel% equ 0 (
        echo Usando javaw.exe para executar sem console...
        (
            echo @echo off
            echo cd /d "%%~dp0"
            echo javaw -jar "%%~dp0backend\target\lobby-pedidos-1.0.0.jar"
        ) > lobby-pedidos-temp.bat
    )
)

echo.
echo ⚠️  Para converter lobby-pedidos-temp.bat em .exe, use:
echo     - Bat To Exe Converter ^(https://www.battoexeconverter.com^)
echo     - Quick Batch File Compiler
echo     - Ou execute diretamente: lobby-pedidos-temp.bat
echo.
echo ✅ Arquivo criado: lobby-pedidos-temp.bat
echo.
pause

