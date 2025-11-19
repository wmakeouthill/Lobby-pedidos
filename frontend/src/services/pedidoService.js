import axios from 'axios';

const API_BASE_URL = '/api/pedidos';
const CACHE_KEY = 'lobby_pedidos_cache';
const CACHE_TIMESTAMP_KEY = 'lobby_pedidos_cache_timestamp';

const pedidoService = {
  // Salvar no cache
  salvarCache: (pedidos) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(pedidos));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
    }
  },

  // Carregar do cache
  carregarCache: () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Erro ao carregar cache:', error);
    }
    return null;
  },

  // Limpar cache (apenas quando remover pelo fluxo normal)
  limparCache: () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  },

  criarPedido: async (nomeCliente) => {
    const response = await axios.post(API_BASE_URL, { nomeCliente });
    const novoPedido = response.data;
    
    // Atualizar cache
    const pedidos = pedidoService.carregarCache() || [];
    pedidos.push(novoPedido);
    pedidoService.salvarCache(pedidos);
    
    return novoPedido;
  },

  listarTodosPedidos: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      const pedidos = response.data;
      
      // Atualizar cache com dados do servidor
      pedidoService.salvarCache(pedidos);
      
      return pedidos;
    } catch (error) {
      console.warn('Erro ao buscar pedidos do servidor, usando cache:', error);
      
      // Se falhar, tentar usar cache
      const cached = pedidoService.carregarCache();
      if (cached) {
        return cached;
      }
      
      // Se não houver cache, retornar array vazio
      throw error;
    }
  },

  listarPedidosPorStatus: async (status) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/status/${status}`);
      return response.data;
    } catch (error) {
      // Se falhar, filtrar do cache
      const cached = pedidoService.carregarCache();
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
    const pedidos = pedidoService.carregarCache() || [];
    const index = pedidos.findIndex(p => p.id === id);
    if (index !== -1) {
      pedidos[index] = pedidoAtualizado;
      pedidoService.salvarCache(pedidos);
    }
    
    return pedidoAtualizado;
  },

  removerPedido: async (id) => {
    await axios.delete(`${API_BASE_URL}/${id}`);
    
    // Atualizar cache - remover o pedido
    const pedidos = pedidoService.carregarCache() || [];
    const pedidosFiltrados = pedidos.filter(p => p.id !== id);
    pedidoService.salvarCache(pedidosFiltrados);
    
    // Se não houver mais pedidos, limpar cache completamente
    if (pedidosFiltrados.length === 0) {
      pedidoService.limparCache();
    }
  }
};

export default pedidoService;

