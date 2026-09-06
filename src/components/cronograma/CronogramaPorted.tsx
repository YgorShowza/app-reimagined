import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { syncCronogramaWithExamAttempts } from "@/lib/cronograma";
import { CronogramaSourceParityV2 } from "@/components/cronograma/CronogramaSourceParityV2";
import { CronogramaHeaderActions } from "@/components/cronograma/CronogramaHeaderActions";

export function CronogramaPorted() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.isAdmin) return;

    let active = true;
    void syncCronogramaWithExamAttempts()
      .then((changed) => {
        if (!active || changed <= 0) return;
        return queryClient.invalidateQueries();
      })
      .catch((error) => {
        // A tela continua disponível mesmo se a sincronização automática falhar;
        // a falha será visível nos dados e pode ser repetida no próximo acesso.
        console.error("Falha ao sincronizar Cronograma com provas concluídas", error);
      });

    return () => {
      active = false;
    };
  }, [queryClient, user?.isAdmin]);

  return (
    <div className="relative">
      <CronogramaSourceParityV2 actions={user?.isAdmin ? <CronogramaHeaderActions /> : undefined} />
    </div>
  );
}
