"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, ChevronRight, ChevronLeft, Check, Download, Lightbulb,
  BookOpen, ClipboardList, MapPin, Users, Calendar, BarChart3,
  Sparkles, RotateCcw, Copy, CheckCircle2, XCircle, ArrowRight, FileText, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { regionesData } from "@/lib/data/regions";
import { verbosBloom, conectoresRecomendados } from "@/lib/data/verbs";
import {
  validateSmart, generateFeedback, generateRecommendations, type SmartScore,
} from "@/lib/smart-validator";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type StepId = "intro" | "participante" | "contexto" | "especifico" | "medible" | "alcanzable" | "relevante" | "temporal" | "resultado";

interface FormData {
  nombre: string; region: string; municipio: string; problema: string; poblacion: string;
  queLograr: string; sobreQueProblema: string; conQuien: string; donde: string;
  comoSabra: string; indicador: string; cuantoAlcanzar: string;
  recursos: string; tecnicamentePosible: string; limitaciones: string;
  porQueImportante: string; queNecesidadResuelve: string; comoAporta: string;
  enCuantoTiempo: string; fechaInicio: string; fechaFinal: string;
  objetivoSmart: string;
}

const STEPS: { id: StepId; label: string; short: string }[] = [
  { id: "participante", label: "Participante", short: "Part." },
  { id: "contexto", label: "Contexto", short: "Ctx." },
  { id: "especifico", label: "S — Específico", short: "S" },
  { id: "medible", label: "M — Medible", short: "M" },
  { id: "alcanzable", label: "A — Alcanzable", short: "A" },
  { id: "relevante", label: "R — Relevante", short: "R" },
  { id: "temporal", label: "T — Temporal", short: "T" },
  { id: "resultado", label: "Resultado", short: "Fin" },
];

const SMART_META: Record<string, { bg: string; text: string; border: string; fill: string; dot: string }> = {
  S: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", fill: "bg-blue-500", dot: "bg-blue-400" },
  M: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", fill: "bg-emerald-500", dot: "bg-emerald-400" },
  A: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", fill: "bg-amber-500", dot: "bg-amber-400" },
  R: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", fill: "bg-rose-500", dot: "bg-rose-400" },
  T: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", fill: "bg-violet-500", dot: "bg-violet-400" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function autoGenerateObjective(d: FormData): string {
  if (d.objetivoSmart.trim()) return d.objetivoSmart;
  const p: string[] = [];
  if (d.queLograr) p.push(d.queLograr.trim());
  const pop = d.conQuien || d.poblacion;
  if (pop) p.push(`de ${pop.trim()}`);
  const loc: string[] = [];
  if (d.municipio) loc.push(d.municipio);
  if (d.region) loc.push(`Región ${d.region}`);
  if (loc.length) p.push(`del municipio de ${loc.join(", ")}`);
  if (d.indicador && d.cuantoAlcanzar) p.push(`alcanzando un ${d.indicador.trim()} del ${d.cuantoAlcanzar.trim()}`);
  else if (d.indicador) p.push(`medido mediante ${d.indicador.trim()}`);
  else if (d.cuantoAlcanzar) p.push(`alcanzando ${d.cuantoAlcanzar.trim()}`);
  if (d.fechaFinal) p.push(`antes de ${d.fechaFinal}`);
  else if (d.enCuantoTiempo) p.push(`en un plazo de ${d.enCuantoTiempo.trim()}`);
  return p.join(", ").replace(/^,|,$/g, "").replace(/,\s*,/g, ",").trim();
}

function getIdx(step: StepId) { return STEPS.findIndex((s) => s.id === step); }

function canGo(step: StepId, d: FormData): boolean {
  switch (step) {
    case "participante": return !!d.nombre.trim() && !!d.region && !!d.municipio;
    case "contexto": return d.problema.trim().length > 10 && d.poblacion.trim().length > 3;
    default: return true;
  }
}

const slideV = {
  enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 280 : -280, opacity: 0 }),
};

/* ================================================================== */
/*  Shared small components                                            */
/* ================================================================== */

