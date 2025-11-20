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

## Warnings do Java 17+ no Build

Durante o build com Maven, você pode ver alguns warnings relacionados ao Java 17+:

### Warnings sobre métodos restritos

```
WARNING: A restricted method in java.lang.System has been called
WARNING: java.lang.System::load has been called by org.fusesource.jansi
WARNING: Use --enable-native-access=ALL-UNNAMED to avoid a warning
```

### Warnings sobre métodos deprecated

```
WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::objectFieldOffset will be removed in a future release
```

### Solução Implementada

Foi criado o arquivo `.mvn/jvm.config` com as seguintes configurações:

```bash
--enable-native-access=ALL-UNNAMED
--add-opens java.base/java.lang=ALL-UNNAMED
--add-opens java.base/sun.misc=ALL-UNNAMED
```

Estas configurações:

- Permitem acesso nativo às bibliotecas (jansi para cores no terminal)
- Habilitam reflexão para bibliotecas legadas (Guava)
- São necessárias para compatibilidade com bibliotecas que ainda usam APIs internas do Java

### Por que ocorrem esses warnings?

1. **Jansi**: Biblioteca usada pelo Maven para colorir a saída do terminal
2. **Guava**: Biblioteca do Google que ainda usa `sun.misc.Unsafe` para operações de baixo nível
3. **Java 17+**: Restringiu o acesso a APIs internas por questões de segurança

Estes warnings são normais e não afetam o funcionamento da aplicação.

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
