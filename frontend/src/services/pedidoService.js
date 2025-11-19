import axios from 'axios';

const API_BASE_URL = '/api/pedidos';
const CACHE_API_URL = '/api/cache';

const pedidoService = {
  // Salvar no cache (no sistema de arquivos via backend)
  salvarCache: async (pedidos) => {
    try {
      await axios.post(`${CACHE_API_URL}/pedidos`, pedidos);
      console.log(`✅ Cache salvo no sistema de arquivos: ${pedidos.length} pedidos`);
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      // Fallback para localStorage se o backend falhar
      try {
        if (typeof Storage !== 'undefined') {
          localStorage.setItem('lobby_pedidos_cache', JSON.stringify(pedidos));
          console.log('✅ Cache salvo no localStorage como fallback');
        }
      } catch (e) {
        console.error('❌ Erro ao salvar no localStorage também:', e);
      }
    }
  },

  // Carregar do cache (do sistema de arquivos via backend)
  carregarCache: async () => {
    try {
      const response = await axios.get(`${CACHE_API_URL}/pedidos`);
      if (response.status === 200 && response.data) {
        console.log(`✅ Cache carregado do sistema de arquivos: ${Array.isArray(response.data) ? response.data.length : 'dados'} pedidos`);
        return response.data;
      }
    } catch (error) {
      if (error.response && error.response.status === 204) {
        console.log('ℹ️ Nenhum cache encontrado no sistema de arquivos');
      } else {
        console.warn('⚠️ Erro ao carregar cache do sistema de arquivos:', error.message);
        // Fallback para localStorage se o backend falhar
        try {
          if (typeof Storage !== 'undefined') {
            const cached = localStorage.getItem('lobby_pedidos_cache');
            if (cached) {
              const pedidos = JSON.parse(cached);
              console.log(`✅ Cache carregado do localStorage como fallback: ${pedidos.length} pedidos`);
              return pedidos;
            }
          }
        } catch (e) {
          console.error('❌ Erro ao carregar do localStorage também:', e);
        }
      }
    }
    return null;
  },

  // Limpar cache (apenas quando remover pelo fluxo normal)
  limparCache: async () => {
    try {
      // O cache será limpo automaticamente quando não houver mais pedidos
      // Não precisamos de endpoint específico para limpar
      console.log('ℹ️ Cache será atualizado na próxima operação');
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  },

  // Salvar configurações de animação (no sistema de arquivos via backend)
  salvarConfigAnimacao: async (config) => {
    try {
      await axios.post(`${CACHE_API_URL}/animacao`, config);
      console.log('✅ Configurações de animação salvas no sistema de arquivos:', config);
    } catch (error) {
      console.error('❌ Erro ao salvar configurações de animação:', error);
      // Fallback para localStorage se o backend falhar
      try {
        if (typeof Storage !== 'undefined') {
          localStorage.setItem('lobby_pedidos_animacao_config', JSON.stringify(config));
          console.log('✅ Configurações salvas no localStorage como fallback');
        }
      } catch (e) {
        console.error('❌ Erro ao salvar no localStorage também:', e);
      }
    }
  },

  // Carregar configurações de animação (do sistema de arquivos via backend)
  carregarConfigAnimacao: async () => {
    try {
      const response = await axios.get(`${CACHE_API_URL}/animacao`);
      if (response.data) {
        console.log('✅ Configurações de animação carregadas do sistema de arquivos:', response.data);
        return response.data;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configurações de animação:', error.message);
      // Fallback para localStorage se o backend falhar
      try {
        if (typeof Storage !== 'undefined') {
          const cached = localStorage.getItem('lobby_pedidos_animacao_config');
          if (cached) {
            const config = JSON.parse(cached);
            console.log('✅ Configurações carregadas do localStorage como fallback:', config);
            return config;
          }
        }
      } catch (e) {
        console.error('❌ Erro ao carregar do localStorage também:', e);
      }
    }
    // Retornar valores padrão se não houver configuração salva
    const defaultConfig = {
      animacaoAtivada: true,
      intervaloAnimacao: 30,
      duracaoAnimacao: 6
    };
    console.log('ℹ️ Usando configurações padrão:', defaultConfig);
    return defaultConfig;
  },

  criarPedido: async (nomeCliente) => {
    const response = await axios.post(API_BASE_URL, { nomeCliente });
    const novoPedido = response.data;
    
    // Atualizar cache
    const pedidos = await pedidoService.carregarCache() || [];
    pedidos.push(novoPedido);
    await pedidoService.salvarCache(pedidos);
    
    return novoPedido;
  },

  listarTodosPedidos: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      const pedidos = response.data;
      
      // Atualizar cache com dados do servidor (sempre que buscar do servidor)
      if (pedidos && Array.isArray(pedidos)) {
        await pedidoService.salvarCache(pedidos);
      }
      
      return pedidos;
    } catch (error) {
      console.warn('Erro ao buscar pedidos do servidor, usando cache:', error);
      
      // Se falhar, tentar usar cache
      const cached = await pedidoService.carregarCache();
      if (cached && Array.isArray(cached)) {
        console.log('Carregando pedidos do cache:', cached.length, 'pedidos');
        return cached;
      }
      
      // Se não houver cache, retornar array vazio
      console.warn('Nenhum cache disponível, retornando array vazio');
      return [];
    }
  },

  listarPedidosPorStatus: async (status) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status/${status}`);
      return response.data;
    } catch (error) {
      // Se falhar, filtrar do cache
      const cached = await pedidoService.carregarCache();
      if (cached) {
        return cached.filter(p => p.status === status);
      }
      throw error;
    }
  },

  marcarComoPronto: async (id) => {
    const response = await axios.put(`${API_BASE_URL}/${id}/pronto`);
    const pedidoAtualizado = response.data;
    
    // Atualizar cache
    const pedidos = await pedidoService.carregarCache() || [];
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index] = pedidoAtualizado;
      await pedidoService.salvarCache(pedidos);
    }
    
    return pedidoAtualizado;
  },

  removerPedido: async (id) => {
    await axios.delete(`${API_BASE_URL}/${id}`);
    
    // Atualizar cache - remover o pedido
    const pedidos = await pedidoService.carregarCache() || [];
    const pedidosFiltrados = pedidos.filter(p => p.id !== id);
    await pedidoService.salvarCache(pedidosFiltrados);
    
    // Se não houver mais pedidos, o cache será atualizado na próxima operação
    // Não precisamos limpar explicitamente
  }
};

export default pedidoService;

