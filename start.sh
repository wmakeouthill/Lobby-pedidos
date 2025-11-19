#!/bin/bash

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🍔 Lobby Pedidos - Experimenta aí 🍔"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

if [ ! -f "backend/target/lobby-pedidos-1.0.0.jar" ]; then
    echo "⚠️  Executável não encontrado. Compilando projeto..."
    echo ""
    cd backend
    mvn clean package -DskipTests
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Erro ao compilar o projeto!"
        exit 1
    fi
    cd ..
    echo ""
fi

echo "🚀 Iniciando servidor..."
echo ""
echo "⚠️  IMPORTANTE: Execute com sudo para usar porta 80"
echo ""
echo "📍 A interface gráfica abrirá automaticamente"
echo "🌐 O sistema estará disponível em: http://fila.experimentaai"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

java -jar backend/target/lobby-pedidos-1.0.0.jar

