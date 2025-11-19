#!/bin/bash
# Script para configurar DNS local (Linux/Mac)
# Execute: sudo ./configure-dns.sh

HOSTS_FILE="/etc/hosts"
DNS_ENTRY="fila.experimentaai"

echo "Configurando DNS local para $DNS_ENTRY..."

# Verificar se já existe
if grep -q "$DNS_ENTRY" "$HOSTS_FILE"; then
    echo "A entrada já existe no arquivo hosts."
    echo "Conteúdo atual:"
    grep "$DNS_ENTRY" "$HOSTS_FILE"
    echo ""
    read -p "Deseja atualizar? (S/N) " resposta
    if [[ ! "$resposta" =~ ^[Ss]$ ]]; then
        echo "Operação cancelada."
        exit 0
    fi
    # Remover entrada existente
    sudo sed -i.bak "/$DNS_ENTRY/d" "$HOSTS_FILE"
fi

# Obter IP local
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP_ADDRESS=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "127.0.0.1")
else
    IP_ADDRESS="127.0.0.1"
fi

if [ -z "$IP_ADDRESS" ] || [ "$IP_ADDRESS" == "127.0.0.1" ]; then
    # Tentar obter IP de outra forma
    IP_ADDRESS=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n1)
fi

if [ -z "$IP_ADDRESS" ]; then
    echo "Não foi possível determinar o IP local. Por favor, insira manualmente:"
    read -p "IP da máquina: " IP_ADDRESS
fi

NEW_ENTRY="$IP_ADDRESS    $DNS_ENTRY"

# Adicionar nova entrada
if echo "$NEW_ENTRY" | sudo tee -a "$HOSTS_FILE" > /dev/null; then
    echo "DNS configurado com sucesso!"
    echo "Entrada adicionada: $NEW_ENTRY"
    echo ""
    echo "Agora você pode acessar o sistema em:"
    echo "  http://fila.experimentaai"
    echo ""
    echo "Nota: Pode levar alguns segundos para o DNS ser atualizado."
else
    echo "Erro ao configurar DNS. Certifique-se de executar com sudo!"
    exit 1
fi

