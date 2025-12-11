// src/components/forms/UIFormularioCursilhista.tsx
import React from "react";
import CursilhistaStepperFormFull from "./CursilhistaStepperFormFull";


export default function UIFormularioCursilhista() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-indigo-200 opacity-30 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 w-80 h-80 rounded-full bg-emerald-200 opacity-25 blur-2xl" />
      </div>

      <main className="w-full max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8 animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/70 backdrop-blur-lg shadow flex items-center justify-center">
              <span className="font-extrabold text-indigo-600 text-lg tracking-tight">PIB</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-700">Inscrição • 14º Cursilho Masculino</h1>
              <p className="text-sm text-slate-500">Preencha seus dados com atenção. Leve documento com CPF.</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">Suporte</p>
            <p className="text-sm font-semibold text-indigo-600">11 91756-1108</p>
          </div>
        </header>

        <section className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-5 md:p-8 animate-fadeIn">
          <CursilhistaStepperFormFull />
        </section>

        <footer className="mt-6 text-center text-xs text-slate-400">
          © Primeira Igreja Batista • Todos os direitos reservados
        </footer>
      </main>
    </div>
  );
}
