package com.experimentaai.lobby.service;

import com.experimentaai.lobby.dto.PedidoRequestDTO;
import com.experimentaai.lobby.dto.PedidoResponseDTO;
import com.experimentaai.lobby.entity.Pedido;
import com.experimentaai.lobby.entity.StatusPedido;
import com.experimentaai.lobby.mapper.PedidoMapper;
import com.experimentaai.lobby.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PedidoMapper pedidoMapper;

    @Transactional
    public PedidoResponseDTO criarPedido(PedidoRequestDTO requestDTO) {
        Pedido pedido = pedidoMapper.toEntity(requestDTO);
        Pedido pedidoSalvo = pedidoRepository.save(pedido);
        return pedidoMapper.toResponseDTO(pedidoSalvo);
    }

    @Transactional(readOnly = true)
    public List<PedidoResponseDTO> listarTodosPedidos() {
        return pedidoRepository.findAllByOrderByDataCriacaoAsc()
                .stream()
                .map(pedidoMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PedidoResponseDTO> listarPedidosPorStatus(StatusPedido status) {
        return pedidoRepository.findByStatusOrderByDataCriacaoAsc(status)
                .stream()
                .map(pedidoMapper::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public PedidoResponseDTO atualizarStatusParaPronto(Long id) {
        Pedido pedido = buscarPedidoPorId(id);
        pedido.setStatus(StatusPedido.PRONTO);
        Pedido pedidoAtualizado = pedidoRepository.save(pedido);
        return pedidoMapper.toResponseDTO(pedidoAtualizado);
    }

    @Transactional
    public void removerPedido(Long id) {
        Pedido pedido = buscarPedidoPorId(id);
        pedidoRepository.delete(pedido);
    }

    private Pedido buscarPedidoPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado com id: " + id));
    }
}

