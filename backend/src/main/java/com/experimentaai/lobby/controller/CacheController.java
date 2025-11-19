package com.experimentaai.lobby.controller;

import com.experimentaai.lobby.service.CacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/cache")
@RequiredArgsConstructor
public class CacheController {

    private final CacheService cacheService;

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
}

