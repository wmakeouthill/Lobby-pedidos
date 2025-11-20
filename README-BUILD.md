# Script de Build para Executável Java

Este script (`build.bat`) cria um executável Windows da aplicação Java usando o `jpackage`, a ferramenta oficial da Oracle para empacotamento de aplicações Java.

## Pré-requisitos

1. **JDK 17 ou superior** com a ferramenta `jpackage` (incluída no JDK)
2. **JAR compilado** em `backend/target/lobby-pedidos-1.0.0.jar`
3. **JRE embarcado** em `jre/` (opcional, mas recomendado)
4. **Ícone** em `icon/icon.ico` (opcional)

## Como Usar

1. Certifique-se de que o projeto está compilado:
   ```batch
   mvn clean package
   ```

2. Execute o script de build:
   ```batch
   build.bat
   ```

3. O executável será criado em `dist/Lobby Pedidos/Lobby Pedidos.exe`

## O que o Script Faz

1. **Verifica dependências**: Confirma que o JAR existe e que o `jpackage` está disponível
2. **Usa JRE embarcado**: Se disponível, usa o JRE customizado em `jre/` para criar um executável totalmente portável
3. **Configura Spring Boot**: Aplica todas as configurações necessárias:
   - `-Djava.awt.headless=false` - Habilita interface gráfica
   - `-Dserver.port=80` - Configura porta do servidor
   - `-Xms256m -Xmx1024m` - Configura memória JVM
   - `-Dfile.encoding=UTF-8` - Encoding de arquivos
   - E outras opções do Spring Boot
4. **Aplica ícone**: Usa o ícone em `icon/icon.ico` se disponível
5. **Cria executável**: Gera um executável Windows que:
   - Inicia diretamente a interface Java
   - Roda o backend Spring Boot em background
   - Serve o frontend automaticamente
   - É totalmente portável (não precisa de Java instalado)

## Estrutura do Executável Gerado

```
dist/
  Lobby Pedidos/
    Lobby Pedidos.exe    <- Executável principal
    runtime/              <- JRE embarcado (se usado)
    app/                  <- Aplicação (JAR e recursos)
```

## Configurações Aplicadas

O executável mantém as mesmas configurações do Spring Boot quando executado pelo Maven:
- Porta do servidor: 80 (com fallback para 8080)
- Interface gráfica habilitada
- Encoding UTF-8
- Memória JVM otimizada
- Perfil Spring: prod (produção)

## Solução de Problemas

### Erro: "jpackage não encontrado"
- Instale o JDK 17 ou superior
- Certifique-se de que o JDK está no PATH

### Erro: "JAR não encontrado"
- Execute `mvn clean package` primeiro
- Verifique se o JAR está em `backend/target/lobby-pedidos-1.0.0.jar`

### Executável não inicia
- Verifique os logs em `logs/error-*.log`
- Certifique-se de que a porta 80 ou 8080 está disponível
- Execute como administrador se usar a porta 80

