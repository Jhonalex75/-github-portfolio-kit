'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { TopNav }  from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Button }  from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  FileSpreadsheet, Calendar, Users, Shield, Clock,
  TrendingUp, AlertTriangle, CheckCircle2, Loader2,
  BarChart3, HardHat, Wrench, ChevronRight,
} from 'lucide-react';
import { generateWeeklyReportExcel, WeeklyReportInput, WeeklyDayRow } from '@/lib/weekly-report-excel';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACTIVE_PROJECT = 'default-nexus-project';

// ─── Tipos Firestore (compactos para este módulo) ─────────────────────────────
interface ReportDoc {
  id: string;
  metadata: {
    consecutiveId: string;
    date:          string;
    weather:       string;
    authorName:    string;
    frente:        string;
    proyectoRef?:  string;
    status?:       string;
  };
  contractor_sections?: Record<string, {
    activities:     string;
    personnel:      { mecanicos: number; soldadores: number; auxiliares: number; armadores: number; inspectoresHSE: number };
    checklist:      { workAtHeights: boolean; hotWork: boolean; confinedSpace: boolean; scaffolding: boolean };
    safetyInfo:     { comments: string; incidents: number; nearMisses: number; eppObservations: string; lessonsLearned: string };
    equipment:      { grua: number; generador: number; andamios: number; camionGrua: number; torreGrua: number; equipoEspecial: string };
    lostHours:      { malClima: number; parosHSE: number; fallasTecnicas: number };
    weldingMetrics?: Array<{ estructura: string; metrajeMl: number; soldadores: number }>;
  }>;
  admin_activities?: Array<{ name: string; progress: number }>;
  // legacy
  contractors?: Array<{
    name: string; personnel: number;
    breakdown?: { mecanicos?: number; soldadores?: number; auxiliares?: number; armadores?: number };
    equipment?: { grua?: number; generador?: number; andamios?: number; camionGrua?: number; torreGrua?: number; equipoEspecial?: string };
    lostHours?: { malClima?: number; parosHSE?: number; fallasTecnicas?: number };
  }>;
  safety_info?: { comments: string; incidents: number; nearMisses: number; eppObservations: string; lessonsLearned: string };
}

// ─── Agrupación Miércoles → Martes ────────────────────────────────────────────
interface WeekGroup {
  key:       string;   // "2026-04-09"
  label:     string;   // "Semana 15 — Mié 09 Abr al Mar 15 Abr 2026"
  dateFrom:  Date;
  dateTo:    Date;
  reports:   ReportDoc[];
  hasHLG:    boolean;  // tiene al menos un informe con HL-GISAICO
}

const DAY_NAMES_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTH_NAMES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d: Date): string {
  return `${DAY_NAMES_ES[d.getDay()]} ${String(d.getDate()).padStart(2,'0')} ${MONTH_NAMES_ES[d.getMonth()]}`;
}

function getWeekWedToTue(d: Date): Date {
  // Returns the Wednesday at or before the given date
  const day = d.getDay(); // 0=Sun, 3=Wed
  const diff = (day >= 3) ? day - 3 : day + 4; // days since last Wednesday
  const wed = new Date(d);
  wed.setDate(d.getDate() - diff);
  wed.setHours(0, 0, 0, 0);
  return wed;
}

