import { useState, useCallback, useRef, useMemo } from 'react';
import pedidoService from '../../../services/pedidoService';

const useOrders = () => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pedidosAnterioresRef = useRef([]);
    const [pedidosCache, setPedidosCache] = useState(null);

    // Memoizar estado de pedidos para evitar recálculos desnecessários
    const pedidosMemoizados = useMemo(() => pedidos, [pedidos]);

    // Função otimizada para detectar mudanças
    const detectarMudancas = useCallback((novosPedidos, pedidosAnteriores) => {
        if (!Array.isArray(novosPedidos) || !Array.isArray(pedidosAnteriores)) {
            return false;
        }

        if (novosPedidos.length !== pedidosAnteriores.length) {
            return true;
        }

        // Comparação otimizada por ID
        const idsAnteriores = new Set(pedidosAnteriores.map(p => p.id));
        const idsNovos = new Set(novosPedidos.map(p => p.id));

        if (idsAnteriores.size !== idsNovos.size) {
            return true;
        }

        // Verificar se algum ID mudou
        for (const id of idsNovos) {
            if (!idsAnteriores.has(id)) {
                return true;
            }
        }

        // Verificar mudanças em propriedades dos pedidos
        for (const pedidoNovo of novosPedidos) {
            const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoNovo.id);
            if (!pedidoAnterior ||
                pedidoAnterior.status !== pedidoNovo.status ||
                pedidoAnterior.nomeCliente !== pedidoNovo.nomeCliente) {
                return true;
            }
        }

        return false;
    }, []);

    const carregarPedidos = useCallback(async (forcarAtualizacao = false) => {
        try {
            // Se não forçar atualização e houver cache, verificar se ainda é válido
            if (!forcarAtualizacao && pedidosCache !== null) {
                // Verificar se há mudanças comparando com referência anterior
                const houveMudancas = detectarMudancas(pedidosCache, pedidosAnterioresRef.current);
                if (!houveMudancas && pedidosAnterioresRef.current.length > 0) {
                    console.log("📋 Usando cache local de pedidos (sem mudanças)");
                    return {
                        dados: pedidosCache,
                        houveMudancas: false,
                        primeiraCarga: false,
                        pedidosAnteriores: pedidosAnterioresRef.current
                    };
                }
            }

            // Buscar do servidor
            const cacheAtual = await pedidoService.carregarCache();
            const dados = cacheAtual && Array.isArray(cacheAtual) ? cacheAtual : [];

            const houveMudancas = detectarMudancas(dados, pedidosAnterioresRef.current);
            const primeiraCarga = pedidosAnterioresRef.current.length === 0;

            // Atualizar cache local sempre que buscar do servidor
            setPedidosCache(dados);

            return { dados, houveMudancas, primeiraCarga, pedidosAnteriores: pedidosAnterioresRef.current };

        } catch (err) {
            console.error("Erro ao carregar pedidos do cache:", err);
            return { dados: [], houveMudancas: false, primeiraCarga: false, error: err };
        }
    }, [pedidosCache, detectarMudancas]);

    // Invalidar cache após operações de escrita
    const invalidarCachePedidos = useCallback(() => {
        setPedidosCache(null);
        console.log("🔄 Cache de pedidos invalidado");
    }, []);

    const adicionarPedido = useCallback(async (nomeCliente) => {
        if (!nomeCliente.trim()) throw new Error("Nome do cliente obrigatório");
        setLoading(true);
        setError("");
        try {
            console.log("🔄 [Gestor] Adicionando novo pedido:", nomeCliente.trim());
            
            // Criar pedido no backend
            const novoPedido = await pedidoService.criarPedido(nomeCliente.trim());
            
            // ATUALIZAÇÃO OTIMISTA: Adicionar à UI imediatamente
            if (novoPedido) {
                setPedidos(prevPedidos => {
                    const pedidosAtualizados = [...prevPedidos, novoPedido];
                    // Atualizar referência também
                    pedidosAnterioresRef.current = pedidosAtualizados;
                    return pedidosAtualizados;
                });
            }
            
            // SISTEMA REATIVO: Confiar 100% no SSE para confirmar atualização
            // O SSE vai detectar a mudança no cache e propagar automaticamente
            // Não fazer verificações manuais - isso quebra a reatividade
            console.log("✅ [Gestor] Pedido criado! Atualização otimista aplicada, SSE confirmará reativamente...");
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao adicionar pedido";
            setError(msg);
            
            // Reverter atualização otimista em caso de erro
            // Usar SSE para sincronizar - o SSE vai enviar o estado correto do servidor
            // Não fazer carregamento manual - isso quebra a reatividade
            throw err;
        } finally {
            setLoading(false);
        }
    }, [carregarPedidos, invalidarCachePedidos]);

    const removerPedido = useCallback(async (id) => {
        try {
            setError("");
            console.log("🔄 [Gestor] Removendo pedido:", id);
            
            // ATUALIZAÇÃO OTIMISTA: Remover da UI imediatamente
            setPedidos(prevPedidos => {
                const pedidosAtualizados = prevPedidos.filter(pedido => pedido.id !== id);
                // Atualizar referência também
                pedidosAnterioresRef.current = pedidosAtualizados;
                return pedidosAtualizados;
            });
            
            // Fazer a requisição ao backend
            await pedidoService.removerPedido(id);
            
            // SISTEMA REATIVO: Confiar 100% no SSE para confirmar atualização
            // O SSE vai detectar a mudança no cache e propagar automaticamente
            // Não fazer verificações manuais - isso quebra a reatividade
            console.log("✅ [Gestor] Pedido removido! Atualização otimista aplicada, SSE confirmará reativamente...");
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao remover pedido";
            setError(msg);
            
            // Reverter atualização otimista em caso de erro
            // Usar SSE para sincronizar - se SSE não confirmar, ele vai corrigir automaticamente
            // Apenas invalidar cache para forçar recarga via SSE
            if (err.response?.status === 404) {
                invalidarCachePedidos();
                // SSE vai detectar e atualizar automaticamente
            } else {
                // Para outros erros, confiar no SSE para sincronizar
                // O SSE vai enviar o estado correto do servidor
            }
            throw err;
        }
    }, [carregarPedidos, invalidarCachePedidos]);

    const marcarComoPronto = useCallback(async (id) => {
        try {
            setError("");
            console.log("🔄 [Gestor] Marcando pedido como pronto:", id);
            
            // ATUALIZAÇÃO OTIMISTA: Atualizar UI imediatamente para feedback visual
            setPedidos(prevPedidos => {
                const pedidosAtualizados = prevPedidos.map(pedido => 
                    pedido.id === id 
                        ? { ...pedido, status: "PRONTO" }
                        : pedido
                );
                // Atualizar referência também
                pedidosAnterioresRef.current = pedidosAtualizados;
                return pedidosAtualizados;
            });
            
            // Fazer a requisição ao backend
            await pedidoService.marcarComoPronto(id);
            
            // SISTEMA REATIVO: Confiar 100% no SSE para confirmar atualização
            // O SSE vai detectar a mudança no cache e propagar automaticamente
            // Não fazer verificações manuais - isso quebra a reatividade
            console.log("✅ [Gestor] Pedido marcado! Atualização otimista aplicada, SSE confirmará reativamente...");
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao marcar como pronto";
            setError(msg);
            
            // Reverter atualização otimista em caso de erro
            // Usar SSE para sincronizar - se SSE não confirmar, ele vai corrigir automaticamente
            // Apenas invalidar cache para forçar recarga via SSE
            if (err.response?.status === 404) {
                invalidarCachePedidos();
                // SSE vai detectar e atualizar automaticamente
            } else {
                // Para outros erros, confiar no SSE para sincronizar
                // O SSE vai enviar o estado correto do servidor
            }
            throw err;
        }
    }, [carregarPedidos, invalidarCachePedidos]);

    return {
        pedidos: pedidosMemoizados,
        setPedidos,
        loading,
        error,
        setError,
        carregarPedidos,
        adicionarPedido,
        removerPedido,
        marcarComoPronto,
        pedidosAnterioresRef,
        invalidarCachePedidos,
        detectarMudancas
    };
};

export default useOrders;