function StepHeader({ letter, title, desc, color }: { letter?: string; title: string; desc: string; color?: string }) {
  const c = letter && SMART_META[letter];
  return (
    <div className="mb-6">
      {letter && c && (
        <Badge className={`${c.fill} text-white text-xs font-bold mb-3`}>{letter} — {title.split("—")[1]?.trim() || title}</Badge>
      )}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
    </div>
  );
}

function GuidedField({ label, value, onChange, placeholder, rows = 3, id }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number; id?: string;
}) {
  const fieldId = id || label.toLowerCase().replace(/[^a-záéíóúñ]+/g, "-").replace(/-+$/, "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId} className="text-sm font-medium text-slate-700">{label}</Label>
      <Textarea id={fieldId} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="resize-none" />
    </div>
  );
}

function VerboChips({ onSelect }: { onSelect: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
        Banco de verbos (Taxonomía de Bloom)
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {verbosBloom.map((v) => (
          <button key={v} onClick={() => onSelect(v)}
            className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700 transition-colors border border-transparent hover:border-emerald-300">
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConectorChips() {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        <ArrowRight className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
        Conectores recomendados
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {conectoresRecomendados.map((c) => (
          <span key={c} className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */

export default function SmartBuilderPage() {
  const [step, setStep] = useState<StepId>("intro");
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<FormData>({
    nombre: "", region: "", municipio: "", problema: "", poblacion: "",
    queLograr: "", sobreQueProblema: "", conQuien: "", donde: "",
    comoSabra: "", indicador: "", cuantoAlcanzar: "",
    recursos: "", tecnicamentePosible: "", limitaciones: "",
    porQueImportante: "", queNecesidadResuelve: "", comoAporta: "",
    enCuantoTiempo: "", fechaInicio: "", fechaFinal: "", objetivoSmart: "",
  });
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const si = getIdx(step);
  const pct = (si / (STEPS.length - 1)) * 100;

  const munic = useMemo(() => {
    const r = regionesData.find((x) => x.nombre === form.region);
    return r ? r.municipios : [];
  }, [form.region]);

  const genObj = useMemo(() => autoGenerateObjective(form), [form]);

  const score = useMemo(
    () => validateSmart({ objetivo: form.objetivoSmart || genObj, region: form.region, municipio: form.municipio }),
    [form.objetivoSmart, genObj, form.region, form.municipio],
  );
  const fb = useMemo(() => generateFeedback(score), [score]);
  const recs = useMemo(() => generateRecommendations(score), [score]);

  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  const uf = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => setForm((p) => ({ ...p, [k]: v })), []);

  const go = useCallback((s: StepId) => {
    setDir(getIdx(s) > si ? 1 : -1);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [si]);

  const next = useCallback(() => { if (si < STEPS.length - 1) go(STEPS[si + 1].id); }, [si, go]);
  const prev = useCallback(() => { if (si > 0) go(STEPS[si - 1].id); }, [si, go]);

  const doExport = useCallback(async () => {
    setExporting(true);
    try {
      const obj = form.objetivoSmart || genObj;
      const res = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre || "Anónimo", fecha: today, region: form.region,
          municipio: form.municipio, problema: form.problema, objetivoSmart: obj,
          evaluacion: score, observaciones: fb, recomendaciones: recs,
        }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Objetivo_SMART_${(form.nombre || "Anonimo").replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Documento descargado correctamente");
    } catch {
      toast.error("Error al generar el documento");
    } finally { setExporting(false); }
  }, [form, today, score, fb, recs, genObj]);

  const doCopy = useCallback(() => {
    navigator.clipboard.writeText(form.objetivoSmart || genObj);
    setCopied(true);
    toast.success("Objetivo copiado");
    setTimeout(() => setCopied(false), 2000);
  }, [form.objetivoSmart, genObj]);

  const doReset = useCallback(() => {
    setForm({
      nombre: "", region: "", municipio: "", problema: "", poblacion: "",
      queLograr: "", sobreQueProblema: "", conQuien: "", donde: "",
      comoSabra: "", indicador: "", cuantoAlcanzar: "",
      recursos: "", tecnicamentePosible: "", limitaciones: "",
      porQueImportante: "", queNecesidadResuelve: "", comoAporta: "",
      enCuantoTiempo: "", fechaInicio: "", fechaFinal: "", objetivoSmart: "",
    });
    setDir(1);
    setStep("intro");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-600 text-white shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">Constructor de Objetivos SMART</h1>
            <p className="text-xs text-slate-500 hidden sm:block">Para estudiantes de posgrado</p>
          </div>
          {step !== "intro" && (
            <Badge variant="outline" className="text-xs shrink-0">{today}</Badge>
          )}
        </div>
      </header>

      {/* PROGRESS BAR */}
      {step !== "intro" && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3 pb-2">
            <Progress value={pct} className="h-1.5 mb-2.5" />
            <div className="flex gap-0.5 overflow-x-auto pb-1">
              {STEPS.map((s) => {
                const i = getIdx(s.id);
                const active = s.id === step;
                const past = i < si;
                const lm = s.label.match(/^([SMART])/);
                const lk = lm ? lm[1] : "";
                const m = lk && SMART_META[lk];
                return (
                  <button key={s.id} onClick={() => go(s.id)}
                    className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border
                      ${active && m ? `${m.bg} ${m.border} ${m.text}` : active ? "bg-slate-100 border-slate-300 text-slate-900" : past ? "text-emerald-600 hover:bg-emerald-50 border-transparent" : "text-slate-400 hover:bg-slate-50 border-transparent"}`}>
                    {past && !active ? <CheckCircle2 className="w-3 h-3" /> : lk && m ? <span className={`${m.fill} text-white rounded w-4 h-4 flex items-center justify-center text-[9px] font-bold`}>{lk}</span> : <span className="w-4 h-4" />}
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.short}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={slideV} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
            {step === "intro" && <IntroStep onStart={() => go("participante")} />}
            {step === "participante" && <PartStep form={form} uf={uf} munic={munic} />}
            {step === "contexto" && <CtxStep form={form} uf={uf} />}
            {step === "especifico" && <SStep form={form} uf={uf} />}
            {step === "medible" && <MStep form={form} uf={uf} />}
            {step === "alcanzable" && <AStep form={form} uf={uf} />}
            {step === "relevante" && <RStep form={form} uf={uf} />}
            {step === "temporal" && <TStep form={form} uf={uf} />}
            {step === "resultado" && <ResultStep form={form} uf={uf} genObj={genObj} score={score} fb={fb} recs={recs} onExport={doExport} exporting={exporting} onCopy={doCopy} copied={copied} onReset={doReset} today={today} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV */}
      {step !== "intro" && step !== "resultado" && (
        <footer className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button variant="outline" onClick={prev} disabled={si <= 0} className="gap-2"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">Anterior</span></Button>
            {step === "temporal" ? (
              <Button onClick={() => go("resultado")} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">Ver resultado <Sparkles className="w-4 h-4" /></Button>
            ) : (
              <Button onClick={next} disabled={!canGo(step, form)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><span className="hidden sm:inline">Siguiente</span><ChevronRight className="w-4 h-4" /></Button>
            )}
          </div>
        </footer>
      )}

      {step === "resultado" && (
        <footer className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-2 flex-wrap">
            <Button variant="outline" onClick={prev} className="gap-1.5 text-xs sm:text-sm"><ChevronLeft className="w-3.5 h-3.5" />Volver</Button>
            <Button variant="outline" onClick={doCopy} className="gap-1.5 text-xs sm:text-sm">{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? "Copiado" : "Copiar"}</Button>
            <Button onClick={doExport} disabled={exporting} className="gap-1.5 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-3.5 h-3.5" />{exporting ? "Generando..." : "Descargar .docx"}</Button>
            <Button variant="outline" onClick={doReset} className="gap-1.5 text-xs sm:text-sm"><RotateCcw className="w-3.5 h-3.5" />Nuevo</Button>
          </div>
        </footer>
      )}
    </div>
  );
}

/* ================================================================== */
/*  INTRO STEP                                                         */
/* ================================================================== */
function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center max-w-2xl mx-auto space-y-8 py-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
        <Target className="w-10 h-10" />
      </motion.div>
      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
          Constructor de Objetivos<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">SMART</span>
        </h2>
        <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Formule objetivos claros, medibles y alcanzables para su trabajo de posgrado. Siga el asistente paso a paso y obtenga una evaluación automática con descarga en Word.
        </p>
      </div>

      {/* SMART explanation */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-md mx-auto">
        {(["S", "M", "A", "R", "T"] as const).map((l, i) => {
          const m = SMART_META[l];
          const labels: Record<string, string> = { S: "Específico", M: "Medible", A: "Alcanzable", R: "Relevante", T: "Temporal" };
          return (
            <motion.div key={l} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.1 }}
              className={`${m.bg} border ${m.border} rounded-xl p-2 sm:p-3 text-center`}>
              <div className={`${m.fill} text-white rounded-lg w-8 h-8 mx-auto flex items-center justify-center text-sm font-bold mb-1`}>{l}</div>
              <p className={`text-[10px] sm:text-xs font-medium ${m.text}`}>{labels[l]}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Accordion */}
      <Accordion type="single" collapsible className="text-left max-w-xl mx-auto">
        {[
          { l: "S", t: "Específico", d: "Define con claridad qué quieres lograr, sobre qué problema, con quién y dónde. Un objetivo específico responde a preguntas concretas y evita ambigüedades." },
          { l: "M", t: "Medible", d: "Establece indicadores cuantificables. Debes poder responder: ¿Cómo sabré que lo logré? ¿Qué indicador utilizaré? ¿Cuánto espero alcanzar?" },
          { l: "A", t: "Alcanzable", d: "Verifica que el objetivo sea realista con los recursos disponibles. Considera: ¿Dispone de recursos? ¿Es técnicamente posible? ¿Qué limitaciones existen?" },
          { l: "R", t: "Relevante", d: "Asegúrate de que el objetivo aporte valor real: ¿Por qué es importante? ¿Qué necesidad resuelve? ¿Cómo aporta al territorio?" },
          { l: "T", t: "Temporal", d: "Define un plazo claro: ¿En cuánto tiempo? Fecha de inicio y fecha final. Sin plazo, no hay urgencia ni forma de medir el avance." },
        ].map((item) => {
          const m = SMART_META[item.l];
          return (
            <AccordionItem key={item.l} value={item.l}>
              <AccordionTrigger className={`${m.bg} ${m.text} rounded-lg px-4 py-3 hover:no-underline`}>
                <span className="flex items-center gap-2">
                  <span className={`${m.fill} text-white rounded-md w-6 h-6 flex items-center justify-center text-xs font-bold`}>{item.l}</span>
                  <span className="font-semibold text-sm">{item.t}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 px-4 pt-2 pb-3">{item.d}</AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
        <Button onClick={onStart} size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 text-base shadow-lg shadow-emerald-600/25">
          Comenzar <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Download source code button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
        <a
          href="/constructor-smart-goals.zip"
          download="constructor-smart-goals.zip"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-600 transition-colors underline-offset-4 hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar código fuente (ZIP)
        </a>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  PARTICIPANTE STEP                                                   */
/* ================================================================== */
function PartStep({ form, uf, munic }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void; munic: string[] }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader title="Participante y Ubicación" desc="Ingrese sus datos y seleccione la región y municipio de su intervención." />
      <Card>
        <CardContent className="space-y-5 pt-6">
          <GuidedField label="Nombre del participante" value={form.nombre} onChange={(v) => uf("nombre", v)} placeholder="Escriba su nombre o deje en blanco para ser Anónimo" rows={1} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Región en Salud</Label>
              <Select value={form.region} onValueChange={(v) => { uf("region", v); uf("municipio", ""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccione región" /></SelectTrigger>
                <SelectContent className="max-h-60">{regionesData.map((r) => <SelectItem key={r.nombre} value={r.nombre}>{r.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Municipio</Label>
              <Select value={form.municipio} onValueChange={(v) => uf("municipio", v)} disabled={!form.region}>
                <SelectTrigger><SelectValue placeholder={form.region ? "Seleccione municipio" : "Primero seleccione región"} /></SelectTrigger>
                <SelectContent className="max-h-60">{munic.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className={`text-xs text-center text-slate-400`}>
        <Calendar className="w-3 h-3 inline mr-1" />
        La fecha se registra automáticamente: {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  CONTEXTO STEP                                                      */
/* ================================================================== */
function CtxStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader title="Contexto del Problema" desc="Describa el problema que desea abordar y la población que se beneficiará." />
      <Card>
        <CardContent className="space-y-5 pt-6">
          <GuidedField label="Problema identificado" value={form.problema} onChange={(v) => uf("problema", v)} placeholder="Describa brevemente el problema o situación que motivó este objetivo. Ej: Deficiencias en la atención primaria en salud rural..." rows={4} />
          <GuidedField label="Población objetivo" value={form.poblacion} onChange={(v) => uf("poblacion", v)} placeholder="¿Quiénes se beneficiarán? Ej: 120 profesionales de salud, 50 familias rurales, 300 estudiantes..." rows={2} />
          <div className={`p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700`}>
            <Lightbulb className="w-3.5 h-3.5 inline mr-1" />
            Sea específico: incluya número aproximado de beneficiarios y su características (profesión, edad, ubicación, etc.).
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  S — ESPECÍFICO                                                      */
/* ================================================================== */
function SStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const m = SMART_META.S;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader letter="S" title="S — Específico" desc="Responda las siguientes preguntas para construir la especificidad de su objetivo." />
      <Card className={`${m.bg} ${m.border}`}>
        <CardHeader className="pb-3"><CardTitle className={`text-sm font-bold ${m.text}`}><Target className="w-4 h-4 inline mr-1.5" />Preguntas guía</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <GuidedField label="¿Qué desea lograr?" value={form.queLograr} onChange={(v) => uf("queLograr", v)} placeholder="Ej: Fortalecer las competencias en atención primaria" rows={2} />
          <GuidedField label="¿Sobre qué problema?" value={form.sobreQueProblema} onChange={(v) => uf("sobreQueProblema", v)} placeholder="Ej: Las brechas en la prestación de servicios de salud" rows={2} />
          <GuidedField label="¿Con quién?" value={form.conQuien} onChange={(v) => uf("conQuien", v)} placeholder="Ej: 120 profesionales de salud del nivel primario" rows={2} />
          <GuidedField label="¿Dónde?" value={form.donde} onChange={(v) => uf("donde", v)} placeholder="Ej: Municipios de la Región Ariari en Cundinamarca" rows={2} />
          <Separator />
          <VerboChips onSelect={(v) => { if (!form.queLograr) uf("queLograr", v.toLowerCase()); }} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  M — MEDIBLE                                                         */
/* ================================================================== */
function MStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const m = SMART_META.M;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader letter="M" title="M — Medible" desc="Defina cómo medirá el cumplimiento de su objetivo." />
      <Card className={`${m.bg} ${m.border}`}>
        <CardHeader className="pb-3"><CardTitle className={`text-sm font-bold ${m.text}`}><BarChart3 className="w-4 h-4 inline mr-1.5" />Preguntas guía</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <GuidedField label="¿Cómo sabrá que lo logró?" value={form.comoSabra} onChange={(v) => uf("comoSabra", v)} placeholder="Ej: Mediante evaluación pre y post intervención con prueba estandarizada" rows={2} />
          <GuidedField label="¿Qué indicador utilizará?" value={form.indicador} onChange={(v) => uf("indicador", v)} placeholder="Ej: porcentaje de cumplimiento, tasa de cobertura, índice de competencia" rows={2} />
          <GuidedField label="¿Cuánto espera alcanzar?" value={form.cuantoAlcanzar} onChange={(v) => uf("cuantoAlcanzar", v)} placeholder="Ej: 90%, 120 profesionales, 8 unidades" rows={2} />
          <Separator />
          <ConectorChips />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  A — ALCANZABLE                                                      */
/* ================================================================== */
function AStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const m = SMART_META.A;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader letter="A" title="A — Alcanzable" desc="Verifique la viabilidad de su objetivo con los recursos disponibles." />
      <Card className={`${m.bg} ${m.border}`}>
        <CardHeader className="pb-3"><CardTitle className={`text-sm font-bold ${m.text}`}><Lightbulb className="w-4 h-4 inline mr-1.5" />Preguntas guía</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <GuidedField label="¿Dispone de recursos?" value={form.recursos} onChange={(v) => uf("recursos", v)} placeholder="Ej: Se cuenta con presupuesto institucional, apoyo de la secretaría de salud y equipo interdisciplinario" rows={3} />
          <GuidedField label="¿Es técnicamente posible?" value={form.tecnicamentePosible} onChange={(v) => uf("tecnicamentePosible", v)} placeholder="Ej: Sí, existen instrumentos validados y personal capacitado para la intervención" rows={3} />
          <GuidedField label="¿Qué limitaciones existen?" value={form.limitaciones} onChange={(v) => uf("limitaciones", v)} placeholder="Ej: Dificultad de acceso a zonas rurales, disponibilidad de tiempo de los profesionales" rows={3} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  R — RELEVANTE                                                        */
/* ================================================================== */
function RStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const m = SMART_META.R;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader letter="R" title="R — Relevante" desc="Justifique la importancia y el aporte de su objetivo." />
      <Card className={`${m.bg} ${m.border}`}>
        <CardHeader className="pb-3"><CardTitle className={`text-sm font-bold ${m.text}`}><Sparkles className="w-4 h-4 inline mr-1.5" />Preguntas guía</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <GuidedField label="¿Por qué es importante?" value={form.porQueImportante} onChange={(v) => uf("porQueImportante", v)} placeholder="Ej: Porque la atención primaria es el pilar del sistema de salud y determina la calidad de vida de la población" rows={3} />
          <GuidedField label="¿Qué necesidad resuelve?" value={form.queNecesidadResuelve} onChange={(v) => uf("queNecesidadResuelve", v)} placeholder="Ej: Resuelve la brecha de competencias del personal de salud en zonas rurales" rows={3} />
          <GuidedField label="¿Cómo aporta al territorio?" value={form.comoAporta} onChange={(v) => uf("comoAporta", v)} placeholder="Ej: Mejora la capacity resolutiva del nivel primario y reduce remisiones innecesarias" rows={3} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  T — TEMPORAL                                                        */
/* ================================================================== */
function TStep({ form, uf }: { form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void }) {
  const m = SMART_META.T;
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <StepHeader letter="T" title="T — Temporal" desc="Defina el plazo para alcanzar su objetivo." />
      <Card className={`${m.bg} ${m.border}`}>
        <CardHeader className="pb-3"><CardTitle className={`text-sm font-bold ${m.text}`}><Calendar className="w-4 h-4 inline mr-1.5" />Preguntas guía</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <GuidedField label="¿En cuánto tiempo?" value={form.enCuantoTiempo} onChange={(v) => uf("enCuantoTiempo", v)} placeholder="Ej: 12 meses, 6 meses, 2 años" rows={2} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha-inicio" className="text-sm font-medium text-slate-700">Fecha de inicio</Label>
              <Input id="fecha-inicio" type="date" value={form.fechaInicio} onChange={(e) => uf("fechaInicio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha-final" className="text-sm font-medium text-slate-700">Fecha final</Label>
              <Input id="fecha-final" type="date" value={form.fechaFinal} onChange={(e) => uf("fechaFinal", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================== */
/*  RESULTADO STEP                                                      */
/* ================================================================== */
function ResultStep({ form, uf, genObj, score, fb, recs, onExport, exporting, onCopy, copied, onReset, today }: {
  form: FormData; uf: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  genObj: string; score: SmartScore; fb: string[]; recs: string[];
  onExport: () => void; exporting: boolean; onCopy: () => void; copied: boolean; onReset: () => void; today: string;
}) {
  const objetivo = form.objetivoSmart || genObj;
  const scoreColor = score.total >= 80 ? "text-emerald-600" : score.total >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = score.total >= 80 ? "bg-emerald-50 border-emerald-200" : score.total >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  const scoreLabel = score.total >= 90 ? "Excelente" : score.total >= 70 ? "Bueno" : score.total >= 50 ? "Requiere mejoras" : "Necesita reformulación";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Score card */}
      <Card className={`${scoreBg} border-2`}>
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm font-medium text-slate-500">Evaluación SMART</p>
          <div className={`text-5xl font-extrabold ${scoreColor}`}>{score.total}</div>
          <p className="text-sm text-slate-500">de 100 puntos</p>
          <Badge className={`${scoreColor} border-current/20 text-xs`}>{scoreLabel}</Badge>
        </CardContent>
      </Card>

      {/* Per-category bars */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Desglose por criterio</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {score.detalles.map((d) => {
            const m = SMART_META[d.letra];
            return (
              <div key={d.letra} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`${m.fill} text-white rounded-md w-6 h-6 flex items-center justify-center text-xs font-bold`}>{d.letra}</span>
                    <span className="font-medium text-slate-700">{d.categoria}</span>
                  </span>
                  <span className={`font-bold ${d.puntos >= 14 ? "text-emerald-600" : d.puntos >= 8 ? "text-amber-600" : "text-red-600"}`}>
                    {d.puntos}/{d.maxPuntos}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.puntos / d.maxPuntos) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${m.fill}`}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Generated / editable objective */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Objetivo SMART generado
          </CardTitle>
          <CardDescription>El objetivo se construyó automáticamente. Puede editarlo directamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={form.objetivoSmart || genObj}
            onChange={(e) => uf("objetivoSmart", e.target.value)}
            rows={4}
            className="text-base font-medium leading-relaxed resize-none border-emerald-200 focus-visible:ring-emerald-500/30"
            placeholder="Su objetivo SMART aparecerá aquí..."
          />
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{(form.objetivoSmart || genObj).split(/\s+/).filter(Boolean).length} palabras</span>
            <span>{(form.objetivoSmart || genObj).split(/\s+/).filter(Boolean).length <= 70 ? <span className="text-emerald-600">✓ Menos de 70 palabras</span> : <span className="text-red-600">✗ Supera las 70 palabras</span>}</span>
          </div>
          {!form.objetivoSmart && genObj && (
            <p className="text-xs text-slate-400">Este objetivo fue generado automáticamente. Edítelo para refinarlo.</p>
          )}
        </CardContent>
      </Card>

      {/* Validation details */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Validaciones detalladas</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-6">
            {score.detalles.map((d) => {
              const m = SMART_META[d.letra];
              return (
                <div key={d.letra}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`${m.fill} text-white rounded-md w-5 h-5 flex items-center justify-center text-[10px] font-bold`}>{d.letra}</span>
                    <span className="text-sm font-semibold text-slate-700">{d.categoria}</span>
                  </div>
                  <div className="ml-7 space-y-1">
                    {d.validaciones.map((v, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {v.pasado ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                        <span className={v.pasado ? "text-slate-500" : "text-red-600"}>{v.pasado ? v.criterio : v.mensaje}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      {fb.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Observaciones</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 ml-1">
              {fb.map((m, i) => <li key={i} className="text-sm text-amber-800 flex items-start gap-2"><span className="text-amber-500 font-bold mt-0.5">•</span>{m}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-emerald-600" />Recomendaciones</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 ml-1">
              {recs.map((r, i) => <li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="text-emerald-500 font-bold mt-0.5">•</span>{r}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Summary info */}
      <Card className="bg-slate-50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div><p className="text-slate-400 mb-0.5">Nombre</p><p className="font-medium text-slate-700 truncate">{form.nombre || "Anónimo"}</p></div>
            <div><p className="text-slate-400 mb-0.5">Fecha</p><p className="font-medium text-slate-700">{today}</p></div>
            <div><p className="text-slate-400 mb-0.5">Región</p><p className="font-medium text-slate-700 truncate">{form.region}</p></div>
            <div><p className="text-slate-400 mb-0.5">Municipio</p><p className="font-medium text-slate-700 truncate">{form.municipio}</p></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}