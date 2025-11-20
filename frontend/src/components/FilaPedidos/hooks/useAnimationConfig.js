import { useState, useEffect, useCallback } from 'react';
import pedidoService from '../../../services/pedidoService';

const useAnimationConfig = () => {
    const [animacaoAtivada, setAnimacaoAtivada] = useState(true);
    const [intervaloAnimacao, setIntervaloAnimacao] = useState(30);
    const [duracaoAnimacao, setDuracaoAnimacao] = useState(6);
    const [showConfig, setShowConfig] = useState(false);

    const carregarConfiguracoes = useCallback(async () => {
        try {
            const configAnimacao = await pedidoService.carregarConfigAnimacao();
            if (configAnimacao) {
                setAnimacaoAtivada(prev => {
                    const novo = configAnimacao.animacaoAtivada ?? true;
                    return prev !== novo ? novo : prev;
                });
                setIntervaloAnimacao(prev => {
                    const novo = configAnimacao.intervaloAnimacao ?? 30;
                    return prev !== novo ? novo : prev;
                });
                setDuracaoAnimacao(prev => {
                    const novo = configAnimacao.duracaoAnimacao ?? 6;
                    return prev !== novo ? novo : prev;
                });
                console.log("🔧 Configurações de animação carregadas:", configAnimacao);
            }
        } catch (error) {
            console.warn("⚠️ Erro ao carregar configurações:", error);
        }
    }, []);

    useEffect(() => {
        carregarConfiguracoes();
    }, [carregarConfiguracoes]);

    const salvarConfig = useCallback(() => {
        pedidoService.salvarConfigAnimacao({
            animacaoAtivada,
            intervaloAnimacao,
            duracaoAnimacao,
        });
        setShowConfig(false);
    }, [animacaoAtivada, intervaloAnimacao, duracaoAnimacao]);

    return {
        animacaoAtivada,
        setAnimacaoAtivada,
        intervaloAnimacao,
        setIntervaloAnimacao,
        duracaoAnimacao,
        setDuracaoAnimacao,
        showConfig,
        setShowConfig,
        salvarConfig,
        carregarConfiguracoes
    };
};

export default useAnimationConfig;
