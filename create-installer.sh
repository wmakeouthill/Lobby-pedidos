#!/bin/bash

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🍔 Criando Instalador com Java Embarcado 🍔"
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
echo "🔧 Preparando JRE customizado..."

if [ -d "jre" ]; then
    rm -rf "jre"
fi
if [ -d "dist" ]; then
    rm -rf "dist"
fi

echo "Criando runtime customizado com jlink..."

if [ -z "$JAVA_HOME" ]; then
    JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java) 2>/dev/null || which java)))
fi

if [ ! -f "$JAVA_HOME/bin/jlink" ]; then
    echo ""
    echo "❌ jlink não encontrado em $JAVA_HOME"
    echo "Certifique-se de ter o JDK 17+ instalado e JAVA_HOME configurado."
    exit 1
fi

"$JAVA_HOME/bin/jlink" \
    --add-modules java.base,java.desktop,java.logging,java.management,java.naming,java.sql,java.xml,java.prefs,java.scripting \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output jre

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Erro ao criar JRE customizado!"
    exit 1
fi

echo ""
echo "📦 Criando instalador com jpackage..."

if ! command -v jpackage &> /dev/null; then
    echo ""
    echo "❌ jpackage não encontrado!"
    echo "Requer JDK 17 ou superior com jpackage."
    exit 1
fi

OS_TYPE=$(uname -s)

if [[ "$OS_TYPE" == "Linux" ]]; then
    JPACKAGE_TYPE="app-image"
elif [[ "$OS_TYPE" == "Darwin" ]]; then
    JPACKAGE_TYPE="dmg"
else
    JPACKAGE_TYPE="app-image"
fi

ICON_PARAM=""
if [ -f "icon.ico" ] || [ -f "icon.png" ]; then
    if [ -f "icon.ico" ]; then
        ICON_PARAM="--icon icon.ico"
    elif [ -f "icon.png" ]; then
        ICON_PARAM="--icon icon.png"
    fi
else
    echo "⚠️  Arquivo icon.ico ou icon.png não encontrado. Executando sem ícone..."
    echo "Para adicionar ícone, copie frontend/public/experimenta_ai_banner_circular.png para icon.png"
fi

jpackage \
    --input backend/target \
    --name "lobby" \
    --main-jar lobby-pedidos-1.0.0.jar \
    --main-class com.experimentaai.lobby.Launcher \
    --type "$JPACKAGE_TYPE" \
    --dest dist \
    --app-version 1.0.0 \
    --description "Sistema de fila de pedidos para lanchonete" \
    --vendor "Experimenta aí" \
    --copyright "Copyright 2024" \
    --runtime-image jre \
    $ICON_PARAM \
    --java-options "-Djava.awt.headless=false" \
    --java-options "-Djava.awt.application.name=lobby" \
    --java-options "-Xms256m" \
    --java-options "-Xmx1024m"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Instalador criado com sucesso!"
    
    if [[ "$OS_TYPE" == "Linux" ]]; then
        if [ -d "dist/lobby" ]; then
            echo "Localização: dist/lobby/"
            echo "Execute: dist/lobby/lobby"
        fi
    elif [[ "$OS_TYPE" == "Darwin" ]]; then
        if [ -f "dist/lobby-1.0.0.dmg" ]; then
            echo "Localização: dist/lobby-1.0.0.dmg"
        fi
    fi
    
    echo ""
    echo "O instalador inclui:"
    echo "- Java Runtime Environment embarcado"
    echo "- Aplicação completa"
    echo "- Todas as dependências"
fi

echo ""
echo "✅ Concluído!"
echo ""

