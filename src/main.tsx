// src/main.tsx
import "./index.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App";
import LoginPage from "./pages/LoginPage";

// IMPORTANTE: agora usamos o wrapper UI moderno
import UIFormularioCursilhista from "./components/forms/UIFormularioCursilhista";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Rota do formulário de inscrição com UI modernizada */}
      <Route path="/inscricao" element={<UIFormularioCursilhista />} />

      <Route path="/app" element={<App />} />
    </Routes>
  </BrowserRouter>
);
