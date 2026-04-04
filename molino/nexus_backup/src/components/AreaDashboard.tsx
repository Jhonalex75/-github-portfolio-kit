"use client";

/**
 * AreaDashboard.tsx
 * Dashboard interactivo de estadísticas por área WBS
 * Recharts + exportación Excel SGS
 */

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, PieChartIcon, TrendingUp } from "lucide-react";
import { PLANT_AREAS, PLANT_EQUIPMENT, type PlantEquipment } from "@/lib/mill-plant-data";
import {
  OPERATIONAL_STATUS_LABELS,
  type EquipmentRecord,
  type AssemblyActivity,
  type NonConformity,
} from "@/lib/quality-types";
import { exportAreaDashboard } from "@/lib/excel-equipment";

interface AreaDashboardProps {
  records:       Record<string, EquipmentRecord>;
  ncs:           NonConformity[];
  allActivities: Record<string, AssemblyActivity[]>;
}

// ─── Chart colours ───────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  sin_iniciar:  "#64748b",
  en_montaje:   "#f59e0b",
  comisionando: "#3b82f6",
  operativo:    "#10b981",
};
const SEV_COLORS: Record<string, string> = {
  crítica: "#ef4444",
  alta:    "#f97316",
  media:   "#eab308",
  baja:    "#22c55e",
};

type ChartView = "status" | "ncs" | "progress";

