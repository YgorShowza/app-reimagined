import { useQuery } from "@tanstack/react-query";
import { getCurrentSessionUser } from "@/lib/backend/current-user-gateway";

export interface CurrentUser {
  id: string;
  matricula: string;
  nome: string;
  setor: string | null;
  isAdmin: boolean;
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ["current-user"],
    staleTime: 60_000,
    queryFn: getCurrentSessionUser,
  });
}
