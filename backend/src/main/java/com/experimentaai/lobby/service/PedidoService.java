package com.experimentaai.lobby.service;

import com.experimentaai.lobby.dto.PedidoRequestDTO;
import com.experimentaai.lobby.dto.PedidoResponseDTO;
import com.experimentaai.lobby.entity.Pedido;
import com.experimentaai.lobby.entity.StatusPedido;
import com.experimentaai.lobby.mapper.PedidoMapper;
import com.experimentaai.lobby.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PedidoMapper pedidoMapper;
    private final CacheService cacheService;

    @Transactional
    public PedidoResponseDTO criarPedido(PedidoRequestDTO requestDTO) {
        Pedido pedido = pedidoMapper.toEntity(requestDTO);
        Pedido pedidoSalvo = pedidoRepository.save(pedido);
        PedidoResponseDTO response = pedidoMapper.toResponseDTO(pedidoSalvo);

        // Atualizar cache automaticamente
        atualizarCachePedidos();

        return response;
    }

    @Transactional(readOnly = true)
    public List<PedidoResponseDTO> listarTodosPedidos() {
        List<PedidoResponseDTO> pedidos = pedidoRepository.findAllByOrderByDataCriacaoAsc()
                .stream()
                .map(pedidoMapper::toResponseDTO)
                .toList();

        // NÃO atualizar cache automaticamente ao listar
        // O cache só deve ser atualizado durante ações (criar, atualizar, remover)
        // Isso evita zerar o arquivo quando não há pedidos no banco

        return pedidos;
    }

    @Transactional(readOnly = true)
    public List<PedidoResponseDTO> listarPedidosPorStatus(StatusPedido status) {
        return pedidoRepository.findByStatusOrderByDataCriacaoAsc(status)
                .stream()
                .map(pedidoMapper::toResponseDTO)
                .toList();
    }

    @Transactional
    public PedidoResponseDTO atualizarStatusParaPronto(Long id) {
        Pedido pedido = buscarPedidoPorId(id);
        pedido.setStatus(StatusPedido.PRONTO);
        Pedido pedidoAtualizado = pedidoRepository.save(pedido);
        PedidoResponseDTO response = pedidoMapper.toResponseDTO(pedidoAtualizado);

        // Atualizar cache automaticamente
        atualizarCachePedidos();

        return response;
    }

    @Transactional
    public void removerPedido(Long id) {
        Pedido pedido = buscarPedidoPorId(id);
        pedidoRepository.delete(pedido);

        // Atualizar cache automaticamente
        atualizarCachePedidos();
    }

    private Pedido buscarPedidoPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado com id: " + id));
    }

    /**
     * Atualiza o cache de pedidos com os dados atuais do banco de dados
     */
    private void atualizarCachePedidos() {
        try {
            List<PedidoResponseDTO> todosPedidos = pedidoRepository.findAllByOrderByDataCriacaoAsc()
                    .stream()
                    .map(pedidoMapper::toResponseDTO)
                    .toList();
            atualizarCachePedidos(todosPedidos);
        } catch (Exception e) {
            // Log do erro mas não interrompe a operação principal
            log.warn("Erro ao atualizar cache de pedidos: {}", e.getMessage());
        }
    }

    /**
     * Atualiza o cache de pedidos com a lista fornecida
     */
    private void atualizarCachePedidos(List<PedidoResponseDTO> pedidos) {
        try {
            if (pedidos == null) {
                log.warn("⚠️ Tentando salvar cache com lista null, ignorando...");
                return;
            }
            log.debug("Atualizando cache com {} pedidos", pedidos.size());
            cacheService.salvarCachePedidos(pedidos);
        } catch (Exception e) {
            // Log do erro mas não interrompe a operação principal
            log.warn("Erro ao salvar cache de pedidos: {}", e.getMessage(), e);
        }
    }
}
