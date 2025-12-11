// src/utils/locations.ts
export const UFs = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" },
] as const;

export type ViaCepResult = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string; // cidade
  uf?: string;
  erro?: boolean;
};

/**
 * Consulta ViaCEP por CEP limpo (somente dígitos, 8 chars).
 * Retorna objeto similar ao JSON do ViaCEP ou null em caso de erro.
 */
export async function lookupCepViaCep(cepDigits: string): Promise<ViaCepResult | null> {
  try {
    if (!cepDigits || cepDigits.length !== 8) return null;
    const resp = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
    if (!resp.ok) return null;
    const data = (await resp.json()) as ViaCepResult;
    if ((data as any).erro) return null;
    return data;
  } catch (err) {
    console.warn("lookupCepViaCep error:", err);
    return null;
  }
}
