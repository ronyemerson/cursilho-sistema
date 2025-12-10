// functions/enroll/index.ts
// Supabase Edge Function (Deno runtime)
// POST /enroll  { cpf, personal: {...}, finance: {...}, terms: {...} }
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function cleanCpf(s: string) { return (s||"").replace(/\D/g, ""); }

async function serverCpfValid(raw: string) {
  if (!/^\d{11}$/.test(raw)) return false;
  if (/^(\d)\1+$/.test(raw)) return false;
  const calc = (s:string,t:number) => {
    let sum = 0;
    for (let i=0;i<t;i++) sum += Number(s.charAt(i)) * (t+1-i);
    const r = sum % 11; return r < 2 ? 0 : 11-r;
  };
  return calc(raw,9) === Number(raw.charAt(9)) && calc(raw,10) === Number(raw.charAt(10));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await req.json();

    const cpfRaw = cleanCpf(body.cpf || "");
    if (!(await serverCpfValid(cpfRaw))) return new Response(JSON.stringify({ error: "cpf invalid" }), { status: 400 });

    // check existing person
    const { data: persons } = await supabase.from("persons").select("*").eq("cpf_normalizado", cpfRaw).limit(1);
    let personId: string | null = persons && persons.length ? persons[0].id : null;

    if (personId) {
      // check participation
      const { data: enrolls } = await supabase.from("enrollments").select("id,status").eq("person_id", personId);
      const participated = enrolls && enrolls.some((r:any) => ["confirmed","attended"].includes(r.status));
      if (participated) return new Response(JSON.stringify({ error: "cpf already participated" }), { status: 409 });
      // update basic person info (safe merge)
      await supabase.from("persons").update({
        nome: body.personal?.nome ?? persons[0].nome,
        whatsapp: body.personal?.whatsapp ?? persons[0].whatsapp,
        email: body.personal?.email ?? persons[0].email
      }).eq("id", personId);
    } else {
      // create person
      const { data: created } = await supabase.from("persons").insert([{
        nome: body.personal?.nome ?? null,
        documento: body.cpf ?? null,
        cpf_normalizado: cpfRaw,
        whatsapp: body.personal?.whatsapp ?? null,
        email: body.personal?.email ?? null,
        cidade: body.personal?.cidade ?? null,
        igreja: body.personal?.igreja ?? null,
        observacoes: body.personal?.observacoes ?? null,
        created_at: new Date().toISOString()
      }]).select().single();
      personId = created.id;
    }

    // create cursilhista (meta)
    const { data: curs } = await supabase.from("cursilhistas").insert([{
      person_id: personId,
      camiseta: body.personal?.camiseta ?? null,
      restricao_alimentar: body.personal?.restricaoAlimentar ?? null,
      restricao_medica: body.personal?.restricaoMedica ?? null,
      responsavel_financeiro: body.finance?.responsavelProrio ? null : JSON.stringify(body.finance?.responsavel || {}),
      aceita_termos: !!body.terms?.aceitaTermos,
      created_at: new Date().toISOString()
    }]).select().single();

    // create enrollment (pending)
    const amount = body.finance?.metodo === "cartao" ? 750.08 : 700.08;
    const { data: enrollment } = await supabase.from("enrollments").insert([{
      person_id: personId,
      cursilhista_id: curs.id,
      event_key: body.event_key ?? "14-cursilho-2026",
      status: "pending",
      amount,
      payment_method: body.finance?.metodo ?? "pix",
      created_at: new Date().toISOString()
    }]).select().single();

    // optional: send notification (email/whatsapp) via third-party here (omitted)

    return new Response(JSON.stringify({ success: true, enrollment }), { status: 201 });

  } catch (err:any) {
    console.error("enroll error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "internal" }), { status: 500 });
  }
});
