import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, PlusCircle, Trash2, Send, Undo2, Calendar, Target } from "lucide-react";
import { toast } from "sonner";
import { listExams, deleteExam, updateExam, fmtDate, type Exam } from "@/lib/exams";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/provas")({
  head: () => ({
    meta: [
      { title: "Provas · SEGEMPAT" },
      { name: "description", content: "Gerencie as provas de treinamento das equipes do Porto de Maceió." },
    ],
  }),
  component: ProvasPage,
});

function StatusBadge({ status }: { status: string }) {
  const published = status === "Publicada";
  return (
    <span
      className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
      style={
        published
          ? { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
          : { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }
      }
    >
      {published ? "Publicada" : "Rascunho"}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
      style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-3)" }}
    >
      {children}
    </span>
  );
}

function ProvasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.isAdmin ?? false;
  const [toDelete, setToDelete] = useState<string | null>(null);

  const { data: exams = [], isLoading } = useQuery({ queryKey: ["exams"], queryFn: listExams });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["exams"] });

  const remove = useMutation({
    mutationFn: deleteExam,
    onSuccess: () => {
      toast.success("Prova excluída");
      setToDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateExam(id, { status }),
    onSuccess: () => {
      toast.success("Situação atualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-8">
      <div
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, #1a0509 0%, #2d0a10 100%)",
          border: "1.5px solid rgba(200,16,46,0.3)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5" style={{ background: "rgba(200,16,46,0.2)" }}>
              <FileText className="h-5 w-5" style={{ color: "#C8102E" }} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Provas</h1>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                {exams.length} cadastrada(s) ·{" "}
                {exams.filter((e) => e.status === "Publicada").length} publicada(s)
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => navigate({ to: "/provas-criar" })}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: "#C8102E" }}
            >
              <PlusCircle className="h-4 w-4" /> Nova prova
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4"
            style={{ borderColor: "var(--border)", borderTopColor: "#C8102E" }}
          />
        </div>
      ) : exams.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" style={{ color: "var(--text-4)" }} />
          <p className="font-semibold" style={{ color: "var(--text-3)" }}>
            Nenhuma prova cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam: Exam, i) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="overflow-hidden rounded-2xl"
              style={{
                background: "var(--bg-surface)",
                border: "1.5px solid var(--border)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div className="h-1" style={{ background: exam.status === "Publicada" ? "#10b981" : "#f59e0b" }} />
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-bold leading-snug" style={{ color: "var(--text-1)" }}>
                    {exam.title}
                  </h3>
                  <StatusBadge status={exam.status} />
                </div>
                {exam.description && (
                  <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>
                    {exam.description}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Chip>{exam.exam_type}</Chip>
                  <Chip>{exam.questions.length} questões</Chip>
                  <Chip>Mín. {exam.min_approval_pct}%</Chip>
                  <Chip>
                    <Target className="h-2.5 w-2.5" /> {exam.target_sector}
                  </Chip>
                  <Chip>
                    <Calendar className="h-2.5 w-2.5" /> {fmtDate(exam.scheduled_date)}
                  </Chip>
                </div>

                {isAdmin && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to="/provas-criar"
                      search={{ id: exam.id }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() =>
                        toggleStatus.mutate({
                          id: exam.id,
                          status: exam.status === "Publicada" ? "Rascunho" : "Publicada",
                        })
                      }
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "var(--bg-surface-3)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                    >
                      {exam.status === "Publicada" ? (
                        <>
                          <Undo2 className="h-3 w-3" /> Despublicar
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" /> Publicar
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setToDelete(exam.id)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "rgba(200,16,46,0.08)", border: "1px solid rgba(200,16,46,0.25)", color: "#C8102E" }}
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir prova?</AlertDialogTitle>
            <AlertDialogDescription>
              As tentativas registradas nesta prova também serão removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#C8102E] hover:bg-[#A00D24]"
              onClick={() => toDelete && remove.mutate(toDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
