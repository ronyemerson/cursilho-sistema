// src/components/forms/CursilhistaForm.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "../ui/Input";
import Select from "../ui/Select";
import {
  findPersonByDocumento,
  updatePerson,
  uploadPhoto,
  createPerson,
  createCursilhista,
  createEnrollment
} from "../../services/cursilhistaService";

/* --- schema zod --- */
const schema = z.object({
  nome: z.string().min(3, "Informe seu nome completo"),
  apelido: z.string().optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  whatsapp: z.string().min(10, "WhatsApp inválido").max(20),
  dataNascimento: z.string().optional().or(z.literal("")),
  documento: z.string().min(8, "CPF inválido").optional().or(z.literal("")),
  camiseta: z.enum(["P", "M", "G", "GG", "Outro"]).optional(),
  decuria: z.enum(["João", "Lucas", "Marcos", "Mateus"]).optional(),
  restricaoAlimentar: z.string().optional(),
  restricaoMedica: z.string().optional(),
  responsavelFinanceiro: z
    .object({
      possui: z.enum(["sim", "nao"]),
      nome: z.string().optional(),
      telefone: z.string().optional(),
      relacao: z.string().optional(),
    })
    .optional()
    .default({ possui: "sim" }),
  aceitaTermos: z.boolean().refine((v) => v === true, "Você precisa concordar com os termos"),
  photoFile: z.any().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CursilhistaForm() {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: { camiseta: "G", responsavelFinanceiro: { possui: "sim" } } as any,
    });

  // preview file handler — usado no campo file do formulário
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoPreview(result);
      setValue("photoFile" as any, file);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(values: FormData) {
    setBusy(true);
    try {
      const documento = values.documento?.trim();
      let personId: string | null = null;

      if (documento) {
        const existing = await findPersonByDocumento(documento);
        if (existing && existing.id) {
          personId = existing.id;
          const payloadToUpdate: any = {};
          if (values.nome && values.nome !== existing.nome) payloadToUpdate.nome = values.nome;
          if (values.email && values.email !== existing.email) payloadToUpdate.email = values.email;
          if (values.whatsapp && values.whatsapp !== existing.telefone) payloadToUpdate.telefone = values.whatsapp;
          if (Object.keys(payloadToUpdate).length > 0) {
            await updatePerson(personId, payloadToUpdate);
          }
        }
      }

      if (!personId) {
        const personPayload = {
          role: "cursilhista",
          nome: values.nome,
          apelido: values.apelido ?? null,
          email: values.email ?? null,
          telefone: values.whatsapp ?? null,
          data_nascimento: values.dataNascimento ?? null,
          documento: documento ?? null,
          extra_data: {},
        };
        const created = await createPerson(personPayload as any);
        personId = created.id;
      }

      let foto_path: string | null = null;
      const file = (values as any).photoFile as File | undefined;
      if (file) {
        const upload = await uploadPhoto(file);
        foto_path = upload.publicURL ?? upload.path;
      }

      const cursPayload = {
        person_id: personId,
        camiseta: values.camiseta ?? null,
        decuria: values.decuria ?? null,
        restricao_alimentar: values.restricaoAlimentar ?? null,
        restricao_medica: values.restricaoMedica ?? null,
        responsavel_financeiro: values.responsavelFinanceiro ?? null,
        foto_path,
        aceita_termos: !!values.aceitaTermos,
      };

      const curs = await createCursilhista(cursPayload as any);

      const enrollmentPayload = {
        person_id: personId,
        cursilhista_id: curs.id,
        event_key: "14-cursilho-2026",
        status: "pending",
        amount: 700.08,
      };
      await createEnrollment(enrollmentPayload as any);

      alert("Inscrição registrada com sucesso!");
      setPhotoPreview(null);
      reset(); // limpa form após sucesso
    } catch (err: any) {
      console.error("Erro no cadastro:", err);
      alert("Erro ao salvar inscrição: " + (err.message ?? "verifique console"));
    } finally {
      setBusy(false);
    }
  }

  const watchResponsavel = watch("responsavelFinanceiro");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">Formulário de Inscrição — Cursilhista</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Nome completo" {...register("nome")} error={(errors.nome?.message as string) ?? null} />
        <Input label="Apelido" {...register("apelido")} error={(errors.apelido?.message as string) ?? null} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Input label="Email (opcional)" type="email" {...register("email")} error={(errors.email?.message as string) ?? null} />
        <Input label="WhatsApp" {...register("whatsapp")} error={(errors.whatsapp?.message as string) ?? null} />
        <Input label="CPF (documento)" {...register("documento")} error={(errors.documento?.message as string) ?? null} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Input label="Data de nascimento" type="date" {...register("dataNascimento")} error={(errors.dataNascimento?.message as string) ?? null} />
        <Select label="Tamanho da camiseta" {...register("camiseta")} error={(errors.camiseta?.message as string) ?? null}>
          <option value="P">P</option>
          <option value="M">M</option>
          <option value="G">G</option>
          <option value="GG">GG</option>
          <option value="Outro">Outro</option>
        </Select>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        <Select label="Decúria" {...register("decuria")} error={(errors.decuria?.message as string) ?? null}>
          <option value="">-- selecione --</option>
          <option value="João">João</option>
          <option value="Lucas">Lucas</option>
          <option value="Marcos">Marcos</option>
          <option value="Mateus">Mateus</option>
        </Select>

        <div>
          <label className="block text-sm font-medium mb-1">Foto (opcional)</label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
          {photoPreview && (
            <img src={photoPreview} alt="preview" className="mt-2 w-28 h-28 object-cover rounded border" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Restrições alimentares (opcional)</label>
          <textarea {...register("restricaoAlimentar")} className="w-full px-3 py-2 border rounded" rows={3} />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-1">Restrições médicas / medicamentos (opcional)</label>
        <textarea {...register("restricaoMedica")} className="w-full px-3 py-2 border rounded" rows={2} />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium mb-2">Responsável financeiro</label>
        <div className="flex items-center gap-3 mb-3">
          <label className="inline-flex items-center">
            <input type="radio" value="sim" {...register("responsavelFinanceiro.possui")} defaultChecked />
            <span className="ml-2">Sim</span>
          </label>
          <label className="inline-flex items-center">
            <input type="radio" value="nao" {...register("responsavelFinanceiro.possui")} />
            <span className="ml-2">Não</span>
          </label>
        </div>

        {watchResponsavel?.possui === "nao" ? (
          <p className="text-sm text-slate-600">Você informou que outra pessoa fará o pagamento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Nome do responsável" {...register("responsavelFinanceiro.nome")} error={null} />
            <Input label="Telefone do responsável" {...register("responsavelFinanceiro.telefone")} error={null} />
            <Input label="Relação" {...register("responsavelFinanceiro.relacao")} error={null} />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-3">
        <input type="checkbox" {...register("aceitaTermos")} id="termos" />
        <label htmlFor="termos" className="text-sm">
          Declaro que li as informações e concordo com os termos.
        </label>
      </div>
      {errors.aceitaTermos && <p className="text-sm text-red-500 mt-2">{errors.aceitaTermos.message}</p>}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="submit"
          disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-70"
        >
          {busy ? "Gravando..." : "Enviar inscrição"}
        </button>

        <div className="text-sm text-slate-500">
          Ao enviar, seus dados serão mantidos para organização do evento.
        </div>
      </div>
    </form>
  );
}
