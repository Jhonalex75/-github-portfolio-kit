'use client';

import { useState, useRef, useEffect, useMemo, useCallback, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  useFirebaseApp,
} from '@/firebase';
import { uploadFileToStorage } from '@/firebase/storage-utils';
import {
  collection, doc, query, orderBy, deleteDoc,
  serverTimestamp, addDoc, setDoc,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, Camera, Plus, Trash2, Calendar, Clock,
  Save, FileText, CheckCircle2, AlertTriangle,
  Shield, Users, Edit2, ChevronDown, ClipboardList,
  Building2, MessageSquare, TrendingUp, Percent,
  HardHat, AlertCircle, BookOpen, Printer, FileSpreadsheet,
} from 'lucide-react';
import { generateDailyReportExcel, DailyReportData } from '@/lib/excel-generator';
import { MonthlyDashboard } from '@/components/daily-reports/MonthlyDashboard';
import { ContractorActivityDashboard } from '@/components/daily-reports/ContractorActivityDashboard';
import { ReportPrintPreview, PrintReportData } from '@/components/daily-reports/ReportPrintPreview';

// ─── Auth ────────────────────────────────────────────────────────────────────
const ROOT_UIDS = ['R3MVwE12nVMg128Kv6bdwJ6MKav1', 'Ew4plK83Z9O6c8J1dM3F0tP04A83'];

// ─── Contractors ─────────────────────────────────────────────────────────────
const CONTRACTORS_CONFIG = [
  {
    id: 'HL-GISAICO',
    label: 'HL-GISAICO',
    sistema: 'GENERAL',
    description: 'Contratista Principal — Actividades Mecánicas y Civiles',
    icon: '🏗️',
    color: '#22D3EE',
    activeCls: 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400',
    inactiveCls: 'bg-primary/5 border-primary/10 text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400/70',
    printColor: '#1565C0',
  },
  {
    id: 'TECNITANQUES',
    label: 'TECNITANQUES',
    sistema: 'LIXIVIACIÓN',
    description: 'Subcontratista — Montaje Tanques Sistema Lixiviación',
    icon: '🛢️',
    color: '#4ADE80',
    activeCls: 'bg-green-500/15 border-green-500/50 text-green-400',
    inactiveCls: 'bg-primary/5 border-primary/10 text-primary/40 hover:border-green-500/30 hover:text-green-400/70',
    printColor: '#2E7D32',
  },
  {
    id: 'CYC',
    label: 'CYC',
    sistema: 'CIP',
    description: 'Subcontratista — Montaje Tanques Sistema CIP',
    icon: '⚗️',
    color: '#C084FC',
    activeCls: 'bg-purple-500/15 border-purple-500/50 text-purple-400',
    inactiveCls: 'bg-primary/5 border-primary/10 text-primary/40 hover:border-purple-500/30 hover:text-purple-400/70',
    printColor: '#6A1B9A',
  },
] as const;

type ContractorId = 'HL-GISAICO' | 'TECNITANQUES' | 'CYC';

// ─── Climate & HSE ───────────────────────────────────────────────────────────
const WEATHER_OPTIONS = [
  'Soleado ☀️', 'Parcialmente Nublado ⛅', 'Nublado ☁️',
  'Llovizna 🌦️', 'Lluvia ☔', 'Tormenta ⛈️',
];

