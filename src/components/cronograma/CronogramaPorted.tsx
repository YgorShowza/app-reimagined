import { useState } from "react";
import { FileSpreadsheet, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CronogramaSourceParityV2 } from "@/components/cronograma/CronogramaSourceParityV2";
import { CronogramaAnnualGeneratorV2 } from "@/components/cronograma/CronogramaAnnualGeneratorV2";
import { CronogramaImportResults } from "@/components/cronograma/CronogramaImportResults";
import { CronogramaPdfExports } from "@/components/cronograma/CronogramaPdfExports";
import { CronogramaPracticalActions } from "@/components/cronograma/CronogramaPracticalActions";

export function CronogramaPorted() {
  const { data: user } = useCurrentUser();
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  return (
    <div className="relative">
      {user?.isAdmin && (
        <div className="mx-auto mb-3 grid w-full max-w-7xl grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button
            variant="outline"
            onClick={() => setPdfOpen(true)}
            className="w-full shadow-sm sm:w-auto"
          >
            <FileText className="mr-2 h-4 w-4" />
            Relatórios PDF
          </Button>
          <CronogramaPracticalActions />
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="w-full shadow-sm sm:w-auto"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar Resultados
          </Button>
          <Button
            onClick={() => setGeneratorOpen(true)}
            className="w-full bg-[#C8102E] text-white shadow-sm hover:bg-[#A00D24] sm:w-auto"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Ano
          </Button>
        </div>
      )}

      <CronogramaSourceParityV2 />

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
          <CronogramaPdfExports
            open={pdfOpen}
            onOpenChange={setPdfOpen}
          />
        </>
      )}
    </div>
  );
}
