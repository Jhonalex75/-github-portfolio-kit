"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ShieldAlert, Plus, Search, Wrench, X, CheckCircle2, Clock,
  AlertTriangle, XCircle, BarChart3, TrendingUp, FileText,
  User, Calendar, Tag, ChevronDown, ChevronUp, Send, RefreshCw,
  Filter, ClipboardList, Activity, LayoutGrid, ListFilter,
} from "lucide-react";
import { useNonConformities } from "@/hooks/useNonConformities";
import { useEquipmentRecords } from "@/hooks/useEquipmentRecords";
import { NcDialog } from "@/components/NcDialog";
import { EquipmentCard } from "@/components/EquipmentCard";
import { AreaDashboard } from "@/components/AreaDashboard";
import { PLANT_AREAS, PLANT_EQUIPMENT, type PlantEquipment } from "@/lib/mill-plant-data";
import {
  NonConformity, NCStatus, NCFormData,
  NC_STATUS_LABELS, NC_STATUS_COLORS,
  NC_SEVERITY_COLORS, NC_SEVERITY_LABELS,
  NC_ORIGIN_LABELS,
  OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS,
  type OperationalStatus, AssemblyActivity, NewActivityData,
  type AssemblyStep, type PunchListItem,
} from "@/lib/quality-types";

// Top-level areas only for the area filter
const TOP_AREAS = PLANT_AREAS.filter(a => a.parentCode === "1000");

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, colorClass, subLabel,
}: {
  label: string; value: number | string; icon: React.ElementType;
  colorClass: string; subLabel?: string;
}) {
  return (
    <div className={`bg-[#020617] border ${colorClass} p-4 flex flex-col gap-2 relative overflow-hidden group hover:bg-white/[0.02] transition-colors`}>
      <div className={`absolute top-0 left-0 w-0.5 h-full ${colorClass.replace("border-", "bg-")}`} />
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-display uppercase tracking-widest text-white/40">{label}</span>
        <Icon className={`w-4 h-4 ${colorClass.replace("border-", "text-")}`} />
      </div>
      <p className={`text-3xl font-display font-bold ${colorClass.replace("border-", "text-")}`}>{value}</p>
      {subLabel && <p className="text-[9px] font-mono-tech text-white/30">{subLabel}</p>}
    </div>
  );
}

