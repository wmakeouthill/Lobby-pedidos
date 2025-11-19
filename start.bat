@echo off
chcp 65001 >nul
title Lobby Pedidos - Experimenta aí

echo.
echo ═══════════════════════════════════════════════════════════════
echo    🍔 Lobby Pedidos - Experimenta aí 🍔
echo ═══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

if not exist "backend\target\lobby-pedidos-1.0.0.jar" (
    echo ⚠️  Executável não encontrado. Compilando projeto...
    echo.
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
)

echo 🚀 Iniciando servidor...
echo.
echo ⚠️  IMPORTANTE: Execute como Administrador para usar porta 80
echo.
echo 📍 A interface gráfica abrirá automaticamente
echo 🌐 O sistema estará disponível em: http://fila.experimentaai
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

java -jar backend\target\lobby-pedidos-1.0.0.jar

pause

