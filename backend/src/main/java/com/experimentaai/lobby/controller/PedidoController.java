package com.experimentaai.lobby.controller;

import com.experimentaai.lobby.dto.PedidoRequestDTO;
import com.experimentaai.lobby.dto.PedidoResponseDTO;
import com.experimentaai.lobby.entity.StatusPedido;
import com.experimentaai.lobby.service.PedidoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    @PostMapping
    public ResponseEntity<PedidoResponseDTO> criarPedido(@Valid @RequestBody PedidoRequestDTO requestDTO) {
        PedidoResponseDTO response = pedidoService.criarPedido(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PedidoResponseDTO>> listarTodosPedidos() {
        List<PedidoResponseDTO> pedidos = pedidoService.listarTodosPedidos();
        return ResponseEntity.ok(pedidos);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<PedidoResponseDTO>> listarPedidosPorStatus(@PathVariable StatusPedido status) {
        List<PedidoResponseDTO> pedidos = pedidoService.listarPedidosPorStatus(status);
        return ResponseEntity.ok(pedidos);
    }

    @PutMapping("/{id}/pronto")
    public ResponseEntity<PedidoResponseDTO> marcarComoPronto(@PathVariable Long id) {
        System.out.println("🔵 [CONTROLLER] Recebida requisição PUT /api/pedidos/" + id + "/pronto");
        try {
            PedidoResponseDTO response = pedidoService.atualizarStatusParaPronto(id);
            System.out.println("✅ [CONTROLLER] Pedido " + id + " marcado como pronto com sucesso");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // Log do erro para debug
            System.err.println("❌ [CONTROLLER] Erro ao marcar pedido " + id + " como pronto: " + e.getMessage());
            e.printStackTrace();
            
            if (e.getMessage() != null && e.getMessage().contains("não encontrado")) {
                System.err.println("❌ [CONTROLLER] Retornando 404 - Pedido não encontrado");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            throw e; // Re-lançar para que o Spring trate como erro 500
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removerPedido(@PathVariable Long id) {
        try {
            pedidoService.removerPedido(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("não encontrado")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            throw e; // Re-lançar para que o Spring trate como erro 500
        }
    }
}

