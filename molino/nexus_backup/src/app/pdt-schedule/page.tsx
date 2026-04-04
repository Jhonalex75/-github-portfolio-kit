'use client';

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  parsePdtExcel,
  batchUploadPdtActivities,
  batchMergePdtActualDates,
  isPdtActivityTitled,
  type PdtActivity,
} from "@/lib/pdt-parser";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, UploadCloud, Search, CalendarDays, Maximize, Minimize, GitCompareArrows } from "lucide-react";

const ROOT_UIDS = ["R3MVwE12nVMg128Kv6bdwJ6MKav1", "Ew4plK83Z9O6c8J1dM3F0tP04A83"]; // Demo root IDs

type PdtRow = PdtActivity & { id: string };

function formatPdtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return iso;
  }
}

export default function PdtSchedulePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputActualRef = useRef<HTMLInputElement>(null);

  const [isMounted, setIsMounted] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isParsingActual, setIsParsingActual] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncActualProgress, setSyncActualProgress] = useState(0);
  const [zoomWidth, setZoomWidth] = useState(25); // Pixels per day
  const [searchTerm, setSearchTerm] = useState("");
  const [showActualComparison, setShowActualComparison] = useState(false);

  const activeProjectId = "default-nexus-project";

  const isRoot = user && (ROOT_UIDS.includes(user.uid) || user.uid.startsWith("Ew4pl"));

  useEffect(() => {
    setIsMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const pdtQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "projects", activeProjectId, "pdt_activities");
  }, [firestore, user]);

  const { data: rawActivities, isLoading: isActivitiesLoading } = useCollection<PdtRow>(pdtQuery);

  const activitiesWithActualCount = useMemo(() => {
    if (!rawActivities) return 0;
    return rawActivities.filter(
      (a) =>
        isPdtActivityTitled(a) &&
        typeof (a as PdtRow).actualStartDate === "string" &&
        typeof (a as PdtRow).actualEndDate === "string"
    ).length;
  }, [rawActivities]);

  // Filtro: sin título oculto + búsqueda + orden por fecha línea base
  const activities = useMemo(() => {
    if (!rawActivities) return [];
    let act = rawActivities.filter((a) => isPdtActivityTitled(a));
    act.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      act = act.filter(
        (a) =>
          a.activityName.toLowerCase().includes(lower) || a.activityId.toLowerCase().includes(lower)
      );
    }
    return act;
  }, [rawActivities, searchTerm]);

  // Eje temporal: línea base; si compara, incluye fechas reales de obra
  const { minDateMs, maxDateMs, totalDays } = useMemo(() => {
    if (!activities || activities.length === 0)
      return { minDateMs: Date.now(), maxDateMs: Date.now() + 86400000, totalDays: 1 };

    let minMs = Infinity;
    let maxMs = -Infinity;

    const consider = (startIso: string, endIso: string) => {
      const start = new Date(startIso).getTime();
      const end = new Date(endIso).getTime();
      if (!Number.isNaN(start) && start < minMs) minMs = start;
      if (!Number.isNaN(end) && end > maxMs) maxMs = end;
    };

    activities.forEach((a) => {
      consider(a.startDate, a.endDate);
      if (
        showActualComparison &&
        a.actualStartDate &&
        a.actualEndDate
      ) {
        consider(a.actualStartDate, a.actualEndDate);
      }
    });

    const diff = maxMs - minMs;
    const days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24))) + 14;

    return { minDateMs: minMs, maxDateMs: maxMs, totalDays: days };
  }, [activities, showActualComparison]);

  // Virtual Scroller para Alto Rendimiento (Y-Axis)
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: activities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !isRoot) return;

    setIsParsing(true);
    setSyncProgress(0);

    toast({
      title: "EXTRACCIÓN NUCLEAR P6 INICIADA",
      description: "Leyendo buffer binario del cronograma..."
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Parser Background Simulado con Timeout para no colgar thread de react instantaneamente
      setTimeout(async () => {
        try {
          const parsed = await parsePdtExcel(arrayBuffer, activeProjectId);
          toast({
            title: "MAPEO EXITOSO",
            description: `Se detectaron ${parsed.length} Nodos Tácticos. Iniciando inyección en Batch...`
          });

          await batchUploadPdtActivities(firestore, activeProjectId, parsed, (prog) => {
            setSyncProgress(prog);
          });

          toast({
            title: "CRONOGRAMA CONSOLIDADO",
            description: "El Proyecto Táctico fue propagado al clúster de forma atómica."
          });
        } catch (err) {
          console.error(err);
          toast({ variant: "destructive", title: "CORRUPCIÓN ESTRUCTURAL", description: "El archivo no es importable o el formato difiere del Core." });
        } finally {
          setIsParsing(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      }, 100);
      
    } catch (err) {
      toast({ variant: "destructive", title: "ERROR DE BUFFER", description: "No se pudo extraer el binario de Excel." });
      setIsParsing(false);
    }
  };

  const handleActualFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firestore || !isRoot) return;

    setIsParsingActual(true);
    setSyncActualProgress(0);

    toast({
      title: "IMPORTANDO PDT OBRA REAL",
      description: "Las fechas se fusionan por Activity ID sin borrar la línea base aprobada.",
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      setTimeout(async () => {
        try {
          const parsed = await parsePdtExcel(arrayBuffer, activeProjectId);
          await batchMergePdtActualDates(firestore, activeProjectId, parsed, (prog) => {
            setSyncActualProgress(prog);
          });
          toast({
            title: "PDT OBRA REAL ACTUALIZADO",
            description: `${parsed.length} filas procesadas. Active “Comparar obra real” en el Gantt.`,
          });
          setShowActualComparison(true);
        } catch (err) {
          console.error(err);
          toast({
            variant: "destructive",
            title: "ERROR DE IMPORTACIÓN",
            description: "No se pudo fusionar el PDT real. Revise el formato Excel.",
          });
        } finally {
          setIsParsingActual(false);
          if (fileInputActualRef.current) fileInputActualRef.current.value = "";
        }
      }, 100);
    } catch {
      toast({ variant: "destructive", title: "ERROR DE BUFFER", description: "No se pudo leer el archivo." });
      setIsParsingActual(false);
    }
  };

  const hiddenUntitledCount = useMemo(() => {
    if (!rawActivities) return 0;
    return rawActivities.filter((a) => !isPdtActivityTitled(a)).length;
  }, [rawActivities]);

  if (!isMounted || isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
    <div className="flex flex-col min-h-screen bg-[#0A0E14]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden max-h-[calc(100vh-64px)] relative">
          
          {/* Header Controls */}
          <header className="p-6 pb-4 border-b border-primary/10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-[#0A0E14] z-20 shadow-xl shrink-0">
            <div>
              <h1 className="text-4xl font-headline font-bold text-primary glow-cyan mb-2 uppercase tracking-tighter flex items-center gap-3">
                <CalendarDays className="w-8 h-8" />
                PDT SCHEDULE
              </h1>
              <p className="text-muted-foreground font-mono-tech text-[10px] uppercase tracking-[0.3em]">
                {activities.length} NODOS VISIBLES · {hiddenUntitledCount} SIN TÍTULO OCULTOS · {totalDays} DÍAS EJE
              </p>
              <p className="text-muted-foreground/80 font-mono-tech text-[9px] uppercase tracking-widest mt-1">
                Línea base aprobada (Aris) · {activitiesWithActualCount} actividades con PDT obra real importado
              </p>
              <div className="flex items-center gap-4 mt-2 text-[9px] font-mono-tech uppercase tracking-tighter text-primary/70">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-6 rounded-sm bg-cyan-500/50 border border-cyan-400/60" />
                  Línea base
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-6 rounded-sm bg-amber-500/70 border border-amber-400/80" />
                  Obra real
                </span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded border border-primary/15 bg-primary/5 px-3 py-1.5">
                <GitCompareArrows className="h-4 w-4 text-amber-400 shrink-0" />
                <Label htmlFor="pdt-compare" className="text-[10px] font-mono-tech uppercase tracking-wide text-primary/90 cursor-pointer whitespace-nowrap">
                  Comparar obra real
                </Label>
                <Switch
                  id="pdt-compare"
                  checked={showActualComparison}
                  onCheckedChange={(v) => {
                    setShowActualComparison(v);
                    if (v && activitiesWithActualCount === 0) {
                      toast({
                        title: "Sin fechas de obra real",
                        description: "Importe un Excel con “PDT obra real” (mismos Activity ID). No borra la línea base.",
                      });
                    }
                  }}
                />
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  placeholder="FILTRAR NODOS P6..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-primary/5 border-primary/10 pl-10 h-10 w-[200px] text-xs font-mono-tech transition-all focus:w-[250px]"
                />
              </div>

              <div className="flex items-center gap-1 bg-primary/5 rounded border border-primary/10 p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20" onClick={() => setZoomWidth(prev => Math.max(5, prev - 5))}>
                  <Minimize className="w-4 h-4" />
                </Button>
                <div className="w-12 text-center text-[10px] font-mono-tech text-cyan-400">Z {zoomWidth}x</div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/20" onClick={() => setZoomWidth(prev => Math.min(100, prev + 5))}>
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>

              {isRoot && (
                <>
                  <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} className="hidden" aria-label="Importar línea base P6 Excel" onChange={handleFileUpload} />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isParsing}
                    className="bg-amber-500/10 text-amber-500 border border-amber-500/50 hover:bg-amber-500 hover:text-[#0A0E14] font-display font-black text-[10px] uppercase tracking-widest relative overflow-hidden"
                  >
                    {isParsing ? (
                      <>
                        <div className="absolute left-0 top-0 h-full bg-amber-500/20 transition-all duration-200" style={{ width: `${syncProgress}%` }} />
                        <Loader2 className="w-4 h-4 mr-2 animate-spin relative z-10" /> 
                        <span className="relative z-10">{syncProgress}% INYECTANDO</span>
                      </>
                    ) : (
                      <><UploadCloud className="w-4 h-4 mr-2" /> OVERRIDE MAESTRO P6</>
                    )}
                  </Button>
                  <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputActualRef} className="hidden" aria-label="Importar PDT obra real Excel" onChange={handleActualFileUpload} />
                  <Button
                    onClick={() => fileInputActualRef.current?.click()}
                    disabled={isParsingActual}
                    className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-[#0A0E14] font-display font-black text-[10px] uppercase tracking-widest relative overflow-hidden"
                  >
                    {isParsingActual ? (
                      <>
                        <div className="absolute left-0 top-0 h-full bg-emerald-500/20 transition-all duration-200" style={{ width: `${syncActualProgress}%` }} />
                        <Loader2 className="w-4 h-4 mr-2 animate-spin relative z-10" />
                        <span className="relative z-10">{syncActualProgress}% FUSIÓN</span>
                      </>
                    ) : (
                      <><GitCompareArrows className="w-4 h-4 mr-2" /> PDT OBRA REAL</>
                    )}
                  </Button>
                </>
              )}
            </div>
          </header>

          {/* Master Timeline & Virtual Grid */}
          <div className="flex-1 overflow-hidden relative border-t border-primary/20">
            {isActivitiesLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin opacity-50" />
              </div>
            ) : activities.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center font-mono-tech text-muted-foreground uppercase tracking-widest text-xs">
                {searchTerm ? "NINGUNA ACTIVIDAD COINCIDE CON LA BÚSQUEDA" : "CRONOGRAMA VACÍO. REQUIERE INYECCIÓN ROOT."}
              </div>
            ) : (
              // The Scrollable Area
              <div 
                ref={parentRef}
                className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent custom-scrollbar"
                style={{
                  // Fondo de Grilla por CSS Linear Gradient = ZERO DOM NODES FOR THE BACKDROP!
                  backgroundImage: `linear-gradient(90deg, transparent calc(${zoomWidth}px - 1px), rgba(0, 229, 255, 0.05) ${zoomWidth}px)`,
                  backgroundSize: `${zoomWidth}px 100%`,
                  backgroundPosition: `350px 0`, // Offset por el panel izquierdo (350px)
                  backgroundAttachment: 'local'
                }}
              >
                {/* Cabecera del Timeline Dinámico (Días Relativos) */}
                <div 
                  className="sticky top-0 z-30 flex h-8 bg-[#0A0E14]/90 backdrop-blur border-b border-primary/20"
                  style={{ width: `${350 + (totalDays * zoomWidth)}px` }}
                >
                  <div className="w-[350px] shrink-0 border-r border-primary/20 flex items-center px-4 gap-4 sticky left-0 bg-[#0A0E14]/90 backdrop-blur z-40 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)]">
                    <div className="w-20 font-display text-[10px] font-black text-primary uppercase tracking-widest">WBS ID</div>
                    <div className="flex-1 font-display text-[10px] font-black text-primary uppercase tracking-widest">Descripción Táctica</div>
                    <div className="w-10 font-display text-[10px] font-black text-primary text-right uppercase tracking-widest">AV%</div>
                  </div>
                  {/* Timeline Days Ticks */}
                  <div className="flex-1 relative h-full">
                    {/* Renderizamos marcadores de tiempo con menor granularidad para ahorro DOM si es muy grande,
                        Pintaremos etiquetas cada X días dependiendo del Zoom */}
                    {Array.from({ length: totalDays }).map((_, i) => {
                      // Skip rendering text for every single day to save DOM nodes if zoom is small
                      if (zoomWidth < 15 && i % 7 !== 0) return null;
                      if (Math.abs(minDateMs) === Infinity) return null;
                      
                      const date = new Date(minDateMs + (i * 1000 * 60 * 60 * 24));
                      const isMonday = date.getDay() === 1;

                      return (
                        <div 
                          key={i} 
                          className={`absolute bottom-1 origin-bottom-left text-[8px] font-mono-tech whitespace-nowrap px-1 ${isMonday ? 'text-primary font-bold' : 'text-primary/40'}`}
                          style={{ left: `${i * zoomWidth}px`, width: `${zoomWidth}px` }}
                        >
                          {date.getDate()}/{date.getMonth() + 1}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Virtual Rows Mount Point */}
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: `${350 + (totalDays * zoomWidth)}px`,
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const activity = activities[virtualRow.index];
                    
                    const startMs = new Date(activity.startDate).getTime();
                    const endMs = new Date(activity.endDate).getTime();
                    
                    const offsetDays = Math.max(0, (startMs - minDateMs) / (1000 * 60 * 60 * 24));
                    let durationDays = Math.max(1, (endMs - startMs) / (1000 * 60 * 60 * 24));
                    if (activity.duration > durationDays) durationDays = activity.duration;

                    const leftPx = offsetDays * zoomWidth;
                    const widthPx = Math.max(5, durationDays * zoomWidth);

                    const isCritical = activity.totalFloat <= 0;
                    const progressPx = widthPx * (activity.progress / 100);

                    // Color de la Barra según Ruta Crítica
                    const barBaseClass = isCritical 
                      ? 'bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.5)] border-red-500/50' 
                      : 'bg-cyan-500/20 shadow-[0_0_10px_rgba(0,229,255,0.2)] border-cyan-500/50';
                    const barFillClass = isCritical 
                      ? 'bg-red-500/90' 
                      : 'bg-emerald-400/90';

                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute top-0 left-0 w-full flex border-b border-primary/5 hover:bg-white/5 transition-colors group"
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {/* Data Panel Lado Izquierdo (Fijo) */}
                        <div className="w-[350px] shrink-0 border-r border-primary/20 flex items-center px-4 gap-4 bg-[#0B1018] z-20 sticky left-0 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-[#121A26]">
                          <div className={`w-20 font-mono-tech text-[10px] truncate ${isCritical ? 'text-red-400 font-bold' : 'text-primary/70'}`} title={activity.activityId}>
                            {activity.activityId}
                          </div>
                          <div
                            className="flex-1 font-mono-tech text-[10px] text-white truncate group-hover:text-cyan-300 transition-colors"
                            title={`${activity.activityName} — Base: ${formatPdtDate(activity.startDate)} → ${formatPdtDate(activity.endDate)}${activity.actualStartDate && activity.actualEndDate ? ` | Obra real: ${formatPdtDate(activity.actualStartDate)} → ${formatPdtDate(activity.actualEndDate)}` : ""}`}
                          >
                            {activity.activityName}
                          </div>
                          <div className="w-10 font-mono-tech text-[9px] text-right font-bold text-amber-400">
                            {activity.progress}%
                          </div>
                        </div>

                        {/* Gantt Area Lado Derecho */}
                        <div className="flex-1 relative flex flex-col justify-center gap-1 py-1">
                          {(() => {
                            const hasActual =
                              showActualComparison &&
                              Boolean(activity.actualStartDate && activity.actualEndDate);
                            let actualLeftPx = 0;
                            let actualWidthPx = 0;
                            let actualDurationDays = 0;
                            if (hasActual && activity.actualStartDate && activity.actualEndDate) {
                              const aStart = new Date(activity.actualStartDate).getTime();
                              const aEnd = new Date(activity.actualEndDate).getTime();
                              const aOff = Math.max(0, (aStart - minDateMs) / (1000 * 60 * 60 * 24));
                              actualDurationDays = Math.max(1, (aEnd - aStart) / (1000 * 60 * 60 * 24));
                              actualLeftPx = aOff * zoomWidth;
                              actualWidthPx = Math.max(4, actualDurationDays * zoomWidth);
                            }

                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative min-h-[36px] w-full cursor-crosshair">
                                    <div
                                      className={`absolute top-0 h-[18px] rounded-sm border backdrop-blur transition-transform hover:scale-y-105 ${barBaseClass}`}
                                      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                    >
                                      <div
                                        className={`absolute top-0 left-0 h-full ${barFillClass} transition-all`}
                                        style={{ width: `${progressPx}px` }}
                                      />
                                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                                        <span className="text-[7px] font-mono-tech font-black text-white mix-blend-difference">
                                          {Math.round(durationDays)}d
                                        </span>
                                      </div>
                                    </div>
                                    {hasActual ? (
                                      <div
                                        className="absolute left-0 top-[22px] h-[10px] rounded-sm border border-amber-400/60 bg-amber-500/35 shadow-[0_0_8px_rgba(245,158,11,0.35)] transition-transform hover:scale-y-110"
                                        style={{ left: `${actualLeftPx}px`, width: `${actualWidthPx}px`, right: "auto" }}
                                        title="Obra real"
                                      />
                                    ) : null}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  sideOffset={8}
                                  className="max-w-sm border-primary/30 bg-[#0f141c] text-white text-[11px] font-mono-tech shadow-xl"
                                >
                                  <p className="mb-2 border-b border-primary/20 pb-1 font-display text-xs font-bold uppercase tracking-wide text-cyan-300">
                                    {activity.activityName}
                                  </p>
                                  <div className="space-y-1 text-primary/90">
                                    <p className="text-[10px] font-bold text-cyan-400/90">Línea base (aprobada)</p>
                                    <p>Inicio: {formatPdtDate(activity.startDate)}</p>
                                    <p>Fin: {formatPdtDate(activity.endDate)}</p>
                                    <p className="text-primary/50">Duración: {Math.round(durationDays)} d</p>
                                    {hasActual && activity.actualStartDate && activity.actualEndDate ? (
                                      <>
                                        <p className="pt-2 text-[10px] font-bold text-amber-400">Obra real (seguimiento)</p>
                                        <p>Inicio: {formatPdtDate(activity.actualStartDate)}</p>
                                        <p>Fin: {formatPdtDate(activity.actualEndDate)}</p>
                                        <p className="text-amber-200/60">Duración: {Math.round(actualDurationDays)} d</p>
                                      </>
                                    ) : null}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
