import { useState, useEffect, useRef } from 'react';

const usePagination = (items, containerRef, isGestor) => {
    const [pagina, setPagina] = useState(0);
    const [itensPorPagina, setItensPorPagina] = useState(null);

    // Calcular itens por página
    useEffect(() => {
        if (isGestor) {
            setItensPorPagina(null);
            return;
        }

        const calcularItens = () => {
            if (!containerRef.current) return null;

            const container = containerRef.current;
            const alturaContainer = container.clientHeight;
            const primeiroItem = container.querySelector(".card-pedido");

            if (!primeiroItem || alturaContainer === 0) return null;

            // Usar altura base definida no CSS (min-height: 75px) para cálculo
            // Isso garante que calculamos quantos cards cabem no mínimo, e o flexbox expande
            const alturaBase = 75;
            const gap = 15; // gap entre itens
            // Subtrair um buffer de segurança (20px) para evitar cortes
            const itens = Math.floor((alturaContainer - 20 + gap) / (alturaBase + gap));

            return Math.max(1, itens);
        };

        const recalcular = () => {
            const itens = calcularItens();
            if (itens !== null) {
                setItensPorPagina(itens);
            }
        };

        const timeoutId1 = setTimeout(recalcular, 100);
        const timeoutId2 = setTimeout(recalcular, 600);

        return () => {
            clearTimeout(timeoutId1);
            clearTimeout(timeoutId2);
        };
    }, [isGestor, items.length, containerRef]); // Recalcular quando itens mudam

    // Lógica de paginação (sem automático)
    useEffect(() => {
        if (isGestor) {
            setPagina(0);
            return;
        }

        const ajustarPagina = () => {
            if (itensPorPagina && items.length > itensPorPagina) {
                const totalPaginas = Math.ceil(items.length / itensPorPagina);
                setPagina(prev => {
                    if (totalPaginas <= 1) return 0;
                    return prev >= totalPaginas ? totalPaginas - 1 : prev;
                });
            } else {
                setPagina(0);
            }
        };

        // Ajustar página quando itens mudam
        ajustarPagina();
    }, [isGestor, items.length, itensPorPagina]);

    const itensPaginados = (() => {
        if (isGestor || !itensPorPagina || items.length <= itensPorPagina) {
            return items;
        }
        const inicio = pagina * itensPorPagina;
        return items.slice(inicio, inicio + itensPorPagina);
    })();

    const infoPagina = (() => {
        if (isGestor || !itensPorPagina || items.length <= itensPorPagina) {
            return { totalPaginas: 1, paginaAtual: 0, temPagina: false };
        }
        const totalPaginas = Math.ceil(items.length / itensPorPagina);
        return {
            totalPaginas,
            paginaAtual: pagina,
            temPagina: totalPaginas > 1
        };
    })();

    return {
        itensPaginados,
        infoPagina,
        pagina,
        setPagina
    };
};

export default usePagination;
