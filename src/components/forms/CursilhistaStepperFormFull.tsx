// src/components/forms/CursilhistaStepperFormFull.tsx
import React, { useEffect, useRef, useState } from "react";
import ProgressBar from "../ProgressBar";
import { maskCpf, maskWhatsapp, maskTelefone, maskDate, onlyDigits } from "../../utils/masks";
import { UFs, lookupCepViaCep } from "../../utils/locations";
import {
  getTermosParagrafos,
  getPdfPath,
  requireAgreement,
  attachTermosToPayload,
} from "../../utils/instructions";

const API_BASE = import.meta.env.VITE_API_FUNCTIONS_URL ?? "";
const DEBUG = false;

type PersonalState = {
  nome: string;
  whatsapp: string;
  nascimento?: string;
  contatoAltern?: string;
  cep?: string;
  logradouro?: string;   // rua
  numero?: string;       // número inserido pelo usuário
  complemento?: string;  // complemento inserido pelo usuário
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
    versao?: string;
    aceite_ts?: string;
  };
  dadosPessoais: PersonalState;
  contato: { whatsapp?: string; contatoAltern?: string };
  saude?: string;
  financeiro: FinanceState;
  responsavelFinanceiro?: { nome?: string; relacao?: string; whatsapp?: string };
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
	  cep: "",
	  logradouro: "",
	  numero: "",
	  complemento: "",
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

  // CEP-specific state
  const [cep, setCep] = useState<string>(personal.cep || "");
  const [cidade, setCidade] = useState<string>(personal.cidade || "");
  const [ufSelected, setUfSelected] = useState<string>(personal.uf || "");
  const [cepLoading, setCepLoading] = useState<boolean>(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // -----------------------
  // Pequena função local para formatar CEP (não depende de masks.ts)
  // -----------------------
  function formatCep(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)}-${d.slice(5)}`;
  }

  // -----------------------
  // VALIDAÇÕES
  // -----------------------
  function validateCpfRaw(raw: string): boolean {
    const s = onlyDigits(raw);
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
  // CEP lookup: dispara quando completa 8 dígitos
  // -----------------------
  const debouncedCep = useDebouncedValue(cep, 600);

  useEffect(() => {
    const digits = (debouncedCep || "").replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setCepLoading(true);
      setCepError(null);
      try {
        const data = await lookupCepViaCep(digits);
        if (cancelled) return;
        if (!data) {
          setCepError("CEP não encontrado");
          return;
        }
        // preencher cidade e uf no formulário (permite edição)
        setCidade(data.localidade ?? "");
        setUfSelected(data.uf ?? "");
       		setPersonal((p) => ({
			  ...p,
			  cidade: data.localidade ?? "",
			  uf: data.uf ?? "",
			  cep: digits,
			  logradouro: data.logradouro,
			}));
      } catch (err) {
        if (!cancelled) setCepError("Erro ao buscar CEP");
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedCep]);

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
    }

    setStep((s) => s + 1);
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
      if (step !== 5) {
        e.preventDefault();
        if (!loading) next();
      }
    }
  }

  // -----------------------
  // ENVIO: mostra modal de confirmação e então POST
  // -----------------------
  function buildPayload(): Payload {
    const base: Omit<Payload, "termos"> = {
      cpf: onlyDigits(cpf),
      email: personal.email,
		dadosPessoais: {
		  ...personal,
		  logradouro: personal.logradouro || "",
		  numero: personal.numero || "",
		  complemento: personal.complemento || "",
		  cidade: cidade || personal.cidade || "",
		  uf: ufSelected || personal.uf || "",
		  cep: (cep || personal.cep || "").replace(/\D/g, ""),
		},
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

    // Anexa automaticamente os termos (versão + timestamp) para auditoria
    const payloadWithTermos = attachTermosToPayload(base as object, agreement);

    return payloadWithTermos as Payload;
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
      <ProgressBar step={step + 1} total={6} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          // Se não estivermos no resumo, tenta avançar e evita envio
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
        {/* STEP 0 — TERMOS (ATUALIZADO: texto + link PDF + checkbox obrigatório) */}
        {step === 0 && (
          <section>
            <h2 className="text-lg font-medium">Termos, LGPD e Ciência</h2>

            <div className="mt-3 text-sm text-slate-700 space-y-3">
              <div className="p-4 border rounded bg-slate-50 max-h-48 overflow-auto text-sm leading-relaxed">
                {getTermosParagrafos().map((p, i) => (
                  <p key={i} className="mb-3">
                    {p}
                  </p>
                ))}
              </div>

              <div className="text-xs text-slate-500">
                Estes termos são baseados no formulário oficial do evento. Consulte o documento completo clicando em “Ver Termos (PDF)”.
              </div>

              <div className="mt-3 flex items-center gap-3">
                <a href={getPdfPath()} target="_blank" rel="noopener noreferrer" className="text-sm underline text-indigo-600">
                  Ver Termos (PDF)
                </a>

                <button
                  type="button"
                  onClick={() => {
                    window.open(getPdfPath(), "_blank");
                  }}
                  className="px-3 py-1 bg-slate-100 rounded text-sm"
                >
                  Abrir PDF
                </button>
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3">
              <input
                type="checkbox"
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
                aria-required
              />
              <span>Li e estou de acordo com os termos do evento (permanência, transporte, pagamento e política de desistência).</span>
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  try {
                    requireAgreement(agreement);
                    setStep(1);
                  } catch (err: any) {
                    alert(err?.message || "Você precisa aceitar os termos para prosseguir.");
                  }
                }}
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

{/* Novo bloco: CEP + Logradouro (prefill) + Número + Complemento + Cidade + UF (select) + Igreja */}
<div className="grid grid-cols-1 gap-3 mt-4">
  {/* CEP */}
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
    <div className="md:col-span-1">
      <input
        value={cep}
        onChange={(e) => {
          const formatted = formatCep(e.target.value);
          setCep(formatted);
          setPersonal((p) => ({ ...p, cep: formatted.replace(/\D/g, "") }));
        }}
        placeholder="CEP (ex: 01234-567)"
        className="border rounded p-2 w-full"
        inputMode="numeric"
      />
      {cepLoading && <span className="text-xs text-slate-500">Buscando CEP...</span>}
      {cepError && <div role="alert" className="text-xs text-red-600">{cepError}</div>}
    </div>

    {/* Logradouro (preenchido pela ViaCEP, ainda editável) */}
    <div className="md:col-span-2">
      <input
        value={personal.logradouro || ""}
        onChange={(e) => setPersonal((p) => ({ ...p, logradouro: e.target.value }))}
        placeholder="Logradouro (Rua / Av)"
        className="border rounded p-2 w-full"
      />
    </div>

    {/* Número */}
    <div className="md:col-span-1">
      <input
        value={personal.numero || ""}
        onChange={(e) => setPersonal((p) => ({ ...p, numero: e.target.value }))}
        placeholder="Nº"
        className="border rounded p-2 w-full"
        inputMode="numeric"
      />
    </div>

    {/* Complemento (linha completa em desktop) */}
    <div className="md:col-span-4">
      <input
        value={personal.complemento || ""}
        onChange={(e) => setPersonal((p) => ({ ...p, complemento: e.target.value }))}
        placeholder="Complemento (opcional)"
        className="border rounded p-2 w-full"
      />
    </div>

    {/* Cidade */}
    <div className="md:col-span-2">
      <input
        value={cidade}
        onChange={(e) => {
          setCidade(e.target.value);
          setPersonal((p) => ({ ...p, cidade: e.target.value }));
        }}
        placeholder="Cidade"
        className="border rounded p-2 w-full"
      />
    </div>

    {/* UF select */}
    <div className="md:col-span-1">
      <select
        value={ufSelected}
        onChange={(e) => {
          setUfSelected(e.target.value);
          setPersonal((p) => ({ ...p, uf: e.target.value }));
        }}
        className="border rounded p-2 w-full"
      >
        <option value="">UF</option>
        {UFs.map((s) => (
          <option key={s.code} value={s.code}>
            {s.code} — {s.name}
          </option>
        ))}
      </select>
    </div>

    {/* Igreja ocupa a linha completa */}
    <div className="md:col-span-4">
      <input
        value={personal.igreja || ""}
        onChange={(e) => setPersonal({ ...personal, igreja: e.target.value })}
        placeholder="Igreja"
        className="border rounded p-2 w-full"
      />
    </div>
  </div>
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
				  <strong>Endereço:</strong>{" "}
				  {personal.logradouro ? `${personal.logradouro}` : "-"}
				  {personal.numero ? `, ${personal.numero}` : ""}{" "}
				  {personal.complemento ? `(${personal.complemento})` : ""}{" "}
				  - {cidade || personal.cidade || "-"} / {ufSelected || personal.uf || "-"}
			  </p>
              <p>
                <strong>CEP:</strong> {(cep || personal.cep) || "-"}
              </p>
              <p>
                <strong>Cidade / UF:</strong> {cidade || personal.cidade || "-"} / {ufSelected || personal.uf || "-"}
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
