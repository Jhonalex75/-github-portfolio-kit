'use client';

import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users, Wrench, Clock, FileText,
  BarChart3, TrendingDown, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  aggregatePersonnelBreakdownByMonth,
  aggregateEquipmentByMonth,
  aggregateLostHoursByMonth,
  aggregateActivitiesByMonth,
  type MonthlyReportLike,
} from '@/lib/monthly-resources-stats';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = 'personal' | 'equipos' | 'horas' | 'actividades';

interface MonthlyDashboardProps {
  reports: MonthlyReportLike[];
}

// ─── Color palettes ───────────────────────────────────────────────────────────
const PERSONAL_COLORS = {
  mecanicos:  '#22d3ee',   // cyan
  soldadores: '#f59e0b',   // amber
  auxiliares: '#a78bfa',   // violet
  armadores:  '#34d399',   // emerald
  directo:    '#64748b',   // slate (supervisor directo)
};

const EQUIPMENT_COLORS = {
  grua:       '#22d3ee',
  generador:  '#f59e0b',
  andamios:   '#a78bfa',
  camionGrua: '#fb923c',
  torreGrua:  '#f87171',
};

const LOST_COLORS = {
  malClima:       '#60a5fa',   // blue
  parosHSE:       '#fbbf24',   // yellow
  fallasTecnicas: '#f87171',   // red
};

// ─── Tooltip styles ───────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0f141c',
    border: '1px solid rgba(0,229,255,0.2)',
    borderRadius: 8,
    fontSize: 11,
    fontFamily: 'monospace',
  },
};

// ─── Shared axis tick styles ──────────────────────────────────────────────────
const axisTick = { fill: 'rgba(148,163,184,0.9)', fontSize: 10 };

// ─── Main component ───────────────────────────────────────────────────────────
export function MonthlyDashboard({ reports }: MonthlyDashboardProps) {
  const [tab, setTab] = useState<TabId>('personal');

  const personalRows  = useMemo(() => aggregatePersonnelBreakdownByMonth(reports), [reports]);
  const equipmentRows = useMemo(() => aggregateEquipmentByMonth(reports), [reports]);
  const lostHrsRows   = useMemo(() => aggregateLostHoursByMonth(reports), [reports]);
  const activityRows  = useMemo(() => aggregateActivitiesByMonth(reports), [reports]);

  const hasEquipment  = equipmentRows.some(r => r.grua + r.generador + r.andamios + r.camionGrua + r.torreGrua > 0);
  const hasLostHours  = lostHrsRows.some(r => r.total > 0);

  const tabs: { id: TabId; label: string; icon: React.ElementType; color: string; badge?: number }[] = [
    { id: 'personal',    label: 'Personal',     icon: Users,         color: 'cyan',   badge: personalRows.length },
    { id: 'equipos',     label: 'Equipos',      icon: Wrench,        color: 'emerald',badge: hasEquipment ? equipmentRows.length : 0 },
    { id: 'horas',       label: 'H. Perdidas',  icon: TrendingDown,  color: 'red',    badge: hasLostHours ? lostHrsRows.length : 0 },
    { id: 'actividades', label: 'Actividades',  icon: FileText,      color: 'violet', badge: activityRows.length },
  ];

  if (!reports.length) return null;

  return (
    <Card className="border-cyan-500/15 bg-[#05080C] shadow-lg overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-0 pt-3 px-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-cyan-400 shrink-0" />
          <CardTitle className="font-mono text-sm text-cyan-400 uppercase tracking-wide">
            Dashboard Mensual — Recursos & Actividades
          </CardTitle>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 border-b border-primary/10 mt-3 overflow-x-auto scrollbar-thin">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                tab === t.id
                  ? `border-${t.color}-500 text-${t.color}-400`
                  : 'border-transparent text-primary/40 hover:text-primary/70'
              }`}
            >
              <t.icon className="w-3 h-3 shrink-0" />
              {t.label}
              {(t.badge ?? 0) > 0 && (
                <span className={`ml-0.5 text-[8px] px-1.5 rounded-full font-bold ${
                  tab === t.id
                    ? `bg-${t.color}-500/20 text-${t.color}-400`
                    : 'bg-primary/10 text-primary/40'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-5 px-4">
        {tab === 'personal'    && <PersonalTab    rows={personalRows}  />}
        {tab === 'equipos'     && <EquiposTab     rows={equipmentRows} hasData={hasEquipment} />}
        {tab === 'horas'       && <HorasTab       rows={lostHrsRows}   hasData={hasLostHours} />}
        {tab === 'actividades' && <ActividadesTab rows={activityRows}  />}
      </CardContent>
    </Card>
  );
}

