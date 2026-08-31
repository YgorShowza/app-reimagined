import { useState } from "react";
import { CalendarDays, FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CronogramaSourceParity } from "@/components/cronograma/CronogramaSourceParity";
import { CronogramaAnnualGeneratorV2 } from "@/components/cronograma/CronogramaAnnualGeneratorV2";
import { CronogramaImportResults } from "@/components/cronograma/CronogramaImportResults";
import { CronogramaPlanEvaluation } from "@/components/cronograma/CronogramaPlanEvaluation";
import { CronogramaPdfExports } from "@/components/cronograma/CronogramaPdfExports";

export function CronogramaPorted() {
  const { data: user } = useCurrentUser();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  return (
    <div className="relative">
      {user?.isAdmin && (
        <div className="mx-auto mb-3 flex w-full max-w-7xl flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setPdfOpen(true)}
            className="shadow-sm"
          >
            <FileText className="mr-2 h-4 w-4" />
            Relatórios PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setPlanOpen(true)}
            className="shadow-sm"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Planejar Avaliação
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="shadow-sm"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Resultados
          </Button>
          <Button
            onClick={() => setGeneratorOpen(true)}
            className="bg-[#C8102E] text-white hover:bg-[#A00D24] shadow-sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Ano
          </Button>
        </div>
      )}

      <CronogramaSourceParity />

      {user?.isAdmin && (
        <>
          <CronogramaAnnualGeneratorV2
            open={generatorOpen}
            onOpenChange={setGeneratorOpen}
          />
          <CronogramaImportResults
            open={importOpen}
            onOpenChange={setImportOpen}
          />
          <CronogramaPlanEvaluation
            open={planOpen}
            onOpenChange={setPlanOpen}
          />
          <CronogramaPdfExports
            open={pdfOpen}
            onOpenChange={setPdfOpen}
          />
        </>
      )}
    </div>
  );
}
