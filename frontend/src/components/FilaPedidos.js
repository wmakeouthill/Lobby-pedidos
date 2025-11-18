import React, { useState, useEffect } from 'react';
import './FilaPedidos.css';
import pedidoService from '../services/pedidoService';

const FilaPedidos = ({ modo, onTrocarModo }) => {
  const [pedidos, setPedidos] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [intervaloAnimacao, setIntervaloAnimacao] = useState(30); // segundos
  const [duracaoAnimacao, setDuracaoAnimacao] = useState(6); // segundos
  const isModoGestor = modo === 'gestor';

  useEffect(() => {
    carregarPedidos();
    const interval = setInterval(carregarPedidos, 2000);
    return () => clearInterval(interval);
  }, []);

  // Animação automática apenas no modo visualizador
  useEffect(() => {
    if (isModoGestor) return;

    const animarAutomaticamente = () => {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, duracaoAnimacao * 1000);
    };

    // Primeira animação após o intervalo
    const timeoutInicial = setTimeout(animarAutomaticamente, intervaloAnimacao * 1000);

    // Intervalo para repetir a animação
    const intervalAnimacao = setInterval(animarAutomaticamente, intervaloAnimacao * 1000);

    return () => {
      clearTimeout(timeoutInicial);
      clearInterval(intervalAnimacao);
    };
  }, [isModoGestor, intervaloAnimacao, duracaoAnimacao]);

  const carregarPedidos = async () => {
    try {
      const dados = await pedidoService.listarTodosPedidos();
      setPedidos(dados);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    }
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
      await pedidoService.marcarComoPronto(id);
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

  const pedidosPreparando = pedidos.filter(p => p.status === 'PREPARANDO');
  const pedidosProntos = pedidos.filter(p => p.status === 'PRONTO');

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
            {!isModoGestor && isAnimating && (
              <div className="hamburguer-container">
                <img 
                  src="/hamburguer_surfante.gif" 
                  alt="Hambúrguer surfante" 
                  className="hamburguer-imagem"
                />
              </div>
            )}
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

        {!isModoGestor && !isAnimating && (
          <div className="hamburguer-container">
            <img 
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
              <div key={pedido.id} className="card-pedido preparando">
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
              <div key={pedido.id} className="card-pedido pronto">
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

