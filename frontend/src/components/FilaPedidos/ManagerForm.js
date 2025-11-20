import React, { useState } from 'react';

const ManagerForm = ({ isModoGestor, isAnimating, onAdicionarPedido, loading, error }) => {
    const [nomeCliente, setNomeCliente] = useState("");

    if (!isModoGestor) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdicionarPedido(nomeCliente);
        setNomeCliente("");
    };

    return (
        <div className={`form-container ${isAnimating ? "escondido" : ""}`}>
            <form onSubmit={handleSubmit} className="form-adicionar">
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
                    {loading ? "Adicionando..." : "➕ Adicionar Pedido"}
                </button>
            </form>
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default ManagerForm;
