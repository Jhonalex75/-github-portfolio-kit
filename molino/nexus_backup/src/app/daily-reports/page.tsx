'use client';

import { useState, useRef, useEffect, useMemo, ChangeEvent } from 'react';
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
  Loader2, Camera, Plus, Trash2, FileSpreadsheet,
  Save, FileText, CheckCircle2, AlertTriangle,
  Shield, Users, Edit2, ChevronDown, ClipboardList,
  Building2, MessageSquare, TrendingUp, Percent,
  HardHat, AlertCircle, BookOpen,
} from 'lucide-react';
import { generateDailyReportExcel, DailyReportData } from '@/lib/excel-generator';

// ─── Constants ───────────────────────────────────────────────────────────────
const ROOT_UIDS = ['R3MVwE12nVMg128Kv6bdwJ6MKav1', 'Ew4plK83Z9O6c8J1dM3F0tP04A83'];

const FRENTES = ['TECNITANQUES', 'C&C', 'MARMATO OPS', 'SUPERVISIÓN DIRECTA', 'OTRO'];

const WEATHER_OPTIONS = [
  'Soleado ☀️', 'Parcialmente Nublado ⛅', 'Nublado ☁️',
  'Llovizna 🌦️', 'Lluvia ☔', 'Tormenta ⛈️',
];

