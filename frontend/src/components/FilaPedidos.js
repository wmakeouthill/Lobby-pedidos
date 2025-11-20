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
    pedidosAnterioresRef
  );

  // Handler para animação manual
  const handleAnimacaoManual = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, animacaoConfig.duracaoAnimacao * 1000);
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
        handleMarcarComoPronto={marcarComoPronto}
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
        handleMarcarComoPronto={marcarComoPronto}
        handleRemoverPedido={removerPedido}
      />
    </div>
  );
};

export default FilaPedidos;
