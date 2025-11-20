import React from 'react';

const ConfigModal = ({
    showConfig,
    setShowConfig,
    config,
    setConfig,
    handleSalvarConfig
}) => {
    if (!showConfig) return null;

    const { animacaoAtivada, intervaloAnimacao, duracaoAnimacao } = config;
    const { setAnimacaoAtivada, setIntervaloAnimacao, setDuracaoAnimacao } = setConfig;

    return (
        <div
            className="modal-config-overlay"
            onClick={() => setShowConfig(false)}
        >
            <div className="modal-config" onClick={(e) => e.stopPropagation()}>
                <h3>Configurar Animação</h3>
                <div className="config-item">
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={animacaoAtivada}
                            onChange={(e) => setAnimacaoAtivada(e.target.checked)}
                            style={{ width: "20px", height: "20px", cursor: "pointer" }}
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
                    <button
                        className="btn-cancelar"
                        onClick={() => setShowConfig(false)}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;
