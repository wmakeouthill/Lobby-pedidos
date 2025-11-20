#!/bin/bash
# Script para criar executável Java - Lobby Pedidos
# Versão Bash - compatível com Git Bash e WSL

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}================================================================"
echo -e "   Criar Executavel - Lobby Pedidos"
echo -e "================================================================${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verificar se o JAR existe
JAR_PATH="$SCRIPT_DIR/backend/target/lobby-pedidos-1.0.0.jar"
if [ ! -f "$JAR_PATH" ]; then
    echo -e "${RED}ERRO: JAR nao encontrado!${NC}"
    echo -e "${YELLOW}Execute o build do projeto primeiro: mvn clean package${NC}"
    read -p "Pressione Enter para sair"
    exit 1
fi

# Verificar jlink
echo -n "Verificando jlink..."
if command -v jlink &> /dev/null; then
    JLINK_AVAILABLE=1
    echo -e " ${GREEN}OK${NC}"
    echo -e "${GREEN}jlink encontrado - sera criado runtime customizado mais leve${NC}"
else
    JLINK_AVAILABLE=0
    echo -e " ${YELLOW}nao encontrado${NC}"
    echo -e "${YELLOW}AVISO: jlink nao encontrado - usando JRE completo (pode ser muito grande)${NC}"
fi

# Verificar jpackage
echo -n "Verificando jpackage..."
if command -v jpackage &> /dev/null; then
    echo -e " ${GREEN}OK${NC}"
else
    echo ""
    echo -e "${RED}ERRO: jpackage nao encontrado!${NC}"
    echo -e "${YELLOW}Requer JDK 17 ou superior com jpackage.${NC}"
    read -p "Pressione Enter para sair"
    exit 1
fi

# Verificar ícone
ICON_FILE=""
USE_ICON=0
ICON_PATH="$SCRIPT_DIR/icon/icon.ico"
if [ -f "$ICON_PATH" ]; then
    ICON_FILE=$(realpath "$ICON_PATH")
    ICON_SIZE=$(stat -f%z "$ICON_FILE" 2>/dev/null || stat -c%s "$ICON_FILE" 2>/dev/null)
    ICON_SIZE_KB=$((ICON_SIZE / 1024))
    USE_ICON=1
    echo -e "${GREEN}Icone encontrado: $ICON_FILE (tamanho: ${ICON_SIZE_KB} KB)${NC}"
else
    echo -e "${YELLOW}AVISO: Icone nao encontrado em icon/icon.ico${NC}"
    echo -e "${YELLOW}Execute create-icon.ps1 para criar o icone primeiro${NC}"
    echo "Continuando sem icone..."
fi

# Limpar dist anterior
if [ -d "dist" ]; then
    echo -e "${YELLOW}Removendo build anterior...${NC}"
    rm -rf "dist"
fi

