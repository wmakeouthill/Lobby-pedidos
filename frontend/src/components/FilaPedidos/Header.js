import React from 'react';

const Header = ({
    isAnimating,
    isModoGestor,
    onTrocarModo,
    handleAnimacaoManual,
    setShowConfig
}) => {
    return (
        <header className={`header ${isAnimating ? "animating" : ""}`}>
            <div className="logo-container">
                <img
                    src="/experimenta_ai_banner_circular.png"
                    alt="Experimenta aí"
                    className={`logo-imagem ${isAnimating ? "expandido" : ""}`}
                />
                {isAnimating && (
                    <div className="mensagem-animacao">
                        Fica a vontade, aqui é o{" "}
                        <span className="soneca-fogo">
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
            <h2 className={`titulo-fila ${isAnimating ? "escondido" : ""}`}>
                Fila de Pedidos
            </h2>
            <button
                className={`btn-trocar-modo ${isAnimating ? "escondido" : ""}`}
                onClick={onTrocarModo}
                title="Trocar modo de acesso"
            >
                🔄 Trocar Modo
            </button>
            <button
                className={`btn-animacao-manual ${isAnimating ? "escondido" : ""}`}
                onClick={handleAnimacaoManual}
                disabled={isAnimating}
                title="Reproduzir animação manualmente"
            >
                ✨ Animar
            </button>
            <button
                className={`btn-config-animacao ${isAnimating ? "escondido" : ""}`}
                onClick={() => setShowConfig(true)}
                title="Configurar animação"
            >
                ⚙️ Configurar Animação
            </button>
        </header>
    );
};

export default Header;
