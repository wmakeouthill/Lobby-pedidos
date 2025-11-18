package com.experimentaai.lobby.mapper;

import com.experimentaai.lobby.dto.PedidoRequestDTO;
import com.experimentaai.lobby.dto.PedidoResponseDTO;
import com.experimentaai.lobby.entity.Pedido;
import com.experimentaai.lobby.entity.StatusPedido;
import org.springframework.stereotype.Component;

@Component
public class PedidoMapper {

    public Pedido toEntity(PedidoRequestDTO dto) {
        return Pedido.builder()
                .nomeCliente(dto.getNomeCliente())
                .status(StatusPedido.PREPARANDO)
                .build();
    }

    public PedidoResponseDTO toResponseDTO(Pedido pedido) {
        return PedidoResponseDTO.builder()
                .id(pedido.getId())
                .nomeCliente(pedido.getNomeCliente())
                .status(pedido.getStatus())
                .dataCriacao(pedido.getDataCriacao())
                .dataAtualizacao(pedido.getDataAtualizacao())
                .build();
    }
}