function groupIntoWeeks(reports: ReportDoc[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>();

  reports.forEach((r) => {
    if (!r.metadata?.date) return;
    const d = new Date(r.metadata.date);
    if (Number.isNaN(d.getTime())) return;

    const wed = getWeekWedToTue(d);
    const key = wed.toISOString().slice(0, 10);

    if (!map.has(key)) {
      const dateTo = new Date(wed);
      dateTo.setDate(wed.getDate() + 6); // Martes
      dateTo.setHours(23, 59, 59, 999);

      // Número de semana ISO aproximado
      const weekNum = Math.ceil((wed.getDate() + new Date(wed.getFullYear(), 0, 1).getDay()) / 7);

      map.set(key, {
        key,
        label: `Semana ${weekNum} — ${fmtDate(wed)} al ${fmtDate(dateTo)} ${dateTo.getFullYear()}`,
        dateFrom: wed,
        dateTo,
        reports: [],
        hasHLG:  false,
      });
    }

    const group = map.get(key)!;
    group.reports.push(r);

    // Detectar si tiene HL-GISAICO
    if (
      r.contractor_sections?.['HL-GISAICO'] ||
      r.contractors?.some((c) => c.name === 'HL-GISAICO')
    ) {
      group.hasHLG = true;
    }
  });

  return Array.from(map.values())
    .sort((a, b) => b.dateFrom.getTime() - a.dateFrom.getTime()); // más reciente primero
}

// ─── Construir WeeklyReportInput desde un grupo ───────────────────────────────
function buildWeeklyInput(group: WeekGroup): WeeklyReportInput {
  const days: WeeklyDayRow[] = group.reports
    .filter((r) => {
      const hasNew = !!r.contractor_sections?.['HL-GISAICO'];
      const hasLeg = r.contractors?.some((c) => c.name === 'HL-GISAICO');
      return hasNew || hasLeg;
    })
    .sort((a, b) => new Date(a.metadata.date).getTime() - new Date(b.metadata.date).getTime())
    .map((r) => {
      const d = new Date(r.metadata.date);
      const dateLabel = `${fmtDate(d)} ${d.getFullYear()}`;
      const dayName   = DAY_NAMES_ES[d.getDay()];

      // ── Extraer datos HL-GISAICO (nuevo formato preferido) ──
      const sec = r.contractor_sections?.['HL-GISAICO'];
      const leg = r.contractors?.find((c) => c.name === 'HL-GISAICO');

      const personnel = sec?.personnel ?? {
        mecanicos:      leg?.breakdown?.mecanicos      ?? 0,
        soldadores:     leg?.breakdown?.soldadores     ?? 0,
        auxiliares:     leg?.breakdown?.auxiliares     ?? 0,
        armadores:      leg?.breakdown?.armadores      ?? 0,
        inspectoresHSE: 0,
      };
      const total = (personnel.mecanicos || 0) + (personnel.soldadores || 0) +
                    (personnel.auxiliares || 0) + (personnel.armadores || 0) +
                    (personnel.inspectoresHSE || 0);
      // fallback al total del legacy si todo es 0
      const finalTotal = total > 0 ? total : (leg?.personnel ?? 0);

      const equipment = sec?.equipment ?? {
        grua:          leg?.equipment?.grua          ?? 0,
        generador:     leg?.equipment?.generador     ?? 0,
        andamios:      leg?.equipment?.andamios      ?? 0,
        camionGrua:    leg?.equipment?.camionGrua    ?? 0,
        torreGrua:     leg?.equipment?.torreGrua     ?? 0,
        equipoEspecial: leg?.equipment?.equipoEspecial ?? '',
      };

      const lh = sec?.lostHours ?? {
        malClima:      leg?.lostHours?.malClima      ?? 0,
        parosHSE:      leg?.lostHours?.parosHSE      ?? 0,
        fallasTecnicas: leg?.lostHours?.fallasTecnicas ?? 0,
      };
      const lostTotal = (lh.malClima || 0) + (lh.parosHSE || 0) + (lh.fallasTecnicas || 0);

      const checklist = sec?.checklist ?? {
        workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false,
      };

      const safetyInfo = sec?.safetyInfo ?? r.safety_info ?? {
        comments: '', incidents: 0, nearMisses: 0, eppObservations: '', lessonsLearned: '',
      };

      return {
        date:         r.metadata.date,
        dateLabel,
        dayName,
        consecutiveId: r.metadata.consecutiveId,
        weather:      r.metadata.weather,
        authorName:   r.metadata.authorName,
        frente:       r.metadata.frente,
        personnel:    { ...personnel, total: finalTotal },
        equipment,
        lostHours:    { ...lh, total: lostTotal },
        checklist,
        safetyInfo,
        activities:   sec?.activities ?? '',
        weldingMetrics: sec?.weldingMetrics ?? [],
        adminActivities: r.admin_activities ?? [],
      } satisfies WeeklyDayRow;
    });

  const weekNum = Math.ceil(
    (group.dateFrom.getDate() + new Date(group.dateFrom.getFullYear(), 0, 1).getDay()) / 7
  );

  return {
    weekLabel:   group.label,
    weekNumber:  weekNum,
    dateFrom:    group.dateFrom.toISOString().slice(0, 10),
    dateTo:      group.dateTo.toISOString().slice(0, 10),
    proyectoRef: group.reports[0]?.metadata?.proyectoRef ?? 'MIL24.001 — Lower Mining Marmato',
    days,
  };
}

// ─── Mini stat card ───────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, colorClass }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; colorClass: string;
}) {
  return (
    <div className={`rounded-lg border p-4 flex flex-col gap-1 ${colorClass}`}>
      <div className="flex items-center gap-2 text-xs font-display uppercase tracking-widest opacity-70">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className="text-3xl font-display font-black tracking-tight">{value}</div>
      {sub && <div className="text-[10px] opacity-60 font-mono-tech">{sub}</div>}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function WeeklyReportPage() {
  const [selectedKey,  setSelectedKey]  = useState<string>('');
  const [generating,   setGenerating]   = useState(false);
  const { toast } = useToast();

  const firestore = useFirestore();
  const reportsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, `projects/${ACTIVE_PROJECT}/daily_reports`),
      orderBy('metadata.date', 'desc'),
    );
  }, [firestore]);

  const { data: allDocs, isLoading: loading } = useCollection(reportsRef);
  const allReports = (allDocs ?? []) as unknown as ReportDoc[];

  // Agrupar semanas
  const weeks = useMemo(() => groupIntoWeeks(allReports), [allReports]);
  const weeksWithHLG = useMemo(() => weeks.filter(w => w.hasHLG), [weeks]);

  // Input de la semana seleccionada
  const weekInput = useMemo<WeeklyReportInput | null>(() => {
    if (!selectedKey) return null;
    const group = weeksWithHLG.find(w => w.key === selectedKey);
    if (!group) return null;
    return buildWeeklyInput(group);
  }, [selectedKey, weeksWithHLG]);

  // KPIs preview
  const preview = useMemo(() => {
    if (!weekInput || weekInput.days.length === 0) return null;
    const days = weekInput.days;
    const totalPersonal  = days.map(d => d.personnel.total);
    const totalIncidents = days.reduce((s, d) => s + d.safetyInfo.incidents,  0);
    const totalHorasP    = days.reduce((s, d) => s + d.lostHours.total,       0);
    const totalPermisos  = days.reduce((s, d) => {
      let c = 0;
      if (d.checklist.workAtHeights) c++;
      if (d.checklist.hotWork)       c++;
      if (d.checklist.confinedSpace) c++;
      if (d.checklist.scaffolding)   c++;
      return s + c;
    }, 0);
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a,b) => a+b, 0) / arr.length) : 0;
    return {
      dias:      days.length,
      avgPersonal: avg(totalPersonal),
      maxPersonal: Math.max(0, ...totalPersonal),
      incidents: totalIncidents,
      horasP:    totalHorasP.toFixed(1),
      permisos:  totalPermisos,
      folios:    days.map(d => d.consecutiveId).join(', '),
    };
  }, [weekInput]);

  const handleGenerate = async () => {
    if (!weekInput) return;
    if (weekInput.days.length === 0) {
      toast({ title: 'Sin datos', description: 'La semana seleccionada no tiene informes HL-GISAICO con datos.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      await generateWeeklyReportExcel(weekInput);
      toast({
        title: '✅ Excel generado',
        description: `${weekInput.weekLabel} — ${weekInput.days.length} informes procesados. Revise su carpeta de descargas.`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al generar Excel', description: String(err), variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Encabezado ── */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-display font-black tracking-tight text-primary">
                Informe Semanal
                <span className="ml-3 text-cyan-400">HL-GISAICO</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono-tech mt-1 tracking-widest uppercase">
                Dashboard Excel · Período Miércoles → Martes · Todos los informes diarios
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono-tech text-muted-foreground border border-primary/10 rounded-md px-3 py-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              6 hojas · Dashboard · Personal · Equipos · HSE · Actividades · Raw Data
            </div>
          </div>

          {/* ── Selector de semana ── */}
          <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h2 className="font-display font-bold text-sm tracking-widest uppercase text-primary">
                Seleccionar semana
              </h2>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {!loading && weeksWithHLG.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                No se encontraron informes con datos de HL-GISAICO en Firebase.
              </div>
            )}

            {weeksWithHLG.length > 0 && (
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {weeksWithHLG.map((w) => {
                  const isSelected = w.key === selectedKey;
                  const count = w.reports.filter(r =>
                    r.contractor_sections?.['HL-GISAICO'] ||
                    r.contractors?.some(c => c.name === 'HL-GISAICO')
                  ).length;
                  return (
                    <button
                      key={w.key}
                      onClick={() => setSelectedKey(w.key)}
                      className={`
                        w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left
                        transition-all duration-200 group
                        ${isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400'
                          : 'bg-primary/5 border-primary/10 text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-300/70'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-muted-foreground/40'}`} />
                        <div>
                          <div className={`text-[11px] font-display font-bold uppercase tracking-wide ${isSelected ? 'text-cyan-300' : ''}`}>
                            {w.label}
                          </div>
                          <div className="text-[10px] font-mono-tech opacity-60 mt-0.5">
                            {count} informe{count !== 1 ? 's' : ''} · HL-GISAICO
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90 text-cyan-400' : 'opacity-30'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Preview KPIs ── */}
          {preview && weekInput && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h2 className="font-display font-bold text-sm tracking-widest uppercase text-primary">
                  Preview — {weekInput.weekLabel}
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  icon={Calendar} label="Días" value={preview.dias}
                  sub="Con informes HL-GISAICO"
                  colorClass="bg-blue-950/40 border-blue-700/30 text-blue-200"
                />
                <StatCard
                  icon={Users} label="Prom. Personal" value={preview.avgPersonal}
                  sub={`Pico: ${preview.maxPersonal} pers.`}
                  colorClass="bg-cyan-950/40 border-cyan-700/30 text-cyan-200"
                />
                <StatCard
                  icon={HardHat} label="Pico Personal" value={preview.maxPersonal}
                  sub="Máximo en un día"
                  colorClass="bg-teal-950/40 border-teal-700/30 text-teal-200"
                />
                <StatCard
                  icon={preview.incidents > 0 ? AlertTriangle : CheckCircle2}
                  label="Incidentes" value={preview.incidents}
                  sub={preview.incidents > 0 ? '⚠️ Revisar' : '✅ Sin novedad'}
                  colorClass={preview.incidents > 0
                    ? 'bg-red-950/40 border-red-700/30 text-red-200'
                    : 'bg-green-950/40 border-green-700/30 text-green-200'}
                />
                <StatCard
                  icon={Clock} label="H. Perdidas" value={preview.horasP}
                  sub="Clima + HSE + Técnicas"
                  colorClass="bg-amber-950/40 border-amber-700/30 text-amber-200"
                />
                <StatCard
                  icon={Shield} label="Permisos HSE" value={preview.permisos}
                  sub="Activaciones semana"
                  colorClass="bg-orange-950/40 border-orange-700/30 text-orange-200"
                />
              </div>

              {/* Folios */}
              <div className="flex items-center gap-2 text-[10px] font-mono-tech text-muted-foreground border border-primary/10 rounded-md px-3 py-2">
                <Wrench className="w-3 h-3" />
                <span className="text-primary/40">Folios incluidos:</span>
                <span>{preview.folios || '—'}</span>
              </div>
            </div>
          )}

          {/* ── Botón generar ── */}
          {weekInput && (
            <div className="flex items-center gap-4 pt-2">
              <Button
                onClick={handleGenerate}
                disabled={generating || !weekInput || weekInput.days.length === 0}
                size="lg"
                className="bg-cyan-600 hover:bg-cyan-500 text-black font-display font-black uppercase tracking-widest px-8 gap-3"
              >
                {generating
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Generando Excel…</>
                  : <><FileSpreadsheet className="w-5 h-5" /> Generar Informe Excel</>
                }
              </Button>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="font-display font-bold text-primary/60 uppercase tracking-wider">El archivo incluirá:</div>
                <div className="font-mono-tech opacity-60">
                  📊 Dashboard · 👷 Personal · 🏗️ Equipos · 🛡️ HSE · ⚡ Actividades · 📋 Datos Diarios
                </div>
              </div>
            </div>
          )}

          {/* ── Estado vacío ── */}
          {!selectedKey && !loading && weeksWithHLG.length > 0 && (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Calendar className="w-12 h-12 mx-auto opacity-20" />
              <p className="text-sm font-display tracking-widest uppercase opacity-40">
                Selecciona una semana para ver el preview y generar el Excel
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
