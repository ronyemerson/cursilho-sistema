// functions/check-cpf/index.ts
// Supabase Edge Function (Deno runtime)
// GET /check-cpf?cpf=00000000000
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { global: { headers: { "x-function": "check-cpf" } } });

function cleanCpf(s: string) { return (s||"").replace(/\D/g, ""); }

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const cpf = url.searchParams.get("cpf") ?? "";
    const cleaned = cleanCpf(cpf);
    if (!/^\d{11}$/.test(cleaned)) {
      return new Response(JSON.stringify({ error: "cpf invalid" }), { status: 400 });
    }

    // 1) procura person por documento/cpf_normalizado (ajuste nome da coluna conforme seu schema)
    const { data: persons, error: perr } = await supabase
      .from("persons")
      .select("id, nome, documento, cpf_normalizado, whatsapp, email")
      .eq("cpf_normalizado", cleaned)
      .limit(1);

    if (perr) throw perr;

    if (!persons || persons.length === 0) {
      return new Response(JSON.stringify({ exists: false }), { status: 200 });
    }

    const person = persons[0];

    // 2) checa se já participou: procurar enrollments com status confirmado/attended
    const { data: enrolls, error: eerr } = await supabase
      .from("enrollments")
      .select("id, event_key, status")
      .eq("person_id", person.id);

    if (eerr) throw eerr;

    const participated = Array.isArray(enrolls) && enrolls.some((r: any) => ["confirmed","attended"].includes(r.status));

    // 3) retorno
    return new Response(JSON.stringify({
      exists: true,
      person: { id: person.id, nome: person.nome, whatsapp: person.whatsapp ?? null, email: person.email ?? null },
      participated
    }), { status: 200 });

  } catch (err: any) {
    console.error("check-cpf error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "internal" }), { status: 500 });
  }
});
