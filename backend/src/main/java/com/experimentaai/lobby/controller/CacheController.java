package com.experimentaai.lobby.controller;

import com.experimentaai.lobby.service.CacheService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
public class CacheController {

    private final CacheService cacheService;
    private final ObjectMapper objectMapper;

    @GetMapping("/pedidos")
    public ResponseEntity<Object> carregarCachePedidos() {
        Object pedidos = cacheService.carregarCachePedidos();
        if (pedidos != null) {
            return ResponseEntity.ok(pedidos);
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/pedidos")
    public ResponseEntity<Void> salvarCachePedidos(@RequestBody Object pedidos) {
        cacheService.salvarCachePedidos(pedidos);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/animacao")
    public ResponseEntity<Map<String, Object>> carregarConfigAnimacao() {
        Map<String, Object> config = cacheService.carregarConfigAnimacao();
        return ResponseEntity.ok(config);
    }

    @PostMapping("/animacao")
    public ResponseEntity<Void> salvarConfigAnimacao(@RequestBody Map<String, Object> config) {
        cacheService.salvarConfigAnimacao(config);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/diretorio")
    public ResponseEntity<Map<String, String>> getCacheDirectory() {
        return ResponseEntity.ok(Map.of("diretorio", cacheService.getCacheDirectoryPath()));
    }

    @GetMapping("/pedidos/status")
    public ResponseEntity<Map<String, Object>> verificarMudancasPedidos(@RequestParam(required = false) Long ultimaModificacao) {
        Object pedidos = cacheService.carregarCachePedidos();
        Map<String, Object> response = new java.util.HashMap<>();

        if (pedidos == null) {
            response.put("houveMudancas", false);
            response.put("primeiraCarga", true);
            return ResponseEntity.ok(response);
        }

        // Verificar se houve mudanças baseado na última modificação
        // Por enquanto, sempre retorna true se houver pedidos (simplificação)
        response.put("houveMudancas", true);
        response.put("primeiraCarga", false);
        response.put("dados", pedidos);

        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/pedidos/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPedidosChanges() {
        log.info("📡 Nova conexão SSE estabelecida");
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);

        // Adicionar listener para mudanças nos pedidos
        CacheService.PedidoChangeListener listener = pedidos -> {
            try {
                log.info("📢 Enviando atualização SSE para cliente conectado");
                
                Map<String, Object> eventData = new java.util.HashMap<>();
                eventData.put("tipo", "PEDIDOS_ATUALIZADOS");
                eventData.put("dados", pedidos);
                eventData.put("timestamp", System.currentTimeMillis());

                // Serializar para JSON string
                String jsonData = objectMapper.writeValueAsString(eventData);
                
                log.debug("📤 Dados SSE serializados: {}", jsonData.substring(0, Math.min(200, jsonData.length())));

                SseEmitter.SseEventBuilder event = SseEmitter.event()
                    .name("pedidos-update")
                    .data(jsonData);

                emitter.send(event);
                log.info("✅ Evento SSE enviado com sucesso");

            } catch (IOException e) {
                log.error("❌ Erro ao enviar evento SSE: {}", e.getMessage(), e);
                emitter.completeWithError(e);
            }
        };

        cacheService.addPedidoChangeListener(listener);

        // Remover listener quando a conexão for fechada
        emitter.onCompletion(() -> {
            log.info("📡 Conexão SSE finalizada (completion)");
            cacheService.removePedidoChangeListener(listener);
        });
        emitter.onTimeout(() -> {
            log.warn("📡 Conexão SSE expirada (timeout)");
            cacheService.removePedidoChangeListener(listener);
        });
        emitter.onError((throwable) -> {
            log.error("📡 Erro na conexão SSE: {}", throwable.getMessage(), throwable);
            cacheService.removePedidoChangeListener(listener);
        });

        return emitter;
    }
}

