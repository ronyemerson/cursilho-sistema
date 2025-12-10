// api/check-cpf.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { auth: { persistSession: false } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cpf = String(req.query.cpf || "").replace(/\D/g, "");
    if (!cpf || cpf.length !== 11) return res.status(400).json({ error: "CPF inválido" });

    // consulta por cpf na tabela cursilhistas (ou obreiros), ajustar nome da coluna se necessário
    const { data, error } = await supabase
      .from("cursilhistas")
      .select("id, nome, email")
      .eq("cpf", cpf)
      .limit(1);

    if (error) throw error;

    const exists = Array.isArray(data) && data.length > 0;
    return res.status(200).json({ exists, person: exists ? data[0] : null });
  } catch (err: any) {
    console.error("check-cpf error", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
