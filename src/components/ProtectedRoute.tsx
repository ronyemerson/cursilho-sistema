// src/components/ProtectedRoute.tsx
//import React from "react";
import { Outlet, Navigate } from "react-router-dom";

/**
 * ProtectedRoute stub
 * - Verifica token em localStorage chamado "cursilho_token"
 * - Se existir, renderiza <Outlet/> (rotas filhas). Caso contrário, redireciona para /login
 * Substitua por sua lógica real de autenticação e claims.
 */
export default function ProtectedRoute() {
  const token = typeof window !== "undefined" ? localStorage.getItem("cursilho_token") : null;
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
