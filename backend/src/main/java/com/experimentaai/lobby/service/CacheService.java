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

    private static final String APP_NAME = "LobbyPedidos";
    private static final String CACHE_DIR_NAME = "cache";
    private static final String PEDIDOS_CACHE_FILE = "pedidos.json";
    private static final String ANIMACAO_CONFIG_FILE = "animacao_config.json";
    
    // ObjectMapper injetado como singleton do Spring (configurado em JacksonConfig)
    private final ObjectMapper objectMapper;
    private final Path cacheDirectory;

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
            
            // Log para debug - verificar o que está sendo salvo
            if (pedidos instanceof List) {
                List<?> lista = (List<?>) pedidos;
                log.info("Salvando cache de pedidos: {} pedidos encontrados", lista.size());
                if (lista.isEmpty()) {
                    log.warn("⚠️ Tentando salvar cache vazio! Verifique se há pedidos no banco de dados.");
                }
            } else {
                log.info("Salvando cache de pedidos: tipo {}", pedidos != null ? pedidos.getClass().getSimpleName() : "null");
            }
            
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(filePath.toFile(), pedidos);
            log.info("✅ Cache de pedidos salvo com sucesso em: {}", filePath.toAbsolutePath());
        } catch (IOException e) {
            log.error("❌ Erro ao salvar cache de pedidos: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao salvar cache de pedidos", e);
        }
    }

    public Object carregarCachePedidos() {
        try {
            Path filePath = cacheDirectory.resolve(PEDIDOS_CACHE_FILE);
            if (Files.exists(filePath)) {
                Object pedidos = objectMapper.readValue(filePath.toFile(), Object.class);
                log.info("Cache de pedidos carregado de: {}", filePath.toAbsolutePath());
                return pedidos;
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
            log.error("Erro ao salvar configurações de animação: {}", e.getMessage());
            throw new RuntimeException("Erro ao salvar configurações de animação", e);
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
}

