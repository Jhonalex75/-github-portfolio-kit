/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  ShieldCheck, 
  Loader2, 
  Camera, 
  Save, 
  Maximize2,
  Ruler,
  Printer
} from 'lucide-react';
import { 
  useUser, 
  useFirestore, 
  useMemoFirebase,
  addDocumentNonBlocking,
  useDoc
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import Image from 'next/image';

type Role = 'ENGINEER' | 'SUPERVISOR_QA' | 'CLIENTE' | 'ROOT_MONITOR';

interface PlateReadings {
  nw: number; n: number; ne: number;
  w: number; center: number; e: number;
  sw: number; s: number; se: number;
}

export default function QAQCPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('fase2');
  const [loading, setLoading] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [currentHPItem, setCurrentHPItem] = useState<string | null>(null);
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ fase: string, item_id: string } | null>(null);

  // Form 1 Topographic Matrix State (9 points per plate as per Metso Standard)
  const initialPlate = {
    nw: 0, n: 0, ne: 0,
    w: 0, center: 0, e: 0,
    sw: 0, s: 0, se: 0
  };

  const [topografia, setTopografia] = useState({
    placa_free: {
      lecturas: { ...initialPlate },
      diff: 0,
      estado: "Pendiente"
    },
    placa_fixed: {
      lecturas: { ...initialPlate },
      diff: 0,
      estado: "Pendiente"
    },
    distancia_entre_placas: { l: 0, r: 0 },
    diagonales: { d1: 0, d2: 0 }
  });

  // Business Logic: Real-time TIR Calculation (Max - Min)
  useEffect(() => {
    const calculateStats = (readings: PlateReadings) => {
      const vals = Object.values(readings).map(v => typeof v === 'string' ? parseFloat(v) : v).filter(v => !isNaN(v) && v !== 0);
      if (vals.length === 0) return { diff: 0, status: "Pendiente" };
      
      const diff = Math.max(...vals) - Math.min(...vals);
      return {
        diff: parseFloat(diff.toFixed(3)),
        status: diff > 0.08 ? "Rechazado" : (vals.length >= 4 ? "Aprobado" : "En Proceso")
      };
    };

    const freeRes = calculateStats(topografia.placa_free.lecturas);
    const fixedRes = calculateStats(topografia.placa_fixed.lecturas);

    setTopografia(prev => ({
      ...prev,
      placa_free: { ...prev.placa_free, diff: freeRes.diff, estado: freeRes.status },
      placa_fixed: { ...prev.placa_fixed, diff: fixedRes.diff, estado: fixedRes.status }
    }));
  }, [topografia.placa_free.lecturas, topografia.placa_fixed.lecturas]);

  const handlePointUpdate = (plate: 'placa_free' | 'placa_fixed', point: keyof PlateReadings, val: string) => {
    const numVal = val === "" ? 0 : parseFloat(val);
    setTopografia(prev => ({
      ...prev,
      [plate]: {
        ...prev[plate],
        lecturas: {
          ...prev[plate].lecturas,
          [point]: isNaN(numVal) ? 0 : numVal
        }
      }
    }));
  };

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const canSignHP = useMemo(() => {
    const role = userData?.role as Role;
    return role === 'SUPERVISOR_QA' || role === 'CLIENTE' || role === 'ROOT_MONITOR';
  }, [userData]);

  const [form, setForm] = useState({
    metadata: {
      proyecto: "BURITICÁ - ETAPA 2",
      equipo: "Molino SAG Metso",
      componente: "Trunnion Bearing Baseplate Alignment",
      estado_liberacion: "En Proceso"
    },
    fases: {
      fase1: [
        { item_id: "1.1", descripcion: "Chipping de cimentación", tipo_respuesta: "checkbox_boolean", cumple: false, evidencia_foto_url: [], observations: "" },
        { item_id: "1.2", descripcion: "Limpieza a metal blanco", tipo_respuesta: "checkbox_boolean", cumple: false, evidencia_foto_url: [], observations: "" }
      ],
      fase2: [
        { item_id: "2.1", descripcion: "Trazo de ejes topográficos", tipo_respuesta: "checkbox_boolean", cumple: false },
        { item_id: "2.4", descripcion: "Nivelación Planeidad (0.08mm/M) (HP)", tipo_respuesta: "firma_hold_point", is_hold_point: true, signed_by: null, cumple: false },
        { item_id: "2.5", descripcion: "Elevación coplanar (HP)", tipo_respuesta: "firma_hold_point", is_hold_point: true, signed_by: null, cumple: false }
      ],
      fase3: [
        { item_id: "3.1", descripcion: "Encofrado estanco y biselado", tipo_respuesta: "checkbox_boolean", cumple: false },
        { item_id: "3.3", descripcion: "Vaciado Grout sin vibración", tipo_respuesta: "checkbox_boolean", cumple: false }
      ],
      fase4: [
        { item_id: "4.3", descripcion: "Torqueo Final (Lb-ft)", tipo_respuesta: "input_numerico", valor: 0, cumple: false },
        { item_id: "4.4", descripcion: "Re-verificación Final Post-Torque (HP)", tipo_respuesta: "firma_hold_point", is_hold_point: true, signed_by: null, cumple: false }
      ]
    }
  });

  const isFase2Complete = useMemo(() => {
    const topoOk = topografia.placa_free.estado === 'Aprobado' && topografia.placa_fixed.estado === 'Aprobado';
    return topoOk && form.fases.fase2.every(item => item.cumple && (!item.is_hold_point || item.signed_by));
  }, [form.fases.fase2, topografia]);

  const handleUpdateItem = (fase: string, item_id: string, updates: any) => {
    setForm(prev => {
      const items = [...(prev.fases as any)[fase]];
      const idx = items.findIndex(i => i.item_id === item_id);
      items[idx] = { ...items[idx], ...updates };
      return { ...prev, fases: { ...prev.fases, [fase]: items } };
    });
  };

  const handleSignHP = () => {
    if (!currentHPItem) return;
    const [fase, item_id] = currentHPItem.split('|');
    handleUpdateItem(fase, item_id, { 
      signed_by: userData?.displayName || user?.displayName || "Supervisor QA",
      cumple: true 
    });
    setIsSupervisorModalOpen(false);
    toast({ title: "HOLD POINT LIBERADO", description: `Protocolo ${item_id} firmado exitosamente.` });
  };

  const triggerPhotoUpload = (fase: string, item_id: string) => {
    setUploadTarget({ fase, item_id });
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const { fase, item_id } = uploadTarget;
      const items = [...(form.fases as any)[fase]];
      const idx = items.findIndex(i => i.item_id === item_id);
      const currentEvidencia = items[idx].evidencia_foto_url || [];
      handleUpdateItem(fase, item_id, { evidencia_foto_url: [...currentEvidencia, reader.result as string] });
      toast({ title: "EVIDENCIA CAPTURADA", description: "Fotografía anclada al dossier." });
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = "";
  };

  const handleSave = () => {
    if (!firestore || !user) return;
    setLoading(true);
    const inspectionData = {
      ...form,
      datos_topograficos: topografia,
      inspector: userData?.displayName || user.displayName || "Ing. Jhon Alexander Valencia",
      createdAt: new Date().toISOString()
    };
    addDocumentNonBlocking(collection(firestore, "inspecciones_qa"), inspectionData);
    setLoading(false);
    toast({ title: "DOSSIER QA ANCLADO", description: "Protocolo QA-MEC-METSO-001 guardado con éxito." });
  };

  const printForm = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>WORKSHEET FORM 1 - ${form.metadata.proyecto}</title>
          <style>
            body { font-family: 'Share Tech Mono', monospace; padding: 40px; background: white; color: black; }
            .header { border: 2px solid black; padding: 20px; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid black; padding: 10px; text-align: center; font-size: 12px; }
            .section-title { background: #eee; font-weight: bold; padding: 10px; margin-top: 20px; border: 1px solid black; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>METSO IOM - WORKSHEET FORM 1</h1>
            <p>PROJECT: ${form.metadata.proyecto} | EQUIPMENT: ${form.metadata.equipo}</p>
          </div>
          <div class="section-title">TOPOGRAPHIC ALIGNMENT DATA (mm)</div>
          <table>
            <tr><th>SIDE</th><th>NW</th><th>N</th><th>NE</th><th>W</th><th>CENTER</th><th>E</th><th>SW</th><th>S</th><th>SE</th><th>TIR (mm)</th></tr>
            <tr>
              <td>FREE</td>
              <td>${topografia.placa_free.lecturas.nw}</td><td>${topografia.placa_free.lecturas.n}</td><td>${topografia.placa_free.lecturas.ne}</td>
              <td>${topografia.placa_free.lecturas.w}</td><td>${topografia.placa_free.lecturas.center}</td><td>${topografia.placa_free.lecturas.e}</td>
              <td>${topografia.placa_free.lecturas.sw}</td><td>${topografia.placa_free.lecturas.s}</td><td>${topografia.placa_free.lecturas.se}</td>
              <td><strong>${topografia.placa_free.diff}</strong></td>
            </tr>
            <tr>
              <td>FIXED</td>
              <td>${topografia.placa_fixed.lecturas.nw}</td><td>${topografia.placa_fixed.lecturas.n}</td><td>${topografia.placa_fixed.lecturas.ne}</td>
              <td>${topografia.placa_fixed.lecturas.w}</td><td>${topografia.placa_fixed.lecturas.center}</td><td>${topografia.placa_fixed.lecturas.e}</td>
              <td>${topografia.placa_fixed.lecturas.sw}</td><td>${topografia.placa_fixed.lecturas.s}</td><td>${topografia.placa_fixed.lecturas.se}</td>
              <td><strong>${topografia.placa_fixed.diff}</strong></td>
            </tr>
          </table>
          <p>STAMP: ${new Date().toLocaleString()} | AUTHORITY: ROOT MONITOR</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isUserLoading || !user) return null;

  const PointInput = ({ plate, point, label }: { plate: 'placa_free' | 'placa_fixed', point: keyof PlateReadings, label: string }) => (
    <div className="flex flex-col gap-1 items-center">
      <Label className="text-[7px] font-mono-tech uppercase text-primary/40">{label}</Label>
      <Input 
        type="number" 
        step="0.001" 
        className="h-8 w-20 bg-black/60 border-primary/20 text-[10px] font-mono-tech text-center rounded-none"
        value={(topografia[plate].lecturas as any)[point] || ""}
        onChange={(e) => handlePointUpdate(plate, point, e.target.value)}
      />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 overflow-y-auto scrollbar-hide">
          <header className="border-b border-primary/10 pb-6 mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase italic">Worksheet Form 1</h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">Metso Technical Alignment • BURITICÁ PROJECT</p>
            </div>
            <div className="flex gap-4">
               <Button onClick={printForm} variant="outline" className="border-primary/20 text-primary uppercase font-display text-[9px] h-11 px-6 rounded-none">
                 <Printer className="w-4 h-4 mr-2" /> Imprimir Hoja
               </Button>
               <Button onClick={handleSave} disabled={loading} className="bg-primary hover:bg-primary/80 text-primary-foreground font-display text-[10px] tracking-widest uppercase h-11 px-8 rounded-none shadow-[0_0_20px_rgba(0,229,255,0.3)]">
                 {loading ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Certificar Alineación
               </Button>
            </div>
          </header>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-primary/5 border border-primary/10 p-1 h-14 rounded-none w-full justify-start overflow-x-auto">
              <TabsTrigger value="fase1" className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none">1. Preparación</TabsTrigger>
              <TabsTrigger value="fase2" className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none">2. Form 1 Alignment (HP)</TabsTrigger>
              <TabsTrigger value="fase3" disabled={!isFase2Complete} className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none">3. Grouting</TabsTrigger>
              <TabsTrigger value="fase4" className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none">4. Post-Torque</TabsTrigger>
            </TabsList>

            <TabsContent value="fase2" className="space-y-12 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 gap-12 max-w-6xl mx-auto">
                {/* Plate: FREE (Top) */}
                <Card className="corner-card bg-black/60 border-primary/30 relative overflow-visible">
                  <div className="absolute -top-3 left-6 bg-primary text-black px-4 py-1 font-display text-[9px] font-black uppercase tracking-widest">Lado Libre (FREE SIDE)</div>
                  <CardContent className="pt-10 pb-10">
                    <div className="grid grid-cols-3 gap-y-12 gap-x-8 items-center justify-items-center relative">
                      <div className="absolute inset-0 border border-primary/10 pointer-events-none" />
                      <PointInput plate="placa_free" point="nw" label="NW" />
                      <PointInput plate="placa_free" point="n" label="N" />
                      <PointInput plate="placa_free" point="ne" label="NE" />
                      <PointInput plate="placa_free" point="w" label="W" />
                      <PointInput plate="placa_free" point="center" label="EJE CL" />
                      <PointInput plate="placa_free" point="e" label="E" />
                      <PointInput plate="placa_free" point="sw" label="SW" />
                      <PointInput plate="placa_free" point="s" label="S" />
                      <PointInput plate="placa_free" point="se" label="SE" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-primary/20 flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono-tech text-white/40 uppercase">TIR Planeidad (Max - Min)</span>
                        <span className={cn(
                          "text-2xl font-mono-tech font-black",
                          topografia.placa_free.estado === 'Rechazado' ? "text-red-500 animate-pulse" : "text-emerald-500"
                        )}>
                          {topografia.placa_free.diff.toFixed(3)} mm
                        </span>
                      </div>
                      <Badge variant="outline" className={cn("rounded-none border-primary/20 uppercase text-[8px]", topografia.placa_free.estado === 'Rechazado' ? "text-red-500" : "text-primary")}>
                        {topografia.placa_free.estado}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Diagonals & Separation */}
                <div className="flex flex-col md:flex-row gap-8 justify-center items-center bg-primary/5 p-8 border-y border-primary/10 corner-card border-none">
                  <div className="flex items-center gap-4">
                    <Ruler className="text-primary w-5 h-5" />
                    <div className="flex flex-col gap-2">
                      <Label className="text-[8px] font-mono-tech uppercase text-primary/60">Separación L / R</Label>
                      <div className="flex gap-2">
                        <Input className="h-8 w-24 bg-black/60 border-primary/20 text-xs rounded-none font-mono-tech" placeholder="L (mm)" />
                        <Input className="h-8 w-24 bg-black/60 border-primary/20 text-xs rounded-none font-mono-tech" placeholder="R (mm)" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Maximize2 className="text-primary w-5 h-5" />
                    <div className="flex flex-col gap-2">
                      <Label className="text-[8px] font-mono-tech uppercase text-primary/60">Diagonales D1 / D2</Label>
                      <div className="flex gap-2">
                        <Input className="h-8 w-24 bg-black/60 border-primary/20 text-xs rounded-none font-mono-tech" placeholder="D1 (mm)" />
                        <Input className="h-8 w-24 bg-black/60 border-primary/20 text-xs rounded-none font-mono-tech" placeholder="D2 (mm)" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plate: FIXED (Bottom) */}
                <Card className="corner-card bg-black/60 border-primary/30 relative overflow-visible">
                  <div className="absolute -top-3 left-6 bg-primary text-black px-4 py-1 font-display text-[9px] font-black uppercase tracking-widest">Lado Fijo (FIXED SIDE)</div>
                  <CardContent className="pt-10 pb-10">
                    <div className="grid grid-cols-3 gap-y-12 gap-x-8 items-center justify-items-center relative">
                      <div className="absolute inset-0 border border-primary/10 pointer-events-none" />
                      <PointInput plate="placa_fixed" point="nw" label="NW" />
                      <PointInput plate="placa_fixed" point="n" label="N" />
                      <PointInput plate="placa_fixed" point="ne" label="NE" />
                      <PointInput plate="placa_fixed" point="w" label="W" />
                      <PointInput plate="placa_fixed" point="center" label="EJE CL" />
                      <PointInput plate="placa_fixed" point="e" label="E" />
                      <PointInput plate="placa_fixed" point="sw" label="SW" />
                      <PointInput plate="placa_fixed" point="s" label="S" />
                      <PointInput plate="placa_fixed" point="se" label="SE" />
                    </div>
                    <div className="mt-8 pt-6 border-t border-primary/20 flex justify-between items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono-tech text-white/40 uppercase">TIR Planeidad (Max - Min)</span>
                        <span className={cn(
                          "text-2xl font-mono-tech font-black",
                          topografia.placa_fixed.estado === 'Rechazado' ? "text-red-500 animate-pulse" : "text-emerald-500"
                        )}>
                          {topografia.placa_fixed.diff.toFixed(3)} mm
                        </span>
                      </div>
                      <Badge variant="outline" className={cn("rounded-none border-primary/20 uppercase text-[8px]", topografia.placa_fixed.estado === 'Rechazado' ? "text-red-500" : "text-primary")}>
                        {topografia.placa_fixed.estado}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Approval Hold Points (HP) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pb-20">
                {form.fases.fase2.map((item: any) => (
                  <Card key={item.item_id} className={cn("corner-card bg-black/40 border-primary/20", item.is_hold_point ? "border-amber-500/40" : "")}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono-tech text-primary/40 uppercase">ID: {item.item_id}</span>
                        {item.is_hold_point && <Badge className="bg-amber-500 text-black text-[7px] uppercase rounded-none px-2">Hold Point</Badge>}
                      </div>
                      <h3 className="text-[11px] font-display font-bold text-white uppercase leading-tight">{item.descripcion}</h3>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        {item.tipo_respuesta === "checkbox_boolean" ? (
                          <div className="flex items-center gap-3">
                            <Checkbox checked={item.cumple} onCheckedChange={(val) => handleUpdateItem('fase2', item.item_id, { cumple: !!val })} />
                            <Label className="text-[9px] uppercase font-mono-tech text-muted-foreground">Validado</Label>
                          </div>
                        ) : null}
                        {item.is_hold_point && (
                          <div className="flex flex-col items-end gap-2 w-full">
                            {item.signed_by ? (
                              <div className="text-right">
                                <p className="text-[7px] font-mono-tech text-emerald-500 uppercase italic">Firmado por:</p>
                                <p className="text-[9px] font-display font-black text-emerald-400 uppercase">{item.signed_by}</p>
                              </div>
                            ) : (
                              <Button 
                                onClick={() => { setCurrentHPItem(`fase2|${item.item_id}`); setIsSupervisorModalOpen(true); }}
                                className="bg-amber-500 hover:bg-amber-600 text-black h-8 px-4 font-display text-[8px] uppercase w-full rounded-none"
                              >
                                Autorizar Punto de Espera
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {['fase1', 'fase3', 'fase4'].map((faseKey) => (
              <TabsContent key={faseKey} value={faseKey} className="animate-in fade-in slide-in-from-top-2 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(form.fases as any)[faseKey].map((item: any) => (
                    <Card key={item.item_id} className="corner-card bg-black/40 border-primary/20">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono-tech text-primary/40 uppercase">Punto {item.item_id}</span>
                          <Button onClick={() => triggerPhotoUpload(faseKey, item.item_id)} variant="ghost" size="icon" className="h-8 w-8 text-primary/40 hover:text-primary"><Camera className="w-4 h-4" /></Button>
                        </div>
                        <h3 className="text-xs font-display font-bold text-white uppercase">{item.descripcion}</h3>
                        <div className="flex items-center gap-4 pt-2">
                          {item.tipo_respuesta === "checkbox_boolean" ? (
                            <div className="flex items-center gap-3">
                              <Checkbox checked={item.cumple} onCheckedChange={(val) => handleUpdateItem(faseKey, item.item_id, { cumple: !!val })} />
                              <Label className="text-[10px] uppercase font-mono-tech text-muted-foreground">Completado</Label>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 w-full">
                              <Label className="text-[8px] font-mono-tech uppercase text-primary/60">Lectura Instrumental (mm/ft)</Label>
                              <Input type="number" value={item.valor || ""} onChange={(e) => handleUpdateItem(faseKey, item.item_id, { valor: e.target.value, cumple: parseFloat(e.target.value) > 0 })} className="h-10 bg-black/40 border-primary/10 font-mono-tech rounded-none" />
                            </div>
                          )}
                        </div>
                        {item.evidencia_foto_url?.length > 0 && (
                          <div className="flex gap-2 pt-4">
                            {item.evidencia_foto_url.map((url: string, idx: number) => (
                              <div key={idx} className="relative w-16 h-16 border border-primary/20 cursor-pointer hover:border-primary transition-all p-1 bg-black" onClick={() => setViewPhotoUrl(url)}>
                                <Image src={url} alt="Evidencia" fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>

      <Dialog open={isSupervisorModalOpen} onOpenChange={setIsSupervisorModalOpen}>
        <DialogContent className="bg-[#020617] border-amber-500/40 rounded-none max-w-sm p-8">
          <DialogHeader><DialogTitle className="text-amber-500 uppercase font-display text-sm tracking-widest text-center">Firma Digital de Autoridad</DialogTitle></DialogHeader>
          <div className="py-8 text-center space-y-6">
             <div className="h-32 border border-dashed border-amber-500/20 bg-black/60 flex flex-col items-center justify-center text-[8px] font-mono-tech text-amber-500/60 uppercase p-4 gap-2">
               <ShieldCheck className="w-8 h-8 opacity-20" />
               <p>{userData?.displayName || "MSC. ING. J. VALENCIA"}</p>
               <p className="text-[6px] tracking-widest">NEXUS_ROOT_STAMP_ACTIVE</p>
             </div>
             <p className="text-[9px] font-mono-tech text-muted-foreground uppercase leading-relaxed">Al firmar, usted certifica que la nivelación cumple con el estándar Metso (0.08mm TIR).</p>
          </div>
          <DialogFooter>
            <Button disabled={!canSignHP} onClick={handleSignHP} className="bg-amber-500 hover:bg-amber-600 text-black uppercase font-display text-[10px] w-full h-12 rounded-none tracking-widest">Validar Protocolo Metso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="max-w-4xl bg-black border-primary/20 rounded-none p-0 overflow-hidden">
          <div className="relative aspect-video w-full">{viewPhotoUrl && <Image src={viewPhotoUrl} alt="Vista Previa" fill className="object-contain" />}</div>
          <div className="p-4 bg-black border-t border-primary/20 flex justify-end"><Button onClick={() => setViewPhotoUrl(null)} className="text-[10px] font-display uppercase h-10 px-6 rounded-none bg-primary text-black">Cerrar Visor</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
