import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, KeyRound, RefreshCw, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listEmployees, type Employee } from "@/lib/employees";
import { supabase } from "@/integrations/supabase/client";

type GeneratedAccess = {
  code: string;
  employee_id: string;
  employee_name: string;
  matricula: string;
  expires_at: string;
};

const rpc = supabase as unknown as {
  rpc: (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card, var(--shadow-md))",
      }}
    >
      {children}
    </div>
  );
}

export function AccessActivationAdmin() {
  const [search, setSearch] = useState("");
  const [generated, setGenerated] = useState<GeneratedAccess | null>(null);
  const [copied, setCopied] = useState(false);

  const employees = useQuery({
    queryKey: ["employees-access-activation"],
    queryFn: listEmployees,
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees.data ?? [])
      .filter((e) => e.status === "Ativo")
      .filter((e) =>
        !q ||
        e.full_name.toLowerCase().includes(q) ||
        e.matricula.toLowerCase().includes(q) ||
        e.sector.toLowerCase().includes(q),
      );
  }, [employees.data, search]);

  const generate = useMutation({
    mutationFn: async (employee: Employee) => {
      const { data, error } = await rpc.rpc("generate_registration_code", {
        p_employee_id: employee.id,
      });
      if (error) throw new Error(error.message || "Não foi possível gerar o código");
      return data as GeneratedAccess;
    },
    onSuccess: (data) => {
      setCopied(false);
      setGenerated(data);
      toast.success("Código de primeiro acesso gerado");
    },
    onError: (error: Error) => {
      const message = error.message.toLowerCase();
      toast.error(
        message.includes("já possui acesso")
          ? "Esta matrícula já possui acesso cadastrado"
          : error.message || "Não foi possível gerar o código",
      );
    },
  });

  const revoke = useMutation({
    mutationFn: async (employee: Employee) => {
      const { error } = await rpc.rpc("revoke_registration_code", {
        p_employee_id: employee.id,
      });
      if (error) throw new Error(error.message || "Não foi possível revogar o código");
      return employee;
    },
    onSuccess: (employee) => toast.success(`Código de ${employee.full_name} revogado`),
    onError: (error: Error) => toast.error(error.message),
  });

  const copyCode = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.code);
      setCopied(true);
      toast.success("Código copiado");
    } catch {
      toast.error("Não foi possível copiar automaticamente");
    }
  };

  if (employees.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div
          className="h-9 w-9 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }}
        />
      </div>
    );
  }

  if (employees.isError) {
    return (
      <Card className="mx-auto max-w-xl p-8 text-center">
        <XCircle className="mx-auto h-10 w-10 text-red-500" />
        <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>
          Não foi possível carregar a equipe.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => employees.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <section
        className="rounded-[1.5rem] p-5 md:p-6"
        style={{
          background: "linear-gradient(135deg,#171118,#2b0b13 50%,#111216)",
          border: "1px solid rgba(200,16,46,.26)",
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-white/40">
          <ShieldCheck className="h-4 w-4" /> Controle de identidade
        </div>
        <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Primeiro acesso</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/50">
          Gere um código temporário de uso único para o colaborador cadastrar a própria senha. O código expira em 24 horas.
        </p>
      </section>

      <Card className="p-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-4)" }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, matrícula ou setor..."
            className="pl-10"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((employee) => (
          <Card key={employee.id} className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-bold" style={{ color: "var(--text-1)" }}>
                  {employee.full_name}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>
                  Mat. {employee.matricula} · {employee.sector} · {employee.access_profile}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Button
                  variant="outline"
                  onClick={() => revoke.mutate(employee)}
                  disabled={revoke.isPending || generate.isPending}
                >
                  Revogar
                </Button>
                <Button
                  onClick={() => generate.mutate(employee)}
                  disabled={generate.isPending || revoke.isPending}
                  className="bg-[#C8102E] font-bold text-white hover:bg-[#A00D24]"
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Gerar código
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {!rows.length && (
          <Card className="p-10 text-center">
            <KeyRound className="mx-auto h-10 w-10 opacity-30" style={{ color: "var(--text-4)" }} />
            <p className="mt-3 font-bold" style={{ color: "var(--text-1)" }}>
              Nenhum colaborador ativo encontrado.
            </p>
          </Card>
        )}
      </div>

      <Dialog
        open={!!generated}
        onOpenChange={(open) => {
          if (!open) {
            setGenerated(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código de primeiro acesso</DialogTitle>
          </DialogHeader>
          {generated && (
            <div className="space-y-4">
              <div>
                <p className="font-bold" style={{ color: "var(--text-1)" }}>
                  {generated.employee_name}
                </p>
                <p className="text-xs" style={{ color: "var(--text-4)" }}>
                  Matrícula {generated.matricula}
                </p>
              </div>

              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
              >
                <p className="text-[10px] font-black uppercase tracking-[.18em]" style={{ color: "var(--text-4)" }}>
                  Código temporário
                </p>
                <p
                  className="mt-2 text-3xl font-black tracking-[.24em]"
                  style={{ color: "var(--accent)" }}
                >
                  {generated.code}
                </p>
                <p className="mt-3 text-xs" style={{ color: "var(--text-4)" }}>
                  Válido até {new Date(generated.expires_at).toLocaleString("pt-BR", { timeZone: "America/Maceio" })}
                </p>
              </div>

              <Button onClick={copyCode} className="w-full" variant="outline">
                {copied ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Código copiado" : "Copiar código"}
              </Button>

              <p className="text-xs leading-relaxed" style={{ color: "var(--text-4)" }}>
                Compartilhe apenas com o titular da matrícula. O código é de uso único, expira em 24 horas e não é armazenado em texto puro no banco.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
