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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  parsePdtExcel,
  batchUploadPdtActivities,
  batchMergePdtActualDates,
  isPdtActivityTitled,
  type PdtActivity,
} from "@/lib/pdt-parser";
import { EQUIPMENT_CATALOG, filterByEquipment, type EquipmentKey } from "@/lib/pdt-dashboard-utils";
import { PdtDashboardModal } from "@/components/pdt/PdtDashboardModal";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, UploadCloud, Search, CalendarDays, Maximize, Minimize, GitCompareArrows, AlertTriangle, Filter, BarChart2 } from "lucide-react";

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

type DelayLevel = 'on-time' | 'mild' | 'moderate' | 'critical' | 'severe';
type DelayFilter = 'all' | DelayLevel;

interface DelayInfo {
  days:  number;
  level: DelayLevel;
  label: string;
  barClass:    string;
  fillClass:   string;
  textClass:   string;
  badgeClass:  string;
}

function getDelayInfo(activity: PdtRow, showActual: boolean): DelayInfo {
  const today = Date.now();
  const baseEnd = new Date(activity.endDate).getTime();

  let delayMs = 0;
  if (showActual && activity.actualEndDate) {
    delayMs = new Date(activity.actualEndDate).getTime() - baseEnd;
  } else if (baseEnd < today && activity.progress < 100) {
    delayMs = today - baseEnd;
  }

  const days = Math.max(0, Math.ceil(delayMs / (1000 * 60 * 60 * 24)));

  let level: DelayLevel;
  if (days === 0)       level = 'on-time';
  else if (days <= 7)   level = 'mild';
  else if (days <= 15)  level = 'moderate';
  else if (days <= 30)  level = 'critical';
  else                  level = 'severe';

  const MAP: Record<DelayLevel, Omit<DelayInfo, 'days' | 'level'>> = {
    'on-time':  { label: 'A tiempo',       barClass: 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]',  fillClass: 'bg-emerald-400/90',  textClass: 'text-emerald-400', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    'mild':     { label: 'Atraso leve',    barClass: 'bg-yellow-500/20 border-yellow-400/50 shadow-[0_0_8px_rgba(234,179,8,0.3)]',     fillClass: 'bg-yellow-400/90',   textClass: 'text-yellow-400',  badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    'moderate': { label: 'Atraso moderado',barClass: 'bg-orange-500/20 border-orange-400/50 shadow-[0_0_8px_rgba(249,115,22,0.35)]',   fillClass: 'bg-orange-400/90',   textClass: 'text-orange-400',  badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    'critical': { label: 'Atraso crítico', barClass: 'bg-red-500/20 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.5)]',          fillClass: 'bg-red-500/90',      textClass: 'text-red-400',     badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40' },
    'severe':   { label: 'Atraso severo',  barClass: 'bg-rose-900/40 border-rose-700/60 shadow-[0_0_12px_rgba(190,18,60,0.6)]',        fillClass: 'bg-rose-700/90',     textClass: 'text-rose-400',    badgeClass: 'bg-rose-900/30 text-rose-400 border-rose-700/40' },
  };

  return { days, level, ...MAP[level] };
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
  const [delayFilter, setDelayFilter] = useState<DelayFilter>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentKey>('ALL');
  const [showDashboard, setShowDashboard] = useState(false);

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

  // Estadísticas de atraso
  const delayStats = useMemo(() => {
    if (!rawActivities) return { 'on-time': 0, mild: 0, moderate: 0, critical: 0, severe: 0, total: 0 };
    const titled = rawActivities.filter(isPdtActivityTitled);
    const counts = { 'on-time': 0, mild: 0, moderate: 0, critical: 0, severe: 0, total: titled.length };
    titled.forEach(a => { counts[getDelayInfo(a as PdtRow, showActualComparison).level]++; });
    return counts;
  }, [rawActivities, showActualComparison]);

  // Filtro: sin título oculto + búsqueda + filtro atraso + filtro equipo + orden por fecha línea base
  const activities = useMemo(() => {
    if (!rawActivities) return [];
    let act = rawActivities.filter((a) => isPdtActivityTitled(a));
    act.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    if (equipmentFilter !== 'ALL') {
      act = filterByEquipment(act, equipmentFilter) as PdtRow[];
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      act = act.filter(
        (a) =>
          a.activityName.toLowerCase().includes(lower) || a.activityId.toLowerCase().includes(lower)
      );
    }
    if (delayFilter !== 'all') {
      act = act.filter(a => getDelayInfo(a as PdtRow, showActualComparison).level === delayFilter);
    }
    return act;
  }, [rawActivities, searchTerm, delayFilter, showActualComparison, equipmentFilter]);

  // Todas las actividades sin filtro de search/delay (para pasar al dashboard con contexto completo)
  const allTitledActivities = useMemo(() => {
    if (!rawActivities) return [];
    let act = rawActivities.filter((a) => isPdtActivityTitled(a));
    if (equipmentFilter !== 'ALL') act = filterByEquipment(act, equipmentFilter) as PdtRow[];
    return act;
  }, [rawActivities, equipmentFilter]);

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
            description: `${parsed.length} filas procesadas. Active "Comparar obra real" en el Gantt.`,
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
              {/* Leyenda semáforo + estadísticas */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {([
                  { level: 'on-time',  label: 'A tiempo',    color: 'bg-emerald-500/50 border-emerald-400/60', text: 'text-emerald-400', count: delayStats['on-time'] },
                  { level: 'mild',     label: '1–7d',         color: 'bg-yellow-500/50 border-yellow-400/60',  text: 'text-yellow-400',  count: delayStats.mild },
                  { level: 'moderate', label: '8–15d',        color: 'bg-orange-500/50 border-orange-400/60',  text: 'text-orange-400',  count: delayStats.moderate },
                  { level: 'critical', label: '16–30d',       color: 'bg-red-500/50 border-red-500/60',        text: 'text-red-400',     count: delayStats.critical },
                  { level: 'severe',   label: '+30d',         color: 'bg-rose-900/60 border-rose-700/60',      text: 'text-rose-400',    count: delayStats.severe },
                ] as const).map(({ level, label, color, text, count }) => (
                  <button
                    key={level}
                    onClick={() => setDelayFilter(f => f === level ? 'all' : level)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-mono-tech uppercase tracking-wider transition-all ${delayFilter === level ? 'ring-1 ring-white/30 brightness-125' : 'opacity-70 hover:opacity-100'} ${color} ${text}`}
                  >
                    <span className={`inline-block h-2 w-4 rounded-sm border ${color}`} />
                    {label}
                    <span className="font-bold">{count}</span>
                  </button>
                ))}
                {delayFilter !== 'all' && (
                  <button onClick={() => setDelayFilter('all')} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary underline">
                    Ver todo
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Dashboard button */}
              <Button
                onClick={() => setShowDashboard(true)}
                disabled={!rawActivities || rawActivities.length === 0}
                className="bg-primary/10 text-primary border border-primary/40 hover:bg-primary hover:text-[#0A0E14] font-display font-black text-[10px] uppercase tracking-widest"
              >
                <BarChart2 className="w-4 h-4 mr-2" /> DASHBOARD
              </Button>

              {/* Equipment filter */}
              <Select value={equipmentFilter} onValueChange={(v) => setEquipmentFilter(v as EquipmentKey)}>
                <SelectTrigger className="h-10 w-[160px] bg-primary/5 border-primary/10 text-[10px] font-mono-tech uppercase tracking-wide text-primary/80">
                  <SelectValue placeholder="Equipo..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0f141c] border-primary/20 text-[10px] font-mono-tech">
                  {EQUIPMENT_CATALOG.map(eq => (
                    <SelectItem key={eq.key} value={eq.key}
                      className="text-[10px] font-mono-tech uppercase tracking-wide cursor-pointer focus:bg-primary/10"
                      style={{ color: eq.color }}>
                      {eq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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
                        description: "Importe un Excel con 'PDT obra real' (mismos Activity ID). No borra la linea base.",
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
                  <div className="w-[380px] shrink-0 border-r border-primary/20 flex items-center px-4 gap-3 sticky left-0 bg-[#0A0E14]/90 backdrop-blur z-40 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)]">
                    <div className="w-20 font-display text-[10px] font-black text-primary uppercase tracking-widest">WBS ID</div>
                    <div className="flex-1 font-display text-[10px] font-black text-primary uppercase tracking-widest">Descripción Táctica</div>
                    <div className="w-8 font-display text-[10px] font-black text-primary text-right uppercase tracking-widest">AV%</div>
                    <div className="w-12 font-display text-[10px] font-black text-amber-400/70 text-right uppercase tracking-widest">Δ días</div>
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
                    const delay = getDelayInfo(activity, showActualComparison);
                    const barBaseClass = delay.barClass;
                    const barFillClass = delay.fillClass;

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
                        <div className="w-[380px] shrink-0 border-r border-primary/20 flex items-center px-4 gap-3 bg-[#0B1018] z-20 sticky left-0 shadow-[5px_0_15px_-5px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-[#121A26]">
                          <div className={`w-20 font-mono-tech text-[10px] truncate ${isCritical ? 'text-red-400 font-bold' : 'text-primary/70'}`} title={activity.activityId}>
                            {activity.activityId}
                          </div>
                          <div
                            className="flex-1 font-mono-tech text-[10px] text-white truncate group-hover:text-cyan-300 transition-colors"
                            title={`${activity.activityName} — Base: ${formatPdtDate(activity.startDate)} → ${formatPdtDate(activity.endDate)}${activity.actualStartDate && activity.actualEndDate ? ` | Obra real: ${formatPdtDate(activity.actualStartDate)} → ${formatPdtDate(activity.actualEndDate)}` : ""}`}
                          >
                            {activity.activityName}
                          </div>
                          <div className="w-8 font-mono-tech text-[9px] text-right font-bold text-amber-400">
                            {activity.progress}%
                          </div>
                          <div className={`w-12 text-right font-mono-tech text-[9px] font-bold ${delay.textClass}`}>
                            {delay.days > 0 ? (
                              <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded border text-[8px] ${delay.badgeClass}`}>
                                {delay.level === 'severe' && <AlertTriangle className="w-2 h-2" />}
                                +{delay.days}d
                              </span>
                            ) : (
                              <span className="text-emerald-500/50">—</span>
                            )}
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
                                    {delay.days > 0 && (
                                      <p className={`pt-2 text-[10px] font-bold border-t border-primary/10 mt-1 ${delay.textClass}`}>
                                        ⚠ {delay.label}: +{delay.days} días de atraso
                                      </p>
                                    )}
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
      {/* PDT Dashboard Modal */}
      <PdtDashboardModal
        open={showDashboard}
        onClose={() => setShowDashboard(false)}
        activities={allTitledActivities}
        showActual={showActualComparison}
      />
    </TooltipProvider>
  );
}
