'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle2,
  Clock, Target, Activity, BarChart2, Layers, Cpu, Printer, X,
} from 'lucide-react';
import type { PdtActivity } from '@/lib/pdt-parser';
import {
  EQUIPMENT_CATALOG, DISCIPLINE_CONFIG, DELAY_LEVEL_META,
  calcDelayStats, calcDisciplineKPIs, calcEVM, calcSCurveData,
  calcTopDelays, calcHeatmap, filterByEquipment, filterByDiscipline,
  inferDiscipline, inferEquipment, calcDelayDays, getDelayLevel,
  type EquipmentKey, type DisciplineType, type DelayLevel,
} from '@/lib/pdt-dashboard-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(iso));
  } catch { return iso; }
}

function SpiGauge({ spi }: { spi: number }) {
  const color = spi >= 0.95 ? '#10B981' : spi >= 0.85 ? '#EAB308' : '#EF4444';
  const pct = Math.min(100, spi * 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#1e2a3a" strokeWidth="8" />
          <circle cx="40" cy="40" r="30" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(pct / 100) * 188.5} 188.5`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black font-mono-tech" style={{ color }}>{spi.toFixed(2)}</span>
        </div>
      </div>
      <span className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-wider">SPI</span>
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded border p-3 flex flex-col gap-1" style={{ borderColor: color + '30', backgroundColor: color + '08' }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono-tech uppercase tracking-widest text-muted-foreground">{label}</span>
        <span style={{ color }} className="opacity-70">{icon}</span>
      </div>
      <span className="text-xl font-black font-mono-tech" style={{ color }}>{value}</span>
      {sub && <span className="text-[9px] text-muted-foreground font-mono-tech">{sub}</span>}
    </div>
  );
}

function DelayBadge({ level, days }: { level: DelayLevel; days: number }) {
  const m = DELAY_LEVEL_META[level];
  if (days === 0) return <span className="text-emerald-400 text-[9px] font-mono-tech">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono-tech font-bold border"
      style={{ color: m.color, backgroundColor: m.bg, borderColor: m.border }}>
      {level === 'severe' && <AlertTriangle className="w-2 h-2" />}
      +{days}d
    </span>
  );
}

// ─── Equipment Filter Row ─────────────────────────────────────────────────────

function EquipmentFilter({ value, onChange }: { value: EquipmentKey; onChange: (k: EquipmentKey) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-primary/10 bg-[#080c12]">
      <span className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest shrink-0 mr-1">Equipo:</span>
      {EQUIPMENT_CATALOG.map(eq => (
        <button key={eq.key} onClick={() => onChange(eq.key)}
          className="px-2 py-0.5 rounded border text-[9px] font-mono-tech uppercase tracking-wide transition-all"
          style={{
            borderColor: value === eq.key ? eq.color : eq.color + '30',
            backgroundColor: value === eq.key ? eq.color + '20' : 'transparent',
            color: value === eq.key ? eq.color : eq.color + '80',
            fontWeight: value === eq.key ? 900 : 400,
          }}>
          {eq.label}
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Resumen Ejecutivo ───────────────────────────────────────────────────

function ResumenTab({ activities, showActual }: { activities: PdtActivity[]; showActual: boolean }) {
  const delayStats = useMemo(() => calcDelayStats(activities, showActual), [activities, showActual]);
  const evm = useMemo(() => calcEVM(activities), [activities]);
  const topDelays = useMemo(() => calcTopDelays(activities, showActual, 5), [activities, showActual]);
  const disciplineKPIs = useMemo(() => calcDisciplineKPIs(activities, showActual).filter(d => d.total > 0), [activities, showActual]);

  const pieData = [
    { name: 'A tiempo', value: delayStats.onTime, color: '#10B981' },
    { name: 'Leve',     value: delayStats.mild,   color: '#EAB308' },
    { name: 'Moderado', value: delayStats.moderate,color: '#F97316' },
    { name: 'Crítico',  value: delayStats.critical,color: '#EF4444' },
    { name: 'Severo',   value: delayStats.severe,  color: '#BE123C' },
  ].filter(d => d.value > 0);

  const healthColor = evm.healthScore >= 85 ? '#10B981' : evm.healthScore >= 70 ? '#EAB308' : '#EF4444';

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Avance Real" value={`${evm.pctComplete.toFixed(1)}%`}
            sub={`Planeado: ${evm.pctScheduleUsed.toFixed(1)}%`} color="#00E5FF"
            icon={<Activity className="w-4 h-4" />} />
          <KpiCard label="SPI" value={evm.spi.toFixed(3)}
            sub={evm.spi >= 1 ? 'Adelantado' : `Atraso ${Math.abs(evm.sv).toFixed(1)}%`}
            color={evm.spi >= 0.95 ? '#10B981' : evm.spi >= 0.85 ? '#EAB308' : '#EF4444'}
            icon={<Target className="w-4 h-4" />} />
          <KpiCard label="Actividades" value={String(delayStats.total)}
            sub={`${delayStats.delayed} con atraso (${100 - delayStats.pctOnTime}%)`}
            color="#8B5CF6" icon={<Layers className="w-4 h-4" />} />
          <KpiCard label="Ruta Crítica" value={String(evm.criticalCount)}
            sub={`Δ max: +${delayStats.maxDelayDays}d`}
            color="#EF4444" icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pie chart */}
          <div className="rounded border border-primary/10 bg-primary/3 p-3">
            <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Distribución de Atrasos</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[9px] font-mono-tech text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="text-[9px] font-mono-tech font-bold" style={{ color: d.color }}>
                      {d.value} ({Math.round((d.value / delayStats.total) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Health + EVM snapshot */}
          <div className="rounded border border-primary/10 bg-primary/3 p-3 space-y-3">
            <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">Estado EVM Global</p>
            <div className="flex items-center gap-4">
              <SpiGauge spi={evm.spi} />
              <div className="space-y-1.5 flex-1">
                {[
                  { label: 'PV (Valor Plan.)',   value: `${evm.pv} u.t.` },
                  { label: 'EV (Valor Ganado)',  value: `${evm.ev} u.t.` },
                  { label: 'EAC (Est. Complet.)',value: `${evm.eac} u.t.` },
                  { label: 'VAC (Variación)',    value: `${evm.vac > 0 ? '+' : ''}${evm.vac} u.t.` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-[9px] text-muted-foreground font-mono-tech">{r.label}</span>
                    <span className="text-[9px] font-bold text-primary font-mono-tech">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-mono-tech text-muted-foreground">Salud del Proyecto</span>
                <span className="text-[9px] font-bold font-mono-tech" style={{ color: healthColor }}>{evm.healthScore}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${evm.healthScore}%`, backgroundColor: healthColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* Semaphore by discipline */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Semáforo por Disciplina</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono-tech">
              <thead>
                <tr className="text-muted-foreground/60 border-b border-primary/10">
                  {['Disciplina', 'Actividades', 'Plan %', 'Real %', 'SPI', 'Atraso Prom.', 'Ruta Crít.', 'Estado'].map(h => (
                    <th key={h} className="text-left py-1 pr-3 font-normal uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disciplineKPIs.map(d => {
                  const statusColor = d.spi >= 0.95 ? '#10B981' : d.spi >= 0.85 ? '#EAB308' : '#EF4444';
                  const statusLabel = d.spi >= 0.95 ? 'OK' : d.spi >= 0.85 ? 'ALERTA' : 'CRÍTICO';
                  return (
                    <tr key={d.discipline} className="border-b border-primary/5 hover:bg-white/2 transition-colors">
                      <td className="py-1.5 pr-3"><span className="font-bold" style={{ color: d.color }}>{d.label}</span></td>
                      <td className="py-1.5 pr-3 text-primary/70">{d.total}</td>
                      <td className="py-1.5 pr-3 text-primary/70">{d.plannedProgress.toFixed(1)}%</td>
                      <td className="py-1.5 pr-3" style={{ color: d.color }}>{d.avgProgress.toFixed(1)}%</td>
                      <td className="py-1.5 pr-3 font-bold" style={{ color: statusColor }}>{d.spi.toFixed(2)}</td>
                      <td className="py-1.5 pr-3 text-primary/70">{d.delayStats.avgDelayDays}d</td>
                      <td className="py-1.5 pr-3 text-red-400">{d.criticalCount}</td>
                      <td className="py-1.5 pr-3">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black border" style={{ color: statusColor, borderColor: statusColor + '50', backgroundColor: statusColor + '15' }}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 critical */}
        {topDelays.length > 0 && (
          <div className="rounded border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-[10px] font-mono-tech text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Top 5 Actividades Más Retrasadas
            </p>
            <div className="space-y-1.5">
              {topDelays.map((a, i) => {
                const m = DELAY_LEVEL_META[a.level];
                return (
                  <div key={a.id} className="flex items-center gap-2 text-[9px] font-mono-tech">
                    <span className="text-primary/30 w-3">{i + 1}.</span>
                    <span className="text-primary/50 shrink-0 w-20 truncate" title={a.activityId}>{a.activityId}</span>
                    <span className="text-white/80 flex-1 truncate" title={a.activityName}>{a.activityName}</span>
                    {a.isCritical && <span className="text-red-400 text-[8px] border border-red-400/40 rounded px-1">RC</span>}
                    <DelayBadge level={a.level} days={a.delayDays} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ─── Tab: Disciplinas ─────────────────────────────────────────────────────────

function DisciplinasTab({ activities, showActual }: { activities: PdtActivity[]; showActual: boolean }) {
  const [selected, setSelected] = useState<DisciplineType | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const kpis = useMemo(() => calcDisciplineKPIs(activities, showActual).filter(d => d.total > 0), [activities, showActual]);

  const barData = kpis.map(d => ({
    name: d.label.split('/')[0].trim(),
    'A tiempo': d.delayStats.onTime,
    'Leve': d.delayStats.mild,
    'Moderado': d.delayStats.moderate,
    'Crítico': d.delayStats.critical,
    'Severo': d.delayStats.severe,
    fill: d.color,
  }));

  const selectedKpi = kpis.find(d => d.discipline === selected);
  const selectedActs = useMemo(() => {
    if (!selected) return [];
    return filterByDiscipline(activities, selected)
      .map(a => ({ ...a, delayDays: calcDelayDays(a, showActual), level: getDelayLevel(calcDelayDays(a, showActual)) }))
      .sort((a, b) => b.delayDays - a.delayDays);
  }, [activities, selected, showActual]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map(d => (
            <button key={d.discipline} onClick={() => setSelected(s => s === d.discipline ? null : d.discipline)}
              className="rounded border text-left p-3 transition-all hover:brightness-110"
              style={{
                borderColor: selected === d.discipline ? d.color : d.color + '25',
                backgroundColor: selected === d.discipline ? d.color + '18' : d.bgColor,
                outline: selected === d.discipline ? `1px solid ${d.color}50` : 'none',
              }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] font-mono-tech uppercase tracking-widest" style={{ color: d.color }}>{d.label}</span>
                <span className="text-[9px] font-mono-tech font-bold" style={{ color: d.spi >= 0.95 ? '#10B981' : d.spi >= 0.85 ? '#EAB308' : '#EF4444' }}>SPI {d.spi.toFixed(2)}</span>
              </div>
              <div className="text-2xl font-black font-mono-tech" style={{ color: d.color }}>{d.avgProgress.toFixed(1)}%</div>
              <div className="text-[8px] text-muted-foreground font-mono-tech mt-0.5">Plan: {d.plannedProgress.toFixed(1)}% · {d.total} act.</div>
              <Progress value={d.avgProgress} className="h-1 mt-2" style={{ '--progress-bg': d.color } as React.CSSProperties} />
              <div className="flex gap-1 mt-2 flex-wrap">
                {d.delayStats.mild > 0 && <span className="text-[7px] px-1 rounded" style={{ color: '#EAB308', backgroundColor: '#EAB30815' }}>{d.delayStats.mild}L</span>}
                {d.delayStats.moderate > 0 && <span className="text-[7px] px-1 rounded" style={{ color: '#F97316', backgroundColor: '#F9731615' }}>{d.delayStats.moderate}M</span>}
                {d.delayStats.critical > 0 && <span className="text-[7px] px-1 rounded" style={{ color: '#EF4444', backgroundColor: '#EF444415' }}>{d.delayStats.critical}C</span>}
                {d.delayStats.severe > 0 && <span className="text-[7px] px-1 rounded" style={{ color: '#BE123C', backgroundColor: '#BE123C15' }}>{d.delayStats.severe}S</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Stacked bar */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Distribución de Atrasos por Disciplina</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af', fontFamily: 'monospace' }} width={80} />
              <RechartTooltip contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #1e2a3a', fontSize: 10, fontFamily: 'monospace' }} />
              <Bar dataKey="A tiempo" stackId="a" fill="#10B981" radius={[0,0,0,0]} />
              <Bar dataKey="Leve" stackId="a" fill="#EAB308" />
              <Bar dataKey="Moderado" stackId="a" fill="#F97316" />
              <Bar dataKey="Crítico" stackId="a" fill="#EF4444" />
              <Bar dataKey="Severo" stackId="a" fill="#BE123C" radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Drill-down table */}
        {selectedKpi && selectedActs.length > 0 && (
          <div className="rounded border p-3 space-y-2" style={{ borderColor: selectedKpi.color + '30', backgroundColor: selectedKpi.color + '05' }}>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-mono-tech uppercase tracking-widest" style={{ color: selectedKpi.color }}>
                Detalle — {selectedKpi.label} ({selectedActs.length} actividades)
              </p>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">← Ant</button>
                <span className="text-[9px] font-mono-tech text-primary/50">{page + 1}/{Math.ceil(selectedActs.length / PAGE_SIZE)}</span>
                <button disabled={(page + 1) * PAGE_SIZE >= selectedActs.length} onClick={() => setPage(p => p + 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">Sig →</button>
              </div>
            </div>
            <table className="w-full text-[9px] font-mono-tech">
              <thead>
                <tr className="text-muted-foreground/60 border-b border-primary/10">
                  {['ID', 'Nombre', 'Fin Base', 'Avance', 'Atraso', 'R.C.'].map(h => (
                    <th key={h} className="text-left py-1 pr-2 font-normal uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedActs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(a => (
                  <tr key={a.id} className="border-b border-primary/5 hover:bg-white/2">
                    <td className="py-1 pr-2 text-primary/50 truncate max-w-[80px]">{a.activityId}</td>
                    <td className="py-1 pr-2 text-white/80 truncate max-w-[200px]" title={a.activityName}>{a.activityName}</td>
                    <td className="py-1 pr-2 text-primary/60">{fmtDate(a.endDate)}</td>
                    <td className="py-1 pr-2 text-amber-400 font-bold">{a.progress}%</td>
                    <td className="py-1 pr-2"><DelayBadge level={a.level as DelayLevel} days={a.delayDays} /></td>
                    <td className="py-1">{a.totalFloat <= 0 && <span className="text-red-400 text-[8px]">RC</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ─── Tab: Equipos ─────────────────────────────────────────────────────────────

function EquiposTab({ activities, showActual, selectedEquipment }: { activities: PdtActivity[]; showActual: boolean; selectedEquipment: EquipmentKey }) {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const equipmentStats = useMemo(() => EQUIPMENT_CATALOG.filter(e => e.key !== 'ALL').map(eq => {
    const acts = filterByEquipment(activities, eq.key);
    if (acts.length === 0) return null;
    const ds = calcDelayStats(acts, showActual);
    const avgProg = acts.reduce((s, a) => s + a.progress, 0) / acts.length;
    const critCount = acts.filter(a => a.totalFloat <= 0).length;
    return { ...eq, total: acts.length, ds, avgProg: Math.round(avgProg * 10) / 10, critCount };
  }).filter(Boolean) as Array<{ key: EquipmentKey; label: string; color: string; bgColor: string; total: number; ds: ReturnType<typeof calcDelayStats>; avgProg: number; critCount: number }>, [activities, showActual]);

  const focusActs = useMemo(() => {
    const base = selectedEquipment !== 'ALL' ? filterByEquipment(activities, selectedEquipment) : activities;
    return base
      .map(a => ({ ...a, delayDays: calcDelayDays(a, showActual), level: getDelayLevel(calcDelayDays(a, showActual)), discipline: inferDiscipline(a.activityId, a.activityName) }))
      .sort((a, b) => b.delayDays - a.delayDays);
  }, [activities, selectedEquipment, showActual]);

  const barData = equipmentStats.map(e => ({
    name: e.label,
    'A tiempo': e.ds.onTime,
    'Con atraso': e.ds.delayed,
    fill: e.color,
  }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Equipment cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {equipmentStats.map(eq => (
            <div key={eq.key} className="rounded border p-2.5 space-y-1.5"
              style={{ borderColor: eq.color + '25', backgroundColor: selectedEquipment === eq.key ? eq.color + '18' : eq.bgColor }}>
              <p className="text-[8px] font-mono-tech uppercase tracking-widest" style={{ color: eq.color }}>{eq.label}</p>
              <p className="text-xl font-black font-mono-tech" style={{ color: eq.color }}>{eq.avgProg}%</p>
              <div className="flex justify-between text-[8px] font-mono-tech text-muted-foreground">
                <span>{eq.total} act.</span>
                <span className="text-red-400">{eq.ds.delayed} atr.</span>
              </div>
              <Progress value={eq.avgProg} className="h-1" />
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Actividades A Tiempo vs. Con Atraso por Equipo</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} layout="vertical" barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#9ca3af', fontFamily: 'monospace' }} width={90} />
              <RechartTooltip contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #1e2a3a', fontSize: 10 }} />
              <Bar dataKey="A tiempo" fill="#10B981" stackId="a" />
              <Bar dataKey="Con atraso" fill="#EF4444" stackId="a" radius={[0,2,2,0]} />
              <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity table */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
              Actividades — {selectedEquipment === 'ALL' ? 'Todos los equipos' : EQUIPMENT_CATALOG.find(e => e.key === selectedEquipment)?.label} ({focusActs.length})
            </p>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">← Ant</button>
              <span className="text-[9px] font-mono-tech text-primary/50">{page + 1}/{Math.max(1, Math.ceil(focusActs.length / PAGE_SIZE))}</span>
              <button disabled={(page + 1) * PAGE_SIZE >= focusActs.length} onClick={() => setPage(p => p + 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">Sig →</button>
            </div>
          </div>
          <table className="w-full text-[9px] font-mono-tech">
            <thead>
              <tr className="text-muted-foreground/60 border-b border-primary/10">
                {['ID', 'Actividad', 'Disciplina', 'Fin Base', 'Avance', 'Atraso'].map(h => (
                  <th key={h} className="text-left py-1 pr-2 font-normal uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {focusActs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(a => {
                const dc = DISCIPLINE_CONFIG.find(d => d.key === a.discipline);
                return (
                  <tr key={a.id} className="border-b border-primary/5 hover:bg-white/2">
                    <td className="py-1 pr-2 text-primary/50 truncate max-w-[70px]">{a.activityId}</td>
                    <td className="py-1 pr-2 text-white/80 truncate max-w-[180px]" title={a.activityName}>{a.activityName}</td>
                    <td className="py-1 pr-2">
                      <span className="text-[8px] px-1 rounded" style={{ color: dc?.color, backgroundColor: dc?.bgColor }}>{dc?.label.split('/')[0]}</span>
                    </td>
                    <td className="py-1 pr-2 text-primary/60">{fmtDate(a.endDate)}</td>
                    <td className="py-1 pr-2 text-amber-400 font-bold">{a.progress}%</td>
                    <td className="py-1"><DelayBadge level={a.level as DelayLevel} days={a.delayDays} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Tab: Análisis de Atrasos ─────────────────────────────────────────────────

function AtrasosTab({ activities, showActual }: { activities: PdtActivity[]; showActual: boolean }) {
  const top = useMemo(() => calcTopDelays(activities, showActual, 15), [activities, showActual]);
  const heatmap = useMemo(() => calcHeatmap(activities, showActual, 8), [activities, showActual]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const allDelayed = useMemo(() =>
    activities
      .map(a => ({ ...a, delayDays: calcDelayDays(a, showActual), level: getDelayLevel(calcDelayDays(a, showActual)) }))
      .filter(a => a.delayDays > 0)
      .sort((a, b) => b.delayDays - a.delayDays),
  [activities, showActual]);

  const disciplines = [...new Set(heatmap.map(c => c.discipline))];
  const weeks = [...new Set(heatmap.map(c => c.weekLabel))];

  const barData = top.map(a => ({ name: a.activityId.slice(0, 12), days: a.delayDays, fill: DELAY_LEVEL_META[a.level].color }));

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Top 15 bar */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Top 15 Actividades con Mayor Atraso</p>
          {top.length === 0
            ? <p className="text-[10px] font-mono-tech text-emerald-400 text-center py-4">✓ Sin actividades retrasadas</p>
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false} />
                  <XAxis type="number" unit="d" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fill: '#9ca3af', fontFamily: 'monospace' }} width={90} />
                  <RechartTooltip contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #1e2a3a', fontSize: 10 }}
                    formatter={(v: number) => [`${v} días`, 'Atraso']} />
                  <Bar dataKey="days" radius={[0, 3, 3, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Heatmap */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Mapa de Calor — Severidad por Disciplina × Semana</p>
          <div className="overflow-x-auto">
            <table className="text-[8px] font-mono-tech w-full">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-3 text-muted-foreground/60 font-normal w-28">Disciplina</th>
                  {weeks.map(w => <th key={w} className="py-1 px-1.5 text-muted-foreground/60 font-normal text-center min-w-[52px]">{w}</th>)}
                </tr>
              </thead>
              <tbody>
                {disciplines.map(disc => {
                  const dc = DISCIPLINE_CONFIG.find(d => d.key === disc);
                  return (
                    <tr key={disc} className="border-t border-primary/5">
                      <td className="py-1.5 pr-3 font-bold" style={{ color: dc?.color }}>{dc?.label.split('/')[0]}</td>
                      {weeks.map(w => {
                        const cell = heatmap.find(c => c.discipline === disc && c.weekLabel === w);
                        if (!cell || cell.count === 0) return <td key={w} className="py-1.5 px-1.5 text-center text-muted-foreground/20">–</td>;
                        const m = DELAY_LEVEL_META[cell.level];
                        return (
                          <td key={w} className="py-1.5 px-1.5 text-center">
                            <span className="inline-block w-full py-1 rounded text-center font-bold" title={`${cell.avgDelay}d prom.`}
                              style={{ backgroundColor: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                              {cell.avgDelay}d
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[8px] text-muted-foreground/50 font-mono-tech mt-2">Atraso promedio de actividades cuyo fin de línea base cae en esa semana.</p>
        </div>

        {/* Full delayed table */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest">
              Todas las Actividades con Atraso ({allDelayed.length})
            </p>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">← Ant</button>
              <span className="text-[9px] font-mono-tech text-primary/50">{page + 1}/{Math.max(1, Math.ceil(allDelayed.length / PAGE_SIZE))}</span>
              <button disabled={(page + 1) * PAGE_SIZE >= allDelayed.length} onClick={() => setPage(p => p + 1)} className="text-[9px] font-mono-tech text-primary/50 hover:text-primary disabled:opacity-30 px-1">Sig →</button>
            </div>
          </div>
          <table className="w-full text-[9px] font-mono-tech">
            <thead>
              <tr className="text-muted-foreground/60 border-b border-primary/10">
                {['#', 'ID', 'Actividad', 'Fin Base', 'Avance', 'Atraso', 'Nivel', 'RC'].map(h => (
                  <th key={h} className="text-left py-1 pr-2 font-normal uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allDelayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((a, i) => {
                const m = DELAY_LEVEL_META[a.level as DelayLevel];
                return (
                  <tr key={a.id} className="border-b border-primary/5 hover:bg-white/2">
                    <td className="py-1 pr-2 text-primary/30">{page * PAGE_SIZE + i + 1}</td>
                    <td className="py-1 pr-2 text-primary/50 truncate max-w-[70px]">{a.activityId}</td>
                    <td className="py-1 pr-2 text-white/80 truncate max-w-[200px]" title={a.activityName}>{a.activityName}</td>
                    <td className="py-1 pr-2 text-primary/60">{fmtDate(a.endDate)}</td>
                    <td className="py-1 pr-2 text-amber-400 font-bold">{a.progress}%</td>
                    <td className="py-1 pr-2"><DelayBadge level={a.level as DelayLevel} days={a.delayDays} /></td>
                    <td className="py-1 pr-2">
                      <span className="text-[8px]" style={{ color: m.color }}>{m.label.split(' ')[0]}</span>
                    </td>
                    <td className="py-1">{a.totalFloat <= 0 && <span className="text-red-400 text-[8px]">RC</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Tab: Curva S ─────────────────────────────────────────────────────────────

function CurvaSTab({ activities }: { activities: PdtActivity[] }) {
  const data = useMemo(() => calcSCurveData(activities), [activities]);
  const today = Date.now();
  const todayPoint = data.find(p => Math.abs(p.weekMs - today) < 7 * 86400000 * 0.5);

  const tableData = data.filter((_, i) => i % 2 === 0);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">
            Curva S — Avance Acumulado: PDT Real vs. Línea Base
          </p>
          {data.length === 0
            ? <p className="text-center text-muted-foreground font-mono-tech text-xs py-8">Sin datos de cronograma</p>
            : <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gradPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }}
                    interval={Math.floor(data.length / 10)} />
                  <YAxis unit="%" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'monospace' }} domain={[0, 100]} />
                  <RechartTooltip
                    contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #1e2a3a', fontSize: 10, fontFamily: 'monospace' }}
                    formatter={(v: number, name: string) => [`${v?.toFixed(1)}%`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
                  <ReferenceLine x={todayPoint?.label} stroke="#00E5FF" strokeDasharray="4 4" strokeWidth={1.5}
                    label={{ value: 'HOY', position: 'top', fontSize: 8, fill: '#00E5FF', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="planned" name="Línea Base" stroke="#3B82F6" fill="url(#gradPlan)"
                    strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="actual" name="Obra Real" stroke="#F59E0B" fill="url(#gradReal)"
                    strokeWidth={2} dot={false} connectNulls={false} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Data table */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Datos Semanales</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono-tech">
              <thead>
                <tr className="text-muted-foreground/60 border-b border-primary/10">
                  <th className="text-left py-1 pr-4 font-normal">Semana</th>
                  <th className="text-right py-1 pr-4 font-normal">Plan Acum. %</th>
                  <th className="text-right py-1 pr-4 font-normal">Real Acum. %</th>
                  <th className="text-right py-1 font-normal">Δ</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((p, i) => {
                  const isToday = Math.abs(p.weekMs - today) < 7 * 86400000 * 0.5;
                  const delta = p.actual !== null ? p.actual - p.planned : null;
                  return (
                    <tr key={i} className={`border-b border-primary/5 ${isToday ? 'bg-primary/8' : 'hover:bg-white/2'}`}>
                      <td className="py-1 pr-4">
                        <span className="text-primary/70">{p.label}</span>
                        {isToday && <span className="ml-1 text-cyan-400 text-[8px]">◀ HOY</span>}
                      </td>
                      <td className="py-1 pr-4 text-right text-blue-400">{p.planned.toFixed(1)}%</td>
                      <td className="py-1 pr-4 text-right text-amber-400">{p.actual !== null ? `${p.actual.toFixed(1)}%` : '—'}</td>
                      <td className="py-1 text-right font-bold" style={{
                        color: delta === null ? '#6b7280' : delta >= 0 ? '#10B981' : '#EF4444',
                      }}>
                        {delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Tab: PMI / EVM ───────────────────────────────────────────────────────────

function PmiTab({ activities, showActual }: { activities: PdtActivity[]; showActual: boolean }) {
  const evm = useMemo(() => calcEVM(activities), [activities]);
  const ds = useMemo(() => calcDelayStats(activities, showActual), [activities, showActual]);

  const radarData = [
    { subject: 'Cronograma', A: Math.min(100, evm.spi * 100) },
    { subject: 'Avance', A: evm.pctComplete },
    { subject: 'R. Crítica', A: Math.max(0, 100 - (evm.criticalCount / Math.max(1, activities.length)) * 100) },
    { subject: 'Sin Atraso', A: ds.pctOnTime },
    { subject: 'Holgura', A: Math.min(100, Math.max(0, evm.avgFloat * 5)) },
  ];

  const spiColor = evm.spi >= 0.95 ? '#10B981' : evm.spi >= 0.85 ? '#EAB308' : '#EF4444';
  const spiLabel = evm.spi >= 0.95 ? 'ADELANTADO / A TIEMPO' : evm.spi >= 0.85 ? 'ALERTA — LEVE RETRASO' : 'CRÍTICO — ACCIÓN REQUERIDA';

  const riskRows = [
    { level: 'severe',   label: DELAY_LEVEL_META.severe.label,   count: ds.severe,   prob: '90%', impact: 'Muy Alto', riskLevel: 'Crítico' },
    { level: 'critical', label: DELAY_LEVEL_META.critical.label,  count: ds.critical, prob: '70%', impact: 'Alto',     riskLevel: 'Alto' },
    { level: 'moderate', label: DELAY_LEVEL_META.moderate.label,  count: ds.moderate, prob: '50%', impact: 'Medio',    riskLevel: 'Medio' },
    { level: 'mild',     label: DELAY_LEVEL_META.mild.label,      count: ds.mild,     prob: '30%', impact: 'Bajo',     riskLevel: 'Bajo' },
  ] as const;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* SPI Banner */}
        <div className="rounded border p-3 flex items-center gap-4"
          style={{ borderColor: spiColor + '40', backgroundColor: spiColor + '08' }}>
          <SpiGauge spi={evm.spi} />
          <div className="flex-1">
            <p className="font-black font-mono-tech uppercase tracking-wide text-sm" style={{ color: spiColor }}>{spiLabel}</p>
            <p className="text-[10px] text-muted-foreground font-mono-tech mt-1">
              SPI = EV/PV = {evm.ev}/{evm.pv} u.t. · Variación cronograma: {evm.sv > 0 ? '+' : ''}{evm.sv}%
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] font-mono-tech text-muted-foreground">Fin original:</p>
            <p className="text-[10px] font-bold font-mono-tech text-blue-400">{evm.originalEnd ? fmtDate(evm.originalEnd.toISOString()) : '—'}</p>
            <p className="text-[9px] font-mono-tech text-muted-foreground mt-1">Fin proyectado:</p>
            <p className="text-[10px] font-bold font-mono-tech" style={{ color: evm.projectedEnd && evm.originalEnd && evm.projectedEnd > evm.originalEnd ? '#EF4444' : '#10B981' }}>
              {evm.projectedEnd ? fmtDate(evm.projectedEnd.toISOString()) : '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* EVM Table */}
          <div className="rounded border border-primary/10 bg-primary/3 p-3">
            <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-3">Métricas EVM — PMI PMBOK 7ª Ed.</p>
            <table className="w-full text-[9px] font-mono-tech">
              <tbody>
                {[
                  { label: 'BAC — Budget at Completion', value: `${evm.bac} u.t.`, note: 'Trabajo total planificado', color: '#00E5FF' },
                  { label: 'PV — Planned Value', value: `${evm.pv} u.t.`, note: 'Valor planificado a la fecha', color: '#3B82F6' },
                  { label: 'EV — Earned Value', value: `${evm.ev} u.t.`, note: 'Valor ganado real', color: '#10B981' },
                  { label: 'SPI — Schedule Perf. Index', value: evm.spi.toFixed(3), note: evm.spi >= 1 ? 'Adelantado' : 'Retrasado', color: spiColor },
                  { label: 'SV — Schedule Variance', value: `${evm.sv > 0 ? '+' : ''}${evm.sv}%`, note: `${evm.sv >= 0 ? '(Adelanto)' : '(Atraso)'}`, color: evm.sv >= 0 ? '#10B981' : '#EF4444' },
                  { label: 'EAC — Estimate at Completion', value: `${evm.eac} u.t.`, note: 'BAC / SPI', color: '#F59E0B' },
                  { label: 'ETC — Estimate to Complete', value: `${evm.etc} u.t.`, note: 'EAC – EV', color: '#F59E0B' },
                  { label: 'VAC — Variance at Completion', value: `${evm.vac > 0 ? '+' : ''}${evm.vac} u.t.`, note: 'BAC – EAC', color: evm.vac >= 0 ? '#10B981' : '#EF4444' },
                  { label: 'TCPI — To-Complete Perf. Index', value: evm.tcpi.toFixed(3), note: evm.tcpi <= 1 ? 'Factible' : 'Difícil', color: evm.tcpi <= 1.1 ? '#10B981' : '#EF4444' },
                  { label: 'Ruta Crítica — Actividades', value: String(evm.criticalCount), note: 'Float ≤ 0 días', color: '#EF4444' },
                  { label: 'Float Promedio', value: `${evm.avgFloat}d`, note: 'Holgura promedio', color: '#8B5CF6' },
                  { label: 'Salud del Proyecto', value: `${evm.healthScore}%`, note: 'Índice compuesto PMI', color: evm.healthScore >= 85 ? '#10B981' : evm.healthScore >= 70 ? '#EAB308' : '#EF4444' },
                ].map(r => (
                  <tr key={r.label} className="border-b border-primary/5 hover:bg-white/2">
                    <td className="py-1.5 pr-3 text-muted-foreground">{r.label}</td>
                    <td className="py-1.5 pr-2 font-bold text-right" style={{ color: r.color }}>{r.value}</td>
                    <td className="py-1.5 text-muted-foreground/50 text-right">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Radar + Risk */}
          <div className="space-y-4">
            <div className="rounded border border-primary/10 bg-primary/3 p-3">
              <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-1">Radar de Salud del Proyecto</p>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e2a3a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 8, fill: '#9ca3af', fontFamily: 'monospace' }} />
                  <Radar name="Proyecto" dataKey="A" stroke="#00E5FF" fill="#00E5FF" fillOpacity={0.15} strokeWidth={2} />
                  <RechartTooltip contentStyle={{ backgroundColor: '#0f141c', border: '1px solid #1e2a3a', fontSize: 10 }}
                    formatter={(v: number) => [`${v.toFixed(1)}`, 'Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded border border-primary/10 bg-primary/3 p-3">
              <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Matriz de Riesgo PMI</p>
              <table className="w-full text-[9px] font-mono-tech">
                <thead>
                  <tr className="text-muted-foreground/60 border-b border-primary/10">
                    {['Categoría', 'Act.', 'Probabilidad', 'Impacto', 'Nivel Riesgo'].map(h => (
                      <th key={h} className="text-left py-1 pr-2 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskRows.map(r => {
                    const m = DELAY_LEVEL_META[r.level];
                    return (
                      <tr key={r.level} className="border-b border-primary/5">
                        <td className="py-1.5 pr-2" style={{ color: m.color }}>{r.label}</td>
                        <td className="py-1.5 pr-2 font-bold" style={{ color: m.color }}>{r.count}</td>
                        <td className="py-1.5 pr-2 text-muted-foreground">{r.prob}</td>
                        <td className="py-1.5 pr-2 text-muted-foreground">{r.impact}</td>
                        <td className="py-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border"
                            style={{ color: m.color, backgroundColor: m.bg, borderColor: m.border }}>{r.riskLevel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[8px] text-muted-foreground/50 font-mono-tech mt-2">
                Basado en PMBOK® Guide 7ª Edición — Gestión de Riesgos del Proyecto
              </p>
            </div>
          </div>
        </div>

        {/* PMI Process Groups timeline */}
        <div className="rounded border border-primary/10 bg-primary/3 p-3">
          <p className="text-[10px] font-mono-tech text-muted-foreground uppercase tracking-widest mb-2">Estado por Grupo de Proceso PMI</p>
          <div className="grid grid-cols-5 gap-2">
            {[
              { name: 'Inicio', pct: 100, color: '#10B981', note: 'Completado' },
              { name: 'Planificación', pct: 100, color: '#10B981', note: 'LB Aprobada' },
              { name: 'Ejecución', pct: evm.pctComplete, color: '#3B82F6', note: `${evm.pctComplete.toFixed(0)}% ejecutado` },
              { name: 'Control', pct: evm.pctScheduleUsed, color: '#F59E0B', note: 'Seguimiento activo' },
              { name: 'Cierre', pct: 0, color: '#6B7280', note: 'Pendiente' },
            ].map(g => (
              <div key={g.name} className="text-center space-y-1">
                <div className="relative w-12 h-12 mx-auto">
                  <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                    <circle cx="24" cy="24" r="18" fill="none" stroke="#1e2a3a" strokeWidth="5" />
                    <circle cx="24" cy="24" r="18" fill="none" stroke={g.color} strokeWidth="5"
                      strokeDasharray={`${(g.pct / 100) * 113} 113`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black font-mono-tech" style={{ color: g.color }}>{g.pct.toFixed(0)}%</span>
                </div>
                <p className="text-[8px] font-mono-tech font-bold text-primary/80">{g.name}</p>
                <p className="text-[7px] font-mono-tech text-muted-foreground">{g.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

// ─── Main Modal Component ─────────────────────────────────────────────────────

interface PdtDashboardModalProps {
  open: boolean;
  onClose: () => void;
  activities: PdtActivity[];
  showActual: boolean;
}

export function PdtDashboardModal({ open, onClose, activities, showActual }: PdtDashboardModalProps) {
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentKey>('ALL');
  const [activeTab, setActiveTab] = useState('resumen');

  const filtered = useMemo(() => filterByEquipment(activities, equipmentFilter), [activities, equipmentFilter]);

  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const eqLabel = EQUIPMENT_CATALOG.find(e => e.key === equipmentFilter)?.label ?? 'TODOS';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className="max-w-[96vw] w-full flex flex-col overflow-hidden p-0 bg-[#080c12] border-primary/20"
        style={{ height: '93vh', maxHeight: '93vh' }}
      >
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-primary/15 bg-[#0A0E14] shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-black font-headline uppercase tracking-tighter text-primary glow-cyan flex items-center gap-2">
                <BarChart2 className="w-5 h-5" />
                PDT DASHBOARD — MIL24.001
              </DialogTitle>
              <p className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest mt-0.5">
                {filtered.length} actividades · {eqLabel} · Corte: {today}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/20 text-primary/60 hover:text-primary hover:border-primary/50 text-[9px] font-mono-tech uppercase tracking-wide transition-all">
                <Printer className="w-3.5 h-3.5" /> Imprimir
              </button>
              <button onClick={onClose}
                className="flex items-center gap-1 px-2 py-1.5 rounded border border-primary/20 text-primary/50 hover:text-primary hover:border-primary/50 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Equipment Filter */}
        <EquipmentFilter value={equipmentFilter} onChange={k => { setEquipmentFilter(k); }} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-6 shrink-0 rounded-none border-b border-primary/15 bg-[#0A0E14] h-9 px-2 gap-0.5">
            {[
              { value: 'resumen', label: 'Resumen', icon: <Activity className="w-3 h-3" /> },
              { value: 'disciplinas', label: 'Disciplinas', icon: <Layers className="w-3 h-3" /> },
              { value: 'equipos', label: 'Equipos', icon: <Cpu className="w-3 h-3" /> },
              { value: 'atrasos', label: 'Atrasos', icon: <AlertTriangle className="w-3 h-3" /> },
              { value: 'curvas', label: 'Curva S', icon: <TrendingDown className="w-3 h-3" /> },
              { value: 'pmi', label: 'PMI / EVM', icon: <Target className="w-3 h-3" /> },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="flex items-center gap-1.5 text-[9px] font-mono-tech uppercase tracking-wide data-[state=active]:text-primary data-[state=active]:bg-primary/10 rounded h-7">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="resumen"     className="h-full mt-0 overflow-hidden"><ResumenTab    activities={filtered} showActual={showActual} /></TabsContent>
            <TabsContent value="disciplinas" className="h-full mt-0 overflow-hidden"><DisciplinasTab activities={filtered} showActual={showActual} /></TabsContent>
            <TabsContent value="equipos"     className="h-full mt-0 overflow-hidden"><EquiposTab    activities={filtered} showActual={showActual} selectedEquipment={equipmentFilter} /></TabsContent>
            <TabsContent value="atrasos"     className="h-full mt-0 overflow-hidden"><AtrasosTab    activities={filtered} showActual={showActual} /></TabsContent>
            <TabsContent value="curvas"      className="h-full mt-0 overflow-hidden"><CurvaSTab     activities={filtered} /></TabsContent>
            <TabsContent value="pmi"         className="h-full mt-0 overflow-hidden"><PmiTab        activities={filtered} showActual={showActual} /></TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