const HSE_CONFIG = {
  workAtHeights: { label: 'Trabajo en Alturas',   icon: '🪜', bg: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  hotWork:       { label: 'Trabajo en Caliente',  icon: '🔥', bg: 'bg-red-500/20 border-red-500/40 text-red-300' },
  confinedSpace: { label: 'Espacios Confinados',  icon: '⚠️', bg: 'bg-orange-500/20 border-orange-500/40 text-orange-300' },
  scaffolding:   { label: 'Andamios Certificados', icon: '🏗️', bg: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300' },
} as const;

type HSEKey = keyof typeof HSE_CONFIG;

const DEFAULT_RECURSOS = [
  { type: 'Soldadores Calificados', count: 0 },
  { type: 'Mecánicos Armadores',    count: 0 },
  { type: 'Inspectores HSE',        count: 0 },
];

// ⬇ Images <200KB stay as Base64 in Firestore; larger go to Cloud Storage
const STORAGE_THRESHOLD = 200 * 1024; // 200 KB

// ─── Client-side image compression ─────────────────────────────────────────
// Resizes to max 1200px and re-encodes at 75% quality before Base64 storage.
// Keeps PDFs / non-image files untouched.
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
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const DEFAULT_ADMIN_ACTIVITIES = [
  { name: 'Revisión de procedimientos de montaje',     progress: 0 },
  { name: 'Reunión con ingeniería',                    progress: 0 },
  { name: 'Reunión con vendors / proveedores',         progress: 0 },
  { name: 'Revisión de planos y documentación técnica', progress: 0 },
  { name: 'Informes y reportes al cliente',            progress: 0 },
  { name: 'Gestión de no conformidades (SGC)',         progress: 0 },
];

const ACTIVE_PROJECT = 'default-nexus-project';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChecklistHSE { workAtHeights: boolean; hotWork: boolean; confinedSpace: boolean; scaffolding: boolean }
interface Recurso      { type: string; count: number }
interface Evidence     { type: 'photo' | 'pdf'; urlOrBase64: string; name: string; uploadMethod: 'base64' | 'storage' }

interface Contractor    { name: string; personnel: number }
interface AdminActivity { name: string; progress: number }   // 0-100 %
interface SafetyInfo    {
  comments:       string;
  incidents:      number;
  nearMisses:     number;
  eppObservations: string;
  lessonsLearned: string;
}

const EMPTY_SAFETY: SafetyInfo = { comments: '', incidents: 0, nearMisses: 0, eppObservations: '', lessonsLearned: '' };

interface ReportDoc {
  id: string;
  metadata: {
    consecutiveId: string; date: string; weather: string;
    authorUid: string; authorName: string; frente: string;
    proyectoRef: string; status: 'draft' | 'anchored';
  };
  seguridad_hse:    ChecklistHSE & { hasActiveRisk: boolean };
  recursos_frente:  Recurso[];
  contractors?:     Contractor[];
  safety_info?:     SafetyInfo;
  admin_activities?: AdminActivity[];
  activities:  string;
  evidence:    Evidence[];
  timestamp?:  unknown;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DailyReportsPage() {
  const router      = useRouter();
  const firestore   = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const { toast }   = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const isRoot = user && ROOT_UIDS.includes(user.uid);

  // Form state
  type TabId = 'meta' | 'hse' | 'recursos' | 'contratistas' | 'seguridad' | 'admin' | 'evidencia';
  const [tab,             setTab]             = useState<TabId>('meta');
  const [frente,          setFrente]          = useState('TECNITANQUES');
  const [customFrente,    setCustomFrente]    = useState('');
  const [weather,         setWeather]         = useState('Soleado ☀️');
  const [activities,      setActivities]      = useState('');
  const [recursos,        setRecursos]        = useState<Recurso[]>([...DEFAULT_RECURSOS]);
  const [checklist,       setChecklist]       = useState<ChecklistHSE>({ workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false });
  const [evidence,        setEvidence]        = useState<Evidence[]>([]);
  // ── New extended state ──
  const [contractors,     setContractors]     = useState<Contractor[]>([{ name: '', personnel: 0 }]);
  const [safetyInfo,      setSafetyInfo]      = useState<SafetyInfo>({ ...EMPTY_SAFETY });
  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>(
    DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a }))
  );

  // UI state
  const [submitting,   setSubmitting]   = useState(false);
  const [drafting,     setDrafting]     = useState(false);
  const [progress,     setProgress]     = useState<Record<string, number>>({});
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [editing,      setEditing]      = useState<ReportDoc | null>(null);
  const [search,       setSearch]       = useState('');
  const [lastId,       setLastId]       = useState<string | null>(null);

  const activeFrente = frente === 'OTRO' ? customFrente : frente;
  const anyRisk = Object.values(checklist).some(Boolean);

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

    // Process ALL files in parallel — no more serial bottleneck
    const uploads = Array.from(files).map(async (file, i) => {
      const key  = `${file.name}_${i}`;
      const type = file.type.includes('pdf') ? 'pdf' : 'photo';
      setProgress(p => ({ ...p, [key]: 5 }));

      let item: Evidence | null = null;

      if (type === 'photo') {
        // Always compress first — compressImage guarantees output < ~120KB
        try {
          setProgress(p => ({ ...p, [key]: 30 }));
          const b64 = await compressImage(file);
          // After compression, most images are well under 800KB
          const estBytes = Math.round(b64.length * 0.75);
          if (estBytes < 800 * 1024) {
            item = { type, urlOrBase64: b64, name: file.name, uploadMethod: 'base64' };
            setProgress(p => ({ ...p, [key]: 100 }));
          } else {
            // Very large image even after compression → Storage
            const blob = await (await fetch(b64)).blob();
            const f2   = new File([blob], file.name, { type: 'image/jpeg' });
            const res  = await uploadFileToStorage(firebaseApp, f2, ACTIVE_PROJECT,
              pct => setProgress(p => ({ ...p, [key]: 30 + Math.round(pct * 0.7) })));
            if (res.success && res.downloadUrl) {
              item = { type, urlOrBase64: res.downloadUrl, name: file.name, uploadMethod: 'storage' };
            } else {
              toast({ variant: 'destructive', title: 'Error al subir', description: `${file.name}: ${res.error}` });
            }
          }
        } catch (err) {
          toast({ variant: 'destructive', title: 'Error procesando imagen', description: file.name });
        }
      } else {
        // PDF → always Cloud Storage
        const res = await uploadFileToStorage(firebaseApp, file, ACTIVE_PROJECT,
          pct => setProgress(p => ({ ...p, [key]: pct })));
        if (res.success && res.downloadUrl) {
          item = { type, urlOrBase64: res.downloadUrl, name: file.name, uploadMethod: 'storage' };
        } else {
          toast({ variant: 'destructive', title: 'Error al subir PDF', description: `${file.name}: ${res.error}` });
        }
      }

      // Update evidence incrementally as each file finishes
      if (item) {
        const ev = item;
        setEvidence(prev => [...prev, ev]);
      }
      setTimeout(() => setProgress(p => { const n = { ...p }; delete n[key]; return n; }), 2000);
    });

    await Promise.all(uploads);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Build payload ──
  const buildPayload = (consecutiveId: string, status: 'anchored' | 'draft' = 'anchored') => ({
    metadata: {
      consecutiveId,
      date:       new Date().toISOString(),
      weather,
      authorUid:  user!.uid,
      authorName: user!.displayName || user!.email || 'Ing. Certificado',
      frente:     activeFrente,
      proyectoRef: 'ARIS MINING — MIL24.001',
      status,
    },
    seguridad_hse:    { ...checklist, hasActiveRisk: anyRisk },
    recursos_frente:  recursos.filter(r => r.type && r.count > 0),
    contractors:      contractors.filter(c => c.name.trim()),
    safety_info:      safetyInfo,
    admin_activities: adminActivities,
    activities,
    evidence,
    timestamp:    serverTimestamp(),
    lastModified: serverTimestamp(),
  });

  // ── Reset ──
  const reset = () => {
    setActivities(''); setEvidence([]); setFrente('TECNITANQUES');
    setCustomFrente(''); setWeather('Soleado ☀️');
    setRecursos([...DEFAULT_RECURSOS]);
    setChecklist({ workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false });
    setContractors([{ name: '', personnel: 0 }]);
    setSafetyInfo({ ...EMPTY_SAFETY });
    setAdminActivities(DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })));
    setEditing(null); setTab('meta');
  };

  // ── Submit (confirmed addDoc) ──
  const handleSubmit = async () => {
    if (!firestore || !user) return;
    if (!activeFrente || !activities.trim()) {
      toast({ variant: 'destructive', title: 'CAMPOS OBLIGATORIOS', description: 'Complete Frente y Actividades.' });
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

  // ── Save draft ──
  const handleDraft = async () => {
    if (!firestore || !user || !activeFrente) return;
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
        safety_info:   r.safety_info      || { ...EMPTY_SAFETY },
        admin_activities: r.admin_activities || DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a })),
      };
      await generateDailyReportExcel(data);
      toast({ title: '✅ DOSSIER EMITIDO', description: 'SGS/ISO 9001 — Listo para ARIS MINING.' });
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'ERROR DE EXPORTACIÓN' });
    }
  };

  // ── Load report for editing ──
  const loadEdit = (r: ReportDoc) => {
    setEditing(r);
    setFrente(FRENTES.includes(r.metadata.frente) ? r.metadata.frente : 'OTRO');
    setCustomFrente(FRENTES.includes(r.metadata.frente) ? '' : r.metadata.frente);
    setWeather(r.metadata.weather);
    setActivities(r.activities);
    setRecursos(r.recursos_frente?.length ? r.recursos_frente : [...DEFAULT_RECURSOS]);
    setChecklist({
      workAtHeights: r.seguridad_hse?.workAtHeights || false,
      hotWork:       r.seguridad_hse?.hotWork       || false,
      confinedSpace: r.seguridad_hse?.confinedSpace || false,
      scaffolding:   r.seguridad_hse?.scaffolding   || false,
    });
    setEvidence(r.evidence || []);
    setContractors(r.contractors?.length ? r.contractors : [{ name: '', personnel: 0 }]);
    setSafetyInfo(r.safety_info ? { ...r.safety_info } : { ...EMPTY_SAFETY });
    setAdminActivities(r.admin_activities?.length
      ? r.admin_activities.map(a => ({ ...a }))
      : DEFAULT_ADMIN_ACTIVITIES.map(a => ({ ...a }))
    );
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

  // ── Loading screen ──
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

  // ─── RENDER ──────────────────────────────────────────────────────────────
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
                  {anyRisk && (
                    <span className="animate-pulse text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-400 px-2 py-0.5 rounded-full">
                      ⚠️ RIESGOS ACTIVOS
                    </span>
                  )}
                </h1>
                <p className="text-[10px] font-mono text-cyan-500/40 uppercase tracking-[0.3em] mt-0.5">
                  ARIS MINING — MIL24.001 | SINCRONIZACIÓN EN TIEMPO REAL
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
          <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-6">

            {/* ════════════════════════════════ */}
            {/*          FORM PANEL              */}
            {/* ════════════════════════════════ */}
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

              {/* HSE warning banner */}
              {anyRisk && (
                <div className="mx-5 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⚠️ Permiso de Trabajo Requerido</p>
                    <p className="text-[9px] text-amber-300/60 mt-0.5">
                      Valide APT antes de iniciar. Activos:{' '}
                      {(Object.entries(checklist) as [HSEKey, boolean][])
                        .filter(([, v]) => v).map(([k]) => HSE_CONFIG[k].label).join(' · ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Tabs — 7 sections */}
              <div className="flex gap-0 border-b border-primary/10 mt-4 px-2 overflow-x-auto scrollbar-thin">
                {([
                  { id: 'meta',         label: 'Datos',       icon: FileText,      alert: false,    badge: 0 },
                  { id: 'hse',          label: 'HSE',         icon: Shield,        alert: anyRisk,  badge: 0 },
                  { id: 'recursos',     label: 'Recursos',    icon: Users,         alert: false,    badge: 0 },
                  { id: 'contratistas', label: 'Contrat.',    icon: Building2,     alert: false,    badge: contractors.filter(c => c.name).length },
                  { id: 'seguridad',    label: 'Seguridad',   icon: HardHat,       alert: (safetyInfo.incidents > 0), badge: 0 },
                  { id: 'admin',        label: 'Avances',     icon: TrendingUp,    alert: false,    badge: 0 },
                  { id: 'evidencia',    label: 'Evidencia',   icon: Camera,        alert: false,    badge: evidence.length },
                ] as Array<{ id: TabId; label: string; icon: React.ElementType; alert: boolean; badge: number }>
                ).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative flex items-center gap-1 px-2.5 py-2 text-[9px] font-mono uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                      tab === t.id
                        ? 'border-cyan-500 text-cyan-400'
                        : 'border-transparent text-primary/40 hover:text-primary/70'
                    }`}
                  >
                    <t.icon className="w-3 h-3 flex-shrink-0" />
                    {t.label}
                    {t.alert && <span className="absolute top-1 right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                    {t.badge > 0 && (
                      <span className="ml-0.5 bg-cyan-500/20 text-cyan-400 text-[8px] px-1.5 rounded-full">{t.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5 space-y-4">

                {/* ── TAB: METADATA ── */}
                {tab === 'meta' && (
                  <div className="space-y-4">
                    {/* Frente selector */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Frente / Contratista</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {FRENTES.map(f => (
                          <button
                            key={f}
                            onClick={() => setFrente(f)}
                            className={`px-2 py-1.5 rounded text-[9px] font-mono uppercase border transition-all ${
                              frente === f
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-primary/30 hover:text-primary/70'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      {frente === 'OTRO' && (
                        <Input
                          value={customFrente}
                          onChange={e => setCustomFrente(e.target.value)}
                          placeholder="Nombre del contratista..."
                          className="bg-primary/5 border-primary/10 font-mono text-xs h-9"
                        />
                      )}
                    </div>

                    {/* Weather */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Condición Climática</Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {WEATHER_OPTIONS.map(w => (
                          <button
                            key={w}
                            onClick={() => setWeather(w)}
                            className={`px-2 py-1.5 rounded text-[9px] font-mono border transition-all ${
                              weather === w
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-primary/5 border-primary/10 text-primary/40 hover:border-primary/30'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Activities */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Narrativa de Actividades *</Label>
                        <span className="text-[9px] font-mono text-primary/30">{activities.length} car.</span>
                      </div>
                      <Textarea
                        value={activities}
                        onChange={e => setActivities(e.target.value)}
                        placeholder="Describa con precisión los avances técnicos del día, equipos intervenidos, avance porcentual y observaciones críticas..."
                        className="bg-primary/5 border-primary/10 text-xs min-h-[130px] resize-none font-mono leading-relaxed"
                      />
                    </div>

                    <button
                      onClick={() => setTab('hse')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Matriz HSE →
                    </button>
                  </div>
                )}

                {/* ── TAB: HSE ── */}
                {tab === 'hse' && (
                  <div className="space-y-3">
                    {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([key, cfg]) => (
                      <div
                        key={key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          checklist[key] ? cfg.bg : 'bg-primary/5 border-primary/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cfg.icon}</span>
                          <div>
                            <p className="text-xs font-mono font-bold uppercase text-primary/80">{cfg.label}</p>
                            <p className="text-[9px] text-primary/40 font-mono">
                              {checklist[key] ? '⚡ Permiso Activo — APT Requerido' : 'Sin riesgo identificado'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={checklist[key]}
                          onCheckedChange={c => setChecklist(p => ({ ...p, [key]: c }))}
                          className={checklist[key] ? 'data-[state=checked]:bg-amber-500' : ''}
                        />
                      </div>
                    ))}
                    {anyRisk && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded p-2.5 text-center">
                        <p className="text-[10px] font-mono text-red-400 uppercase">
                          🚨 {(Object.values(checklist) as boolean[]).filter(Boolean).length} Permiso(s) Activo(s)
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setTab('recursos')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Pool de Recursos →
                    </button>
                  </div>
                )}

                {/* ── TAB: RECURSOS ── */}
                {tab === 'recursos' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Pool de Recursos Humanos</Label>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setRecursos(p => [...p, { type: '', count: 0 }])}
                        className="h-6 px-2 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-mono"
                      >
                        <Plus className="w-3 h-3 mr-1" />Agregar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {recursos.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <Input
                            value={r.type}
                            onChange={e => { const n = [...recursos]; n[i].type = e.target.value; setRecursos(n); }}
                            placeholder="Tipo de recurso..."
                            className="flex-1 bg-primary/5 border-primary/10 h-8 text-[11px] font-mono"
                          />
                          <Input
                            type="number" min="0" value={r.count}
                            onChange={e => { const n = [...recursos]; n[i].count = Math.max(0, parseInt(e.target.value) || 0); setRecursos(n); }}
                            className="w-16 bg-primary/5 border-primary/10 h-8 text-[11px] text-center font-mono"
                          />
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setRecursos(p => p.filter((_, j) => j !== i))}
                            className="h-8 w-8 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-primary/5 rounded p-2 text-center">
                      <p className="text-[9px] font-mono text-primary/40">
                        Total: {recursos.reduce((s, r) => s + r.count, 0)} personas en campo (directos)
                      </p>
                    </div>
                    <button
                      onClick={() => setTab('contratistas')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Contratistas →
                    </button>
                  </div>
                )}

                {/* ── TAB: CONTRATISTAS ── */}
                {tab === 'contratistas' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest">Contratistas en Campo</Label>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setContractors(p => [...p, { name: '', personnel: 0 }])}
                        className="h-6 px-2 text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-mono"
                      >
                        <Plus className="w-3 h-3 mr-1" />Agregar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {contractors.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <div className="flex-1 flex items-center gap-1.5 bg-primary/5 border border-primary/10 rounded px-2.5 py-1.5">
                            <Building2 className="w-3 h-3 text-amber-400/60 flex-shrink-0" />
                            <input
                              value={c.name}
                              onChange={e => { const n = [...contractors]; n[i] = { ...n[i], name: e.target.value }; setContractors(n); }}
                              placeholder="Nombre empresa contratista..."
                              className="flex-1 bg-transparent text-[11px] font-mono text-primary/80 placeholder-primary/25 outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 w-20 bg-primary/5 border border-primary/10 rounded px-2 py-1.5">
                            <Users className="w-3 h-3 text-cyan-400/60 flex-shrink-0" />
                            <input
                              type="number" min="0" value={c.personnel}
                              onChange={e => { const n = [...contractors]; n[i] = { ...n[i], personnel: Math.max(0, parseInt(e.target.value) || 0) }; setContractors(n); }}
                              className="w-10 bg-transparent text-[11px] font-mono text-cyan-400 text-center outline-none"
                            />
                          </div>
                          <button
                            onClick={() => setContractors(p => p.filter((_, j) => j !== i))}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/50 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {contractors.some(c => c.name) && (
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded p-2.5 space-y-1">
                        <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider">ℹ️ Resumen de personal</p>
                        {contractors.filter(c => c.name).map((c, i) => (
                          <div key={i} className="flex justify-between text-[9px] font-mono">
                            <span className="text-primary/60 truncate max-w-[200px]">{c.name}</span>
                            <span className="text-amber-400 font-bold">{c.personnel} pers.</span>
                          </div>
                        ))}
                        <div className="border-t border-amber-500/20 pt-1 flex justify-between text-[9px] font-mono font-bold">
                          <span className="text-primary/50">TOTAL CONTRATISTAS</span>
                          <span className="text-amber-400">{contractors.reduce((s, c) => s + c.personnel, 0)} pers.</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-primary/50">+ Personal Directo</span>
                          <span className="text-cyan-400">{recursos.reduce((s, r) => s + r.count, 0)} pers.</span>
                        </div>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-1 flex justify-between text-[9px] font-mono font-bold">
                          <span className="text-cyan-300">GRAN TOTAL EN CAMPO</span>
                          <span className="text-cyan-400 text-[11px]">{contractors.reduce((s, c) => s + c.personnel, 0) + recursos.reduce((s, r) => s + r.count, 0)} pers.</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setTab('seguridad')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Seguridad Industrial →
                    </button>
                  </div>
                )}

                {/* ── TAB: SEGURIDAD INDUSTRIAL ── */}
                {tab === 'seguridad' && (
                  <div className="space-y-3">
                    {/* Incident counters */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2">
                        <p className="text-[9px] font-mono text-red-400/70 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Incidentes
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSafetyInfo(p => ({ ...p, incidents: Math.max(0, p.incidents - 1) }))} className="w-6 h-6 rounded bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">-</button>
                          <span className="flex-1 text-center text-lg font-bold font-mono text-red-400">{safetyInfo.incidents}</span>
                          <button onClick={() => setSafetyInfo(p => ({ ...p, incidents: p.incidents + 1 }))} className="w-6 h-6 rounded bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">+</button>
                        </div>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                        <p className="text-[9px] font-mono text-amber-400/70 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Near Miss
                        </p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSafetyInfo(p => ({ ...p, nearMisses: Math.max(0, p.nearMisses - 1) }))} className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">-</button>
                          <span className="flex-1 text-center text-lg font-bold font-mono text-amber-400">{safetyInfo.nearMisses}</span>
                          <button onClick={() => setSafetyInfo(p => ({ ...p, nearMisses: p.nearMisses + 1 }))} className="w-6 h-6 rounded bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors">+</button>
                        </div>
                      </div>
                    </div>

                    {/* Safety narrative */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" /> Observaciones de Seguridad Industrial
                      </Label>
                      <Textarea
                        value={safetyInfo.comments}
                        onChange={e => setSafetyInfo(p => ({ ...p, comments: e.target.value }))}
                        placeholder="Describa el desempeño en seguridad, condiciones del sitio, comportamientos observados, medidas correctivas adoptadas..."
                        className="bg-primary/5 border-amber-500/20 text-xs min-h-[110px] resize-none font-mono leading-relaxed"
                      />
                    </div>

                    {/* EPP */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <HardHat className="w-3 h-3" /> Observaciones EPP
                      </Label>
                      <Textarea
                        value={safetyInfo.eppObservations}
                        onChange={e => setSafetyInfo(p => ({ ...p, eppObservations: e.target.value }))}
                        placeholder="Estado y cumplimiento del equipo de protección personal en campo..."
                        className="bg-primary/5 border-primary/10 text-xs min-h-[60px] resize-none font-mono"
                      />
                    </div>

                    {/* Lessons learned */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" /> Lecciones Aprendidas HSE
                      </Label>
                      <Textarea
                        value={safetyInfo.lessonsLearned}
                        onChange={e => setSafetyInfo(p => ({ ...p, lessonsLearned: e.target.value }))}
                        placeholder="Lecciones aprendidas, puntos de mejora, buenas prácticas destacadas del turno..."
                        className="bg-primary/5 border-cyan-500/20 text-xs min-h-[60px] resize-none font-mono"
                      />
                    </div>

                    <button
                      onClick={() => setTab('admin')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Avances Administrativos →
                    </button>
                  </div>
                )}

                {/* ── TAB: AVANCES ADMINISTRATIVOS ── */}
                {tab === 'admin' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-cyan-500/50 font-mono uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" /> Actividades Administrativas
                      </Label>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setAdminActivities(p => [...p, { name: '', progress: 0 }])}
                        className="h-6 px-2 text-[10px] bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-mono"
                      >
                        <Plus className="w-3 h-3 mr-1" />Nueva
                      </Button>
                    </div>

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
                              <button
                                onClick={() => setAdminActivities(p => p.filter((_, j) => j !== i))}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500/30 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-primary/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                                />
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
                          <span className="text-[9px] font-mono text-primary/40 uppercase">Avance Promedio General</span>
                          <span className="text-[13px] font-bold font-mono text-cyan-400">
                            {Math.round(adminActivities.reduce((s, a) => s + a.progress, 0) / adminActivities.length)}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-primary/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.round(adminActivities.reduce((s, a) => s + a.progress, 0) / adminActivities.length)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setTab('evidencia')}
                      className="w-full py-2 rounded border border-primary/15 text-[10px] font-mono text-primary/40 hover:border-cyan-500/30 hover:text-cyan-400 transition-all uppercase tracking-wider"
                    >
                      Siguiente: Bóveda de Evidencia →
                    </button>
                  </div>
                )}

                {/* ── TAB: EVIDENCIA ── */}
                {tab === 'evidencia' && (
                  <div className="space-y-3">
                    <div
                      className="border-2 border-dashed border-primary/20 bg-primary/[0.02] rounded-lg p-6 text-center hover:bg-primary/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
                      onClick={() => fileRef.current?.click()}
                    >
                      <input type="file" multiple accept="image/*,.pdf" ref={fileRef} className="hidden" onChange={handleUpload} />
                      <Camera className="w-7 h-7 text-primary/30 mx-auto mb-2 group-hover:text-cyan-400 transition-colors" />
                      <p className="text-[10px] font-mono text-primary/40 uppercase tracking-wider">Añadir Fotos / PDFs</p>
                      <p className="text-[9px] font-mono text-primary/25 mt-1">
                        {'< 200KB → Base64 | Grande / PDF → Firebase Storage'}
                      </p>
                    </div>

                    {/* Upload progress */}
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

                    {/* Evidence grid */}
                    {evidence.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {evidence.map((ev, idx) => (
                          <div key={idx} className="relative group rounded-lg border border-primary/20 overflow-hidden aspect-square bg-black">
                            {ev.type === 'photo' ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={ev.urlOrBase64} alt={ev.name} loading="lazy" decoding="async" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-primary/10">
                                <FileText className="w-5 h-5 text-cyan-500" />
                                <span className="text-[7px] font-mono text-cyan-500/50 mt-1 px-1 text-center truncate w-full">{ev.name}</span>
                              </div>
                            )}
                            <div className={`absolute bottom-1 left-1 text-[7px] font-mono px-1 rounded ${ev.uploadMethod === 'storage' ? 'bg-blue-500/80 text-white' : 'bg-green-600/80 text-white'}`}>
                              {ev.uploadMethod === 'storage' ? '☁️' : '💾'}
                            </div>
                            <button
                              onClick={() => setEvidence(p => p.filter((_, j) => j !== idx))}
                              className="absolute top-1 right-1 bg-red-500/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="px-5 pb-5 pt-2 border-t border-primary/10 space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || drafting}
                  className="w-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 font-mono uppercase tracking-widest transition-all"
                >
                  {submitting
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Anclando…</>
                    : editing
                      ? <><CheckCircle2 className="w-4 h-4 mr-2" />Actualizar Folio</>
                      : <><Save className="w-4 h-4 mr-2" />Sincronizar Folio</>}
                </Button>
                {!editing && (
                  <Button
                    onClick={handleDraft}
                    disabled={submitting || drafting}
                    variant="outline"
                    className="w-full border-primary/20 text-primary/50 hover:border-amber-500/40 hover:text-amber-400 font-mono uppercase tracking-widest text-xs"
                  >
                    {drafting ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                    Guardar Borrador
                  </Button>
                )}
              </div>
            </div>

            {/* ════════════════════════════════ */}
            {/*         HISTORY PANEL            */}
            {/* ════════════════════════════════ */}
            <div className="space-y-4">
              {/* Search + count */}
              <div className="flex items-center gap-3">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por ID, frente, actividad…"
                  className="flex-1 bg-[#0B1018] border-primary/20 text-primary/80 placeholder:text-primary/30 h-9 text-xs font-mono"
                />
                <div className="bg-[#0B1018] border border-primary/20 rounded px-3 py-1.5 text-center min-w-[52px]">
                  <p className="text-[9px] font-mono text-primary/30 uppercase">Total</p>
                  <p className="text-base font-bold text-cyan-400 font-mono leading-none">{reports?.length ?? 0}</p>
                </div>
              </div>

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
                    const open     = expanded === report.id;
                    const isDraft  = report.metadata?.status === 'draft';
                    const hasRisk  = report.seguridad_hse?.hasActiveRisk;
                    const isAuthor = user?.uid === report.metadata?.authorUid;

                    return (
                      <div
                        key={report.id}
                        className={`bg-[#05080C] border rounded-xl shadow-lg transition-all group ${
                          isDraft  ? 'border-amber-500/20' :
                          hasRisk  ? 'border-orange-500/15 hover:border-orange-500/30' :
                                     'border-primary/10 hover:border-cyan-500/20'
                        }`}
                      >
                        {/* Card header (clickable to expand) */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => setExpanded(open ? null : report.id)}
                        >
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
                                    <AlertTriangle className="w-2 h-2" />HSE ACTIVO
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-primary/40 mt-1">
                                {report.metadata?.date
                                  ? new Date(report.metadata.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                                  : '—'}
                                {' · '}
                                <span className="text-cyan-500/60">{report.metadata?.frente}</span>
                                {report.metadata?.weather && (
                                  <> · <span className="text-primary/30">{report.metadata.weather}</span></>
                                )}
                              </p>
                            </div>

                            {/* Actions (visible on hover) */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={e => { e.stopPropagation(); exportDossier(report); }}
                                variant="outline"
                                className="h-7 text-[9px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono uppercase px-2"
                              >
                                <FileSpreadsheet className="w-3 h-3 mr-1" />XLS
                              </Button>
                              {(isRoot || isAuthor) && (
                                <Button
                                  size="sm"
                                  onClick={e => { e.stopPropagation(); loadEdit(report); }}
                                  variant="outline"
                                  className="h-7 text-[9px] border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black font-mono uppercase px-2"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                              )}
                              {isRoot && (
                                <Button
                                  size="icon"
                                  onClick={e => { e.stopPropagation(); purge(report.id, report.metadata?.consecutiveId); }}
                                  variant="outline"
                                  className="h-7 w-7 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                              <ChevronDown className={`w-3 h-3 text-primary/30 transition-transform ml-1 ${open ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Preview (collapsed only) */}
                          {!open && (
                            <>
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
                            {/* Activities */}
                            <div>
                              <p className="text-[9px] font-mono text-primary/30 uppercase mb-1">Narrativa de Actividades</p>
                              <p className="text-[11px] text-white/70 leading-relaxed bg-black/30 p-3 rounded font-mono">
                                {report.activities || 'Sin descripción.'}
                              </p>
                            </div>

                            {/* Full HSE matrix */}
                            <div>
                              <p className="text-[9px] font-mono text-primary/30 uppercase mb-2">Matriz HSE — 4 Permisos</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(Object.entries(HSE_CONFIG) as [HSEKey, typeof HSE_CONFIG.workAtHeights][]).map(([k, cfg]) => (
                                  <div
                                    key={k}
                                    className={`flex items-center gap-2 p-2 rounded border text-[9px] font-mono ${
                                      report.seguridad_hse?.[k] ? cfg.bg : 'bg-primary/5 border-primary/10 text-primary/30'
                                    }`}
                                  >
                                    <span>{cfg.icon}</span>
                                    <span className="uppercase flex-1">{cfg.label}</span>
                                    <span className="font-bold ml-auto">{report.seguridad_hse?.[k] ? 'SÍ' : 'N/A'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Resources */}
                            {report.recursos_frente?.filter(r => r.count > 0).length > 0 && (
                              <div>
                                <p className="text-[9px] font-mono text-primary/30 uppercase mb-2">
                                  Recursos Desplegados — {report.recursos_frente.reduce((s, r) => s + r.count, 0)} personas
                                </p>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {report.recursos_frente.filter(r => r.count > 0).map((r, i) => (
                                    <div key={i} className="bg-primary/5 border border-primary/10 rounded p-2 text-center">
                                      <p className="text-base font-bold text-cyan-400 font-mono leading-none">{r.count}</p>
                                      <p className="text-[8px] font-mono text-primary/40 mt-1 leading-tight">{r.type}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Evidence thumbnails */}
                            {report.evidence?.length > 0 && (
                              <div>
                                <p className="text-[9px] font-mono text-primary/30 uppercase mb-2">
                                  Evidencias ({report.evidence.length})
                                </p>
                                <div className="grid grid-cols-5 gap-1.5">
                                  {report.evidence.map((ev, i) => (
                                    <div key={i} className="relative aspect-square rounded border border-primary/20 overflow-hidden bg-black group">
                                      {ev.type === 'photo' ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                          src={ev.urlOrBase64}
                                          alt={ev.name}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                                          onClick={() => window.open(ev.urlOrBase64, '_blank')}
                                        />
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

                            {/* Footer meta */}
                            <div className="flex justify-between items-center pt-1 border-t border-primary/5">
                              <p className="text-[9px] font-mono text-primary/25">
                                Por: {report.metadata?.authorName}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => exportDossier(report)}
                                  variant="outline"
                                  className="h-7 text-[9px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono uppercase px-2.5"
                                >
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
    </div>
  );
}