const HSE_CONFIG = {
  workAtHeights: { label: 'Trabajo en Alturas',    icon: '🪜', bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  hotWork:       { label: 'Trabajo en Caliente',   icon: '🔥', bg: 'bg-red-500/20 border-red-500/40 text-red-300' },
  confinedSpace: { label: 'Espacios Confinados',   icon: '⚠️', bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  scaffolding:   { label: 'Andamios Certificados', icon: '🏗️', bg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
} as const;
type HSEKey = keyof typeof HSE_CONFIG;

// ─── Admin activities ─────────────────────────────────────────────────────────
const DEFAULT_ADMIN_ACTIVITIES = [
  { name: 'Revisión de procedimientos de montaje',     progress: 0 },
  { name: 'Revisión de ingeniería',                    progress: 0 },
  { name: 'Reunión con vendors / proveedores',         progress: 0 },
  { name: 'Revisión con logística',                    progress: 0 },
  { name: 'Importación de equipos',                    progress: 0 },
  { name: 'Informes y reportes al cliente',            progress: 0 },
  { name: 'Gestión de no conformidades (SGC)',         progress: 0 },
];

const ACTIVE_PROJECT = 'default-nexus-project';
const STORAGE_THRESHOLD = 200 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChecklistHSE { workAtHeights: boolean; hotWork: boolean; confinedSpace: boolean; scaffolding: boolean }
interface Evidence     { type: 'photo' | 'pdf'; urlOrBase64: string; name: string; uploadMethod: 'base64' | 'storage' }
interface AdminActivity { name: string; progress: number }

interface ContractorPersonnel {
  // Roles comunes (todos los contratistas)
  soldadoresCalificados: number;
  auxiliaresAyudantes:   number;
  armadores:             number;
  pailero:               number;
  operadorGatos:         number;
  andamieros:            number;
  directorObra:          number;
  ingResidente:          number;
  supervisorMecanico:    number;
  ingQAQC:               number;
  inspectoresHSE:        number;
  // Roles extendidos (HL-GISAICO + TECNITANQUES)
  almacenista:           number;
  programador:           number;
  administrador:         number;
  rescatista:            number;
  operadorGrua:          number;
  aparejador:            number;
}
interface ContractorEquipment {
  grua:           number;
  generador:      number;
  andamios:       number;
  camionGrua:     number;
  torreGrua:      number;
  equipoEspecial: string;
}
interface ContractorLostHours {
  malClima:       number;
  parosHSE:       number;
  fallasTecnicas: number;
  charlaInfo:     number;
}
interface SafetyInfo {
  comments:         string;
  incidents:        number;
  nearMisses:       number;
  eppObservations:  string;
  lessonsLearned:   string;
}
interface SectionsEnabled {
  hse:       boolean;
  seguridad: boolean;
}
interface WeldingEntry {
  estructura:  string;
  metrajeMl:   number;
  soldadores:  number;
}

/** Data stored per-contractor */
interface PerContractorData {
  activities:      string;
  personnel:       ContractorPersonnel;
  checklist:       ChecklistHSE;
  safetyInfo:      SafetyInfo;
  equipment:       ContractorEquipment;
  lostHours:       ContractorLostHours;
  weldingMetrics:  WeldingEntry[];
  sectionsEnabled: SectionsEnabled;
}

type ContractorSections = Record<ContractorId, PerContractorData>;

// ─── Personnel fields config ──────────────────────────────────────────────────
// FULL = HL-GISAICO + TECNITANQUES (17 roles)   CYC_ONLY = CYC (11 roles)
const PERSONNEL_FIELDS_FULL: [keyof ContractorPersonnel, string, string][] = [
  ['soldadoresCalificados', 'Soldadores Calificados', '🔥'],
  ['auxiliaresAyudantes',   'Auxiliares / Ayudantes', '👷'],
  ['armadores',             'Armadores',              '🏗️'],
  ['pailero',               'Pailero',                '🔧'],
  ['operadorGatos',         'Operador Gatos',         '⚙️'],
  ['andamieros',            'Andamieros',             '🪜'],
  ['directorObra',          'Director de Obra',       '👔'],
  ['ingResidente',          'Ing. Residente',         '🎓'],
  ['supervisorMecanico',    'Supervisor Mecánico',    '🔩'],
  ['ingQAQC',               'Ing. QAQC',              '✅'],
  ['inspectoresHSE',        'Inspectores HSE',        '⛑️'],
  ['almacenista',           'Almacenista',            '📦'],
  ['programador',           'Programador',            '💻'],
  ['administrador',         'Administrador',          '📋'],
  ['rescatista',            'Rescatista',             '🚑'],
  ['operadorGrua',          'Operador Grúa',          '🏗️'],
  ['aparejador',            'Aparejador',             '⛓️'],
];
const PERSONNEL_FIELDS_CYC = PERSONNEL_FIELDS_FULL.slice(0, 11);

// ─── Default welding tags per contractor ──────────────────────────────────────
const DEFAULT_WELDING_TECNITANQUES: WeldingEntry[] = [
  { estructura: '1405-TK-001', metrajeMl: 0, soldadores: 0 },
  { estructura: '1410-TK-002', metrajeMl: 0, soldadores: 0 },
  { estructura: '1410-TK-003', metrajeMl: 0, soldadores: 0 },
  { estructura: '1410-TK-004', metrajeMl: 0, soldadores: 0 },
  { estructura: '1410-TK-005', metrajeMl: 0, soldadores: 0 },
];
const DEFAULT_WELDING_CYC: WeldingEntry[] = [
  { estructura: '1420-TK-006', metrajeMl: 0, soldadores: 0 },
  { estructura: '1420-TK-007', metrajeMl: 0, soldadores: 0 },
  { estructura: '1420-TK-008', metrajeMl: 0, soldadores: 0 },
  { estructura: '1420-TK-009', metrajeMl: 0, soldadores: 0 },
  { estructura: '1420-TK-010', metrajeMl: 0, soldadores: 0 },
  { estructura: '1420-TK-011', metrajeMl: 0, soldadores: 0 },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────
const EMPTY_SAFETY: SafetyInfo = { comments: '', incidents: 0, nearMisses: 0, eppObservations: '', lessonsLearned: '' };
const EMPTY_CHECKLIST: ChecklistHSE = { workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false };
const EMPTY_PERSONNEL: ContractorPersonnel = {
  soldadoresCalificados: 0, auxiliaresAyudantes: 0, armadores: 0,
  pailero: 0, operadorGatos: 0, andamieros: 0, directorObra: 0,
  ingResidente: 0, supervisorMecanico: 0, ingQAQC: 0, inspectoresHSE: 0,
  almacenista: 0, programador: 0, administrador: 0, rescatista: 0,
  operadorGrua: 0, aparejador: 0,
};

const DEFAULT_CONTRACTOR_DATA = (): PerContractorData => ({
  activities:      '',
  personnel:       { ...EMPTY_PERSONNEL },
  checklist:       { ...EMPTY_CHECKLIST },
  safetyInfo:      { ...EMPTY_SAFETY },
  equipment:       { grua: 0, generador: 0, andamios: 0, camionGrua: 0, torreGrua: 0, equipoEspecial: '' },
  lostHours:       { malClima: 0, parosHSE: 0, fallasTecnicas: 0, charlaInfo: 0 },
  weldingMetrics:  [],
  sectionsEnabled: { hse: true, seguridad: true },
});

const DEFAULT_SECTIONS = (): ContractorSections => ({
  'HL-GISAICO':   DEFAULT_CONTRACTOR_DATA(),
  'TECNITANQUES': { ...DEFAULT_CONTRACTOR_DATA(), weldingMetrics: DEFAULT_WELDING_TECNITANQUES.map(w => ({ ...w })) },
  'CYC':          { ...DEFAULT_CONTRACTOR_DATA(), weldingMetrics: DEFAULT_WELDING_CYC.map(w => ({ ...w })) },
});

// ─── Firestore doc type ───────────────────────────────────────────────────────
interface ReportDoc {
  id: string;
  metadata: {
    consecutiveId: string; date: string; weather: string;
    authorUid: string; authorName: string; frente: string;
    proyectoRef: string; status: 'draft' | 'anchored';
    [key: string]: unknown; // enabledContractors, avancesEnabled
  };
  seguridad_hse:      ChecklistHSE & { hasActiveRisk: boolean };
  recursos_frente:    { type: string; count: number }[];
  contractor_sections?: ContractorSections;
  // legacy (uses Record to avoid strict type conflicts with old field names)
  contractors?:       { name: string; personnel: number; enabled?: boolean; breakdown?: Record<string, number>; equipment?: Partial<ContractorEquipment>; lostHours?: Partial<ContractorLostHours> }[];
  safety_info?:       SafetyInfo | null;
  admin_activities?:  AdminActivity[];
  activities:         string;
  evidence:           Evidence[];
  timestamp?:         unknown;
}

// ─── Image compression ────────────────────────────────────────────────────────
function compressImage(file: File, maxPx = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Print data adapter ───────────────────────────────────────────────────────
const PROF_NAME    = 'MSC. ING. JHON ALEXANDER VALENCIA MARULANDA';
const PROF_LICENSE = 'CL230-31983';

// Resolves per-contractor data from a ReportDoc, with full legacy migration
function resolveContractorData(r: ReportDoc, cid: ContractorId): PerContractorData {
  // New format: contractor_sections exists and has data for this contractor
  const fromNew = (r.contractor_sections as Record<string, PerContractorData> | undefined)?.[cid];
  if (fromNew) {
    const def = DEFAULT_CONTRACTOR_DATA();
    return {
      activities:      fromNew.activities      ?? '',
      personnel:       { ...EMPTY_PERSONNEL,   ...(fromNew.personnel   ?? {}) },
      checklist:       { ...EMPTY_CHECKLIST,   ...(fromNew.checklist   ?? {}) },
      safetyInfo:      { ...EMPTY_SAFETY,      ...(fromNew.safetyInfo  ?? {}) },
      equipment:       { ...def.equipment,     ...(fromNew.equipment   ?? {}) },
      lostHours:       { ...def.lostHours,     ...(fromNew.lostHours   ?? {}) },
      weldingMetrics:  (fromNew as PerContractorData).weldingMetrics   ?? [],
      sectionsEnabled: (fromNew as PerContractorData).sectionsEnabled  ?? { hse: true, seguridad: true },
    };
  }

  // Legacy migration helper — maps old breakdown fields to new personnel keys
  const migratePersonnel = (breakdown?: Partial<Record<string, number>>): ContractorPersonnel => ({
    ...EMPTY_PERSONNEL,
    soldadoresCalificados: breakdown?.soldadores ?? 0,
    auxiliaresAyudantes:   breakdown?.auxiliares ?? 0,
    armadores:             breakdown?.armadores  ?? 0,
  });

  const d = DEFAULT_CONTRACTOR_DATA();
  if (cid === 'HL-GISAICO') {
    d.activities = r.activities || '';
    d.checklist  = {
      workAtHeights: !!r.seguridad_hse?.workAtHeights,
      hotWork:       !!r.seguridad_hse?.hotWork,
      confinedSpace: !!r.seguridad_hse?.confinedSpace,
      scaffolding:   !!r.seguridad_hse?.scaffolding,
    };
    d.safetyInfo = r.safety_info ? { ...r.safety_info } : { ...EMPTY_SAFETY };
    const old = r.contractors?.find(c => c.name === 'HL-GISAICO');
    if (old?.breakdown) d.personnel = migratePersonnel(old.breakdown as Record<string, number>);
    if (old?.equipment)  d.equipment  = { grua: old.equipment.grua ?? 0, generador: old.equipment.generador ?? 0, andamios: old.equipment.andamios ?? 0, camionGrua: old.equipment.camionGrua ?? 0, torreGrua: old.equipment.torreGrua ?? 0, equipoEspecial: old.equipment.equipoEspecial ?? '' };
    if (old?.lostHours)  d.lostHours  = { malClima: old.lostHours.malClima ?? 0, parosHSE: old.lostHours.parosHSE ?? 0, fallasTecnicas: old.lostHours.fallasTecnicas ?? 0, charlaInfo: old.lostHours.charlaInfo ?? 0 };
    if (!old && r.recursos_frente?.length) {
      r.recursos_frente.forEach(rec => {
        if (rec.type.toLowerCase().includes('soldad')) d.personnel.soldadoresCalificados = rec.count;
        if (rec.type.toLowerCase().includes('auxili')) d.personnel.auxiliaresAyudantes   = rec.count;
        if (rec.type.toLowerCase().includes('armad'))  d.personnel.armadores             = rec.count;
        if (rec.type.toLowerCase().includes('hse'))    d.personnel.inspectoresHSE        = rec.count;
      });
    }
  } else {
    const old = r.contractors?.find(c => c.name === cid);
    if (old?.breakdown) d.personnel = migratePersonnel(old.breakdown as Record<string, number>);
    if (old?.equipment)  d.equipment  = { grua: old.equipment.grua ?? 0, generador: old.equipment.generador ?? 0, andamios: old.equipment.andamios ?? 0, camionGrua: old.equipment.camionGrua ?? 0, torreGrua: old.equipment.torreGrua ?? 0, equipoEspecial: old.equipment.equipoEspecial ?? '' };
  }
  return d;
}

function buildPrintData(r: ReportDoc): PrintReportData {
  // Determine which contractors were enabled when the report was saved
  const savedEnabled = (r.metadata as Record<string, unknown>).enabledContractors as string[] | undefined;
  const enabledSet   = savedEnabled?.length ? new Set(savedEnabled) : new Set(['HL-GISAICO', 'TECNITANQUES', 'CYC']);
  const savedAvances = (r.metadata as Record<string, unknown>).avancesEnabled as boolean | undefined;
  const showAvances  = savedAvances !== false;

  const mapSection = (cfg: (typeof CONTRACTORS_CONFIG)[number]) => {
    const cid  = cfg.id as ContractorId;
    const data = resolveContractorData(r, cid);

    return {
      contratista: cfg.id,
      sistema: cfg.sistema !== 'GENERAL' ? cfg.sistema : undefined,
      activities: data.activities.split('\n').map(s => s.trim()).filter(Boolean),
      personal:   { ...data.personnel },
      equipment:  { ...data.equipment },
      hsePermisos: data.sectionsEnabled.hse ? [
        { riesgo: '🪜 Trabajo en Alturas',    estado: data.checklist.workAtHeights ? '✅ AUTORIZADO — APT FIRMADO Y VALIDADO' : '— N/A — Sin riesgo identificado' },
        { riesgo: '🔥 Trabajo en Caliente',   estado: data.checklist.hotWork       ? '✅ AUTORIZADO — APT FIRMADO Y VALIDADO' : '— N/A — Sin riesgo identificado' },
        { riesgo: '⚠️ Espacios Confinados',  estado: data.checklist.confinedSpace  ? '🔴 ACTIVO — Monitoreo atmosférico requerido' : '— N/A — Sin riesgo identificado' },
        { riesgo: '🏗️ Andamios Certificados', estado: data.checklist.scaffolding   ? '✅ AUTORIZADO — APT FIRMADO Y VALIDADO' : '— N/A — Sin riesgo identificado' },
      ] : [],
      seguridad: data.sectionsEnabled.seguridad ? {
        comentarios:         data.safetyInfo.comments,
        incidentes:          data.safetyInfo.incidents,
        cuasiAccidentes:     data.safetyInfo.nearMisses,
        observacionesEpp:    data.safetyInfo.eppObservations,
        leccionesAprendidas: data.safetyInfo.lessonsLearned,
      } : null,
      weldingMetrics: data.weldingMetrics ?? [],
    };
  };

  const folio = r.metadata?.consecutiveId || '—';
  const fecha = r.metadata?.date
    ? new Date(r.metadata.date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return {
    documentControl: {
      empresaSupervisora:   'SGS S.A.',
      normativa:            'DOCUMENTO CONTROLADO — ISO 9001:2015 — Cert. No. CO23-1234-QMS',
      cliente:              'ARIS MINING S.A.S.',
      tipoReporte:          'REPORTE DIARIO DE MONTAJE INDUSTRIAL',
      proyecto:             r.metadata?.proyectoRef || 'ARIS MINING — MIL24.001',
      folio,
      fechaOperacion:       fecha,
      codigoDocumento:      `DOC-NEXUS-${folio}`,
      revision:             '01',
      emisor:               PROF_NAME,
      matriculaProfesional: PROF_LICENSE,
    },
    condicionClimatica: r.metadata?.weather || '—',
    estadoFolio:        (r.metadata?.status || 'ANCLADO').toUpperCase(),
    contratistas:       CONTRACTORS_CONFIG.filter(c => enabledSet.has(c.id)).map(mapSection),
    evidence:           (r.evidence || []).filter(e => e.type === 'photo'),
    adminActivities: showAvances ? (r.admin_activities || []).map(a => ({
      actividad:   a.name,
      porcentaje:  `${a.progress}%`,
      estado: a.progress < 30 ? '🔴 CRÍTICO' : a.progress < 70 ? '🟡 EN PROGRESO' : a.progress < 100 ? '🟢 AVANZADO' : '✅ COMPLETADO',
    })) : [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DailyReportsPage() {
  const router      = useRouter();
  const firestore   = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const { toast }   = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const isRoot = user && ROOT_UIDS.includes(user.uid);

  // ── Active contractor tab ──
  const [activeContractorId, setActiveContractorId] = useState<ContractorId>('HL-GISAICO');
  // Ref ensures updateSection always reads the current contractorId even in async/batched updates
  const activeContractorIdRef = useRef<ContractorId>('HL-GISAICO');
  useEffect(() => { activeContractorIdRef.current = activeContractorId; }, [activeContractorId]);

  // ── Enabled contractors (which ones are included in this report) ──
  const [enabledContractors, setEnabledContractors] = useState<Set<ContractorId>>(
    () => new Set<ContractorId>(['HL-GISAICO', 'TECNITANQUES', 'CYC'])
  );

  // ── Avances global toggle ──
  const [avancesEnabled, setAvancesEnabled] = useState(true);

  const toggleContractor = (cid: ContractorId) => {
    setEnabledContractors(prev => {
      const next = new Set(prev);
      if (next.has(cid)) {
        if (next.size === 1) return prev; // al menos 1 siempre activo
        next.delete(cid);
        if (activeContractorIdRef.current === cid) {
          const first = CONTRACTORS_CONFIG.find(c => next.has(c.id as ContractorId));
          if (first) setActiveContractorId(first.id as ContractorId);
        }
      } else {
        next.add(cid);
      }
      return next;
    });
  };

  // ── Per-contractor data ──
  const [contractorSections, setContractorSections] = useState<ContractorSections>(DEFAULT_SECTIONS());

  // ── Global form state ──
  type TabId = 'meta' | 'hse' | 'recursos' | 'equipos' | 'seguridad' | 'admin' | 'evidencia';
  const [tab,             setTab]             = useState<TabId>('meta');
  const [weather,         setWeather]         = useState('Soleado ☀️');
  const [reportDate,      setReportDate]      = useState<string>(new Date().toISOString().slice(0, 10));
  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>(DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })));
  const [evidence,        setEvidence]        = useState<Evidence[]>([]);

  // ── UI state ──
  const [submitting,      setSubmitting]      = useState(false);
  const [drafting,        setDrafting]        = useState(false);
  const [progress,        setProgress]        = useState<Record<string, number>>({});
  const [expanded,        setExpanded]        = useState<string | null>(null);
  const [editing,         setEditing]         = useState<ReportDoc | null>(null);
  const [search,          setSearch]          = useState('');
  const [lastId,          setLastId]          = useState<string | null>(null);
  const [printingReport,  setPrintingReport]  = useState<ReportDoc | null>(null);


  // ── Derived ──
  const activeData = contractorSections[activeContractorId];
  const activeCfg  = CONTRACTORS_CONFIG.find(c => c.id === activeContractorId)!;

  // Update helper for per-contractor fields.
  // Uses the ref so the closure is always fresh even when React batches renders.
  const updateSection = useCallback(<K extends keyof PerContractorData>(
    field: K,
    value: PerContractorData[K],
  ) => {
    const cid = activeContractorIdRef.current;
    setContractorSections(prev => ({
      ...prev,
      [cid]: { ...prev[cid], [field]: value },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyRisk = activeData.sectionsEnabled.hse && Object.values(activeData.checklist).some(Boolean);
  const anyRiskGlobal = CONTRACTORS_CONFIG
    .filter(cfg => enabledContractors.has(cfg.id as ContractorId))
    .some(cfg => {
      const d = contractorSections[cfg.id as ContractorId];
      return d.sectionsEnabled.hse && Object.values(d.checklist).some(Boolean);
    });

  const totalPersonnelAll = CONTRACTORS_CONFIG
    .filter(cfg => enabledContractors.has(cfg.id as ContractorId))
    .reduce((s, cfg) =>
      s + Object.values(contractorSections[cfg.id as ContractorId].personnel).reduce((a, b) => a + b, 0), 0
    );

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) router.push('/auth');
  }, [user, isUserLoading, router]);

  // ── Real-time subscription ──
  const reportsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'projects', ACTIVE_PROJECT, 'daily_reports'),
      orderBy('timestamp', 'desc'),
    );
  }, [firestore, user]);

  const { data: reports, isLoading: reportsLoading } = useCollection<ReportDoc>(reportsQuery);

  const filtered = useMemo(() => {
    if (!reports) return [];
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(r =>
      r.metadata?.consecutiveId?.toLowerCase().includes(q) ||
      r.metadata?.frente?.toLowerCase().includes(q) ||
      r.activities?.toLowerCase().includes(q),
    );
  }, [reports, search]);

  // ── Evidence upload ──
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const uploads = Array.from(files).map(async (file, i) => {
      const key  = `${file.name}_${i}`;
      const type = file.type.includes('pdf') ? 'pdf' : 'photo';
      setProgress(p => ({ ...p, [key]: 5 }));

      let item: Evidence | null = null;

      if (type === 'photo') {
        try {
          setProgress(p => ({ ...p, [key]: 30 }));
          const b64 = await compressImage(file);
          const estBytes = Math.round(b64.length * 0.75);
          if (estBytes < 800 * 1024) {
            item = { type, urlOrBase64: b64, name: file.name, uploadMethod: 'base64' };
            setProgress(p => ({ ...p, [key]: 100 }));
          } else {
            const blob = await (await fetch(b64)).blob();
            const f2   = new File([blob], file.name, { type: 'image/jpeg' });
            const res  = await uploadFileToStorage(firebaseApp, f2, ACTIVE_PROJECT, pct => setProgress(p => ({ ...p, [key]: 30 + Math.round(pct * 0.7) })));
            if (res.success && res.downloadUrl) item = { type, urlOrBase64: res.downloadUrl, name: file.name, uploadMethod: 'storage' };
            else toast({ variant: 'destructive', title: 'Error al subir', description: `${file.name}: ${res.error}` });
          }
        } catch {
          toast({ variant: 'destructive', title: 'Error procesando imagen', description: file.name });
        }
      } else {
        const res = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT, pct => setProgress(p => ({ ...p, [key]: pct })));
        if (res.success && res.downloadUrl) item = { type, urlOrBase64: res.downloadUrl, name: file.name, uploadMethod: 'storage' };
        else toast({ variant: 'destructive', title: 'Error al subir PDF', description: `${file.name}: ${res.error}` });
      }

      if (item) { const ev = item; setEvidence(prev => [...prev, ev]); }
      setTimeout(() => setProgress(p => { const n = { ...p }; delete n[key]; return n; }), 2000);
    });

    await Promise.all(uploads);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Build Firestore payload ──
  const buildPayload = (consecutiveId: string, status: 'anchored' | 'draft' = 'anchored') => {
    const hlData = contractorSections['HL-GISAICO'];

    // Legacy contractors[] for Excel Sheet 2 backward compat
    const contractorsLegacy = CONTRACTORS_CONFIG.map(cfg => {
      const d = contractorSections[cfg.id as ContractorId];
      const total = Object.values(d.personnel).reduce((s, v) => s + v, 0);
      return {
        name:      cfg.id,
        enabled:   enabledContractors.has(cfg.id as ContractorId),
        personnel: total,
        breakdown: {
          soldadoresCalificados: d.personnel.soldadoresCalificados,
          auxiliaresAyudantes:   d.personnel.auxiliaresAyudantes,
          armadores:             d.personnel.armadores,
          inspectoresHSE:        d.personnel.inspectoresHSE,
        },
        equipment: d.equipment,
        lostHours: d.lostHours,
      };
    });

    // Legacy recursos_frente from HL-GISAICO personnel
    const recursos_frente = [
      { type: 'Soldadores Calificados', count: hlData.personnel.soldadoresCalificados },
      { type: 'Auxiliares / Ayudantes', count: hlData.personnel.auxiliaresAyudantes },
      { type: 'Armadores',              count: hlData.personnel.armadores },
      { type: 'Pailero',                count: hlData.personnel.pailero },
      { type: 'Operador Gatos',         count: hlData.personnel.operadorGatos },
      { type: 'Andamieros',             count: hlData.personnel.andamieros },
      { type: 'Director de Obra',       count: hlData.personnel.directorObra },
      { type: 'Ing. Residente',         count: hlData.personnel.ingResidente },
      { type: 'Supervisor Mecánico',    count: hlData.personnel.supervisorMecanico },
      { type: 'Ing. QAQC',              count: hlData.personnel.ingQAQC },
      { type: 'Inspectores HSE',        count: hlData.personnel.inspectoresHSE },
    ].filter(r => r.count > 0);

    return {
      metadata: {
        consecutiveId,
        date:               new Date(reportDate + 'T12:00:00').toISOString(),
        weather,
        authorUid:          user!.uid,
        authorName:         user!.displayName || user!.email || 'Ing. Certificado',
        frente:             'HL-GISAICO',
        proyectoRef:        'ARIS MINING — MIL24.001',
        status,
        enabledContractors: [...enabledContractors],
        avancesEnabled,
      },
      // New per-contractor data
      contractor_sections: contractorSections,
      // Legacy fields (HL-GISAICO mirrors)
      seguridad_hse:    { ...hlData.checklist, hasActiveRisk: hlData.sectionsEnabled.hse && Object.values(hlData.checklist).some(Boolean) },
      recursos_frente,
      activities:       hlData.activities,
      safety_info:      hlData.sectionsEnabled.seguridad ? hlData.safetyInfo : null,
      // Global
      contractors:      contractorsLegacy,
      admin_activities: avancesEnabled ? adminActivities : [],
      evidence,
      timestamp:        serverTimestamp(),
      lastModified:     serverTimestamp(),
    };
  };

  // ── Reset form ──
  const reset = () => {
    setContractorSections(DEFAULT_SECTIONS());
    setActiveContractorId('HL-GISAICO');
    setEnabledContractors(new Set<ContractorId>(['HL-GISAICO', 'TECNITANQUES', 'CYC']));
    setAvancesEnabled(true);
    setWeather('Soleado ☀️');
    setReportDate(new Date().toISOString().slice(0, 10));
    setAdminActivities(DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })));
    setEvidence([]);
    setEditing(null);
    setTab('meta');
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!firestore || !user) return;
    const hasActivities = [...enabledContractors].some(cid => contractorSections[cid].activities.trim());
    if (!hasActivities) {
      toast({ variant: 'destructive', title: 'CAMPOS OBLIGATORIOS', description: 'Complete al menos las Actividades de un contratista activo.' });
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const docRef = doc(firestore, 'projects', ACTIVE_PROJECT, 'daily_reports', editing.id);
        await setDoc(docRef, buildPayload(editing.metadata.consecutiveId), { merge: true });
        toast({ title: '✅ FOLIO ACTUALIZADO', description: editing.metadata.consecutiveId });
        setLastId(editing.metadata.consecutiveId);
      } else {
        const colRef = collection(firestore, 'projects', ACTIVE_PROJECT, 'daily_reports');
        const docRef = await addDoc(colRef, { timestamp: serverTimestamp() });
        const y = new Date().getFullYear();
        const m = String(new Date().getMonth() + 1).padStart(2, '0');
        const consecutiveId = `REP-${y}${m}-${docRef.id.slice(0, 6).toUpperCase()}`;
        await setDoc(docRef, buildPayload(consecutiveId), { merge: true });
        setLastId(consecutiveId);
        toast({ title: '✅ FOLIO ANCLADO', description: `${consecutiveId} sincronizado en Firestore.` });
      }
      reset();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'ERROR DE TRANSMISIÓN', description: 'Fallo al anclar el folio.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Draft ──
  const handleDraft = async () => {
    if (!firestore || !user) return;
    setDrafting(true);
    try {
      const colRef = collection(firestore, 'projects', ACTIVE_PROJECT, 'daily_reports');
      const docRef = await addDoc(colRef, { timestamp: serverTimestamp() });
      const y = new Date().getFullYear();
      const m = String(new Date().getMonth() + 1).padStart(2, '0');
      const consecutiveId = `DRAFT-${y}${m}-${docRef.id.slice(0, 6).toUpperCase()}`;
      await setDoc(docRef, buildPayload(consecutiveId, 'draft'), { merge: true });
      toast({ title: '💾 BORRADOR GUARDADO', description: consecutiveId });
    } catch {
      toast({ variant: 'destructive', title: 'ERROR DE BORRADOR' });
    } finally {
      setDrafting(false);
    }
  };

  // ── Export Excel ──
  const exportDossier = async (r: ReportDoc) => {
    toast({ title: '📊 MOTOR EXCEL SGS ACTIVO', description: 'Generando Dossier ISO 9001:2015…' });
    try {
      const data: DailyReportData = {
        id:            r.id,
        metadata:      r.metadata,
        recursos:      r.recursos_frente  || [],
        checklist_hse: r.seguridad_hse,
        activities:    r.activities,
        evidence:      r.evidence         || [],
        contractors:   r.contractors      || [],
        safety_info:   r.safety_info,
        admin_activities:    r.admin_activities || DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })),
        contractor_sections: r.contractor_sections as DailyReportData['contractor_sections'],
      };
      await generateDailyReportExcel(data);
      toast({ title: '✅ DOSSIER EMITIDO', description: 'SGS/ISO 9001 — Listo para ARIS MINING.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'ERROR DE EXPORTACIÓN' });
    }
  };

  // ── Load for editing ──
  const loadEdit = (r: ReportDoc) => {
    setEditing(r);
    setWeather(r.metadata.weather);

    // Restore enabled contractors from metadata if present
    const savedEnabled = (r.metadata as Record<string, unknown>).enabledContractors as string[] | undefined;
    if (savedEnabled?.length) {
      setEnabledContractors(new Set(savedEnabled as ContractorId[]));
    } else {
      setEnabledContractors(new Set<ContractorId>(['HL-GISAICO', 'TECNITANQUES', 'CYC']));
    }
    const savedAvances = (r.metadata as Record<string, unknown>).avancesEnabled as boolean | undefined;
    setAvancesEnabled(savedAvances !== false);

    if (r.contractor_sections) {
      // New format — load directly (with full field migration)
      const hydrate = (cid: string): PerContractorData => {
        const raw = r.contractor_sections![cid as ContractorId];
        if (!raw) return DEFAULT_CONTRACTOR_DATA();
        return {
          ...DEFAULT_CONTRACTOR_DATA(),
          ...raw,
          personnel:       { ...EMPTY_PERSONNEL,          ...(raw.personnel          ?? {}) },
          sectionsEnabled: { ...{ hse: true, seguridad: true }, ...(raw.sectionsEnabled ?? {}) },
          weldingMetrics:  (raw as PerContractorData).weldingMetrics ?? [],
        };
      };
      setContractorSections({
        'HL-GISAICO':   hydrate('HL-GISAICO'),
        'TECNITANQUES': hydrate('TECNITANQUES'),
        'CYC':          hydrate('CYC'),
      });
    } else {
      // Legacy format — migrate HL-GISAICO data
      const hlData = DEFAULT_CONTRACTOR_DATA();
      hlData.activities = r.activities || '';
      hlData.checklist  = { workAtHeights: !!r.seguridad_hse?.workAtHeights, hotWork: !!r.seguridad_hse?.hotWork, confinedSpace: !!r.seguridad_hse?.confinedSpace, scaffolding: !!r.seguridad_hse?.scaffolding };
      hlData.safetyInfo = r.safety_info ? { ...r.safety_info } : { ...EMPTY_SAFETY };
      const old = r.contractors?.find(c => c.name === 'HL-GISAICO');
      if (old?.breakdown) hlData.personnel = { ...EMPTY_PERSONNEL, soldadoresCalificados: (old.breakdown as Record<string, number>).soldadores ?? 0, auxiliaresAyudantes: (old.breakdown as Record<string, number>).auxiliares ?? 0, armadores: (old.breakdown as Record<string, number>).armadores ?? 0 };
      if (old?.equipment) hlData.equipment = { grua: old.equipment.grua ?? 0, generador: old.equipment.generador ?? 0, andamios: old.equipment.andamios ?? 0, camionGrua: old.equipment.camionGrua ?? 0, torreGrua: old.equipment.torreGrua ?? 0, equipoEspecial: old.equipment.equipoEspecial ?? '' };
      if (old?.lostHours) hlData.lostHours = { malClima: old.lostHours.malClima ?? 0, parosHSE: old.lostHours.parosHSE ?? 0, fallasTecnicas: old.lostHours.fallasTecnicas ?? 0, charlaInfo: old.lostHours.charlaInfo ?? 0 };

      // Try to migrate TECNITANQUES and CYC from old contractors[]
      const mapOld = (name: string): PerContractorData => {
        const d  = DEFAULT_CONTRACTOR_DATA();
        const oc = r.contractors?.find(c => c.name === name);
        if (!oc) return d;
        if (oc.breakdown) d.personnel = { ...EMPTY_PERSONNEL, soldadoresCalificados: (oc.breakdown as Record<string, number>).soldadores ?? 0, auxiliaresAyudantes: (oc.breakdown as Record<string, number>).auxiliares ?? 0, armadores: (oc.breakdown as Record<string, number>).armadores ?? 0 };
        if (oc.equipment) d.equipment = { grua: oc.equipment.grua ?? 0, generador: oc.equipment.generador ?? 0, andamios: oc.equipment.andamios ?? 0, camionGrua: oc.equipment.camionGrua ?? 0, torreGrua: oc.equipment.torreGrua ?? 0, equipoEspecial: oc.equipment.equipoEspecial ?? '' };
        if (oc.lostHours) d.lostHours = { malClima: oc.lostHours.malClima ?? 0, parosHSE: oc.lostHours.parosHSE ?? 0, fallasTecnicas: oc.lostHours.fallasTecnicas ?? 0, charlaInfo: oc.lostHours.charlaInfo ?? 0 };
        return d;
      };

      setContractorSections({ 'HL-GISAICO': hlData, 'TECNITANQUES': mapOld('TECNITANQUES'), 'CYC': mapOld('CYC') });
    }

    setAdminActivities(r.admin_activities?.length ? r.admin_activities.map(a => ({ ...a })) : DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })));
    setEvidence(r.evidence || []);
    setActiveContractorId('HL-GISAICO');
    setTab('meta');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Purge ──
  const purge = async (id: string, cid: string) => {
    if (!firestore || !isRoot) return;
    if (!confirm(`⚠️ PURGA ROOT: ¿Destruir ${cid}? Irreversible.`)) return;
    try {
      await deleteDoc(doc(firestore, 'projects', ACTIVE_PROJECT, 'daily_reports', id));
      toast({ title: '🗑️ PURGA COMPLETADA', description: cid });
    } catch {
      toast({ variant: 'destructive', title: 'ERROR DE PURGA' });
    }
  };

  // ── Loading ──
  if (!mounted || isUserLoading) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mx-auto" />
          <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-widest">Inicializando módulo…</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#0A0E14]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">

          {/* ── Header ── */}
          <header className="sticky top-0 z-20 px-6 py-4 border-b border-primary/10 bg-[#0A0E14]/95 backdrop-blur shadow-xl">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-cyan-400 uppercase tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-cyan-400" />
                  </div>
                  REPORTES DIARIOS
                  {anyRiskGlobal && (
                    <span className="animate-pulse text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full">
                      ⚠️ RIESGOS ACTIVOS
                    </span>
                  )}
                </h1>
                <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.3em] mt-0.5">
                  ARIS MINING — MIL24.001 | LOWER MINING PROJECT
                </p>
              </div>
              <div className="flex items-center gap-4">
                {lastId && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-mono text-green-500/50 uppercase">Último Anclado</p>
                    <p className="text-xs font-mono text-green-400 font-bold">{lastId}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-green-500/60 uppercase">LIVE</span>
                </div>
                <div className="bg-[#0B1018] border border-primary/20 rounded px-3 py-1.5 text-center min-w-[52px]">
                  <p className="text-[9px] font-mono text-primary/30 uppercase">Folios</p>
                  <p className="text-lg font-bold text-cyan-400 font-mono leading-none">{reports?.length ?? 0}</p>
                </div>
              </div>
            </div>
          </header>

          {/* ── Body ── */}
          <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[500px_1fr] gap-6">

            {/* ════════ FORM PANEL ════════ */}
            <div className="bg-[#0B1018] border border-primary/20 rounded-xl shadow-2xl overflow-hidden">

              {/* Form header */}
              <div className="px-5 py-3.5 border-b border-primary/10 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-2">
                  {editing ? (
                    <><Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono">
                        Editando: {editing.metadata.consecutiveId}
                      </span></>
                  ) : (
                    <><Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">Nuevo Folio</span></>
                  )}
                </div>
                {editing && (
                  <button onClick={reset} className="text-[10px] font-mono text-red-400 hover:text-red-300 uppercase">✕ Cancelar</button>
                )}
              </div>

              {/* ══ CONTRACTOR SELECTOR ══ */}
              <div className="px-5 pt-4 pb-3 border-b border-primary/10">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 className="w-3 h-3" /> Contratistas en Reporte
                  </Label>
                  <span className="text-[9px] font-mono text-primary/30">
                    👷 {totalPersonnelAll} total en campo
                  </span>
                </div>
                <p className="text-[8px] font-mono text-primary/30 mb-2">
                  Activa/desactiva contratistas · Haz clic en la tarjeta para editar
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CONTRACTORS_CONFIG.map(cfg => {
                    const cid      = cfg.id as ContractorId;
                    const total    = Object.values(contractorSections[cid].personnel).reduce((s, v) => s + v, 0);
                    const isActive  = activeContractorId === cid;
                    const isEnabled = enabledContractors.has(cid);
                    return (
                      <div key={cid} className="relative flex flex-col">
                        {/* Toggle enable/disable button */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleContractor(cid); }}
                          title={isEnabled ? `Desactivar ${cfg.label} del reporte` : `Activar ${cfg.label} en el reporte`}
                          className={`absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all shadow-md ${
                            isEnabled
                              ? 'bg-green-500 border-green-400 text-black'
                              : 'bg-[#0B1018] border-primary/30 text-primary/30 hover:border-primary/60'
                          }`}
                        >
                          {isEnabled ? '✓' : '○'}
                        </button>
                        {/* Selector card */}
                        <button
                          onClick={() => setActiveContractorId(cid)}
                          className={`relative py-2.5 px-3 rounded-lg border text-left transition-all w-full ${
                            !isEnabled
                              ? 'bg-primary/5 border-primary/10 text-primary/25 opacity-50'
                              : isActive
                                ? cfg.activeCls
                                : cfg.inactiveCls
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm leading-none">{cfg.icon}</span>
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider leading-tight">{cfg.label}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className={`text-[7px] font-mono uppercase opacity-60 ${isActive && isEnabled ? '' : 'text-primary/30'}`}>
                              {cfg.sistema}
                            </span>
                            {total > 0 && isEnabled && (
                              <span className="text-[8px] font-mono font-bold" style={{ color: cfg.color }}>
                                {total}p
                              </span>
                            )}
                          </div>
                          {isActive && isEnabled && (
                            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {/* Active contractor context banner */}
                <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded bg-primary/5 border border-primary/10">
                  <span className="text-sm">{activeCfg.icon}</span>
                  <p className="text-[8px] font-mono text-primary/50">{activeCfg.description}</p>
                  {!enabledContractors.has(activeContractorId) && (
                    <span className="ml-auto text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                      ⚠ Inactivo en reporte
                    </span>
                  )}
                </div>
                {/* Enabled contractors chips */}
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  <span className="text-[8px] font-mono text-primary/30">En reporte:</span>
                  {CONTRACTORS_CONFIG.filter(c => enabledContractors.has(c.id as ContractorId)).map(c => (
                    <span key={c.id} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full border"
                      style={{ color: c.color, borderColor: `${c.color}50`, backgroundColor: `${c.color}12` }}>
                      {c.icon} {c.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* HSE warning banner (active contractor) */}
              {anyRisk && (
                <div className="mx-5 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      ⚠️ Permiso de Trabajo — {activeContractorId}
                    </p>
                    <p className="text-[9px] text-amber-300/60 mt-0.5">
                      {(Object.entries(activeData.checklist) as [HSEKey, boolean][]).filter(([, v]) => v).map(([k]) => HSE_CONFIG[k].label).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-0 border-b border-primary/10 mt-4 px-2 overflow-x-auto scrollbar-thin">
                {([
                  { id: 'meta',      label: 'Datos',    icon: FileText,   alert: false,    badge: 0 },
                  { id: 'hse',       label: 'HSE',      icon: Shield,     alert: anyRisk,  badge: 0 },
                  { id: 'recursos',  label: 'Personal', icon: Users,      alert: false,    badge: 0 },
                  { id: 'equipos',   label: 'Equipos',  icon: Building2,  alert: false,    badge: 0 },
                  { id: 'seguridad', label: 'Seguridad',icon: HardHat,    alert: (activeData.safetyInfo.incidents > 0), badge: activeData.safetyInfo.incidents },
                  { id: 'admin',     label: 'Avances',  icon: TrendingUp, alert: false,    badge: 0 },
                  { id: 'evidencia', label: 'Evidencia',icon: Camera,     alert: false,    badge: evidence.length },
                ] as Array<{ id: TabId; label: string; icon: React.ElementType; alert: boolean; badge: number }>
                ).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative flex items-center gap-1 px-2.5 py-2 text-[9px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                      tab === t.id ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-primary/40 hover:text-primary/70'
                    }`}
                  >
                    <t.icon className="w-3 h-3 flex-shrink-0" />
                    {t.label}
                    {t.alert && <span className="absolute top-1 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                    {t.badge > 0 && <span className="ml-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] px-1.5 rounded-full">{t.badge}</span>}
                  </button>
                ))}
              </div>

              {/* Tab content — key forces full remount when contractor changes, preventing stale DOM state */}
              <div key={`${activeContractorId}-${tab}`} className="p-5 space-y-4">

                {/* ── TAB: META (activities + weather) ── */}
                {tab === 'meta' && (
                  <div className="space-y-4">
                    {/* Fecha del reporte */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> Fecha del Reporte
                      </Label>
                      <Input
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        className="bg-primary/5 border-primary/10 text-xs font-mono w-48"
                      />
                    </div>
                    {/* Clima — global */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Condición Climática — Global</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {WEATHER_OPTIONS.map(w => (
                          <button key={w} onClick={() => setWeather(w)}
                            className={`px-2 py-1.5 rounded text-[9px] font-mono border transition-all ${weather === w ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-primary/30'}`}>
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Activities — per contractor */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5" style={{ color: activeCfg.color }}>
                          <span>{activeCfg.icon}</span> Narrativa — {activeContractorId} *
                        </Label>
                        <span className="text-[9px] font-mono text-primary/30">{activeData.activities.length} car.</span>
                      </div>
                      <Textarea
                        value={activeData.activities}
                        onChange={e => updateSection('activities', e.target.value)}
                        placeholder={`Actividades ejecutadas por ${activeContractorId}. Una por línea para mejor formato en el reporte impreso…`}
                        className="bg-primary/5 border-primary/10 text-xs min-h-[140px] resize-none font-mono leading-relaxed"
                        style={{ borderColor: `${activeCfg.color}22` }}
                      />
                      <p className="text-[8px] font-mono text-primary/25">
                        💡 Tip: escriba una actividad por línea — el PDF las numerará automáticamente
                      </p>
                    </div>

                    {/* ── METRAJES DE SOLDADURA — solo TECNITANQUES y CYC ── */}
                    {(activeContractorId === 'TECNITANQUES' || activeContractorId === 'CYC') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5"
                            style={{ color: activeCfg.color }}>
                            🔥 Metrajes de Soldadura — {activeContractorId}
                          </Label>
                          <button
                            onClick={() => updateSection('weldingMetrics', [
                              ...activeData.weldingMetrics,
                              { estructura: '', metrajeMl: 0, soldadores: 0 },
                            ])}
                            className="flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded border transition-all hover:opacity-80"
                            style={{ borderColor: `${activeCfg.color}50`, color: activeCfg.color, backgroundColor: `${activeCfg.color}12` }}
                          >
                            <Plus className="w-3 h-3" /> Agregar fila
                          </button>
                        </div>

                        {activeData.weldingMetrics.length > 0 ? (
                          <>
                            <div className="rounded-lg border overflow-hidden" style={{ borderColor: `${activeCfg.color}30` }}>
                              {/* Table header */}
                              <div
                                className="grid text-[8px] font-mono font-bold uppercase tracking-wider"
                                style={{
                                  gridTemplateColumns: '1fr 84px 76px 30px',
                                  backgroundColor: `${activeCfg.color}22`,
                                  color: activeCfg.color,
                                }}
                              >
                                <div className="px-2.5 py-1.5">Estructura / Tanque</div>
                                <div className="px-2 py-1.5 text-center">Metraje (ml)</div>
                                <div className="px-2 py-1.5 text-center">Soldadores</div>
                                <div />
                              </div>

                              {/* Rows */}
                              {activeData.weldingMetrics.map((row, idx) => (
                                <div
                                  key={idx}
                                  className="grid border-t"
                                  style={{
                                    gridTemplateColumns: '1fr 84px 76px 30px',
                                    borderColor: `${activeCfg.color}15`,
                                    backgroundColor: idx % 2 === 0 ? 'transparent' : `${activeCfg.color}06`,
                                  }}
                                >
                                  <input
                                    value={row.estructura}
                                    onChange={e => {
                                      const n = [...activeData.weldingMetrics];
                                      n[idx] = { ...n[idx], estructura: e.target.value };
                                      updateSection('weldingMetrics', n);
                                    }}
                                    placeholder="TK-002, Cañería..."
                                    className="px-2.5 py-1.5 bg-transparent text-[10px] font-mono text-primary/80 placeholder-primary/20 outline-none border-r"
                                    style={{ borderColor: `${activeCfg.color}15` }}
                                  />
                                  <input
                                    type="number" min="0" step="0.5"
                                    value={row.metrajeMl === 0 ? '' : row.metrajeMl}
                                    onChange={e => {
                                      const n = [...activeData.weldingMetrics];
                                      n[idx] = { ...n[idx], metrajeMl: parseFloat(e.target.value) || 0 };
                                      updateSection('weldingMetrics', n);
                                    }}
                                    placeholder="0"
                                    className="px-2 py-1.5 bg-transparent text-[11px] font-mono font-bold text-center outline-none border-r"
                                    style={{ color: activeCfg.color, borderColor: `${activeCfg.color}15` }}
                                  />
                                  <input
                                    type="number" min="0"
                                    value={row.soldadores === 0 ? '' : row.soldadores}
                                    onChange={e => {
                                      const n = [...activeData.weldingMetrics];
                                      n[idx] = { ...n[idx], soldadores: parseInt(e.target.value) || 0 };
                                      updateSection('weldingMetrics', n);
                                    }}
                                    placeholder="0"
                                    className="px-2 py-1.5 bg-transparent text-[11px] font-mono font-bold text-center outline-none border-r"
                                    style={{ color: activeCfg.color, borderColor: `${activeCfg.color}15` }}
                                  />
                                  <button
                                    onClick={() => updateSection('weldingMetrics', activeData.weldingMetrics.filter((_, j) => j !== idx))}
                                    className="flex items-center justify-center text-red-500/25 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}

                              {/* Totals row */}
                              {(() => {
                                const totalMl   = activeData.weldingMetrics.reduce((s, r) => s + r.metrajeMl, 0);
                                const totalSold = activeData.weldingMetrics.reduce((s, r) => s + r.soldadores, 0);
                                const decl      = activeData.personnel.soldadoresCalificados;
                                const match     = totalSold === decl;
                                return (
                                  <div
                                    className="grid border-t px-0 py-0 text-[9px] font-mono font-bold"
                                    style={{
                                      gridTemplateColumns: '1fr 84px 76px 30px',
                                      borderColor: `${activeCfg.color}30`,
                                      backgroundColor: `${activeCfg.color}14`,
                                    }}
                                  >
                                    <div className="px-2.5 py-1.5 text-primary/50 uppercase tracking-wide text-[8px]">TOTALES</div>
                                    <div className="px-2 py-1.5 text-center" style={{ color: activeCfg.color }}>
                                      {totalMl % 1 === 0 ? totalMl : totalMl.toFixed(1)} ml
                                    </div>
                                    <div className={`px-2 py-1.5 text-center ${match ? 'text-green-400' : 'text-amber-400'}`}>
                                      {totalSold} / {decl}
                                    </div>
                                    <div />
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Validation warning */}
                            {(() => {
                              const totalSold = activeData.weldingMetrics.reduce((s, r) => s + r.soldadores, 0);
                              const decl      = activeData.personnel.soldadoresCalificados;
                              if (totalSold === decl) return null;
                              return (
                                <div className="flex items-start gap-2 px-2.5 py-2 rounded border border-amber-500/30 bg-amber-500/5">
                                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-[9px] font-mono text-amber-300">
                                    {totalSold > decl
                                      ? `Soldadores asignados (${totalSold}) superan los declarados en Personal (${decl}). Revise.`
                                      : `${decl - totalSold} soldador(es) sin asignar. Total declarado: ${decl} — Asignados: ${totalSold}.`}
                                  </p>
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <div className="border border-dashed rounded-lg p-3 text-center"
                            style={{ borderColor: `${activeCfg.color}20` }}>
                            <p className="text-[9px] font-mono text-primary/30">
                              Sin registros de soldadura — Pulse &ldquo;Agregar fila&rdquo; para iniciar
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <button onClick={() => setTab('hse')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Matriz HSE →
                    </button>
                  </div>
                )}

                {/* ── TAB: HSE (per contractor) ── */}
                {tab === 'hse' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{activeCfg.icon}</span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: activeCfg.color }}>
                          HSE — {activeContractorId}
                        </span>
                      </div>
                      {/* Section toggle */}
                      <button
                        onClick={() => updateSection('sectionsEnabled', { ...activeData.sectionsEnabled, hse: !activeData.sectionsEnabled.hse })}
                        className={`flex items-center gap-1.5 text-[8px] font-mono px-2.5 py-1 rounded-full border transition-all ${
                          activeData.sectionsEnabled.hse
                            ? 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                            : 'bg-primary/5 border-primary/20 text-primary/40 hover:border-green-500/30 hover:text-green-400'
                        }`}
                      >
                        {activeData.sectionsEnabled.hse ? '● ACTIVO' : '○ INACTIVO'}
                      </button>
                    </div>

                    {!activeData.sectionsEnabled.hse ? (
                      <div className="border border-dashed border-primary/20 rounded-lg p-6 text-center space-y-3">
                        <Shield className="w-8 h-8 text-primary/20 mx-auto" />
                        <p className="text-[10px] font-mono text-primary/40 uppercase">
                          Sección HSE desactivada para {activeContractorId}
                        </p>
                        <p className="text-[9px] font-mono text-primary/25">
                          No se incluirán permisos de trabajo en el reporte
                        </p>
                        <button
                          onClick={() => updateSection('sectionsEnabled', { ...activeData.sectionsEnabled, hse: true })}
                          className="mx-auto flex items-center gap-1.5 text-[9px] font-mono px-3 py-1.5 rounded border border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all"
                        >
                          <Shield className="w-3 h-3" /> Activar HSE para {activeContractorId}
                        </button>
                      </div>
                    ) : (
                      <>
                        {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([key, cfg]) => (
                          <div key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${activeData.checklist[key] ? cfg.bg : 'bg-primary/5 border-primary/10'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{cfg.icon}</span>
                              <div>
                                <p className="text-xs font-mono font-bold uppercase text-primary/80">{cfg.label}</p>
                                <p className="text-[9px] text-primary/40 font-mono">
                                  {activeData.checklist[key] ? '⚡ Permiso Activo — APT Requerido' : 'Sin riesgo identificado'}
                                </p>
                              </div>
                            </div>
                            <Switch
                              checked={activeData.checklist[key]}
                              onCheckedChange={c => updateSection('checklist', { ...activeData.checklist, [key]: c })}
                              className={activeData.checklist[key] ? 'data-[state=checked]:bg-amber-500' : ''}
                            />
                          </div>
                        ))}
                        {anyRisk && (
                          <div className="bg-red-500/5 border border-red-500/20 rounded p-2.5 text-center">
                            <p className="text-[10px] font-mono text-red-400 uppercase">
                              🚨 {(Object.values(activeData.checklist) as boolean[]).filter(Boolean).length} Permiso(s) Activo(s) — {activeContractorId}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    <button onClick={() => setTab('recursos')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Personal en Campo →
                    </button>
                  </div>
                )}

                {/* ── TAB: RECURSOS / PERSONAL (per contractor) ── */}
                {tab === 'recursos' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{activeCfg.icon}</span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: activeCfg.color }}>
                        Personal en Campo — {activeContractorId}
                      </span>
                    </div>

                    {/* Personnel fields — 17 roles for HL-GISAICO + TECNITANQUES, 11 for CYC */}
                    {(() => {
                      const fields = activeContractorId === 'CYC' ? PERSONNEL_FIELDS_CYC : PERSONNEL_FIELDS_FULL;
                      return (
                        <div className="space-y-1.5">
                          {fields.map(([field, label, icon]) => (
                            <div key={field}
                              className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 group hover:border-primary/20 transition-all">
                              <span className="text-sm w-6 text-center leading-none">{icon}</span>
                              <span className="flex-1 text-[10px] font-mono text-primary/70">{label}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateSection('personnel', { ...activeData.personnel, [field]: Math.max(0, activeData.personnel[field] - 1) })}
                                  className="w-6 h-6 rounded bg-primary/10 text-primary/60 text-xs font-bold hover:bg-primary/20 transition-colors"
                                >−</button>
                                <input
                                  type="number" min="0"
                                  value={activeData.personnel[field] || ''}
                                  placeholder="0"
                                  onChange={e => updateSection('personnel', { ...activeData.personnel, [field]: Math.max(0, parseInt(e.target.value) || 0) })}
                                  className="w-10 bg-transparent text-[13px] font-mono font-bold text-center outline-none"
                                  style={{ color: activeCfg.color }}
                                />
                                <button
                                  onClick={() => updateSection('personnel', { ...activeData.personnel, [field]: activeData.personnel[field] + 1 })}
                                  className="w-6 h-6 rounded bg-primary/10 text-primary/60 text-xs font-bold hover:bg-primary/20 transition-colors"
                                >+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Personnel summary */}
                    {(() => {
                      const fields = activeContractorId === 'CYC' ? PERSONNEL_FIELDS_CYC : PERSONNEL_FIELDS_FULL;
                      const fieldMap = Object.fromEntries(fields.map(([f, l]) => [f, l]));
                      const nonZero = fields.filter(([f]) => activeData.personnel[f] > 0);
                      return (
                        <div className="rounded-lg border p-3 space-y-1" style={{ borderColor: `${activeCfg.color}30`, backgroundColor: `${activeCfg.color}08` }}>
                          <p className="text-[9px] font-mono uppercase tracking-wider mb-1.5" style={{ color: `${activeCfg.color}99` }}>
                            📊 Resumen Personal — {activeContractorId}
                          </p>
                          {nonZero.length === 0 ? (
                            <p className="text-[9px] font-mono text-primary/25">Sin personal registrado</p>
                          ) : nonZero.map(([f, , icon]) => (
                            <div key={f} className="flex justify-between text-[9px] font-mono">
                              <span className="text-primary/50">{icon} {fieldMap[f]}</span>
                              <span className="font-bold" style={{ color: activeCfg.color }}>{activeData.personnel[f]} pers.</span>
                            </div>
                          ))}
                          <div className="border-t pt-1.5 flex justify-between text-[10px] font-bold font-mono" style={{ borderColor: `${activeCfg.color}20` }}>
                            <span className="text-primary/60">TOTAL {activeContractorId}</span>
                            <span style={{ color: activeCfg.color }}>
                              {Object.values(activeData.personnel).reduce((s, v) => s + v, 0)} pers.
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Global summary */}
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                      <p className="text-[9px] font-mono text-primary/40 uppercase mb-2">Gran Total en Campo</p>
                      {CONTRACTORS_CONFIG.map(cfg => {
                        const t = Object.values(contractorSections[cfg.id as ContractorId].personnel).reduce((s, v) => s + v, 0);
                        return t > 0 ? (
                          <div key={cfg.id} className="flex justify-between text-[9px] font-mono mb-1">
                            <span className="text-primary/50">{cfg.icon} {cfg.label}</span>
                            <span className="font-bold" style={{ color: cfg.color }}>{t} pers.</span>
                          </div>
                        ) : null;
                      })}
                      <div className="border-t border-cyan-500/20 pt-1.5 flex justify-between text-[11px] font-bold font-mono">
                        <span className="text-cyan-300">TOTAL GENERAL</span>
                        <span className="text-cyan-400">{totalPersonnelAll} pers.</span>
                      </div>
                    </div>

                    <button onClick={() => setTab('equipos')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Equipos y Maquinaria →
                    </button>
                  </div>
                )}

                {/* ── TAB: EQUIPOS (per contractor) ── */}
                {tab === 'equipos' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{activeCfg.icon}</span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: activeCfg.color }}>
                        Equipos en Campo — {activeContractorId}
                      </span>
                    </div>

                    {/* Equipment */}
                    <div className="space-y-2">
                      {([
                        ['grua',       'Grúa (unidades)',      '🏗️'],
                        ['generador',  'Generador (unidades)', '⚡'],
                        ['andamios',   'Andamios (m³)',        '🪜'],
                        ['camionGrua', 'Camión Grúa (und)',    '🚛'],
                        ['torreGrua',  'Torre Grúa (und)',     '🗼'],
                      ] as [Exclude<keyof ContractorEquipment, 'equipoEspecial'>, string, string][]).map(([field, label, icon]) => (
                        <div key={field}
                          className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 group hover:border-primary/20 transition-all">
                          <span className="text-base w-6 text-center">{icon}</span>
                          <span className="flex-1 text-[10px] font-mono text-primary/60">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => updateSection('equipment', { ...activeData.equipment, [field]: Math.max(0, (activeData.equipment[field] as number) - 1) })}
                              className="w-6 h-6 rounded bg-primary/10 text-primary/60 text-xs font-bold hover:bg-primary/20">−</button>
                            <input
                              type="number" min="0"
                              value={activeData.equipment[field] as number}
                              onChange={e => updateSection('equipment', { ...activeData.equipment, [field]: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="w-12 bg-transparent text-[13px] font-mono font-bold text-emerald-400 text-center outline-none"
                            />
                            <button onClick={() => updateSection('equipment', { ...activeData.equipment, [field]: (activeData.equipment[field] as number) + 1 })}
                              className="w-6 h-6 rounded bg-primary/10 text-primary/60 text-xs font-bold hover:bg-primary/20">+</button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                        <span className="text-base w-6 text-center">🔩</span>
                        <span className="text-[10px] font-mono text-primary/60 w-28">Equipo Especial</span>
                        <input
                          value={activeData.equipment.equipoEspecial}
                          onChange={e => updateSection('equipment', { ...activeData.equipment, equipoEspecial: e.target.value })}
                          placeholder="Descripción libre..."
                          className="flex-1 bg-transparent text-[11px] font-mono text-emerald-400 placeholder-primary/20 outline-none"
                        />
                      </div>
                    </div>

                    {/* Lost Hours */}
                    <div>
                      <p className="text-[9px] font-mono text-red-400/60 uppercase tracking-wider mb-2">⏱ Horas Perdidas — {activeContractorId}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          ['malClima',       'Mal Clima',   'text-blue-400',  '#3B82F6'],
                          ['parosHSE',       'Paros HSE',   'text-amber-400', '#F59E0B'],
                          ['fallasTecnicas', 'Falla Téc.',  'text-red-400',   '#EF4444'],
                        ] as [keyof ContractorLostHours, string, string, string][]).map(([field, label, cls, hex]) => (
                          <div key={field} className="bg-primary/5 border border-primary/10 rounded-lg px-2 py-2.5 text-center">
                            <p className="text-[8px] font-mono text-primary/40 mb-1.5">{label}</p>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateSection('lostHours', { ...activeData.lostHours, [field]: Math.max(0, activeData.lostHours[field] - 0.5) })}
                                className="w-5 h-5 rounded bg-primary/10 text-primary/50 text-[10px] font-bold hover:bg-primary/20">−</button>
                              <input
                                type="number" min="0" step="0.5"
                                value={activeData.lostHours[field]}
                                onChange={e => updateSection('lostHours', { ...activeData.lostHours, [field]: Math.max(0, parseFloat(e.target.value) || 0) })}
                                className={`w-10 bg-transparent text-[13px] font-mono font-bold ${cls} text-center outline-none`}
                              />
                              <button onClick={() => updateSection('lostHours', { ...activeData.lostHours, [field]: activeData.lostHours[field] + 0.5 })}
                                className="w-5 h-5 rounded bg-primary/10 text-primary/50 text-[10px] font-bold hover:bg-primary/20">+</button>
                            </div>
                            <p className="text-[8px] font-mono text-primary/30 mt-0.5">hrs</p>
                          </div>
                        ))}
                      </div>
                      {(activeData.lostHours.malClima + activeData.lostHours.parosHSE + activeData.lostHours.fallasTecnicas) > 0 && (
                        <p className="text-[9px] font-mono text-red-400/70 mt-1 text-right">
                          Total perdidas: <span className="font-bold text-red-400">
                            {(activeData.lostHours.malClima + activeData.lostHours.parosHSE + activeData.lostHours.fallasTecnicas).toFixed(1)} h
                          </span>
                        </p>
                      )}
                    </div>

                    <button onClick={() => setTab('seguridad')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Seguridad Industrial →
                    </button>
                  </div>
                )}

                {/* ── TAB: SEGURIDAD (per contractor) ── */}
                {tab === 'seguridad' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{activeCfg.icon}</span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: activeCfg.color }}>
                          Seguridad — {activeContractorId}
                        </span>
                      </div>
                      {/* Section toggle */}
                      <button
                        onClick={() => updateSection('sectionsEnabled', { ...activeData.sectionsEnabled, seguridad: !activeData.sectionsEnabled.seguridad })}
                        className={`flex items-center gap-1.5 text-[8px] font-mono px-2.5 py-1 rounded-full border transition-all ${
                          activeData.sectionsEnabled.seguridad
                            ? 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                            : 'bg-primary/5 border-primary/20 text-primary/40 hover:border-green-500/30 hover:text-green-400'
                        }`}
                      >
                        {activeData.sectionsEnabled.seguridad ? '● ACTIVO' : '○ INACTIVO'}
                      </button>
                    </div>

                    {!activeData.sectionsEnabled.seguridad ? (
                      <div className="border border-dashed border-primary/20 rounded-lg p-6 text-center space-y-3">
                        <HardHat className="w-8 h-8 text-primary/20 mx-auto" />
                        <p className="text-[10px] font-mono text-primary/40 uppercase">
                          Sección Seguridad desactivada para {activeContractorId}
                        </p>
                        <p className="text-[9px] font-mono text-primary/25">
                          No se incluirán datos de seguridad de este contratista
                        </p>
                        <button
                          onClick={() => updateSection('sectionsEnabled', { ...activeData.sectionsEnabled, seguridad: true })}
                          className="mx-auto flex items-center gap-1.5 text-[9px] font-mono px-3 py-1.5 rounded border border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all"
                        >
                          <HardHat className="w-3 h-3" /> Activar Seguridad para {activeContractorId}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                            <p className="text-[9px] font-mono text-red-400/70 uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Incidentes
                            </p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateSection('safetyInfo', { ...activeData.safetyInfo, incidents: Math.max(0, activeData.safetyInfo.incidents - 1) })} className="w-6 h-6 rounded bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20">-</button>
                              <span className="flex-1 text-center text-lg font-bold font-mono text-red-400">{activeData.safetyInfo.incidents}</span>
                              <button onClick={() => updateSection('safetyInfo', { ...activeData.safetyInfo, incidents: activeData.safetyInfo.incidents + 1 })} className="w-6 h-6 rounded bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20">+</button>
                            </div>
                          </div>
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                            <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Near Miss
                            </p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateSection('safetyInfo', { ...activeData.safetyInfo, nearMisses: Math.max(0, activeData.safetyInfo.nearMisses - 1) })} className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20">-</button>
                              <span className="flex-1 text-center text-lg font-bold font-mono text-amber-400">{activeData.safetyInfo.nearMisses}</span>
                              <button onClick={() => updateSection('safetyInfo', { ...activeData.safetyInfo, nearMisses: activeData.safetyInfo.nearMisses + 1 })} className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20">+</button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3" /> Observaciones de Seguridad
                          </Label>
                          <Textarea
                            value={activeData.safetyInfo.comments}
                            onChange={e => updateSection('safetyInfo', { ...activeData.safetyInfo, comments: e.target.value })}
                            placeholder="Desempeño en seguridad, condiciones del sitio, medidas correctivas…"
                            className="bg-primary/5 border-amber-500/20 text-xs min-h-[90px] resize-none font-mono leading-relaxed"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                            <HardHat className="w-3 h-3" /> Observaciones EPP
                          </Label>
                          <Textarea
                            value={activeData.safetyInfo.eppObservations}
                            onChange={e => updateSection('safetyInfo', { ...activeData.safetyInfo, eppObservations: e.target.value })}
                            placeholder="Estado y cumplimiento del EPP en campo…"
                            className="bg-primary/5 border-primary/10 text-xs min-h-[60px] resize-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3" /> Lecciones Aprendidas HSE
                          </Label>
                          <Textarea
                            value={activeData.safetyInfo.lessonsLearned}
                            onChange={e => updateSection('safetyInfo', { ...activeData.safetyInfo, lessonsLearned: e.target.value })}
                            placeholder="Lecciones aprendidas, puntos de mejora, buenas prácticas…"
                            className="bg-primary/5 border-cyan-500/20 text-xs min-h-[60px] resize-none font-mono"
                          />
                        </div>
                      </>
                    )}

                    <button onClick={() => setTab('admin')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Avances Administrativos →
                    </button>
                  </div>
                )}

                {/* ── TAB: ADMIN (global) ── */}
                {tab === 'admin' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Avances Administrativos — Global
                      </Label>
                      <div className="flex items-center gap-2">
                        {/* Global avances toggle */}
                        <button
                          onClick={() => setAvancesEnabled(v => !v)}
                          className={`flex items-center gap-1 text-[8px] font-mono px-2 py-1 rounded-full border transition-all ${
                            avancesEnabled
                              ? 'bg-green-500/10 border-green-500/40 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                              : 'bg-primary/5 border-primary/20 text-primary/40 hover:border-green-500/30 hover:text-green-400'
                          }`}
                        >
                          {avancesEnabled ? '● ACTIVO' : '○ INACTIVO'}
                        </button>
                        {avancesEnabled && (
                          <Button variant="ghost" size="sm"
                            onClick={() => setAdminActivities(p => [...p, { name: '', progress: 0 }])}
                            className="h-6 px-2 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-mono">
                            <Plus className="w-3 h-3 mr-1" />Nueva
                          </Button>
                        )}
                      </div>
                    </div>

                    {!avancesEnabled && (
                      <div className="border border-dashed border-primary/20 rounded-lg p-6 text-center space-y-3">
                        <TrendingUp className="w-8 h-8 text-primary/20 mx-auto" />
                        <p className="text-[10px] font-mono text-primary/40 uppercase">Sección Avances desactivada</p>
                        <p className="text-[9px] font-mono text-primary/25">No se incluirán avances administrativos en el reporte</p>
                        <button
                          onClick={() => setAvancesEnabled(true)}
                          className="mx-auto flex items-center gap-1.5 text-[9px] font-mono px-3 py-1.5 rounded border border-green-500/40 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all"
                        >
                          <TrendingUp className="w-3 h-3" /> Activar Avances
                        </button>
                      </div>
                    )}

                    {avancesEnabled && (
                      <>
                        <div className="space-y-3">
                          {adminActivities.map((act, i) => {
                            const pct = act.progress;
                            const barColor = pct < 30 ? '#EF5350' : pct < 70 ? '#FFB300' : '#66BB6A';
                            return (
                              <div key={i} className="group space-y-1.5 bg-primary/[0.03] border border-primary/10 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                  <input
                                    value={act.name}
                                    onChange={e => { const n = [...adminActivities]; n[i] = { ...n[i], name: e.target.value }; setAdminActivities(n); }}
                                    placeholder="Nombre de la actividad..."
                                    className="flex-1 bg-transparent text-[11px] font-mono text-primary/80 placeholder-primary/25 outline-none"
                                  />
                                  <button onClick={() => setAdminActivities(p => p.filter((_, j) => j !== i))}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/30 hover:text-red-500">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="range" min="0" max="100" step="5" value={pct}
                                      onChange={e => { const n = [...adminActivities]; n[i] = { ...n[i], progress: parseInt(e.target.value) }; setAdminActivities(n); }}
                                      className="w-20 h-1.5 accent-cyan-500"
                                    />
                                    <div className="flex items-center gap-0.5 w-12 justify-end">
                                      <span className="text-[11px] font-bold font-mono" style={{ color: barColor }}>{pct}</span>
                                      <Percent className="w-2.5 h-2.5" style={{ color: barColor }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {adminActivities.length > 0 && (
                          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono text-primary/40 uppercase">Avance Promedio</span>
                              <span className="text-[13px] font-bold font-mono text-cyan-400">
                                {Math.round(adminActivities.reduce((s, a) => s + a.progress, 0) / adminActivities.length)}%
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                                style={{ width: `${Math.round(adminActivities.reduce((s, a) => s + a.progress, 0) / adminActivities.length)}%` }} />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <button onClick={() => setTab('evidencia')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider">
                      Siguiente: Bóveda de Evidencia →
                    </button>
                  </div>
                )}

                {/* ── TAB: EVIDENCIA (global) ── */}
                {tab === 'evidencia' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="border-2 border-dashed border-primary/20 bg-primary/[0.02] rounded-lg p-6 text-center hover:bg-primary/5 hover:border-cyan-500/30 transition-all cursor-pointer group flex flex-col justify-center h-full"
                        onClick={() => fileRef.current?.click()}>
                        <input type="file" multiple accept="image/*,.pdf" ref={fileRef} className="hidden" onChange={handleUpload} />
                        <Camera className="w-7 h-7 text-primary/30 mx-auto mb-2 group-hover:text-cyan-400 transition-colors" />
                        <p className="text-[10px] font-mono text-primary/40 uppercase tracking-wider">Añadir Fotos / PDFs</p>
                        <p className="text-[9px] font-mono text-primary/25 mt-1">Evidencia manual (Upload)</p>
                      </div>

                    </div>
                    {Object.entries(progress).map(([k, pct]) => (
                      <div key={k} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono text-primary/40">
                          <span className="truncate max-w-[200px]">{k.split('_').slice(0, -1).join('_')}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1 bg-primary/10 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                    {evidence.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {evidence.map((ev, idx) => (
                          <div key={idx} className="relative group rounded-lg border border-primary/20 overflow-hidden aspect-square bg-black">
                            {ev.type === 'photo' ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={ev.urlOrBase64} alt={ev.name} loading="lazy" decoding="async"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10">
                                <FileText className="w-5 h-5 text-cyan-500" />
                                <span className="text-[7px] font-mono text-cyan-500/50 mt-1 px-1 text-center truncate w-full">{ev.name}</span>
                              </div>
                            )}
                            <div className={`absolute bottom-1 left-1 text-[7px] font-mono px-1 rounded ${ev.uploadMethod === 'storage' ? 'bg-blue-500/80' : 'bg-green-600/80'} text-white`}>
                              {ev.uploadMethod === 'storage' ? '☁️' : '💾'}
                            </div>
                            <button onClick={() => setEvidence(p => p.filter((_, j) => j !== idx))}
                              className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Data summary per contractor (pre-submit confirmation) ── */}
              <div className="px-5 pb-2 pt-3 border-t border-primary/10">
                <p className="text-[8px] font-mono text-primary/30 uppercase tracking-widest mb-2">
                  📋 Resumen de datos capturados
                </p>
                <div className="space-y-1.5">
                  {CONTRACTORS_CONFIG.map(cfg => {
                    const cid      = cfg.id as ContractorId;
                    const d        = contractorSections[cid];
                    const isEnabled = enabledContractors.has(cid);
                    const acts = d.activities.trim().split('\n').filter(Boolean).length;
                    const pers = Object.values(d.personnel).reduce((s, v) => s + v, 0);
                    const hse  = d.sectionsEnabled.hse ? Object.values(d.checklist).filter(Boolean).length : 0;
                    const hasSafety = d.sectionsEnabled.seguridad && (d.safetyInfo.comments.trim().length > 0 || d.safetyInfo.incidents > 0);
                    const hasData = acts > 0 || pers > 0;
                    return (
                      <div key={cid}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[9px] font-mono transition-all ${
                          !isEnabled ? 'border-primary/10 opacity-30' : hasData ? '' : 'border-primary/10 opacity-40'
                        }`}
                        style={{ borderColor: isEnabled && hasData ? `${cfg.color}30` : undefined, backgroundColor: isEnabled && hasData ? `${cfg.color}06` : undefined }}
                      >
                        <button
                          onClick={() => setActiveContractorId(cid)}
                          className="flex items-center gap-1.5 flex-1 text-left"
                        >
                          <span>{cfg.icon}</span>
                          <span className="font-bold truncate" style={{ color: hasData ? cfg.color : undefined }}>
                            {cfg.label}
                          </span>
                          <span className="text-primary/30 ml-0.5 text-[7px]">{cfg.sistema}</span>
                        </button>
                        <div className="flex items-center gap-2 text-[8px]">
                          {!isEnabled && <span className="text-primary/30 italic">excluido</span>}
                          {isEnabled && acts > 0  && <span className="text-green-400/80">✅ {acts} activ.</span>}
                          {isEnabled && pers > 0  && <span className="text-cyan-400/80">👷 {pers}p</span>}
                          {isEnabled && hse > 0   && <span className="text-amber-400/80">⚠️ {hse} HSE</span>}
                          {isEnabled && hasSafety && <span className="text-purple-400/80">🛡️ seg.</span>}
                          {isEnabled && !hasData  && <span className="text-primary/25">sin datos</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-5 pb-5 pt-2 border-t border-primary/10 space-y-2">
                <Button onClick={handleSubmit} disabled={submitting || drafting}
                  className="w-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 font-mono uppercase tracking-widest transition-all">
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Anclando…</>
                    : editing
                      ? <><CheckCircle2 className="w-4 h-4 mr-2" />Actualizar Folio</>
                      : <><Save className="w-4 h-4 mr-2" />Sincronizar Folio</>}
                </Button>
                {!editing && (
                  <Button onClick={handleDraft} disabled={submitting || drafting} variant="outline"
                    className="w-full border-primary/20 text-primary/50 hover:border-amber-500/40 hover:text-amber-400 font-mono uppercase tracking-widest text-xs">
                    {drafting ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                    Guardar Borrador
                  </Button>
                )}
              </div>
            </div>

            {/* ════════ HISTORY PANEL ════════ */}
            <div className="space-y-4">
              {/* Search + count */}
              <div className="flex items-center gap-3">
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por ID, frente, actividad…"
                  className="flex-1 bg-[#0B1018] border-primary/20 text-primary/80 placeholder:text-primary/30 h-9 text-xs font-mono" />
                <div className="bg-[#0B1018] border border-primary/20 rounded px-3 py-1.5 text-center min-w-[52px]">
                  <p className="text-[9px] font-mono text-primary/30 uppercase">Total</p>
                  <p className="text-base font-bold text-cyan-400 font-mono leading-none">{reports?.length ?? 0}</p>
                </div>
              </div>

              {reports && reports.length > 0 && <MonthlyDashboard reports={reports} />}
              {reports && reports.length > 0 && <ContractorActivityDashboard reports={reports} projectId={ACTIVE_PROJECT} />}

              {/* Report list */}
              <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {reportsLoading ? (
                  <div className="flex justify-center py-16">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto" />
                      <p className="text-[10px] font-mono text-primary/40 uppercase">Sincronizando Bóveda…</p>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center border border-dashed border-primary/10 rounded-xl p-12 bg-primary/[0.02]">
                    <FileText className="w-8 h-8 text-primary/15 mx-auto mb-3" />
                    <p className="text-[10px] font-mono text-primary/30 uppercase tracking-wider">
                      {search ? 'Sin resultados' : 'Bóveda vacía — Emita el primer folio'}
                    </p>
                  </div>
                ) : (
                  filtered.map(report => {
                    const open    = expanded === report.id;
                    const isDraft = report.metadata?.status === 'draft';
                    const hasRisk = report.seguridad_hse?.hasActiveRisk;
                    const isAuthor = user?.uid === report.metadata?.authorUid;

                    // Detect if report has multi-contractor data
                    const hasNewFormat = !!report.contractor_sections;

                    return (
                      <div key={report.id}
                        className={`bg-[#05080C] border rounded-xl shadow-lg transition-all group ${
                          isDraft ? 'border-amber-500/20' : hasRisk ? 'border-orange-500/15 hover:border-orange-500/30' : 'border-primary/10 hover:border-cyan-500/20'
                        }`}>
                        {/* Card header */}
                        <div className="p-4 cursor-pointer" onClick={() => setExpanded(open ? null : report.id)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-cyan-400 font-mono font-bold text-sm">
                                  {report.metadata?.consecutiveId || '—'}
                                </h3>
                                {isDraft ? (
                                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase">BORRADOR</span>
                                ) : (
                                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 uppercase flex items-center gap-1">
                                    <CheckCircle2 className="w-2 h-2" />ANCLADO
                                  </span>
                                )}
                                {hasRisk && (
                                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 uppercase flex items-center gap-1">
                                    <AlertTriangle className="w-2 h-2" />HSE
                                  </span>
                                )}
                                {hasNewFormat && (
                                  <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 uppercase">
                                    3 CONTRATISTAS
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-primary/40 mt-1">
                                {report.metadata?.date
                                  ? new Date(report.metadata.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                                  : '—'}
                                {' · '}
                                <span className="text-cyan-500/60">{report.metadata?.frente}</span>
                                {report.metadata?.weather && <> · <span className="text-primary/30">{report.metadata.weather}</span></>}
                              </p>
                            </div>

                            {/* Action buttons — visible on hover */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">

                              {/* Vista Previa / Imprimir */}
                              <Button size="sm"
                                onClick={e => { e.stopPropagation(); setPrintingReport(report); }}
                                variant="outline"
                                className="h-7 text-[9px] border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white font-mono uppercase px-2"
                                title="Vista previa e impresión ISO">
                                <Printer className="w-3 h-3 mr-1" />PDF
                              </Button>

                              {/* Excel */}
                              <Button size="sm"
                                onClick={e => { e.stopPropagation(); exportDossier(report); }}
                                variant="outline"
                                className="h-7 text-[9px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono uppercase px-2">
                                <FileSpreadsheet className="w-3 h-3 mr-1" />XLS
                              </Button>

                              {/* Edit */}
                              {(isRoot || isAuthor) && (
                                <Button size="sm"
                                  onClick={e => { e.stopPropagation(); loadEdit(report); }}
                                  variant="outline"
                                  className="h-7 text-[9px] border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-mono uppercase px-2">
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}

                              {/* Delete */}
                              {isRoot && (
                                <Button size="icon"
                                  onClick={e => { e.stopPropagation(); purge(report.id, report.metadata?.consecutiveId); }}
                                  variant="outline"
                                  className="h-7 w-7 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                              <ChevronDown className={`w-3 h-3 text-primary/30 transition-transform ml-1 ${open ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Collapsed preview */}
                          {!open && (
                            <>
                              {/* Contractor chips */}
                              {hasNewFormat && (
                                <div className="flex gap-1.5 mt-2 flex-wrap">
                                  {CONTRACTORS_CONFIG.map(cfg => {
                                    const d = report.contractor_sections![cfg.id as ContractorId];
                                    if (!d) return null;
                                    const total = Object.values(d.personnel).reduce((s, v) => s + v, 0);
                                    const hasAct = d.activities?.trim();
                                    if (!total && !hasAct) return null;
                                    return (
                                      <span key={cfg.id}
                                        className="text-[8px] font-mono px-2 py-0.5 rounded-full border"
                                        style={{ borderColor: `${cfg.color}40`, color: cfg.color, backgroundColor: `${cfg.color}10` }}>
                                        {cfg.icon} {cfg.label} {total > 0 ? `· ${total}p` : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {report.activities && (
                                <p className="text-[10px] text-white/50 mt-2 line-clamp-2 leading-relaxed font-mono bg-black/30 p-2 rounded">
                                  {report.activities}
                                </p>
                              )}
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([k, cfg]) =>
                                  report.seguridad_hse?.[k] && (
                                    <span key={k} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${cfg.bg}`}>
                                      {cfg.icon} {cfg.label}
                                    </span>
                                  )
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Expanded detail */}
                        {open && (
                          <div className="px-4 pb-4 border-t border-primary/5 space-y-3 pt-3">

                            {/* If new format: show per-contractor summary */}
                            {hasNewFormat ? (
                              <div className="space-y-3">
                                {CONTRACTORS_CONFIG.map(cfg => {
                                  const d = report.contractor_sections![cfg.id as ContractorId];
                                  if (!d) return null;
                                  const total = Object.values(d.personnel).reduce((s, v) => s + v, 0);
                                  const hasContent = d.activities?.trim() || total > 0;
                                  if (!hasContent) return null;
                                  return (
                                    <div key={cfg.id} className="rounded-lg border p-3 space-y-2"
                                      style={{ borderColor: `${cfg.color}30`, backgroundColor: `${cfg.color}06` }}>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-mono font-bold uppercase" style={{ color: cfg.color }}>
                                          {cfg.icon} {cfg.label} — {cfg.sistema}
                                        </span>
                                        {total > 0 && <span className="text-[9px] font-mono" style={{ color: cfg.color }}>{total} pers.</span>}
                                      </div>
                                      {d.activities?.trim() && (
                                        <p className="text-[10px] text-white/60 leading-relaxed font-mono bg-black/20 p-2 rounded">
                                          {d.activities}
                                        </p>
                                      )}
                                      {(d.checklist.workAtHeights || d.checklist.hotWork || d.checklist.confinedSpace || d.checklist.scaffolding) && (
                                        <div className="flex gap-1 flex-wrap">
                                          {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([k, hcfg]) =>
                                            d.checklist[k] && (
                                              <span key={k} className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ${hcfg.bg}`}>
                                                {hcfg.icon} {hcfg.label}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              // Legacy format
                              <div>
                                <p className="text-[9px] font-mono text-primary/30 uppercase mb-1">Narrativa de Actividades — HL-GISAICO</p>
                                <p className="text-[11px] text-white/70 leading-relaxed bg-black/30 p-3 rounded font-mono">
                                  {report.activities || 'Sin descripción.'}
                                </p>
                              </div>
                            )}

                            {/* HSE matrix */}
                            <div>
                              <p className="text-[9px] font-mono text-primary/30 uppercase mb-2">Matriz HSE — HL-GISAICO</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([k, cfg]) => (
                                  <div key={k}
                                    className={`flex items-center gap-2 p-2 rounded border text-[9px] font-mono ${report.seguridad_hse?.[k] ? cfg.bg : 'bg-primary/5 border-primary/10 text-primary/30'}`}>
                                    <span>{cfg.icon}</span>
                                    <span className="uppercase flex-1">{cfg.label}</span>
                                    <span className="font-bold ml-auto">{report.seguridad_hse?.[k] ? 'SÍ' : 'N/A'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Evidence thumbnails */}
                            {report.evidence?.length > 0 && (
                              <div>
                                <p className="text-[9px] font-mono text-primary/30 uppercase mb-2">Evidencias ({report.evidence.length})</p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {report.evidence.map((ev, i) => (
                                    <div key={i} className="relative aspect-square rounded border border-primary/20 overflow-hidden bg-black group">
                                      {ev.type === 'photo' ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img src={ev.urlOrBase64} alt={ev.name} loading="lazy" decoding="async"
                                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                                          onClick={() => window.open(ev.urlOrBase64, '_blank')} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                          <FileText className="w-4 h-4 text-cyan-500" />
                                        </div>
                                      )}
                                      <div className={`absolute bottom-0 left-0 right-0 text-[6px] font-mono text-center py-0.5 ${ev.uploadMethod === 'storage' ? 'bg-blue-600/80' : 'bg-green-700/80'} text-white`}>
                                        {ev.uploadMethod === 'storage' ? '☁️' : '💾'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-1 border-t border-primary/5">
                              <p className="text-[9px] font-mono text-primary/25">Por: {report.metadata?.authorName}</p>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => setPrintingReport(report)} variant="outline"
                                  className="h-7 text-[9px] border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white font-mono uppercase px-2.5">
                                  <Printer className="w-3 h-3 mr-1.5" />Vista Previa ISO
                                </Button>
                                <Button size="sm" onClick={() => exportDossier(report)} variant="outline"
                                  className="h-7 text-[9px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono uppercase px-2.5">
                                  <FileSpreadsheet className="w-3 h-3 mr-1.5" />Exportar Dossier
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Print Preview Modal ── */}
      {printingReport && (
        <ReportPrintPreview
          data={buildPrintData(printingReport)}
          onClose={() => setPrintingReport(null)}
        />
      )}
    </div>
  );
}
