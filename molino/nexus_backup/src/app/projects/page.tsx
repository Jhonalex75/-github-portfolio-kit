"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, Trash2, Loader2, FileText, ShieldCheck, Eye,
  FileSpreadsheet, FileBox, FileSearch, FileArchive, Filter, X, ChevronDown,
  ClipboardList, CheckCircle2, Clock, AlertTriangle, Archive,
  Ruler, Zap, HardHat, Gauge, Wrench, Shield, FileQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCollection, useFirestore, useUser, useMemoFirebase, useDoc, useFirebaseApp,
} from "@/firebase";
import { collection, doc, setDoc, updateDoc, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { UploadDialog } from "@/components/ProjectDataUploadDialog";
import { ProjectDataDetailDialog } from "@/components/ProjectDataDetailDialog";
import {
  ProjectDocument, ProjectDocumentFormData, ProjectDataFilters, DEFAULT_FILTERS,
  DocumentType, Discipline, DocumentStatus,
  DOCUMENT_TYPE_LABELS, DISCIPLINE_LABELS, DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS, DISCIPLINE_COLORS,
  generateDocumentId, buildStoragePath, getFileExtension, formatFileSize,
} from "@/lib/project-data-types";

const OWNER_UID = "R3MVwE12nVMg128Kv6bdwJ6MKav1";
const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];

