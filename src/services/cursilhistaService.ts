// src/services/cursilhistaService.ts
import { supabase } from "./supabase";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Tipos simples — ajuste conforme seu schema no Supabase
 */
export type PersonPayload = {
  role?: string | null;
  nome: string;
  apelido?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  igreja?: string | null;
  documento?: string | null;
  extra_data?: Record<string, any> | null;
};

export type CursilhistaPayload = {
  person_id: string;
  camiseta?: string | null;
  decuria?: string | null;
  restricao_alimentar?: string | null;
  restricao_medica?: string | null;
  responsavel_financeiro?: Record<string, any> | null;
  foto_path?: string | null;
  aceita_termos?: boolean;
};

export type EnrollmentPayload = {
  person_id?: string | null;
  cursilhista_id?: string | null;
  event_key?: string | null;
  status?: string | null;
  amount?: number | null;
  payment_method?: string | null;
  installments?: number | null;
  comprovante?: string | null;
  contact_altern?: Record<string, any> | null;
  financial_resp?: Record<string, any> | null;
  consent?: boolean | null;
};

/** Upload de foto para bucket 'photos' (ajuste o nome do bucket se quiser) */
export async function uploadPhoto(file: File, path?: string) {
  const bucket = "photos";
  const fileExt = file.name.split(".").pop();
  const fileName = path ?? `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
  const filePath = fileName;

  // upload: só precisávamos do error, não do data
  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicURL = (urlData as any)?.publicUrl ?? (urlData as any)?.publicURL ?? null;

  return { path: filePath, publicURL };
}


/** CRUD básico */
export async function createPerson(payload: PersonPayload) {
  const { data, error } = await supabase
    .from("persons")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error as PostgrestError;
  return data as { id: string };
}

export async function findPersonByDocumento(documento: string) {
  if (!documento) return null;
  const { data, error } = await supabase
    .from("persons")
    .select("id, nome, email, telefone, documento, foto_path, extra_data")
    .eq("documento", documento)
    .maybeSingle();

  if (error) {
    console.error("Erro findPersonByDocumento:", error);
    throw error as PostgrestError;
  }

  return data as null | {
    id: string;
    nome?: string;
    email?: string;
    telefone?: string;
    documento?: string;
    foto_path?: string;
    extra_data?: Record<string, any>;
  };
}

export async function updatePerson(personId: string, payload: Partial<PersonPayload>) {
  const { data, error } = await supabase
    .from("persons")
    .update(payload)
    .eq("id", personId)
    .select("id")
    .single();

  if (error) {
    console.error("Erro updatePerson:", error);
    throw error as PostgrestError;
  }
  return data as { id: string };
}

export async function createCursilhista(payload: CursilhistaPayload) {
  const { data, error } = await supabase
    .from("cursilhistas")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error as PostgrestError;
  return data as { id: string };
}

export async function createEnrollment(payload: EnrollmentPayload) {
  const { data, error } = await supabase
    .from("enrollments")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error as PostgrestError;
  return data as { id: string };
}

/**
 * Fluxo composto (opcional): cria person -> upload foto -> cursilhista -> enrollment
 * Use createFullEnrollment se quiser tudo numa chamada.
 */
export async function createFullEnrollment(
  personPayload: PersonPayload,
  cursilhistaPayloadPartial: Omit<CursilhistaPayload, "person_id">,
  enrollmentPartial?: EnrollmentPayload,
  photoFile?: File
) {
  const person = await createPerson(personPayload);
  const personId = person.id;

  let foto_path: string | null = null;
  if (photoFile) {
    const upload = await uploadPhoto(photoFile);
    foto_path = upload.publicURL ?? upload.path;
  }

  const cursilhistaPayload: CursilhistaPayload = {
    person_id: personId,
    ...cursilhistaPayloadPartial,
    foto_path,
  };

  const curs = await createCursilhista(cursilhistaPayload);
  const cursilhistaId = curs.id;

  let enrollmentId: string | null = null;
  if (enrollmentPartial) {
    const enrollmentPayload: EnrollmentPayload = {
      person_id: personId,
      cursilhista_id: cursilhistaId,
      ...enrollmentPartial,
    };
    const enr = await createEnrollment(enrollmentPayload);
    enrollmentId = enr.id;
  }

  return { person_id: personId, cursilhista_id: cursilhistaId, enrollment_id: enrollmentId };
}
