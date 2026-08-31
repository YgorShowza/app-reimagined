import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { CronogramaSourceParity } from "@/components/cronograma/CronogramaSourceParity";
import { CronogramaAnnualGenerator } from "@/components/cronograma/CronogramaAnnualGenerator";

export function CronogramaPorted() {
  const { data: user } = useCurrentUser();
  const [generatorOpen, setGeneratorOpen] = useState(false);

  return (
    <div className="relative">
      {user?.isAdmin && (
        <div className="mx-auto mb-3 flex w-full max-w-7xl justify-end">
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
        <CronogramaAnnualGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
        />
      )}
    </div>
  );
}
