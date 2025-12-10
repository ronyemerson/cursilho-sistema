// src/components/forms/CursilhistaStepperFormFull.tsx
import React, { useEffect, useRef, useState } from "react";

/**
 * CursilhistaStepperFormFull.tsx
 * - Versão completa do formulário de inscrição do cursilhista
 * - Máscaras, validações, verificação de CPF, enter-handling, modal e envio
 *
 * Dependências: TailwindCSS (classes usadas no markup).
 *
 * Environment:
 * - VITE_API_FUNCTIONS_URL deve apontar para as edge functions:
 *   - GET  /check-cpf?cpf=XXXXXXXXXXX  -> { exists: boolean, person?: {} }
 *   - POST /submit-inscricao          -> aceita payload JSON descrito abaixo
 */

const API_BASE = import.meta.env.VITE_API_FUNCTIONS_URL ?? "";

// Toggle debug logs
const DEBUG = false;

type PersonalState = {
  nome: string;
  whatsapp: string;
  nascimento?: string;
  contatoAltern?: string;
  cidade?: string;
  uf?: string;
  igreja?: string;
  email?: string;
};

type FinanceState = {
  responsavelProrio: boolean;
  respNome?: string;
  respRelacao?: string;
  respWhatsapp?: string;
  metodo: "pix" | "cartao";
  amount: number;
};

type Payload = {
  cpf: string;
  email?: string;
  termos: {
    aceite: boolean;
  };
  dadosPessoais: PersonalState;
  contato: {
    whatsapp?: string;
    contatoAltern?: string;
  };
  saude?: string;
  financeiro: FinanceState;
  responsavelFinanceiro?: {
    nome?: string;
    relacao?: string;
    whatsapp?: string;
  };
  observacoes?: string;
};

