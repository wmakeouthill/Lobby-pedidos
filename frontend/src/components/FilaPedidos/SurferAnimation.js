import React, { useRef, useLayoutEffect } from 'react';

const SurferAnimation = ({ isModoGestor, isAnimating }) => {
    const hamburguerRef = useRef(null);
    const hamburguerContainerRef = useRef(null);

    // FLIP animation logic
    useLayoutEffect(() => {
        if (!hamburguerContainerRef.current) return;

        if (isAnimating) {
            const container = hamburguerContainerRef.current;

            // First
            const rect = container.getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;

            // Last
            container.style.position = "fixed";
            container.style.bottom = "30px";
            container.style.left = "30px";
            container.style.width = "auto";
            container.style.padding = "0";
            container.style.margin = "0";
            container.style.zIndex = "10001";

            // Invert
            requestAnimationFrame(() => {
                const endRect = container.getBoundingClientRect();
                const endX = endRect.left + endRect.width / 2;
                const endY = endRect.top + endRect.height / 2;

                const deltaX = startX - endX;
                const deltaY = startY - endY;

                container.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                // Play
                requestAnimationFrame(() => {
                    container.style.transition =
                        "transform 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
                    container.style.transform = "translate(0, 0)";
                });
            });
        } else {
            // Reset
            const container = hamburguerContainerRef.current;
            if (container) {
                container.style.position = "";
                container.style.bottom = "";
                container.style.left = "";
                container.style.width = "";
                container.style.padding = "";
                container.style.margin = "";
                container.style.zIndex = "";
                container.style.transform = "";
                container.style.transition = "";
            }
        }
    }, [isAnimating]);

    if (isModoGestor) return null;

    return (
        <div ref={hamburguerContainerRef} className="hamburguer-container">
            <img
                ref={hamburguerRef}
                src="/hamburguer_surfante.gif"
                alt="Hambúrguer surfante"
                className="hamburguer-imagem"
            />
        </div>
    );
};

export default SurferAnimation;
