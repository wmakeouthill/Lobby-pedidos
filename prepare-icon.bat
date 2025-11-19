@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo    📷 Preparando Ícone para Instalador
echo ═══════════════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

if not exist "frontend\public\experimenta_ai_banner_circular.png" (
    echo ❌ Arquivo PNG não encontrado: frontend\public\experimenta_ai_banner_circular.png
    echo.
    echo Arquivos disponíveis em frontend\public\:
    dir /b frontend\public\*.png frontend\public\*.gif 2>nul
    pause
    exit /b 1
)

echo 📷 Arquivo encontrado: frontend\public\experimenta_ai_banner_circular.png
echo.
echo ⚠️  Para Windows, é necessário converter PNG para ICO
echo.
echo Opções:
echo 1. Use um conversor online: https://convertio.co/pt/png-ico/
echo 2. Ou use ImageMagick (se instalado):
echo    magick frontend\public\experimenta_ai_banner_circular.png -resize 256x256 icon.ico
echo.
echo Após converter, salve como: icon.ico na raiz do projeto
echo.

where magick >nul 2>&1
if %errorlevel% equ 0 (
    echo Usando ImageMagick para converter...
    magick frontend\public\experimenta_ai_banner_circular.png -resize 256x256 icon.ico
    if %errorlevel% equ 0 (
        echo ✅ Ícone criado: icon.ico
    ) else (
        echo ❌ Erro ao converter com ImageMagick
    )
) else (
    echo ImageMagick não encontrado.
    echo Copiando PNG para uso no Linux/Mac...
    copy /Y "frontend\public\experimenta_ai_banner_circular.png" "icon.png" >nul
    if %errorlevel% equ 0 (
        echo ✅ Arquivo copiado: icon.png (pode ser usado no Linux/Mac)
        echo Para Windows, converta para icon.ico manualmente
    )
)

echo.
pause

