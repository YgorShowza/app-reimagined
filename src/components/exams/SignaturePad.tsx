import { useRef, useState } from "react";
import { CheckCircle2, Eraser, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignaturePadProps {
  signerName: string;
  saving?: boolean;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

export function SignaturePad({ signerName, saving = false, onConfirm }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [saved, setSaved] = useState(false);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (saved || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = point(event);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawingRef.current = true;
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || saved || saving) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.getContext("2d")?.beginPath();
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas || saved || saving) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const confirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !agreed || saving || saved) return;
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível gerar a assinatura.")), "image/png", 0.92);
    });
    await onConfirm(blob);
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.35)" }}>
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
        <p className="mt-2 font-black text-emerald-500">Assinatura registrada</p>
        <p className="mt-1 text-xs" style={{ color: "var(--text-4)" }}>{signerName}</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid rgba(200,16,46,.35)" }}>
      <div className="flex items-center gap-2 px-5 py-3 text-white" style={{ background: "#C8102E" }}>
        <PenLine className="h-4 w-4" />
        <p className="text-sm font-black">Assinatura eletrônica obrigatória</p>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-xl p-3 text-xs" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--text-3)" }}>
          <strong style={{ color: "var(--text-1)" }}>{signerName}</strong><br />
          Empresa Alagoana de Terminais · Porto de Maceió
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: "var(--text-3)" }}>Assine com o dedo ou mouse</label>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--text-4)" }}><Eraser className="h-3.5 w-3.5" /> Limpar</button>
          </div>
          <div className="overflow-hidden rounded-xl bg-white" style={{ border: `2px solid ${hasDrawn ? "#C8102E" : "#d1d5db"}` }}>
            <canvas
              ref={canvasRef}
              width={900}
              height={220}
              className="block h-[145px] w-full touch-none cursor-crosshair"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onPointerLeave={(event) => { if (drawingRef.current) end(event); }}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3" style={{ background: "rgba(200,16,46,.05)", border: "1px solid rgba(200,16,46,.18)" }}>
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" style={{ accentColor: "#C8102E" }} />
          <span className="text-sm leading-5" style={{ color: "var(--text-2)" }}>Declaro que realizei esta avaliação pessoalmente, sem auxílio externo, e concordo com o resultado registrado no SEGEMPAT.</span>
        </label>

        <Button onClick={confirm} disabled={!hasDrawn || !agreed || saving} className="w-full bg-[#C8102E] text-white hover:bg-[#A00D24]">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando assinatura...</> : <><PenLine className="mr-2 h-4 w-4" /> Confirmar assinatura</>}
        </Button>
      </div>
    </section>
  );
}
