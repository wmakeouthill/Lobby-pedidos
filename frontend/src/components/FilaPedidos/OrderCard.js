import React from 'react';

const OrderCard = ({
    pedido,
    isModoGestor,
    isAnimating,
    pedidoAnimando,
    handleMarcarComoPronto,
    handleRemoverPedido
}) => {
    const isPreparando = pedido.status === "PREPARANDO";
    const isPronto = pedido.status === "PRONTO";

    const className = `card-pedido ${isPreparando ? "preparando" : "pronto"} ${pedidoAnimando === pedido.id
            ? (isPreparando ? "animando-saida" : "animando-entrada")
            : ""
        }`;

    return (
        <div className={className} data-pedido-id={pedido.id}>
            <div className={`nome-cliente ${isModoGestor ? "com-numero" : "sem-numero"}`}>
                {pedido.nomeCliente}
            </div>
            {isModoGestor && isPreparando && (
                <button
                    onClick={() => handleMarcarComoPronto(pedido.id)}
                    className="btn-acao btn-pronto"
                >
                    ✅ Marcar como Pronto
                </button>
            )}
            {isModoGestor && isPronto && (
                <button
                    onClick={() => handleRemoverPedido(pedido.id)}
                    className="btn-acao btn-remover"
                >
                    🗑️ Remover da Fila
                </button>
            )}
        </div>
    );
};

export default OrderCard;