export default function CursilhistaStepperFormFull() {
  // STEPS: 0 termos, 1 cpf, 2 dados pessoais, 3 resp financeiro, 4 financeiro, 5 resumo, 6 sucesso
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [cpf, setCpf] = useState<string>("");
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [cpfDuplicate, setCpfDuplicate] = useState<boolean>(false);
  const [agreement, setAgreement] = useState<boolean>(false);

  const [personal, setPersonal] = useState<PersonalState>({
    nome: "",
    whatsapp: "",
    nascimento: "",
    contatoAltern: "",
    cidade: "",
    uf: "",
    igreja: "",
    email: "",
  });

  const [saude, setSaude] = useState<string>("");
  const [finance, setFinance] = useState<FinanceState>({
    responsavelProrio: true,
    respNome: "",
    respRelacao: "",
    respWhatsapp: "",
    metodo: "pix",
    amount: 700.08,
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // -----------------------
  // MÁSCARAS E UTILS
  // -----------------------
  function onlyDigits(v: string) {
    return v.replace(/\D/g, "");
  }

  function limitDigits(v: string, max: number) {
    return onlyDigits(v).slice(0, max);
  }

  function maskCpf(v: string): string {
    return limitDigits(v, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskWhatsapp(v: string): string {
    const d = limitDigits(v, 11);
    // (11) 98765-4321
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function maskTelefone(v: string): string {
    const d = limitDigits(v, 11);
    if (d.length <= 10) {
      return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  function maskCEP(v: string) {
    return limitDigits(v, 8).replace(/^(\d{5})(\d{1,3})/, "$1-$2");
  }

  function maskDate(v: string) {
    return limitDigits(v, 8).replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
  }

  // -----------------------
  // VALIDAÇÕES
  // -----------------------
  function validateCpfRaw(raw: string): boolean {
    const s = raw.replace(/\D/g, "");
    if (s.length !== 11) return false;
    if (/^(\d)\1+$/.test(s)) return false;
    const calc = (t: number) => {
      let sum = 0;
      for (let i = 0; i < t; i++) sum += parseInt(s.charAt(i), 10) * (t + 1 - i);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(9) === parseInt(s.charAt(9), 10) && calc(10) === parseInt(s.charAt(10), 10);
  }

  function validateWhatsappFormatted(formatted: string) {
    const d = onlyDigits(formatted);
    // mínimo 10 (fixo) ou 11 (celular com 9)
    return d.length === 10 || d.length === 11;
  }

  function validateName(n: string) {
    return n.trim().length >= 3;
  }

  function validateDate(formatted: string) {
    const d = onlyDigits(formatted);
    if (d.length !== 8) return false;
    const day = parseInt(d.slice(0, 2), 10);
    const month = parseInt(d.slice(2, 4), 10);
    const year = parseInt(d.slice(4, 8), 10);
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    const maxDay = new Date(year, month, 0).getDate();
    return day >= 1 && day <= maxDay;
  }

  // -----------------------
  // DEBOUNCE HOOK
  // -----------------------
  function useDebouncedValue<T>(value: T, delay = 450) {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  }

  // -----------------------
  // CHECK CPF EXISTE (API)
  // -----------------------
  const rawCpf = onlyDigits(cpf);
  const debouncedCpf = useDebouncedValue(rawCpf, 450);
  const lastRequestRef = useRef<number | null>(null);

  async function checkCpfExistsFetch(rawCpfParam: string) {
    if (!API_BASE) throw new Error("VITE_API_FUNCTIONS_URL não configurado");
    const url = `${API_BASE.replace(/\/$/, "")}/check-cpf?cpf=${encodeURIComponent(rawCpfParam)}`;
    const res = await fetch(url, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `Erro ${res.status} ao verificar CPF`);
    return json; // { exists: boolean, person?: {} }
  }

  useEffect(() => {
    setErrorMsg(null);

    if (!debouncedCpf || debouncedCpf.length !== 11) {
      setCpfValid(null);
      setCpfDuplicate(false);
      return;
    }

    const localValid = validateCpfRaw(debouncedCpf);
    setCpfValid(localValid);
    if (!localValid) {
      setCpfDuplicate(false);
      return;
    }

    let cancelled = false;
    const reqId = Date.now();
    lastRequestRef.current = reqId;
    setLoading(true);

    checkCpfExistsFetch(debouncedCpf)
      .then((json) => {
        if (cancelled) return;
        if (lastRequestRef.current !== reqId) return;
        const exists = Boolean(json?.exists);
        if (exists) {
          setCpfDuplicate(true);
          setErrorMsg(
            "Este CPF já participou de um Cursilho e agora pertence ao grupo de Obreiros. " +
              "Cursilhistas só podem se inscrever uma única vez."
          );
          return;
        }
        setCpfDuplicate(false);
        setErrorMsg(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(String(err?.message || "Falha ao verificar CPF"));
          setCpfDuplicate(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCpf]);

  // -----------------------
  // NAVEGAÇÃO ENTRE STEPS (centraliza validações)
  // -----------------------
  function next(): void {
    if (step === 0) {
      if (!agreement) {
        alert("Você precisa concordar com os termos.");
        return;
      }
    }

    if (step === 1) {
      if (!cpfValid) {
        alert("CPF inválido.");
        return;
      }
      if (cpfDuplicate) {
        alert("CPF já participou como cursilhista — use inscrição de Obreiros.");
        return;
      }
    }

    if (step === 2) {
      if (!validateName(personal.nome) || !validateWhatsappFormatted(personal.whatsapp)) {
        alert("Preencha nome e WhatsApp corretamente.");
        return;
      }
      if (personal.nascimento && !validateDate(personal.nascimento)) {
        alert("Data de nascimento inválida.");
        return;
      }
    }

    if (step === 3) {
      if (!finance.responsavelProrio && (!finance.respNome || !finance.respWhatsapp)) {
        alert("Preencha dados do responsável financeiro.");
        return;
      }
      // se responsavelProrio true, preenche dados automaticamente ao enviar.
    }

    if (step === 4) {
      // confirma seleção de método - sem validação extra
    }

    setStep((s) => s + 1);

    // smooth scroll to top of form
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back(): void {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -----------------------
  // ENTER handling: se não estiver no resumo, prevent submit e chama next()
  // -----------------------
  function handleKeyDownForm(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter") {
      // let Enter act like "Avançar" (respeitando validações) if not on final review
      if (step !== 5) {
        e.preventDefault();
        // small debounce guard
        if (!loading) next();
      }
      // if step === 5 -> let Enter submit normally
    }
  }

  // -----------------------
  // ENVIO: mostra modal de confirmação e então POST
  // -----------------------
  function buildPayload(): Payload {
    const payload: Payload = {
      cpf: onlyDigits(cpf),
      email: personal.email,
      termos: {
        aceite: agreement,
      },
      dadosPessoais: personal,
      contato: {
        whatsapp: personal.whatsapp,
        contatoAltern: personal.contatoAltern,
      },
      saude,
      financeiro: finance,
      responsavelFinanceiro: finance.responsavelProrio
        ? {
            nome: personal.nome,
            relacao: "Próprio",
            whatsapp: personal.whatsapp,
          }
        : {
            nome: finance.respNome,
            relacao: finance.respRelacao,
            whatsapp: finance.respWhatsapp,
          },
      observacoes: undefined,
    };

    return payload;
  }

  async function submitPayload() {
    if (step !== 5) {
      // safety
      return;
    }

    const payload = buildPayload();
    DEBUG && console.log("payload", payload);

    setLoading(true);
    try {
      if (!API_BASE) {
        throw new Error("API_BASE não configurada (VITE_API_FUNCTIONS_URL).");
      }

      // Exemplo: enviar para edge function que salva no Supabase (server-side)
      const url = `${API_BASE.replace(/\/$/, "")}/submit-inscricao`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `Erro ${res.status} ao submeter inscrição`);
      }

      // sucesso
      setSubmissionResult(json);
      setStep(6);
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert("Falha ao enviar inscrição: " + String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  // -----------------------
  // UI RENDER
  // -----------------------
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Inscrição — 14º Cursilho Masculino</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Se não estiver no resumo, tenta avançar e evita envio
          if (step !== 5) {
            next();
            return;
          }
          // se estiver no resumo, abre modal de confirmação
          setModalOpen(true);
        }}
        onKeyDown={handleKeyDownForm}
        className="bg-white shadow rounded-lg p-6"
      >
        {/* PROGRESS INDICATOR */}
        <div className="mb-4 text-sm text-slate-500">Etapa {Math.min(step + 1, 6)} de 6</div>

        {/* STEP 0 — TERMOS */}
        {step === 0 && (
          <section>
            <h2 className="text-lg font-medium">Termos, LGPD e Ciência</h2>
            <div className="mt-3 text-sm text-slate-700 space-y-2">
              <p>
                Declaro que li inteira e atentamente as informações do evento (data, local, transporte,
                permanência). Estou ciente de que a participação exige permanência integral no local e do
                regulamento de desistência e pagamento.
              </p>
              <p className="text-xs text-slate-500">(texto oficial extraído do formulário original)</p>
            </div>

            <label className="mt-6 flex items-start gap-3">
              <input type="checkbox" checked={agreement} onChange={(e) => setAgreement(e.target.checked)} />
              <span>Li e estou de acordo com os termos do evento</span>
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={!agreement}
                className={`px-4 py-2 rounded ${agreement ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}
              >
                Avançar
              </button>
            </div>
          </section>
        )}

        {/* STEP 1 — CPF */}
        {step === 1 && (
          <section>
            <h2 className="text-lg font-medium">CPF — Validação</h2>

            <input
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="mt-3 w-full border rounded p-2"
              disabled={loading}
              inputMode="numeric"
            />

            <div className="mt-2 text-sm">
              {loading && <span className="text-slate-500">Verificando...</span>}
              {!loading && cpfValid === false && <span className="text-red-600">CPF inválido.</span>}
              {!loading && cpfValid === true && !cpfDuplicate && <span className="text-green-700">CPF válido.</span>}
              {!loading && cpfDuplicate && <span className="text-red-700">{errorMsg}</span>}
              {errorMsg && !cpfDuplicate && <div className="text-yellow-700 text-xs mt-1">{errorMsg}</div>}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">
                Voltar
              </button>

              <button
                type="button"
                onClick={next}
                disabled={!cpfValid || cpfDuplicate || loading}
                className={`px-4 py-2 rounded ${cpfValid && !cpfDuplicate ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"}`}
              >
                Avançar
              </button>
            </div>
          </section>
        )}

        {/* STEP 2 — DADOS PESSOAIS */}
        {step === 2 && (
          <section>
            <h2 className="text-lg font-medium">Dados Pessoais</h2>

            <div className="grid grid-cols-1 gap-4 mt-4">
              <input
                value={personal.nome}
                onChange={(e) => setPersonal({ ...personal, nome: e.target.value })}
                placeholder="Nome completo"
                className="border rounded p-2"
              />

              <input
                value={personal.whatsapp}
                onChange={(e) => setPersonal({ ...personal, whatsapp: maskWhatsapp(e.target.value) })}
                placeholder="WhatsApp (ex: (11) 98765-4321)"
                className="border rounded p-2"
              />

              <input
                value={personal.contatoAltern}
                onChange={(e) => setPersonal({ ...personal, contatoAltern: maskTelefone(e.target.value) })}
                placeholder="Contato alternativo"
                className="border rounded p-2"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  value={personal.cidade}
                  onChange={(e) => setPersonal({ ...personal, cidade: e.target.value })}
                  placeholder="Cidade"
                  className="border rounded p-2"
                />
                <input
                  value={personal.uf}
                  onChange={(e) => setPersonal({ ...personal, uf: e.target.value })}
                  placeholder="UF"
                  className="border rounded p-2"
                  maxLength={2}
                />
                <input
                  value={personal.igreja}
                  onChange={(e) => setPersonal({ ...personal, igreja: e.target.value })}
                  placeholder="Igreja"
                  className="border rounded p-2"
                />
              </div>

              <input
                value={personal.email}
                onChange={(e) => setPersonal({ ...personal, email: e.target.value })}
                placeholder="E-mail"
                className="border rounded p-2"
                type="email"
              />

              <input
                value={personal.nascimento}
                onChange={(e) => setPersonal({ ...personal, nascimento: maskDate(e.target.value) })}
                placeholder="Data de Nascimento (DD/MM/AAAA)"
                className="border rounded p-2"
              />

              <textarea
                value={saude}
                onChange={(e) => setSaude(e.target.value)}
                rows={3}
                className="border rounded p-2"
                placeholder="Observações / Saúde / Restrições"
              />
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">
                Voltar
              </button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">
                Avançar
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 — RESPONSÁVEL FINANCEIRO */}
        {step === 3 && (
          <section>
            <h2 className="text-lg font-medium">Responsável Financeiro</h2>

            <div className="mt-4">
              <label className="mr-5">
                <input
                  type="radio"
                  checked={finance.responsavelProrio}
                  onChange={() => setFinance({ ...finance, responsavelProrio: true })}
                />{" "}
                Sou eu
              </label>

              <label>
                <input
                  type="radio"
                  checked={!finance.responsavelProrio}
                  onChange={() => setFinance({ ...finance, responsavelProrio: false })}
                />{" "}
                Outra pessoa
              </label>
            </div>

            {!finance.responsavelProrio && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                <input
                  placeholder="Nome do responsável"
                  value={finance.respNome}
                  onChange={(e) => setFinance({ ...finance, respNome: e.target.value })}
                  className="border p-2 rounded"
                />
                <input
                  placeholder="Relação"
                  value={finance.respRelacao}
                  onChange={(e) => setFinance({ ...finance, respRelacao: e.target.value })}
                  className="border p-2 rounded"
                />
                <input
                  placeholder="WhatsApp"
                  value={finance.respWhatsapp}
                  onChange={(e) => setFinance({ ...finance, respWhatsapp: maskWhatsapp(e.target.value) })}
                  className="border p-2 rounded"
                />
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">
                Voltar
              </button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">
                Avançar
              </button>
            </div>
          </section>
        )}

        {/* STEP 4 — FINANCEIRO */}
        {step === 4 && (
          <section>
            <h2 className="text-lg font-medium">Informações Financeiras</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="metodo"
                  checked={finance.metodo === "pix"}
                  onChange={() => setFinance({ ...finance, metodo: "pix", amount: 700.08 })}
                />{" "}
                Pix — R$ 700,08
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="metodo"
                  checked={finance.metodo === "cartao"}
                  onChange={() => setFinance({ ...finance, metodo: "cartao", amount: 750.08 })}
                />{" "}
                Cartão — R$ 750,08
              </label>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">
                Voltar
              </button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">
                Revisar
              </button>
            </div>
          </section>
        )}

        {/* STEP 5 — RESUMO */}
        {step === 5 && (
          <section>
            <h2 className="text-lg font-medium">Resumo da Inscrição</h2>

            <div className="mt-4 text-sm space-y-1">
              <p>
                <strong>CPF:</strong> {cpf}
              </p>
              <p>
                <strong>Nome:</strong> {personal.nome}
              </p>
              <p>
                <strong>WhatsApp:</strong> {personal.whatsapp}
              </p>
              <p>
                <strong>E-mail:</strong> {personal.email || "-"}
              </p>
              <p>
                <strong>Data Nasc.:</strong> {personal.nascimento || "-"}
              </p>
              <p>
                <strong>Valor:</strong> R$ {finance.amount.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">Confirme os dados e clique em Enviar.</p>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 bg-slate-200 rounded">
                Voltar
              </button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded" disabled={loading}>
                {loading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </section>
        )}

        {/* STEP 6 — SUCESSO */}
        {step === 6 && (
          <section className="text-center py-10">
            <h2 className="text-xl font-semibold">Inscrição enviada!</h2>
            <p className="mt-2 text-slate-600">Agora aguarde contato da organização.</p>
            {submissionResult && <pre className="text-xs mt-3 bg-slate-50 p-3 rounded">{JSON.stringify(submissionResult, null, 2)}</pre>}
          </section>
        )}
      </form>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-xl p-6 shadow-lg animate-fadeIn">
            <h3 className="text-lg font-semibold">Confirmação de Envio</h3>
            <p className="mt-2 text-sm text-slate-700">
              Você confirma o envio da inscrição e o pagamento conforme as regras? Após o envio, a organização
              fará a análise e contato.
            </p>

            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div>Valor: R$ {finance.amount.toFixed(2)}</div>
              <div>Método: {finance.metodo}</div>
              <div>Responsável pelo pagamento: {finance.responsavelProrio ? "Próprio" : finance.respNome}</div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-200 rounded"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={() => submitPayload()}
                className="px-4 py-2 bg-emerald-600 text-white rounded"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Confirmar e Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
