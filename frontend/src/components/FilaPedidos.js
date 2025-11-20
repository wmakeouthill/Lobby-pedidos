import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import './FilaPedidos.css';
import pedidoService from '../services/pedidoService';

const FilaPedidos = ({ modo, onTrocarModo }) => {
  // Valores padrão para configurações de animação (serão carregados assincronamente)
  const [pedidos, setPedidos] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [animacaoAtivada, setAnimacaoAtivada] = useState(true);
  const [intervaloAnimacao, setIntervaloAnimacao] = useState(30);
  const [duracaoAnimacao, setDuracaoAnimacao] = useState(6);
  const [pedidoAnimando, setPedidoAnimando] = useState(null); // ID do pedido em animação
  const [pedidoAnimandoStatus, setPedidoAnimandoStatus] = useState(null); // Status do pedido em animação
  const [pedidoAnimandoDados, setPedidoAnimandoDados] = useState(null); // Dados do pedido em animação (com status antigo)
  const pedidoAnimandoRef = useRef(null); // Ref para acessar pedidoAnimando em callbacks
  const [paginaPreparando, setPaginaPreparando] = useState(0); // Página atual da lista de preparando
  const [paginaPronto, setPaginaPronto] = useState(0); // Página atual da lista de pronto
  const [itensPorPaginaPreparando, setItensPorPaginaPreparando] = useState(null);
  const [itensPorPaginaPronto, setItensPorPaginaPronto] = useState(null);
  const isModoGestor = modo === 'gestor';
  const hamburguerRef = useRef(null);
  const hamburguerContainerRef = useRef(null);
  const pedidosAnterioresRef = useRef([]);
  const cacheCarregadoRef = useRef(false); // Rastrear se o cache já foi carregado
  const animacaoTimeoutRef = useRef(null);
  const animacaoIntervalRef = useRef(null);
  const listaPreparandoRef = useRef(null);
  const listaProntoRef = useRef(null);
  const paginacaoIntervalRef = useRef(null);

  // Carregar configurações de animação e cache na inicialização
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        // Carregar configurações de animação
        const configAnimacao = await pedidoService.carregarConfigAnimacao();
        if (configAnimacao) {
          setAnimacaoAtivada(configAnimacao.animacaoAtivada ?? true);
          setIntervaloAnimacao(configAnimacao.intervaloAnimacao ?? 30);
          setDuracaoAnimacao(configAnimacao.duracaoAnimacao ?? 6);
          console.log('🔧 Configurações de animação carregadas:', configAnimacao);
        }
        
        // Carregar cache de pedidos (FONTE DE VERDADE) na inicialização para exibição imediata
        const cached = await pedidoService.carregarCache();
        if (cached && Array.isArray(cached)) {
          setPedidos(cached);
          pedidosAnterioresRef.current = cached;
          cacheCarregadoRef.current = true;
          console.log(`📦 Pedidos carregados do cache (fonte de verdade) na inicialização: ${cached.length} pedidos`);
        } else {
          // Se não houver cache, inicializar com array vazio
          setPedidos([]);
          pedidosAnterioresRef.current = [];
          console.log('📦 Nenhum cache encontrado, inicializando com array vazio');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao carregar configurações:', error);
      }
    };
    
    carregarConfiguracoes();
  }, []);

  // Detectar se algum pedido mudou de PREPARANDO para PRONTO
  const detectarMudancaStatus = (pedidosAnteriores, pedidosAtuais) => {
    // Verificar mudanças de status em pedidos existentes
    for (const pedidoAtual of pedidosAtuais) {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoAtual.id);
      if (pedidoAnterior && 
          pedidoAnterior.status === 'PREPARANDO' && 
          pedidoAtual.status === 'PRONTO') {
        return pedidoAtual;
      }
    }
    
    // Verificar se algum pedido novo foi adicionado diretamente como PRONTO
    // (caso raro, mas pode acontecer)
    for (const pedidoAtual of pedidosAtuais) {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoAtual.id);
      if (!pedidoAnterior && pedidoAtual.status === 'PRONTO') {
        // Não animar pedidos novos, apenas mudanças de status
        continue;
      }
    }
    
    return null;
  };

  // Animar transição de status
  const animarTransicaoStatus = (pedido, pedidoAnterior) => {
    console.log('🎬 Iniciando animação de transição:', pedido.id, pedidoAnterior.nomeCliente);
    setPedidoAnimando(pedido.id);
    pedidoAnimandoRef.current = pedido.id; // Atualizar ref também
    setPedidoAnimandoStatus('PREPARANDO'); // Começar na lista de preparando
    // Guardar uma cópia do pedido com status antigo para mostrar na lista de preparando
    setPedidoAnimandoDados({ ...pedidoAnterior, status: 'PREPARANDO' });
    console.log('🎬 Estado de animação configurado - Fase PREPARANDO');
    
    // Após metade da animação, mudar para a lista de pronto
    setTimeout(() => {
      console.log('🎬 Mudando para fase PRONTO');
      setPedidoAnimandoStatus('PRONTO');
      setPedidoAnimandoDados({ ...pedido, status: 'PRONTO' });
    }, 500);
    
    // Remover animação após a animação completar (1 segundo)
    // E atualizar o estado com os dados corretos
    setTimeout(() => {
      console.log('🎬 Finalizando animação');
      setPedidoAnimando(null);
      pedidoAnimandoRef.current = null; // Limpar ref também
      setPedidoAnimandoStatus(null);
      setPedidoAnimandoDados(null);
      // Forçar atualização do estado após animação terminar
      carregarPedidos();
    }, 1000);
  };

  const carregarPedidos = useCallback(async () => {
    try {
      // CACHE (JSON) É A FONTE DE VERDADE - sempre buscar do cache
      const cacheAtual = await pedidoService.carregarCache();
      
      // Se não houver cache, inicializar com array vazio
      const dados = (cacheAtual && Array.isArray(cacheAtual)) ? cacheAtual : [];
      
      // Verificar se houve mudanças na fila
      // Na primeira carga, pedidosAnterioresRef.current estará vazio, então sempre haverá mudanças
      const pedidosAnterioresStr = JSON.stringify([...pedidosAnterioresRef.current].sort((a, b) => a.id - b.id));
      const dadosStr = JSON.stringify([...dados].sort((a, b) => a.id - b.id));
      const houveMudancas = pedidosAnterioresStr !== dadosStr;
      const primeiraCarga = pedidosAnterioresRef.current.length === 0;
      
      if (primeiraCarga || houveMudancas) {
        console.log(`📦 ${primeiraCarga ? 'Primeira carga' : 'Mudanças detectadas'} no cache (fonte de verdade): ${dados.length} pedidos`);
      }
      
      // Detectar mudanças de status para animação (funciona em ambos os modos)
      // Mas não animar se já houver uma animação de transição em andamento
      let pedidoMudouStatus = null;
      let pedidoAnterior = null;
      // Usar ref para garantir acesso ao valor atual mesmo em callbacks
      const animacaoTransicaoEmAndamento = pedidoAnimandoRef.current !== null;
      
      if (pedidosAnterioresRef.current.length > 0 && houveMudancas && !animacaoTransicaoEmAndamento) {
        pedidoMudouStatus = detectarMudancaStatus(pedidosAnterioresRef.current, dados);
        if (pedidoMudouStatus) {
          pedidoAnterior = pedidosAnterioresRef.current.find(p => p.id === pedidoMudouStatus.id);
          console.log('Mudança de status detectada:', pedidoAnterior?.nomeCliente, 'PREPARANDO -> PRONTO');
        }
      }
      
      
      // Se houver mudanças e estiver em animação periódica (modo visualizador), interromper suavemente
      const estavaEmAnimacao = isAnimating && !isModoGestor;
      
      if (houveMudancas && estavaEmAnimacao) {
        // Parar a animação periódica imediatamente
        if (animacaoTimeoutRef.current) {
          clearTimeout(animacaoTimeoutRef.current);
          animacaoTimeoutRef.current = null;
        }
        if (animacaoIntervalRef.current) {
          clearInterval(animacaoIntervalRef.current);
          animacaoIntervalRef.current = null;
        }
        
        // Aguardar transição CSS completar antes de remover a classe de animação
        setTimeout(() => {
          setIsAnimating(false);
          
          // Se houver mudança de status, animar transição após voltar para lista (apenas se animação estiver ativada)
          if (pedidoMudouStatus && pedidoAnterior && animacaoAtivada) {
            animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior);
            
            // Reiniciar o intervalo de animação após a transição completar (apenas se animação estiver ativada)
            setTimeout(() => {
              if (animacaoAtivada && !isModoGestor) {
                const animarAutomaticamente = () => {
                  setIsAnimating(true);
                  animacaoTimeoutRef.current = setTimeout(() => {
                    setIsAnimating(false);
                  }, duracaoAnimacao * 1000);
                };
                
                animacaoIntervalRef.current = setInterval(animarAutomaticamente, intervaloAnimacao * 1000);
              }
            }, 2000); // Aguardar animação de transição completar (1s animação + 1s margem)
          } else if (animacaoAtivada && !isModoGestor) {
            // Se não houver mudança de status, apenas reiniciar o intervalo (apenas se animação estiver ativada)
            const animarAutomaticamente = () => {
              setIsAnimating(true);
              animacaoTimeoutRef.current = setTimeout(() => {
                setIsAnimating(false);
              }, duracaoAnimacao * 1000);
            };
            
            animacaoIntervalRef.current = setInterval(animarAutomaticamente, intervaloAnimacao * 1000);
          }
        }, 800); // Tempo da transição CSS
      } else if (pedidoMudouStatus && pedidoAnterior && animacaoAtivada && !isModoGestor) {
        // Se detectou mudança de status e NÃO estava em animação periódica, animar transição diretamente (apenas se animação estiver ativada)
        animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior);
      }
      
      // SEMPRE atualizar estado com dados do cache (fonte de verdade)
      // Atualizar apenas se houver mudanças para evitar loops infinitos
      // IMPORTANTE: Durante animação, precisamos manter o pedido na lista original
      // mas também precisamos atualizar o estado para que outros pedidos sejam atualizados
      if (houveMudancas || primeiraCarga) {
        pedidosAnterioresRef.current = dados;
        
        // Se houver animação de transição em andamento, precisamos ser cuidadosos
        // Não queremos remover o pedido animando da lista antes da animação terminar
        if (animacaoTransicaoEmAndamento) {
          // Durante a animação, não atualizar o estado visual para não interferir
          // A animação controla a exibição através de pedidoAnimandoDados
          console.log(`⏸️ Animação em andamento (pedido ${pedidoAnimandoRef.current}), não atualizando estado visual`);
          // Apenas atualizar a referência para próximas comparações
          // Mas não atualizar o estado visual para não interferir na animação
        } else {
          // Sem animação, atualizar normalmente
          setPedidos(dados);
          console.log(`✅ Estado atualizado com dados do cache (fonte de verdade): ${dados.length} pedidos`);
        }
      }
      
    } catch (err) {
      console.error('❌ Erro ao carregar pedidos do cache:', err);
      // Se falhar, manter estado atual (não limpar)
      console.warn('⚠️ Erro ao carregar cache, mantendo estado atual');
    }
  }, [isAnimating, animacaoAtivada, isModoGestor, intervaloAnimacao, duracaoAnimacao]);

  useEffect(() => {
    // Carregar pedidos na inicialização
    carregarPedidos();
    
    // Atualizar a cada 2 segundos
    const interval = setInterval(carregarPedidos, 2000);
    return () => clearInterval(interval);
  }, [carregarPedidos]);

  // Animação automática apenas no modo visualizador e se estiver ativada
  useEffect(() => {
    if (isModoGestor || !animacaoAtivada) {
      // Limpar intervalos se desativar animação ou mudar para modo gestor
      if (animacaoIntervalRef.current) {
        clearInterval(animacaoIntervalRef.current);
        animacaoIntervalRef.current = null;
      }
      if (animacaoTimeoutRef.current) {
        clearTimeout(animacaoTimeoutRef.current);
        animacaoTimeoutRef.current = null;
      }
      return;
    }

    const animarAutomaticamente = () => {
      setIsAnimating(true);
      animacaoTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, duracaoAnimacao * 1000);
    };

    // Primeira animação após o intervalo
    const timeoutInicial = setTimeout(animarAutomaticamente, intervaloAnimacao * 1000);

    // Intervalo para repetir a animação
    animacaoIntervalRef.current = setInterval(animarAutomaticamente, intervaloAnimacao * 1000);

    return () => {
      clearTimeout(timeoutInicial);
      if (animacaoIntervalRef.current) {
        clearInterval(animacaoIntervalRef.current);
      }
      if (animacaoTimeoutRef.current) {
        clearTimeout(animacaoTimeoutRef.current);
      }
    };
  }, [isModoGestor, intervaloAnimacao, duracaoAnimacao, animacaoAtivada]);

  // Filtrar pedidos, mas manter o pedido animando na lista original durante a animação
  const pedidosPreparando = pedidos.filter(p => {
    // Se o pedido está animando, não incluí-lo aqui (será adicionado separadamente)
    if (pedidoAnimando === p.id) {
      return false;
    }
    return p.status === 'PREPARANDO';
  });
  
  // Adicionar pedido animando na lista de preparando se estiver na fase de saída
  if (pedidoAnimandoDados && pedidoAnimandoStatus === 'PREPARANDO') {
    const jaExiste = pedidosPreparando.some(p => p.id === pedidoAnimandoDados.id);
    if (!jaExiste) {
      pedidosPreparando.push(pedidoAnimandoDados);
      console.log('➕ Pedido adicionado à lista PREPARANDO para animação:', pedidoAnimandoDados.nomeCliente);
    }
  }
  
  const pedidosProntos = pedidos.filter(p => {
    // Se o pedido está animando, não incluí-lo aqui (será adicionado separadamente)
    if (pedidoAnimando === p.id) {
      return false;
    }
    return p.status === 'PRONTO';
  });
  
  // Adicionar pedido animando na lista de pronto se estiver na fase de entrada
  if (pedidoAnimandoDados && pedidoAnimandoStatus === 'PRONTO') {
    const jaExiste = pedidosProntos.some(p => p.id === pedidoAnimandoDados.id);
    if (!jaExiste) {
      pedidosProntos.push(pedidoAnimandoDados);
      console.log('➕ Pedido adicionado à lista PRONTO para animação:', pedidoAnimandoDados.nomeCliente);
    }
  }

  // Calcular quantos itens cabem na tela após renderização
  useEffect(() => {
    if (isModoGestor) {
      setItensPorPaginaPreparando(null);
      setItensPorPaginaPronto(null);
      return;
    }

    const calcularItensPorPagina = (listaRef) => {
      if (!listaRef.current) return null;
      
      const container = listaRef.current;
      const alturaContainer = container.clientHeight;
      const primeiroItem = container.querySelector('.card-pedido');
      
      if (!primeiroItem || alturaContainer === 0) return null;
      
      const alturaItem = primeiroItem.offsetHeight;
      const gap = 15; // gap entre itens (definido no CSS)
      const itensPorPagina = Math.floor((alturaContainer + gap) / (alturaItem + gap));
      
      return Math.max(1, itensPorPagina); // Pelo menos 1 item por página
    };

    // Função para recalcular após renderização
    const recalcular = () => {
      if (listaPreparandoRef.current) {
        const itens = calcularItensPorPagina(listaPreparandoRef);
        if (itens !== null) {
          setItensPorPaginaPreparando(itens);
        }
      }
      if (listaProntoRef.current) {
        const itens = calcularItensPorPagina(listaProntoRef);
        if (itens !== null) {
          setItensPorPaginaPronto(itens);
        }
      }
    };

    // Aguardar um pouco para garantir que o DOM está renderizado
    const timeoutId1 = setTimeout(recalcular, 100);
    
    // Recalcular após mais tempo para garantir que animações e transições terminaram
    const timeoutId2 = setTimeout(recalcular, 600);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [isModoGestor, pedidosPreparando.length, pedidosProntos.length, isAnimating]);

  // Aplicar paginação (apenas no modo visualizador)
  const obterPedidosPagina = (listaCompleta, pagina, itensPorPagina) => {
    if (isModoGestor || !itensPorPagina || listaCompleta.length <= itensPorPagina) {
      return listaCompleta; // Modo gestor ou se todos cabem na tela, mostrar todos
    }

    const inicio = pagina * itensPorPagina;
    const fim = inicio + itensPorPagina;
    return listaCompleta.slice(inicio, fim);
  };

  const pedidosPreparandoPaginados = obterPedidosPagina(pedidosPreparando, paginaPreparando, itensPorPaginaPreparando);
  const pedidosProntosPaginados = obterPedidosPagina(pedidosProntos, paginaPronto, itensPorPaginaPronto);

  // Calcular informações de paginação para exibir indicadores
  const getInfoPagina = (listaCompleta, pagina, itensPorPagina) => {
    // No modo gestor, nunca paginar
    if (isModoGestor) {
      return { totalPaginas: 1, paginaAtual: 0, temPagina: false };
    }

    // Se ainda não calculou, não paginar ainda
    if (!itensPorPagina) {
      return { totalPaginas: 1, paginaAtual: 0, temPagina: false };
    }

    // Se todos cabem na tela, não precisa paginar
    if (listaCompleta.length <= itensPorPagina) {
      return { totalPaginas: 1, paginaAtual: 0, temPagina: false };
    }

    const totalPaginas = Math.ceil(listaCompleta.length / itensPorPagina);
    // Sempre mostrar quando há mais de 1 página (mesmo que seja só temporariamente durante cálculo)
    return { 
      totalPaginas, 
      paginaAtual: pagina, 
      temPagina: totalPaginas > 1 
    };
  };

  const infoPaginaPreparando = getInfoPagina(pedidosPreparando, paginaPreparando, itensPorPaginaPreparando);
  const infoPaginaPronto = getInfoPagina(pedidosProntos, paginaPronto, itensPorPaginaPronto);

  // Paginação automática apenas no modo visualizador
  useEffect(() => {
    if (isModoGestor) {
      // Limpar intervalo de paginação se mudar para modo gestor
      if (paginacaoIntervalRef.current) {
        clearInterval(paginacaoIntervalRef.current);
        paginacaoIntervalRef.current = null;
      }
      // Resetar páginas
      setPaginaPreparando(0);
      setPaginaPronto(0);
      return;
    }

    // Trocar de página
    const trocarPagina = () => {
      // Trocar página para preparando
      if (itensPorPaginaPreparando && pedidosPreparando.length > itensPorPaginaPreparando) {
        const totalPaginasPreparando = Math.ceil(pedidosPreparando.length / itensPorPaginaPreparando);
        if (totalPaginasPreparando > 1) {
          setPaginaPreparando(prev => {
            // Garantir que a página atual não ultrapasse o total de páginas
            const paginaAjustada = prev >= totalPaginasPreparando ? 0 : prev;
            return (paginaAjustada + 1) % totalPaginasPreparando;
          });
        }
      }

      // Trocar página para pronto
      if (itensPorPaginaPronto && pedidosProntos.length > itensPorPaginaPronto) {
        const totalPaginasPronto = Math.ceil(pedidosProntos.length / itensPorPaginaPronto);
        if (totalPaginasPronto > 1) {
          setPaginaPronto(prev => {
            // Garantir que a página atual não ultrapasse o total de páginas
            const paginaAjustada = prev >= totalPaginasPronto ? 0 : prev;
            return (paginaAjustada + 1) % totalPaginasPronto;
          });
        }
      }
    };

    // Ajustar páginas quando o número de itens por página ou quantidade de pedidos mudar
    const ajustarPaginas = () => {
      // Ajustar página de preparando se necessário
      if (itensPorPaginaPreparando && pedidosPreparando.length > itensPorPaginaPreparando) {
        const totalPaginasPreparando = Math.ceil(pedidosPreparando.length / itensPorPaginaPreparando);
        setPaginaPreparando(prev => {
          // Se não há mais necessidade de paginação, voltar para 0
          if (totalPaginasPreparando <= 1) return 0;
          // Se a página atual é maior ou igual ao total, ajustar para última página válida
          return prev >= totalPaginasPreparando ? totalPaginasPreparando - 1 : prev;
        });
      } else if (!itensPorPaginaPreparando || pedidosPreparando.length <= itensPorPaginaPreparando) {
        // Se não precisa mais paginar (não há itensPorPagina ou todos cabem), apenas garantir que está em 0
        setPaginaPreparando(0);
      }

      // Ajustar página de pronto se necessário
      if (itensPorPaginaPronto && pedidosProntos.length > itensPorPaginaPronto) {
        const totalPaginasPronto = Math.ceil(pedidosProntos.length / itensPorPaginaPronto);
        setPaginaPronto(prev => {
          // Se não há mais necessidade de paginação, voltar para 0
          if (totalPaginasPronto <= 1) return 0;
          // Se a página atual é maior ou igual ao total, ajustar para última página válida
          return prev >= totalPaginasPronto ? totalPaginasPronto - 1 : prev;
        });
      } else if (!itensPorPaginaPronto || pedidosProntos.length <= itensPorPaginaPronto) {
        // Se não precisa mais paginar (não há itensPorPagina ou todos cabem), apenas garantir que está em 0
        setPaginaPronto(0);
      }
    };

    // Aguardar renderização antes de ajustar e iniciar paginação
    const timeoutId = setTimeout(() => {
      // Ajustar páginas apenas se necessário (não resetar se ainda há paginação)
      ajustarPaginas();

      // Iniciar/continuar paginação automática a cada 5 segundos se necessário
      // Limpar intervalo anterior se existir
      if (paginacaoIntervalRef.current) {
        clearInterval(paginacaoIntervalRef.current);
      }

      // Verificar se ainda precisa de paginação antes de iniciar
      const precisaPaginarPreparando = itensPorPaginaPreparando && pedidosPreparando.length > itensPorPaginaPreparando;
      const precisaPaginarPronto = itensPorPaginaPronto && pedidosProntos.length > itensPorPaginaPronto;

      if (precisaPaginarPreparando || precisaPaginarPronto) {
        paginacaoIntervalRef.current = setInterval(trocarPagina, 5000);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      // Não limpar o intervalo aqui, deixar que o próximo useEffect gerencie
    };
  }, [isModoGestor, pedidosPreparando.length, pedidosProntos.length, itensPorPaginaPreparando, itensPorPaginaPronto]);

  const handleAdicionarPedido = async (e) => {
    e.preventDefault();
    
    if (!nomeCliente.trim()) {
      setError('Por favor, informe o nome do cliente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Chamar API - banco de dados é fonte de verdade
      await pedidoService.criarPedido(nomeCliente.trim());
      setNomeCliente('');
      
      // Recarregar do banco (fonte de verdade) para sincronizar
      // O backend já atualiza o cache automaticamente
      await carregarPedidos();
    } catch (err) {
      console.error('❌ Erro ao adicionar pedido:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao adicionar pedido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoPronto = async (id) => {
    try {
      setError('');
      // Encontrar o pedido antes de atualizar para animação
      const pedidoAntes = pedidos.find(p => p.id === id);
      
      if (!pedidoAntes) {
        setError('Pedido não encontrado');
        return;
      }
      
      // Chamar API - banco de dados é fonte de verdade
      await pedidoService.marcarComoPronto(id);
      
      console.log('🔍 Verificando condições para animação:');
      console.log('  - Status anterior:', pedidoAntes.status);
      console.log('  - Animação ativada:', animacaoAtivada);
      console.log('  - Modo gestor:', isModoGestor);
      
      // Animar transição se mudou de PREPARANDO para PRONTO (apenas se animação estiver ativada)
      // IMPORTANTE: A animação deve funcionar também no modo gestor!
      if (pedidoAntes.status === 'PREPARANDO' && animacaoAtivada) {
        console.log('✅ Condições atendidas, iniciando animação');
        const pedidoAtualizado = { ...pedidoAntes, status: 'PRONTO' };
        animarTransicaoStatus(pedidoAtualizado, pedidoAntes);
        // Não recarregar aqui - animarTransicaoStatus já chama carregarPedidos ao final
      } else {
        console.log('❌ Condições não atendidas para animação');
        if (pedidoAntes.status !== 'PREPARANDO') {
          console.log('  - Razão: Status anterior não é PREPARANDO');
        }
        if (!animacaoAtivada) {
          console.log('  - Razão: Animação está desativada');
        }
        // Se não houver animação, recarregar imediatamente
        await carregarPedidos();
      }
    } catch (err) {
      console.error('❌ Erro ao marcar pedido como pronto:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao marcar pedido como pronto';
      setError(errorMessage);
      
      // Se for 404, pode ser que o pedido não existe mais
      if (err.response?.status === 404) {
        // Recarregar para sincronizar
        await carregarPedidos();
      }
    }
  };

  const handleRemoverPedido = async (id) => {
    try {
      setError('');
      // Chamar API - banco de dados é fonte de verdade
      await pedidoService.removerPedido(id);
      
      // Recarregar do banco (fonte de verdade) para sincronizar
      // O backend já atualiza o cache automaticamente
      await carregarPedidos();
    } catch (err) {
      console.error('❌ Erro ao remover pedido:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao remover pedido';
      setError(errorMessage);
      
      // Se for 404, pode ser que o pedido não existe mais
      if (err.response?.status === 404) {
        // Recarregar para sincronizar
        await carregarPedidos();
      }
    }
  };

  // FLIP animation para o hambúrguer
  useLayoutEffect(() => {
    if (!hamburguerContainerRef.current) return;

    if (isAnimating) {
      const container = hamburguerContainerRef.current;
      
      // First: capturar posição inicial
      const rect = container.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      
      // Last: aplicar mudança de posição (position: fixed)
      container.style.position = 'fixed';
      container.style.bottom = '30px';
      container.style.left = '30px';
      container.style.width = 'auto';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.zIndex = '10001';
      
      // Invert: calcular diferença e aplicar transform inverso
      requestAnimationFrame(() => {
        const endRect = container.getBoundingClientRect();
        const endX = endRect.left + endRect.width / 2;
        const endY = endRect.top + endRect.height / 2;
        
        const deltaX = startX - endX;
        const deltaY = startY - endY;
        
        container.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // Play: animar para posição final
        requestAnimationFrame(() => {
          container.style.transition = 'transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          container.style.transform = 'translate(0, 0)';
        });
      });
    } else {
      // Reset quando animação terminar
      const container = hamburguerContainerRef.current;
      container.style.position = '';
      container.style.bottom = '';
      container.style.left = '';
      container.style.width = '';
      container.style.padding = '';
      container.style.margin = '';
      container.style.zIndex = '';
      container.style.transform = '';
      container.style.transition = '';
    }
  }, [isAnimating]);

  const handleAnimacaoManual = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, duracaoAnimacao * 1000);
  };

  const handleSalvarConfig = () => {
    // Salvar configurações de animação no cache persistente
    pedidoService.salvarConfigAnimacao({
      animacaoAtivada,
      intervaloAnimacao,
      duracaoAnimacao
    });
    setShowConfig(false);
  };

  return (
    <div className={`fila-pedidos-container ${isAnimating ? 'animando' : ''}`}>
      <div className={`coluna-lateral ${isAnimating ? 'escondido' : ''}`}>
        <header className={`header ${isAnimating ? 'animating' : ''}`}>
          <div className="logo-container">
            <img 
              src="/experimenta_ai_banner_circular.png" 
              alt="Experimenta aí" 
              className={`logo-imagem ${isAnimating ? 'expandido' : ''}`}
            />
            {isAnimating && (
              <div className="mensagem-animacao">
                Fica a vontade, aqui é o <span className="soneca-fogo">
                  <img 
                    src="/fogo.gif" 
                    alt="" 
                    className="fogo-gif"
                    aria-hidden="true"
                  />
                  soneca
                </span>
              </div>
            )}
          </div>
          <h2 className={`titulo-fila ${isAnimating ? 'escondido' : ''}`}>Fila de Pedidos</h2>
          <button 
            className={`btn-trocar-modo ${isAnimating ? 'escondido' : ''}`}
            onClick={onTrocarModo}
            title="Trocar modo de acesso"
          >
            🔄 Trocar Modo
          </button>
          {!isModoGestor && (
            <>
              <button 
                className={`btn-animacao-manual ${isAnimating ? 'escondido' : ''}`}
                onClick={handleAnimacaoManual}
                disabled={isAnimating}
                title="Reproduzir animação manualmente"
              >
                ✨ Animar
              </button>
              <button 
                className={`btn-config-animacao ${isAnimating ? 'escondido' : ''}`}
                onClick={() => setShowConfig(true)}
                title="Configurar animação"
              >
                ⚙️ Configurar Animação
              </button>
            </>
          )}
        </header>

        {showConfig && (
          <div className="modal-config-overlay" onClick={() => setShowConfig(false)}>
            <div className="modal-config" onClick={(e) => e.stopPropagation()}>
              <h3>Configurar Animação</h3>
              <div className="config-item">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={animacaoAtivada}
                    onChange={(e) => setAnimacaoAtivada(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span>Ativar animação</span>
                </label>
              </div>
              <div className="config-item">
                <label>
                  Intervalo entre animações (segundos):
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={intervaloAnimacao}
                    onChange={(e) => setIntervaloAnimacao(Number(e.target.value))}
                    disabled={!animacaoAtivada}
                  />
                </label>
              </div>
              <div className="config-item">
                <label>
                  Duração da animação (segundos):
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={duracaoAnimacao}
                    onChange={(e) => setDuracaoAnimacao(Number(e.target.value))}
                    disabled={!animacaoAtivada}
                  />
                </label>
              </div>
              <div className="modal-buttons">
                <button className="btn-salvar" onClick={handleSalvarConfig}>
                  Salvar
                </button>
                <button className="btn-cancelar" onClick={() => setShowConfig(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {isModoGestor && (
          <div className={`form-container ${isAnimating ? 'escondido' : ''}`}>
            <form onSubmit={handleAdicionarPedido} className="form-adicionar">
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Digite o nome do cliente..."
                className="input-nome"
                disabled={loading}
              />
              <button 
                type="submit" 
                className="btn-adicionar"
                disabled={loading}
              >
                {loading ? 'Adicionando...' : '➕ Adicionar Pedido'}
              </button>
            </form>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {!isModoGestor && (
          <div 
            ref={hamburguerContainerRef}
            className="hamburguer-container"
          >
            <img 
              ref={hamburguerRef}
              src="/hamburguer_surfante.gif" 
              alt="Hambúrguer surfante" 
              className="hamburguer-imagem"
            />
          </div>
        )}
      </div>

      <div className={`coluna-fila coluna-preparando ${isAnimating ? 'saindo' : ''}`}>
        <div className="cabecalho-coluna preparando">
          <h2>⏳ PREPARANDO</h2>
          <div className="cabecalho-direita">
            {!isModoGestor && infoPaginaPreparando.temPagina && (
              <div className="indicador-pagina-header">
                <span className="pagina-info-header">
                  Página {infoPaginaPreparando.paginaAtual + 1} de {infoPaginaPreparando.totalPaginas}
                </span>
                <div className="pontos-pagina-header">
                  {Array.from({ length: infoPaginaPreparando.totalPaginas }, (_, i) => (
                    <span 
                      key={i} 
                      className={`ponto-pagina-header ${i === infoPaginaPreparando.paginaAtual ? 'ativo' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <span className="contador">{pedidosPreparando.length}</span>
          </div>
        </div>
        <div 
          ref={listaPreparandoRef}
          className={`lista-pedidos ${!isModoGestor && infoPaginaPreparando.temPagina ? 'lista-paginada' : ''}`}
        >
          {pedidosPreparando.length === 0 ? (
            <div className="pedido-vazio">Nenhum pedido em preparação</div>
          ) : (
            pedidosPreparandoPaginados.map((pedido) => (
              <div 
                key={pedido.id} 
                className={`card-pedido preparando ${pedidoAnimando === pedido.id ? 'animando-saida' : ''}`}
                data-pedido-id={pedido.id}
              >
                <div className={`nome-cliente ${isModoGestor ? 'com-numero' : 'sem-numero'}`}>{pedido.nomeCliente}</div>
                {isModoGestor && (
                  <button
                    onClick={() => handleMarcarComoPronto(pedido.id)}
                    className="btn-acao btn-pronto"
                  >
                    ✅ Marcar como Pronto
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`coluna-fila coluna-pronto ${isAnimating ? 'saindo' : ''}`}>
        <div className="cabecalho-coluna pronto">
          <h2>✅ PRONTO</h2>
          <div className="cabecalho-direita">
            {!isModoGestor && infoPaginaPronto.temPagina && (
              <div className="indicador-pagina-header">
                <span className="pagina-info-header">
                  Página {infoPaginaPronto.paginaAtual + 1} de {infoPaginaPronto.totalPaginas}
                </span>
                <div className="pontos-pagina-header">
                  {Array.from({ length: infoPaginaPronto.totalPaginas }, (_, i) => (
                    <span 
                      key={i} 
                      className={`ponto-pagina-header ${i === infoPaginaPronto.paginaAtual ? 'ativo' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}
            <span className="contador">{pedidosProntos.length}</span>
          </div>
        </div>
        <div 
          ref={listaProntoRef}
          className={`lista-pedidos ${!isModoGestor && infoPaginaPronto.temPagina ? 'lista-paginada' : ''}`}
        >
          {pedidosProntos.length === 0 ? (
            <div className="pedido-vazio">Nenhum pedido pronto</div>
          ) : (
            pedidosProntosPaginados.map((pedido) => (
              <div 
                key={pedido.id} 
                className={`card-pedido pronto ${pedidoAnimando === pedido.id ? 'animando-entrada' : ''}`}
                data-pedido-id={pedido.id}
              >
                <div className={`nome-cliente ${isModoGestor ? 'com-numero' : 'sem-numero'}`}>{pedido.nomeCliente}</div>
                {isModoGestor && (
                  <button
                    onClick={() => handleRemoverPedido(pedido.id)}
                    className="btn-acao btn-remover"
                  >
                    🗑️ Remover da Fila
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FilaPedidos;

