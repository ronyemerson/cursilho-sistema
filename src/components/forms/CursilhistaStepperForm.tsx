import { useEffect, useRef, useState } from "react";

// base da API
const API_BASE = import.meta.env.VITE_API_FUNCTIONS_URL ?? "";

type PersonalState = {
  nome: string;
  whatsapp: string;
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

export default function CursilhistaStepperForm() {
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [cpf, setCpf] = useState<string>("");
  const [cpfValid, setCpfValid] = useState<boolean | null>(null);
  const [cpfDuplicate, setCpfDuplicate] = useState<boolean>(false);

  const [personal, setPersonal] = useState<PersonalState>({
    nome: "",
    whatsapp: "",
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

  const [agreement, setAgreement] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // mascara CPF
function maskCpf(v: string): string {
  return v
    .replace(/\D/g, "")           // remove tudo que não for número
    .slice(0, 11)                 // limita a 11 dígitos
    .replace(/(\d{3})(\d)/, "$1.$2")   // 000.?
    .replace(/(\d{3})(\d)/, "$1.$2")   // 000.000.?
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2"); // 000.000.000-00
}
  // validação DV
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

  // debounce hook
  function useDebouncedValue<T>(value: T, delay = 450) {
    const [debounced, setDebounced] = useState<T>(value);
    useEffect(() => {
      const id = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
  }

  // chamar edge function check-cpf
  async function checkCpfExistsFetch(rawCpf: string) {
    if (!API_BASE) throw new Error("VITE_API_FUNCTIONS_URL não configurado");
    const url = `${API_BASE.replace(/\/$/, "")}/check-cpf?cpf=${encodeURIComponent(rawCpf)}`;

    const res = await fetch(url, { method: "GET" });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json?.error || `Erro ${res.status} ao verificar CPF`);
    }

    return json; // { exists: boolean, person?:{} }
  }

  const rawCpf = cpf.replace(/\D/g, "");
  const debouncedCpf = useDebouncedValue(rawCpf, 450);
  const lastRequestRef = useRef<number | null>(null);

  // VALIDACAO CPF + CHAMADA API
  useEffect(() => {
    setErrorMsg(null);

    // CPF incompleto → reset
    if (!debouncedCpf || debouncedCpf.length !== 11) {
      setCpfValid(null);
      setCpfDuplicate(false);
      return;
    }

    // validação local
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

        // 👍 REGRA DE NEGÓCIO DO CURSILHO:
        // Se existe no banco → já fez cursilho → agora é OBREIRO
        // Cursilhista só pode existir 1 vez.
        if (exists) {
          setCpfDuplicate(true);
          setErrorMsg(
            "Este CPF já participou de um Cursilho e agora pertence ao grupo de Obreiros. " +
            "Cursilhistas só podem se inscrever uma única vez. " +
            "Se deseja servir como OBREIRO nesta edição, acesse o formulário específico."
          );
          return;
        }

        // segue fluxo normal
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

  // navegação
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
      if (!personal.nome || !personal.whatsapp) {
        alert("Preencha nome e WhatsApp.");
        return;
      }
    }

    if (step === 3) {
      if (!finance.responsavelProrio && (!finance.respNome || !finance.respWhatsapp)) {
        alert("Preencha dados do responsável financeiro.");
        return;
      }
    }

    setStep((s) => s + 1);
  }

  function back(): void {
    setStep((s) => Math.max(0, s - 1));
  }

  // envio final
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600)); // simulação
      setStep(6);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------------
  // RENDER (mantive tudo igual ao seu)
  // -----------------------------------

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Inscrição — 14º Cursilho Masculino</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">

        {/* STEP 0 */}
        {step === 0 && (
          <section>
            <h2 className="text-lg font-medium">Termos, LGPD e Ciência</h2>

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
            />

            <div className="mt-2 text-sm">
              {loading && <span className="text-slate-500">Verificando...</span>}
              {!loading && cpfValid === false && <span className="text-red-600">CPF inválido.</span>}
              {!loading && cpfValid === true && !cpfDuplicate && <span className="text-green-700">CPF válido.</span>}
              {!loading && cpfDuplicate && <span className="text-red-700">{errorMsg}</span>}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">Voltar</button>

              <button
                type="button"
                onClick={next}
                disabled={!cpfValid || cpfDuplicate}
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
              <input value={personal.nome} onChange={(e) => setPersonal({ ...personal, nome: e.target.value })} placeholder="Nome completo" className="border rounded p-2" />
              <input value={personal.whatsapp} onChange={(e) => setPersonal({ ...personal, whatsapp: e.target.value })} placeholder="WhatsApp" className="border rounded p-2" />
              <input value={personal.contatoAltern} onChange={(e) => setPersonal({ ...personal, contatoAltern: e.target.value })} placeholder="Contato alternativo" className="border rounded p-2" />
              <div className="grid grid-cols-3 gap-2">
                <input value={personal.cidade} onChange={(e) => setPersonal({ ...personal, cidade: e.target.value })} placeholder="Cidade" className="border rounded p-2" />
                <input value={personal.uf} onChange={(e) => setPersonal({ ...personal, uf: e.target.value })} placeholder="UF" className="border rounded p-2" />
                <input value={personal.igreja} onChange={(e) => setPersonal({ ...personal, igreja: e.target.value })} placeholder="Igreja" className="border rounded p-2" />
              </div>
              <textarea value={saude} onChange={(e) => setSaude(e.target.value)} rows={3} className="border rounded p-2" placeholder="Observações / Saúde / Restrições" />
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">Voltar</button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">Avançar</button>
            </div>
          </section>
        )}

        {/* STEP 3 — RESPONSÁVEL FINANCEIRO */}
        {step === 3 && (
          <section>
            <h2 className="text-lg font-medium">Responsável Financeiro</h2>

            <div className="mt-4">
              <label className="mr-5">
                <input type="radio" checked={finance.responsavelProrio} onChange={() => setFinance({ ...finance, responsavelProrio: true })} /> Sou eu
              </label>

              <label>
                <input type="radio" checked={!finance.responsavelProrio} onChange={() => setFinance({ ...finance, responsavelProrio: false })} /> Outra pessoa
              </label>
            </div>

            {!finance.responsavelProrio && (
              <div className="grid grid-cols-1 gap-3 mt-4">
                <input placeholder="Nome do responsável" value={finance.respNome} onChange={(e) => setFinance({ ...finance, respNome: e.target.value })} className="border p-2 rounded" />
                <input placeholder="Relação" value={finance.respRelacao} onChange={(e) => setFinance({ ...finance, respRelacao: e.target.value })} className="border p-2 rounded" />
                <input placeholder="WhatsApp" value={finance.respWhatsapp} onChange={(e) => setFinance({ ...finance, respWhatsapp: e.target.value })} className="border p-2 rounded" />
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">Voltar</button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">Avançar</button>
            </div>
          </section>
        )}

        {/* STEP 4 — FINANCEIRO */}
        {step === 4 && (
          <section>
            <h2 className="text-lg font-medium">Informações Financeiras</h2>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <label>
                <input type="radio" name="metodo" checked={finance.metodo === "pix"} onChange={() => setFinance({ ...finance, metodo: "pix", amount: 700.08 })} /> Pix — R$ 700,08
              </label>

              <label>
                <input type="radio" name="metodo" checked={finance.metodo === "cartao"} onChange={() => setFinance({ ...finance, metodo: "cartao", amount: 750.08 })} /> Cartão — R$ 750,08
              </label>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 rounded bg-slate-100">Voltar</button>
              <button onClick={next} type="button" className="px-4 py-2 rounded bg-indigo-600 text-white">Revisar</button>
            </div>
          </section>
        )}

        {/* STEP 5 — RESUMO */}
        {step === 5 && (
          <section>
            <h2 className="text-lg font-medium">Resumo da Inscrição</h2>

            <div className="mt-4 text-sm">
              <p><strong>CPF:</strong> {cpf}</p>
              <p><strong>Nome:</strong> {personal.nome}</p>
              <p><strong>WhatsApp:</strong> {personal.whatsapp}</p>
              <p><strong>Valor:</strong> R$ {finance.amount.toFixed(2)}</p>
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={back} type="button" className="px-4 py-2 bg-slate-200 rounded">Voltar</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Enviar</button>
            </div>
          </section>
        )}

        {/* STEP 6 — SUCESSO */}
        {step === 6 && (
          <section className="text-center py-10">
            <h2 className="text-xl font-semibold">Inscrição enviada!</h2>
            <p className="mt-2 text-slate-600">Agora aguarde contato da organização.</p>
          </section>
        )}

      </form>
    </div>
  );
}