const CHART_TABS: { id: ChartView; label: string; icon: React.ElementType }[] = [
  { id: "status",   label: "Estado Operacional", icon: BarChart3 },
  { id: "ncs",      label: "NCs por Área",       icon: PieChartIcon },
  { id: "progress", label: "% Avance Montaje",   icon: TrendingUp },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#060d1a] border border-white/10 p-3 rounded-none text-xs font-mono-tech shadow-xl">
      <p className="text-orange-400 font-bold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill || p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AreaDashboard({ records, ncs, allActivities }: AreaDashboardProps) {
  const [activeChart, setActiveChart] = useState<ChartView>("status");
  const [exporting,   setExporting]   = useState(false);

  const topAreas = useMemo(() => PLANT_AREAS.filter(a => a.parentCode === "1000"), []);

  // ── Compute per-area stats ───────────────────────────────────────────────
  const areaStats = useMemo(() => {
    return topAreas.map(area => {
      const equip = PLANT_EQUIPMENT.filter(e => e.areaCode === area.code);

      const statusCounts = { sin_iniciar: 0, en_montaje: 0, comisionando: 0, operativo: 0 };
      equip.forEach(e => {
        const s = records[e.tag]?.operational_status ?? "sin_iniciar";
        statusCounts[s as keyof typeof statusCounts]++;
      });

      const areaNcs   = ncs.filter(n => equip.some(e => e.tag === n.related_equipment));
      const ncCounts  = { crítica: 0, alta: 0, media: 0, baja: 0 };
      areaNcs.forEach(n => { ncCounts[n.severity as keyof typeof ncCounts]++; });

      const areaActs  = equip.flatMap(e => allActivities[e.tag] ?? []);
      const total     = areaActs.length;
      const completed = areaActs.filter(a => a.status === "completado").length;
      const pct       = total ? Math.round((completed / total) * 100) : 0;

      // Short label for chart axes
      const shortName = area.name.length > 18 ? area.name.slice(0, 16) + "…" : area.name;

      return {
        code:         area.code,
        name:         area.name,
        shortName,
        equipCount:   equip.length,
        ...statusCounts,
        totalNcs:     areaNcs.length,
        openNcs:      areaNcs.filter(n => n.status === "abierto" || n.status === "en_proceso").length,
        ...ncCounts,
        totalActs:    total,
        completedActs: completed,
        pctProgress:  pct,
      };
    });
  }, [topAreas, records, ncs, allActivities]);

  // ── Global KPIs ─────────────────────────────────────────────────────────
  const globalKpis = useMemo(() => {
    const total      = PLANT_EQUIPMENT.length;
    const operativo  = PLANT_EQUIPMENT.filter(e => records[e.tag]?.operational_status === "operativo").length;
    const enMontaje  = PLANT_EQUIPMENT.filter(e => records[e.tag]?.operational_status === "en_montaje").length;
    const allActs    = Object.values(allActivities).flat();
    const compActs   = allActs.filter(a => a.status === "completado").length;
    const pct        = allActs.length ? Math.round((compActs / allActs.length) * 100) : 0;
    const openNcs    = ncs.filter(n => n.status === "abierto" || n.status === "en_proceso").length;
    const critNcs    = ncs.filter(n => n.severity === "crítica" && n.status !== "cerrado").length;
    return { total, operativo, enMontaje, pct, openNcs, critNcs, totalNcs: ncs.length };
  }, [records, ncs, allActivities]);

  // ── Pie data for NC distribution ─────────────────────────────────────────
  const ncPieData = useMemo(() => {
    const counts = { crítica: 0, alta: 0, media: 0, baja: 0 };
    ncs.forEach(n => { counts[n.severity as keyof typeof counts]++; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k, value: v, fill: SEV_COLORS[k] }));
  }, [ncs]);

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAreaDashboard(PLANT_AREAS, PLANT_EQUIPMENT, ncs, records, allActivities);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4 border border-white/5 bg-white/[0.01] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/70 mb-0.5">
            Dashboard Interactivo
          </p>
          <h2 className="text-sm font-display uppercase tracking-widest text-white/80">
            Estadísticas por Área WBS
          </h2>
        </div>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="h-8 rounded-none bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all disabled:opacity-50"
        >
          <Download className="w-3 h-3 mr-1.5" />
          {exporting ? "Generando..." : "Exportar Excel"}
        </Button>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: "Total Equipos",  value: globalKpis.total,    color: "border-white/10  text-white/60" },
          { label: "Operativos",     value: globalKpis.operativo, color: "border-emerald-500/40 text-emerald-400" },
          { label: "En Montaje",     value: globalKpis.enMontaje, color: "border-yellow-500/40 text-yellow-400" },
          { label: "Avance Montaje", value: `${globalKpis.pct}%`, color: "border-blue-500/40  text-blue-400" },
          { label: "NCs Abiertas",   value: globalKpis.openNcs,  color: "border-red-500/40   text-red-400" },
          { label: "NCs Críticas",   value: globalKpis.critNcs,  color: "border-red-600/60   text-red-300" },
        ].map(k => (
          <div key={k.label} className={`bg-[#020617] border ${k.color.split(" ")[0]} p-3`}>
            <p className="text-[8px] font-display uppercase tracking-widest text-white/30 mb-1">{k.label}</p>
            <p className={`text-2xl font-display font-bold ${k.color.split(" ")[1]}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Chart tabs */}
      <div className="flex border-b border-white/5">
        {CHART_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveChart(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[9px] font-display uppercase tracking-widest transition-colors relative ${
              activeChart === tab.id ? "text-orange-400" : "text-white/30 hover:text-white/60"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
            {activeChart === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />
            )}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="h-72">

        {/* Estado Operacional — stacked bar */}
        {activeChart === "status" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaStats} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis
                dataKey="shortName"
                tick={{ fill: "#ffffff40", fontSize: 8, fontFamily: "monospace" }}
                angle={-35} textAnchor="end" interval={0}
              />
              <YAxis tick={{ fill: "#ffffff40", fontSize: 9 }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 9, fontFamily: "monospace", color: "#ffffff60", paddingTop: 8 }}
                formatter={(v) => OPERATIONAL_STATUS_LABELS[v as keyof typeof OPERATIONAL_STATUS_LABELS] ?? v}
              />
              {(["sin_iniciar", "en_montaje", "comisionando", "operativo"] as const).map(s => (
                <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} maxBarSize={40}>
                  <LabelList dataKey={s} position="inside" style={{ fontSize: 8, fill: "#fff", fontFamily: "monospace" }}
                    formatter={(v: number) => v > 0 ? v : ""} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* NCs por área — donut + bar */}
        {activeChart === "ncs" && (
          <div className="flex gap-4 h-full">
            {/* Pie chart — global severity */}
            <div className="w-56 flex-shrink-0">
              <p className="text-[8px] font-mono-tech text-white/30 uppercase text-center mb-1">Global por Severidad</p>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={ncPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                    style={{ fontSize: 8, fontFamily: "monospace" }}>
                    {ncPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Bar chart — NCs per area */}
            <div className="flex-1">
              <p className="text-[8px] font-mono-tech text-white/30 uppercase mb-1">NCs por Área</p>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={areaStats} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                  <XAxis dataKey="shortName" tick={{ fill: "#ffffff40", fontSize: 8, fontFamily: "monospace" }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: "#ffffff40", fontSize: 9 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace", color: "#ffffff60" }} />
                  {(["crítica", "alta", "media", "baja"] as const).map(s => (
                    <Bar key={s} dataKey={s} stackId="nc" fill={SEV_COLORS[s]} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* % Avance Montaje — bar */}
        {activeChart === "progress" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaStats} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
              <XAxis dataKey="shortName" tick={{ fill: "#ffffff40", fontSize: 8, fontFamily: "monospace" }} angle={-35} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fill: "#ffffff40", fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<ChartTooltip />} formatter={(v) => [`${v}%`, "Avance"]} />
              <Bar dataKey="pctProgress" name="% Completado" maxBarSize={40} radius={[2, 2, 0, 0]}>
                {areaStats.map((entry, i) => (
                  <Cell key={i} fill={entry.pctProgress >= 80 ? "#10b981" : entry.pctProgress >= 40 ? "#f59e0b" : "#ef4444"} />
                ))}
                <LabelList dataKey="pctProgress" position="top" style={{ fontSize: 9, fill: "#ffffff80", fontFamily: "monospace" }}
                  formatter={(v: number) => `${v}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Area summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono-tech border-collapse">
          <thead>
            <tr>
              {["Área", "Equipos", "Sin Iniciar", "En Montaje", "Comisionando", "Operativo", "Total NCs", "Abiertas", "Avance"].map(h => (
                <th key={h} className="bg-[#0a0e14] text-white/40 font-display uppercase tracking-wider px-3 py-2 text-left border-b border-white/5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areaStats.map((a, i) => (
              <tr key={a.code} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""} hover:bg-white/[0.03] transition-colors`}>
                <td className="px-3 py-2 text-white/70 font-medium">{a.name}</td>
                <td className="px-3 py-2 text-center text-white/50">{a.equipCount}</td>
                <td className="px-3 py-2 text-center text-slate-400">{a.sin_iniciar}</td>
                <td className="px-3 py-2 text-center text-yellow-400">{a.en_montaje}</td>
                <td className="px-3 py-2 text-center text-blue-400">{a.comisionando}</td>
                <td className="px-3 py-2 text-center text-emerald-400">{a.operativo}</td>
                <td className="px-3 py-2 text-center text-white/50">{a.totalNcs}</td>
                <td className={`px-3 py-2 text-center font-bold ${a.openNcs > 0 ? "text-red-400" : "text-white/20"}`}>{a.openNcs}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-none overflow-hidden">
                      <div
                        className={`h-full transition-all ${a.pctProgress >= 80 ? "bg-emerald-500" : a.pctProgress >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${a.pctProgress}%` }}
                      />
                    </div>
                    <span className="text-white/50 w-7 text-right">{a.pctProgress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
