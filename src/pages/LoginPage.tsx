import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type LoginResponse = { token?: string; claims?: Record<string, any>; message?: string };

type Props = { onLoginSuccess?: (data: LoginResponse) => void; apiBase?: string };

export default function LoginPageGlass({ onLoginSuccess, apiBase = '/api/auth' }: Props) {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeCPF = (v: string) => v.replace(/\D/g, '').padStart(11, '0');
  const validateCPF = (v: string) => /^\d{11}$/.test(v);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    const cpfNorm = normalizeCPF(cpf);
    if (!validateCPF(cpfNorm)) return setError('CPF inválido. Informe 11 dígitos.');
    if (password.trim().length < 4) return setError('Senha muito curta.');

    // DEV TEST (localhost)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal && cpfNorm === '25327497844' && password === 'Cursilho@1976') {
      const token = 'DEV_TEST_TOKEN_2025_ABC123';
      if (remember) localStorage.setItem('cursilho_token', token);
      else sessionStorage.setItem('cursilho_token', token);
      localStorage.setItem('cursilho_claims', JSON.stringify({ role: 'tester', name: 'Usuário Teste' }));
      navigate('/app');
      return;
    }

    setLoading(true);
    try {
      const payload = { cpf_normalizado: cpfNorm, password };
      const res = await fetch(`${apiBase}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Erro no servidor' }));
        setError(body.message || 'Falha ao autenticar');
        setLoading(false);
        return;
      }
      const data: LoginResponse = await res.json();
      if (data.token) {
        if (remember) localStorage.setItem('cursilho_token', data.token);
        else sessionStorage.setItem('cursilho_token', data.token);
        onLoginSuccess?.(data);
        navigate('/app');
      } else setError(data.message || 'Resposta inválida do servidor');
    } catch (err: any) {
      setError(err?.message || 'Erro na comunicação');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('/assets/cursilho-bg.jpg')] bg-cover bg-center relative">
      {/* soft gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-teal-900/35 to-black/40" />

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="backdrop-blur-[8px] bg-white/6 border border-white/10 rounded-3xl p-6 shadow-2xl ring-1 ring-white/6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold shadow-md">PI</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">SISTEMA CURSILHO</h1>
              <p className="text-sm text-white/70">Acesse usando seu CPF cadastrado</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/70">CPF</label>
              <input
                className="mt-1 w-full rounded-xl px-4 py-3 bg-white/8 placeholder-white/40 text-white outline-none border border-white/6 focus:ring-2 focus:ring-teal-400"
                placeholder="00000000000"
                inputMode="numeric"
                maxLength={14}
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-white/70">Senha</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl px-4 py-3 bg-white/8 placeholder-white/40 text-white outline-none border border-white/6 focus:ring-2 focus:ring-teal-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between text-sm text-white/80">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-teal-400" />
                Lembrar
              </label>

              <button type="button" onClick={() => alert('Contate a organização: +55 11 91756-1108')} className="text-sm underline text-white/80">
                Esqueci a senha
              </button>
            </div>

            {error && <div className="text-sm text-red-200 bg-red-900/30 p-3 rounded">{error}</div>}

            <div className="flex gap-3 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl py-3 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-900 font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <button type="button" onClick={() => navigate('/help')} className="px-4 py-3 rounded-2xl border border-white/8 text-white">Ajuda</button>
            </div>

            <div className="mt-3 text-center text-xs text-white/60">Ao entrar, seu token será validado e suas permissões aplicadas conforme o banco.</div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-white/60">PRIMEIRA IGREJA</div>
      </div>
    </div>
  );
}
