import axios from 'axios';

const API_BASE_URL = '/api/pedidos';

const pedidoService = {
  criarPedido: async (nomeCliente) => {
    const response = await axios.post(API_BASE_URL, { nomeCliente });
    return response.data;
  },

  listarTodosPedidos: async () => {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  },

  listarPedidosPorStatus: async (status) => {
    const response = await axios.get(`${API_BASE_URL}/status/${status}`);
    return response.data;
  },

  marcarComoPronto: async (id) => {
    const response = await axios.put(`${API_BASE_URL}/${id}/pronto`);
    return response.data;
  },

  removerPedido: async (id) => {
    await axios.delete(`${API_BASE_URL}/${id}`);
  }
};

export default pedidoService;