export default function ProjectDataPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const firebaseApp = useFirebaseApp();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [filters, setFilters] = useState<ProjectDataFilters>({ ...DEFAULT_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<(ProjectDocument & { id: string }) | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const isOwner = user?.uid === OWNER_UID ||
    (user?.email && OWNER_EMAILS.includes(user.email.toLowerCase())) ||
    userData?.role === "ROOT_MONITOR";

  // ──── FIRESTORE QUERY: project_data collection ────
  const projectDataQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "project_data");
  }, [firestore, user]);

  const { data: rawDocuments, isLoading } = useCollection<ProjectDocument>(projectDataQuery);

  // ──── CLIENT-SIDE FILTERING ────
  const filteredDocuments = useMemo(() => {
    if (!rawDocuments) return [];
    let docs = [...rawDocuments];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      docs = docs.filter((d) =>
        d.title?.toLowerCase().includes(term) ||
        d.document_id?.toLowerCase().includes(term) ||
        d.file_name?.toLowerCase().includes(term) ||
        d.tags?.some((t) => t.toLowerCase().includes(term)) ||
        d.related_equipment?.toLowerCase().includes(term)
      );
    }
    if (filters.documentType !== "all") {
      docs = docs.filter((d) => d.document_type === filters.documentType);
    }
    if (filters.discipline !== "all") {
      docs = docs.filter((d) => d.discipline === filters.discipline);
    }
    if (filters.status !== "all") {
      docs = docs.filter((d) => d.status === filters.status);
    }
    if (filters.projectCode) {
      docs = docs.filter((d) => d.project_code?.toLowerCase().includes(filters.projectCode.toLowerCase()));
    }

    // Sort by last_modified descending
    docs.sort((a, b) => {
      const da = new Date(a.last_modified || a.upload_date || 0).getTime();
      const db = new Date(b.last_modified || b.upload_date || 0).getTime();
      return db - da;
    });

    return docs;
  }, [rawDocuments, filters]);

  // ──── KPI STATS ────
  const stats = useMemo(() => {
    if (!rawDocuments) return { total: 0, borrador: 0, en_revisión: 0, aprobado: 0, obsoleto: 0 };
    return {
      total: rawDocuments.length,
      borrador: rawDocuments.filter((d) => d.status === "borrador").length,
      en_revisión: rawDocuments.filter((d) => d.status === "en_revisión").length,
      aprobado: rawDocuments.filter((d) => d.status === "aprobado").length,
      obsoleto: rawDocuments.filter((d) => d.status === "obsoleto").length,
    };
  }, [rawDocuments]);

  const activeFiltersCount = [
    filters.documentType !== "all",
    filters.discipline !== "all",
    filters.status !== "all",
    !!filters.projectCode,
  ].filter(Boolean).length;

  // ──── UPLOAD HANDLER — Registro garantizado en Firestore + Storage opcional ────
  const handleUploadDocument = async (formData: ProjectDocumentFormData, file: File) => {
    if (!firestore || !user) return;
    setIsUploading(true);

    try {
      const existingIds = rawDocuments?.map((d) => d.document_id) || [];
      const documentId = formData.document_id || generateDocumentId(
        formData.document_type, formData.discipline, existingIds
      );

      const storagePath = buildStoragePath(
        formData.project_code, formData.document_type, documentId, formData.revision, file.name
      );

      const now = new Date().toISOString();
      const tags = formData.tags ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

      toast({
        title: "⬆ REGISTRANDO DOCUMENTO",
        description: `Catalogando ${file.name} en Bóveda Documental...`,
      });

      // ── PASO 1 (GARANTIZADO): Registrar en Firestore primero ──
      // El documento aparece en la tabla inmediatamente, con download_url vacío.
      const newDocRef = doc(collection(firestore, "project_data"));

      const newDocument: ProjectDocument = {
        document_id: documentId,
        project_code: formData.project_code,
        project_name: formData.project_name,
        client: formData.client,
        contractor: formData.contractor,
        document_type: formData.document_type,
        title: formData.title,
        revision: formData.revision,
        status: "borrador",
        discipline: formData.discipline,
        tags,
        uploaded_by: userData?.displayName || user.displayName || "Engineer",
        uploaded_by_uid: user.uid,
        upload_date: now,
        last_modified: now,
        storage_path: storagePath,
        file_name: file.name,
        file_type: getFileExtension(file.name),
        file_size_kb: Math.round(file.size / 1024),
        download_url: "",          // Se actualiza si Storage funciona
        observations: formData.observations,
        related_equipment: formData.related_equipment,
        linked_documents: [],
      };

      await setDoc(newDocRef, newDocument);

      // Log de creación
      await addDoc(collection(firestore, "project_data", newDocRef.id, "logs"), {
        action: 'CREATED',
        user_name: userData?.displayName || user.displayName || "Engineer",
        user_uid: user.uid,
        timestamp: now,
        details: `Documento registrado en bóveda: ${file.name} (${formatFileSize(file.size)})`,
        new_status: 'borrador'
      });

      toast({
        title: "✅ DOCUMENTO REGISTRADO",
        description: `${documentId} catalogado. Subiendo archivo a Cloud Storage…`,
      });

      // ── PASO 2: Subida a Storage (necesaria para que otros usuarios puedan descargar) ──
      if (firebaseApp) {
        try {
          const { uploadProjectDocument } = await import("@/firebase/storage-utils");
          const uploadResult = await Promise.race([
            uploadProjectDocument(firebaseApp, file, storagePath),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Tiempo de espera de Storage (30 s)")), 30_000)
            ),
          ]);

          if (uploadResult.success && uploadResult.downloadUrl) {
            await updateDoc(newDocRef, {
              download_url: uploadResult.downloadUrl,
              storage_path: uploadResult.storagePath || storagePath,
              last_modified: new Date().toISOString(),
            });
            toast({
              title: "☁️ Archivo en la nube",
              description: `${documentId} — Listo para descarga por cualquier usuario registrado.`,
            });
          } else {
            await updateDoc(newDocRef, {
              download_url: "pending",
              last_modified: new Date().toISOString(),
            });
            toast({
              variant: "destructive",
              title: "No se pudo subir el archivo",
              description:
                uploadResult.error ||
                "Revise reglas de Storage, conexión y NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET en .env.local.",
            });
          }
        } catch (storageErr: unknown) {
          console.error("[ProjectData] Cloud Storage:", storageErr);
          const msg =
            storageErr instanceof Error ? storageErr.message : "Error desconocido de Storage";
          await updateDoc(newDocRef, {
            download_url: "pending",
            last_modified: new Date().toISOString(),
          }).catch(console.error);
          toast({
            variant: "destructive",
            title: "Error de almacenamiento",
            description: `${msg} Compruebe que Storage esté activo y que inicie sesión en la app.`,
          });
        }
      }

    } catch (err: any) {
      console.error("Firestore registration error:", err);
      toast({
        variant: "destructive",
        title: "ERROR DE REGISTRO",
        description: err?.message || "No se pudo registrar el documento en Firestore.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // ──── DOWNLOAD ────
  const handleDownload = (docItem: ProjectDocument & { id: string }) => {
    if (!docItem.download_url || docItem.download_url === "pending") {
      toast({
        variant: "destructive",
        title: "📁 ARCHIVO NO DISPONIBLE EN LA NUBE",
        description: `"${docItem.file_name}" está en la base de datos pero la subida a Storage falló o está pendiente. Vuelva a subir el archivo desde la app o revise la consola de Firebase (Storage y reglas).`,
      });
      return;
    }
    const link = document.createElement("a");
    link.href = docItem.download_url;
    link.download = docItem.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Log download asynchronously
    if (firestore && user) {
      addDoc(collection(firestore, "project_data", docItem.id, "logs"), {
        action: 'DOWNLOADED',
        user_name: userData?.displayName || user.displayName || "Engineer",
        user_uid: user.uid,
        timestamp: new Date().toISOString(),
        details: 'Document file downloaded to local machine'
      }).catch(console.error);
    }

    toast({ title: "DESCARGA INICIADA", description: `Recuperando ${docItem.document_id}...` });
  };

  // ──── MARK OBSOLETE ────
  const handleMarkObsolete = async (docItem: ProjectDocument & { id: string }) => {
    if (!firestore || !isOwner || !user) return;
    if (!confirm("¿Marcar este documento como OBSOLETO?")) return;
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(firestore, "project_data", docItem.id), {
        status: "obsoleto",
        last_modified: now,
      });

      // Audit Log
      await setDoc(doc(collection(firestore, "project_data", docItem.id, "logs")), {
        action: 'DOCUMENT_OBSOLETED',
        user_name: userData?.displayName || user.displayName || "Admin",
        user_uid: user.uid,
        timestamp: now,
        details: 'Admin marked document as deprecated (obsoleto)',
        previous_status: docItem.status,
        new_status: 'obsoleto'
      });

      toast({ title: "DOCUMENTO OBSOLETO", description: `${docItem.document_id} marcado como obsoleto.` });
    } catch {
      toast({ variant: "destructive", title: "ERROR", description: "No se pudo actualizar el status." });
    }
  };

  // ──── ICONS ────
  const getTypeIcon = (type: DocumentType) => {
    const icons: Record<DocumentType, React.ReactNode> = {
      procedimiento: <ClipboardList className="w-4 h-4 text-cyan-400" />,
      reporte: <FileText className="w-4 h-4 text-emerald-400" />,
      plano: <Ruler className="w-4 h-4 text-violet-400" />,
      registro_inspeccion: <FileSearch className="w-4 h-4 text-amber-400" />,
      memoria_calculo: <FileSpreadsheet className="w-4 h-4 text-blue-400" />,
      otro: <FileQuestion className="w-4 h-4 text-gray-400" />,
    };
    return icons[type] || <FileText className="w-4 h-4 text-primary" />;
  };

  const getDisciplineIcon = (disc: Discipline) => {
    const icons: Record<Discipline, React.ReactNode> = {
      mecánica: <Wrench className="w-3 h-3" />, piping: <Gauge className="w-3 h-3" />,
      civil: <HardHat className="w-3 h-3" />, eléctrica: <Zap className="w-3 h-3" />,
      instrumentación: <Gauge className="w-3 h-3" />, HSE: <Shield className="w-3 h-3" />,
      "QA/QC": <CheckCircle2 className="w-3 h-3" />, otro: <FileBox className="w-3 h-3" />,
    };
    return icons[disc] || null;
  };

  // ──── LOADING ────
  if (!isMounted || isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#0A0E14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-[10px] font-mono-tech text-primary/40 uppercase tracking-widest">Inicializando Bóveda Documental</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0E14]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-64px)] scrollbar-hide">
          {/* ──── HEADER ──── */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-primary/10 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-headline font-bold text-primary glow-cyan mb-1 uppercase tracking-tighter">
                Project Data
              </h1>
              <p className="text-muted-foreground font-mono-tech text-[10px] uppercase tracking-[0.2em]">
                Bóveda Documental Técnica — Gestión de Ingeniería
              </p>
            </div>
            <UploadDialog onSubmit={handleUploadDocument} isUploading={isUploading} />
          </header>

          {/* ──── KPI STATS ──── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, icon: <Archive className="w-4 h-4" />, color: "text-primary", bg: "bg-primary/5 border-primary/15" },
              { label: "Borrador", value: stats.borrador, icon: <Clock className="w-4 h-4" />, color: "text-amber-400", bg: "bg-amber-500/5 border-amber-500/15" },
              { label: "En Revisión", value: stats.en_revisión, icon: <AlertTriangle className="w-4 h-4" />, color: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/15" },
              { label: "Aprobado", value: stats.aprobado, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/15" },
              { label: "Obsoleto", value: stats.obsoleto, icon: <Archive className="w-4 h-4" />, color: "text-red-400", bg: "bg-red-500/5 border-red-500/15" },
            ].map((kpi) => (
              <div key={kpi.label} className={cn("border p-3 flex items-center gap-3 transition-all hover:scale-[1.02]", kpi.bg)}>
                <div className={cn(kpi.color)}>{kpi.icon}</div>
                <div>
                  <p className={cn("text-lg font-display font-bold", kpi.color)}>{kpi.value}</p>
                  <p className="text-[8px] font-mono-tech text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ──── SEARCH + FILTER TOOLBAR ──── */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input
                  placeholder="Buscar por título, ID, tags, equipo..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
                  className="bg-primary/5 border-primary/10 pl-10 h-10 rounded-none font-mono-tech text-xs tracking-wider"
                />
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "rounded-none h-10 border-primary/20 font-display text-[10px] uppercase tracking-widest gap-2",
                  showFilters ? "bg-primary/10 text-primary" : ""
                )}>
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 ml-1">{activeFiltersCount}</Badge>
                )}
                <ChevronDown className={cn("w-3 h-3 transition-transform", showFilters && "rotate-180")} />
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                  className="text-red-400 hover:text-red-300 text-[10px] font-display uppercase gap-1 h-10">
                  <X className="w-3 h-3" /> Limpiar
                </Button>
              )}
            </div>

            {/* ──── FILTER PANEL ──── */}
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-primary/[0.02] border border-primary/10 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-display uppercase tracking-widest text-primary/50">Tipo Documento</span>
                  <Select value={filters.documentType} onValueChange={(v) => setFilters((f) => ({ ...f, documentType: v as any }))}>
                    <SelectTrigger className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0E14] border-primary/20">
                      <SelectItem value="all" className="font-mono-tech text-xs">Todos</SelectItem>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-display uppercase tracking-widest text-primary/50">Disciplina</span>
                  <Select value={filters.discipline} onValueChange={(v) => setFilters((f) => ({ ...f, discipline: v as any }))}>
                    <SelectTrigger className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0E14] border-primary/20">
                      <SelectItem value="all" className="font-mono-tech text-xs">Todas</SelectItem>
                      {Object.entries(DISCIPLINE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-display uppercase tracking-widest text-primary/50">Status</span>
                  <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}>
                    <SelectTrigger className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0E14] border-primary/20">
                      <SelectItem value="all" className="font-mono-tech text-xs">Todos</SelectItem>
                      {Object.entries(DOCUMENT_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="font-mono-tech text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-display uppercase tracking-widest text-primary/50">Código Proyecto</span>
                  <Input value={filters.projectCode}
                    onChange={(e) => setFilters((f) => ({ ...f, projectCode: e.target.value }))}
                    className="bg-primary/5 border-primary/10 rounded-none font-mono-tech text-xs h-9"
                    placeholder="AMM_OC_20000" />
                </div>
              </div>
            )}
          </div>

          {/* ──── DOCUMENTS TABLE ──── */}
          <Card className="corner-card bg-primary/[0.02] border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-primary/10">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-primary">
                  Índice Documental
                </CardTitle>
                <Badge variant="outline" className="text-[9px] font-mono-tech border-primary/20 text-primary/50">
                  {filteredDocuments.length} de {rawDocuments?.length || 0}
                </Badge>
              </div>
              <Badge variant="outline" className={cn(
                "border-primary/30 text-primary font-mono-tech text-[10px]",
                isOwner ? "border-amber-500/50 text-amber-500" : ""
              )}>
                {isOwner && <ShieldCheck className="w-3 h-3 mr-2" />}
                {isOwner ? "ROOT_OVERRIDE" : "ENGINEER"}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="border-primary/10">
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[110px]">Doc ID</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase">Título</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[100px]">Tipo</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[100px]">Disciplina</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[60px]">Rev.</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[90px]">Status</TableHead>
                      <TableHead className="text-[9px] font-mono-tech uppercase w-[80px]">Tamaño</TableHead>
                      <TableHead className="text-right text-[9px] font-mono-tech uppercase w-[120px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20">
                          <Loader2 className="animate-spin mx-auto text-primary w-8 h-8 opacity-40" />
                        </TableCell>
                      </TableRow>
                    ) : filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-20">
                          <div className="space-y-3">
                            <Archive className="w-10 h-10 mx-auto text-primary/20" />
                            <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-[0.2em]">
                              {rawDocuments?.length ? "Sin resultados para estos filtros" : "Bóveda documental vacía"}
                            </p>
                            <p className="text-[10px] text-primary/30 font-mono-tech">
                              Use &quot;Registrar Documento&quot; para agregar el primer archivo técnico
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredDocuments.map((docItem) => {
                      const statusStyle = DOCUMENT_STATUS_COLORS[docItem.status] || DOCUMENT_STATUS_COLORS.borrador;
                      // Only show syncing spinner when url is literally the sentinel value "pending"
                      const isSyncing = docItem.download_url === "pending";
                      return (
                        <TableRow key={docItem.id}
                          className="border-primary/5 hover:bg-primary/5 group transition-colors cursor-pointer"
                          onClick={() => { setSelectedDoc(docItem); setDetailOpen(true); }}>
                          <TableCell>
                            <Badge variant="outline" className="text-[9px] font-mono-tech border-primary/20 text-primary/80 px-2">
                              {docItem.document_id}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTypeIcon(docItem.document_type)}
                              <div className="min-w-0">
                                <p className="text-xs font-display text-white/90 truncate max-w-[250px]">{docItem.title}</p>
                                {docItem.related_equipment && (
                                  <p className="text-[9px] font-mono-tech text-orange-400/50 flex items-center gap-1 mt-0.5">
                                    <Wrench className="w-2.5 h-2.5" />{docItem.related_equipment}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] text-muted-foreground font-mono-tech">
                            {DOCUMENT_TYPE_LABELS[docItem.document_type]}
                          </TableCell>
                          <TableCell>
                            <div className={cn("flex items-center gap-1.5 text-[10px] font-mono-tech", DISCIPLINE_COLORS[docItem.discipline])}>
                              {getDisciplineIcon(docItem.discipline)}
                              {DISCIPLINE_LABELS[docItem.discipline]}
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] font-mono-tech text-primary/70 font-bold">
                            {docItem.revision}
                          </TableCell>
                          <TableCell>
                            {isSyncing ? (
                              <div className="flex items-center gap-1.5 text-cyan-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[9px] font-mono-tech uppercase">Sync</span>
                              </div>
                            ) : (
                              <Badge className={cn(
                                "text-[9px] font-display uppercase border px-2 py-0",
                                statusStyle.bg, statusStyle.text, statusStyle.border
                              )}>
                                {DOCUMENT_STATUS_LABELS[docItem.status]}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px] font-mono-tech text-muted-foreground">
                            {formatFileSize(docItem.file_size_kb * 1024)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10"
                                onClick={() => { setSelectedDoc(docItem); setDetailOpen(true); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10"
                                disabled={isSyncing}
                                onClick={() => handleDownload(docItem)}>
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              {/* ── Status Change Dropdown ── */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-primary/60 hover:text-primary hover:bg-primary/10">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#0A0E14] border-primary/20 min-w-[160px]">
                                  <DropdownMenuLabel className="text-[9px] font-mono-tech text-primary/50 uppercase tracking-widest">
                                    Cambiar Estado
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-primary/10" />
                                  {([
                                    { value: "borrador", label: "📝 Borrador", color: "text-amber-400" },
                                    { value: "en_revisión", label: "🔍 En Revisión", color: "text-blue-400" },
                                    { value: "aprobado", label: "✅ Aprobado", color: "text-emerald-400" },
                                    { value: "devuelto", label: "↩ Devuelto (NC)", color: "text-orange-400" },
                                    { value: "obsoleto", label: "🗄 Obsoleto", color: "text-red-400" },
                                  ] as const).map((s) => (
                                    <DropdownMenuItem
                                      key={s.value}
                                      disabled={docItem.status === s.value}
                                      className={cn("font-mono-tech text-[11px] cursor-pointer", s.color, docItem.status === s.value && "opacity-40")}
                                      onClick={async () => {
                                        if (!firestore || !user) return;
                                        const now = new Date().toISOString();
                                        try {
                                          await updateDoc(doc(firestore, "project_data", docItem.id), {
                                            status: s.value,
                                            last_modified: now,
                                          });
                                          await addDoc(collection(firestore, "project_data", docItem.id, "logs"), {
                                            action: 'STATUS_CHANGED',
                                            user_name: userData?.displayName || user.displayName || "Engineer",
                                            user_uid: user.uid,
                                            timestamp: now,
                                            details: `Estado cambiado: ${docItem.status} → ${s.value}`,
                                            previous_status: docItem.status,
                                            new_status: s.value,
                                          });
                                          toast({ title: "STATUS ACTUALIZADO", description: `${docItem.document_id} → ${s.label}` });
                                        } catch (err) {
                                          toast({ variant: "destructive", title: "ERROR", description: "No se pudo cambiar el estado." });
                                        }
                                      }}
                                    >
                                      {s.label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {isOwner && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/50 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => handleMarkObsolete(docItem)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* ──── DETAIL MODAL ──── */}
      <ProjectDataDetailDialog document={selectedDoc} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
