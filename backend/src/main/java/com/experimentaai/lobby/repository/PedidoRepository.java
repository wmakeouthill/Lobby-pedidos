package com.experimentaai.lobby.repository;

import com.experimentaai.lobby.entity.Pedido;
import com.experimentaai.lobby.entity.StatusPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    
    List<Pedido> findByStatusOrderByDataCriacaoAsc(StatusPedido status);
    
    List<Pedido> findAllByOrderByDataCriacaoAsc();
}

