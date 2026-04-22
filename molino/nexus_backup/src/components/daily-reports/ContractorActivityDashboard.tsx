'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  activityFrequency,
  distinctContractors,
  exportContractorDashboardExcel,
  flattenContractorReportRows,
  monthlyStatsForContractor,
  specialtyByFolio,
  specialtyShareForContractor,
  summarizeAllContractors,
  topContractorsByVolume,
  type ContractorDashboardReportLike,
} from '@/lib/contractor-activity-dashboard';
import {
  ChevronDown,
  Download,
  LayoutDashboard,
  Loader2,
  Building2,
  Info,
  Users,
  BarChart2,
  PieChartIcon,
  Activity,
} from 'lucide-react';

const ALL_KEY = '__ALL__';

// Tipo auxiliar para tooltip tipado
interface ActivityFreqTooltip { category: string; count: number; pct: number; color: string; icon: string; }

interface ContractorActivityDashboardProps {
  reports: ContractorDashboardReportLike[];
  projectId?: string;
}

export function ContractorActivityDashboard({
  reports,
  projectId = 'default-nexus-project',
}: ContractorActivityDashboardProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(ALL_KEY);
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => flattenContractorReportRows(reports), [reports]);
  const contractors = useMemo(() => distinctContractors(rows), [rows]);
  const summaries = useMemo(() => summarizeAllContractors(rows), [rows]);
  const topVolume = useMemo(() => topContractorsByVolume(rows, 12), [rows]);

  const monthlyForSelected = useMemo(() => {
    if (selected === ALL_KEY || !selected) return [];
    return monthlyStatsForContractor(rows, selected);
  }, [rows, selected]);

  const monthlyChartData = useMemo(
    () =>
      monthlyForSelected.map((m) => ({
        label: m.label,
        informes: m.reportCount,
        personal: m.sumPersonnel,
        promPers: m.avgPersonnel,
      })),
    [monthlyForSelected]
  );

  const contractorRowsFiltered = useMemo(() => {
    if (selected === ALL_KEY) return rows;
    return rows.filter((r) => r.contractor === selected);
  }, [rows, selected]);

  const summaryOne = useMemo(() => {
    if (selected === ALL_KEY) return null;
    return summaries.find((s) => s.contractor === selected) ?? null;
  }, [summaries, selected]);

  // ── Nuevas agregaciones para gráficas avanzadas ──
  const specialtyFolioData = useMemo(() => {
    if (selected === ALL_KEY || !selected) return [];
    return specialtyByFolio(reports, selected);
  }, [reports, selected]);

  const hasSpecialtyData = useMemo(
    () => specialtyFolioData.some(f => f.mecanicos + f.soldadores + f.auxiliares + f.armadores + f.inspectoresHSE > 0),
    [specialtyFolioData],
  );

  const specialtyShare = useMemo(() => {
    if (selected === ALL_KEY || !selected) return [];
    return specialtyShareForContractor(reports, selected);
  }, [reports, selected]);

  const actFreq = useMemo(() => {
    if (selected === ALL_KEY || !selected) return [];
    return activityFrequency(contractorRowsFiltered, selected, reports);
  }, [contractorRowsFiltered, selected, reports]);

  // Histograma: personal por folio (para contratista seleccionado)
  const personnelHistData = useMemo(() => {
    return contractorRowsFiltered
      .slice()
      .sort((a, b) => a.dateMs - b.dateMs)
      .map(r => ({
        label: r.consecutiveId,
        personal: r.personnel,
        date: r.dateIso ? new Date(r.dateIso).toLocaleDateString('es-CO', { day:'2-digit', month:'short' }) : '—',
      }));
  }, [contractorRowsFiltered]);

  const onExport = async (scope: 'view' | 'all') => {
    setExporting(true);
    try {
      await exportContractorDashboardExcel(rows, summaries, {
        projectId,
        filterContractor: scope === 'view' && selected !== ALL_KEY ? selected : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  if (!reports.length) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-violet-500/20 bg-[#05080C] shadow-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 border-b border-violet-500/15 bg-violet-950/20 px-4 py-3 text-left transition-colors hover:bg-violet-950/35"
          >
            <div className="flex items-center gap-3 min-w-0">
              <LayoutDashboard className="h-5 w-5 shrink-0 text-violet-400" />
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold uppercase tracking-wide text-violet-300">
                  Dashboard por contratista
                </p>
                <p className="truncate font-mono text-[10px] text-primary/45">
                  Actividades del folio, tiempo (fechas) y personal — gráficas y Excel
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-violet-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-4 pb-5">
            {rows.length === 0 ? (
              <p className="font-mono text-[11px] text-amber-400/90">
                No hay filas con contratista nombrado. En cada informe, complete el nombre en la pestaña
                Contratistas para ver datos aquí.
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 rounded-lg border border-primary/10 bg-primary/[0.03] p-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-1.5 flex-1 max-w-md">
                    <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary/50">
                      <Building2 className="h-3 w-3" />
                      Contratista
                    </label>
                    <Select value={selected} onValueChange={setSelected}>
                      <SelectTrigger className="h-9 border-violet-500/25 bg-[#0B1018] font-mono text-xs text-primary/90">
                        <SelectValue placeholder="Elegir…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_KEY} className="font-mono text-xs">
                          Vista general (todos)
                        </SelectItem>
                        {contractors.map((c) => (
                          <SelectItem key={c} value={c} className="font-mono text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={exporting}
                      onClick={() => onExport('view')}
                      className="border-emerald-500/40 font-mono text-[10px] uppercase text-emerald-400 hover:bg-emerald-500/10"
                    >
                      {exporting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Download className="mr-1.5 h-3 w-3" />}
                      Excel {selected === ALL_KEY ? '(todos)' : '(filtro)'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={exporting || selected === ALL_KEY}
                      onClick={() => onExport('all')}
                      className="font-mono text-[10px] uppercase text-primary/60 hover:text-primary"
                      title="Incluye todos los contratistas en el archivo (no solo el seleccionado)"
                    >
                      Todos los contratistas
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 rounded-md border border-cyan-500/15 bg-cyan-950/10 p-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500/80" />
                  <p className="font-mono text-[10px] leading-relaxed text-primary/55">
                    Cada informe tiene un único texto de <strong className="text-primary/75">actividades</strong> del frente.
                    Ese texto se muestra para <strong className="text-primary/75">cada contratista</strong> listado en ese
                    folio (misma descripción, personal y fecha propios por fila).
                  </p>
                </div>

                {selected === ALL_KEY ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/80">
                      Top contratistas — vínculos a folios
                    </p>
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topVolume}
                          layout="vertical"
                          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.15)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: 'rgba(148,163,184,0.85)', fontSize: 10 }} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            tick={{ fill: 'rgba(148,163,184,0.9)', fontSize: 9 }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f141c',
                              border: '1px solid rgba(139,92,246,0.35)',
                              borderRadius: 8,
                              fontSize: 11,
                            }}
                            formatter={(v: number) => [`${v} folio(s)`, 'Registros']}
                          />
                          <Bar dataKey="folios" name="Folios" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <>
                    {summaryOne && (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <StatBox label="Primer informe" value={fmtDate(summaryOne.firstDateMs)} />
                        <StatBox label="Último informe" value={fmtDate(summaryOne.lastDateMs)} />
                        <StatBox label="Folios" value={String(summaryOne.reportLinks)} accent="text-cyan-400" />
                        <StatBox
                          label="Prom. pers. / folio"
                          value={String(summaryOne.avgPersonnel)}
                          accent="text-amber-400"
                        />
                      </div>
                    )}

                    {monthlyChartData.length === 0 ? (
                      <p className="font-mono text-[11px] text-primary/40">Sin fechas válidas para este contratista.</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/80">
                          Evolución mensual — personal y n° de informes
                        </p>
                        <div className="h-[280px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.12)" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tick={{ fill: 'rgba(148,163,184,0.9)', fontSize: 10 }}
                                interval={0}
                                angle={-16}
                                textAnchor="end"
                                height={48}
                              />
                              <YAxis
                                yAxisId="left"
                                tick={{ fill: 'rgba(251,191,36,0.9)', fontSize: 10 }}
                                label={{
                                  value: 'Personal (suma mensual)',
                                  angle: -90,
                                  position: 'insideLeft',
                                  style: { fill: 'rgba(251,191,36,0.65)', fontSize: 9 },
                                }}
                              />
                              <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fill: 'rgba(34,211,238,0.9)', fontSize: 10 }}
                                allowDecimals={false}
                                label={{
                                  value: 'Informes',
                                  angle: 90,
                                  position: 'insideRight',
                                  style: { fill: 'rgba(34,211,238,0.65)', fontSize: 9 },
                                }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#0f141c',
                                  border: '1px solid rgba(139,92,246,0.35)',
                                  borderRadius: 8,
                                  fontSize: 11,
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                              <Bar
                                yAxisId="left"
                                dataKey="personal"
                                name="Σ Personal mes"
                                fill="#f59e0b"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                              />
                              <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="informes"
                                name="# Informes"
                                stroke="#22d3ee"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#22d3ee' }}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* ── GRÁFICA 2: Histograma de personal por folio ── */}
                    {personnelHistData.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-cyan-400" />
                          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-400/80">
                            Personal por folio — histograma
                          </p>
                        </div>
                        <div className="h-[220px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={personnelHistData} margin={{ top:4, right:12, left:0, bottom:28 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.10)" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tick={{ fill:'rgba(148,163,184,0.8)', fontSize:9 }}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={40}
                              />
                              <YAxis tick={{ fill:'rgba(148,163,184,0.7)', fontSize:9 }} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor:'#0f141c', border:'1px solid rgba(34,211,238,0.35)', borderRadius:8, fontSize:11 }}
                                formatter={(v: number, _: string, props: { payload?: { date?: string } }) => [`${v} personas — ${props.payload?.date ?? ''}`, 'Personal']}
                              />
                              <Bar dataKey="personal" name="Personal" fill="#22d3ee" radius={[4,4,0,0]} maxBarSize={32}>
                                {personnelHistData.map((entry, i) => (
                                  <Cell key={i} fill={entry.personal >= 40 ? '#0097A7' : entry.personal >= 25 ? '#22d3ee' : '#67E8F9'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* ── GRÁFICA 3: Desglose por especialidad (stacked) ── */}
                    {hasSpecialtyData && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="h-3.5 w-3.5 text-amber-400" />
                          <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">
                            Desglose por especialidad — por folio (apilado)
                          </p>
                        </div>
                        <div className="h-[260px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={specialtyFolioData} margin={{ top:4, right:12, left:0, bottom:36 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,191,36,0.08)" vertical={false} />
                              <XAxis
                                dataKey="label"
                                tick={{ fill:'rgba(148,163,184,0.8)', fontSize:8 }}
                                interval={0}
                                angle={-35}
                                textAnchor="end"
                                height={44}
                              />
                              <YAxis tick={{ fill:'rgba(148,163,184,0.7)', fontSize:9 }} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor:'#0f141c', border:'1px solid rgba(251,191,36,0.3)', borderRadius:8, fontSize:11 }}
                              />
                              <Legend wrapperStyle={{ fontSize:10, paddingTop:4 }} />
                              <Bar dataKey="mecanicos"      name="Mecánicos"   stackId="a" fill="#1565C0" maxBarSize={36} />
                              <Bar dataKey="soldadores"     name="Soldadores"  stackId="a" fill="#D32F2F" maxBarSize={36} />
                              <Bar dataKey="auxiliares"     name="Auxiliares"  stackId="a" fill="#00695C" maxBarSize={36} />
                              <Bar dataKey="armadores"      name="Armadores"   stackId="a" fill="#FFA000" maxBarSize={36} />
                              <Bar dataKey="inspectoresHSE" name="Insp. HSE"   stackId="a" fill="#6A1B9A" radius={[4,4,0,0]} maxBarSize={36} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* ── GRÁFICAS 4 + 5: Pie de especialidades + Frecuencia de actividades ── */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                      {/* Pie distribución especialidades */}
                      {specialtyShare.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <PieChartIcon className="h-3.5 w-3.5 text-violet-400" />
                            <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/80">
                              Distribución % de especialidades
                            </p>
                          </div>
                          <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={specialtyShare}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="48%"
                                  outerRadius={80}
                                  innerRadius={36}
                                  paddingAngle={2}
                                  label={({ name, pct }) => `${name} ${pct}%`}
                                  labelLine={{ stroke:'rgba(148,163,184,0.4)', strokeWidth:1 }}
                                >
                                  {specialtyShare.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} stroke="transparent" />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor:'#0f141c', border:'1px solid rgba(139,92,246,0.35)', borderRadius:8, fontSize:11 }}
                                  formatter={(v: number, name: string) => {
                                    const item = specialtyShare.find(s => s.name === name);
                                    return [`${v} pers. (${item?.pct ?? 0}%)`, name];
                                  }}
                                />
                                <Legend wrapperStyle={{ fontSize:10, paddingTop:4 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Frecuencia de actividades por categoría */}
                      {actFreq.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-orange-400" />
                            <p className="font-mono text-[10px] uppercase tracking-widest text-orange-400/80">
                              Frecuencia de actividades — % participación
                            </p>
                          </div>
                          <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={actFreq}
                                layout="vertical"
                                margin={{ top:4, right:48, left:4, bottom:4 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,146,60,0.10)" horizontal={false} />
                                <XAxis
                                  type="number"
                                  domain={[0, 100]}
                                  tick={{ fill:'rgba(148,163,184,0.7)', fontSize:9 }}
                                  tickFormatter={v => `${v}%`}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="category"
                                  width={130}
                                  tick={{ fill:'rgba(148,163,184,0.85)', fontSize:8 }}
                                  tickFormatter={v => v.length > 18 ? v.slice(0,17)+'…' : v}
                                />
                                <Tooltip
                                  contentStyle={{ backgroundColor:'#0f141c', border:'1px solid rgba(251,146,60,0.35)', borderRadius:8, fontSize:11 }}
                                  formatter={(v: number, _: string, props: { payload?: ActivityFreqTooltip }) => [
                                    `${props.payload?.count ?? 0} folio(s) — ${v}% de presencia`,
                                    props.payload?.category ?? ''
                                  ]}
                                />
                                <Bar dataKey="pct" name="% presencia" radius={[0,4,4,0]} maxBarSize={18}>
                                  {actFreq.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Mini-leyenda de porcentajes */}
                          <div className="grid grid-cols-2 gap-1 pt-1">
                            {actFreq.slice(0, 6).map((a, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <span className="text-[11px]">{a.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[8px] text-primary/60 truncate">{a.category}</span>
                                    <span className="font-mono text-[9px] font-bold ml-1" style={{ color: a.color }}>{a.pct}%</span>
                                  </div>
                                  <div className="mt-0.5 h-1 rounded-full bg-primary/10 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width:`${a.pct}%`, backgroundColor: a.color }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Lista de folios ── */}
                    <div className="space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/80">
                        Últimos folios — actividades
                      </p>
                      <ScrollArea className="h-[220px] rounded-md border border-primary/10">
                        <div className="divide-y divide-primary/10 p-2">
                          {[...contractorRowsFiltered].reverse().slice(0, 40).map((r, idx) => (
                            <div key={`${r.reportId}_${r.contractor}_${r.dateIso}_${idx}`} className="py-2.5">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-mono text-[11px] font-bold text-cyan-400">{r.consecutiveId}</span>
                                <span className="font-mono text-[10px] text-primary/45">
                                  {r.dateIso ? new Date(r.dateIso).toLocaleString('es-CO', { dateStyle: 'short' }) : '—'}{' '}
                                  · {r.frente} · {r.personnel} pers.
                                </span>
                              </div>
                              <p className="mt-1 font-mono text-[10px] leading-snug text-primary/70 line-clamp-4">
                                {r.activities || '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function fmtDate(ms: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

function StatBox({
  label,
  value,
  accent = 'text-primary/90',
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded border border-primary/10 bg-[#0B1018] px-2 py-2">
      <p className="font-mono text-[8px] uppercase tracking-wider text-primary/35">{label}</p>
      <p className={`font-mono text-sm font-bold ${accent}`}>{value}</p>
    </div>
  );
}
