# 🍔 Lobby Pedidos - Experimenta aí

Sistema de fila de pedidos desenvolvido seguindo os princípios de Clean Code, com backend em Spring Boot e frontend em React.

## 📋 Funcionalidades

- ✅ Adicionar pedidos com nome do cliente
- ✅ Visualizar pedidos em dois estados: **Preparando** e **Pronto**
- ✅ Marcar pedido como pronto
- ✅ Remover pedido da fila quando estiver pronto
- ✅ Atualização automática da fila a cada 2 segundos
- ✅ Design moderno e responsivo com tema de lanchonete

## 🏗️ Arquitetura

### Backend (Spring Boot)
- **Entity**: `Pedido` e `StatusPedido` (enum)
- **Repository**: Interface JPA para acesso aos dados
- **Service**: Lógica de negócio seguindo Clean Code
- **Controller**: Endpoints RESTful
- **DTO**: Objetos de transferência de dados
- **Mapper**: Conversão entre Entity e DTO

### Frontend (React)
- **Components**: Componentes reutilizáveis e organizados
- **Services**: Serviços para comunicação com API
- **CSS**: Estilização moderna com tema de lanchonete

## 🚀 Como Executar

### Pré-requisitos
- Java 17 ou superior
- Maven 3.6+
- Node.js 16+ e npm

### Backend

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

O backend estará disponível em: `http://localhost` (porta 80)

**⚠️ Importante**: A porta 80 requer privilégios de administrador. Se não tiver permissões, pode alterar para outra porta editando `backend/src/main/resources/application.properties`.

### Instalador com Java Embarcado

Para criar um instalador completo que **inclui o Java embarcado** (usuário não precisa instalar Java):

**Windows:**
```bash
create-installer.bat
```

**Linux/Mac:**
```bash
chmod +x create-installer.sh
./create-installer.sh
```

**Requisitos:**
- JDK 17 ou superior com `jpackage` (incluso no JDK 14+)
- Maven instalado

**Preparar Ícone (Opcional):**
```bash
prepare-icon.bat   # Windows
./prepare-icon.sh  # Linux/Mac
```

Ou converta manualmente `frontend/public/experimenta_ai_banner_circular.png` para `icon.ico` (Windows) ou `icon.png` (Linux/Mac) e coloque na raiz do projeto.

**O que é criado:**

**Windows:**
- `dist/lobby-1.0.0.msi` - Instalador MSI com Java embarcado
- Ou `dist/lobby/` - Aplicação portátil (se MSI falhar)

**Linux/Mac:**
- `dist/lobby/` - Aplicação portátil com Java embarcado
- Ou `.dmg` (macOS) - Instalador para macOS

**O instalador/aplicativo inclui:**
- ✅ Java Runtime Environment customizado (JRE ~50-70MB)
- ✅ Aplicação Spring Boot completa
- ✅ Frontend React embutido
- ✅ Todas as dependências necessárias
- ✅ Interface gráfica Java

**Ao executar o instalador/aplicativo:**
1. Instala ou executa diretamente (modo portátil)
2. A interface gráfica Java abre automaticamente
3. O servidor Spring Boot inicia
4. O sistema fica disponível nos endereços mostrados na interface
5. Não requer Java instalado no sistema do usuário

### Frontend

```bash
cd frontend
npm install
npm start
```

O frontend estará disponível em: `http://localhost:3000`

## 🌐 Configuração DNS (fila.experimentaai)

Para acessar o sistema usando o DNS `fila.experimentaai` sem precisar especificar a porta:

### Windows (PowerShell como Administrador)

```powershell
PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1
```

### Linux/Mac

```bash
sudo ./configure-dns.sh
```

### Configuração Manual

Edite o arquivo de hosts:

**Windows**: `C:\Windows\System32\drivers\etc\hosts`  
**Linux/Mac**: `/etc/hosts`

Adicione a linha:
```
[IP-DA-MÁQUINA]    fila.experimentaai
```

Substitua `[IP-DA-MÁQUINA]` pelo IP da sua máquina na rede local.

Após configurar, você poderá acessar:
- `http://fila.experimentaai` (sem porta)
- `http://localhost`
- `http://[IP-DA-MÁQUINA]`

## 📊 Página de Status

Acesse `http://fila.experimentaai/status` ou `http://localhost/status` para ver:
- Status do sistema
- Lista de endereços disponíveis na rede
- Informações do servidor (hostname, IP, porta)

## 📡 API Endpoints

- `POST /api/pedidos` - Criar novo pedido
- `GET /api/pedidos` - Listar todos os pedidos
- `GET /api/pedidos/status/{status}` - Listar pedidos por status
- `PUT /api/pedidos/{id}/pronto` - Marcar pedido como pronto
- `DELETE /api/pedidos/{id}` - Remover pedido

## 🎨 Design

O design foi criado pensando em uma tela para clientes, com:
- Cores vibrantes de lanchonete (laranja, amarelo)
- Nomes grandes e legíveis
- Divisão clara entre "Preparando" e "Pronto"
- Layout responsivo para diferentes tamanhos de tela

## 🧹 Clean Code

O projeto segue os princípios de Clean Code:
- Nomes descritivos e significativos
- Funções pequenas e com responsabilidade única
- Separação de concerns (Entity, DTO, Service, Controller)
- Validação de dados
- Tratamento de erros
- Código limpo e legível

## 📝 Tecnologias

- **Backend**: Spring Boot 3.2.0, Spring Data JPA, H2 Database, Lombok
- **Frontend**: React 18, Axios
- **Build**: Maven, npm