// ─── NC Detail / Manage Dialog ───────────────────────────────────────────────
function NcManageDialog({
  nc,
  open,
  onOpenChange,
  onUpdateStatus,
}: {
  nc: NonConformity | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdateStatus: (ncId: string, status: NCStatus, obs?: string, rootCause?: string, correctionPlan?: string) => Promise<void>;
}) {
  const [newStatus, setNewStatus] = useState<NCStatus | "">("");
  const [obs, setObs] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctionPlan, setCorrectionPlan] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (nc) {
      setNewStatus("");
      setObs(nc.observations || "");
      setRootCause(nc.root_cause || "");
      setCorrectionPlan(nc.correction_plan || "");
    }
  }, [nc]);

  if (!nc) return null;

  const statusStyle = NC_STATUS_COLORS[nc.status];
  const sevStyle = NC_SEVERITY_COLORS[nc.severity];

  const handleSave = async () => {
    if (!newStatus) return;
    setSaving(true);
    await onUpdateStatus(nc.nc_id, newStatus as NCStatus, obs, rootCause, correctionPlan);
    setSaving(false);
    onOpenChange(false);
  };

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(nc.creation_date).getTime()) / 86400000
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#060d1a] border-red-500/20 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide p-0">
        {/* Header */}
        <div className="p-6 border-b border-red-500/10 bg-red-500/[0.03]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-red-400 font-display text-base uppercase tracking-widest leading-none mb-1">
                  {nc.nc_id}
                </DialogTitle>
                <p className="text-[10px] font-mono-tech text-white/40">{nc.project_code}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`text-[9px] font-display uppercase rounded-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                {NC_STATUS_LABELS[nc.status]}
              </Badge>
              <span className={`text-[9px] font-mono-tech ${sevStyle}`}>
                ⚡ {NC_SEVERITY_LABELS[nc.severity]}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Title and description */}
          <div>
            <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mb-2">Hallazgo</p>
            <h3 className="text-sm font-display font-medium text-white/90 mb-3">{nc.title}</h3>
            <p className="text-[11px] font-mono-tech text-white/60 leading-relaxed bg-white/[0.02] border border-white/5 p-3">
              {nc.description}
            </p>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: User, label: "Reportado por", val: nc.reported_by },
              { icon: Tag, label: "Origen", val: NC_ORIGIN_LABELS[nc.origin] },
              { icon: Calendar, label: "Apertura", val: new Date(nc.creation_date).toLocaleDateString("es-CO") },
              { icon: Clock, label: "Antigüedad", val: `${daysSinceCreation} días` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="bg-white/[0.02] border border-white/5 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3 h-3 text-white/30" />
                  <span className="text-[8px] font-display uppercase tracking-widest text-white/30">{label}</span>
                </div>
                <p className="text-[10px] font-mono-tech text-white/70">{val}</p>
              </div>
            ))}
          </div>

          {nc.related_equipment && (
            <div className="flex items-center gap-2 p-3 bg-orange-500/5 border border-orange-500/20">
              <Wrench className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] font-mono-tech text-orange-400">
                Equipo relacionado: <strong>{nc.related_equipment}</strong>
              </span>
            </div>
          )}

          {/* Existing root cause / plan if any */}
          {nc.root_cause && (
            <div className="space-y-1">
              <p className="text-[9px] font-display uppercase tracking-widest text-white/30">Causa Raíz Identificada</p>
              <p className="text-[11px] font-mono-tech text-white/60 bg-white/[0.02] border border-white/5 p-3 leading-relaxed">{nc.root_cause}</p>
            </div>
          )}
          {nc.correction_plan && (
            <div className="space-y-1">
              <p className="text-[9px] font-display uppercase tracking-widest text-white/30">Plan de Acción Correctiva</p>
              <p className="text-[11px] font-mono-tech text-white/60 bg-white/[0.02] border border-white/5 p-3 leading-relaxed">{nc.correction_plan}</p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/5 pt-4">
            <p className="text-[9px] font-display uppercase tracking-widest text-red-500/60 mb-4 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Actualizar Estado del Hallazgo
            </p>

            {/* New status select */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[9px] font-display uppercase tracking-widest text-white/40">Nuevo Estado *</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as NCStatus)}>
                <SelectTrigger className="bg-primary/[0.02] border-primary/20 h-9 rounded-none font-mono-tech text-xs">
                  <SelectValue placeholder="Seleccionar estado..." />
                </SelectTrigger>
                <SelectContent className="bg-[#020617] border-primary/20 rounded-none">
                  {(["en_proceso", "cerrado", "anulado"] as NCStatus[]).map((s) => (
                    <SelectItem key={s} value={s} className="font-mono-tech text-xs uppercase">
                      {NC_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Root cause */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[9px] font-display uppercase tracking-widest text-white/40">
                Causa Raíz (ISO 9001 — 8.7)
              </label>
              <Textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Describa la causa raíz identificada mediante análisis (5 Porqués, Ishikawa, etc.)..."
                className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/30 min-h-[80px] resize-none rounded-none font-mono-tech text-xs"
              />
            </div>

            {/* Correction plan */}
            <div className="space-y-1.5 mb-3">
              <label className="text-[9px] font-display uppercase tracking-widest text-white/40">
                Plan de Acción Correctiva (ISO 9001 — 10.2)
              </label>
              <Textarea
                value={correctionPlan}
                onChange={(e) => setCorrectionPlan(e.target.value)}
                placeholder="Describa las acciones correctivas, responsables, y fechas comprometidas..."
                className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/30 min-h-[80px] resize-none rounded-none font-mono-tech text-xs"
              />
            </div>

            {/* Observations */}
            <div className="space-y-1.5 mb-5">
              <label className="text-[9px] font-display uppercase tracking-widest text-white/40">Observaciones Adicionales</label>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Notas adicionales, evidencias, lecciones aprendidas..."
                className="bg-primary/[0.02] border-primary/20 focus-visible:border-red-500/50 focus-visible:ring-1 focus-visible:ring-red-500/30 min-h-[60px] resize-none rounded-none font-mono-tech text-xs"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-none border-white/10 text-white/40 hover:bg-white/5 font-display text-[9px] uppercase tracking-widest h-9"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!newStatus || saving}
                className="rounded-none bg-red-600 hover:bg-red-500 text-white font-display text-[9px] uppercase tracking-widest h-9 shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                {saving ? "Guardando..." : "Guardar Actualización"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Severity bar for visual breakdown ───────────────────────────────────────
function SeverityBar({ ncs }: { ncs: NonConformity[] }) {
  const counts = useMemo(() => {
    const totals = { baja: 0, media: 0, alta: 0, crítica: 0 };
    ncs.forEach((nc) => { if (nc.severity in totals) totals[nc.severity as keyof typeof totals]++; });
    return totals;
  }, [ncs]);
  const total = ncs.length || 1;

  const bars = [
    { key: "crítica", label: "Crítica", color: "bg-red-500" },
    { key: "alta", label: "Alta", color: "bg-orange-500" },
    { key: "media", label: "Media", color: "bg-yellow-500" },
    { key: "baja", label: "Baja", color: "bg-emerald-500" },
  ] as const;

  return (
    <div className="bg-[#020617] border border-white/5 p-4">
      <p className="text-[9px] font-display uppercase tracking-widest text-white/40 mb-3">Distribución por Severidad</p>
      <div className="flex h-2 rounded-none overflow-hidden w-full mb-3">
        {bars.map(({ key, color }) => (
          <div
            key={key}
            className={`${color} transition-all duration-700`}
            style={{ width: `${(counts[key] / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {bars.map(({ key, label, color }) => (
          <div key={key} className="text-center">
            <div className={`w-2 h-2 ${color} mx-auto mb-1`} />
            <p className="text-[8px] font-mono-tech text-white/40">{label}</p>
            <p className="text-sm font-display font-bold text-white/70">{counts[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function CalidadPage() {
  const { ncs, loading, fetchNcs, createNc, updateNcStatus, deleteNc } = useNonConformities();
  const {
    records, activities, loading: actLoading, uploadProgress,
    assemblySteps, stepsLoading, punchList, punchLoading,
    fetchAllRecords, updateOperationalStatus, fetchActivities, addActivity, updateActivity, deleteActivity, uploadActivityPhoto,
    fetchAssemblySteps, updateAssemblyStep, uploadStepPhoto,
    fetchPunchList, addPunchItem, updatePunchItem,
  } = useEquipmentRecords();

  // Map of tag → activities (for dashboard stats — only populated ones)
  const allActivitiesMap = useMemo<Record<string, AssemblyActivity[]>>(
    () => ({}),
    [],
  );

  // NC list state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<NCStatus | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isNcDialogOpen, setIsNcDialogOpen] = useState(false);
  const [selectedNc, setSelectedNc] = useState<NonConformity | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  // View mode + equipment card state
  const [viewMode, setViewMode] = useState<"ncs" | "equipos">("ncs");
  const [eqSearch, setEqSearch] = useState("");
  const [eqAreaFilter, setEqAreaFilter] = useState("all");
  const [eqStatusFilter, setEqStatusFilter] = useState<OperationalStatus | "all">("all");
  const [selectedEquipment, setSelectedEquipment] = useState<PlantEquipment | null>(null);
  const [equipCardOpen, setEquipCardOpen] = useState(false);

  useEffect(() => { fetchNcs(); fetchAllRecords(); }, [fetchNcs, fetchAllRecords]);

  const handleOpenEquipCard = useCallback(async (eq: PlantEquipment) => {
    setSelectedEquipment(eq);
    setEquipCardOpen(true);
    await Promise.all([
      fetchActivities(eq.tag),
      fetchAssemblySteps(eq.tag),
      fetchPunchList(eq.tag),
    ]);
  }, [fetchActivities, fetchAssemblySteps, fetchPunchList]);

  const handleCreateNcForEquip = useCallback(async (data: NCFormData): Promise<boolean> => {
    const res = await createNc(data);
    if (res) fetchNcs();
    return !!res;
  }, [createNc, fetchNcs]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = ncs.length;
    const abiertos = ncs.filter((n) => n.status === "abierto").length;
    const enProceso = ncs.filter((n) => n.status === "en_proceso").length;
    const cerrados = ncs.filter((n) => n.status === "cerrado").length;
    const criticas = ncs.filter((n) => n.severity === "crítica").length;
    const oldOpen = ncs.filter(
      (n) => n.status === "abierto" &&
        (Date.now() - new Date(n.creation_date).getTime()) > 7 * 86400000
    ).length;
    return { total, abiertos, enProceso, cerrados, criticas, oldOpen };
  }, [ncs]);

  // ── Filtered NC list ──
  const filtered = useMemo(() => {
    return ncs.filter((nc) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q ||
        nc.nc_id.toLowerCase().includes(q) ||
        nc.project_code.toLowerCase().includes(q) ||
        nc.title.toLowerCase().includes(q) ||
        (nc.related_equipment || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || nc.status === statusFilter;
      const matchSeverity = severityFilter === "all" || nc.severity === severityFilter;
      return matchSearch && matchStatus && matchSeverity;
    });
  }, [ncs, searchTerm, statusFilter, severityFilter]);

  // ── Filtered equipment list ──
  const filteredEquipment = useMemo(() => {
    return PLANT_EQUIPMENT.filter((eq) => {
      const q = eqSearch.toLowerCase();
      const matchSearch = !q ||
        eq.tag.toLowerCase().includes(q) ||
        eq.name.toLowerCase().includes(q) ||
        eq.areaName.toLowerCase().includes(q);
      const matchArea = eqAreaFilter === "all" || eq.areaCode === eqAreaFilter;
      const opStatus = records[eq.tag]?.operational_status ?? "sin_iniciar";
      const matchStatus = eqStatusFilter === "all" || opStatus === eqStatusFilter;
      return matchSearch && matchArea && matchStatus;
    });
  }, [eqSearch, eqAreaFilter, eqStatusFilter, records]);

  const handleManage = (nc: NonConformity) => {
    setSelectedNc(nc);
    setManageOpen(true);
  };

  const handleUpdateStatus = async (
    ncId: string, status: NCStatus, obs?: string, rootCause?: string, correctionPlan?: string
  ) => {
    await updateNcStatus(ncId, status, obs, rootCause, correctionPlan);
    fetchNcs();
  };

  // Eliminar NC y refrescar lista
  const handleDeleteNc = async (ncId: string) => {
    if (window.confirm("¿Seguro que deseas eliminar esta NC? Esta acción no se puede deshacer.")) {
      await deleteNc(ncId);
      fetchNcs();
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0E14]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden max-h-[calc(100vh-64px)]">
          <div className="flex flex-col h-full bg-[#020617] text-slate-300 overflow-y-auto scrollbar-hide">

            {/* ── HEADER ── */}
            <header className="flex-none p-6 pb-4 border-b border-red-500/10 bg-red-500/[0.02]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <h1 className="text-xl font-display font-medium tracking-widest text-red-500 uppercase">
                      Control de Calidad — SGC
                    </h1>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-mono-tech text-white/30 ml-11">
                    ISO 9001:2015 · ISO 10005:2018 · Aris Mining — MIL24.001
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* View mode toggle */}
                  <div className="flex border border-white/10 rounded-none">
                    <button
                      onClick={() => setViewMode("ncs")}
                      className={`px-3 h-9 text-[9px] font-display uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                        viewMode === "ncs"
                          ? "bg-red-600/20 text-red-400 border-r border-white/10"
                          : "text-white/30 hover:text-white/60 border-r border-white/10"
                      }`}
                    >
                      <ListFilter className="w-3 h-3" /> Hallazgos NC
                    </button>
                    <button
                      onClick={() => setViewMode("equipos")}
                      className={`px-3 h-9 text-[9px] font-display uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                        viewMode === "equipos"
                          ? "bg-orange-600/20 text-orange-400"
                          : "text-white/30 hover:text-white/60"
                      }`}
                    >
                      <LayoutGrid className="w-3 h-3" /> Equipos por Área
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { fetchNcs(); fetchAllRecords(); }}
                    className="h-9 rounded-none border-white/10 text-white/40 hover:bg-white/5 font-display text-[9px] uppercase tracking-widest"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Sincronizar
                  </Button>
                  <Button
                    onClick={() => setIsNcDialogOpen(true)}
                    className="h-9 rounded-none bg-red-600 hover:bg-red-500 text-white font-display text-[9px] tracking-widest uppercase shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Hallazgo
                  </Button>
                </div>
              </div>
            </header>

            <div className="flex-1 p-6 space-y-6">

              {/* ══════════════════════════════════════════════════════ */}
              {/* VISTA EQUIPOS POR ÁREA                                */}
              {/* ══════════════════════════════════════════════════════ */}
              {viewMode === "equipos" && (
                <div className="space-y-5">

                  {/* ── AREA DASHBOARD ── */}
                  <AreaDashboard
                    records={records}
                    ncs={ncs}
                    allActivities={allActivitiesMap}
                  />

                  {/* Filters */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="relative group flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-orange-400 transition-colors" />
                      <Input
                        placeholder="Buscar por TAG, nombre o área..."
                        value={eqSearch}
                        onChange={(e) => setEqSearch(e.target.value)}
                        className="pl-9 h-9 bg-white/[0.02] border-white/10 rounded-none focus-visible:ring-1 focus-visible:ring-orange-500/40 text-xs font-mono-tech placeholder:text-white/20"
                      />
                    </div>
                    <Select value={eqAreaFilter} onValueChange={setEqAreaFilter}>
                      <SelectTrigger className="w-[220px] h-9 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                        <SelectItem value="all" className="font-mono-tech text-xs">Todas las áreas</SelectItem>
                        {TOP_AREAS.map((a) => (
                          <SelectItem key={a.code} value={a.code} className="font-mono-tech text-xs">
                            {a.code} — {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={eqStatusFilter}
                      onValueChange={(v) => setEqStatusFilter(v as OperationalStatus | "all")}
                    >
                      <SelectTrigger className="w-[180px] h-9 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                        <SelectItem value="all" className="font-mono-tech text-xs">Todos los estados</SelectItem>
                        {(Object.keys(OPERATIONAL_STATUS_LABELS) as OperationalStatus[]).map((s) => (
                          <SelectItem key={s} value={s} className="font-mono-tech text-xs">
                            {OPERATIONAL_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] font-mono-tech text-white/30">
                      {filteredEquipment.length} / {PLANT_EQUIPMENT.length} equipos
                    </span>
                  </div>

                  {/* Equipment grid */}
                  {filteredEquipment.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/5 flex flex-col items-center gap-3">
                      <Wrench className="w-10 h-10 text-white/10" />
                      <p className="text-xs font-mono-tech text-white/20">Sin equipos para los filtros aplicados.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredEquipment.map((eq) => {
                        const record    = records[eq.tag];
                        const opStatus  = record?.operational_status ?? "sin_iniciar";
                        const statusSt  = OPERATIONAL_STATUS_COLORS[opStatus];
                        const eqNcs     = ncs.filter(n => n.related_equipment === eq.tag);
                        const openCount = eqNcs.filter(n => n.status === "abierto" || n.status === "en_proceso").length;
                        const critCount = eqNcs.filter(n => n.severity === "crítica" && n.status !== "cerrado" && n.status !== "anulado").length;

                        return (
                          <div
                            key={eq.tag}
                            className="bg-white/[0.01] border border-white/10 hover:border-orange-500/30 transition-all group flex flex-col"
                          >
                            {/* Color strip by operational status */}
                            <div className={`h-0.5 w-full ${statusSt.dot}`} />

                            <div className="p-4 flex-1 flex flex-col gap-3">
                              {/* TAG + status */}
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-xs font-display font-bold text-orange-400 tracking-wider">{eq.tag}</span>
                                  <p className="text-[10px] font-mono-tech text-white/60 mt-0.5 line-clamp-1">{eq.name}</p>
                                </div>
                                <Badge className={`text-[7px] font-display uppercase rounded-none flex-shrink-0 ${statusSt.bg} ${statusSt.text} ${statusSt.border}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusSt.dot} mr-1 inline-block`} />
                                  {OPERATIONAL_STATUS_LABELS[opStatus]}
                                </Badge>
                              </div>

                              {/* Area */}
                              <p className="text-[9px] font-mono-tech text-white/30">
                                {eq.areaCode} — {eq.areaName}
                              </p>

                              {/* NC badges */}
                              <div className="flex items-center gap-2">
                                {eqNcs.length === 0 ? (
                                  <span className="text-[9px] font-mono-tech text-white/20">Sin NCs registradas</span>
                                ) : (
                                  <>
                                    <Badge className="text-[8px] font-display uppercase rounded-none bg-white/5 text-white/50 border border-white/10">
                                      {eqNcs.length} NC total
                                    </Badge>
                                    {openCount > 0 && (
                                      <Badge className="text-[8px] font-display uppercase rounded-none bg-red-500/10 text-red-400 border border-red-500/30">
                                        {openCount} abierta{openCount > 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {critCount > 0 && (
                                      <Badge className="text-[8px] font-display uppercase rounded-none bg-red-600/20 text-red-300 border border-red-600/40 animate-pulse">
                                        {critCount} crítica{critCount > 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Footer action */}
                            <div className="border-t border-white/5 p-3 flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleOpenEquipCard(eq)}
                                className="h-7 rounded-none bg-orange-600/10 hover:bg-orange-600 border border-orange-500/20 text-orange-400 hover:text-white font-display text-[8px] uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100"
                              >
                                Ver Hoja de Vida →
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {viewMode === "ncs" && (
                <div className="space-y-6">

                  {/* ── KPI ROW ── */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <KpiCard label="Total NCs" value={kpis.total} icon={ClipboardList} colorClass="border-white/10" subLabel="En el sistema" />
                    <KpiCard label="Abiertas" value={kpis.abiertos} icon={AlertTriangle} colorClass="border-red-500/40" subLabel="Requieren acción" />
                    <KpiCard label="En Proceso" value={kpis.enProceso} icon={Activity} colorClass="border-blue-500/40" subLabel="Con plan activo" />
                    <KpiCard label="Cerradas" value={kpis.cerrados} icon={CheckCircle2} colorClass="border-emerald-500/40" subLabel="Correctamente" />
                    <KpiCard label="Críticas" value={kpis.criticas} icon={XCircle} colorClass="border-red-600/60" subLabel="Prioridad máxima" />
                    <KpiCard label="+7 días abiertas" value={kpis.oldOpen} icon={Clock} colorClass="border-orange-500/40" subLabel="Vencidas" />
                  </div>

                  {/* ── SEVERITY BAR ── */}
                  <SeverityBar ncs={ncs} />

                  {/* ── FILTERS ── */}
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="relative group flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-red-400 transition-colors" />
                      <Input
                        placeholder="Buscar por NC-ID, proyecto, título, equipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 bg-white/[0.02] border-white/10 rounded-none focus-visible:ring-1 focus-visible:ring-red-500/40 text-xs font-mono-tech placeholder:text-white/20"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as NCStatus | "all")}>
                      <SelectTrigger className="w-[160px] h-9 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                        <SelectItem value="all" className="font-mono-tech text-xs">Todos los estados</SelectItem>
                        {Object.entries(NC_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="w-[160px] h-9 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                        <SelectValue placeholder="Severidad" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                        <SelectItem value="all" className="font-mono-tech text-xs">Todas las severidades</SelectItem>
                        {Object.entries(NC_SEVERITY_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-[10px] font-mono-tech text-white/30">
                      {filtered.length} / {ncs.length} registros
                    </span>
                  </div>

                  {/* ── NC LIST ── */}
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="text-center space-y-3">
                        <ShieldAlert className="w-10 h-10 animate-pulse text-red-500/40 mx-auto" />
                        <p className="text-[10px] font-mono-tech text-white/30 uppercase tracking-widest">Cargando hallazgos...</p>
                      </div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-white/5 flex flex-col items-center">
                      <ShieldAlert className="w-10 h-10 text-white/10 mb-4" />
                      <p className="text-xs font-mono-tech text-white/20">
                        {searchTerm || statusFilter !== "all" || severityFilter !== "all"
                          ? "Sin resultados para los filtros aplicados."
                          : "No hay hallazgos registrados. El sistema de calidad está limpio."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((nc) => {
                        const statusStyle = NC_STATUS_COLORS[nc.status];
                        const sevStyle = NC_SEVERITY_COLORS[nc.severity];
                        const daysSince = Math.floor(
                          (Date.now() - new Date(nc.creation_date).getTime()) / 86400000
                        );
                        const isOverdue = nc.status === "abierto" && daysSince > 7;

                        return (
                          <div
                            key={nc.nc_id}
                            className={`bg-white/[0.01] border transition-all group relative ${
                              isOverdue ? "border-orange-500/30 hover:border-orange-500/50" :
                              nc.status === "cerrado" ? "border-white/5 hover:border-white/10" :
                              "border-white/10 hover:border-red-500/30"
                            }`}
                          >
                            {/* Severity indicator strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                              nc.severity === "crítica" ? "bg-red-500" :
                              nc.severity === "alta" ? "bg-orange-500" :
                              nc.severity === "media" ? "bg-yellow-500" : "bg-emerald-500"
                            }`} />

                            <div className="p-4 pl-5">
                              <div className="flex items-start justify-between gap-4">
                                {/* Left info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 flex-wrap mb-1">
                                    <span className="text-xs font-display font-bold text-red-400 tracking-wider">{nc.nc_id}</span>
                                    <Badge className={`text-[8px] font-display uppercase rounded-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                      {NC_STATUS_LABELS[nc.status]}
                                    </Badge>
                                    <span className={`text-[9px] font-mono-tech uppercase ${sevStyle}`}>
                                      {NC_SEVERITY_LABELS[nc.severity]}
                                    </span>
                                    {isOverdue && (
                                      <span className="text-[8px] font-display uppercase px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 animate-pulse">
                                        ⚠ VENCIDA {daysSince}d
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-[11px] font-mono-tech text-white/80 mb-2 line-clamp-1">{nc.title}</h3>
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span className="text-[9px] font-mono-tech text-white/30">
                                      📁 {nc.project_code}
                                    </span>
                                    <span className="text-[9px] font-mono-tech text-white/30">
                                      🏷️ {NC_ORIGIN_LABELS[nc.origin]}
                                    </span>
                                    {nc.related_equipment && (
                                      <span className="text-[9px] font-mono-tech text-orange-400/70 flex items-center gap-1">
                                        <Wrench className="w-3 h-3" />{nc.related_equipment}
                                      </span>
                                    )}
                                    <span className="text-[9px] font-mono-tech text-white/20">
                                      {new Date(nc.creation_date).toLocaleDateString("es-CO")}
                                    </span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {nc.status !== "cerrado" && nc.status !== "anulado" && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleManage(nc)}
                                      className="h-8 rounded-none bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all"
                                    >
                                      Gestionar
                                    </Button>
                                  )}
                                  {(nc.status === "cerrado" || nc.status === "anulado") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleManage(nc)}
                                      className="h-8 rounded-none border-white/10 text-white/30 hover:bg-white/5 font-display text-[9px] uppercase tracking-widest"
                                    >
                                      Ver Detalle
                                    </Button>
                                  )}
                                  {/* Botón eliminar NC */}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteNc(nc.nc_id)}
                                    className="h-8 rounded-none border-red-500/30 text-red-500 hover:bg-red-600/20 hover:text-white font-display text-[9px] uppercase tracking-widest"
                                    title="Eliminar NC"
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" /> Eliminar
                                  </Button>
                                </div>
                              </div>

                              {/* Progress indicator if has plan */}
                              {nc.correction_plan && (
                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                                  <span className="text-[9px] font-mono-tech text-emerald-500/60">
                                    Plan de acción registrado
                                  </span>
                                  {nc.root_cause && (
                                    <>
                                      <span className="text-white/10">·</span>
                                      <span className="text-[9px] font-mono-tech text-blue-400/60">Causa raíz documentada</span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* ── Equipment Life Record Dialog ── */}
      {selectedEquipment && (
        <EquipmentCard
          open={equipCardOpen}
          onOpenChange={(v) => { setEquipCardOpen(v); if (!v) setSelectedEquipment(null); }}
          equipment={selectedEquipment}
          record={records[selectedEquipment.tag]}
          activities={activities}
          activitiesLoading={actLoading}
          uploadProgress={uploadProgress}
          ncs={ncs.filter(n => n.related_equipment === selectedEquipment.tag)}
          assemblySteps={assemblySteps}
          stepsLoading={stepsLoading}
          punchList={punchList}
          punchLoading={punchLoading}
          onUpdateStatus={updateOperationalStatus}
          onAddActivity={addActivity}
          onUpdateActivity={updateActivity}
          onDeleteActivity={deleteActivity}
          onUploadPhoto={uploadActivityPhoto}
          onCreateNc={handleCreateNcForEquip}
          onDeleteNc={deleteNc}
          onUpdateStep={updateAssemblyStep}
          onUploadStepPhoto={uploadStepPhoto}
          onAddPunchItem={addPunchItem}
          onUpdatePunchItem={updatePunchItem}
        />
      )}

      {/* ── NEW NC Dialog ── */}
      <NcDialog
        open={isNcDialogOpen}
        onOpenChange={setIsNcDialogOpen}
        onSubmit={async (data: NCFormData) => {
          const res = await createNc(data);
          if (res) fetchNcs();
          return !!res;
        }}
      />

      {/* ── MANAGE Dialog ── */}
      <NcManageDialog
        nc={selectedNc}
        open={manageOpen}
        onOpenChange={setManageOpen}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