# Criar runtime customizado leve usando jlink (se disponível)
# jlink cria o runtime a partir do JDK, não precisa do JRE existente
CUSTOM_RUNTIME=""
if [ "$JLINK_AVAILABLE" -eq 1 ]; then
    echo ""
    echo -e "${CYAN}Criando runtime customizado leve com jlink...${NC}"
    echo -e "${CYAN}Isso inclui apenas os modulos Java necessarios para Spring Boot${NC}"
    echo ""
    
    # Limpar runtime customizado anterior
    if [ -d "jre-custom" ]; then
        rm -rf "jre-custom"
    fi
    
    # Tentar encontrar JDK (para acessar jmods)
    JDK_HOME=""
    
    # Verificar JAVA_HOME
    if [ -n "$JAVA_HOME" ] && [ -d "$JAVA_HOME/jmods" ]; then
        JDK_HOME="$JAVA_HOME"
        echo -e "${GREEN}JDK encontrado em JAVA_HOME: $JDK_HOME${NC}"
    fi
    
    # Se não encontrou, tentar encontrar JDK através do java.exe
    if [ -z "$JDK_HOME" ]; then
        if command -v java &> /dev/null; then
            JAVA_EXE=$(which java)
            JAVA_DIR=$(dirname "$JAVA_EXE")
            POSSIBLE_JDK1=$(dirname "$JAVA_DIR")
            POSSIBLE_JDK2=$(dirname "$POSSIBLE_JDK1")
            
            if [ -d "$POSSIBLE_JDK1/jmods" ]; then
                JDK_HOME="$POSSIBLE_JDK1"
                echo -e "${GREEN}JDK encontrado em: $JDK_HOME${NC}"
            elif [ -d "$POSSIBLE_JDK2/jmods" ]; then
                JDK_HOME="$POSSIBLE_JDK2"
                echo -e "${GREEN}JDK encontrado em: $JDK_HOME${NC}"
            fi
        fi
    fi
    
    # Se ainda não encontrou, não pode criar runtime customizado
    if [ -z "$JDK_HOME" ] || [ ! -d "$JDK_HOME/jmods" ]; then
        echo -e "${RED}ERRO: JDK nao encontrado com pasta jmods${NC}"
        echo -e "${YELLOW}Para criar runtime customizado leve, e necessario ter JDK instalado${NC}"
        echo -e "${YELLOW}Continuando sem runtime customizado (jpackage usara o JDK do sistema)...${NC}"
        CUSTOM_RUNTIME=""
    else
        # Criar runtime customizado apenas com módulos necessários
        # Módulos essenciais para Spring Boot 3.x:
        # Módulos essenciais para Spring Boot 3.x com Tomcat:
        # - java.base: sempre necessário
        # - java.desktop: necessário para AWT/Swing (interface gráfica)
        # - java.sql: necessário para JPA/Hibernate/H2
        # - java.naming: necessário para JNDI
        # - java.management: necessário para JMX
        # - java.net.http: necessário para HTTP client
        # - java.security.jgss: necessário para algumas features de segurança
        # - java.xml: necessário para XML parsing
        # - java.instrument: necessário para Tomcat/Spring Boot (instrumentação)
        # - jdk.unsupported: necessário para algumas features internas do Spring
        # - java.logging: necessário para logging
        # - java.prefs: necessário para preferências
        # - java.datatransfer: necessário para transferência de dados (AWT)
        MODULES="java.base,java.desktop,java.sql,java.naming,java.management,java.net.http,java.security.jgss,java.xml,java.instrument,jdk.unsupported,java.logging,java.prefs,java.datatransfer"
        
        echo -e "${GREEN}Usando JDK em: $JDK_HOME${NC}"
        echo -e "${GRAY}Modulos incluidos: $MODULES${NC}"
        
        JMODS_PATH="$JDK_HOME/jmods"
        
        if jlink \
            --add-modules "$MODULES" \
            --output jre-custom \
            --strip-debug \
            --no-man-pages \
            --no-header-files \
            --compress=2 \
            --module-path "$JMODS_PATH"; then
            
            if [ -f "jre-custom/bin/java" ] || [ -f "jre-custom/bin/java.exe" ]; then
                CUSTOM_RUNTIME="jre-custom"
                echo -e "${GREEN}OK: Runtime customizado criado com sucesso!${NC}"
                
                # Verificar tamanho do runtime (só funciona no Linux/Mac)
                if command -v du &> /dev/null; then
                    RUNTIME_SIZE_MB=$(du -sm jre-custom 2>/dev/null | cut -f1 || echo "N/A")
                    echo -e "${GREEN}Tamanho do runtime customizado: ${RUNTIME_SIZE_MB} MB${NC}"
                fi
            else
                echo -e "${RED}ERRO: Falha ao criar runtime customizado com jlink${NC}"
                echo -e "${YELLOW}Continuando sem runtime customizado...${NC}"
                CUSTOM_RUNTIME=""
            fi
        else
            echo -e "${RED}ERRO: Falha ao criar runtime customizado com jlink${NC}"
            echo -e "${YELLOW}Continuando sem runtime customizado...${NC}"
            CUSTOM_RUNTIME=""
        fi
    fi
else
    echo -e "${YELLOW}AVISO: jlink nao disponivel - jpackage usara o JDK do sistema${NC}"
    CUSTOM_RUNTIME=""
fi

echo ""
echo -e "${CYAN}Criando executavel (isso pode demorar alguns minutos)...${NC}"
echo -e "${GRAY}Configurando limitacoes de memoria para o processo de build...${NC}"
echo ""

# Configurar limites de memória para o processo de build do jpackage
# Aumentar bastante para evitar erro ao processar ícone no Windows
export JAVA_OPTS="-Xms1g -Xmx8g"
export JPACKAGE_JAVA_OPTIONS="-Xms1g -Xmx8g"
export _JAVA_OPTIONS="-Xms1g -Xmx8g"

# Preparar argumentos base do jpackage
JPACKAGE_ARGS=(
    "--input" "backend/target"
    "--name" "Lobby Pedidos"
    "--main-jar" "lobby-pedidos-1.0.0.jar"
    "--main-class" "org.springframework.boot.loader.launch.JarLauncher"
    "--type" "app-image"
    "--dest" "dist"
    "--app-version" "1.0.0"
    "--description" "Sistema de fila de pedidos para lanchonete"
    "--vendor" "Experimenta ai"
    "--copyright" "Copyright 2024"
)

