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
            await pedidoService.criarPedido(nomeCliente.trim());
            // NÃO invalidar cache aqui - o SSE vai atualizar automaticamente
            console.log("✅ [Gestor] Pedido criado! SSE propagará atualização automaticamente...");
            // O SSE detectará a mudança e atualizará o estado reativamente
            // Mas vamos fazer uma atualização imediata também para feedback visual rápido
            const result = await carregarPedidos(true); // Forçar atualização imediata
            if (result.dados) {
                setPedidos(result.dados);
                pedidosAnterioresRef.current = result.dados;
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao adicionar pedido";
            setError(msg);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [carregarPedidos, invalidarCachePedidos]);

    const removerPedido = useCallback(async (id) => {
        try {
            setError("");
            console.log("🔄 [Gestor] Removendo pedido:", id);
            await pedidoService.removerPedido(id);
            // NÃO invalidar cache aqui - o SSE vai atualizar automaticamente
            console.log("✅ [Gestor] Pedido removido! SSE propagará atualização automaticamente...");
            // O SSE detectará a mudança e atualizará o estado reativamente
            // Mas vamos fazer uma atualização imediata também para feedback visual rápido
            const result = await carregarPedidos(true); // Forçar atualização imediata
            if (result.dados) {
                setPedidos(result.dados);
                pedidosAnterioresRef.current = result.dados;
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao remover pedido";
            setError(msg);
            if (err.response?.status === 404) {
                // Apenas invalidar e recarregar em caso de erro 404
                invalidarCachePedidos();
                const result = await carregarPedidos(true); // Forçar atualização
                if (result.dados) {
                    setPedidos(result.dados);
                    pedidosAnterioresRef.current = result.dados;
                }
            }
        }
    }, [carregarPedidos, invalidarCachePedidos]);

    const marcarComoPronto = useCallback(async (id) => {
        try {
            setError("");
            console.log("🔄 [Gestor] Marcando pedido como pronto:", id);
            await pedidoService.marcarComoPronto(id);
            // NÃO invalidar cache aqui - o SSE vai atualizar automaticamente
            // Invalidar cache pode causar race condition com o SSE
            console.log("✅ [Gestor] Pedido marcado! SSE propagará atualização automaticamente...");
            // O SSE detectará a mudança e atualizará o estado reativamente
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao marcar como pronto";
            setError(msg);
            if (err.response?.status === 404) {
                // Apenas invalidar e recarregar em caso de erro 404
                invalidarCachePedidos();
                const result = await carregarPedidos(true); // Forçar atualização
                if (result.dados) {
                    setPedidos(result.dados);
                    pedidosAnterioresRef.current = result.dados;
                }
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
