import { useState, useRef, useEffect } from 'react';
import pedidoService from '../../../services/pedidoService';

const useOrderAnimation = (animacaoConfig, isModoGestor, carregarPedidos, setPedidos, pedidosAnterioresRef, pedidosAtuais = []) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const [pedidoAnimando, setPedidoAnimando] = useState(null);
    const [pedidoAnimandoStatus, setPedidoAnimandoStatus] = useState(null);
    const [pedidoAnimandoDados, setPedidoAnimandoDados] = useState(null);

    const pedidoAnimandoRef = useRef(null);
    const animacaoTimeoutRef = useRef(null);
    const animacaoIntervalRef = useRef(null);
    const pedidosAnimadosRef = useRef(new Set()); // Rastrear pedidos já animados para evitar duplicação
    const processandoRef = useRef(false); // Proteção contra processamento simultâneo
    const sseConnectedRef = useRef(false); // Estado de conexão SSE
    const carregamentoInicialRef = useRef(false); // Flag para evitar carregamento inicial repetido
    const pedidosAtuaisRef = useRef([]); // Referência para estado atual dos pedidos (para comparação)
    const sseConectadoUmaVezRef = useRef(false); // Flag para garantir conexão SSE única
    const filaEventosRef = useRef([]); // Fila de eventos SSE para processar sequencialmente
    const processandoFilaRef = useRef(false); // Flag para controlar processamento da fila
    const ultimoEventoProcessadoRef = useRef(null); // Último evento processado para merge
    const debounceTimerRef = useRef(null); // Timer para debounce de eventos rápidos
    
    // Refs para funções que podem mudar de referência
    const carregarPedidosRef = useRef(carregarPedidos);
    const setPedidosRef = useRef(setPedidos);
    const isModoGestorRef = useRef(isModoGestor);
    const animacaoConfigRef = useRef(animacaoConfig);

    // Atualizar refs quando mudarem
    useEffect(() => {
        carregarPedidosRef.current = carregarPedidos;
        setPedidosRef.current = setPedidos;
        isModoGestorRef.current = isModoGestor;
        animacaoConfigRef.current = animacaoConfig;
    }, [carregarPedidos, setPedidos, isModoGestor, animacaoConfig]);
    
    // Sincronizar pedidosAnterioresRef com o estado atual sempre que pedidos mudarem
    // Isso garante que temos o estado correto para comparação quando o SSE chegar
    // IMPORTANTE: Sincronizar ANTES de processar SSE, não depois
    useEffect(() => {
        if (Array.isArray(pedidosAtuais)) {
            const refAtual = pedidosAnterioresRef.current;
            const refAtualStr = JSON.stringify([...refAtual].sort((a, b) => (a.id || 0) - (b.id || 0)));
            const pedidosAtuaisStr = JSON.stringify([...pedidosAtuais].sort((a, b) => (a.id || 0) - (b.id || 0)));
            
            // Sincronizar se houver diferenças (mas não durante processamento SSE)
            if (!processandoRef.current && refAtualStr !== pedidosAtuaisStr) {
                console.log(`🔄 [SYNC] Sincronizando pedidosAnterioresRef: ${refAtual.length} → ${pedidosAtuais.length} pedidos`);
                pedidosAnterioresRef.current = [...pedidosAtuais];
                pedidosAtuaisRef.current = [...pedidosAtuais];
            }
        }
    }, [pedidosAtuais]);

    const { animacaoAtivada, intervaloAnimacao, duracaoAnimacao } = animacaoConfig;

    // Detectar mudança de status  
    const detectarMudancaStatus = (pedidosAnteriores, pedidosAtuais) => {
        console.log("🔍 [Animation] Detectando mudança de status...");
        console.log("🔍 [Animation] Pedidos anteriores:", pedidosAnteriores.map(p => `ID:${p.id} Status:${p.status}`));
        console.log("🔍 [Animation] Pedidos atuais:", pedidosAtuais.map(p => `ID:${p.id} Status:${p.status}`));

        // Verificar todos os pedidos atuais
        for (const pedidoAtual of pedidosAtuais) {
            const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoAtual.id);
            
            // Caso 1: Pedido existia antes e mudou de PREPARANDO para PRONTO
            if (pedidoAnterior && pedidoAnterior.status === "PREPARANDO" && pedidoAtual.status === "PRONTO") {
                console.log("✅ [Animation] MUDANÇA DETECTADA! Pedido", pedidoAtual.id, "mudou de PREPARANDO → PRONTO");
                return pedidoAtual;
            }
            
            // Caso 2: Pedido novo que já veio como PRONTO (não deve animar, mas logar)
            if (!pedidoAnterior && pedidoAtual.status === "PRONTO") {
                console.log("ℹ️ [Animation] Pedido novo", pedidoAtual.id, "já veio como PRONTO (não animar)");
            }
        }
        
        // Verificar se algum pedido foi removido (não é transição de status, mas é mudança)
        for (const pedidoAnterior of pedidosAnteriores) {
            const pedidoAtual = pedidosAtuais.find(p => p.id === pedidoAnterior.id);
            if (!pedidoAtual) {
                console.log("ℹ️ [Animation] Pedido", pedidoAnterior.id, "foi removido");
            }
        }
        
        console.log("❌ [Animation] Nenhuma mudança de status PREPARANDO→PRONTO detectada");
        return null;
    };

    // Animar transição
    const animarTransicaoStatus = (pedido, pedidoAnterior, dadosFinais) => {
        const pedidoId = pedido.id;
        
        // Proteção: não animar se já está animando ou já foi animado
        if (pedidoAnimandoRef.current === pedidoId || pedidosAnimadosRef.current.has(pedidoId)) {
            console.log("⚠️ [Animation] Pedido", pedidoId, "já está sendo animado ou já foi animado, ignorando");
            return;
        }

        console.log("🎬 Iniciando animação de transição:", pedidoId);
        
        // Marcar como animando
        setPedidoAnimando(pedidoId);
        pedidoAnimandoRef.current = pedidoId;
        pedidosAnimadosRef.current.add(pedidoId);
        
        setPedidoAnimandoStatus("PREPARANDO");
        setPedidoAnimandoDados({ ...pedidoAnterior, status: "PREPARANDO" });

        setTimeout(() => {
            console.log("🎬 [500ms] Mudando para PRONTO");
            setPedidoAnimandoStatus("PRONTO");
            setPedidoAnimandoDados({ ...pedido, status: "PRONTO" });
        }, 500);

        setTimeout(() => {
            console.log("🎬 [1000ms] Finalizando animação");
            
            // Primeiro limpar estados de animação
            setPedidoAnimando(null);
            pedidoAnimandoRef.current = null;
            setPedidoAnimandoStatus(null);
            setPedidoAnimandoDados(null);

            // Atualizar estado final APENAS UMA VEZ com os dados já recebidos
            // IMPORTANTE: O estado visual já está correto porque:
            // 1. O pedido animando foi removido das listas (pedidoAnimando === null)
            // 2. Os dados finais já contêm o pedido no status correto (PRONTO)
            // 3. A atualização aqui é apenas para sincronizar o estado interno
            // Não deve causar piscar porque o React só re-renderiza se os dados mudarem
            if (dadosFinais && Array.isArray(dadosFinais)) {
                // Atualizar referências primeiro (sempre necessário para sincronização)
                pedidosAnterioresRef.current = dadosFinais;
                pedidosAtuaisRef.current = dadosFinais;
                
                // Atualizar estado - React vai comparar e só re-renderizar se necessário
                // Como o pedido animando já foi removido visualmente, esta atualização
                // apenas garante que o estado interno está sincronizado
                setPedidosRef.current(dadosFinais);
                console.log("✅ Estado final sincronizado (sem piscar - React otimiza re-renders)");
            } else {
                console.warn("⚠️ Dados finais inválidos, não atualizando estado");
            }

            // Limpar do set de animados após um delay para permitir nova animação se necessário
            setTimeout(() => {
                pedidosAnimadosRef.current.delete(pedidoId);
                console.log("🧹 Pedido", pedidoId, "removido do set de animados");
            }, 2000);
        }, 1000);
    };

    // Sistema Híbrido: SSE + Polling Inteligente
    // Este useEffect deve executar APENAS UMA VEZ na montagem do componente
    useEffect(() => {
        // Se já foi conectado, não reconectar
        if (sseConectadoUmaVezRef.current) {
            console.log("📡 [HYBRID] SSE já foi conectado anteriormente, pulando reconexão");
            return;
        }
        
        let pollingInterval = null;
        let verificarConexaoSSE = null;

        // Processar fila de eventos sequencialmente
        const processarFilaEventos = async () => {
            if (processandoFilaRef.current || filaEventosRef.current.length === 0) {
                return;
            }

            processandoFilaRef.current = true;

            while (filaEventosRef.current.length > 0) {
                const evento = filaEventosRef.current.shift();
                console.log(`📡 [FILA] Processando evento da fila (${filaEventosRef.current.length} restantes)`);
                await processarAtualizacaoPedidosInterno(evento.dados, evento.fonte);
            }

            processandoFilaRef.current = false;
        };

        // Merge de eventos: combinar múltiplos eventos rápidos em um único
        const mergeEventos = (eventos) => {
            if (eventos.length === 0) return null;
            if (eventos.length === 1) return eventos[0].dados;

            // Usar o evento mais recente como base
            const eventoMaisRecente = eventos[eventos.length - 1];
            console.log(`📡 [MERGE] Combinando ${eventos.length} eventos rápidos, usando o mais recente`);
            
            // O evento mais recente já contém o estado final correto
            return eventoMaisRecente.dados;
        };

        // Adicionar evento à fila com debounce para eventos muito rápidos
        const adicionarEventoAFila = (dados, fonte = 'SSE') => {
            if (!Array.isArray(dados)) {
                console.warn(`📡 [${fonte}] Dados inválidos recebidos:`, dados);
                return;
            }

            // Limpar timer de debounce anterior
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Adicionar evento à fila
            filaEventosRef.current.push({ dados, fonte, timestamp: Date.now() });
            
            // Limitar tamanho da fila para evitar acúmulo excessivo
            if (filaEventosRef.current.length > 10) {
                console.warn(`📡 [${fonte}] Fila muito grande (${filaEventosRef.current.length}), mantendo apenas os 10 mais recentes`);
                // Manter apenas os 10 mais recentes
                filaEventosRef.current = filaEventosRef.current.slice(-10);
            }

            // Debounce: aguardar 100ms para ver se chegam mais eventos antes de processar
            debounceTimerRef.current = setTimeout(() => {
                // Se já está processando, aguardar
                if (processandoRef.current || processandoFilaRef.current) {
                    console.log(`📡 [${fonte}] Processamento em andamento, aguardando (${filaEventosRef.current.length} na fila)`);
                    processarFilaEventos();
                    return;
                }

                // Se há múltiplos eventos na fila, fazer merge
                if (filaEventosRef.current.length > 1) {
                    const eventosParaProcessar = [...filaEventosRef.current];
                    filaEventosRef.current = [];
                    
                    const dadosMerged = mergeEventos(eventosParaProcessar);
                    if (dadosMerged) {
                        console.log(`📡 [${fonte}] Processando ${eventosParaProcessar.length} eventos merged`);
                        processarAtualizacaoPedidosInterno(dadosMerged, fonte);
                    }
                } else if (filaEventosRef.current.length === 1) {
                    // Apenas um evento, processar diretamente
                    const evento = filaEventosRef.current.shift();
                    processarAtualizacaoPedidosInterno(evento.dados, evento.fonte);
                }
            }, 100); // Debounce de 100ms para eventos rápidos
        };

        // Função interna de processamento (sem verificação de fila)
        const processarAtualizacaoPedidosInterno = async (dados, fonte = 'SSE') => {
            if (!Array.isArray(dados)) {
                console.warn(`📡 [${fonte}] Dados inválidos recebidos:`, dados);
                return;
            }

            // Proteção contra processamento simultâneo
            if (processandoRef.current) {
                console.log(`📡 [${fonte}] Processamento já em andamento, adicionando à fila`);
                filaEventosRef.current.push({ dados, fonte, timestamp: Date.now() });
                return;
            }

            console.log(`📡 [${fonte}] Processando atualização: ${dados.length} pedidos recebidos`);

            processandoRef.current = true;

            try {
                // CRÍTICO: Para detectar mudanças corretamente, especialmente no visualizador,
                // SEMPRE usar o ESTADO ATUAL dos pedidos como referência anterior
                // O pedidosAnterioresRef pode não estar sincronizado quando o SSE chega
                let pedidosAnteriores = [];
                
                // SEMPRE priorizar estado atual passado como parâmetro (mais confiável)
                // Isso garante que comparamos com o que está realmente na tela
                // IMPORTANTE: Usar mesmo se estiver vazio, pois pode ser que todos foram removidos
                if (Array.isArray(pedidosAtuais)) {
                    console.log(`📡 [${fonte}] ✅ Usando estado atual (pedidosAtuais) como referência anterior: ${pedidosAtuais.length} pedidos`);
                    pedidosAnteriores = [...pedidosAtuais];
                }
                // Fallback: Se estado atual não for array válido, usar pedidosAnterioresRef
                else if (Array.isArray(pedidosAnterioresRef.current)) {
                    console.log(`📡 [${fonte}] ⚠️ Estado atual não é array válido, usando pedidosAnterioresRef: ${pedidosAnterioresRef.current.length} pedidos`);
                    pedidosAnteriores = [...pedidosAnterioresRef.current];
                }
                // Último recurso: Usar pedidosAtuaisRef
                else if (Array.isArray(pedidosAtuaisRef.current)) {
                    console.log(`📡 [${fonte}] ⚠️ Usando pedidosAtuaisRef como último recurso: ${pedidosAtuaisRef.current.length} pedidos`);
                    pedidosAnteriores = [...pedidosAtuaisRef.current];
                }
                else {
                    console.log(`📡 [${fonte}] ⚠️ Nenhuma referência válida encontrada, usando array vazio`);
                    pedidosAnteriores = [];
                }
                
                console.log(`📡 [${fonte}] Estado anterior capturado: ${pedidosAnteriores.length} pedidos`);
                if (pedidosAnteriores.length > 0) {
                    console.log(`📡 [${fonte}] Pedidos anteriores:`, pedidosAnteriores.map(p => `ID:${p.id} Status:${p.status}`));
                } else {
                    console.log(`📡 [${fonte}] ⚠️ ATENÇÃO: Nenhum pedido anterior encontrado! Pode ser primeira carga`);
                }
                
                // Primeira carga - sempre atualizar (mas só se realmente for primeira carga)
                if (pedidosAnteriores.length === 0 && dados.length > 0) {
                    console.log(`📡 [${fonte}] Primeira carga detectada, atualizando estado`);
                    pedidosAnterioresRef.current = dados;
                    pedidosAtuaisRef.current = dados;
                    setPedidosRef.current(dados);
                    return;
                }
                
                // IMPORTANTE: Se dados está vazio mas havia pedidos antes, é uma remoção total
                // NÃO ignorar - precisa atualizar para mostrar lista vazia
                if (pedidosAnteriores.length > 0 && dados.length === 0) {
                    console.log(`📡 [${fonte}] ⚠️ Todos os pedidos foram removidos (${pedidosAnteriores.length} → 0), atualizando para lista vazia`);
                    console.log(`📡 [${fonte}] Estado atual antes da atualização: ${pedidosAtuaisRef.current?.length || 0} pedidos`);
                    pedidosAnterioresRef.current = [];
                    pedidosAtuaisRef.current = [];
                    setPedidosRef.current([]);
                    console.log(`📡 [${fonte}] ✅ Estado atualizado para lista vazia`);
                    return;
                }
                
                // Se ambos estão vazios desde o início, verificar se precisa sincronizar
                // IMPORTANTE: Mesmo que ambos estejam vazios, pode ser que o estado atual ainda tenha pedidos
                // (por exemplo, se a atualização otimista não sincronizou corretamente)
                if (pedidosAnteriores.length === 0 && dados.length === 0) {
                    // Verificar se o estado atual também está vazio
                    const estadoAtualVazio = !pedidosAtuaisRef.current || pedidosAtuaisRef.current.length === 0;
                    if (estadoAtualVazio) {
                        // Ambos vazios e estado já está vazio - pode ignorar
                        // Mas garantir que as referências estão sincronizadas
                        if (pedidosAnterioresRef.current.length !== 0 || pedidosAtuaisRef.current.length !== 0) {
                            console.log(`📡 [${fonte}] Sincronizando referências para vazio`);
                            pedidosAnterioresRef.current = [];
                            pedidosAtuaisRef.current = [];
                        } else {
                            console.log(`📡 [${fonte}] Ambos arrays vazios e estado já está vazio, nada para processar`);
                        }
                        return;
                    } else {
                        // Estado atual tem pedidos mas SSE diz que está vazio - atualizar!
                        console.log(`📡 [${fonte}] ⚠️ SSE diz vazio mas estado atual tem ${pedidosAtuaisRef.current.length} pedidos, sincronizando para vazio`);
                        pedidosAnterioresRef.current = [];
                        pedidosAtuaisRef.current = [];
                        setPedidosRef.current([]);
                        return;
                    }
                }
                
                // Comparação otimizada SEM mutar arrays originais
                const pedidosAnterioresOrdenados = [...pedidosAnteriores].sort((a, b) => (a.id || 0) - (b.id || 0));
                const dadosOrdenados = [...dados].sort((a, b) => (a.id || 0) - (b.id || 0));
                const pedidosAnterioresStr = JSON.stringify(pedidosAnterioresOrdenados);
                const dadosStr = JSON.stringify(dadosOrdenados);
                const houveMudancas = pedidosAnterioresStr !== dadosStr;

                console.log(`📡 [${fonte}] Comparação: ${pedidosAnteriores.length} anteriores vs ${dados.length} atuais. Mudanças: ${houveMudancas}`);
                
                // Log detalhado para debug
                if (houveMudancas) {
                    console.log(`📡 [${fonte}] DETALHES DA MUDANÇA:`);
                    console.log(`📡 [${fonte}] Anteriores:`, pedidosAnteriores.map(p => `ID:${p.id} Status:${p.status}`));
                    console.log(`📡 [${fonte}] Atuais:`, dados.map(p => `ID:${p.id} Status:${p.status}`));
                }

                // IMPORTANTE: Não ignorar se dados está vazio mas havia pedidos antes
                // Isso significa que todos foram removidos e precisa atualizar
                // (já foi tratado acima, mas verificar novamente aqui para garantir)
                if (!houveMudancas && pedidosAnteriores.length > 0 && dados.length > 0) {
                    console.log(`📡 [${fonte}] Nenhuma mudança real detectada, ignorando`);
                    return;
                }

                const animacaoTransicaoEmAndamento = pedidoAnimandoRef.current !== null;
                let pedidoMudouStatus = null;
                let pedidoAnterior = null;

                // Detectar mudança de status PREPARANDO → PRONTO (sempre que houver mudanças)
                if (houveMudancas) {
                    console.log(`🔍 [${fonte}] Analisando mudanças para detectar transição PREPARANDO→PRONTO...`);
                    console.log(`🔍 [${fonte}] Comparando ${pedidosAnteriores.length} anteriores com ${dados.length} atuais`);
                    
                    // Detectar mudança ANTES de atualizar qualquer referência
                    pedidoMudouStatus = detectarMudancaStatus(pedidosAnteriores, dados);
                    
                    if (pedidoMudouStatus) {
                        pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoMudouStatus.id);
                        
                        if (pedidoAnterior) {
                            console.log(`✅ [${fonte}] Pedido ${pedidoMudouStatus.id} mudou de status! Anterior: ${pedidoAnterior.status}, Atual: ${pedidoMudouStatus.status}`);
                        } else {
                            console.log(`⚠️ [${fonte}] Pedido ${pedidoMudouStatus.id} não encontrado nos anteriores, mas detectou mudança`);
                            // Se não encontrou o pedido anterior mas detectou mudança, pode ser que:
                            // 1. O pedido foi criado e já veio como PRONTO (não animar)
                            // 2. A referência estava desatualizada (tentar buscar do estado atual)
                            // Por segurança, não criar pedido anterior fictício aqui
                            pedidoMudouStatus = null;
                        }
                        
                        // Verificar se já foi animado recentemente
                        if (pedidoMudouStatus && pedidosAnimadosRef.current.has(pedidoMudouStatus.id)) {
                            console.log(`⚠️ [${fonte}] Pedido ${pedidoMudouStatus.id} já foi animado recentemente, mas permitindo nova animação`);
                            // Não bloquear - permitir animação novamente se realmente mudou
                        }
                    } else {
                        console.log(`ℹ️ [${fonte}] Nenhuma transição PREPARANDO→PRONTO detectada (pode ser adição/remoção de pedido)`);
                    }
                } else {
                    console.log(`ℹ️ [${fonte}] Nenhuma mudança detectada na comparação JSON`);
                }

                // Priorizar animação de transição se houver mudança de status PREPARANDO → PRONTO
                if (pedidoMudouStatus && pedidoAnterior && !animacaoTransicaoEmAndamento) {
                    console.log(`🎬 [${fonte}] ✅ CONDIÇÕES ATENDIDAS PARA ANIMAÇÃO:`);
                    console.log(`🎬 [${fonte}] - pedidoMudouStatus:`, pedidoMudouStatus.id, pedidoMudouStatus.status);
                    console.log(`🎬 [${fonte}] - pedidoAnterior:`, pedidoAnterior.id, pedidoAnterior.status);
                    console.log(`🎬 [${fonte}] - animacaoTransicaoEmAndamento:`, animacaoTransicaoEmAndamento);
                    console.log(`🎬 [${fonte}] Mudança PREPARANDO→PRONTO detectada - iniciando animação para pedido ${pedidoMudouStatus.id}`);

                    // Interromper animação periódica se estiver rodando
                    if (animacaoTimeoutRef.current) {
                        clearTimeout(animacaoTimeoutRef.current);
                    }
                    if (animacaoIntervalRef.current) {
                        clearInterval(animacaoIntervalRef.current);
                        setIsAnimating(false);
                    }

                    // Animar passando os dados finais
                    // NÃO atualizar estado aqui - a animação vai atualizar no final
                    // Apenas atualizar referências para evitar detecção de mudança duplicada
                    pedidosAnterioresRef.current = dados;
                    pedidosAtuaisRef.current = dados;
                    
                    // Chamar animação (ela vai atualizar o estado no final)
                    console.log(`🎬 [${fonte}] Chamando animarTransicaoStatus...`);
                    animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior, dados);
                    console.log(`🎬 [${fonte}] animarTransicaoStatus chamado com sucesso`);

                    // Reiniciar animação periódica depois da transição
                    setTimeout(() => {
                        if (animacaoConfigRef.current.animacaoAtivada && !isModoGestorRef.current) {
                            iniciarAnimacaoPeriodica();
                        }
                    }, 2000);

                } else {
                    console.log(`🎬 [${fonte}] ❌ CONDIÇÕES NÃO ATENDIDAS PARA ANIMAÇÃO:`);
                    console.log(`🎬 [${fonte}] - pedidoMudouStatus:`, pedidoMudouStatus ? `${pedidoMudouStatus.id} (${pedidoMudouStatus.status})` : 'null');
                    console.log(`🎬 [${fonte}] - pedidoAnterior:`, pedidoAnterior ? `${pedidoAnterior.id} (${pedidoAnterior.status})` : 'null');
                    console.log(`🎬 [${fonte}] - animacaoTransicaoEmAndamento:`, animacaoTransicaoEmAndamento);
                    
                    // Atualização normal sem animação de transição
                    console.log(`📡 [${fonte}] Atualização normal dos pedidos (sem animação de transição)`);

                    // Interromper animação periódica se houver mudanças
                    if (houveMudancas && isAnimating && !isModoGestor) {
                        if (animacaoTimeoutRef.current) clearTimeout(animacaoTimeoutRef.current);
                        if (animacaoIntervalRef.current) clearInterval(animacaoIntervalRef.current);

                        setTimeout(() => {
                            setIsAnimating(false);
                            if (animacaoConfigRef.current.animacaoAtivada && !isModoGestorRef.current) {
                                iniciarAnimacaoPeriodica();
                            }
                        }, 800);
                    }

                    // SISTEMA REATIVO: Atualizar estado automaticamente quando SSE envia dados
                    // Isso funciona como signals do Angular - quando o SSE emite, atualiza automaticamente
                    pedidosAnterioresRef.current = dados;
                    pedidosAtuaisRef.current = dados; // Atualizar referência de estado atual
                    if (!animacaoTransicaoEmAndamento) {
                        console.log(`📡 [${fonte}] ✅ Atualização reativa via SSE: ${dados.length} pedidos`);
                        setPedidosRef.current(dados);
                    } else {
                        console.log(`📡 [${fonte}] Animação em andamento, aguardando finalização para atualizar`);
                    }
                }
            } finally {
                processandoRef.current = false;
                // Processar próximo evento da fila se houver
                if (filaEventosRef.current.length > 0) {
                    setTimeout(() => processarFilaEventos(), 10);
                }
            }
        };

        // Wrapper público que adiciona à fila se necessário
        const processarAtualizacaoPedidos = (dados, fonte = 'SSE') => {
            adicionarEventoAFila(dados, fonte);
        };

        const iniciarAnimacaoPeriodica = () => {
            const animar = () => {
                setIsAnimating(true);
                animacaoTimeoutRef.current = setTimeout(() => setIsAnimating(false), animacaoConfigRef.current.duracaoAnimacao * 1000);
            };
            animacaoIntervalRef.current = setInterval(animar, animacaoConfigRef.current.intervaloAnimacao * 1000);
        };

        // Polling inteligente como fallback (apenas se SSE não conectar)
        const iniciarPollingInteligente = () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }

            // Não iniciar polling se SSE já está conectado
            if (sseConnectedRef.current) {
                console.log("📡 [HYBRID] SSE já conectado, não iniciando polling");
                return;
            }

            // Polling adaptativo: mais frequente quando animação ativa, menos quando inativa
            const intervaloPolling = (animacaoConfigRef.current.animacaoAtivada && !isModoGestorRef.current) ? 5000 : 10000; // 5s ou 10s (mais conservador)

            console.log(`⏱️ [POLLING] Iniciando polling inteligente (${intervaloPolling}ms)`);
            pollingInterval = setInterval(async () => {
                // Verificar novamente se SSE conectou
                if (sseConnectedRef.current || pedidoService.isSSEConectado()) {
                    console.log("📡 [POLLING] SSE conectou, parando polling");
                    if (pollingInterval) {
                        clearInterval(pollingInterval);
                        pollingInterval = null;
                    }
                    return;
                }

                // Evitar processamento se já está processando
                if (processandoRef.current) {
                    console.log("⏱️ [POLLING] Processamento em andamento, pulando");
                    return;
                }

                console.log("⏱️ [POLLING] Verificação inteligente...");
                const result = await carregarPedidosRef.current(true); // Forçar atualização no polling
                if (result && result.dados) {
                    processarAtualizacaoPedidos(result.dados, 'POLLING');
                }
            }, intervaloPolling);
        };

        // Handlers SSE - SISTEMA REATIVO (como signals do Angular)
        // Quando o backend emite um evento SSE, este handler é chamado automaticamente
        // Funciona como Observable.subscribe() ou signal effect() do Angular
        const handleSSEMessage = (data) => {
            // Marcar como conectado quando receber primeira mensagem
            if (!sseConnectedRef.current) {
                sseConnectedRef.current = true;
                console.log("📡 [SSE] ✅ Conexão reativa estabelecida - sistema funcionando como signals do Angular");
                
                // Parar polling se estiver rodando (SSE é a fonte de verdade)
                if (pollingInterval) {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    console.log("📡 [SSE] Polling parado - SSE reativo ativo");
                }
            }

            console.log(`📡 [SSE] 🔔 Evento reativo recebido (como signal emit):`, data);
            
            // Processar eventos nomeados ou com tipo PEDIDOS_ATUALIZADOS
            // TODOS os eventos passam por aqui - sistema totalmente reativo
            if (data.tipo === 'PEDIDOS_ATUALIZADOS' && data.dados) {
                console.log(`📡 [SSE] ✅ Processando atualização reativa de pedidos (signal update)`);
                processarAtualizacaoPedidos(data.dados, 'SSE');
            } else if (Array.isArray(data.dados)) {
                // Fallback: se os dados vierem diretamente como array
                console.log(`📡 [SSE] ✅ Processando dados reativos diretos (signal update)`);
                processarAtualizacaoPedidos(data.dados, 'SSE');
            } else if (Array.isArray(data)) {
                // Fallback: se os dados vierem como array direto
                console.log(`📡 [SSE] ✅ Processando array reativo direto (signal update)`);
                processarAtualizacaoPedidos(data, 'SSE');
            } else {
                console.warn(`📡 [SSE] ⚠️ Formato de dados não reconhecido:`, data);
            }
        };

        const handleSSEError = (error) => {
            console.warn("📡 [SSE] Erro na conexão:", error);
            sseConnectedRef.current = false;
            
            // Iniciar polling apenas se não estiver rodando
            if (!pollingInterval) {
                console.log("📡 [SSE] Ativando polling inteligente como fallback");
                iniciarPollingInteligente();
            }
        };

        // Conectar SSE primeiro (apenas uma vez)
        console.log("📡 [HYBRID] Tentando conectar SSE...");
        pedidoService.conectarSSE(handleSSEMessage, handleSSEError);
        sseConectadoUmaVezRef.current = true;

        // Carregamento inicial (apenas uma vez, mesmo se houver 0 pedidos)
        const carregarInicial = async () => {
            if (carregamentoInicialRef.current) {
                console.log("📡 [HYBRID] Carregamento inicial já foi executado, pulando");
                return;
            }
            
            carregamentoInicialRef.current = true;
            console.log("📡 [HYBRID] Executando carregamento inicial...");
            
            const result = await carregarPedidosRef.current(true); // Forçar atualização inicial
            if (result && result.dados) {
                pedidosAnterioresRef.current = result.dados;
                setPedidosRef.current(result.dados);
                console.log("📡 [HYBRID] Estado inicial carregado:", result.dados.length, "pedidos");
            } else {
                // Mesmo com 0 pedidos, atualizar a referência para evitar loops
                pedidosAnterioresRef.current = [];
                setPedidosRef.current([]);
                console.log("📡 [HYBRID] Estado inicial carregado: 0 pedidos");
            }
        };
        carregarInicial();

        // Timeout para verificar se SSE conectou (com verificação real)
        verificarConexaoSSE = setTimeout(() => {
            const realmenteConectado = pedidoService.isSSEConectado();
            if (!realmenteConectado && !sseConnectedRef.current) {
                console.log("📡 [HYBRID] SSE não conectou após 2s, iniciando polling inteligente");
                iniciarPollingInteligente();
            } else if (realmenteConectado) {
                sseConnectedRef.current = true;
                console.log("📡 [HYBRID] SSE confirmado conectado");
            }
        }, 2000);

        return () => {
            console.log("📡 [HYBRID] Limpando recursos do SSE...");
            pedidoService.desconectarSSE();
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
            if (verificarConexaoSSE) {
                clearTimeout(verificarConexaoSSE);
                verificarConexaoSSE = null;
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            processandoRef.current = false;
            processandoFilaRef.current = false;
            sseConnectedRef.current = false;
            filaEventosRef.current = [];
            // NÃO resetar carregamentoInicialRef nem sseConectadoUmaVezRef aqui
            // Eles devem persistir durante toda a sessão para evitar reconexões
        };
    }, []); // Array vazio = executa apenas uma vez na montagem

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

    // Sincronizar pedidosAtuaisRef com pedidosAnterioresRef
    // Removido useEffect que causava re-renders desnecessários
    // A sincronização agora é feita diretamente onde necessário

    return {
        isAnimating,
        setIsAnimating,
        pedidoAnimando,
        pedidoAnimandoStatus,
        pedidoAnimandoDados,
        animarTransicaoStatus,
        forceCheck: () => { } // Placeholder - will be implemented
    };
};

export default useOrderAnimation;
