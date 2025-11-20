# Solução para Problemas de DNS e Conectividade

## Problema: DNS_PROBE_FINISHED_NXDOMAIN

Este erro indica que o navegador não consegue resolver o domínio `fila.experimentaai`.

## Solução Rápida

### Passo 1: Configurar DNS Local

Execute o script de configuração DNS **como Administrador**:

```powershell
PowerShell -ExecutionPolicy Bypass -File configure-dns.ps1
```

**IMPORTANTE**: 
- Clique com botão direito no PowerShell
- Selecione "Executar como administrador"
- Depois execute o comando acima

### Passo 2: Limpar Cache DNS

Após configurar o DNS, limpe o cache:

```powershell
ipconfig /flushdns
```

### Passo 3: Limpar Cache do Navegador

1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Cache" ou "Imagens e arquivos em cache"
3. Limpe o cache
4. Reinicie o navegador

### Passo 4: Verificar Configuração

Execute o script de diagnóstico:

```powershell
PowerShell -ExecutionPolicy Bypass -File diagnostico-dns.ps1
```

Ou verifique manualmente:

```powershell
PowerShell -ExecutionPolicy Bypass -File check-dns.ps1
```

## Verificação Manual

### Verificar se o DNS está configurado:

1. Abra o arquivo hosts (como Administrador):
   ```
   C:\Windows\System32\drivers\etc\hosts
   ```

2. Deve conter uma linha como:
   ```
   192.168.1.100    fila.experimentaai
   ```
   (O IP será o da sua máquina)

### Verificar se o servidor está rodando:

1. Abra o navegador
2. Tente acessar:
   - `http://localhost` (deve funcionar)
   - `http://127.0.0.1` (deve funcionar)
   - `http://fila.experimentaai` (só funciona se DNS estiver configurado)

## Problemas Comuns

### "Acesso negado" ao executar configure-dns.ps1
- **Solução**: Execute o PowerShell como Administrador

### DNS configurado mas ainda não funciona
- **Solução**: 
  1. Execute `ipconfig /flushdns` como Administrador
  2. Limpe o cache do navegador
  3. Reinicie o navegador
  4. Tente novamente

### Servidor não está respondendo
- **Solução**: 
  1. Verifique se o backend está rodando
  2. Verifique se a porta 80 está disponível
  3. Verifique os logs do backend para erros

### Backend não recebe requisições do frontend
- **Solução**: 
  1. Verifique se o DNS está configurado corretamente
  2. Verifique se o servidor está escutando em `0.0.0.0:80`
  3. Verifique os logs do backend para ver se as requisições estão chegando
  4. A configuração de CORS foi adicionada - certifique-se de que o backend foi reiniciado

## Teste de Conectividade

Após configurar tudo, teste:

1. **Teste DNS**:
   ```powershell
   ping fila.experimentaai
   ```
   Deve retornar o IP da sua máquina

2. **Teste HTTP**:
   ```powershell
   Invoke-WebRequest -Uri http://fila.experimentaai -UseBasicParsing
   ```
   Deve retornar status 200

3. **Teste API**:
   ```powershell
   Invoke-WebRequest -Uri http://fila.experimentaai/api/pedidos -UseBasicParsing
   ```
   Deve retornar status 200 (mesmo que vazio)

## Ainda com Problemas?

Execute o diagnóstico completo:

```powershell
PowerShell -ExecutionPolicy Bypass -File diagnostico-dns.ps1
```

Este script irá verificar:
- ✅ Arquivo hosts
- ✅ Resolução DNS
- ✅ Servidor rodando
- ✅ Conectividade HTTP
- ✅ Cache DNS

