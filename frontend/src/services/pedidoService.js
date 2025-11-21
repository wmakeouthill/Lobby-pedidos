import axios from 'axios';

const API_BASE_URL = '/api/pedidos';
const CACHE_API_URL = '/api/cache';

// Classe para gerenciar Server-Sent Events
class SseManager {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(onMessage, onError) {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      this.eventSource = new EventSource(`${CACHE_API_URL}/pedidos/stream`);

      // Capturar eventos nomeados (pedidos-update)
      this.eventSource.addEventListener('pedidos-update', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 SSE: Recebida atualização em tempo real (evento nomeado):', data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('📡 SSE: Erro ao processar mensagem nomeada:', error);
        }
      });

      // Também capturar eventos sem nome como fallback
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 SSE: Recebida atualização em tempo real (evento padrão):', data);
          if (onMessage) onMessage(data);
        } catch (error) {
          console.error('📡 SSE: Erro ao processar mensagem:', error);
        }
      };

      this.eventSource.onopen = () => {
        console.log('📡 SSE: Conexão estabelecida');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onerror = (error) => {
        console.error('📡 SSE: Erro na conexão:', error);
        if (onError) onError(error);

        // Tentar reconectar se não excedeu o limite
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`📡 SSE: Tentando reconectar em ${this.reconnectDelay}ms (tentativa ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(onMessage, onError), this.reconnectDelay);
        } else {
          console.error('📡 SSE: Máximo de tentativas de reconexão atingido');
        }
      };

    } catch (error) {
      console.error('📡 SSE: Erro ao criar EventSource:', error);
      if (onError) onError(error);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('📡 SSE: Conexão fechada');
    }
  }

  isConnected() {
    return this.eventSource && this.eventSource.readyState === EventSource.OPEN;
  }
}

// Instância singleton do gerenciador SSE
const sseManager = new SseManager();

const pedidoService = {
  // Salvar no cache (no sistema de arquivos via backend)
  salvarCache: async (pedidos) => {
    try {
      // Validar se há pedidos antes de salvar
      if (!pedidos || !Array.isArray(pedidos)) {
        console.warn('⚠️ Tentando salvar cache com dados inválidos:', pedidos);
        return;
      }
      
      // Não salvar se o array estiver vazio (o backend já gerencia isso)
      if (pedidos.length === 0) {
        console.log('ℹ️ Array vazio, não salvando cache (backend já gerencia)');
        return;
      }
      
      await axios.post(`${CACHE_API_URL}/pedidos`, pedidos);
      console.log(`✅ Cache salvo no sistema de arquivos: ${pedidos.length} pedidos`);
    } catch (error) {
      console.error('❌ Erro ao salvar cache:', error);
      // Fallback para localStorage se o backend falhar
      try {
        if (typeof Storage !== 'undefined' && pedidos && Array.isArray(pedidos) && pedidos.length > 0) {
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
    
    // O backend já atualiza o cache automaticamente ao criar pedido
    // Não precisamos atualizar manualmente aqui
    console.log('✅ Pedido criado (backend já atualiza o cache automaticamente)');
    
    return novoPedido;
  },

  listarTodosPedidos: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      const pedidos = response.data;
      
      // O backend NÃO atualiza mais o cache automaticamente ao listar (removido para evitar zerar cache)
      // Este método só deve ser chamado quando NÃO há cache disponível
      // Log apenas quando realmente necessário (quando não há cache)
      if (pedidos && Array.isArray(pedidos)) {
        // Log apenas em modo debug ou quando realmente necessário
        // console.log(`📋 Pedidos listados do banco: ${pedidos.length} pedidos (sem cache disponível)`);
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
    
    // O backend já atualiza o cache automaticamente ao marcar como pronto
    // Não precisamos atualizar manualmente aqui
    console.log('✅ Pedido marcado como pronto (backend já atualiza o cache automaticamente)');
    
    return pedidoAtualizado;
  },

  removerPedido: async (id) => {
    await axios.delete(`${API_BASE_URL}/${id}`);
    
    // O backend já atualiza o cache automaticamente ao remover pedido
    // Não precisamos atualizar manualmente aqui
    console.log('✅ Pedido removido (backend já atualiza o cache automaticamente)');
  },

  // Server-Sent Events para atualizações em tempo real
  conectarSSE: (onPedidoUpdate, onError) => {
    sseManager.connect(onPedidoUpdate, onError);
  },

  desconectarSSE: () => {
    sseManager.disconnect();
  },

  isSSEConectado: () => {
    return sseManager.isConnected();
  }
};

export default pedidoService;

