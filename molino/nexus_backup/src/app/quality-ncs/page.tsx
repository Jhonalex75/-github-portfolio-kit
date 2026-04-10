'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Search,
  Plus,
  Loader2,
  Camera,
  X,
  Save,
  ChevronRight,
  ArrowLeft,
  Eye,
  Wrench,
  FileText,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  ImageIcon,
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useStorage,
  useMemoFirebase,
  useCollection,
  useDoc,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EQUIPOS_TECNICOS, WBS_GRUPOS, type EquipoTecnico } from '@/lib/equipment-data';
import Image from 'next/image';

const OWNER_UID = 'R3MVwE12nVMg128Kv6bdwJ6MKav1';
const OWNER_EMAILS = ['jhonalexandervm@outlook.com', 'jhonalexanderv@gmail.com'];

type ActivityType = 'MANTENIMIENTO' | 'INSPECCION' | 'REPARACION' | 'NCR' | 'OTRO';
type ActivityStatus = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
type NCRPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

interface Activity {
  id?: string;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  responsable: string;
  fotoURLs: string[];
  estado: ActivityStatus;
  ncr?: {
    numero: string;
    descripcion: string;
    accionCorrectiva: string;
    prioridad: NCRPriority;
  };
  authorId: string;
  authorName: string;
  createdAt: string;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'NCR', label: 'No Conformidad (NCR)' },
  { value: 'OTRO', label: 'Otro' },
];

const ACTIVITY_STATUS: { value: ActivityStatus; label: string }[] = [
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'CERRADO', label: 'Cerrado' },
];

const NCR_PRIORITIES: { value: NCRPriority; label: string }[] = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

