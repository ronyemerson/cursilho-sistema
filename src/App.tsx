// src/App.tsx
import { Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">Sistema Cursilho</div>
          <nav className="flex items-center gap-3">
            <Link to="/inscricao" className="px-3 py-1 bg-indigo-600 text-white rounded">Inscrição</Link>
            <Link to="/login" className="px-3 py-1 bg-slate-100 rounded">Login</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-semibold">Painel</h1>
          <p className="mt-2 text-sm text-slate-600">Conteúdo do painel — substitua pelo seu.</p>
        </div>
      </main>
    </div>
  );
}
