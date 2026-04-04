"use client";

/**
 * EquipmentCard.tsx
 * Modal "Hoja de Vida" de equipo — 3 pestañas:
 *  1. Especificaciones técnicas
 *  2. Actividades de Montaje (con fotos)
 *  3. Hallazgos NC (con registro por equipo)
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
  Trash2, Eye, EyeOff, Edit2, Save,
} from "lucide-react";

import type { PlantEquipment } from "@/lib/mill-plant-data";
import {
  OPERATIONAL_STATUS_LABELS, OPERATIONAL_STATUS_COLORS,
  ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_COLORS,
  NC_STATUS_LABELS, NC_STATUS_COLORS, NC_SEVERITY_COLORS, NC_SEVERITY_LABELS,
  NC_ORIGIN_LABELS,
  type OperationalStatus, type ActivityType, type ActivityStatus,
  type NonConformity, type AssemblyActivity, type EquipmentRecord,
  type NewActivityData,
} from "@/lib/quality-types";
import { NcDialog } from "@/components/NcDialog";
import type { NCFormData } from "@/lib/quality-types";
import { exportEquipmentHojaDeVida } from "@/lib/excel-equipment";

// ─── Props ────────────────────────────────────────────────────────────────────
interface EquipmentCardProps {
  open:             boolean;
  onOpenChange:     (v: boolean) => void;
  equipment:        PlantEquipment;
  record?:          EquipmentRecord;
  activities:       AssemblyActivity[];
  activitiesLoading: boolean;
  uploadProgress:   number | null;
  ncs:              NonConformity[];
  onUpdateStatus:   (tag: string, status: OperationalStatus) => Promise<void>;
  onAddActivity:    (tag: string, data: NewActivityData) => Promise<string | null>;
  onUpdateActivity: (tag: string, activityId: string, data: Partial<NewActivityData>) => Promise<boolean>;
  onDeleteActivity: (tag: string, activityId: string) => Promise<boolean>;
  onUploadPhoto:    (tag: string, activityId: string, file: File) => Promise<string | null>;
  onCreateNc:       (data: NCFormData) => Promise<boolean>;
  onDeleteNc?:      (id: string) => Promise<void>;
}

type Tab = "specs" | "actividades" | "hallazgos";
const TAB_LABELS: Record<Tab, string> = {
  specs:       "Especificaciones",
  actividades: "Actividades de Montaje",
  hallazgos:   "Hallazgos NC",
};

function SpecRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-[9px] font-display uppercase tracking-widest text-white/30 w-44 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-[11px] font-mono-tech text-white/70">{value}</span>
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
  onUpdateStatus, onAddActivity, onUpdateActivity, onDeleteActivity, onUploadPhoto, onCreateNc, onDeleteNc,
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoTargetId, setPhotoTargetId] = useState<string | null>(null);

  const statusStyle  = OPERATIONAL_STATUS_COLORS[record?.operational_status ?? "sin_iniciar"];
  const currentLabel = OPERATIONAL_STATUS_LABELS[record?.operational_status ?? "sin_iniciar"];
  const equipmentNcs = ncs.filter(n => n.related_equipment === equipment.tag);
  const openNcs      = equipmentNcs.filter(n => n.status === "abierto" || n.status === "en_proceso");
  
  // Filtrar NCs según el toggle de cerrados
  const displayedNcs = hideClosed 
    ? equipmentNcs.filter(n => n.status !== "cerrado")
    : equipmentNcs;

  const closedCount = equipmentNcs.filter(n => n.status === "cerrado").length;

  // ── Status save ────────────────────────────────────────────────────────
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

  // ── Edit activity ──────────────────────────────────────────────────────
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editForm, setEditForm]         = useState<NewActivityData>(EMPTY_ACTIVITY);
  const [updatingAct, setUpdatingAct]   = useState(false);

  const handleEditClick = (act: AssemblyActivity) => {
    setEditingActId(act.id);
    setEditForm({
      type: act.type,
      description: act.description,
      responsible: act.responsible,
      date: act.date,
      status: act.status,
      observations: act.observations || "",
    });
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
    if (window.confirm("¿Está seguro de eliminar este registro de actividad?")) {
      await onDeleteActivity(equipment.tag, actId);
    }
  };

  // ── Photo upload ────────────────────────────────────────────────────────
  const handlePhotoClick = (actId: string) => {
    setPhotoTargetId(actId);
    photoInputRef.current?.click();
  };
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoTargetId) return;
    await onUploadPhoto(equipment.tag, photoTargetId, file);
    e.target.value = "";
    setPhotoTargetId(null);
  };

  // ── Excel export ────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEquipmentHojaDeVida(equipment, record, activities, ncs);
    } finally {
      setExporting(false);
    }
  };

  // ── NC creation (pre-filled with equipment TAG) ─────────────────────────
  const ncInitialData: Partial<NCFormData> = {
    project_code:      "MIL24.001",
    related_equipment: equipment.tag,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#060d1a] border-orange-500/20 max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0">

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

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Export button */}
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
          <div className="flex border-b border-white/5 flex-none">
            {(["specs", "actividades", "hallazgos"] as Tab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-[9px] font-display uppercase tracking-widest transition-colors relative ${
                  activeTab === tab ? "text-orange-400" : "text-white/30 hover:text-white/60"
                }`}>
                {tab === "hallazgos" && equipmentNcs.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[7px] flex items-center justify-center text-white font-bold">
                    {equipmentNcs.length}
                  </span>
                )}
                {TAB_LABELS[tab]}
                {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400" />}
              </button>
            ))}
          </div>

          {/* ── TAB CONTENT ─────────────────────────────────────────── */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-5">

              {/* ── SPECS ──────────────────────────────────────────── */}
              {activeTab === "specs" && (
                <div className="space-y-1">
                  <SpecRow label="TAG"                  value={equipment.tag} />
                  <SpecRow label="Nombre"               value={equipment.name} />
                  <SpecRow label="Área WBS"             value={`${equipment.areaCode} — ${equipment.areaName}`} />
                  <SpecRow label="Categoría"            value={equipment.category} />
                  <SpecRow label="Disciplina"           value={equipment.discipline} />
                  <SpecRow label="Descripción Técnica"  value={equipment.description} />
                  <SpecRow label="Fabricante Típico"    value={equipment.typicalManufacturer} />
                  {record && (
                    <>
                      <div className="border-t border-white/5 my-3" />
                      <SpecRow label="Estado Operacional"   value={OPERATIONAL_STATUS_LABELS[record.operational_status]} />
                      <SpecRow label="Última Actualización" value={new Date(record.last_updated).toLocaleString("es-CO")} />
                      <SpecRow label="Actualizado por"      value={record.updated_by} />
                    </>
                  )}
                </div>
              )}

              {/* ── ACTIVIDADES ────────────────────────────────────── */}
              {activeTab === "actividades" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setShowActForm(v => !v)}
                      className="h-8 rounded-none bg-orange-600/20 hover:bg-orange-600 border border-orange-500/30 text-orange-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all">
                      {showActForm ? <><X className="w-3 h-3 mr-1.5" />Cancelar</> : <><Plus className="w-3 h-3 mr-1.5" />Nueva Actividad</>}
                    </Button>
                  </div>

                  {/* Activity form */}
                  {showActForm && (
                    <form onSubmit={handleAddActivity} className="border border-orange-500/20 bg-orange-500/[0.02] p-4 space-y-3">
                      <p className="text-[9px] font-display uppercase tracking-widest text-orange-400/70">
                        Registrar Actividad de Montaje
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Tipo *</label>
                          <Select value={actForm.type} onValueChange={(v) => setActForm(p => ({ ...p, type: v as ActivityType }))}>
                            <SelectTrigger className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                              {(Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][]).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Estado *</label>
                          <Select value={actForm.status} onValueChange={(v) => setActForm(p => ({ ...p, status: v as ActivityStatus }))}>
                            <SelectTrigger className="h-8 bg-white/[0.02] border-white/10 rounded-none font-mono-tech text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                              {(Object.entries(ACTIVITY_STATUS_LABELS) as [ActivityStatus, string][]).map(([k, v]) => (
                                <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Descripción *</label>
                        <Textarea required value={actForm.description}
                          onChange={e => setActForm(p => ({ ...p, description: e.target.value }))}
                          className="bg-white/[0.02] border-white/10 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/30 min-h-[70px] resize-none rounded-none font-mono-tech text-xs"
                          placeholder="Describa la actividad realizada..." />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Responsable *</label>
                          <Input required value={actForm.responsible}
                            onChange={e => setActForm(p => ({ ...p, responsible: e.target.value }))}
                            className="h-8 bg-white/[0.02] border-white/10 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/30 rounded-none font-mono-tech text-xs"
                            placeholder="Nombre del responsable" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Fecha *</label>
                          <Input required type="date" value={actForm.date}
                            onChange={e => setActForm(p => ({ ...p, date: e.target.value }))}
                            className="h-8 bg-white/[0.02] border-white/10 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/30 rounded-none font-mono-tech text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-display uppercase tracking-widest text-white/30">Observaciones</label>
                        <Textarea value={actForm.observations || ""}
                          onChange={e => setActForm(p => ({ ...p, observations: e.target.value }))}
                          className="bg-white/[0.02] border-white/10 focus-visible:border-orange-500/50 focus-visible:ring-1 focus-visible:ring-orange-500/30 min-h-[50px] resize-none rounded-none font-mono-tech text-xs"
                          placeholder="Notas adicionales..." />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={savingAct}
                          className="h-8 rounded-none bg-orange-600 hover:bg-orange-500 text-white font-display text-[9px] uppercase tracking-widest shadow-[0_0_12px_rgba(234,88,12,0.3)] transition-all disabled:opacity-50">
                          <CheckCircle2 className="w-3 h-3 mr-1.5" />
                          {savingAct ? "Guardando..." : "Registrar Actividad"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Hidden photo input */}
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />

                  {/* Upload progress */}
                  {uploadProgress !== null && (
                    <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <div className="flex-1">
                        <div className="h-1.5 bg-white/5 rounded-none overflow-hidden">
                          <div className="h-full bg-blue-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                      <span className="text-[9px] font-mono-tech text-blue-400">{uploadProgress}%</span>
                    </div>
                  )}

                  {/* Activity list */}
                  {activitiesLoading ? (
                    <div className="text-center py-10">
                      <p className="text-[10px] font-mono-tech text-white/30 uppercase tracking-widest animate-pulse">Cargando actividades...</p>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="border border-dashed border-white/5 py-12 flex flex-col items-center gap-3">
                      <ClipboardList className="w-8 h-8 text-white/10" />
                      <p className="text-[10px] font-mono-tech text-white/20 uppercase tracking-widest">Sin actividades de montaje registradas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div key={act.id} className="border border-white/5 bg-white/[0.01] p-3">
                          {editingActId === act.id ? (
                            <form onSubmit={handleUpdateActivity} className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={editForm.type} onValueChange={(v) => setEditForm(p => ({ ...p, type: v as ActivityType }))}>
                                  <SelectTrigger className="h-7 text-[10px] bg-white/5 rounded-none"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                                    {(Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][]).map(([k, v]) => (
                                      <SelectItem key={k} value={k} className="text-[10px]">{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={editForm.status} onValueChange={(v) => setEditForm(p => ({ ...p, status: v as ActivityStatus }))}>
                                  <SelectTrigger className="h-7 text-[10px] bg-white/5 rounded-none"><SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-[#020617] border-white/10 rounded-none">
                                    {(Object.entries(ACTIVITY_STATUS_LABELS) as [ActivityStatus, string][]).map(([k, v]) => (
                                      <SelectItem key={k} value={k} className="text-[10px]">{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                className="min-h-[60px] text-[11px] bg-white/5 rounded-none font-mono-tech" />
                              <div className="grid grid-cols-2 gap-2">
                                <Input value={editForm.responsible} onChange={e => setEditForm(p => ({ ...p, responsible: e.target.value }))}
                                  className="h-7 text-[10px] bg-white/5 rounded-none font-mono-tech" />
                                <Input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))}
                                  className="h-7 text-[10px] bg-white/5 rounded-none font-mono-tech" />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button size="sm" type="button" variant="ghost" onClick={() => setEditingActId(null)}
                                  className="h-7 text-[9px] uppercase tracking-widest rounded-none">Cancelar</Button>
                                <Button size="sm" type="submit" disabled={updatingAct}
                                  className="h-7 bg-orange-600 hover:bg-orange-500 text-[9px] uppercase tracking-widest rounded-none">
                                  {updatingAct ? "..." : "Actualizar"}
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 pt-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  act.status === "completado" ? "bg-emerald-400" :
                                  act.status === "en_proceso"  ? "bg-yellow-400" : "bg-slate-400"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-display uppercase tracking-widest text-orange-400/70">
                                      {ACTIVITY_TYPE_LABELS[act.type] ?? act.type}
                                    </span>
                                    <Badge className={`text-[7px] font-display uppercase rounded-none ${ACTIVITY_STATUS_COLORS[act.status]}`}>
                                      {ACTIVITY_STATUS_LABELS[act.status]}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => handlePhotoClick(act.id)}
                                      disabled={uploadProgress !== null}
                                      className="h-6 w-6 p-0 rounded-none text-white/30 hover:text-blue-400">
                                      <Camera className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleEditClick(act)}
                                      className="h-6 w-6 p-0 rounded-none text-white/30 hover:text-orange-400">
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteActivity(act.id)}
                                      className="h-6 w-6 p-0 rounded-none text-white/30 hover:text-red-500">
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-[11px] font-mono-tech text-white/70 mb-1.5">{act.description}</p>
                                {act.observations && (
                                  <p className="text-[10px] font-mono-tech text-white/40 italic mb-1.5">{act.observations}</p>
                                )}
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="flex items-center gap-1 text-[9px] font-mono-tech text-white/30">
                                    <User className="w-2.5 h-2.5" /> {act.responsible}
                                  </span>
                                  <span className="flex items-center gap-1 text-[9px] font-mono-tech text-white/30">
                                    <Calendar className="w-2.5 h-2.5" /> {act.date}
                                  </span>
                                  {(act.photo_urls?.length ?? 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[9px] font-mono-tech text-blue-400/70">
                                      <ImageIcon className="w-2.5 h-2.5" /> {act.photo_urls!.length} foto(s)
                                    </span>
                                  )}
                                </div>
                                {(act.photo_urls?.length ?? 0) > 0 && (
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {act.photo_urls!.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                        className="w-14 h-14 border border-white/10 overflow-hidden hover:border-orange-500/40 transition-colors block">
                                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── HALLAZGOS NC ────────────────────────────────────── */}
              {activeTab === "hallazgos" && (
                <div className="space-y-3">
                  {/* Register NC button for this equipment and toggle for closed findings */}
                  <div className="flex items-center justify-between gap-3">
                    {closedCount > 0 && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setHideClosed(v => !v)}
                        className="h-8 rounded-none border border-white/10 text-white/40 hover:text-white/70 font-display text-[8px] uppercase tracking-widest px-3"
                      >
                        {hideClosed ? (
                          <><Eye className="w-3 h-3 mr-1.5" /> Mostrar cerrados ({closedCount})</>
                        ) : (
                          <><EyeOff className="w-3 h-3 mr-1.5" /> Ocultar cerrados</>
                        )}
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button size="sm" onClick={() => setNcDialogOpen(true)}
                      className="h-8 rounded-none bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-display text-[9px] uppercase tracking-widest transition-all">
                      <ShieldAlert className="w-3 h-3 mr-1.5" />
                      Registrar Hallazgo NC
                    </Button>
                  </div>

                  {displayedNcs.length === 0 ? (
                    <div className="border border-dashed border-white/5 py-12 flex flex-col items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500/20" />
                      <p className="text-[10px] font-mono-tech text-white/20 uppercase tracking-widest">
                        Sin hallazgos registrados para {equipment.tag}
                      </p>
                    </div>
                  ) : (
                    equipmentNcs.map((nc) => {
                      const st  = NC_STATUS_COLORS[nc.status];
                      const sev = NC_SEVERITY_COLORS[nc.severity];
                      const days = Math.floor((Date.now() - new Date(nc.creation_date).getTime()) / 86400000);
                      return (
                        <div key={nc.nc_id} className={`border p-3 pl-4 relative ${st.border} bg-white/[0.01]`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                            nc.severity === "crítica" ? "bg-red-500" :
                            nc.severity === "alta"    ? "bg-orange-500" :
                            nc.severity === "media"   ? "bg-yellow-500" : "bg-emerald-500"
                          }`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-display font-bold text-red-400 tracking-wider">{nc.nc_id}</span>
                                <Badge className={`text-[7px] font-display uppercase rounded-none ${st.bg} ${st.text} ${st.border}`}>
                                  {NC_STATUS_LABELS[nc.status]}
                                </Badge>
                                <span className={`text-[9px] font-mono-tech uppercase ${sev}`}>
                                  {NC_SEVERITY_LABELS[nc.severity]}
                                </span>
                              </div>
                              <p className="text-[11px] font-mono-tech text-white/70 mb-1">{nc.title}</p>
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[9px] font-mono-tech text-white/30">{NC_ORIGIN_LABELS[nc.origin]}</span>
                                <span className="text-[9px] font-mono-tech text-white/30">
                                  {new Date(nc.creation_date).toLocaleDateString("es-CO")} · {days}d
                                </span>
                                <span className="text-[9px] font-mono-tech text-white/30">{nc.reported_by}</span>
                              </div>
                            </div>

                            {onDeleteNc && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm(`¿Está seguro de eliminar el hallazgo ${nc.nc_id}? Esta acción no se puede deshacer.`)) {
                                    onDeleteNc(nc.nc_id);
                                  }
                                }}
                                title="Eliminar este hallazgo (si fue creado por error)"
                                className="h-8 w-8 p-0 rounded-none border border-white/5 text-white/10 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                          {(nc.root_cause || nc.correction_plan) && (
                            <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-3">
                              {nc.root_cause && (
                                <span className="text-[9px] font-mono-tech text-blue-400/60 flex items-center gap-1">
                                  <ChevronRight className="w-2.5 h-2.5" /> Causa raíz documentada
                                </span>
                              )}
                              {nc.correction_plan && (
                                <span className="text-[9px] font-mono-tech text-emerald-500/60 flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Plan de acción registrado
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* NC Dialog pre-filled with equipment TAG */}
      <NcDialog
        open={ncDialogOpen}
        onOpenChange={setNcDialogOpen}
        onSubmit={onCreateNc}
        initialData={ncInitialData}
      />
    </>
  );
}
