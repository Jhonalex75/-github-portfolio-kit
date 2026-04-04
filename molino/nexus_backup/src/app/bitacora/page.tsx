
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Printer, 
  Trash2, 
  Loader2,
  History,
  Save,
  QrCode
} from "lucide-react";
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useDoc
} from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";

import { useToast } from "@/hooks/use-toast";

const OWNER_UID = "R3MVwE12nVMg128Kv6bdwJ6MKav1";
const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];

type ProtocolType = 'NIVELACION' | 'TORQUEO' | 'CHUMACERAS' | 'TREN_MANDO';

export default function BitacoraPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [protocolType] = useState<ProtocolType>('NIVELACION');

  const [protocolCode, setProtocolCode] = useState("QA-QC-BM-01");
  const [projectTag] = useState("90036109");
  const [instrumentSerial] = useState("MT-88452");
  const [calibrationDate] = useState("2026-12-31");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [ncrDetails] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [photos] = useState<any[]>([]);

  // Protocolo de Blindaje: Redirección si no hay usuario o es anónimo
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
  
  const isOwner = user?.email && OWNER_EMAILS.includes(user.email.toLowerCase()) || user?.uid === OWNER_UID || userData?.role === "ROOT_MONITOR";

  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "technical_logs"), orderBy("createdAt", "desc"), limit(100));
  }, [firestore, user]);
  const { data: logs } = useCollection(logsQuery);

  useEffect(() => {
    if (protocolType === 'NIVELACION') {
      setProtocolCode("QA-QC-BM-01");
      setMeasurements([
        { punto: "Esquina NE", nominal: 0.000, real: 0.000, tolerance: 0.05, status: "PENDIENTE" },
        { punto: "Esquina NW", nominal: 0.000, real: 0.000, tolerance: 0.05, status: "PENDIENTE" },
        { punto: "Centro", nominal: 0.000, real: 0.000, tolerance: 0.05, status: "PENDIENTE" },
        { punto: "Esquina SE", nominal: 0.000, real: 0.000, tolerance: 0.05, status: "PENDIENTE" },
        { punto: "Esquina SW", nominal: 0.000, real: 0.000, tolerance: 0.05, status: "PENDIENTE" }
      ]);
    } else if (protocolType === 'TORQUEO') {
      setProtocolCode("QA-QC-BM-02");
      setMeasurements(Array.from({ length: 8 }, (_, i) => ({
        punto: `Perno ${i + 1}`, nominal: 1200, real: 0, unit: "lb.ft", status: "PENDIENTE"
      })));
    } else if (protocolType === 'TREN_MANDO') {
      setProtocolCode("QA-QC-BM-05");
      setMeasurements([
        { punto: "Runout 0°", nominal: 0.38, real: 0, unit: "mm", status: "PENDIENTE" },
        { punto: "Runout 90°", nominal: 0.38, real: 0, unit: "mm", status: "PENDIENTE" },
        { punto: "Runout 180°", nominal: 0.38, real: 0, unit: "mm", status: "PENDIENTE" },
        { punto: "Runout 270°", nominal: 0.38, real: 0, unit: "mm", status: "PENDIENTE" }
      ]);
    }
  }, [protocolType]);

  const updateField = (idx: number, field: 'nominal' | 'real', inputVal: string) => {
    const val = inputVal === "" ? 0 : parseFloat(inputVal);
    const newMeas = [...measurements];
    newMeas[idx][field] = isNaN(val) ? 0 : val;
    
    const nominal = newMeas[idx].nominal;
    const real = newMeas[idx].real;
    const delta = Math.abs(real - nominal);
    newMeas[idx].delta = delta;
    
    if (protocolType === 'TREN_MANDO') {
      newMeas[idx].status = real <= nominal ? "OK" : "FAIL";
    } else {
      const tol = newMeas[idx].tolerance || 0.05;
      newMeas[idx].status = delta > tol ? "FAIL" : "OK";
    }
    setMeasurements(newMeas);
  };

  const calculateTIR = () => {
    if (!measurements || measurements.length === 0) return 0;
    const values = measurements.map(m => m.real);
    return Math.max(...values) - Math.min(...values);
  };

  const saveLog = () => {
    if (!user || !firestore) return;
    setLoading(true);
    
    const tir = calculateTIR();
    const hash = Math.random().toString(36).substring(2, 10).toUpperCase();

    const logData = {
      metadata: {
        protocolo_id: protocolCode,
        titulo: `PROTOCOLO CERTIFICADO - ${protocolType}`,
        equipo_tag: projectTag,
        fecha_inspeccion: new Date().toISOString(),
        inspector: userData?.displayName || user.displayName || "Ing. Jhon Alexander Valencia",
        estado: measurements.some(m => m.status === "FAIL") ? "NCR_ABIERTO" : "FINALIZADO",
        instrumento: instrumentSerial,
        vencimiento_calibracion: calibrationDate,
        crypto_hash: hash
      },
      protocol_type: protocolType,
      mediciones: {
        puntos: measurements,
        calculated_tir: tir
      },
      evidencia_digital: {
        fotos: photos,
        anotaciones_ncr: ncrDetails
      },
      authorId: user.uid,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(collection(firestore, "technical_logs"), logData);
    setIsCreating(false);
    setLoading(false);
    toast({ title: "DOSSIER ANCLADO", description: `Protocolo ${protocolCode} guardado exitosamente.` });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const printLog = (log: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>DOSSIER - ${log?.metadata?.protocolo_id || 'NEXUS-CERT'}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid black; padding: 8px; text-align: left; }
            .header { background: #f0f0f0; font-weight: bold; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">Dossier de Calidad - mm Standard</div>
          <table>
            <tr><td><strong>TAG:</strong> ${log?.metadata?.equipo_tag || "N/A"}</td><td><strong>FECHA:</strong> ${new Date(log?.metadata?.fecha_inspeccion || Date.now()).toLocaleDateString()}</td></tr>
            <tr><td><strong>PROTOCOLO:</strong> ${log?.metadata?.protocolo_id || "N/A"}</td><td><strong>ESTADO:</strong> ${log?.metadata?.estado || "N/A"}</td></tr>
          </table>
          <table>
            <thead><tr><th>Punto</th><th>Nominal (mm)</th><th>Real (mm)</th><th>Status</th></tr></thead>
            <tbody>
              ${(log?.mediciones?.puntos || []).map((m: Record<string, unknown>) => `
                <tr><td>${m.punto}</td><td>${m.nominal}</td><td>${m.real}</td><td>${m.status}</td></tr>
              `).join('')}
            </tbody>
          </table>
          <p>TIR: ${log?.mediciones?.calculated_tir?.toFixed(3) || '0.000'} mm</p>
          <p>HASH: ${log?.metadata?.crypto_hash || "N/A"}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
          <header className="border-b border-primary/10 pb-6 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase italic">Dossier Manager</h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">Protocolos Certificados • mm Standard</p>
            </div>
            {!isCreating && (
              <Button onClick={() => setIsCreating(true)} className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-none h-11 px-8 font-display text-[10px] uppercase tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Protocolo
              </Button>
            )}
          </header>

          {isCreating ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 pb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card className="corner-card bg-primary/[0.02] border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-primary/10 pb-4">
                      <CardTitle className="text-xs font-display font-black uppercase tracking-widest text-primary">Matriz QA/QC (mm): {protocolCode}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Table>
                        <TableHeader className="bg-primary/5">
                          <TableRow className="border-primary/10">
                            <TableHead className="text-[9px] uppercase text-primary">Punto</TableHead>
                            <TableHead className="text-[9px] uppercase text-primary">Nominal (mm)</TableHead>
                            <TableHead className="text-[9px] uppercase text-primary">Real (mm)</TableHead>
                            <TableHead className="text-[9px] uppercase text-primary">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {measurements.map((m, i) => (
                            <TableRow key={i} className="border-primary/5">
                              <TableCell className="text-[10px] font-mono-tech text-primary uppercase">{m.punto}</TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  value={m.nominal ?? ""} 
                                  onChange={e => updateField(i, 'nominal', e.target.value)} 
                                  className="h-8 text-[10px] bg-black/40 border-primary/20 w-24 rounded-none font-mono-tech" 
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  step="0.001" 
                                  value={m.real ?? ""} 
                                  onChange={e => updateField(i, 'real', e.target.value)} 
                                  className="h-8 text-[10px] bg-black/40 border-primary/20 w-24 rounded-none font-mono-tech" 
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant={m.status === 'OK' ? 'default' : m.status === 'FAIL' ? 'destructive' : 'outline'} className="text-[8px] px-1 rounded-none uppercase">
                                  {m.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 text-right">
                        <span className="text-[9px] font-display text-primary uppercase mr-4">TIR:</span>
                        <span className="text-lg font-mono-tech text-white font-bold">{calculateTIR().toFixed(3)} mm</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <aside className="space-y-6">
                  <Card className="corner-card bg-primary/[0.05] border-primary/30">
                    <CardHeader><CardTitle className="text-[10px] font-display font-black uppercase text-primary">Certificación</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={saveLog} disabled={loading} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 rounded-none font-display text-[10px] uppercase tracking-widest">
                        {loading ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Inmutar y Certificar</>}
                      </Button>
                      <Button variant="ghost" onClick={() => setIsCreating(false)} className="w-full text-[8px] font-display uppercase tracking-widest">Cancelar</Button>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <Card className="corner-card bg-primary/[0.01] border-primary/10">
                <CardHeader>
                  <CardTitle className="text-xs font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <History className="w-4 h-4" /> Archivo Maestro (mm)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="border-primary/10">
                        <TableHead className="text-[9px] uppercase">ID</TableHead>
                        <TableHead className="text-[9px] uppercase">Fase</TableHead>
                        <TableHead className="text-[9px] uppercase">TIR (mm)</TableHead>
                        <TableHead className="text-[9px] uppercase">Status</TableHead>
                        <TableHead className="text-right text-[9px] uppercase">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-[10px] uppercase">Bóveda vacía.</TableCell></TableRow>
                      ) : logs?.map((log) => (
                        <TableRow key={log.id} className="border-primary/5 hover:bg-primary/5 group">
                          <TableCell className="font-mono-tech text-xs text-primary/80 flex items-center gap-2">
                            <QrCode className="w-3 h-3" /> {log?.metadata?.crypto_hash?.substring(0, 8) || "N/A"}
                          </TableCell>
                          <TableCell className="text-[9px] font-mono-tech uppercase">{log?.protocol_type}</TableCell>
                          <TableCell className="text-[10px] font-mono-tech">{log?.mediciones?.calculated_tir?.toFixed(3) || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={log?.metadata?.estado === 'NCR_ABIERTO' ? "destructive" : "default"} className="text-[8px] rounded-none uppercase">
                              {log?.metadata?.estado || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => printLog(log)}><Printer className="w-4 h-4" /></Button>
                            {isOwner && (
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteDocumentNonBlocking(doc(firestore, "technical_logs", log.id))}><Trash2 className="w-4 h-4" /></Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
