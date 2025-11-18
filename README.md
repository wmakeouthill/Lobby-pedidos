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

O backend estará disponível em: `http://localhost:8080`

### Frontend

```bash
cd frontend
npm install
npm start
```

O frontend estará disponível em: `http://localhost:3000`

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

