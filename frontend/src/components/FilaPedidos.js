import React from "react";
import "./FilaPedidos.css";

// Hooks
import useAnimationConfig from "./FilaPedidos/hooks/useAnimationConfig";
import useOrders from "./FilaPedidos/hooks/useOrders";
import useOrderAnimation from "./FilaPedidos/hooks/useOrderAnimation";

// Components
import Header from "./FilaPedidos/Header";
import ConfigModal from "./FilaPedidos/ConfigModal";
import ManagerForm from "./FilaPedidos/ManagerForm";
import SurferAnimation from "./FilaPedidos/SurferAnimation";
import OrderList from "./FilaPedidos/OrderList";

const FilaPedidos = ({ modo, onTrocarModo }) => {
  const isModoGestor = modo === "gestor";

  // 1. Configuração de Animação
  const animacaoConfig = useAnimationConfig();
  const { showConfig, setShowConfig, salvarConfig } = animacaoConfig;

  // 2. Gerenciamento de Pedidos
  const {
    pedidos,
    setPedidos,
    loading,
    error,
    adicionarPedido,
    removerPedido,
    marcarComoPronto,
    carregarPedidos,
    pedidosAnterioresRef
  } = useOrders(animacaoConfig);

  // 3. Animação de Pedidos
  const {
    isAnimating,
    setIsAnimating,
    pedidoAnimando,
    pedidoAnimandoStatus,
    pedidoAnimandoDados
  } = useOrderAnimation(
    animacaoConfig,
    isModoGestor,
    carregarPedidos,
    setPedidos,
    pedidosAnterioresRef,
    pedidos // Passar estado atual para sincronização
  );

  // Handler para animação manual
  const handleAnimacaoManual = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, animacaoConfig.duracaoAnimacao * 1000);
  };


  // Handler para marcar como pronto - SSE atualizará reativamente
  const handleMarcarComoPronto = async (id) => {
    try {
      console.log("🔄 Marcando pedido como pronto:", id);
      await marcarComoPronto(id);
      console.log("✅ Pedido marcado! SSE propagará atualização instantaneamente");
      // O SSE detectará a mudança e atualizará o estado reativamente
    } catch (err) {
      console.error("❌ Erro ao marcar como pronto:", err);
    }
  };

  return (
    <div className={`fila-pedidos-container ${isAnimating ? "animando" : ""}`}>
      <div className={`coluna-lateral ${isAnimating ? "escondido" : ""}`}>
        <Header
          isAnimating={isAnimating}
          isModoGestor={isModoGestor}
          onTrocarModo={onTrocarModo}
          handleAnimacaoManual={handleAnimacaoManual}
          setShowConfig={setShowConfig}
        />

        <ConfigModal
          showConfig={showConfig}
          setShowConfig={setShowConfig}
          config={animacaoConfig}
          setConfig={animacaoConfig}
          handleSalvarConfig={salvarConfig}
        />

        <ManagerForm
          isModoGestor={isModoGestor}
          isAnimating={isAnimating}
          onAdicionarPedido={adicionarPedido}
          loading={loading}
          error={error}
        />

        <SurferAnimation
          isModoGestor={isModoGestor}
          isAnimating={isAnimating}
        />
      </div>

      <OrderList
        title="PREPARANDO"
        status="PREPARANDO"
        pedidos={pedidos}
        isModoGestor={isModoGestor}
        isAnimating={isAnimating}
        pedidoAnimando={pedidoAnimando}
        pedidoAnimandoDados={pedidoAnimandoDados}
        pedidoAnimandoStatus={pedidoAnimandoStatus}
        handleMarcarComoPronto={handleMarcarComoPronto}
        handleRemoverPedido={removerPedido}
      />

      <OrderList
        title="PRONTO"
        status="PRONTO"
        pedidos={pedidos}
        isModoGestor={isModoGestor}
        isAnimating={isAnimating}
        pedidoAnimando={pedidoAnimando}
        pedidoAnimandoDados={pedidoAnimandoDados}
        pedidoAnimandoStatus={pedidoAnimandoStatus}
        handleMarcarComoPronto={handleMarcarComoPronto}
        handleRemoverPedido={removerPedido}
      />
    </div>
  );
};

export default FilaPedidos;