export default function QualityNCSPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const equipoPhotoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'equipos' | 'hoja-vida' | 'ncr'>('equipos');
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoTecnico | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterWBS, setFilterWBS] = useState('ALL');

  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [actFecha, setActFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [actTipo, setActTipo] = useState<ActivityType>('MANTENIMIENTO');
  const [actDescripcion, setActDescripcion] = useState('');
  const [actResponsable, setActResponsable] = useState('');
  const [actEstado, setActEstado] = useState<ActivityStatus>('ABIERTO');
  const [actFotoURLs, setActFotoURLs] = useState<string[]>([]);
  const [actUploadingPhotos, setActUploadingPhotos] = useState(false);
  const [ncrNumero, setNcrNumero] = useState('');
  const [ncrDescripcion, setNcrDescripcion] = useState('');
  const [ncrAccion, setNcrAccion] = useState('');
  const [ncrPrioridad, setNcrPrioridad] = useState<NCRPriority>('MEDIA');

  const [equipoPhotoUploading, setEquipoPhotoUploading] = useState(false);

  const [ncrFilterStatus, setNcrFilterStatus] = useState<'ALL' | ActivityStatus>('ALL');
  const [ncrFilterPriority, setNcrFilterPriority] = useState<'ALL' | NCRPriority>('ALL');
  const [ncrSearch, setNcrSearch] = useState('');

  const [viewActivity, setViewActivity] = useState<any | null>(null);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const equipoDocRef = useMemoFirebase(() => {
    if (!firestore || !selectedEquipo) return null;
    return doc(firestore, 'equipment', selectedEquipo.tag);
  }, [firestore, selectedEquipo]);
  const { data: equipoDoc } = useDoc(equipoDocRef);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedEquipo) return null;
    return query(
      collection(firestore, 'equipment_activities'),
      where('equipoTag', '==', selectedEquipo.tag)
    );
  }, [firestore, user, selectedEquipo]);
  const { data: activitiesRaw, isLoading: activitiesLoading } = useCollection(activitiesQuery);
  const activities = activitiesRaw
    ? [...activitiesRaw].sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
    : null;

  const allNcrQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'non_conformities');
  }, [firestore, user]);
  const { data: allNcrsRaw, isLoading: ncrsLoading } = useCollection(allNcrQuery);
  const allNcrs = allNcrsRaw
    ? [...allNcrsRaw].sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
    : null;

  const filteredEquipos = EQUIPOS_TECNICOS.filter((eq) => {
    if (filterWBS !== 'ALL' && eq.sub_wbs !== filterWBS) return false;
    const term = searchTerm.toLowerCase();
    if (
      term &&
      !eq.tag.toLowerCase().includes(term) &&
      !eq.nombre.toLowerCase().includes(term) &&
      !eq.proveedor.toLowerCase().includes(term) &&
      !eq.marca.toLowerCase().includes(term)
    )
      return false;
    return true;
  });

  const filteredNcrs = (allNcrs || []).filter((ncr: any) => {
    if (ncrFilterStatus !== 'ALL' && ncr.estado !== ncrFilterStatus) return false;
    if (ncrFilterPriority !== 'ALL' && ncr.ncr?.prioridad !== ncrFilterPriority) return false;
    if (
      ncrSearch &&
      !ncr.equipoTag?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.equipoNombre?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.ncr?.numero?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.descripcion?.toLowerCase().includes(ncrSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const uploadToStorage = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error('Firebase Storage no está configurado.');
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const handleActivityPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEquipo || !e.target.files) return;
    const files = Array.from(e.target.files);
    if (actFotoURLs.length + files.length > 5) {
      toast({ variant: 'destructive', title: 'LÍMITE', description: 'Máximo 5 fotografías.' });
      return;
    }
    setActUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const path = `equipment/${selectedEquipo.tag}/${Date.now()}_${file.name}`;
        const url = await uploadToStorage(file, path);
        urls.push(url);
      }
      setActFotoURLs((prev) => [...prev, ...urls]);
      toast({ title: 'FOTOS SUBIDAS', description: `${urls.length} foto(s) en Cloud Storage.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR FOTOS', description: err?.message || 'No se pudieron subir las fotos.' });
    } finally {
      setActUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEquipoPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEquipo || !e.target.files?.[0] || !firestore) return;
    const file = e.target.files[0];
    setEquipoPhotoUploading(true);
    try {
      const path = `equipment/${selectedEquipo.tag}/profile_${Date.now()}_${file.name}`;
      const url = await uploadToStorage(file, path);
      await setDoc(
        doc(firestore, 'equipment', selectedEquipo.tag),
        { tag: selectedEquipo.tag, nombre: selectedEquipo.nombre, photoURL: url, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast({ title: 'FOTO GUARDADA', description: 'Fotografía del equipo actualizada.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message || 'No se pudo subir la foto.' });
    } finally {
      setEquipoPhotoUploading(false);
      if (equipoPhotoInputRef.current) equipoPhotoInputRef.current.value = '';
    }
  };

  const resetActivityForm = () => {
    setActFecha(new Date().toISOString().split('T')[0]);
    setActTipo('MANTENIMIENTO');
    setActDescripcion('');
    setActResponsable('');
    setActEstado('ABIERTO');
    setActFotoURLs([]);
    setNcrNumero('');
    setNcrDescripcion('');
    setNcrAccion('');
    setNcrPrioridad('MEDIA');
  };

  const handleSaveActivity = async () => {
    if (!user || !firestore || !selectedEquipo) return;
    if (!actDescripcion.trim() || !actResponsable.trim()) {
      toast({ variant: 'destructive', title: 'CAMPOS REQUERIDOS', description: 'Complete descripción y responsable.' });
      return;
    }
    if (actTipo === 'NCR' && (!ncrNumero.trim() || !ncrDescripcion.trim())) {
      toast({ variant: 'destructive', title: 'NCR INCOMPLETA', description: 'Complete número y descripción de la NCR.' });
      return;
    }

    setActivitySaving(true);
    try {
      const activityData: Omit<Activity, 'id'> = {
        tipo: actTipo,
        descripcion: actDescripcion.trim(),
        fecha: actFecha,
        responsable: actResponsable.trim(),
        fotoURLs: actFotoURLs,
        estado: actEstado,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName || 'Engineer',
        createdAt: new Date().toISOString(),
        ...(actTipo === 'NCR' && {
          ncr: {
            numero: ncrNumero.trim(),
            descripcion: ncrDescripcion.trim(),
            accionCorrectiva: ncrAccion.trim(),
            prioridad: ncrPrioridad,
          },
        }),
      };

      // Guardar actividad en colección plana — igual al patrón de QualityHallazgos
      await addDoc(
        collection(firestore, 'equipment_activities'),
        { ...activityData, equipoTag: selectedEquipo.tag, equipoNombre: selectedEquipo.nombre }
      );

      // Si es NCR, también guardar en colección global
      if (actTipo === 'NCR') {
        await addDoc(collection(firestore, 'non_conformities'), {
          ...activityData,
          equipoTag: selectedEquipo.tag,
          equipoNombre: selectedEquipo.nombre,
        });
      }

      toast({ title: 'ACTIVIDAD REGISTRADA', description: 'Guardada correctamente en Firebase.' });
      resetActivityForm();
      setIsCreatingActivity(false);
    } catch (err: any) {
      console.error('ERROR GUARDAR ACTIVIDAD:', err);
      toast({
        variant: 'destructive',
        title: 'ERROR AL GUARDAR',
        description: err?.message || err?.code || err?.toString() || 'Error desconocido.',
      });
    } finally {
      setActivitySaving(false);
    }
  };

  const openHojaVida = (eq: EquipoTecnico) => {
    setSelectedEquipo(eq);
    setActiveTab('hoja-vida');
    resetActivityForm();
    setIsCreatingActivity(false);
  };

  const statusBadge = (status: ActivityStatus) => {
    const colors: Record<ActivityStatus, string> = {
      ABIERTO: 'bg-red-500/10 text-red-400 border-red-500/30',
      EN_PROCESO: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      CERRADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
    const labels: Record<ActivityStatus, string> = { ABIERTO: 'Abierto', EN_PROCESO: 'En Proceso', CERRADO: 'Cerrado' };
    return (
      <Badge className={cn('rounded-none text-[9px] font-display uppercase tracking-widest border', colors[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const priorityBadge = (p?: NCRPriority) => {
    if (!p) return null;
    const colors: Record<NCRPriority, string> = {
      CRITICA: 'bg-red-600/20 text-red-400 border-red-500/40',
      ALTA: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      MEDIA: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      BAJA: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    };
    return (
      <Badge className={cn('rounded-none text-[9px] font-display uppercase tracking-widest border', colors[p])}>
        {p}
      </Badge>
    );
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-foreground font-mono-tech">
      <TopNav />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'hoja-vida' && selectedEquipo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground hover:text-primary"
                  onClick={() => { setActiveTab('equipos'); setSelectedEquipo(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg font-display font-black uppercase tracking-widest text-primary">
                  {activeTab === 'hoja-vida' && selectedEquipo ? selectedEquipo.tag : 'QUALITY — NO CONFORMANCES'}
                </h1>
                <p className="text-[10px] text-muted-foreground font-mono-tech uppercase tracking-widest">
                  {activeTab === 'hoja-vida' && selectedEquipo ? selectedEquipo.nombre : 'Gestión de equipos y no conformidades'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="rounded-none bg-slate-900 border border-primary/10">
              <TabsTrigger value="equipos" className="rounded-none font-display font-black uppercase tracking-widest text-[10px]">
                <Wrench className="w-3 h-3 mr-1" /> Equipos ({EQUIPOS_TECNICOS.length})
              </TabsTrigger>
              <TabsTrigger
                value="hoja-vida"
                className="rounded-none font-display font-black uppercase tracking-widest text-[10px]"
                disabled={!selectedEquipo}
              >
                <ClipboardList className="w-3 h-3 mr-1" /> Hoja de Vida
              </TabsTrigger>
              <TabsTrigger value="ncr" className="rounded-none font-display font-black uppercase tracking-widest text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" /> No Conformidades
              </TabsTrigger>
            </TabsList>

            {/* ── TAB EQUIPOS ─────────────────────────────────────────────── */}
            <TabsContent value="equipos" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar TAG, nombre, proveedor, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  />
                </div>
                <Select value={filterWBS} onValueChange={setFilterWBS}>
                  <SelectTrigger className="w-[280px] rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Filtrar por WBS" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20 max-h-72">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todos los grupos WBS</SelectItem>
                    {WBS_GRUPOS.map((wbs) => (
                      <SelectItem key={wbs} value={wbs} className="font-mono-tech text-[10px]">{wbs}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="rounded-none font-display font-black text-[10px] uppercase tracking-widest border-primary/30 text-primary/70 self-center px-3 h-9 flex items-center">
                  {filteredEquipos.length} equipos
                </Badge>
              </div>

              <Card className="rounded-none border-primary/10 bg-slate-900/50">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-primary/10 hover:bg-transparent">
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60 w-12">ITEM</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">TAG</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">NOMBRE</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">PROVEEDOR</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">MARCA / MODELO</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">ESTADO PROVEEDOR</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">GRUPO WBS</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipos.slice(0, 200).map((eq) => (
                        <TableRow
                          key={eq.tag}
                          className="border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors"
                          onClick={() => openHojaVida(eq)}
                        >
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{eq.item}</TableCell>
                          <TableCell className="font-mono-tech text-[11px] text-primary font-bold">{eq.tag}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] max-w-[240px] truncate">{eq.nombre}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{eq.proveedor !== 'N/A' && eq.proveedor ? eq.proveedor : '—'}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">
                            {[eq.marca, eq.modelo].filter(v => v && v !== 'N/A').join(' / ') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-none text-[8px] border-primary/20 text-primary/60 font-display uppercase">
                              {eq.estado_proveedor || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono-tech text-[9px] text-muted-foreground/60 max-w-[140px] truncate">
                            {eq.sub_wbs.replace('WBS ', '')}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredEquipos.length > 200 && (
                  <div className="p-3 text-center text-[10px] text-muted-foreground font-mono-tech border-t border-primary/10">
                    Mostrando 200 de {filteredEquipos.length}. Refine la búsqueda para ver más.
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── TAB HOJA DE VIDA ─────────────────────────────────────────── */}
            <TabsContent value="hoja-vida" className="space-y-4 mt-4">
              {!selectedEquipo ? (
                <div className="text-center py-20 text-muted-foreground font-mono-tech text-[11px]">
                  Seleccione un equipo en la pestaña EQUIPOS
                </div>
              ) : (
                <>
                  {/* Foto + Especificaciones */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Foto */}
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className="w-full h-48 bg-slate-800 border border-primary/10 flex items-center justify-center relative overflow-hidden">
                          {equipoDoc?.photoURL ? (
                            <Image src={equipoDoc.photoURL} alt={selectedEquipo.nombre} fill className="object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ImageIcon className="w-10 h-10 opacity-20" />
                              <span className="text-[9px] font-display uppercase tracking-widest opacity-40">Sin fotografía</span>
                            </div>
                          )}
                        </div>
                        <input ref={equipoPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleEquipoPhotoUpload} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
                          onClick={() => equipoPhotoInputRef.current?.click()}
                          disabled={equipoPhotoUploading || !storage}
                        >
                          {equipoPhotoUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}
                          {equipoPhotoUploading ? 'Subiendo...' : (storage ? 'Subir Fotografía' : 'Storage no configurado')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Especificaciones técnicas */}
                    <Card className="rounded-none border-primary/10 bg-slate-900/50 lg:col-span-2">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary">
                          Especificaciones Técnicas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {([
                            ['TAG', selectedEquipo.tag],
                            ['ITEM N°', String(selectedEquipo.item)],
                            ['PAQUETE', selectedEquipo.paquete],
                            ['ESTADO', selectedEquipo.estado],
                            ['CAPACIDAD', selectedEquipo.capacidad],
                            ['PESO (kg)', selectedEquipo.peso_kg],
                            ['ORDEN DE COMPRA', selectedEquipo.orden_compra],
                            ['PROVEEDOR', selectedEquipo.proveedor],
                            ['MARCA', selectedEquipo.marca],
                            ['MODELO', selectedEquipo.modelo],
                            ['ESTADO PROVEEDOR', selectedEquipo.estado_proveedor],
                            ['SERVICIO', selectedEquipo.servicio],
                            ['TIPO ACCIONAMIENTO', selectedEquipo.tipo_accionamiento],
                            ['MÉTODO ARRANQUE', selectedEquipo.metodo_arranque],
                            ['POTENCIA (kW)', selectedEquipo.potencia_kw],
                            ['VOLTAJE (V)', selectedEquipo.voltaje_v],
                            ['CANT. MOTORES', selectedEquipo.cantidad_motores],
                            ['CRITICIDAD POTENCIA', selectedEquipo.criticidad_potencia],
                            ['REV.', selectedEquipo.rev],
                            ['GRUPO WBS', selectedEquipo.sub_wbs.replace('WBS ', '')],
                          ] as [string, string][]).map(([label, value]) => (
                            <div key={label} className="border-b border-primary/5 pb-1.5">
                              <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">{label}</p>
                              <p className="text-[10px] font-mono-tech text-foreground/80 truncate" title={value}>
                                {value && value !== 'N/A' && value !== 'None' && value !== 'TBD' ? value : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Documentos de ingeniería */}
                  {(selectedEquipo.doc_ingenieria || selectedEquipo.pid || selectedEquipo.pfd) && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Documentos de Ingeniería
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedEquipo.doc_ingenieria && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Doc. Ingeniería de Detalles</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.doc_ingenieria}</p>
                          </div>
                        )}
                        {selectedEquipo.pid && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">N° de P&ID</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.pid}</p>
                          </div>
                        )}
                        {selectedEquipo.pfd && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">N° de PFD</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.pfd}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Descripción técnica */}
                  {selectedEquipo.descripcion && selectedEquipo.descripcion !== 'None' && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary">
                          Descripción Técnica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-[11px] font-mono-tech text-foreground/70 whitespace-pre-wrap leading-relaxed">
                          {selectedEquipo.descripcion}
                        </p>
                        {selectedEquipo.comentarios && selectedEquipo.comentarios !== 'None' && selectedEquipo.comentarios !== '' && (
                          <p className="text-[10px] font-mono-tech text-primary/60 mt-2 italic border-t border-primary/10 pt-2">
                            Comentarios: {selectedEquipo.comentarios}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actividades */}
                  <Card className="rounded-none border-primary/10 bg-slate-900/50">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5" /> Historial de Actividades
                      </CardTitle>
                      <Button
                        size="sm"
                        className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground h-7 px-3"
                        onClick={() => { resetActivityForm(); setIsCreatingActivity(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Agregar
                      </Button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {activitiesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : !activities?.length ? (
                        <div className="text-center py-8 text-muted-foreground font-mono-tech text-[10px]">
                          Sin actividades registradas. Agregue la primera actividad con el botón de arriba.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activities.map((act: any) => (
                            <div
                              key={act.id}
                              className="border border-primary/10 bg-slate-950/50 p-3 flex items-start justify-between gap-3 hover:border-primary/30 transition-colors cursor-pointer"
                              onClick={() => setViewActivity(act)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="rounded-none text-[8px] font-display uppercase tracking-widest border-primary/30 text-primary/70">
                                    {act.tipo}
                                  </Badge>
                                  {statusBadge(act.estado)}
                                  {act.ncr && priorityBadge(act.ncr.prioridad)}
                                </div>
                                <p className="text-[10px] font-mono-tech text-foreground/80 truncate">{act.descripcion}</p>
                                <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground font-mono-tech">
                                  <span>{act.fecha}</span>
                                  <span>·</span>
                                  <span>{act.responsable}</span>
                                  {act.fotoURLs?.length > 0 && (
                                    <><span>·</span><span className="flex items-center gap-1"><Camera className="w-2.5 h-2.5" />{act.fotoURLs.length}</span></>
                                  )}
                                </div>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── TAB NO CONFORMIDADES ─────────────────────────────────────── */}
            <TabsContent value="ncr" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total NCRs', value: (allNcrs || []).length, icon: AlertTriangle, color: 'text-primary' },
                  { label: 'Abiertas', value: (allNcrs || []).filter((n: any) => n.estado === 'ABIERTO').length, icon: XCircle, color: 'text-red-400' },
                  { label: 'En Proceso', value: (allNcrs || []).filter((n: any) => n.estado === 'EN_PROCESO').length, icon: Clock, color: 'text-yellow-400' },
                  { label: 'Cerradas', value: (allNcrs || []).filter((n: any) => n.estado === 'CERRADO').length, icon: CheckCircle2, color: 'text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="rounded-none border-primary/10 bg-slate-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className={cn('w-5 h-5', color)} />
                      <div>
                        <p className="text-[8px] font-display font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className={cn('text-xl font-display font-black', color)}>{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar NCR, equipo, descripción..."
                    value={ncrSearch}
                    onChange={(e) => setNcrSearch(e.target.value)}
                    className="pl-9 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  />
                </div>
                <Select value={ncrFilterStatus} onValueChange={(v) => setNcrFilterStatus(v as any)}>
                  <SelectTrigger className="w-36 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todos</SelectItem>
                    {ACTIVITY_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="font-mono-tech text-[11px]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ncrFilterPriority} onValueChange={(v) => setNcrFilterPriority(v as any)}>
                  <SelectTrigger className="w-36 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todas</SelectItem>
                    {NCR_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="font-mono-tech text-[11px]">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ncrsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : !filteredNcrs.length ? (
                <Card className="rounded-none border-primary/10 bg-slate-900/50">
                  <CardContent className="py-12 text-center text-muted-foreground font-mono-tech text-[10px]">
                    {(allNcrs || []).length === 0
                      ? 'Sin no conformidades. Las NCRs creadas en la Hoja de Vida aparecerán aquí.'
                      : 'No se encontraron NCRs con los filtros aplicados.'}
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-none border-primary/10 bg-slate-900/50">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-primary/10 hover:bg-transparent">
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">N° NCR</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">EQUIPO</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">DESCRIPCIÓN</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">FECHA</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">PRIORIDAD</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">ESTADO</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">RESPONSABLE</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNcrs.map((ncr: any) => (
                          <TableRow key={ncr.id} className="border-primary/5 hover:bg-primary/5 cursor-pointer" onClick={() => setViewActivity(ncr)}>
                            <TableCell className="font-mono-tech text-[10px] text-primary font-bold">{ncr.ncr?.numero || '—'}</TableCell>
                            <TableCell className="font-mono-tech text-[10px]">
                              <div>{ncr.equipoTag}</div>
                              <div className="text-[9px] text-muted-foreground truncate max-w-[140px]">{ncr.equipoNombre}</div>
                            </TableCell>
                            <TableCell className="font-mono-tech text-[10px] max-w-[200px] truncate">{ncr.descripcion}</TableCell>
                            <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{ncr.fecha}</TableCell>
                            <TableCell>{priorityBadge(ncr.ncr?.prioridad)}</TableCell>
                            <TableCell>{statusBadge(ncr.estado)}</TableCell>
                            <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{ncr.responsable}</TableCell>
                            <TableCell><Eye className="w-3.5 h-3.5 text-muted-foreground/40" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* ── Dialog: Nueva Actividad ───────────────────────────────────────────── */}
      <Dialog
        open={isCreatingActivity}
        onOpenChange={(open) => { if (!open) { setIsCreatingActivity(false); resetActivityForm(); } }}
      >
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary">
              Nueva Actividad — {selectedEquipo?.tag}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Fecha *</Label>
                <Input
                  type="date"
                  value={actFecha}
                  onChange={(e) => setActFecha(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Tipo *</Label>
                <Select value={actTipo} onValueChange={(v) => setActTipo(v as ActivityType)}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="font-mono-tech text-[11px]">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción *</Label>
              <textarea
                value={actDescripcion}
                onChange={(e) => setActDescripcion(e.target.value)}
                rows={3}
                className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                placeholder="Describa la actividad realizada..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Responsable *</Label>
                <Input
                  value={actResponsable}
                  onChange={(e) => setActResponsable(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Estado</Label>
                <Select value={actEstado} onValueChange={(v) => setActEstado(v as ActivityStatus)}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    {ACTIVITY_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="font-mono-tech text-[11px]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos NCR */}
            {actTipo === 'NCR' && (
              <div className="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <p className="font-display font-black uppercase tracking-widest text-[9px] text-red-400">Datos de No Conformidad</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">N° NCR *</Label>
                    <Input
                      value={ncrNumero}
                      onChange={(e) => setNcrNumero(e.target.value)}
                      className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                      placeholder="NCR-001"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Prioridad</Label>
                    <Select value={ncrPrioridad} onValueChange={(v) => setNcrPrioridad(v as NCRPriority)}>
                      <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                        {NCR_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="font-mono-tech text-[11px]">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción NC *</Label>
                  <textarea
                    value={ncrDescripcion}
                    onChange={(e) => setNcrDescripcion(e.target.value)}
                    rows={2}
                    className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Descripción de la no conformidad..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Acción Correctiva</Label>
                  <textarea
                    value={ncrAccion}
                    onChange={(e) => setNcrAccion(e.target.value)}
                    rows={2}
                    className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Acción correctiva propuesta..."
                  />
                </div>
              </div>
            )}

            {/* Fotos */}
            <div className="space-y-2">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">
                Fotografías de Evidencia ({actFotoURLs.length}/5)
                {!storage && <span className="text-yellow-400 ml-2">— Storage no configurado</span>}
              </Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleActivityPhotoAdd} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20 w-full h-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={actUploadingPhotos || actFotoURLs.length >= 5 || !storage}
              >
                {actUploadingPhotos ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                {actUploadingPhotos ? 'Subiendo a Cloud Storage...' : 'Subir Fotografías'}
              </Button>
              {actFotoURLs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {actFotoURLs.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 border border-primary/20">
                      <Image src={url} alt={`foto-${i}`} fill className="object-cover" />
                      <button
                        onClick={() => setActFotoURLs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => { setIsCreatingActivity(false); resetActivityForm(); }}
              disabled={activitySaving}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground"
              onClick={handleSaveActivity}
              disabled={activitySaving || actUploadingPhotos}
            >
              {activitySaving
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Guardando...</>
                : <><Save className="w-3 h-3 mr-1" /> Guardar Actividad</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Actividad ─────────────────────────────────────────────── */}
      <Dialog open={!!viewActivity} onOpenChange={(open) => { if (!open) setViewActivity(null); }}>
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary flex items-center gap-2">
              {viewActivity?.tipo === 'NCR' && <AlertTriangle className="w-4 h-4 text-red-400" />}
              {viewActivity?.tipo} — {viewActivity?.fecha}
            </DialogTitle>
          </DialogHeader>
          {viewActivity && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                {statusBadge(viewActivity.estado)}
                {viewActivity.ncr && priorityBadge(viewActivity.ncr.prioridad)}
                {viewActivity.equipoTag && (
                  <Badge variant="outline" className="rounded-none text-[9px] font-display uppercase tracking-widest border-primary/30 text-primary/70">
                    {viewActivity.equipoTag}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Descripción</p>
                <p className="text-[11px] font-mono-tech text-foreground/80 whitespace-pre-wrap">{viewActivity.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Responsable</p>
                  <p className="text-[11px] font-mono-tech">{viewActivity.responsable}</p>
                </div>
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Registrado por</p>
                  <p className="text-[11px] font-mono-tech">{viewActivity.authorName}</p>
                </div>
              </div>
              {viewActivity.ncr && (
                <div className="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                  <p className="font-display font-black uppercase tracking-widest text-[9px] text-red-400">No Conformidad</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">N° NCR</p>
                      <p className="text-[11px] font-mono-tech text-primary">{viewActivity.ncr.numero}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Prioridad</p>
                      {priorityBadge(viewActivity.ncr.prioridad)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Descripción NC</p>
                    <p className="text-[10px] font-mono-tech text-foreground/70 whitespace-pre-wrap">{viewActivity.ncr.descripcion}</p>
                  </div>
                  {viewActivity.ncr.accionCorrectiva && (
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Acción Correctiva</p>
                      <p className="text-[10px] font-mono-tech text-foreground/70 whitespace-pre-wrap">{viewActivity.ncr.accionCorrectiva}</p>
                    </div>
                  )}
                </div>
              )}
              {viewActivity.fotoURLs?.length > 0 && (
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-2">Fotografías</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewActivity.fotoURLs.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative w-full h-24 block border border-primary/20 hover:border-primary/50 transition-colors">
                        <Image src={url} alt={`evidencia-${i}`} fill className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => setViewActivity(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
