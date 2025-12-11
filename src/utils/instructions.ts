// src/utils/instructions.ts
// Utilitários com textos oficiais / funções relacionadas aos termos do Cursilho.
// Exporte e use diretamente no formulário.

export type TermosAudit = {
  aceite: boolean;
  versao: string;      // nome do PDF ou versão textual curta
  aceite_ts?: string;  // ISO timestamp quando aceitou
};

// Nome / caminho padrão do PDF (coloque o PDF em public/docs/)
export const TERMOS_PDF_FILENAME = "TERMO_CURSILHO_14_PIB_MOGI.pdf";
export const TERMOS_PDF_PATH = `/docs/${TERMOS_PDF_FILENAME}`;

/* ---------- Textos (strings) ---------- */
/* Texto integral/resumido prontos para renderizar - mantenha em PT-BR */
export const TERMOS_PERMANENCIA = `Estou ciente e de acordo de que o Cursilho é um evento imersivo e que, para participação,
o interessado deve permanecer no local do evento durante toda sua realização (de quinta-feira à noite a domingo à noite).
Declaro estar ciente também que a eventual não disponibilidade integral de presença no evento inviabilizará a participação.`;

export const TERMOS_TRANSPORTE = `O transporte para o evento é realizado através de ônibus fretado (partindo do centro de Mogi das Cruzes - SP).
Por questões de organização, não é permitida a chegada diretamente no local da realização do evento, salvo exceções previamente autorizadas pela comissão organizadora.`;

export const TERMOS_PAGAMENTO = `O valor da inscrição é R$700,08 para pagamento por PIX/dinheiro ou R$750,08 para pagamento por cartão.
A participação só estará garantida mediante formulário preenchido e pagamento INTEGRAL do valor dentro do prazo informado (normalmente até 15 dias após a inscrição).`;

export const TERMOS_DESISTENCIA = `Política de desistência:
- Até 7 dias antes do início: devolução de 100% do valor;
- Após esse prazo: devolução de 30% do valor;
- Transferência de vaga/valor para próxima edição: permitida uma única vez, sujeita a diferença de valores e análise da organização.`;

export const TERMOS_COMPROVANTE = `Após efetuar o pagamento, envie o comprovante (imagem/PDF) para o contato da organização via WhatsApp: 11 91756-1108.
O comprovante é necessário para confirmar a vaga no evento.`;

export const TERMOS_DECLARACAO_FINAL = `Declaro que li atentamente todas as informações, termos e perguntas do formulário,
estou de acordo com as condições do evento e assumo compromisso de cumprir as normas e horários estabelecidos.`;

/* ---------- Funções utilitárias ---------- */

/**
 * Retorna um array de parágrafos (strings) com os principais trechos dos termos.
 * Útil para render em uma caixa rolável como <div>{parags.map(...)}</div>
 */
export function getTermosParagrafos(): string[] {
  return [
    TERMOS_PERMANENCIA,
    TERMOS_TRANSPORTE,
    TERMOS_PAGAMENTO,
    TERMOS_DESISTENCIA,
    TERMOS_COMPROVANTE,
    TERMOS_DECLARACAO_FINAL,
  ];
}

/**
 * Retorna o caminho público do PDF (para uso em <a href={getPdfPath()} ...>)
 */
export function getPdfPath(): string {
  return TERMOS_PDF_PATH;
}

/**
 * Validação simples: garante que o checkbox de aceite foi marcado.
 * Lança erro se não marcado para permitir uso em fluxo sync try/catch.
 */
export function requireAgreement(accepted: boolean): void {
  if (!accepted) throw new Error("É necessário aceitar os termos para prosseguir.");
}

/**
 * Anexa informações de auditoria dos termos ao payload.
 * Retorna uma cópia do payload com `termos` preenchido.
 *
 * Exemplo de uso:
 * const augmented = attachTermosToPayload(payload, true);
 */
export function attachTermosToPayload<T extends object>(payload: T, accepted: boolean, version = TERMOS_PDF_FILENAME) {
  const termos = {
    aceite: Boolean(accepted),
    versao: version,
    aceite_ts: accepted ? new Date().toISOString() : undefined,
  };
  return { ...payload, termos };
}

/**
 * Gera um resumo simples (texto) para exibir no resumo final (string compacta).
 */
export function termosResumoText(): string {
  return `${TERMOS_PERMANENCIA} ${TERMOS_PAGAMENTO} ${TERMOS_DESISTENCIA}`;
}

/* ---------- Export padrão (opcional) ---------- */
const Instructions = {
  TERMOS_PDF_PATH,
  TERMOS_PDF_FILENAME,
  getTermosParagrafos,
  getPdfPath,
  requireAgreement,
  attachTermosToPayload,
  termosResumoText,
};

export default Instructions;
