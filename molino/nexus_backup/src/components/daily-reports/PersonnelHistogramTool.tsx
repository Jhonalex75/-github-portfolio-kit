'use client';

import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  aggregatePersonnelByMonth,
  exportPersonnelByMonthExcel,
  toChartData,
  type PersonnelReportLike,
} from '@/lib/daily-reports-personnel-stats';
import { BarChart3, Download, Loader2, Users } from 'lucide-react';

interface PersonnelHistogramToolProps {
  reports: PersonnelReportLike[];
  projectId?: string;
}

export function PersonnelHistogramTool({ reports, projectId = 'default-nexus-project' }: PersonnelHistogramToolProps) {
  const [exporting, setExporting] = useState(false);

  const monthlyRows = useMemo(() => aggregatePersonnelByMonth(reports), [reports]);
  const chartData = useMemo(() => toChartData(monthlyRows), [monthlyRows]);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportPersonnelByMonthExcel(reports, monthlyRows, projectId);
    } finally {
      setExporting(false);
    }
  };

  if (!reports.length) return null;

  return (
    <Card className="border-primary/15 bg-[#05080C] shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2">
            <BarChart3 className="mt-0.5 h-5 w-5 text-cyan-400" />
            <div>
              <CardTitle className="font-mono text-sm text-cyan-400 uppercase tracking-wide">
                Histograma de personal por mes
              </CardTitle>
              <CardDescription className="font-mono text-[10px] text-primary/45 mt-1 max-w-xl">
                Promedio de personal por folio en cada mes (directo desde recursos de frente + contratistas).
                Las barras apiladas muestran directo vs contratistas. La hoja Excel incluye resumen y detalle por
                informe.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting || monthlyRows.length === 0}
            onClick={onExport}
            className="shrink-0 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 font-mono text-[10px] uppercase tracking-wider"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-2 h-3.5 w-3.5" />
            )}
            Exportar Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {monthlyRows.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-primary/20 py-8 px-4 text-[11px] font-mono text-primary/40">
            <Users className="h-4 w-4 shrink-0" />
            Sin fechas válidas en los informes para agrupar por mes.
          </div>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-4 text-[10px] font-mono text-primary/50">
              <span>
                Meses: <strong className="text-cyan-400">{monthlyRows.length}</strong>
              </span>
              <span>
                Informes analizados: <strong className="text-cyan-400">{reports.length}</strong>
              </span>
            </div>
            <div className="h-[280px] w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.12)" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: 'rgba(148,163,184,0.9)', fontSize: 10 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(148,163,184,0.9)', fontSize: 10 }}
                    label={{
                      value: 'Personas (prom. / folio)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: 'rgba(148,163,184,0.7)', fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as {
                        mes: string;
                        Directo: number;
                        Contratistas: number;
                        Total: number;
                        informes: number;
                        maximo: number;
                      };
                      return (
                        <div className="rounded-lg border border-cyan-500/30 bg-[#0f141c] px-3 py-2 text-[11px] shadow-xl">
                          <p className="font-mono font-bold text-cyan-300">{p.mes}</p>
                          <p className="mt-1 font-mono text-primary/60">
                            {p.informes} informe(s) · máx. {p.maximo} pers. en un folio
                          </p>
                          <ul className="mt-2 space-y-0.5 font-mono text-primary/90">
                            <li>Directo: {p.Directo}</li>
                            <li>Contratistas: {p.Contratistas}</li>
                            <li className="text-cyan-400/90">Total prom.: {p.Total}</li>
                          </ul>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: 'rgba(148,163,184,0.85)' }} />
                  <Bar dataKey="Directo" stackId="a" fill="#22d3ee" radius={[0, 0, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Contratistas" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
