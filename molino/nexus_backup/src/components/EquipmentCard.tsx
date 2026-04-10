"use client";

/**
 * EquipmentCard.tsx
 * Modal "Hoja de Vida" de equipo — 4 pestañas:
 *  1. ESPECIFICACIONES  — datos técnicos completos + documentos de referencia
 *  2. AVANCE DE MONTAJE — plan de etapas ponderado (% progreso) + fotos
 *  3. PENDIENTES        — punch list / registro de asuntos constructivos
 *  4. HALLAZGOS NC      — no conformidades vinculadas al equipo
 */

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wrench, ClipboardList, Settings2, Plus, ChevronRight,
  Calendar, User, CheckCircle2, AlertTriangle, X,
  Camera, Download, ShieldAlert, Image as ImageIcon, Loader2,
  Trash2, Eye, EyeOff, Edit2, Save, BookOpen, FileText,
  TrendingUp, ListTodo, Clock, BarChart3, Activity,
} from "lucide-react";

import type { PlantEquipment } from "@/lib/mill-plant-data";
import { MILL_ASSEMBLY_PLANS } from "@/lib/mill-plant-data";
import {
  OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS,
  ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_COLORS,
  NC_STATUS_LABELS, NC_STATUS_COLORS, NC_SEVERITY_COLORS, NC_SEVERITY_LABELS,
  NC_ORIGIN_LABELS,
  ASSEMBLY_STEP_STATUS_LABELS, ASSEMBLY_STEP_STATUS_COLORS,
  PUNCH_DISCIPLINE_LABELS, PUNCH_PRIORITY_LABELS, PUNCH_STATUS_LABELS,
  PUNCH_STATUS_COLORS, PUNCH_PRIORITY_COLORS,
  calcAssemblyProgress,
  type OperationalStatus, type ActivityType, type ActivityStatus,
  type NonConformity, type AssemblyActivity, type EquipmentRecord,
  type NewActivityData, type AssemblyStep, type AssemblyStepStatus,
  type PunchListItem, type PunchDiscipline, type PunchPriority, type PunchStatus,
} from "@/lib/quality-types";
import { NcDialog } from "@/components/NcDialog";
import type { NCFormData } from "@/lib/quality-types";
import { exportEquipmentHojaDeVida } from "@/lib/excel-equipment";

// ─── Props ────────────────────────────────────────────────────────────────────
interface EquipmentCardProps {
  open:                  boolean;
  onOpenChange:          (v: boolean) => void;
  equipment:             PlantEquipment;
  record?:               EquipmentRecord;
  activities:            AssemblyActivity[];
  activitiesLoading:     boolean;
  uploadProgress:        number | null;
  ncs:                   NonConformity[];
  assemblySteps:         AssemblyStep[];
  stepsLoading:          boolean;
  punchList:             PunchListItem[];
  punchLoading:          boolean;
  onUpdateStatus:        (tag: string, status: OperationalStatus) => Promise<void>;
  onAddActivity:         (tag: string, data: NewActivityData) => Promise<string | null>;
  onUpdateActivity:      (tag: string, activityId: string, data: Partial<NewActivityData>) => Promise<boolean>;
  onDeleteActivity:      (tag: string, activityId: string) => Promise<boolean>;
  onUploadPhoto:         (tag: string, activityId: string, file: File) => Promise<string | null>;
  onCreateNc:            (data: NCFormData) => Promise<boolean>;
  onDeleteNc?:           (id: string) => Promise<void>;
  onUpdateStep:          (tag: string, stepId: string, data: Partial<AssemblyStep>) => Promise<boolean>;
  onUploadStepPhoto:     (tag: string, stepId: string, file: File) => Promise<string | null>;
  onAddPunchItem:        (tag: string, data: Omit<PunchListItem, "id" | "equipment_tag" | "created_at" | "created_by" | "created_by_uid">) => Promise<string | null>;
  onUpdatePunchItem:     (tag: string, itemId: string, data: Partial<PunchListItem>) => Promise<boolean>;
}

type Tab = "specs" | "avance" | "pendientes" | "hallazgos";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[9px] font-display uppercase tracking-widest text-white/30 w-44 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] font-mono-tech text-white/70 flex-1">{value}</span>
    </div>
  );
}

