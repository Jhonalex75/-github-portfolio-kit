
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Weight,
  CheckCircle2,
  Circle,
  Boxes,
  ArrowDown,
  ShieldCheck,
  AlertTriangle,
  Info,
  Construction,
} from "lucide-react";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import { INSTALLATION_STAGES_1624, PHASES_METADATA, PROJECT_INFO } from "@/lib/mill-data";

export default function InstallationGuidePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [currentStage, setCurrentStage] = useState(0);
  const [stageChecked, setStageChecked] = useState<boolean[]>(
    new Array(INSTALLATION_STAGES_1624.length).fill(false)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  if (!mounted || isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const stage = INSTALLATION_STAGES_1624[currentStage];
  const completedCount = stageChecked.filter(Boolean).length;
  const progressPct = Math.round((completedCount / stageChecked.length) * 100);

  const handleToggleStage = (idx: number) => {
    const updated = [...stageChecked];
    updated[idx] = !updated[idx];
    setStageChecked(updated);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
          <header className="border-b border-primary/10 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase italic">
                Guía de Instalación
              </h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">
                Molino de Bolas 16&apos; x 24.5&apos; (1624) • Secuencia de Izaje NCP International
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className={cn(
                  "border-primary/30 text-primary py-1 px-4 font-mono-tech uppercase text-[10px]",
                  progressPct === 100 && "border-emerald-500/50 text-emerald-500"
                )}
              >
                {progressPct === 100 ? (
                  <><ShieldCheck className="w-3 h-3 mr-2" /> Completado</>
                ) : (
                  <>{completedCount}/{stageChecked.length} Etapas</>
                )}
              </Badge>
            </div>
          </header>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-mono-tech text-primary/60 uppercase tracking-widest">Progreso de Montaje</span>
              <span className="text-sm font-display font-black text-primary">{progressPct}%</span>
            </div>
            <div className="h-2 bg-primary/10 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-700 shadow-[0_0_15px_rgba(0,229,255,0.5)]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Safety Warning */}
          <Card className="bg-amber-500/5 border-amber-500/20 corner-card">
            <CardContent className="p-4 flex gap-4 items-start">
              <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-display font-bold text-amber-500 uppercase tracking-widest">Notas Clave de Izaje — NCP International</h4>
                <ul className="text-[9px] font-mono-tech text-amber-200/60 uppercase leading-relaxed space-y-1">
                  <li>1. Todo el equipo y hardware debe ser provisto por la empresa de Rigging.</li>
                  <li>2. Asegurar correcto ensamblaje alineando todas las marcas de 0°.</li>
                  <li>3. Proteger el equipo apropiadamente durante el izaje.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main: Current Stage Detail */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="corner-card bg-primary/[0.02] border-primary/30 overflow-visible relative">
                <div className="absolute -top-3 left-6 bg-primary text-black px-4 py-1 font-display text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Construction className="w-3 h-3" /> Stage {stage.stage} de {INSTALLATION_STAGES_1624.length}
                </div>
                <CardContent className="pt-12 pb-8 px-8 space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-display font-black text-white uppercase tracking-wider leading-tight">
                      {stage.action}
                    </h2>
                    <div className="flex gap-3 bg-primary/5 p-4 border-l-2 border-primary">
                      <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] font-mono-tech text-white/70 uppercase leading-relaxed">
                        {stage.actionEs}
                      </p>
                    </div>
                    <div className="flex gap-6">
                      <div className="bg-white/5 p-4 border border-white/5 flex-1">
                        <span className="text-[7px] text-muted-foreground uppercase block mb-2">Peso de Izaje</span>
                        <div className="flex items-center gap-2">
                          <Weight className="w-5 h-5 text-amber-500" />
                          <span className="text-xl font-display font-black text-amber-400">{stage.weight}</span>
                        </div>
                      </div>
                      <div className="bg-white/5 p-4 border border-white/5 flex-1">
                        <span className="text-[7px] text-muted-foreground uppercase block mb-2">Dirección</span>
                        <div className="flex items-center gap-2">
                          <ArrowDown className="w-5 h-5 text-primary" />
                          <span className="text-sm font-display font-bold text-primary uppercase">Descenso Controlado</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checklist for this stage */}
                  <div className="pt-4 border-t border-primary/10">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={stageChecked[currentStage]}
                        onCheckedChange={() => handleToggleStage(currentStage)}
                        className="w-6 h-6"
                      />
                      <Label className="text-xs font-display font-bold text-white uppercase tracking-widest cursor-pointer" onClick={() => handleToggleStage(currentStage)}>
                        {stageChecked[currentStage] ? "✓ ETAPA VERIFICADA POR SUPERVISOR" : "MARCAR ETAPA COMO COMPLETADA"}
                      </Label>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button
                      onClick={() => setCurrentStage(Math.max(0, currentStage - 1))}
                      disabled={currentStage === 0}
                      variant="outline"
                      className="border-primary/20 text-primary rounded-none font-display text-[9px] uppercase tracking-widest h-11 px-6"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" /> Anterior
                    </Button>
                    <Button
                      onClick={() => setCurrentStage(Math.min(INSTALLATION_STAGES_1624.length - 1, currentStage + 1))}
                      disabled={currentStage === INSTALLATION_STAGES_1624.length - 1}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-none font-display text-[9px] uppercase tracking-widest h-11 px-6 shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    >
                      Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: All Stages Overview */}
            <aside className="space-y-6">
              <Card className="corner-card bg-primary/[0.02] border-primary/20">
                <CardHeader className="border-b border-primary/10">
                  <CardTitle className="text-[10px] font-display font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <Boxes className="w-3 h-3" /> Secuencia Completa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="space-y-1">
                    {INSTALLATION_STAGES_1624.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentStage(idx)}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 text-left transition-all",
                          idx === currentStage
                            ? "bg-primary/20 border-l-2 border-primary"
                            : stageChecked[idx]
                              ? "bg-emerald-500/5 border-l-2 border-emerald-500/40 opacity-70"
                              : "hover:bg-white/5 border-l-2 border-transparent opacity-50 hover:opacity-80"
                        )}
                      >
                        {stageChecked[idx] ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : idx === currentStage ? (
                          <div className="w-4 h-4 border-2 border-primary rounded-full shrink-0 animate-pulse" />
                        ) : (
                          <Circle className="w-4 h-4 text-white/20 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[8px] font-display font-bold text-white/70 uppercase block truncate">
                            Stage {s.stage}
                          </span>
                          <span className="text-[7px] font-mono-tech text-white/40 uppercase block truncate">
                            {s.weight}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
