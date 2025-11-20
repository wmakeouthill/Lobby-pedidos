import { useState, useRef, useEffect } from 'react';

const useOrderAnimation = (animacaoConfig, isModoGestor, carregarPedidos, setPedidos, pedidosAnterioresRef) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [pedidoAnimando, setPedidoAnimando] = useState(null);
    const [pedidoAnimandoStatus, setPedidoAnimandoStatus] = useState(null);
    const [pedidoAnimandoDados, setPedidoAnimandoDados] = useState(null);

    const pedidoAnimandoRef = useRef(null);
    const animacaoTimeoutRef = useRef(null);
    const animacaoIntervalRef = useRef(null);

    const { animacaoAtivada, intervaloAnimacao, duracaoAnimacao } = animacaoConfig;

    // Detectar mudança de status
    const detectarMudancaStatus = (pedidosAnteriores, pedidosAtuais) => {
        for (const pedidoAtual of pedidosAtuais) {
            const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoAtual.id);
            if (pedidoAnterior && pedidoAnterior.status === "PREPARANDO" && pedidoAtual.status === "PRONTO") {
                return pedidoAtual;
            }
        }
        return null;
    };

    // Animar transição
    const animarTransicaoStatus = (pedido, pedidoAnterior) => {
        console.log("🎬 Iniciando animação de transição:", pedido.id);
        setPedidoAnimando(pedido.id);
        pedidoAnimandoRef.current = pedido.id;
        setPedidoAnimandoStatus("PREPARANDO");
        setPedidoAnimandoDados({ ...pedidoAnterior, status: "PREPARANDO" });

        setTimeout(() => {
            setPedidoAnimandoStatus("PRONTO");
            setPedidoAnimandoDados({ ...pedido, status: "PRONTO" });
        }, 500);

        setTimeout(async () => {
            setPedidoAnimando(null);
            pedidoAnimandoRef.current = null;
            setPedidoAnimandoStatus(null);
            setPedidoAnimandoDados(null);

            // Atualizar estado final
            const result = await carregarPedidos();
            if (result.dados) {
                setPedidos(result.dados);
                pedidosAnterioresRef.current = result.dados;
            }
        }, 1000);
    };

    // Polling e verificação de mudanças
    useEffect(() => {
        const verificarMudancas = async () => {
            const result = await carregarPedidos();
            if (!result) return;

            const { dados, houveMudancas, primeiraCarga, pedidosAnteriores } = result;

            if (primeiraCarga || houveMudancas) {
                let pedidoMudouStatus = null;
                let pedidoAnterior = null;
                const animacaoTransicaoEmAndamento = pedidoAnimandoRef.current !== null;

                if (pedidosAnteriores.length > 0 && houveMudancas) {
                    pedidoMudouStatus = detectarMudancaStatus(pedidosAnteriores, dados);
                    if (pedidoMudouStatus) {
                        pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoMudouStatus.id);
                    }
                }

                const estavaEmAnimacao = isAnimating && !isModoGestor;

                let animacaoIniciadaAgora = false;

                if (houveMudancas && estavaEmAnimacao) {
                    // Interromper animação periódica
                    if (animacaoTimeoutRef.current) clearTimeout(animacaoTimeoutRef.current);
                    if (animacaoIntervalRef.current) clearInterval(animacaoIntervalRef.current);

                    setTimeout(() => {
                        setIsAnimating(false);
                        if (pedidoMudouStatus && pedidoAnterior && !animacaoTransicaoEmAndamento) {
                            animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior);
                            // Reiniciar animação periódica depois
                            setTimeout(() => {
                                if (animacaoAtivada && !isModoGestor) {
                                    iniciarAnimacaoPeriodica();
                                }
                            }, 2000);
                        } else if (animacaoAtivada && !isModoGestor) {
                            iniciarAnimacaoPeriodica();
                        }
                    }, 800);

                    // Se houve mudança e estava animando, assumimos que a animação vai tratar (ou o timeout acima)
                    // Mas se for transição de status, marcamos aqui também para garantir
                    if (pedidoMudouStatus && pedidoAnterior && animacaoAtivada && !animacaoTransicaoEmAndamento) {
                        animacaoIniciadaAgora = true;
                    }

                } else if (pedidoMudouStatus && pedidoAnterior && !isModoGestor && !animacaoTransicaoEmAndamento) {
                    animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior);
                    animacaoIniciadaAgora = true;
                }

                // Atualizar estado se não estiver animando transição
                if (houveMudancas || primeiraCarga) {
                    pedidosAnterioresRef.current = dados;
                    if (!animacaoTransicaoEmAndamento && !animacaoIniciadaAgora) {
                        setPedidos(dados);
                    }
                }
            }
        };

        const iniciarAnimacaoPeriodica = () => {
            const animar = () => {
                setIsAnimating(true);
                animacaoTimeoutRef.current = setTimeout(() => setIsAnimating(false), duracaoAnimacao * 1000);
            };
            animacaoIntervalRef.current = setInterval(animar, intervaloAnimacao * 1000);
        };

        // Inicialização
        verificarMudancas();
        const intervalId = setInterval(verificarMudancas, 2000);

        return () => clearInterval(intervalId);
    }, [carregarPedidos, isModoGestor, animacaoAtivada, intervaloAnimacao, duracaoAnimacao, isAnimating]);

    // Animação periódica (Surfer)
    useEffect(() => {
        if (isModoGestor || !animacaoAtivada) {
            if (animacaoIntervalRef.current) clearInterval(animacaoIntervalRef.current);
            if (animacaoTimeoutRef.current) clearTimeout(animacaoTimeoutRef.current);
            return;
        }

        const animar = () => {
            setIsAnimating(true);
            animacaoTimeoutRef.current = setTimeout(() => setIsAnimating(false), duracaoAnimacao * 1000);
        };

        const timeoutInicial = setTimeout(animar, intervaloAnimacao * 1000);
        animacaoIntervalRef.current = setInterval(animar, intervaloAnimacao * 1000);

        return () => {
            clearTimeout(timeoutInicial);
            if (animacaoIntervalRef.current) clearInterval(animacaoIntervalRef.current);
            if (animacaoTimeoutRef.current) clearTimeout(animacaoTimeoutRef.current);
        };
    }, [isModoGestor, animacaoAtivada, intervaloAnimacao, duracaoAnimacao]);

    return {
        isAnimating,
        setIsAnimating,
        pedidoAnimando,
        pedidoAnimandoStatus,
        pedidoAnimandoDados,
        animarTransicaoStatus
    };
};

export default useOrderAnimation;
