#!/bin/bash
# Script para recompilar aplicação e gerar executável com ícone correto

set -e

echo "================================================================"
echo "   Recompilar e Gerar Executavel - Lobby Pedidos"
echo "================================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Passo 1: Copiar ícone para resources (se necessário)
echo "1. Copiando icone para resources..." 
if [ -f "icon/icon.ico" ]; then
    cp "icon/icon.ico" "backend/src/main/resources/icon.ico"
    echo "   OK: Icone copiado para backend/src/main/resources/icon.ico"
else
    echo "   AVISO: Icone nao encontrado em icon/icon.ico"
fi

# Passo 2: Recompilar aplicação
echo ""
echo "2. Recompilando aplicacao..."
cd backend
mvn clean package -DskipTests
cd ..

# Passo 3: Gerar executável
echo ""
echo "3. Gerando executavel..."
SKIP_ICON_FOR_TEST=1 ./build.sh

# Passo 4: Aplicar ícone ao executável
echo ""
echo "4. Aplicando icone ao executavel..."
if [ -f "apply-icon.ps1" ]; then
    powershell -ExecutionPolicy Bypass -File apply-icon.ps1
else
    echo "   AVISO: Script apply-icon.ps1 nao encontrado"
    echo "   Execute manualmente para aplicar o icone"
fi

echo ""
echo "================================================================"
echo "   Concluido!"
echo "================================================================"

