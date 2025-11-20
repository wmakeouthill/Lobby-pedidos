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
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final PedidoMapper pedidoMapper;
    private final CacheService cacheService;

    @Transactional
    public PedidoResponseDTO criarPedido(PedidoRequestDTO requestDTO) {
        // Criar pedido no banco (para manter compatibilidade)
        Pedido pedido = pedidoMapper.toEntity(requestDTO);
        Pedido pedidoSalvo = pedidoRepository.save(pedido);
        PedidoResponseDTO novoPedido = pedidoMapper.toResponseDTO(pedidoSalvo);

        // CACHE É A FONTE DE VERDADE - adicionar ao cache
        Object cacheAtual = cacheService.carregarCachePedidos();
        if (cacheAtual instanceof List) {
            List<?> cacheList = (List<?>) cacheAtual;

            // Criar lista mutável a partir do cache
            List<PedidoResponseDTO> pedidosCache = new ArrayList<>();
            for (Object item : cacheList) {
                PedidoResponseDTO pedidoDTO = null;
                if (item instanceof PedidoResponseDTO) {
                    pedidoDTO = (PedidoResponseDTO) item;
                } else if (item instanceof Map) {
                    // Converter Map para PedidoResponseDTO
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) item;
                    pedidoDTO = converterMapParaPedidoDTO(map);
                }
                if (pedidoDTO != null) {
                    pedidosCache.add(pedidoDTO);
                }
            }

            // Adicionar novo pedido ao cache
            pedidosCache.add(novoPedido);

            // Salvar cache atualizado
            cacheService.salvarCachePedidos(pedidosCache);
            log.info("✅ Novo pedido {} adicionado ao cache. Total: {}", novoPedido.getId(), pedidosCache.size());
        } else {
            // Se não houver cache, criar novo com o pedido
            List<PedidoResponseDTO> novoCache = new ArrayList<>();
            novoCache.add(novoPedido);
            cacheService.salvarCachePedidos(novoCache);
            log.info("✅ Cache criado com novo pedido {}", novoPedido.getId());
        }

        return novoPedido;
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
        log.info("🔍 Buscando pedido {} para marcar como pronto", id);

        // CACHE É A FONTE DE VERDADE - buscar do cache primeiro
        Object cacheAtual = cacheService.carregarCachePedidos();
        log.info("📦 Cache carregado: {}", cacheAtual != null ? "existe" : "não existe");

        if (cacheAtual instanceof List) {
            List<?> cacheList = (List<?>) cacheAtual;
            log.info("📋 Cache contém {} itens", cacheList.size());

            // Criar lista mutável a partir do cache
            // O cache pode conter Map (JSON deserializado) ou PedidoResponseDTO
            List<PedidoResponseDTO> pedidosCache = new ArrayList<>();
            for (Object item : cacheList) {
                PedidoResponseDTO pedidoDTO = null;
                if (item instanceof PedidoResponseDTO) {
                    pedidoDTO = (PedidoResponseDTO) item;
                } else if (item instanceof java.util.Map) {
                    // Converter Map para PedidoResponseDTO
                    @SuppressWarnings("unchecked")
                    java.util.Map<String, Object> map = (java.util.Map<String, Object>) item;
                    pedidoDTO = converterMapParaPedidoDTO(map);
                }
                if (pedidoDTO != null) {
                    pedidosCache.add(pedidoDTO);
                }
            }

            log.info("✅ {} pedidos convertidos do cache", pedidosCache.size());

            // Buscar pedido no cache (comparar IDs como Long)
            // O ID pode vir como Integer do JSON, então converter para Long
            PedidoResponseDTO pedidoEncontrado = pedidosCache.stream()
                    .filter(p -> {
                        Long pedidoId = p.getId();
                        boolean match = pedidoId != null && pedidoId.equals(id);
                        if (!match && pedidoId != null) {
                            log.debug("🔍 Comparando pedido ID {} (tipo: {}) com {} (tipo: {})",
                                    pedidoId, pedidoId.getClass().getSimpleName(),
                                    id, id.getClass().getSimpleName());
                        }
                        return match;
                    })
                    .findFirst()
                    .orElse(null);

            if (pedidoEncontrado == null) {
                log.error("❌ Pedido {} não encontrado no cache. Pedidos disponíveis: {}",
                        id, pedidosCache.stream().map(PedidoResponseDTO::getId).toList());
                throw new RuntimeException("Pedido não encontrado com id: " + id);
            }

            log.info("✅ Pedido {} encontrado no cache: {}", id, pedidoEncontrado.getNomeCliente());

            // Atualizar status no cache
            pedidoEncontrado.setStatus(StatusPedido.PRONTO);

            // Salvar cache atualizado
            cacheService.salvarCachePedidos(pedidosCache);
            log.info("✅ Pedido {} marcado como pronto no cache", id);

            return pedidoEncontrado;
        }

        // Fallback: tentar buscar no banco (caso cache não exista ainda)
        Pedido pedido = buscarPedidoPorId(id);
        pedido.setStatus(StatusPedido.PRONTO);
        Pedido pedidoAtualizado = pedidoRepository.save(pedido);
        PedidoResponseDTO response = pedidoMapper.toResponseDTO(pedidoAtualizado);

        // Atualizar cache com dados do banco
        try {
            atualizarCachePedidos();
        } catch (Exception e) {
            log.error("Erro ao atualizar cache após marcar pedido como pronto (id: {}): {}", id, e.getMessage(), e);
        }

        return response;
    }

    @Transactional
    public void removerPedido(Long id) {
        log.info("🔍 Removendo pedido {} do cache", id);

        // CACHE É A FONTE DE VERDADE - buscar do cache primeiro
        Object cacheAtual = cacheService.carregarCachePedidos();
        if (cacheAtual instanceof List) {
            List<?> cacheList = (List<?>) cacheAtual;

            // Criar lista mutável a partir do cache
            // O cache pode conter Map (JSON deserializado) ou PedidoResponseDTO
            List<PedidoResponseDTO> pedidosCache = new ArrayList<>();
            for (Object item : cacheList) {
                PedidoResponseDTO pedidoDTO = null;
                if (item instanceof PedidoResponseDTO) {
                    pedidoDTO = (PedidoResponseDTO) item;
                } else if (item instanceof Map) {
                    // Converter Map para PedidoResponseDTO
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) item;
                    pedidoDTO = converterMapParaPedidoDTO(map);
                }
                if (pedidoDTO != null) {
                    pedidosCache.add(pedidoDTO);
                }
            }

            // Verificar se pedido existe no cache
            boolean pedidoExiste = pedidosCache.stream()
                    .anyMatch(p -> p.getId() != null && p.getId().equals(id));

            if (!pedidoExiste) {
                log.error("❌ Pedido {} não encontrado no cache. Pedidos disponíveis: {}",
                        id, pedidosCache.stream().map(PedidoResponseDTO::getId).toList());
                throw new RuntimeException("Pedido não encontrado com id: " + id);
            }

            // Remover do cache
            pedidosCache.removeIf(p -> p.getId() != null && p.getId().equals(id));

            // Salvar cache atualizado (pode ser array vazio se era o último pedido)
            cacheService.salvarCachePedidos(pedidosCache);
            log.info("✅ Pedido {} removido do cache. Total restante: {}", id, pedidosCache.size());

            return;
        }

        // Fallback: tentar remover do banco (caso cache não exista ainda)
        Pedido pedido = buscarPedidoPorId(id);
        pedidoRepository.delete(pedido);

        // Atualizar cache com dados do banco
        try {
            atualizarCachePedidos();
        } catch (Exception e) {
            log.error("Erro ao atualizar cache após remover pedido (id: {}): {}", id, e.getMessage(), e);
        }
    }

    private Pedido buscarPedidoPorId(Long id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Pedido não encontrado com id: " + id));
    }

    /**
     * Atualiza o cache de pedidos com os dados atuais do banco de dados.
     * Executa em uma nova transação para garantir que leia os dados após o commit.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void atualizarCachePedidos() {
        try {
            List<PedidoResponseDTO> todosPedidos = pedidoRepository.findAllByOrderByDataCriacaoAsc()
                    .stream()
                    .map(pedidoMapper::toResponseDTO)
                    .toList();
            atualizarCachePedidos(todosPedidos);
        } catch (Exception e) {
            // Log do erro mas não interrompe a operação principal
            log.warn("Erro ao atualizar cache de pedidos: {}", e.getMessage(), e);
            // Não relançar a exceção para não causar erro 500
        }
    }

    /**
     * Converte um Map (JSON deserializado) para PedidoResponseDTO
     */
    private PedidoResponseDTO converterMapParaPedidoDTO(Map<String, Object> map) {
        try {
            PedidoResponseDTO.PedidoResponseDTOBuilder builder = PedidoResponseDTO.builder();

            // ID
            Object idObj = map.get("id");
            if (idObj != null) {
                Long id = idObj instanceof Number ? ((Number) idObj).longValue() : Long.parseLong(idObj.toString());
                builder.id(id);
            }

            // Nome Cliente
            Object nomeClienteObj = map.get("nomeCliente");
            if (nomeClienteObj != null) {
                builder.nomeCliente(nomeClienteObj.toString());
            }

            // Status
            Object statusObj = map.get("status");
            if (statusObj != null) {
                StatusPedido status = statusObj instanceof StatusPedido
                        ? (StatusPedido) statusObj
                        : StatusPedido.valueOf(statusObj.toString());
                builder.status(status);
            }

            // Data Criação
            Object dataCriacaoObj = map.get("dataCriacao");
            if (dataCriacaoObj != null) {
                LocalDateTime dataCriacao = converterParaLocalDateTime(dataCriacaoObj);
                builder.dataCriacao(dataCriacao);
            }

            // Data Atualização
            Object dataAtualizacaoObj = map.get("dataAtualizacao");
            if (dataAtualizacaoObj != null) {
                LocalDateTime dataAtualizacao = converterParaLocalDateTime(dataAtualizacaoObj);
                builder.dataAtualizacao(dataAtualizacao);
            }

            return builder.build();
        } catch (Exception e) {
            log.error("Erro ao converter Map para PedidoResponseDTO: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Converte objeto para LocalDateTime
     */
    private LocalDateTime converterParaLocalDateTime(Object obj) {
        if (obj instanceof LocalDateTime) {
            return (LocalDateTime) obj;
        }
        if (obj instanceof String) {
            try {
                // Tentar formato ISO-8601
                return LocalDateTime.parse(obj.toString());
            } catch (Exception e) {
                log.warn("Erro ao converter data: {}", obj);
            }
        }
        return null;
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
