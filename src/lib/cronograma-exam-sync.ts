import { syncCronogramaWithExamAttempts } from "@/lib/cronograma";

export async function syncCronogramaForExamAttempt(input: {
  examId: string;
  matricula: string | null;
  finishedAt?: string | null;
}) {
  if (!input.matricula) return 0;
  const month = (input.finishedAt || new Date().toISOString()).slice(0, 7);
  return syncCronogramaWithExamAttempts(month);
}
