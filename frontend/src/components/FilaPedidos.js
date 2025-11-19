import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './FilaPedidos.css';
import pedidoService from '../services/pedidoService';

const FilaPedidos = ({ modo, onTrocarModo }) => {
  const [pedidos, setPedidos] = useState(() => {
    // Carregar do cache na inicialização
    const cached = pedidoService.carregarCache();
    return cached || [];
  });
  const [nomeCliente, setNomeCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [intervaloAnimacao, setIntervaloAnimacao] = useState(30); // segundos
  const [duracaoAnimacao, setDuracaoAnimacao] = useState(6); // segundos
  const [pedidoAnimando, setPedidoAnimando] = useState(null); // ID do pedido em animação
  const [pedidoAnimandoStatus, setPedidoAnimandoStatus] = useState(null); // Status do pedido em animação
  const [pedidoAnimandoDados, setPedidoAnimandoDados] = useState(null); // Dados do pedido em animação (com status antigo)
  const isModoGestor = modo === 'gestor';
  const hamburguerRef = useRef(null);
  const hamburguerContainerRef = useRef(null);
  const pedidosAnterioresRef = useRef([]);
  const animacaoTimeoutRef = useRef(null);
  const animacaoIntervalRef = useRef(null);
  const listaPreparandoRef = useRef(null);
  const listaProntoRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  useEffect(() => {
    // Carregar pedidos na inicialização
    carregarPedidos();
    
    // Atualizar a cada 2 segundos
    const interval = setInterval(carregarPedidos, 2000);
    return () => clearInterval(interval);
  }, []);

  // Animação automática apenas no modo visualizador
  useEffect(() => {
    if (isModoGestor) return;

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
  }, [isModoGestor, intervaloAnimacao, duracaoAnimacao]);

  const carregarPedidos = async () => {
    try {
      const dados = await pedidoService.listarTodosPedidos();
      
      // Verificar se houve mudanças na fila
      const houveMudancas = JSON.stringify(pedidosAnterioresRef.current) !== JSON.stringify(dados);
      
      // Detectar mudanças de status para animação (funciona em ambos os modos)
      let pedidoMudouStatus = null;
      let pedidoAnterior = null;
      if (pedidosAnterioresRef.current.length > 0 && houveMudancas) {
        pedidoMudouStatus = detectarMudancaStatus(pedidosAnterioresRef.current, dados);
        if (pedidoMudouStatus) {
          pedidoAnterior = pedidosAnterioresRef.current.find(p => p.id === pedidoMudouStatus.id);
        }
      }
      
      // Se houver mudanças e estiver em animação periódica (modo visualizador), interromper
      if (houveMudancas && isAnimating && !isModoGestor) {
        if (animacaoTimeoutRef.current) {
          clearTimeout(animacaoTimeoutRef.current);
          animacaoTimeoutRef.current = null;
        }
        setIsAnimating(false);
        
        // Reiniciar o intervalo de animação após um pequeno delay
        setTimeout(() => {
          const animarAutomaticamente = () => {
            setIsAnimating(true);
            animacaoTimeoutRef.current = setTimeout(() => {
              setIsAnimating(false);
            }, duracaoAnimacao * 1000);
          };
          
          // Limpar intervalo anterior se existir
          if (animacaoIntervalRef.current) {
            clearInterval(animacaoIntervalRef.current);
          }
          
          animacaoIntervalRef.current = setInterval(animarAutomaticamente, intervaloAnimacao * 1000);
        }, 500);
      }
      
      // Se detectou mudança de status, animar transição (funciona em ambos os modos)
      if (pedidoMudouStatus && pedidoAnterior) {
        // Iniciar animação antes de atualizar o estado
        animarTransicaoStatus(pedidoMudouStatus, pedidoAnterior);
      }
      
      pedidosAnterioresRef.current = dados;
      setPedidos(dados);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
      // Se falhar, tentar usar cache
      const cached = pedidoService.carregarCache();
      if (cached) {
        setPedidos(cached);
      }
    }
  };

  // Detectar se algum pedido mudou de PREPARANDO para PRONTO
  const detectarMudancaStatus = (pedidosAnteriores, pedidosAtuais) => {
    for (const pedidoAtual of pedidosAtuais) {
      const pedidoAnterior = pedidosAnteriores.find(p => p.id === pedidoAtual.id);
      if (pedidoAnterior && 
          pedidoAnterior.status === 'PREPARANDO' && 
          pedidoAtual.status === 'PRONTO') {
        return pedidoAtual;
      }
    }
    return null;
  };

  // Animar transição de status
  const animarTransicaoStatus = (pedido, pedidoAnterior) => {
    setPedidoAnimando(pedido.id);
    setPedidoAnimandoStatus('PREPARANDO'); // Começar na lista de preparando
    // Guardar uma cópia do pedido com status antigo para mostrar na lista de preparando
    setPedidoAnimandoDados({ ...pedidoAnterior, status: 'PREPARANDO' });
    
    // Após metade da animação, mudar para a lista de pronto
    setTimeout(() => {
      setPedidoAnimandoStatus('PRONTO');
      setPedidoAnimandoDados({ ...pedido, status: 'PRONTO' });
    }, 500);
    
    // Remover animação após a animação completar (1 segundo)
    setTimeout(() => {
      setPedidoAnimando(null);
      setPedidoAnimandoStatus(null);
      setPedidoAnimandoDados(null);
    }, 1000);
  };

  const handleAdicionarPedido = async (e) => {
    e.preventDefault();
    
    if (!nomeCliente.trim()) {
      setError('Por favor, informe o nome do cliente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await pedidoService.criarPedido(nomeCliente.trim());
      setNomeCliente('');
      await carregarPedidos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao adicionar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarComoPronto = async (id) => {
    try {
      // Encontrar o pedido antes de atualizar para animação
      const pedidoAntes = pedidos.find(p => p.id === id);
      
      await pedidoService.marcarComoPronto(id);
      
      // Animar transição se mudou de PREPARANDO para PRONTO
      if (pedidoAntes && pedidoAntes.status === 'PREPARANDO') {
        const pedidoAtualizado = { ...pedidoAntes, status: 'PRONTO' };
        animarTransicaoStatus(pedidoAtualizado, pedidoAntes);
      }
      
      // Recarregar para sincronizar (a animação será mantida pelo estado)
      await carregarPedidos();
    } catch (err) {
      setError('Erro ao marcar pedido como pronto');
    }
  };

  const handleRemoverPedido = async (id) => {
    try {
      await pedidoService.removerPedido(id);
      await carregarPedidos();
    } catch (err) {
      setError('Erro ao remover pedido');
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
    setShowConfig(false);
  };

  // Filtrar pedidos, mas manter o pedido animando na lista original durante a animação
  const pedidosPreparando = pedidos.filter(p => {
    // Se o pedido está animando e ainda está na fase de saída, mostrar na lista de preparando
    if (pedidoAnimando === p.id && pedidoAnimandoStatus === 'PREPARANDO') {
      return true; // Manter na lista de preparando durante animação de saída
    }
    // Se o pedido está animando mas já mudou para a fase de entrada, não mostrar aqui
    if (pedidoAnimando === p.id && pedidoAnimandoStatus === 'PRONTO') {
      return false; // Não mostrar na lista de preparando durante animação de entrada
    }
    return p.status === 'PREPARANDO';
  });
  
  // Adicionar pedido animando na lista de preparando se estiver na fase de saída
  if (pedidoAnimandoDados && pedidoAnimandoStatus === 'PREPARANDO') {
    const jaExiste = pedidosPreparando.some(p => p.id === pedidoAnimandoDados.id);
    if (!jaExiste) {
      pedidosPreparando.push(pedidoAnimandoDados);
    }
  }
  
  const pedidosProntos = pedidos.filter(p => {
    // Se o pedido está animando e está na fase de entrada, mostrar na lista de pronto
    if (pedidoAnimando === p.id && pedidoAnimandoStatus === 'PRONTO') {
      return true; // Mostrar na lista de pronto durante animação de entrada
    }
    // Se o pedido está animando mas ainda está na fase de saída, não mostrar aqui ainda
    if (pedidoAnimando === p.id && pedidoAnimandoStatus === 'PREPARANDO') {
      return false; // Não mostrar na lista de pronto durante animação de saída
    }
    return p.status === 'PRONTO';
  });
  
  // Adicionar pedido animando na lista de pronto se estiver na fase de entrada
  if (pedidoAnimandoDados && pedidoAnimandoStatus === 'PRONTO') {
    const jaExiste = pedidosProntos.some(p => p.id === pedidoAnimandoDados.id);
    if (!jaExiste) {
      pedidosProntos.push(pedidoAnimandoDados);
    }
  }

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
                <label>
                  Intervalo entre animações (segundos):
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={intervaloAnimacao}
                    onChange={(e) => setIntervaloAnimacao(Number(e.target.value))}
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
          <span className="contador">{pedidosPreparando.length}</span>
        </div>
        <div className="lista-pedidos">
          {pedidosPreparando.length === 0 ? (
            <div className="pedido-vazio">Nenhum pedido em preparação</div>
          ) : (
            pedidosPreparando.map((pedido) => (
              <div 
                key={pedido.id} 
                className={`card-pedido preparando ${pedidoAnimando === pedido.id ? 'animando-saida' : ''}`}
                data-pedido-id={pedido.id}
              >
                <div className="nome-cliente">{pedido.nomeCliente}</div>
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
          <span className="contador">{pedidosProntos.length}</span>
        </div>
        <div className="lista-pedidos">
          {pedidosProntos.length === 0 ? (
            <div className="pedido-vazio">Nenhum pedido pronto</div>
          ) : (
            pedidosProntos.map((pedido) => (
              <div 
                key={pedido.id} 
                className={`card-pedido pronto ${pedidoAnimando === pedido.id ? 'animando-entrada' : ''}`}
                data-pedido-id={pedido.id}
              >
                <div className="nome-cliente">{pedido.nomeCliente}</div>
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