// ─── TAB 1: Personal por especialidad ─────────────────────────────────────────
function PersonalTab({ rows }: { rows: ReturnType<typeof aggregatePersonnelBreakdownByMonth> }) {
  const chartData = rows.map(r => ({
    mes:        r.label,
    Mecánicos:  r.mecanicos,
    Soldadores: r.soldadores,
    Auxiliares: r.auxiliares,
    Armadores:  r.armadores,
    Directo:    r.directo,
    informes:   r.reportCount,
    total:      r.total,
  }));

  const totals = rows.reduce(
    (s, r) => ({ mec: s.mec + r.mecanicos, sold: s.sold + r.soldadores, aux: s.aux + r.auxiliares, arm: s.arm + r.armadores, dir: s.dir + r.directo }),
    { mec: 0, sold: 0, aux: 0, arm: 0, dir: 0 }
  );

  if (!rows.length) return <EmptyState label="Sin datos de personal con desglose por especialidad" icon={Users} />;

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-1.5">
        {([
          ['Mecánicos',  totals.mec,  PERSONAL_COLORS.mecanicos],
          ['Soldadores', totals.sold, PERSONAL_COLORS.soldadores],
          ['Auxiliares', totals.aux,  PERSONAL_COLORS.auxiliares],
          ['Armadores',  totals.arm,  PERSONAL_COLORS.armadores],
          ['Directo',    totals.dir,  PERSONAL_COLORS.directo],
        ] as [string, number, string][]).map(([label, val, color]) => (
          <div key={label} className="rounded border border-primary/10 bg-[#0B1018] px-2 py-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-wider text-primary/35">{label}</p>
            <p className="font-mono text-base font-bold mt-0.5" style={{ color }}>{val}</p>
            <p className="font-mono text-[8px] text-primary/25">acum.</p>
          </div>
        ))}
      </div>
      {/* Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.08)" vertical={false} />
            <XAxis dataKey="mes" tick={axisTick} interval={0} angle={-16} textAnchor="end" height={50} />
            <YAxis tick={axisTick} label={{ value: 'Personas (suma mes)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(148,163,184,0.6)', fontSize: 9 } }} />
            <Tooltip
              {...tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="rounded-lg border border-cyan-500/30 bg-[#0f141c] px-3 py-2 text-[11px] shadow-xl font-mono">
                    <p className="font-bold text-cyan-300">{p.mes}</p>
                    <p className="text-primary/50 text-[9px]">{p.informes} informe(s) · Total: {p.total}</p>
                    <div className="mt-1.5 space-y-0.5">
                      {payload.map((e: any) => (
                        <div key={e.dataKey} className="flex justify-between gap-4">
                          <span style={{ color: e.fill }}>{e.name}</span>
                          <span className="font-bold">{e.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, color: 'rgba(148,163,184,0.85)' }} />
            <Bar dataKey="Mecánicos"  stackId="a" fill={PERSONAL_COLORS.mecanicos}  maxBarSize={52} />
            <Bar dataKey="Soldadores" stackId="a" fill={PERSONAL_COLORS.soldadores} maxBarSize={52} />
            <Bar dataKey="Auxiliares" stackId="a" fill={PERSONAL_COLORS.auxiliares} maxBarSize={52} />
            <Bar dataKey="Armadores"  stackId="a" fill={PERSONAL_COLORS.armadores}  maxBarSize={52} />
            <Bar dataKey="Directo"    stackId="a" fill={PERSONAL_COLORS.directo}    radius={[4,4,0,0]} maxBarSize={52} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] font-mono text-primary/30 text-center">
        Suma acumulada de personas por mes · {rows.length} mes(es) analizados
      </p>
    </div>
  );
}

// ─── TAB 2: Equipos físicos por mes ──────────────────────────────────────────
function EquiposTab({ rows, hasData }: { rows: ReturnType<typeof aggregateEquipmentByMonth>; hasData: boolean }) {
  if (!hasData) {
    return (
      <EmptyState
        label="Aún no hay datos de equipos. Complete la sección 'Equipos en Campo' al registrar un contratista."
        icon={Wrench}
      />
    );
  }

  const chartData = rows.map(r => ({
    mes:        r.label,
    'Grúa':     r.grua,
    'Generador': r.generador,
    'Andamios (m³)': r.andamios,
    'Camión Grúa': r.camionGrua,
    'Torre Grúa':  r.torreGrua,
    informes:   r.reportCount,
  }));

  const totals = rows.reduce(
    (s, r) => ({ g: s.g + r.grua, gen: s.gen + r.generador, and: s.and + r.andamios, cg: s.cg + r.camionGrua, tg: s.tg + r.torreGrua }),
    { g: 0, gen: 0, and: 0, cg: 0, tg: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1.5">
        {([
          ['Grúa',        totals.g,   EQUIPMENT_COLORS.grua,       'und'],
          ['Generador',   totals.gen, EQUIPMENT_COLORS.generador,  'und'],
          ['Andamios',    totals.and, EQUIPMENT_COLORS.andamios,   'm³'],
          ['Camión Grúa', totals.cg,  EQUIPMENT_COLORS.camionGrua, 'und'],
          ['Torre Grúa',  totals.tg,  EQUIPMENT_COLORS.torreGrua,  'und'],
        ] as [string, number, string, string][]).map(([label, val, color, unit]) => (
          <div key={label} className="rounded border border-primary/10 bg-[#0B1018] px-2 py-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-wider text-primary/35">{label}</p>
            <p className="font-mono text-base font-bold mt-0.5" style={{ color }}>{val}</p>
            <p className="font-mono text-[8px] text-primary/25">{unit} acum.</p>
          </div>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(52,211,153,0.08)" vertical={false} />
            <XAxis dataKey="mes" tick={axisTick} interval={0} angle={-16} textAnchor="end" height={50} />
            <YAxis tick={axisTick} label={{ value: 'Cantidad acumulada (mes)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(148,163,184,0.6)', fontSize: 9 } }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, color: 'rgba(148,163,184,0.85)' }} />
            <Bar dataKey="Grúa"           stackId="a" fill={EQUIPMENT_COLORS.grua}       maxBarSize={52} />
            <Bar dataKey="Generador"      stackId="a" fill={EQUIPMENT_COLORS.generador}   maxBarSize={52} />
            <Bar dataKey="Andamios (m³)"  stackId="a" fill={EQUIPMENT_COLORS.andamios}    maxBarSize={52} />
            <Bar dataKey="Camión Grúa"    stackId="a" fill={EQUIPMENT_COLORS.camionGrua}  maxBarSize={52} />
            <Bar dataKey="Torre Grúa"     stackId="a" fill={EQUIPMENT_COLORS.torreGrua}   radius={[4,4,0,0]} maxBarSize={52} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] font-mono text-primary/30 text-center">
        Suma acumulada de equipos en campo por mes (todos los contratistas)
      </p>
    </div>
  );
}

// ─── TAB 3: Horas perdidas por mes ───────────────────────────────────────────
function HorasTab({ rows, hasData }: { rows: ReturnType<typeof aggregateLostHoursByMonth>; hasData: boolean }) {
  if (!hasData) {
    return (
      <EmptyState
        label="Sin horas perdidas registradas. Completa los campos de 'Horas Perdidas' en cada contratista."
        icon={Clock}
      />
    );
  }

  const chartData = rows.map(r => ({
    mes:              r.label,
    'Mal Clima':      r.malClima,
    'Paros HSE':      r.parosHSE,
    'Falla Técnica':  r.fallasTecnicas,
    total:            r.total,
    informes:         r.reportCount,
  }));

  const totals = rows.reduce(
    (s, r) => ({ clima: s.clima + r.malClima, hse: s.hse + r.parosHSE, tec: s.tec + r.fallasTecnicas }),
    { clima: 0, hse: 0, tec: 0 }
  );
  const grandTotal = totals.clima + totals.hse + totals.tec;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1.5">
        {([
          ['Mal Clima',     totals.clima, LOST_COLORS.malClima,       'h'],
          ['Paros HSE',     totals.hse,   LOST_COLORS.parosHSE,       'h'],
          ['Falla Técnica', totals.tec,   LOST_COLORS.fallasTecnicas, 'h'],
          ['TOTAL PERDIDO', grandTotal,   '#f87171',                  'h'],
        ] as [string, number, string, string][]).map(([label, val, color, unit]) => (
          <div key={label} className="rounded border border-primary/10 bg-[#0B1018] px-2 py-2 text-center">
            <p className="font-mono text-[8px] uppercase tracking-wider text-primary/35">{label}</p>
            <p className="font-mono text-base font-bold mt-0.5" style={{ color }}>{val.toFixed(1)}</p>
            <p className="font-mono text-[8px] text-primary/25">{unit} acum.</p>
          </div>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(248,113,113,0.08)" vertical={false} />
            <XAxis dataKey="mes" tick={axisTick} interval={0} angle={-16} textAnchor="end" height={50} />
            <YAxis tick={axisTick} label={{ value: 'Horas perdidas (mes)', angle: -90, position: 'insideLeft', style: { fill: 'rgba(148,163,184,0.6)', fontSize: 9 } }} />
            <Tooltip
              {...tooltipStyle}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="rounded-lg border border-red-500/30 bg-[#0f141c] px-3 py-2 text-[11px] shadow-xl font-mono">
                    <p className="font-bold text-red-300">{p.mes}</p>
                    <p className="text-primary/50 text-[9px]">{p.informes} informe(s) · Total: {Number(p.total).toFixed(1)} h</p>
                    <div className="mt-1.5 space-y-0.5">
                      {payload.map((e: any) => (
                        <div key={e.dataKey} className="flex justify-between gap-4">
                          <span style={{ color: e.fill }}>{e.name}</span>
                          <span className="font-bold">{Number(e.value).toFixed(1)} h</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8, color: 'rgba(148,163,184,0.85)' }} />
            <Bar dataKey="Mal Clima"     stackId="a" fill={LOST_COLORS.malClima}       maxBarSize={52} />
            <Bar dataKey="Paros HSE"     stackId="a" fill={LOST_COLORS.parosHSE}       maxBarSize={52} />
            <Bar dataKey="Falla Técnica" stackId="a" fill={LOST_COLORS.fallasTecnicas} radius={[4,4,0,0]} maxBarSize={52} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[9px] font-mono text-primary/30 text-center">
        Suma acumulada de horas perdidas por causa y mes
      </p>
    </div>
  );
}

// ─── TAB 4: Actividades por mes ───────────────────────────────────────────────
function ActividadesTab({ rows }: { rows: ReturnType<typeof aggregateActivitiesByMonth> }) {
  const [openMonth, setOpenMonth] = useState<string | null>(
    rows.length > 0 ? rows[rows.length - 1].key : null
  );

  if (!rows.length) return <EmptyState label="Sin actividades registradas" icon={FileText} />;

  // Show months in reverse chronological order
  const reversed = [...rows].reverse();

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-mono text-primary/40 uppercase tracking-wider">
        {rows.length} mes(es) · Haz clic en un mes para ver las actividades y palabras clave
      </p>
      <ScrollArea className="h-[380px] pr-2">
        <div className="space-y-2">
          {reversed.map(row => {
            const isOpen = openMonth === row.key;
            return (
              <div key={row.key} className="border border-primary/10 rounded-lg overflow-hidden">
                {/* Month header */}
                <button
                  onClick={() => setOpenMonth(isOpen ? null : row.key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-primary/[0.04] hover:bg-primary/[0.07] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-cyan-400 uppercase">{row.label}</span>
                    <span className="text-[9px] font-mono text-primary/40 bg-primary/10 px-2 py-0.5 rounded-full">
                      {row.reportCount} folio{row.reportCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {isOpen
                    ? <ChevronUp className="w-3.5 h-3.5 text-primary/40" />
                    : <ChevronDown className="w-3.5 h-3.5 text-primary/40" />
                  }
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-2 space-y-3">
                    {/* Word cloud (top keywords) */}
                    {row.topWords.length > 0 && (
                      <div>
                        <p className="text-[8px] font-mono text-primary/30 uppercase tracking-widest mb-1.5">
                          Palabras clave del mes
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.topWords.map(({ word, count }) => {
                            const maxCount = row.topWords[0].count;
                            const intensity = Math.max(0.4, count / maxCount);
                            const size = count === maxCount ? 'text-[12px]'
                              : count >= maxCount * 0.7 ? 'text-[11px]'
                              : count >= maxCount * 0.4 ? 'text-[10px]'
                              : 'text-[9px]';
                            return (
                              <span
                                key={word}
                                className={`font-mono font-bold ${size} px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20`}
                                style={{ color: `rgba(34,211,238,${intensity})` }}
                                title={`${count} vez/veces`}
                              >
                                {word}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Activity snippets */}
                    <div className="space-y-2">
                      <p className="text-[8px] font-mono text-primary/30 uppercase tracking-widest">
                        Narrativas del mes ({row.snippets.length} informe{row.snippets.length !== 1 ? 's' : ''})
                      </p>
                      {row.snippets.map((s, i) => (
                        <div key={i} className="bg-black/30 rounded p-2.5 border-l-2 border-cyan-500/30">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-mono font-bold text-cyan-400">{s.folio}</span>
                            <span className="text-[8px] font-mono text-primary/40">{s.frente}</span>
                          </div>
                          <p className="text-[10px] font-mono text-primary/70 leading-relaxed line-clamp-4">
                            {s.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-primary/15 py-12 px-4 text-center">
      <Icon className="h-6 w-6 text-primary/20" />
      <p className="font-mono text-[10px] text-primary/35 max-w-xs leading-relaxed">{label}</p>
    </div>
  );
}
