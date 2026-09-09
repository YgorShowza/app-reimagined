import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function requireText(source, text, label) {
  if (!source.includes(text)) throw new Error(`${label}: conteúdo obrigatório ausente: ${text}`);
}

function forbidText(source, text, label) {
  if (source.includes(text)) throw new Error(`${label}: conteúdo proibido presente: ${text}`);
}

const documentSource = read("src/lib/certificate-document.ts");
const previewSource = read("src/routes/_authenticated/certificado.$attemptId.tsx");
const evidenceSource = read("server/src/routes/exam-evidence.js");
const examTypesSource = read("src/lib/exams.ts");

requireText(documentSource, "Certificado de Capacitação Interna", "documento imprimível");
requireText(documentSource, "CONTEÚDO PROGRAMÁTICO", "documento imprimível");
requireText(documentSource, "!evidence.passed || !evidence.certificate_code || !evidence.signed_at", "bloqueio defensivo");
requireText(documentSource, "não reproduz gabarito, banco de questões nem respostas individuais", "privacidade do certificado");
forbidText(documentSource, "EVIDÊNCIA DA AVALIAÇÃO", "documento imprimível");
forbidText(documentSource, "Resposta registrada", "documento imprimível");
forbidText(documentSource, "evidence.questions.map", "documento imprimível");
forbidText(documentSource, "NÃO APTO", "documento imprimível");

requireText(previewSource, "!ev.passed || !certificateRecord?.formally_issued || certificateRecord.certificate_revoked", "preview protegido");
requireText(previewSource, "Imprimir / salvar PDF", "emissão do documento");
requireText(previewSource, "CONTEÚDO PROGRAMÁTICO", "segunda página");
forbidText(previewSource, "ev.questions.map", "preview do certificado");
forbidText(previewSource, "Resposta registrada", "preview do certificado");

requireText(evidenceSource, "e.description AS exam_description", "metadados da ementa");
requireText(evidenceSource, "e.min_approval_pct", "critério de aprovação");
requireText(evidenceSource, "exam_type: attempt.exam_type", "modalidade da atividade");
requireText(examTypesSource, "exam_description?: string | null", "contrato frontend");
requireText(examTypesSource, "min_approval_pct?: number", "contrato frontend");

console.log("SEGEMPAT official certificate document contract: OK");
