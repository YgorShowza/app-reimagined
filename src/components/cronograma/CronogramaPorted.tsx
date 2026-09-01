import { useCurrentUser } from "@/lib/useCurrentUser";
import { CronogramaSourceParityV2 } from "@/components/cronograma/CronogramaSourceParityV2";
import { CronogramaHeaderActions } from "@/components/cronograma/CronogramaHeaderActions";

export function CronogramaPorted() {
  const { data: user } = useCurrentUser();

  return (
    <div className="relative">
      <CronogramaSourceParityV2 actions={user?.isAdmin ? <CronogramaHeaderActions /> : undefined} />
    </div>
  );
}
