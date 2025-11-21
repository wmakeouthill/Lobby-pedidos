import React from 'react';
import './OrderCardInline.css';

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

    const className = `card-pedido ${isPreparando ? "preparando" : "pronto"} ${!isModoGestor ? "modo-visualizacao" : ""} ${pedidoAnimando === pedido.id
        ? (isPreparando ? "animando-saida" : "animando-entrada")
        : ""
        }`;

    if (pedidoAnimando === pedido.id) {
        console.log(`🎨 [OrderCard] Pedido ${pedido.id} está animando! Status: ${pedido.status}, Classe: ${isPreparando ? "animando-saida" : "animando-entrada"}`);
    }

    return (
        <div className={className} data-pedido-id={pedido.id}>
            <div className="card-content">
                <div className={`nome-cliente ${isModoGestor ? "com-numero" : "sem-numero"}`}>
                    {pedido.nomeCliente}
                </div>
                {isModoGestor && isPreparando && (
                    <button
                        onClick={() => handleMarcarComoPronto(pedido.id)}
                        className="btn-acao btn-pronto"
                    >
                        Pronto
                    </button>
                )}
                {isModoGestor && isPronto && (
                    <button
                        onClick={() => handleRemoverPedido(pedido.id)}
                        className="btn-acao btn-remover"
                    >
                        Remover
                    </button>
                )}
            </div>
        </div>
    );
};

export default OrderCard;
