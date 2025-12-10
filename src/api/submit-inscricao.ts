// api/submit-inscricao.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;

    // Validações server-side (exemplos)
    const cpf = String(body.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11) return res.status(400).json({ error: "CPF inválido" });
    if (!body.dadosPessoais?.nome) return res.status(400).json({ error: "Nome obrigatório" });

    // Checar duplicidade
    const { data: existing, error: selErr } = await supabase
      .from("cursilhistas")
      .select("id")
      .eq("cpf", cpf)
      .limit(1);

    if (selErr) throw selErr;
    if (existing?.length) return res.status(409).json({ error: "CPF já cadastrado" });

    // Inserir (ajuste os campos e colunas conforme seu schema)
    const row = {
      cpf,
      email: body.email || null,
      nome: body.dadosPessoais?.nome || null,
      dados_pessoais: body.dadosPessoais || null,
      contato: body.contato || null,
      saude: body.saude || null,
      financeiro: body.financeiro || null,
      responsavel_financeiro: body.responsavelFinanceiro || null,
      termos_aceite: body.termos?.aceite ? true : false,
      observacoes: body.observacoes || null,
      created_at: new Date().toISOString(),
    };

    const { data, error: insertErr } = await supabase.from("cursilhistas").insert([row]).select().single();
    if (insertErr) throw insertErr;

    // opcional: acionar fila de mensagens, enviar notificação etc.

    return res.status(201).json({ ok: true, data });
  } catch (err: any) {
    console.error("submit-inscricao error", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
