import React from 'react';
import './ModoSelecao.css';

const ModoSelecao = ({ onSelecionarModo }) => {
  return (
    <div className="modo-selecao-container">
      <div className="modo-selecao-card">
        <header className="modo-header">
          <h1 className="modo-titulo">🍔 Experimenta aí</h1>
          <p className="modo-subtitulo">Escolha o modo de acesso</p>
        </header>

        <div className="modo-opcoes">
          <button 
            className="modo-opcao modo-gestor"
            onClick={() => onSelecionarModo('gestor')}
          >
            <div className="modo-icone">👨‍💼</div>
            <h2 className="modo-opcao-titulo">Modo Gestor</h2>
            <p className="modo-opcao-descricao">
              Acesso completo: adicionar pedidos, marcar como pronto e remover da fila
            </p>
          </button>

          <button 
            className="modo-opcao modo-cliente"
            onClick={() => onSelecionarModo('cliente')}
          >
            <div className="modo-icone">👀</div>
            <h2 className="modo-opcao-titulo">Modo Visualização</h2>
            <p className="modo-opcao-descricao">
              Apenas visualizar as filas de pedidos em preparação e prontos
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModoSelecao;