# Adicionar ícone se disponível
# IMPORTANTE: jpackage no Windows pode ter problemas com ícone - vamos tentar sem primeiro
# Se houver erro, o usuário pode executar novamente sem ícone
SKIP_ICON_FOR_TEST=${SKIP_ICON_FOR_TEST:-0}
if [ "$USE_ICON" -eq 1 ] && [ -n "$ICON_FILE" ] && [ "$SKIP_ICON_FOR_TEST" -eq 0 ]; then
    # Usar caminho relativo ou converter para formato Windows nativo
    # Converter caminho /c/ para C:/ mas manter barras normais (jpackage aceita /)
    if [[ "$ICON_FILE" == /c/* ]] || [[ "$ICON_FILE" == /C/* ]]; then
        ICON_WIN=$(echo "$ICON_FILE" | sed 's|^/c/|C:/|' | sed 's|^/C/|C:/|')
    else
        ICON_WIN="$ICON_FILE"
    fi
    JPACKAGE_ARGS+=("--icon" "$ICON_WIN")
    echo -e "${GRAY}Usando icone: $ICON_WIN${NC}"
    echo -e "${YELLOW}Se houver erro, execute: SKIP_ICON_FOR_TEST=1 ./build.sh${NC}"
else
    if [ "$SKIP_ICON_FOR_TEST" -eq 1 ]; then
        echo -e "${YELLOW}Pulando uso do icone para evitar erros...${NC}"
    fi
fi

# Adicionar runtime customizado se disponível
if [ -n "$CUSTOM_RUNTIME" ] && ([ -f "$CUSTOM_RUNTIME/bin/java" ] || [ -f "$CUSTOM_RUNTIME/bin/java.exe" ]); then
    JPACKAGE_ARGS+=("--runtime-image" "$CUSTOM_RUNTIME")
    echo -e "${GREEN}Usando runtime customizado embarcado: $CUSTOM_RUNTIME${NC}"
    echo -e "${GRAY}(Runtime criado a partir do JDK - bem mais leve que JRE completo)${NC}"
else
    echo -e "${YELLOW}Usando JDK do sistema (jpackage criara runtime automaticamente)${NC}"
fi

# Adicionar opções Java
JAVA_OPTIONS=(
    "-Djava.awt.headless=false"
    "-Djava.awt.application.name=lobby"
    "-Xms128m"
    "-Xmx512m"
    "-Dfile.encoding=UTF-8"
    "-Dserver.port=80"
    "-Dspring.profiles.active=prod"
    "-XX:+UseG1GC"
    "-XX:MaxGCPauseMillis=200"
    "-XX:+UseStringDeduplication"
    "-XX:MinHeapFreeRatio=20"
    "-XX:MaxHeapFreeRatio=40"
)

for option in "${JAVA_OPTIONS[@]}"; do
    JPACKAGE_ARGS+=("--java-options" "$option")
done

# Executar jpackage
echo -e "${CYAN}Executando jpackage...${NC}"
if jpackage "${JPACKAGE_ARGS[@]}"; then
    # Verificar se o executável foi criado
    EXE_PATH=""
    POSSIBLE_PATHS=(
        "dist/Lobby Pedidos/Lobby Pedidos.exe"
        "dist/Lobby Pedidos/lobby-pedidos.exe"
        "dist/lobby/lobby.exe"
    )
    
    for path in "${POSSIBLE_PATHS[@]}"; do
        if [ -f "$path" ]; then
            EXE_PATH=$(realpath "$path")
            break
        fi
    done
    
    if [ -z "$EXE_PATH" ]; then
        echo ""
        echo -e "${RED}ERRO: Executavel nao foi criado!${NC}"
        echo -e "${YELLOW}Verifique os logs acima para mais detalhes.${NC}"
        read -p "Pressione Enter para sair"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}OK: Executavel criado com sucesso!${NC}"
    echo ""
    echo -e "${CYAN}Localizacao: $EXE_PATH${NC}"
    echo ""
    echo -e "${GREEN}O executavel esta pronto para uso!${NC}"
    echo -e "${GRAY}Ele inicia diretamente a interface Java com o backend rodando em background.${NC}"
    echo -e "${GRAY}Configurado para rodar na porta 80 (ou 8080 se 80 estiver ocupada).${NC}"
    echo ""
    
    # Verificar tamanho do executável final (só funciona no Linux/Mac)
    if command -v du &> /dev/null; then
        EXE_DIR=$(dirname "$EXE_PATH")
        EXE_SIZE_MB=$(du -sm "$EXE_DIR" 2>/dev/null | cut -f1 || echo "N/A")
        echo -e "${GREEN}Tamanho total do executavel: ${EXE_SIZE_MB} MB${NC}"
        echo ""
    fi
    
    if [ "$USE_ICON" -eq 1 ]; then
        echo -e "${GREEN}Icone aplicado ao executavel${NC}"
    else
        echo -e "${YELLOW}AVISO: Executavel criado sem icone${NC}"
    fi
    
    echo ""
    read -p "Pressione Enter para sair"
else
    echo ""
    echo -e "${RED}ERRO: Erro ao criar executavel!${NC}"
    read -p "Pressione Enter para sair"
    exit 1
fi

