#!/bin/bash

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🍔 Criando Executável - Lobby Pedidos 🍔"
echo "═══════════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")"

echo "📦 Compilando projeto..."
cd backend
mvn clean package -DskipTests
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erro ao compilar o projeto!"
    exit 1
fi
cd ..

echo ""
echo "🔧 Criando executável..."

if [ -f "lobby-pedidos" ]; then
    rm -f "lobby-pedidos"
fi

if command -v jpackage &> /dev/null; then
    echo "Usando jpackage..."
    jpackage \
        --input backend/target \
        --name "Lobby Pedidos" \
        --main-jar lobby-pedidos-1.0.0.jar \
        --main-class com.experimentaai.lobby.Launcher \
        --type app-image \
        --dest . \
        --app-version 1.0.0 \
        --description "Sistema de fila de pedidos para lanchonete" \
        --vendor "Experimenta aí" \
        --copyright "Copyright 2024"
    
    if [ -f "Lobby Pedidos/Lobby Pedidos" ]; then
        mv "Lobby Pedidos/Lobby Pedidos" "lobby-pedidos"
        chmod +x "lobby-pedidos"
        rm -rf "Lobby Pedidos"
        echo ""
        echo "✅ Executável criado: lobby-pedidos"
    else
        echo ""
        echo "⚠️  jpackage não criou o executável esperado"
        echo "Criando launcher alternativo..."
        create_launcher_script
    fi
else
    echo "jpackage não encontrado. Criando launcher script..."
    create_launcher_script
fi

echo ""
echo "✅ Concluído!"
echo ""

create_launcher_script() {
    echo "#!/bin/bash" > launcher.sh
    echo 'cd "$(dirname "$0")"' >> launcher.sh
    echo 'java -jar "$(dirname "$0")/backend/target/lobby-pedidos-1.0.0.jar" "$@"' >> launcher.sh
    chmod +x launcher.sh
    echo ""
    echo "✅ Launcher criado: launcher.sh"
}

