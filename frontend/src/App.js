import React, { useState } from 'react';
import './App.css';
import FilaPedidos from './components/FilaPedidos';
import ModoSelecao from './components/ModoSelecao';

function App() {
  const [modo, setModo] = useState(null);

  const handleSelecionarModo = (modoSelecionado) => {
    setModo(modoSelecionado);
  };

  if (modo === null) {
    return <ModoSelecao onSelecionarModo={handleSelecionarModo} />;
  }

  return (
    <div className="App">
      <FilaPedidos modo={modo} onTrocarModo={() => setModo(null)} />
    </div>
  );
}

export default App;

