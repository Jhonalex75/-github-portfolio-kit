'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Loader2,
  FolderOpen,
  ShieldAlert,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  HardHat,
  Wrench,
  BookOpen,
  Award,
  ListChecks,
} from 'lucide-react';
import { useUser, useFirestore, useStorage, useMemoFirebase, useCollection } from '@/firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const OWNER_UID = 'R3MVwE12nVMg128Kv6bdwJ6MKav1';
const OWNER_EMAILS = ['jhonalexandervm@outlook.com', 'jhonalexanderv@gmail.com'];

type Equipment = 'SAG-1624' | 'BM-2216' | 'GENERAL';
type Area = 'CIVIL' | 'MONTAJE' | 'OPERACION' | 'CALIDAD' | 'LISTADOS';

interface Drawing {
  id: string;
  name: string;
  code: string;
  description: string;
  revision: string;
  equipment: Equipment;
  area: Area;
  storagePath: string;
  downloadUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: { seconds: number } | null;
}

interface UploadForm {
  code: string;
  description: string;
  revision: string;
  equipment: Equipment;
  area: Area;
}

const EQUIPMENT_CONFIG: Record<Equipment, { label: string; shortLabel: string; color: string; badge: string }> = {
  'SAG-1624': {
    label: 'SAG Mill 16\'×24\'',
    shortLabel: 'SAG 1624',
    color: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  'BM-2216': {
    label: 'Ball Mill 22\'×16\'',
    shortLabel: 'BM 2216',
    color: 'text-violet-400',
    badge: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
  'GENERAL': {
    label: 'Documentación General',
    shortLabel: 'General',
    color: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
};

const AREA_CONFIG: Record<Area, { label: string; icon: React.ElementType; description: string }> = {
  CIVIL: { label: 'Civil', icon: HardHat, description: 'Planos civiles, cimentación y detalles embebidos' },
  MONTAJE: { label: 'Montaje', icon: Wrench, description: 'Etapas de instalación y secuencias de izaje' },
  OPERACION: { label: 'Operación & Mantenimiento', icon: BookOpen, description: 'Manuales IOM y procedimientos operativos' },
  CALIDAD: { label: 'Calidad', icon: Award, description: 'Planes de calidad y protocolos QA/QC' },
  LISTADOS: { label: 'Listados', icon: ListChecks, description: 'Listados de equipos y componentes' },
};

const AREAS_BY_EQUIPMENT: Record<Equipment, Area[]> = {
  'SAG-1624': ['CIVIL', 'MONTAJE', 'OPERACION'],
  'BM-2216': ['CIVIL', 'MONTAJE', 'OPERACION'],
  'GENERAL': ['CALIDAD', 'LISTADOS', 'OPERACION'],
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(ts: { seconds: number } | null): string {
  if (!ts) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function PlanosPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const isMonitor =
    user?.uid === OWNER_UID ||
    (user?.email != null && OWNER_EMAILS.includes(user.email.toLowerCase()));

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeEquipment, setActiveEquipment] = useState<Equipment>('SAG-1624');
  const [activeArea, setActiveArea] = useState<Area>('CIVIL');
  const [searchTerm, setSearchTerm] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<Drawing | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    code: '',
    description: '',
    revision: '00',
    equipment: 'SAG-1624',
    area: 'CIVIL',
  });

  const [deleteTarget, setDeleteTarget] = useState<Drawing | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Firestore query ───────────────────────────────────────────────────────
  const drawingsRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'drawings'), orderBy('uploadedAt', 'desc')) : null),
    [firestore]
  );
  const { data: allDrawings, isLoading } = useCollection<Drawing>(drawingsRef);

  // ── Filtered documents ────────────────────────────────────────────────────
  const filtered = (allDrawings ?? []).filter(
    (d) =>
      d.equipment === activeEquipment &&
      d.area === activeArea &&
      (searchTerm === '' ||
        d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pdf')) {
      toast({ title: 'Solo se permiten archivos PDF', variant: 'destructive' });
      return;
    }
    setUploadFile(file);
    // Auto-parse filename: MIL24.001-CODE-EQUIP-..._rev.XX - Description.pdf
    const match = file.name.match(/MIL24\.001-([A-Z]+-\d+(?:-[\d-]+)?)?_?(?:rev\.(\d+))?\s*[-–]\s*(.+?)(?:\s*\(S\))?\s*\.pdf/i);
    if (match) {
      setUploadForm((f) => ({
        ...f,
        code: match[1] ?? f.code,
        revision: match[2] ?? f.revision,
        description: match[3]?.trim() ?? f.description,
      }));
    }
  };

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !user || !firestore || !storage) return;
    if (!uploadForm.code || !uploadForm.description) {
      toast({ title: 'Completa el código y la descripción', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const storagePath = `planos/${uploadForm.equipment}/${uploadForm.area}/${Date.now()}_${uploadFile.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadFile);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(firestore, 'drawings'), {
        name: uploadFile.name,
        code: uploadForm.code.toUpperCase(),
        description: uploadForm.description,
        revision: uploadForm.revision,
        equipment: uploadForm.equipment,
        area: uploadForm.area,
        storagePath,
        downloadUrl,
        fileSize: uploadFile.size,
        uploadedBy: user.displayName ?? user.email ?? 'Monitor',
        uploadedAt: serverTimestamp(),
      });

      toast({ title: 'Documento subido exitosamente', description: uploadForm.code });
      setUploadOpen(false);
      setUploadFile(null);
      setUploadForm({ code: '', description: '', revision: '00', equipment: 'SAG-1624', area: 'CIVIL' });
    } catch {
      toast({ title: 'Error al subir el documento', variant: 'destructive' });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [uploadFile, user, firestore, storage, uploadForm, toast]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !firestore || !storage) return;
    setDeleting(true);
    try {
      await deleteObject(ref(storage, deleteTarget.storagePath));
      await deleteDoc(doc(firestore, 'drawings', deleteTarget.id));
      toast({ title: 'Documento eliminado', description: deleteTarget.code });
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, firestore, storage, toast]);

  // ── Sync area when equipment changes ──────────────────────────────────────
  const handleEquipmentChange = (eq: Equipment) => {
    setActiveEquipment(eq);
    setActiveArea(AREAS_BY_EQUIPMENT[eq][0]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <FolderOpen className="w-7 h-7 text-cyan-400" />
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                  Biblioteca de Planos
                </h1>
                {isMonitor && (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs gap-1">
                    <ShieldAlert className="w-3 h-3" /> Monitor
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400">
                Documentación técnica MIL24.001 — SAG Mill & Ball Mill — Proyecto ARIS MINING
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar planos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-56 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                  </button>
                )}
              </div>

              {isMonitor && (
                <Button
                  onClick={() => setUploadOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2 text-sm"
                >
                  <Upload className="w-4 h-4" /> Subir Plano
                </Button>
              )}
            </div>
          </div>

          {/* ── Equipment Tabs ──────────────────────────────────────────── */}
          <Tabs value={activeEquipment} onValueChange={(v) => handleEquipmentChange(v as Equipment)}>
            <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-lg">
              {(Object.keys(EQUIPMENT_CONFIG) as Equipment[]).map((eq) => (
                <TabsTrigger
                  key={eq}
                  value={eq}
                  className={cn(
                    'text-sm font-medium px-4 py-2 rounded-md transition-all',
                    'data-[state=active]:text-slate-900 data-[state=active]:font-semibold',
                    eq === 'SAG-1624' && 'data-[state=active]:bg-cyan-400',
                    eq === 'BM-2216' && 'data-[state=active]:bg-violet-400',
                    eq === 'GENERAL' && 'data-[state=active]:bg-amber-400',
                  )}
                >
                  {EQUIPMENT_CONFIG[eq].shortLabel}
                </TabsTrigger>
              ))}
            </TabsList>

            {(Object.keys(EQUIPMENT_CONFIG) as Equipment[]).map((eq) => (
              <TabsContent key={eq} value={eq} className="mt-4">
                <EquipmentPanel
                  equipment={eq}
                  activeArea={activeArea}
                  onAreaChange={setActiveArea}
                  documents={filtered}
                  isLoading={isLoading}
                  isMonitor={isMonitor}
                  onView={(d) => { setViewerDoc(d); setViewerOpen(true); }}
                  onDelete={(d) => setDeleteTarget(d)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>

      {/* ── PDF Viewer Dialog ─────────────────────────────────────────────── */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl w-full h-[90vh] bg-slate-950 border border-slate-700 flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-800 flex-shrink-0">
            <DialogTitle className="flex items-center gap-3 text-slate-100">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>{viewerDoc?.code}</span>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                Rev. {viewerDoc?.revision ?? '—'}
              </Badge>
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-1">{viewerDoc?.description}</p>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-slate-900">
            {viewerDoc && (
              <iframe
                src={viewerDoc.downloadUrl}
                className="w-full h-full border-0"
                title={viewerDoc.description}
              />
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-800 flex-shrink-0 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {viewerDoc && formatBytes(viewerDoc.fileSize)} · Subido por {viewerDoc?.uploadedBy}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewerOpen(false)}
                className="border-slate-700 text-slate-400 hover:text-slate-200">
                Cerrar
              </Button>
              <Button size="sm" asChild
                className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2">
                <a href={viewerDoc?.downloadUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4" /> Descargar
                </a>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!uploading) setUploadOpen(o); }}>
        <DialogContent className="max-w-lg bg-slate-950 border border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-100">
              <Upload className="w-5 h-5 text-cyan-400" /> Subir Documento PDF
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* File drop area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                uploadFile
                  ? 'border-cyan-500/50 bg-cyan-500/5'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900'
              )}
            >
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-6 h-6 text-cyan-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-200">{uploadFile.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(uploadFile.size)}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Click para seleccionar PDF</p>
                  <p className="text-xs text-slate-600 mt-1">Máximo 50 MB</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect} />

            {/* Form fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-400">Equipo</Label>
                <Select
                  value={uploadForm.equipment}
                  onValueChange={(v) => setUploadForm((f) => ({ ...f, equipment: v as Equipment, area: AREAS_BY_EQUIPMENT[v as Equipment][0] }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {(Object.keys(EQUIPMENT_CONFIG) as Equipment[]).map((eq) => (
                      <SelectItem key={eq} value={eq} className="text-slate-200 text-sm">
                        {EQUIPMENT_CONFIG[eq].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Área</Label>
                <Select
                  value={uploadForm.area}
                  onValueChange={(v) => setUploadForm((f) => ({ ...f, area: v as Area }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-200 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {AREAS_BY_EQUIPMENT[uploadForm.equipment].map((area) => (
                      <SelectItem key={area} value={area} className="text-slate-200 text-sm">
                        {AREA_CONFIG[area].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Revisión</Label>
                <Input
                  value={uploadForm.revision}
                  onChange={(e) => setUploadForm((f) => ({ ...f, revision: e.target.value }))}
                  placeholder="00"
                  className="bg-slate-900 border-slate-700 text-slate-200 text-sm"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-400">Código del documento</Label>
                <Input
                  value={uploadForm.code}
                  onChange={(e) => setUploadForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Ej: BCI-1624, CLL-2216, IS-2216-18-1"
                  className="bg-slate-900 border-slate-700 text-slate-200 text-sm"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label className="text-xs text-slate-400">Descripción</Label>
                <Input
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Bolt & Cast-In Details"
                  className="bg-slate-900 border-slate-700 text-slate-200 text-sm"
                />
              </div>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Subiendo...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}
              className="border-slate-700 text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
            >
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Upload className="w-4 h-4" /> Subir</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-slate-950 border border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" /> Eliminar documento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              ¿Eliminar <span className="font-semibold text-slate-200">{deleteTarget?.code}</span>?
              Esta acción no se puede deshacer. El archivo se eliminará de Firebase Storage y Firestore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-400 hover:text-slate-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EQUIPMENT PANEL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface EquipmentPanelProps {
  equipment: Equipment;
  activeArea: Area;
  onAreaChange: (area: Area) => void;
  documents: Drawing[];
  isLoading: boolean;
  isMonitor: boolean;
  onView: (d: Drawing) => void;
  onDelete: (d: Drawing) => void;
}

function EquipmentPanel({
  equipment,
  activeArea,
  onAreaChange,
  documents,
  isLoading,
  isMonitor,
  onView,
  onDelete,
}: EquipmentPanelProps) {
  const config = EQUIPMENT_CONFIG[equipment];
  const areas = AREAS_BY_EQUIPMENT[equipment];

  return (
    <Card className="bg-slate-900/50 border border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-800">
        <CardTitle className={cn('text-lg font-semibold flex items-center gap-2', config.color)}>
          <FolderOpen className="w-5 h-5" />
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs value={activeArea} onValueChange={(v) => onAreaChange(v as Area)}>
          <TabsList className="bg-slate-950 border border-slate-800 mb-4">
            {areas.map((area) => {
              const Icon = AREA_CONFIG[area].icon;
              return (
                <TabsTrigger
                  key={area}
                  value={area}
                  className="text-xs gap-1.5 data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {AREA_CONFIG[area].label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {areas.map((area) => (
            <TabsContent key={area} value={area}>
              <AreaDescription area={area} />
              <DrawingsTable
                documents={documents}
                isLoading={isLoading}
                isMonitor={isMonitor}
                onView={onView}
                onDelete={onDelete}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AREA DESCRIPTION
// ─────────────────────────────────────────────────────────────────────────────
function AreaDescription({ area }: { area: Area }) {
  const cfg = AREA_CONFIG[area];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 mb-3 p-2.5 rounded-md bg-slate-800/50 border border-slate-700/50">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
      <p className="text-xs text-slate-400">{cfg.description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAWINGS TABLE
// ─────────────────────────────────────────────────────────────────────────────
interface DrawingsTableProps {
  documents: Drawing[];
  isLoading: boolean;
  isMonitor: boolean;
  onView: (d: Drawing) => void;
  onDelete: (d: Drawing) => void;
}

function DrawingsTable({ documents, isLoading, isMonitor, onView, onDelete }: DrawingsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando documentos...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <FolderOpen className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">Sin documentos en esta área</p>
        {isMonitor && (
          <p className="text-xs mt-1 text-slate-700">Usa el botón "Subir Plano" para agregar el primero</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-900 border-slate-800 hover:bg-slate-900">
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-36">Código</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Descripción</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-20 text-center">Rev.</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-24 text-right">Tamaño</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-32">Fecha</TableHead>
            <TableHead className="text-slate-400 text-xs font-semibold uppercase tracking-wide w-36 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((drawing) => (
            <TableRow
              key={drawing.id}
              className="border-slate-800 hover:bg-slate-800/50 transition-colors"
            >
              <TableCell className="font-mono text-sm text-cyan-400 font-medium">
                {drawing.code}
              </TableCell>
              <TableCell className="text-sm text-slate-200">{drawing.description}</TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 font-mono">
                  {drawing.revision}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-xs text-slate-500 tabular-nums">
                {formatBytes(drawing.fileSize)}
              </TableCell>
              <TableCell className="text-xs text-slate-500">
                {formatDate(drawing.uploadedAt)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(drawing)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                    title="Ver PDF"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                    className="h-7 w-7 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10"
                    title="Descargar"
                  >
                    <a href={drawing.downloadUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  {isMonitor && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(drawing)}
                      className="h-7 w-7 p-0 text-slate-600 hover:text-red-400 hover:bg-red-500/10"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
