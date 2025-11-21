package com.experimentaai.lobby.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Serviço para gerenciar cache persistente em arquivos JSON.
 * Usa ObjectMapper singleton injetado pelo Spring para evitar memory leaks.
 */
@Slf4j
@Service
public class CacheService {

    // Interface funcional para listeners de mudança nos pedidos
    @FunctionalInterface
    public interface PedidoChangeListener {
        void onPedidosChanged(Object pedidos);
    }

    private static final String APP_NAME = "LobbyPedidos";
    private static final String CACHE_DIR_NAME = "cache";
    private static final String PEDIDOS_CACHE_FILE = "pedidos.json";
    private static final String ANIMACAO_CONFIG_FILE = "animacao_config.json";

    // ObjectMapper injetado como singleton do Spring (configurado em JacksonConfig)
    private final ObjectMapper objectMapper;
    private final Path cacheDirectory;

    // Lista de listeners para mudanças nos pedidos
    private final List<PedidoChangeListener> pedidoChangeListeners = new java.util.concurrent.CopyOnWriteArrayList<>();

    // Construtor com inicialização do diretório de cache
    public CacheService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.cacheDirectory = getCacheDirectory();
        createCacheDirectoryIfNotExists();
    }

    private Path getCacheDirectory() {
        String os = System.getProperty("os.name").toLowerCase();
        String userHome = System.getProperty("user.home");
        
        Path cachePath;
        
        if (os.contains("win")) {
            // Windows: %AppData%/LobbyPedidos/cache
            String appData = System.getenv("APPDATA");
            if (appData != null && !appData.isEmpty()) {
                cachePath = Paths.get(appData, APP_NAME, CACHE_DIR_NAME);
            } else {
                cachePath = Paths.get(userHome, "AppData", "Roaming", APP_NAME, CACHE_DIR_NAME);
            }
        } else if (os.contains("mac")) {
            // macOS: ~/Library/Application Support/LobbyPedidos/cache
            cachePath = Paths.get(userHome, "Library", "Application Support", APP_NAME, CACHE_DIR_NAME);
        } else {
            // Linux: ~/.config/LobbyPedidos/cache
            cachePath = Paths.get(userHome, ".config", APP_NAME, CACHE_DIR_NAME);
        }
        
        log.info("Diretório de cache: {}", cachePath.toAbsolutePath());
        return cachePath;
    }

    private void createCacheDirectoryIfNotExists() {
        try {
            if (!Files.exists(cacheDirectory)) {
                Files.createDirectories(cacheDirectory);
                log.info("Diretório de cache criado: {}", cacheDirectory.toAbsolutePath());
            }
        } catch (IOException e) {
            log.error("Erro ao criar diretório de cache: {}", e.getMessage());
        }
    }

    public void salvarCachePedidos(Object pedidos) {
        try {
            Path filePath = cacheDirectory.resolve(PEDIDOS_CACHE_FILE);
            
            // Verificar se está tentando salvar uma lista vazia
            if (pedidos instanceof List) {
                List<?> lista = (List<?>) pedidos;
                log.info("Tentando salvar cache de pedidos: {} pedidos encontrados", lista.size());
                
                // Se a lista estiver vazia, permitir salvar apenas se já existir cache
                // Isso permite zerar o cache quando o último pedido é removido (ação de gestão)
                if (lista.isEmpty()) {
                    if (!Files.exists(filePath)) {
                        // Se não existe cache anterior, não criar arquivo vazio
                        // O cache será criado quando houver o primeiro pedido
                        log.info("ℹ️ Cache vazio não será criado (não existe cache anterior). Cache será criado quando houver pedidos.");
                        return;
                    }
                    // Se já existe cache, permitir salvar array vazio (último pedido foi removido)
                    log.info("✅ Atualizando cache para array vazio (último pedido removido)");
                }
            } else {
                log.info("Salvando cache de pedidos: tipo {}", pedidos != null ? pedidos.getClass().getSimpleName() : "null");
            }
            
            // Salvar cache (pode ser array vazio se já existir cache anterior)
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), pedidos);
            log.info("✅ Cache de pedidos salvo com sucesso em: {}", filePath.toAbsolutePath());

            // Notificar listeners sobre a mudança
            notifyPedidoChangeListeners(pedidos);
        } catch (IOException e) {
            log.error("❌ Erro ao salvar cache de pedidos: {}", e.getMessage(), e);
            // Não lançar exceção para não interromper a operação principal
            // O erro já foi logado, a operação de pedido deve continuar normalmente
        }
    }

    public Object carregarCachePedidos() {
        try {
            Path filePath = cacheDirectory.resolve(PEDIDOS_CACHE_FILE);
            if (Files.exists(filePath)) {
                // Ler como Object.class retorna LinkedHashMap/ArrayList quando deserializa JSON
                // Isso é esperado e será convertido no PedidoService
                Object pedidos = objectMapper.readValue(filePath.toFile(), Object.class);
                log.info("Cache de pedidos carregado de: {} (tipo: {})", 
                    filePath.toAbsolutePath(), 
                    pedidos != null ? pedidos.getClass().getSimpleName() : "null");
                return pedidos;
            } else {
                log.info("Cache de pedidos não existe ainda em: {}", filePath.toAbsolutePath());
            }
        } catch (IOException e) {
            log.warn("Erro ao carregar cache de pedidos: {}", e.getMessage());
        }
        return null;
    }

    public void salvarConfigAnimacao(Map<String, Object> config) {
        try {
            Path filePath = cacheDirectory.resolve(ANIMACAO_CONFIG_FILE);
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), config);
            log.info("Configurações de animação salvas em: {}", filePath.toAbsolutePath());
        } catch (IOException e) {
            log.error("Erro ao salvar configurações de animação: {}", e.getMessage(), e);
            // Não lançar exceção para não interromper a operação principal
            // O erro já foi logado
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> carregarConfigAnimacao() {
        try {
            Path filePath = cacheDirectory.resolve(ANIMACAO_CONFIG_FILE);
            if (Files.exists(filePath)) {
                Map<String, Object> config = (Map<String, Object>) objectMapper.readValue(
                    filePath.toFile(), 
                    Map.class
                );
                log.info("Configurações de animação carregadas de: {}", filePath.toAbsolutePath());
                return config;
            }
        } catch (IOException e) {
            log.warn("Erro ao carregar configurações de animação: {}", e.getMessage());
        }
        
        // Retornar valores padrão
        Map<String, Object> defaultConfig = new HashMap<>();
        defaultConfig.put("animacaoAtivada", true);
        defaultConfig.put("intervaloAnimacao", 30);
        defaultConfig.put("duracaoAnimacao", 6);
        return defaultConfig;
    }

    public String getCacheDirectoryPath() {
        return cacheDirectory.toAbsolutePath().toString();
    }

    // Métodos para gerenciar listeners de mudança nos pedidos
    public void addPedidoChangeListener(PedidoChangeListener listener) {
        pedidoChangeListeners.add(listener);
        log.info("📡 Listener de mudança de pedidos adicionado. Total: {}", pedidoChangeListeners.size());
    }

    public void removePedidoChangeListener(PedidoChangeListener listener) {
        pedidoChangeListeners.remove(listener);
        log.info("📡 Listener de mudança de pedidos removido. Total: {}", pedidoChangeListeners.size());
    }

    private void notifyPedidoChangeListeners(Object pedidos) {
        int totalListeners = pedidoChangeListeners.size();
        log.info("📢 Notificando {} listener(s) sobre mudança nos pedidos", totalListeners);
        
        if (totalListeners == 0) {
            log.warn("⚠️ Nenhum listener registrado! As atualizações SSE não serão enviadas.");
        }
        
        for (PedidoChangeListener listener : pedidoChangeListeners) {
            try {
                listener.onPedidosChanged(pedidos);
                log.debug("✅ Listener notificado com sucesso");
            } catch (Exception e) {
                log.warn("Erro ao notificar listener de mudança de pedidos: {}", e.getMessage(), e);
            }
        }
    }
}

