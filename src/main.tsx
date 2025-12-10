// src/main.tsx
import './index.css';
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import LoginPage from "./pages/LoginPage";
// usar o componente que você submeteu:
import CursilhistaStepperFormFull from "./components/forms/CursilhistaStepperFormFull";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/inscricao" element={<CursilhistaStepperFormFull />} />
      <Route path="/app" element={<App />} />
    </Routes>
  </BrowserRouter>
);