function ProgressBar({ pct, colorClass = "bg-orange-500" }: { pct: number; colorClass?: string }) {
  return (
    <div className="h-2 bg-white/5 rounded-none overflow-hidden w-full">
      <div
        className={`h-full ${colorClass} transition-all duration-700`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const EMPTY_ACTIVITY: NewActivityData = {
  type: "inspeccion", description: "", responsible: "",
  date: new Date().toISOString().split("T")[0],
  status: "pendiente", observations: "",
};

// ─── Main component ───────────────────────────────────────────────────────────
export function EquipmentCard({
  open, onOpenChange,
  equipment, record, activities, activitiesLoading, uploadProgress, ncs,
  assemblySteps, stepsLoading, punchList, punchLoading,
  onUpdateStatus, onAddActivity, onUpdateActivity, onDeleteActivity, onUploadPhoto,
  onCreateNc, onDeleteNc, onUpdateStep, onUploadStepPhoto,
  onAddPunchItem, onUpdatePunchItem,
}: EquipmentCardProps) {

  const [activeTab,    setActiveTab]    = useState<Tab>("specs");
  const [newStatus,    setNewStatus]    = useState<OperationalStatus | "">("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [showActForm,  setShowActForm]  = useState(false);
  const [actForm,      setActForm]      = useState<NewActivityData>(EMPTY_ACTIVITY);
  const [savingAct,    setSavingAct]    = useState(false);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [exporting,    setExporting]    = useState(false);
  const [hideClosed,   setHideClosed]   = useState(true);
  const photoInputRef    = useRef<HTMLInputElement>(null);
  const stepPhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetId,    setPhotoTargetId]    = useState<string | null>(null);
  const [stepPhotoTarget,  setStepPhotoTarget]  = useState<string | null>(null);

  // Edit activity
  const [editingActId,  setEditingActId]  = useState<string | null>(null);
  const [editForm,      setEditForm]      = useState<NewActivityData>(EMPTY_ACTIVITY);
  const [updatingAct,   setUpdatingAct]   = useState(false);

  // Step state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [stepEditForm,  setStepEditForm]  = useState<Partial<AssemblyStep>>({});
  const [savingStep,    setSavingStep]    = useState(false);

  // Punch list state
  const [showPunchForm, setShowPunchForm]  = useState(false);
  const [punchForm, setPunchForm] = useState<{
    description: string; discipline: PunchDiscipline; priority: PunchPriority;
    responsible: string; due_date: string; root_cause: string; corrective_action: string;
  }>({
    description: "", discipline: "mecanica", priority: "B",
    responsible: "", due_date: "", root_cause: "", corrective_action: "",
  });
  const [savingPunch,  setSavingPunch]   = useState(false);
  const [punchFilter,  setPunchFilter]   = useState<PunchStatus | "all">("all");

  // Derived
  const statusStyle  = OPERATIONAL_STATUS_COLORS[record?.operational_status ?? "sin_iniciar"];
  const currentLabel = OPERATIONAL_STATUS_LABELS[record?.operational_status ?? "sin_iniciar"];
  const equipmentNcs = ncs.filter(n => n.related_equipment === equipment.tag);
  const openNcs      = equipmentNcs.filter(n => n.status === "abierto" || n.status === "en_proceso");
  const displayedNcs = hideClosed ? equipmentNcs.filter(n => n.status !== "cerrado") : equipmentNcs;
  const closedCount  = equipmentNcs.filter(n => n.status === "cerrado").length;

  // Assembly progress
  const staticPlan  = MILL_ASSEMBLY_PLANS[equipment.tag] ?? [];
  const progress    = calcAssemblyProgress(assemblySteps.length > 0 ? assemblySteps : []);
  const stepsToShow: AssemblyStep[] = assemblySteps.length > 0 ? assemblySteps : staticPlan.map((s, i) => ({
    id: `static-${i}`, equipment_tag: equipment.tag,
    step_number: s.step_number, title: s.title, description: s.description,
    weight_pct: s.weight_pct, status: "pendiente" as AssemblyStepStatus,
    iom_ref: s.iom_ref, proc_ref: s.proc_ref,
    responsible: undefined, start_date: undefined, completion_date: undefined,
    photo_urls: undefined, photo_paths: undefined, observations: undefined,
    updated_by: undefined, updated_at: undefined,
  }));

  const completedSteps  = assemblySteps.filter(s => s.status === "completado").length;
  const inProgressSteps = assemblySteps.filter(s => s.status === "en_proceso").length;
  const punchOpen       = punchList.filter(p => p.status === "abierto").length;
  const punchGestion    = punchList.filter(p => p.status === "en_gestion").length;
  const filteredPunch   = punchFilter === "all" ? punchList : punchList.filter(p => p.status === punchFilter);

  // ── Status save ─────────────────────────────────────────────────────────
  const handleStatusSave = async () => {
    if (!newStatus) return;
    setSavingStatus(true);
    await onUpdateStatus(equipment.tag, newStatus as OperationalStatus);
    setNewStatus("");
    setSavingStatus(false);
  };

  // ── Add activity ────────────────────────────────────────────────────────
  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actForm.description || !actForm.responsible || !actForm.date) return;
    setSavingAct(true);
    const id = await onAddActivity(equipment.tag, actForm);
    if (id) { setActForm(EMPTY_ACTIVITY); setShowActForm(false); }
    setSavingAct(false);
  };

  // ── Edit activity ────────────────────────────────────────────────────────
  const handleEditClick = (act: AssemblyActivity) => {
    setEditingActId(act.id);
    setEditForm({ type: act.type, description: act.description, responsible: act.responsible, date: act.date, status: act.status, observations: act.observations || "" });
  };
  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActId) return;
    setUpdatingAct(true);
    const ok = await onUpdateActivity(equipment.tag, editingActId, editForm);
    if (ok) setEditingActId(null);
    setUpdatingAct(false);
  };
  const handleDeleteActivity = async (actId: string) => {
    if (window.confirm("¿Eliminar este registro de actividad?")) await onDeleteActivity(equipment.tag, actId);
  };

  // ── Photo upload (activity) ─────────────────────────────────────────────
  const handlePhotoClick = (actId: string) => { setPhotoTargetId(actId); photoInputRef.current?.click(); };
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetId) return;
    await onUploadPhoto(equipment.tag, photoTargetId, file);
    e.target.value = "";
    setPhotoTargetId(null);
  };

  // ── Step actions ─────────────────────────────────────────────────────────
  const handleStepEdit = (step: AssemblyStep) => {
    setEditingStepId(step.id);
    setStepEditForm({ status: step.status, responsible: step.responsible || "", completion_date: step.completion_date || "", observations: step.observations || "" });
  };
  const handleStepSave = async () => {
    if (!editingStepId) return;
    setSavingStep(true);
    await onUpdateStep(equipment.tag, editingStepId, { ...stepEditForm, updated_at: new Date().toISOString() });
    setSavingStep(false);
    setEditingStepId(null);
  };
  const handleStepPhotoClick = (stepId: string) => { setStepPhotoTarget(stepId); stepPhotoInputRef.current?.click(); };
  const handleStepPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !stepPhotoTarget) return;
    await onUploadStepPhoto(equipment.tag, stepPhotoTarget, file);
    e.target.value = "";
    setStepPhotoTarget(null);
  };

  // ── Punch list actions ───────────────────────────────────────────────────
  const handleAddPunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!punchForm.description) return;
    setSavingPunch(true);
    await onAddPunchItem(equipment.tag, {
      description: punchForm.description,
      discipline: punchForm.discipline,
      priority: punchForm.priority,
      responsible: punchForm.responsible || undefined,
      due_date: punchForm.due_date || undefined,
      root_cause: punchForm.root_cause || undefined,
      corrective_action: punchForm.corrective_action || undefined,
      status: "abierto",
    });
    setPunchForm({ description: "", discipline: "mecanica", priority: "B", responsible: "", due_date: "", root_cause: "", corrective_action: "" });
    setShowPunchForm(false);
    setSavingPunch(false);
  };

  // ── Excel export ─────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEquipmentHojaDeVida(equipment, record, activities, ncs, assemblySteps, punchList);
    } finally {
      setExporting(false);
    }
  };

  const ncInitialData: Partial<NCFormData> = { project_code: "MIL24.001", related_equipment: equipment.tag };

  const TAB_CONFIG: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "specs",      label: "Especificaciones",    icon: Settings2    },
    { id: "avance",     label: "Avance Montaje",      icon: TrendingUp,  badge: stepsToShow.length > 0 ? Math.round(progress) : undefined },
    { id: "pendientes", label: "Pendientes",           icon: ListTodo,    badge: punchOpen + punchGestion > 0 ? punchOpen + punchGestion : undefined },
    { id: "hallazgos",  label: "Hallazgos NC",         icon: ShieldAlert, badge: equipmentNcs.length > 0 ? equipmentNcs.length : undefined },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#060d1a] border-orange-500/20 max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0">

          {/* ── HEADER ──────────────────────────────────────────────── */}
          <DialogHeader className="p-5 border-b border-orange-500/10 bg-orange-500/[0.02] flex-none">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-orange-400 font-display text-base uppercase tracking-widest leading-none">
                      {equipment.tag}
                    </DialogTitle>
                    <Badge className={`text-[8px] font-display uppercase rounded-none ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} mr-1.5 inline-block`} />
                      {currentLabel}
                    </Badge>
                    {openNcs.length > 0 && (
                      <Badge className="text-[8px] font-display uppercase rounded-none bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
                        {openNcs.length} NC{openNcs.length > 1 ? "s" : ""} abierta{openNcs.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] font-mono-tech text-white/50 mt-0.5">{equipment.name}</p>
                  <p className="text-[9px] font-mono-tech text-white/30">{equipment.areaName} · {equipment.discipline}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {/* Progress mini badge */}
                {staticPlan.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/10">
                    <BarChart3 className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-display font-bold text-orange-400">{Math.round(progress)}%</span>
                    <span className="text-[9px] font-mono-tech text-white/30">avance</span>
                  </div>
                )}
                {/* Export */}
                <Button size="sm" onClick={handleExport} disabled={exporting}
                  className="h-8 rounded-none bg-emerald-600/10 hover:bg-emerald-600 border border-emerald-500/20 text-emerald-400 hover:text-white font-display text-[8px] uppercase tracking-widest transition-all disabled:opacity-40">
                  <Download className="w-3 h-3 mr-1" />
                  {exporting ? "..." : "Excel"}
                </Button>
                {/* Status changer */}
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OperationalStatus)}>
                  <SelectTrigger className="w-[140px] h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-[10px]">
                    <SelectValue placeholder="Cambiar estado..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                    {(Object.keys(OPERATIONAL_STATUS_LABELS) as OperationalStatus[]).map((s) => (
                      <SelectItem key={s} value={s} className="font-mono-tech text-xs">
                        {OPERATIONAL_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleStatusSave} disabled={!newStatus || savingStatus}
                  className="h-8 rounded-none bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all disabled:opacity-30">
                  {savingStatus ? "..." : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* ── TABS ────────────────────────────────────────────────── */}
          <div className="flex border-b border-white/5 flex-none overflow-x-auto scrollbar-hide">
            {TAB_CONFIG.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`px-4 py-3 text-[9px] font-display uppercase tracking-widest transition-colors relative flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === id ? "text-orange-400" : "text-white/30 hover:text-white/60"
                }`}>
                <Icon className="w-3 h-3" />
                {label}
                {badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[7px] font-bold">
                    {badge}{id === "avance" ? "%" : ""}
                  </span>
                )}
                {activeTab === id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ─────────────────────────────────────────── */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5">

              {/* ══ TAB 1: ESPECIFICACIONES ══════════════════════════ */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  {/* Identificación */}
                  <div>
                    <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60 mb-2">◆  Identificación del Equipo</p>
                    <div className="space-y-0">
                      <SpecRow label="TAG"                  value={equipment.tag} />
                      <SpecRow label="Nombre"               value={equipment.name} />
                      <SpecRow label="Área WBS"             value={`${equipment.areaCode} — ${equipment.areaName}`} />
                      <SpecRow label="Categoría"            value={equipment.category} />
                      <SpecRow label="Disciplina"           value={equipment.discipline} />
                      <SpecRow label="Fabricante Típico"    value={equipment.typicalManufacturer} />
                      <SpecRow label="Modelo"               value={equipment.model} />
                      <SpecRow label="Proveedor"            value={equipment.supplier} />
                      <SpecRow label="Orden de Compra"      value={equipment.purchaseOrder} />
                    </div>
                  </div>

                  {/* Datos técnicos */}
                  {(equipment.weightKg || equipment.dimensions || equipment.motorPowerKw || equipment.voltageV || equipment.capacityDesign) && (
                    <div>
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60 mb-2">◆  Datos Técnicos</p>
                      <div className="space-y-0">
                        <SpecRow label="Descripción Técnica"  value={equipment.description} />
                        <SpecRow label="Dimensiones"          value={equipment.dimensions} />
                        <SpecRow label="Peso Total"           value={equipment.weightKg} />
                        <SpecRow label="Potencia Motor"       value={equipment.motorPowerKw} />
                        <SpecRow label="Voltaje"              value={equipment.voltageV} />
                        <SpecRow label="Capacidad de Diseño"  value={equipment.capacityDesign} />
                      </div>
                    </div>
                  )}

                  {/* Documentos de referencia */}
                  {(equipment.docIngenieria || equipment.pid || equipment.iomManual || equipment.procedureRef) && (
                    <div>
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60 mb-2">◆  Documentos de Referencia</p>
                      <div className="space-y-0">
                        <SpecRow label="Doc. de Ingeniería" value={equipment.docIngenieria} />
                        <SpecRow label="P&ID"               value={equipment.pid} />
                        <SpecRow label="Manual IOM"         value={equipment.iomManual} />
                        <SpecRow label="Procedimiento"      value={equipment.procedureRef} />
                      </div>
                    </div>
                  )}

                  {equipment.remarks && (
                    <div>
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60 mb-2">◆  Observaciones</p>
                      <p className="text-[11px] font-mono-tech text-white/60 bg-white/[0.02] border border-white/5 p-3">{equipment.remarks}</p>
                    </div>
                  )}

                  {/* Estado operacional (Firebase) */}
                  {record && (
                    <div>
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60 mb-2">◆  Estado Operacional</p>
                      <div className="space-y-0">
                        <SpecRow label="Estado Operacional"   value={OPERATIONAL_STATUS_LABELS[record.operational_status]} />
                        <SpecRow label="Última Actualización" value={new Date(record.last_updated).toLocaleString("es-CO")} />
                        <SpecRow label="Actualizado por"      value={record.updated_by} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB 2: AVANCE DE MONTAJE ══════════════════════════ */}
              {activeTab === "avance" && (
                <div className="space-y-5">
                  {/* Progress dashboard */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/[0.02] border border-orange-500/20 p-3 text-center">
                      <p className="text-3xl font-display font-bold text-orange-400">{Math.round(progress)}%</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">Avance Global</p>
                    </div>
                    <div className="bg-white/[0.02] border border-emerald-500/20 p-3 text-center">
                      <p className="text-3xl font-display font-bold text-emerald-400">{completedSteps}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">Etapas Completadas</p>
                    </div>
                    <div className="bg-white/[0.02] border border-yellow-500/20 p-3 text-center">
                      <p className="text-3xl font-display font-bold text-yellow-400">{inProgressSteps}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">En Proceso</p>
                    </div>
                    <div className="bg-white/[0.02] border border-slate-500/20 p-3 text-center">
                      <p className="text-3xl font-display font-bold text-slate-400">{stepsToShow.length - completedSteps - inProgressSteps}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">Pendientes</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-display uppercase tracking-widest text-white/40">Progreso Ponderado</span>
                      <span className="text-[10px] font-display font-bold text-orange-400">{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar pct={progress} />
                    <div className="flex gap-4 mt-1">
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-400 inline-block" /><span className="text-[9px] font-mono-tech text-white/30">Completado</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-yellow-400 inline-block" /><span className="text-[9px] font-mono-tech text-white/30">En Proceso (50%)</span></div>
                      <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-slate-600 inline-block" /><span className="text-[9px] font-mono-tech text-white/30">Pendiente</span></div>
                    </div>
                  </div>

                  {/* Step list */}
                  {stepsLoading ? (
                    <div className="text-center py-10 animate-pulse">
                      <p className="text-[10px] font-mono-tech text-white/30 uppercase tracking-widest">Cargando etapas...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stepsToShow.map((step) => {
                        const sc = ASSEMBLY_STEP_STATUS_COLORS[step.status];
                        const isEditing = editingStepId === step.id;
                        return (
                          <div key={step.id} className={`border ${sc.border} bg-white/[0.01] overflow-hidden`}>
                            {/* Step header */}
                            <div className="flex items-start gap-3 p-3">
                              <div className="flex-shrink-0 w-7 h-7 bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                <span className="text-[10px] font-display font-bold text-orange-400">{step.step_number}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-[11px] font-display font-bold text-white/80">{step.title}</p>
                                  <Badge className={`text-[7px] font-display uppercase rounded-none ${sc.bg} ${sc.text} ${sc.border}`}>
                                    <span className={`w-1 h-1 rounded-full ${sc.dot} mr-1 inline-block`} />
                                    {ASSEMBLY_STEP_STATUS_LABELS[step.status]}
                                  </Badge>
                                  <span className="text-[9px] font-mono-tech text-orange-400/60">{step.weight_pct}% peso</span>
                                </div>
                                <p className="text-[10px] font-mono-tech text-white/40 mt-1 line-clamp-2">{step.description}</p>
                                {(step.iom_ref || step.proc_ref) && (
                                  <div className="flex gap-3 mt-1 flex-wrap">
                                    {step.iom_ref && <span className="text-[8px] font-mono-tech text-blue-400/60">📄 {step.iom_ref}</span>}
                                    {step.proc_ref && <span className="text-[8px] font-mono-tech text-purple-400/60">📋 {step.proc_ref}</span>}
                                  </div>
                                )}
                                {step.responsible && (
                                  <p className="text-[9px] font-mono-tech text-white/30 mt-1">
                                    <User className="w-2.5 h-2.5 inline mr-1" />{step.responsible}
                                    {step.completion_date && <><Calendar className="w-2.5 h-2.5 inline ml-2 mr-1" />{step.completion_date}</>}
                                  </p>
                                )}
                                {step.observations && (
                                  <p className="text-[9px] font-mono-tech text-white/40 mt-1 italic">{step.observations}</p>
                                )}
                                {/* Step photos */}
                                {step.photo_urls && step.photo_urls.length > 0 && (
                                  <div className="flex gap-1 mt-2 flex-wrap">
                                    {step.photo_urls.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="w-10 h-10 border border-white/10 overflow-hidden hover:border-orange-500/50 transition-colors">
                                        <img src={url} alt={`foto ${i+1}`} className="w-full h-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Step actions */}
                              {!step.id.startsWith("static-") && (
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <button onClick={() => handleStepPhotoClick(step.id)}
                                    className="w-6 h-6 flex items-center justify-center border border-white/10 hover:border-blue-500/50 text-white/30 hover:text-blue-400 transition-colors">
                                    <Camera className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleStepEdit(step as AssemblyStep)}
                                    className="w-6 h-6 flex items-center justify-center border border-white/10 hover:border-orange-500/50 text-white/30 hover:text-orange-400 transition-colors">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                              {step.id.startsWith("static-") && (
                                <div className="flex-shrink-0">
                                  <span className="text-[8px] font-mono-tech text-white/20">Sin iniciar en BD</span>
                                </div>
                              )}
                            </div>

                            {/* Edit form */}
                            {isEditing && (
                              <div className="border-t border-orange-500/20 bg-orange-500/[0.02] p-3 space-y-2">
                                <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/60">Actualizar etapa {step.step_number}</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[8px] uppercase tracking-widest text-white/30">Estado</label>
                                    <Select value={stepEditForm.status || "pendiente"} onValueChange={v => setStepEditForm(p => ({ ...p, status: v as AssemblyStepStatus }))}>
                                      <SelectTrigger className="h-7 text-[10px] bg-white/5 rounded-none mt-0.5"><SelectValue /></SelectTrigger>
                                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                                        {(Object.entries(ASSEMBLY_STEP_STATUS_LABELS)).map(([k, v]) => (
                                          <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-widest text-white/30">Responsable</label>
                                    <Input value={stepEditForm.responsible || ""} onChange={e => setStepEditForm(p => ({ ...p, responsible: e.target.value }))}
                                      className="h-7 text-[10px] bg-white/5 rounded-none mt-0.5" placeholder="Nombre" />
                                  </div>
                                  <div>
                                    <label className="text-[8px] uppercase tracking-widest text-white/30">Fecha completado</label>
                                    <Input type="date" value={stepEditForm.completion_date || ""} onChange={e => setStepEditForm(p => ({ ...p, completion_date: e.target.value }))}
                                      className="h-7 text-[10px] bg-white/5 rounded-none mt-0.5" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-widest text-white/30">Observaciones</label>
                                  <Textarea value={stepEditForm.observations || ""} onChange={e => setStepEditForm(p => ({ ...p, observations: e.target.value }))}
                                    className="text-[10px] bg-white/5 rounded-none mt-0.5 min-h-[50px] resize-none" placeholder="Notas técnicas..." />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditingStepId(null)}
                                    className="h-6 text-[8px] uppercase tracking-widest rounded-none">Cancelar</Button>
                                  <Button size="sm" onClick={handleStepSave} disabled={savingStep}
                                    className="h-6 bg-orange-600 hover:bg-orange-500 text-[8px] uppercase tracking-widest rounded-none">
                                    {savingStep ? "..." : "Guardar"}
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* Progress bar per step */}
                            <div className={`h-0.5 w-full ${step.status === "completado" ? "bg-emerald-500" : step.status === "en_proceso" ? "bg-yellow-500" : "bg-white/5"}`} />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <input ref={stepPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleStepPhotoChange} />
                </div>
              )}

              {/* ══ TAB 3: PENDIENTES CONSTRUCTIVOS ══════════════════ */}
              {activeTab === "pendientes" && (
                <div className="space-y-4">
                  {/* KPI row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-500/5 border border-red-500/20 p-3 text-center">
                      <p className="text-2xl font-display font-bold text-red-400">{punchOpen}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">Abiertos</p>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-3 text-center">
                      <p className="text-2xl font-display font-bold text-yellow-400">{punchGestion}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">En Gestión</p>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
                      <p className="text-2xl font-display font-bold text-emerald-400">{punchList.filter(p => p.status === "cerrado").length}</p>
                      <p className="text-[9px] font-display uppercase tracking-widest text-white/30 mt-1">Cerrados</p>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center justify-between">
                    <Select value={punchFilter} onValueChange={v => setPunchFilter(v as PunchStatus | "all")}>
                      <SelectTrigger className="w-[180px] h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-[10px]">
                        <SelectValue placeholder="Filtrar estado..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                        <SelectItem value="all" className="font-mono-tech text-xs">Todos</SelectItem>
                        {(Object.entries(PUNCH_STATUS_LABELS)).map(([k, v]) => (
                          <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => setShowPunchForm(v => !v)}
                      className="h-8 rounded-none bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all">
                      {showPunchForm ? <><X className="w-3 h-3 mr-1.5" />Cancelar</> : <><Plus className="w-3 h-3 mr-1.5" />Nuevo Pendiente</>}
                    </Button>
                  </div>

                  {/* Punch form */}
                  {showPunchForm && (
                    <form onSubmit={handleAddPunch} className="border border-orange-500/20 bg-orange-500/[0.02] p-4 space-y-3">
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/70">Registrar Asunto Pendiente</p>
                      <Textarea required value={punchForm.description}
                        onChange={e => setPunchForm(p => ({ ...p, description: e.target.value }))}
                        className="bg-white/[0.02] border-white/10 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/30 min-h-[70px] resize-none rounded-none font-mono-tech text-xs"
                        placeholder="Describa el asunto pendiente..." />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Disciplina *</label>
                          <Select value={punchForm.discipline} onValueChange={v => setPunchForm(p => ({ ...p, discipline: v as PunchDiscipline }))}>
                            <SelectTrigger className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                              {(Object.entries(PUNCH_DISCIPLINE_LABELS)).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Prioridad *</label>
                          <Select value={punchForm.priority} onValueChange={v => setPunchForm(p => ({ ...p, priority: v as PunchPriority }))}>
                            <SelectTrigger className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                              {(Object.entries(PUNCH_PRIORITY_LABELS)).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Responsable</label>
                          <Input value={punchForm.responsible} onChange={e => setPunchForm(p => ({ ...p, responsible: e.target.value }))}
                            className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs" placeholder="Nombre responsable" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Fecha Límite</label>
                          <Input type="date" value={punchForm.due_date} onChange={e => setPunchForm(p => ({ ...p, due_date: e.target.value }))}
                            className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Causa / Acción Correctiva</label>
                        <Textarea value={punchForm.corrective_action} onChange={e => setPunchForm(p => ({ ...p, corrective_action: e.target.value }))}
                          className="bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs min-h-[50px] resize-none"
                          placeholder="Descripción de la acción correctiva propuesta..." />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingPunch}
                          className="h-8 rounded-none bg-orange-600 hover:bg-orange-500 text-white font-display text-[9px] uppercase tracking-widest shadow-[0_0_12px_rgba(234,88,12,0.3)] disabled:opacity-50">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          {savingPunch ? "Guardando..." : "Registrar Pendiente"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Punch list */}
                  {punchLoading ? (
                    <div className="text-center py-10 animate-pulse">
                      <p className="text-[10px] font-mono-tech text-white/30 uppercase tracking-widest">Cargando pendientes...</p>
                    </div>
                  ) : filteredPunch.length === 0 ? (
                    <div className="border border-dashed border-white/5 py-12 flex flex-col items-center gap-3">
                      <ListTodo className="w-8 h-8 text-white/10" />
                      <p className="text-[10px] font-mono-tech text-white/20 uppercase tracking-widest">
                        {punchFilter === "all" ? "Sin asuntos pendientes registrados" : "Sin asuntos con este estado"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPunch.map((item, idx) => {
                        const sc = PUNCH_STATUS_COLORS[item.status];
                        const pc = PUNCH_PRIORITY_COLORS[item.priority];
                        return (
                          <div key={item.id} className={`border ${sc.border} bg-white/[0.01] p-3`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                <Badge className={`text-[8px] font-display font-black uppercase rounded-none ${pc.bg} ${pc.text} ${pc.border} px-2`}>
                                  {item.priority}
                                </Badge>
                                <span className="text-[8px] font-mono-tech text-white/20">{String(idx + 1).padStart(3, "0")}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge className={`text-[7px] font-display uppercase rounded-none ${sc.bg} ${sc.text} ${sc.border}`}>
                                    {PUNCH_STATUS_LABELS[item.status]}
                                  </Badge>
                                  <span className="text-[9px] font-mono-tech text-white/40">{PUNCH_DISCIPLINE_LABELS[item.discipline]}</span>
                                </div>
                                <p className="text-[11px] font-mono-tech text-white/70">{item.description}</p>
                                {item.corrective_action && (
                                  <p className="text-[9px] font-mono-tech text-white/40 mt-1">↳ {item.corrective_action}</p>
                                )}
                                <div className="flex gap-3 mt-1 flex-wrap">
                                  {item.responsible && <span className="text-[9px] font-mono-tech text-white/30"><User className="w-2.5 h-2.5 inline mr-1" />{item.responsible}</span>}
                                  {item.due_date && <span className="text-[9px] font-mono-tech text-white/30"><Calendar className="w-2.5 h-2.5 inline mr-1" />{item.due_date}</span>}
                                  <span className="text-[9px] font-mono-tech text-white/20">{new Date(item.created_at).toLocaleDateString("es-CO")}</span>
                                </div>
                              </div>
                              {/* Close action */}
                              {item.status !== "cerrado" && (
                                <div className="flex gap-1 flex-shrink-0">
                                  {item.status === "abierto" && (
                                    <button onClick={() => onUpdatePunchItem(equipment.tag, item.id, { status: "en_gestion" })}
                                      className="text-[8px] px-2 py-1 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 font-display uppercase">
                                      Gestión
                                    </button>
                                  )}
                                  <button onClick={() => onUpdatePunchItem(equipment.tag, item.id, { status: "cerrado", closed_at: new Date().toISOString() })}
                                    className="text-[8px] px-2 py-1 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-display uppercase">
                                    Cerrar
                                  </button>
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

              {/* ══ TAB 4: HALLAZGOS NC ══════════════════════════════ */}
              {activeTab === "hallazgos" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {closedCount > 0 && (
                        <button onClick={() => setHideClosed(v => !v)}
                          className="flex items-center gap-1.5 text-[9px] font-display uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
                          {hideClosed ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {hideClosed ? `Ver ${closedCount} cerradas` : "Ocultar cerradas"}
                        </button>
                      )}
                    </div>
                    <Button size="sm" onClick={() => setNcDialogOpen(true)}
                      className="h-8 rounded-none bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all">
                      <Plus className="w-3 h-3 mr-1.5" />Nueva NC
                    </Button>
                  </div>

                  {displayedNcs.length === 0 ? (
                    <div className="border border-dashed border-white/5 py-12 flex flex-col items-center gap-3">
                      <ShieldAlert className="w-8 h-8 text-white/10" />
                      <p className="text-[10px] font-mono-tech text-white/20 uppercase tracking-widest">
                        {equipmentNcs.length === 0 ? "Sin hallazgos NC registrados" : "No hay NCs activas"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayedNcs.map((nc) => {
                        const s = NC_STATUS_COLORS[nc.status];
                        const sevC = NC_SEVERITY_COLORS[nc.severity];
                        return (
                          <div key={nc.nc_id} className={`border ${s.border} bg-white/[0.01] p-3`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <Badge className={`text-[8px] font-display uppercase rounded-none ${s.bg} ${s.text} ${s.border}`}>
                                  {NC_STATUS_LABELS[nc.status]}
                                </Badge>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-[10px] font-display font-bold text-white/80">{nc.nc_id}</span>
                                  <span className={`text-[9px] font-display font-bold ${sevC}`}>{NC_SEVERITY_LABELS[nc.severity]}</span>
                                  <span className="text-[9px] font-mono-tech text-white/30">{NC_ORIGIN_LABELS[nc.origin]}</span>
                                </div>
                                <p className="text-[11px] font-mono-tech text-white/70 font-bold">{nc.title}</p>
                                <p className="text-[10px] font-mono-tech text-white/50 mt-0.5 line-clamp-2">{nc.description}</p>
                                <div className="flex gap-3 mt-1 flex-wrap">
                                  <span className="text-[9px] font-mono-tech text-white/30">
                                    <User className="w-2.5 h-2.5 inline mr-1" />{nc.reported_by}
                                  </span>
                                  <span className="text-[9px] font-mono-tech text-white/30">
                                    <Calendar className="w-2.5 h-2.5 inline mr-1" />
                                    {new Date(nc.creation_date).toLocaleDateString("es-CO")}
                                  </span>
                                  {nc.target_date && (
                                    <span className="text-[9px] font-mono-tech text-orange-400/60">
                                      <Clock className="w-2.5 h-2.5 inline mr-1" />Cierre: {nc.target_date}
                                    </span>
                                  )}
                                </div>
                                {nc.correction_plan && (
                                  <p className="text-[9px] font-mono-tech text-white/30 mt-1 italic line-clamp-1">↳ {nc.correction_plan}</p>
                                )}
                              </div>
                              {onDeleteNc && (
                                <button onClick={() => window.confirm("¿Eliminar esta NC?") && onDeleteNc(nc.nc_id)}
                                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
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
          </ScrollArea>

          {/* Hidden inputs */}
          <input ref={photoInputRef}     type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          <input ref={stepPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleStepPhotoChange} />
        </DialogContent>
      </Dialog>

      <NcDialog
        open={ncDialogOpen}
        onOpenChange={setNcDialogOpen}
        onSubmit={onCreateNc}
        initialData={ncInitialData}
      />
    </>
  );
}
