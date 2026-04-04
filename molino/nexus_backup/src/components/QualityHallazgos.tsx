'use client';

/**
 * QualityHallazgos.tsx
 * Sistema de No Conformidades organizado por Área WBS y Equipo
 * ARIS Mining — MIL24.001 / Marmato Lower Mine
 */

import { useState, useMemo } from 'react';
import {
  collection, addDoc, serverTimestamp,
  query, where, orderBy,
} from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  PLANT_AREAS, PLANT_EQUIPMENT,
  NC_CATEGORIES, EQUIPMENT_CATEGORY_LABELS,
  type PlantArea, type PlantEquipment, type NCCategory,
} from '@/lib/mill-plant-data';
import {
  NC_SEVERITY_LABELS, NC_ORIGIN_LABELS,
  NC_STATUS_LABELS, NC_STATUS_COLORS, NC_SEVERITY_COLORS,
  type NCSeverity, type NCOrigin, type NCStatus,
} from '@/lib/quality-types';
import {
  ShieldAlert, Plus, ChevronRight, Wrench, Zap, Pipette,
  Building2, HardHat, Search, AlertTriangle, CheckCircle2,
  Clock, X, FileText, Filter,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVE_PROJECT = 'default-nexus-project';
const PROJECT_REF    = 'ARIS MINING — MIL24.001';

/** Top-level areas only (parentCode = "1000") — shown as area cards */
const TOP_AREAS = PLANT_AREAS.filter(a => a.parentCode === '1000');

/** Discipline icon mapping */
function DisciplineIcon({ discipline, className = 'w-3 h-3' }: { discipline: string; className?: string }) {
  if (discipline.toLowerCase().includes('eléc')) return <Zap className={className} />;
  if (discipline.toLowerCase().includes('civil')) return <Building2 className={className} />;
  if (discipline.toLowerCase().includes('pip')) return <Pipette className={className} />;
  if (discipline.toLowerCase().includes('inst')) return <HardHat className={className} />;
  return <Wrench className={className} />;
}

/** Area color by code */
function areaColor(code: string): string {
  const n = parseInt(code);
  if (n < 1200) return 'border-slate-500/30 bg-slate-500/5 text-slate-300';
  if (n < 1400) return 'border-orange-500/30 bg-orange-500/5 text-orange-300';
  if (n < 1600) return 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300';
  if (n < 1800) return 'border-violet-500/30 bg-violet-500/5 text-violet-300';
  if (n < 2000) return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300';
  if (n < 2200) return 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300';
  if (n < 2400) return 'border-blue-500/30 bg-blue-500/5 text-blue-300';
  return 'border-primary/20 bg-primary/5 text-primary/70';
}

/** Severity badge styles */
const SEVERITY_BADGE: Record<NCSeverity, string> = {
  baja:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  media:    'bg-yellow-500/15  text-yellow-400  border-yellow-500/30',
  alta:     'bg-orange-500/15  text-orange-400  border-orange-500/30',
  crítica:  'bg-red-500/20     text-red-400     border-red-500/40',
};

// ─── Extended NC document saved to Firestore ──────────────────────────────────
interface NcDocument {
  id: string;
  nc_number: string;
  project_code: string;
  project_ref: string;
  area_code: string;
  area_name: string;
  equipment_tag: string;
  equipment_name: string;
  nc_category_id: string;
  nc_category_name: string;
  discipline: string;
  title: string;
  description: string;
  severity: NCSeverity;
  origin: NCOrigin;
  status: NCStatus;
  norm_reference: string;
  corrective_action: string;
  assigned_to: string;
  target_date: string;
  reported_by: string;
  reported_by_uid: string;
  created_at: any;
  closed_at?: any;
  observations: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function QualityHallazgos() {
  const firestore = useFirestore();
  const { user }  = useUser();
  const { toast } = useToast();

  const [selectedArea,      setSelectedArea]      = useState<PlantArea | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<PlantEquipment | null>(null);
  const [dialogOpen,        setDialogOpen]        = useState(false);
  const [searchArea,        setSearchArea]        = useState('');
  const [searchEquip,       setSearchEquip]       = useState('');
  const [filterStatus,      setFilterStatus]      = useState<NCStatus | 'all'>('all');

  // ── Firestore subscription: NCs for selected area ──
  const ncsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedArea) return null;
    return query(
      collection(firestore, 'projects', ACTIVE_PROJECT, 'non_conformances'),
      where('area_code', '==', selectedArea.code),
      orderBy('created_at', 'desc'),
    );
  }, [firestore, selectedArea]);

  const { data: allNcs, isLoading: ncsLoading } = useCollection<NcDocument>(ncsQuery);

  // Equipment for selected area
  const areaEquipment = useMemo(() =>
    selectedArea ? PLANT_EQUIPMENT.filter(e => e.areaCode === selectedArea.code) : [],
    [selectedArea]
  );

  // Filtered equipment by search
  const filteredEquipment = useMemo(() =>
    areaEquipment.filter(e =>
      !searchEquip ||
      e.name.toLowerCase().includes(searchEquip.toLowerCase()) ||
      e.tag.toLowerCase().includes(searchEquip.toLowerCase())
    ),
    [areaEquipment, searchEquip]
  );

  // NCs per equipment (for badge counts)
  const ncsByEquipment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const nc of allNcs ?? []) {
      map[nc.equipment_tag] = (map[nc.equipment_tag] ?? 0) + 1;
    }
    return map;
  }, [allNcs]);

  // NCs for selected equipment (with status filter)
  const equipmentNcs = useMemo(() => {
    if (!allNcs || !selectedEquipment) return [];
    return allNcs.filter(nc =>
      nc.equipment_tag === selectedEquipment.tag &&
      (filterStatus === 'all' || nc.status === filterStatus)
    );
  }, [allNcs, selectedEquipment, filterStatus]);

  // Filtered top areas by search
  const filteredAreas = useMemo(() =>
    TOP_AREAS.filter(a =>
      !searchArea ||
      a.name.toLowerCase().includes(searchArea.toLowerCase()) ||
      a.code.includes(searchArea)
    ),
    [searchArea]
  );

  // NC count per area (open only)
  const openNcsByArea = useMemo(() => {
    // We'll count from all fetched NCs + a simple map (area level counts need server aggregation,
    // but for the selected area we have data; for others we show nothing or a placeholder)
    return {} as Record<string, number>;
  }, []);

  const handleOpenDialog = (equipment: PlantEquipment) => {
    setSelectedEquipment(equipment);
    setDialogOpen(true);
  };

  const handleEquipmentSelect = (equipment: PlantEquipment) => {
    setSelectedEquipment(prev => prev?.tag === equipment.tag ? null : equipment);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-full min-h-[600px]">

      {/* ══ LEFT: Area selector ══════════════════════════════════ */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/30" />
          <Input
            value={searchArea}
            onChange={e => setSearchArea(e.target.value)}
            placeholder="Buscar área..."
            className="pl-8 bg-[#0B1018] border-primary/15 text-xs font-mono h-8"
          />
        </div>

        <ScrollArea className="h-[560px] pr-1">
          <div className="space-y-1.5">
            {filteredAreas.map(area => {
              const eqCount   = PLANT_EQUIPMENT.filter(e => e.areaCode === area.code).length;
              const isSelected = selectedArea?.code === area.code;
              const colors     = areaColor(area.code);

              return (
                <button
                  key={area.code}
                  onClick={() => {
                    setSelectedArea(isSelected ? null : area);
                    setSelectedEquipment(null);
                    setSearchEquip('');
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? `${colors} ring-1 ring-current/30`
                      : 'border-primary/10 bg-primary/[0.02] hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`font-mono text-[10px] font-bold uppercase tracking-wider ${isSelected ? '' : 'text-primary/60'}`}>
                        {area.code}
                      </p>
                      <p className={`text-[11px] font-medium mt-0.5 leading-tight ${isSelected ? '' : 'text-primary/50'}`}>
                        {area.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${isSelected ? colors : 'bg-primary/5 border-primary/10 text-primary/30'}`}>
                        {eqCount} eq.
                      </span>
                      <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90 text-cyan-400' : 'text-primary/20'}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ══ RIGHT: Equipment + NCs ═══════════════════════════════ */}
      <div className="space-y-4 min-w-0">

        {!selectedArea ? (
          <div className="flex flex-col items-center justify-center h-[560px] border border-dashed border-primary/10 rounded-xl bg-primary/[0.01]">
            <ShieldAlert className="w-10 h-10 text-primary/15 mb-3" />
            <p className="font-mono text-[11px] text-primary/30 uppercase tracking-wider text-center">
              Seleccione un área WBS para<br />ver equipos y gestionar hallazgos
            </p>
            <p className="font-mono text-[9px] text-primary/20 mt-2">{TOP_AREAS.length} áreas disponibles</p>
          </div>
        ) : (
          <>
            {/* Area header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${areaColor(selectedArea.code)}`}>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-widest opacity-70">{selectedArea.code}</p>
                <p className="font-mono text-sm font-bold">{selectedArea.name}</p>
                <p className="font-mono text-[9px] opacity-60 mt-0.5">{selectedArea.description}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] opacity-60">Equipos</p>
                <p className="font-mono text-xl font-bold">{areaEquipment.length}</p>
              </div>
            </div>

            {/* Equipment search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/30" />
              <Input
                value={searchEquip}
                onChange={e => setSearchEquip(e.target.value)}
                placeholder="Buscar equipo por tag o nombre..."
                className="pl-8 bg-[#0B1018] border-primary/15 text-xs font-mono h-8"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">

              {/* Equipment cards */}
              <ScrollArea className="h-[460px] pr-1">
                <div className="space-y-2">
                  {filteredEquipment.length === 0 ? (
                    <div className="text-center py-8 text-primary/30 font-mono text-[11px]">
                      Sin equipos para este criterio
                    </div>
                  ) : filteredEquipment.map(eq => {
                    const ncCount   = ncsByEquipment[eq.tag] ?? 0;
                    const isActive  = selectedEquipment?.tag === eq.tag;
                    return (
                      <div
                        key={eq.tag}
                        onClick={() => handleEquipmentSelect(eq)}
                        className={`group relative border rounded-lg p-3 cursor-pointer transition-all ${
                          isActive
                            ? 'border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20'
                            : 'border-primary/10 bg-[#05080C] hover:border-primary/25 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`mt-0.5 p-1.5 rounded border shrink-0 ${isActive ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-primary/5 border-primary/10 text-primary/40'}`}>
                              <DisciplineIcon discipline={eq.discipline} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-mono text-[10px] font-bold tracking-wider ${isActive ? 'text-red-400' : 'text-cyan-400/70'}`}>
                                  {eq.tag}
                                </span>
                                <span className="font-mono text-[8px] text-primary/30 border border-primary/10 px-1.5 py-0.5 rounded">
                                  {EQUIPMENT_CATEGORY_LABELS[eq.category] ?? eq.category}
                                </span>
                              </div>
                              <p className={`text-[11px] font-medium mt-0.5 ${isActive ? 'text-primary/90' : 'text-primary/70'}`}>
                                {eq.name}
                              </p>
                              <p className="text-[9px] text-primary/35 font-mono mt-0.5 line-clamp-1">
                                {eq.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {ncCount > 0 && (
                              <span className="text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                                {ncCount} NC
                              </span>
                            )}
                            <Button
                              size="sm"
                              onClick={e => { e.stopPropagation(); handleOpenDialog(eq); }}
                              className="h-7 px-2 text-[9px] font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Plus className="w-3 h-3 mr-1" />NC
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* NC List for selected equipment */}
              {selectedEquipment && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-[9px] text-primary/40 uppercase">Hallazgos — {selectedEquipment.tag}</p>
                      <p className="font-mono text-[11px] font-bold text-primary/80 truncate max-w-[280px]">{selectedEquipment.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenDialog(selectedEquipment)}
                      className="h-7 px-2 text-[9px] font-mono uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />Nuevo
                    </Button>
                  </div>

                  {/* Status filter */}
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'abierto', 'en_proceso', 'cerrado'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`text-[8px] font-mono px-2 py-0.5 rounded border transition-all uppercase ${
                          filterStatus === s
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                            : 'border-primary/10 text-primary/30 hover:border-primary/20'
                        }`}
                      >
                        {s === 'all' ? 'Todos' : NC_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <ScrollArea className="h-[390px] pr-1">
                    {ncsLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      </div>
                    ) : equipmentNcs.length === 0 ? (
                      <div className="text-center py-10 border border-dashed border-primary/10 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500/30 mx-auto mb-2" />
                        <p className="font-mono text-[10px] text-primary/30">Sin hallazgos{filterStatus !== 'all' ? ` "${NC_STATUS_LABELS[filterStatus as NCStatus]}"` : ''}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {equipmentNcs.map(nc => (
                          <NcCard key={nc.id} nc={nc} />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══ NC Creation Dialog ══════════════════════════════════ */}
      {selectedEquipment && (
        <NcCreationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          equipment={selectedEquipment}
          area={selectedArea!}
          user={user}
          firestore={firestore}
          onCreated={() => {
            toast({ title: '✅ HALLAZGO REGISTRADO', description: `NC creada para ${selectedEquipment.tag} — ${selectedEquipment.name}` });
          }}
        />
      )}
    </div>
  );
}

// ─── NC Card ─────────────────────────────────────────────────────────────────
function NcCard({ nc }: { nc: NcDocument }) {
  const [open, setOpen] = useState(false);
  const statusCfg = NC_STATUS_COLORS[nc.status] ?? NC_STATUS_COLORS.abierto;

  return (
    <div className={`border rounded-lg overflow-hidden ${statusCfg.border} bg-[#05080C]`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="font-mono text-[9px] font-bold text-primary/50">{nc.nc_number}</span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border font-bold ${SEVERITY_BADGE[nc.severity]}`}>
                {NC_SEVERITY_LABELS[nc.severity]}
              </span>
              <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                {NC_STATUS_LABELS[nc.status]}
              </span>
            </div>
            <p className="font-mono text-[11px] font-medium text-primary/80 line-clamp-1">{nc.title}</p>
            <p className="font-mono text-[9px] text-primary/40 mt-0.5">{nc.discipline} · {nc.nc_category_name}</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {nc.target_date && (
              <div className="flex items-center gap-1 text-[8px] font-mono text-primary/30">
                <Clock className="w-2.5 h-2.5" />
                {nc.target_date}
              </div>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-primary/5 space-y-2 pt-2">
          <p className="font-mono text-[10px] text-primary/60 leading-relaxed">{nc.description}</p>
          {nc.norm_reference && (
            <p className="font-mono text-[9px] text-cyan-400/60">📋 Norma: {nc.norm_reference}</p>
          )}
          {nc.corrective_action && (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded p-2">
              <p className="font-mono text-[9px] text-emerald-400/70 uppercase mb-0.5">Acción Correctiva</p>
              <p className="font-mono text-[10px] text-primary/60">{nc.corrective_action}</p>
            </div>
          )}
          {nc.assigned_to && (
            <p className="font-mono text-[9px] text-primary/40">Asignado a: <span className="text-primary/60">{nc.assigned_to}</span></p>
          )}
          <p className="font-mono text-[8px] text-primary/25">
            Reportado por: {nc.reported_by} · {nc.created_at?.toDate?.()?.toLocaleString('es-CO') ?? '—'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NC Creation Dialog ───────────────────────────────────────────────────────
interface NcCreationDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipment: PlantEquipment;
  area: PlantArea;
  user: any;
  firestore: any;
  onCreated: () => void;
}

const DISCIPLINE_OPTIONS = ['Mecánica', 'Eléctrica', 'Civil', 'Piping', 'Instrumentación', 'Estructura', 'Otro'];

function NcCreationDialog({ open, onOpenChange, equipment, area, user, firestore, onCreated }: NcCreationDialogProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:            '',
    description:      '',
    severity:         'media' as NCSeverity,
    origin:           'inspeccion' as NCOrigin,
    discipline:       equipment.discipline.split('/')[0].trim(),
    nc_category_id:   '',
    nc_category_name: '',
    norm_reference:   '',
    corrective_action: '',
    assigned_to:      '',
    target_date:      '',
    observations:     '',
  });

  const availableCategories: NCCategory[] = useMemo(
    () => NC_CATEGORIES.filter(c =>
      c.typicalArea.toLowerCase().includes(area.name.toLowerCase().split(' ')[0].toLowerCase()) ||
      c.discipline.includes(form.discipline)
    ),
    [area, form.discipline]
  );

  const update = (field: string, value: string) =>
    setForm(p => ({ ...p, [field]: value }));

  const handleCategoryChange = (catId: string) => {
    const cat = NC_CATEGORIES.find(c => c.id === catId);
    if (!cat) return;
    setForm(p => ({
      ...p,
      nc_category_id:   cat.id,
      nc_category_name: cat.name,
      norm_reference:   cat.normReferences.join(', '),
      discipline:       cat.discipline.split('/')[0].trim(),
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.description || !firestore || !user) return;
    setSaving(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const nc_number = `NC-${area.code}-${equipment.tag}-${year}${month}-${rand}`;

      await addDoc(
        collection(firestore, 'projects', ACTIVE_PROJECT, 'non_conformances'),
        {
          nc_number,
          project_code: 'MIL24-001',
          project_ref:  PROJECT_REF,
          area_code:    area.code,
          area_name:    area.name,
          equipment_tag:    equipment.tag,
          equipment_name:   equipment.name,
          equipment_category: equipment.category,
          nc_category_id:   form.nc_category_id,
          nc_category_name: form.nc_category_name,
          discipline:       form.discipline,
          title:            form.title,
          description:      form.description,
          severity:         form.severity,
          origin:           form.origin,
          status:           'abierto' as NCStatus,
          norm_reference:   form.norm_reference,
          corrective_action: '',
          assigned_to:      form.assigned_to,
          target_date:      form.target_date,
          reported_by:      user.displayName || user.email || 'Inspector',
          reported_by_uid:  user.uid,
          observations:     form.observations,
          created_at:       serverTimestamp(),
        }
      );

      onCreated();
      onOpenChange(false);
      // Reset
      setForm({
        title: '', description: '', severity: 'media', origin: 'inspeccion',
        discipline: equipment.discipline.split('/')[0].trim(),
        nc_category_id: '', nc_category_name: '', norm_reference: '',
        corrective_action: '', assigned_to: '', target_date: '', observations: '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A0E14] border-red-500/20 max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-red-500/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/30 rounded flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-mono text-sm text-red-400 uppercase tracking-widest">
                Nuevo Hallazgo — NC
              </DialogTitle>
              <p className="text-[9px] font-mono text-primary/40 mt-0.5 truncate">
                {area.code} · {area.name} / <span className="text-cyan-400/70">{equipment.tag}</span> — {equipment.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Equipment context badge */}
          <div className="flex gap-2 p-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-lg">
            <Wrench className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[10px] font-mono">
              <p className="font-bold text-cyan-400">{equipment.tag} — {equipment.name}</p>
              <p className="text-primary/50">{equipment.description}</p>
              <p className="text-primary/35 mt-0.5">Disciplina base: {equipment.discipline}</p>
            </div>
          </div>

          {/* Discipline + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Disciplina</label>
              <Select value={form.discipline} onValueChange={v => update('discipline', v)}>
                <SelectTrigger className="h-9 bg-primary/5 border-primary/15 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20">
                  {DISCIPLINE_OPTIONS.map(d => (
                    <SelectItem key={d} value={d} className="font-mono text-xs">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Categoría NC</label>
              <Select value={form.nc_category_id} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-9 bg-primary/5 border-primary/15 font-mono text-xs">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20 max-h-64">
                  {availableCategories.length === 0
                    ? NC_CATEGORIES.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-mono text-xs">{c.name}</SelectItem>
                      ))
                    : availableCategories.map(c => (
                        <SelectItem key={c.id} value={c.id} className="font-mono text-xs">{c.name}</SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Suggested examples from category */}
          {form.nc_category_id && (() => {
            const cat = NC_CATEGORIES.find(c => c.id === form.nc_category_id);
            return cat ? (
              <div className="p-2.5 bg-amber-500/5 border border-amber-500/15 rounded-lg space-y-1">
                <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Hallazgos típicos en esta categoría
                </p>
                {cat.examples.slice(0, 3).map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setForm(p => ({ ...p, description: ex }))}
                    className="block text-left text-[9px] font-mono text-amber-300/60 hover:text-amber-300 transition-colors leading-relaxed"
                  >
                    → {ex}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {/* Severity + Origin */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Severidad *</label>
              <Select value={form.severity} onValueChange={v => update('severity', v as NCSeverity)}>
                <SelectTrigger className="h-9 bg-primary/5 border-primary/15 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20">
                  {Object.entries(NC_SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Origen *</label>
              <Select value={form.origin} onValueChange={v => update('origin', v as NCOrigin)}>
                <SelectTrigger className="h-9 bg-primary/5 border-primary/15 font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0A0E14] border-primary/20">
                  {Object.entries(NC_ORIGIN_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="font-mono text-xs">{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Título del Hallazgo *</label>
            <Input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="Descripción breve y precisa del hallazgo..."
              className="h-9 bg-primary/5 border-primary/15 font-mono text-xs focus-visible:border-red-500/50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Descripción Detallada *</label>
            <Textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Describa el hallazgo, desviación o incumplimiento con datos técnicos específicos (medidas, valores, ubicación)..."
              className="bg-primary/5 border-primary/15 font-mono text-xs min-h-[90px] resize-none focus-visible:border-red-500/50"
            />
          </div>

          {/* Norm + Assigned + Date */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Norma / Especif.</label>
              <Input
                value={form.norm_reference}
                onChange={e => update('norm_reference', e.target.value)}
                placeholder="ISO 9001, AWS D1.1..."
                className="h-9 bg-primary/5 border-primary/15 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Asignado a</label>
              <Input
                value={form.assigned_to}
                onChange={e => update('assigned_to', e.target.value)}
                placeholder="Responsable de cierre..."
                className="h-9 bg-primary/5 border-primary/15 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-primary/40 uppercase tracking-widest">Fecha Límite</label>
              <Input
                type="date"
                value={form.target_date}
                onChange={e => update('target_date', e.target.value)}
                className="h-9 bg-primary/5 border-primary/15 font-mono text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-primary/10">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 font-mono text-xs uppercase border-primary/20 text-primary/50 hover:border-primary/40"
            >
              <X className="w-3.5 h-3.5 mr-1.5" />Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.description}
              className="h-9 px-4 font-mono text-xs uppercase bg-red-500/15 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white transition-all disabled:opacity-40"
            >
              {saving
                ? <><div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-1.5" />Guardando...</>
                : <><ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Registrar Hallazgo</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
