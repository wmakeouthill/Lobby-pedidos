import React, { useRef } from 'react';
import OrderCard from './OrderCard';
import usePagination from './hooks/usePagination';

const OrderList = ({
    title,
    status,
    pedidos,
    isModoGestor,
    isAnimating,
    pedidoAnimando,
    pedidoAnimandoDados,
    pedidoAnimandoStatus,
    handleMarcarComoPronto,
    handleRemoverPedido
}) => {
    const listRef = useRef(null);

    // Filter orders for this list
    const pedidosFiltrados = pedidos.filter(p => {
        if (pedidoAnimando === p.id) return false;
        return p.status === status;
    });

    // Add animating order if applicable
    const pedidosComAnimacao = [...pedidosFiltrados];
    if (pedidoAnimandoDados && pedidoAnimandoStatus === status) {
        const jaExiste = pedidosComAnimacao.some(p => p.id === pedidoAnimandoDados.id);
        if (!jaExiste) {
            pedidosComAnimacao.push(pedidoAnimandoDados);
        }
    }

    // Pagination
    const { itensPaginados, infoPagina } = usePagination(pedidosComAnimacao, listRef, isModoGestor);

    const isPreparando = status === "PREPARANDO";
    const columnClass = isPreparando ? "coluna-preparando" : "coluna-pronto";
    const headerClass = isPreparando ? "preparando" : "pronto";
    const titleText = isPreparando ? "⏳ PREPARANDO" : "✅ PRONTO";
    const emptyText = isPreparando ? "Nenhum pedido em preparação" : "Nenhum pedido pronto";

    return (
        <div className={`coluna-fila ${columnClass} ${isAnimating ? "saindo" : ""}`}>
            <div className={`cabecalho-coluna ${headerClass}`}>
                <h2>{titleText}</h2>
                <div className="cabecalho-direita">
                    {!isModoGestor && infoPagina.temPagina && (
                        <div className="indicador-pagina-header">
                            <span className="pagina-info-header">
                                Página {infoPagina.paginaAtual + 1} de {infoPagina.totalPaginas}
                            </span>
                            <div className="pontos-pagina-header">
                                {Array.from({ length: infoPagina.totalPaginas }, (_, i) => (
                                    <span
                                        key={i}
                                        className={`ponto-pagina-header ${i === infoPagina.paginaAtual ? "ativo" : ""}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <span className="contador">{pedidosComAnimacao.length}</span>
                </div>
            </div>
            <div
                ref={listRef}
                className={`lista-pedidos ${!isModoGestor && infoPagina.temPagina ? "lista-paginada" : ""}`}
            >
                {pedidosComAnimacao.length === 0 ? (
                    <div className="pedido-vazio">{emptyText}</div>
                ) : (
                    itensPaginados.map((pedido) => (
                        <OrderCard
                            key={pedido.id}
                            pedido={pedido}
                            isModoGestor={isModoGestor}
                            isAnimating={isAnimating}
                            pedidoAnimando={pedidoAnimando}
                            handleMarcarComoPronto={handleMarcarComoPronto}
                            handleRemoverPedido={handleRemoverPedido}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default OrderList;
