// src/utils/masks.ts
export function onlyDigits(v: string): string {
  return v.replace(/\D/g, "");
}

export function limitDigits(v: string, max: number): string {
  return onlyDigits(v).slice(0, max);
}

// CPF — 000.000.000-00
export function maskCpf(v: string): string {
  return limitDigits(v, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// WhatsApp — (11) 98765-4321
export function maskWhatsapp(v: string): string {
  const d = limitDigits(v, 11);
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// Telefone (fixo/alternativo) — suporta 10 ou 11 dígitos
export function maskTelefone(v: string): string {
  const d = limitDigits(v, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

// CEP — 00000-000
export function maskCEP(v: string): string {
  return limitDigits(v, 8).replace(/^(\d{5})(\d{1,3})/, "$1-$2");
}

// DATA — DD/MM/AAAA
export function maskDate(v: string): string {
  return limitDigits(v, 8).replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2");
}
