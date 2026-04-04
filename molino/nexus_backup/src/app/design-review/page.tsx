
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  FileText, 
  Sparkles, 
  Info,
  X,
  Zap
} from "lucide-react";
import { dfmAnalysis, type DFMAnalysisOutput } from "@/ai/flows/design-review-dfm-analysis";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function DesignReviewPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DFMAnalysisOutput | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ variant: "destructive", title: "LÍMITE EXCEDIDO", description: "El archivo supera los 10MB permitidos para análisis AI." });
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
      setResult(null);
    }
  };

  const runAnalysis = async () => {
    if (!preview) return;
    setLoading(true);
    setResult(null);

    try {
      const analysis = await dfmAnalysis({
        drawingDataUri: preview,
        standardsOrChecklist: "Metso IOM C.4817 Standards, ASME Y14.5 GD&T, High-Precision Mill Mounting Requirements."
      });
      setResult(analysis);
      toast({ title: "ANÁLISIS COMPLETADO", description: "La IA ha finalizado la inspección del modelo." });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "ERROR DE NÚCLEO", description: "No se pudo procesar el análisis AI en este momento." });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
          <header className="border-b border-primary/10 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase">AI Design Inspector</h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">Inspección Multimodal DFM & Cumplimiento Normativo Metso</p>
            </div>
            <Badge variant="outline" className="border-primary/20 text-primary py-1 px-4 font-mono-tech uppercase">
              <Zap className="w-3 h-3 mr-2 text-amber-500 animate-pulse" /> AI Engine v1.5 Flash
            </Badge>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="corner-card bg-primary/[0.02] border-primary/20 overflow-hidden relative">
                {!preview ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[400px] border-2 border-dashed border-primary/10 m-6 flex flex-col items-center justify-center gap-4 hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-primary/40" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-display text-[10px] uppercase tracking-widest text-primary">Cargar Plano o Modelo (PDF/IMG)</p>
                      <p className="text-[8px] font-mono-tech text-muted-foreground uppercase">Máximo 10MB • Resolución sugerida 2K</p>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                      <Button variant="destructive" size="icon" className="h-8 w-8 rounded-none" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-6">
                      {file?.type === "application/pdf" ? (
                        <div className="h-[400px] bg-black/40 flex flex-col items-center justify-center gap-4 border border-primary/10">
                          <FileText className="w-16 h-16 text-primary/40" />
                          <span className="font-mono-tech text-xs uppercase text-primary">{file.name}</span>
                        </div>
                      ) : (
                        <div className="relative h-[400px] border border-primary/10 bg-black/40">
                          <Image src={preview} alt="Preview" fill className="object-contain" unoptimized />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {preview && !result && (
                  <div className="p-6 pt-0">
                    <Button 
                      onClick={runAnalysis} 
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 rounded-none font-display text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                      Iniciar Inspección Técnica por IA
                    </Button>
                  </div>
                )}
              </Card>

              {loading && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-display text-primary uppercase tracking-widest">Escaneando geometrías...</span>
                    <span className="text-[10px] font-mono-tech text-primary/60">PROC_LEVEL: 84%</span>
                  </div>
                  <Progress value={84} className="h-1 bg-primary/10" />
                </div>
              )}

              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <Card className="corner-card bg-primary/[0.01] border-primary/20">
                    <CardHeader className="border-b border-primary/10">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-display font-black text-primary uppercase tracking-widest">Resumen de Diagnóstico DFM</CardTitle>
                        <Badge variant={result.hasIssues ? "destructive" : "default"} className="rounded-none uppercase text-[9px]">
                          {result.hasIssues ? "NCR_POTENCIAL_DETECTADA" : "COMPLIANCE_OPTIMO"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <p className="text-sm text-foreground/80 leading-relaxed font-body italic border-l-2 border-primary/20 pl-6">
                        &quot;{result.summary}&quot;
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-4">
                    {result.issues.map((issue, idx) => (
                      <Card key={idx} className={cn(
                        "corner-card transition-all hover:translate-x-1",
                        issue.severity === 'Critical' ? "border-red-500/40 bg-red-500/[0.02]" : "border-primary/10 bg-primary/[0.01]"
                      )}>
                        <CardContent className="p-4 flex gap-6 items-start">
                          <div className={cn(
                            "w-10 h-10 shrink-0 rounded-sm border flex items-center justify-center",
                            issue.severity === 'Critical' ? "border-red-500/40 text-red-500" : "border-primary/20 text-primary"
                          )}>
                            {issue.severity === 'Critical' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex justify-between">
                              <span className="text-[10px] font-display font-bold uppercase tracking-widest text-primary/80">{issue.category}</span>
                              <Badge variant="outline" className={cn(
                                "text-[8px] uppercase font-mono-tech",
                                issue.severity === 'Critical' ? "text-red-500 border-red-500/20" : "text-amber-500 border-amber-500/20"
                              )}>
                                {issue.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground/90 font-medium">{issue.description}</p>
                            <div className="p-3 bg-black/40 border-l-2 border-amber-500/40 text-[10px] font-mono-tech uppercase text-amber-200/70">
                              <span className="text-amber-500 font-bold mr-2">ACCIÓN SUGERIDA:</span>
                              {issue.suggestion}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <div className="p-6 bg-primary/5 border border-primary/10 corner-card">
                <div className="flex items-center gap-3 text-primary mb-6">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-display font-bold uppercase tracking-widest">Protocolo de Revisión</span>
                </div>
                <div className="space-y-6">
                  {[
                    { t: "GD&T ASME Y14.5", d: "Validación de tolerancias geométricas y dimensionales en mallas y planos." },
                    { t: "Secuencia Metso", d: "Verificación de accesibilidad para herramientas de torqueo hidráulico." },
                    { t: "Analítica Predictiva", d: "Detección de puntos de concentración de esfuerzos por geometría." }
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <h4 className="text-[10px] font-display font-bold text-primary/80 uppercase">{item.t}</h4>
                      <p className="text-[9px] text-muted-foreground uppercase font-mono-tech leading-relaxed">{item.d}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="corner-card bg-amber-500/5 border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-[10px] font-display font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3" /> Monitor ROOT Authority
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-[9px] font-mono-tech text-amber-200/60 uppercase leading-relaxed">
                    Usted posee bypass total sobre los reportes de IA. Puede desestimar hallazgos o elevarlos a NCR formal en la bitácora técnica.
                  </p>
                  <Button variant="outline" className="w-full border-amber-500/20 text-amber-500 hover:bg-amber-500/10 text-[9px] font-display uppercase tracking-widest rounded-none h-9">
                    Configurar Reglas AI
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
