import { useState, useEffect, useCallback, useRef } from 'react';
import pedidoService from '../../../services/pedidoService';

const useOrders = (animacaoConfig) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const pedidosAnterioresRef = useRef([]);
    const cacheCarregadoRef = useRef(false);

    const { setAnimacaoAtivada, setIntervaloAnimacao, setDuracaoAnimacao } = animacaoConfig || {};

    const carregarPedidos = useCallback(async () => {
        try {
            // Reload animation config to sync between tabs
            if (setAnimacaoAtivada && setIntervaloAnimacao && setDuracaoAnimacao) {
                try {
                    const configAnimacao = await pedidoService.carregarConfigAnimacao();
                    if (configAnimacao) {
                        setAnimacaoAtivada(prev => {
                            const novo = configAnimacao.animacaoAtivada ?? true;
                            return prev !== novo ? novo : prev;
                        });
                        setIntervaloAnimacao(prev => {
                            const novo = configAnimacao.intervaloAnimacao ?? 30;
                            return prev !== novo ? novo : prev;
                        });
                        setDuracaoAnimacao(prev => {
                            const novo = configAnimacao.duracaoAnimacao ?? 6;
                            return prev !== novo ? novo : prev;
                        });
                    }
                } catch (errConfig) {
                    console.warn("⚠️ Erro ao carregar configurações de animação:", errConfig);
                }
            }

            const cacheAtual = await pedidoService.carregarCache();
            const dados = cacheAtual && Array.isArray(cacheAtual) ? cacheAtual : [];

            // Check for changes
            const pedidosAnterioresStr = JSON.stringify([...pedidosAnterioresRef.current].sort((a, b) => a.id - b.id));
            const dadosStr = JSON.stringify([...dados].sort((a, b) => a.id - b.id));
            const houveMudancas = pedidosAnterioresStr !== dadosStr;
            const primeiraCarga = pedidosAnterioresRef.current.length === 0;

            if (primeiraCarga || houveMudancas) {
                // We return the data and let the component decide when to update state (to handle animations)
                return { dados, houveMudancas, primeiraCarga, pedidosAnteriores: pedidosAnterioresRef.current };
            }

            return { dados, houveMudancas: false, primeiraCarga: false, pedidosAnteriores: pedidosAnterioresRef.current };

        } catch (err) {
            console.error("❌ Erro ao carregar pedidos do cache:", err);
            return { dados: [], houveMudancas: false, primeiraCarga: false, error: err };
        }
    }, [setAnimacaoAtivada, setIntervaloAnimacao, setDuracaoAnimacao]);

    const adicionarPedido = async (nomeCliente) => {
        if (!nomeCliente.trim()) throw new Error("Nome do cliente obrigatório");
        setLoading(true);
        setError("");
        try {
            await pedidoService.criarPedido(nomeCliente.trim());
            // Force reload
            const result = await carregarPedidos();
            if (result.houveMudancas || result.primeiraCarga) {
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
    };

    const removerPedido = async (id) => {
        try {
            setError("");
            await pedidoService.removerPedido(id);
            const result = await carregarPedidos();
            if (result.houveMudancas || result.primeiraCarga) {
                setPedidos(result.dados);
                pedidosAnterioresRef.current = result.dados;
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao remover pedido";
            setError(msg);
            if (err.response?.status === 404) {
                const result = await carregarPedidos();
                if (result.houveMudancas) {
                    setPedidos(result.dados);
                    pedidosAnterioresRef.current = result.dados;
                }
            }
        }
    };

    const marcarComoPronto = async (id) => {
        try {
            setError("");
            await pedidoService.marcarComoPronto(id);
            // Note: We don't auto-reload here because the component might want to animate first
            // The component should call carregarPedidos or update state manually after animation
        } catch (err) {
            const msg = err.response?.data?.message || err.message || "Erro ao marcar como pronto";
            setError(msg);
            if (err.response?.status === 404) {
                const result = await carregarPedidos();
                if (result.houveMudancas) {
                    setPedidos(result.dados);
                    pedidosAnterioresRef.current = result.dados;
                }
            }
            throw err;
        }
    };

    return {
        pedidos,
        setPedidos,
        loading,
        error,
        setError,
        carregarPedidos,
        adicionarPedido,
        removerPedido,
        marcarComoPronto,
        pedidosAnterioresRef
    };
};

export default useOrders;
