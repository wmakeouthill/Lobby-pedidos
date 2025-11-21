import { useState, useEffect, useCallback, useMemo } from 'react';
import pedidoService from '../../../services/pedidoService';

const useAnimationConfig = () => {
    const [animacaoAtivada, setAnimacaoAtivada] = useState(true);
    const [intervaloAnimacao, setIntervaloAnimacao] = useState(30);
    const [duracaoAnimacao, setDuracaoAnimacao] = useState(6);
    const [showConfig, setShowConfig] = useState(false);
    const [configCarregada, setConfigCarregada] = useState(false);
    const [configCache, setConfigCache] = useState(null);

    // Memoizar valores padrão para evitar recriação
    const valoresPadrao = useMemo(() => ({
        animacaoAtivada: true,
        intervaloAnimacao: 30,
        duracaoAnimacao: 6
    }), []);

    // Memoizar configuração atual
    const configAtual = useMemo(() => ({
        animacaoAtivada,
        intervaloAnimacao,
        duracaoAnimacao,
    }), [animacaoAtivada, intervaloAnimacao, duracaoAnimacao]);

    // Verificar se configuração mudou dos valores padrão
    const configModificada = useMemo(() => {
        return animacaoAtivada !== valoresPadrao.animacaoAtivada ||
               intervaloAnimacao !== valoresPadrao.intervaloAnimacao ||
               duracaoAnimacao !== valoresPadrao.duracaoAnimacao;
    }, [animacaoAtivada, intervaloAnimacao, duracaoAnimacao, valoresPadrao]);

    // Carregar configurações apenas uma vez
    const carregarConfiguracoes = useCallback(async () => {
        try {
            const configAnimacao = await pedidoService.carregarConfigAnimacao();
            const configFinal = configAnimacao || valoresPadrao;

            setAnimacaoAtivada(configFinal.animacaoAtivada);
            setIntervaloAnimacao(configFinal.intervaloAnimacao);
            setDuracaoAnimacao(configFinal.duracaoAnimacao);
            setConfigCache(configFinal);
            setConfigCarregada(true);

            console.log("🔧 Configurações de animação carregadas:", configFinal);
            return configFinal;
        } catch (error) {
            console.warn("⚠️ Erro ao carregar configurações:", error);
            setConfigCarregada(true);
            return valoresPadrao;
        }
    }, [valoresPadrao]);

    // Carregar apenas no primeiro render
    useEffect(() => {
        carregarConfiguracoes();
    }, []); // Dependência vazia - executa apenas uma vez

    // Salvar configuração com invalidação de cache
    const salvarConfig = useCallback(async () => {
        try {
            await pedidoService.salvarConfigAnimacao(configAtual);
            setConfigCache(configAtual); // Atualizar cache local
            setShowConfig(false);
            console.log("✅ Configurações salvas e cache atualizado:", configAtual);
        } catch (error) {
            console.error("❌ Erro ao salvar configurações:", error);
        }
    }, [configAtual]);

    // Invalidar cache quando necessário
    const invalidarCache = useCallback(() => {
        setConfigCache(null);
        console.log("🔄 Cache de configurações invalidado");
    }, []);

    return {
        // Valores atuais
        animacaoAtivada,
        setAnimacaoAtivada,
        intervaloAnimacao,
        setIntervaloAnimacao,
        duracaoAnimacao,
        setDuracaoAnimacao,

        // Estado
        showConfig,
        setShowConfig,
        configCarregada,
        configModificada,

        // Ações
        salvarConfig,
        carregarConfiguracoes,
        invalidarCache,

        // Valores memoizados
        configAtual,
        valoresPadrao
    };
};

export default useAnimationConfig;
