from pathlib import Path

p = Path('src/components/cronograma/CronogramaImportResults.tsx')
s = p.read_text()
old = '''import {
  createCronogramaEntries,
  currentMonthStr,
  listCronogramaEntries,
  updateCronogramaEntry,
  type CronogramaEntry,
} from "@/lib/cronograma";'''
new = '''import { currentMonthStr } from "@/lib/cronograma";
import { importCronogramaResultsAtomic } from "@/lib/cronograma-import";'''
if old not in s:
    raise SystemExit('Bloco de imports esperado não encontrado')
s = s.replace(old, new, 1)
start = s.index('  async function launch() {')
end = s.index('\n\n  return (', start)
replacement = '''  async function launch() {
    if (!validRows.length) return toast.error("Não há registros válidos para importar.");
    setLaunching(true);
    try {
      const response = await importCronogramaResultsAtomic(validRows.map((row) => ({
        matricula: row.matricula,
        tema: row.tema,
        nota: row.nota!,
        month: row.month,
        completion_date: row.completionDate,
      })));
      const finalResult = {
        updated: response.updated,
        created: response.created,
        ignored: response.ignored + invalidRows.length,
      };
      setResult(finalResult);
      toast.success("Resultados importados para o cronograma.");
      onComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha durante a importação. Nenhum registro foi alterado.");
    } finally {
      setLaunching(false);
    }
  }'''
s = s[:start] + replacement + s[end:]
p.write_text(s)
