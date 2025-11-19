#!/bin/bash

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   📷 Preparando Ícone para Instalador"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

if [ ! -f "frontend/public/experimenta_ai_banner_circular.png" ]; then
    echo "❌ Arquivo PNG não encontrado: frontend/public/experimenta_ai_banner_circular.png"
    echo ""
    echo "Arquivos disponíveis em frontend/public/:"
    ls -1 frontend/public/*.png frontend/public/*.gif 2>/dev/null
    exit 1
fi

echo "📷 Arquivo encontrado: frontend/public/experimenta_ai_banner_circular.png"
echo ""

if command -v convert &> /dev/null; then
    echo "Usando ImageMagick para converter para ICO..."
    convert frontend/public/experimenta_ai_banner_circular.png -resize 256x256 icon.ico
    if [ $? -eq 0 ]; then
        echo "✅ Ícone criado: icon.ico"
    else
        echo "❌ Erro ao converter"
    fi
fi

if command -v magick &> /dev/null; then
    echo "Usando ImageMagick (magick) para converter..."
    magick frontend/public/experimenta_ai_banner_circular.png -resize 256x256 icon.ico
    if [ $? -eq 0 ]; then
        echo "✅ Ícone criado: icon.ico"
    fi
fi

if [ ! -f "icon.ico" ] && [ ! -f "icon.png" ]; then
    echo "Copiando PNG para uso direto..."
    cp frontend/public/experimenta_ai_banner_circular.png icon.png
    if [ $? -eq 0 ]; then
        echo "✅ Arquivo copiado: icon.png (pode ser usado no jpackage)"
    fi
fi

echo ""

