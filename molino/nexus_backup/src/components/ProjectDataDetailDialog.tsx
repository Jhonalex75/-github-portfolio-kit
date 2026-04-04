"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ExternalLink, Tag, Wrench, LinkIcon, FileText, Activity, Clock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ProjectDocument, DOCUMENT_TYPE_LABELS, DISCIPLINE_LABELS,
  DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, DISCIPLINE_COLORS,
  formatFileSize, AuditLog, DocumentStatus, // added DocumentStatus
} from "@/lib/project-data-types";
import { useFirestore, useUser } from "@/firebase"; // Added useUser
import { collection, doc as firestoreDoc, getDocs, orderBy, query, updateDoc, addDoc } from "firebase/firestore"; // Added updateDoc, addDoc
import { useNonConformities } from "@/hooks/useNonConformities";
import { NcDialog } from "@/components/NcDialog";
import { useToast } from "@/hooks/use-toast";

interface DetailDialogProps {
  document: (ProjectDocument & { id: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectDataDetailDialog({ document: doc, open, onOpenChange }: DetailDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { createNc } = useNonConformities();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isNcDialogOpen, setIsNcDialogOpen] = useState(false);

  useEffect(() => {
    if (open && doc?.id && firestore) {
      setLoadingLogs(true);
      getDocs(query(collection(firestore, "project_data", doc.id, "logs"), orderBy("timestamp", "desc")))
        .then(snapshot => {
          setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
        })
        .catch(console.error)
        .finally(() => setLoadingLogs(false));
    } else if (!open) {
      setLogs([]);
    }
  }, [open, doc?.id, firestore]);

  if (!doc) return null;

  const statusStyle = DOCUMENT_STATUS_COLORS[doc.status] || DOCUMENT_STATUS_COLORS.borrador;

  const handleNcCreated = async (data: any) => {
    if (!doc || !firestore || !user) return false;
    const ncId = await createNc(data);
    if (!ncId) return false;

    try {
      const docRef = firestoreDoc(firestore, "project_data", doc.id);
      await updateDoc(docRef, { status: "devuelto" });
      
      const newLog: Omit<AuditLog, "id"> = { 
        action: "RECHAZO CON NC",
        details: `Se registró Hallazgo/NC: ${ncId}. Motivo: ${data.title}`,
        user_name: user?.displayName || "Sistema",
        user_uid: user?.uid || "system",
        timestamp: new Date().toISOString(),
        new_status: "devuelto"
      };
      const logsRef = collection(firestore, "project_data", doc.id, "logs");
      await addDoc(logsRef, newLog);
      
      toast({ title: "RECHAZADO", description: `Documento devuelto (${ncId})` });
      
      // Update local setLogs if it's open, but it's easier to just rely on re-fetching or closing
      return true;
    } catch(err) {
      console.error(err);
      return false;
    }
  };

  const handleDownload = () => {
    if (!doc.download_url || doc.download_url === "pending") return;
    const link = document.createElement("a");
    link.href = doc.download_url;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const InfoRow = ({ label, value, className }: { label: string; value: string; className?: string }) => (
    <div className="flex items-start gap-3 py-2 border-b border-primary/5 last:border-0">
      <span className="text-[9px] font-display uppercase tracking-widest text-primary/40 w-32 shrink-0 pt-0.5">{label}</span>
      <span className={cn("text-xs font-mono-tech text-white/80 flex-1", className)}>{value || "—"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A0E14] border-primary/20 max-w-xl max-h-[85vh] overflow-y-auto scrollbar-hide">
        <DialogHeader className="border-b border-primary/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-primary font-display text-xs uppercase tracking-widest">
                {doc.document_id}
              </DialogTitle>
              <p className="text-[10px] font-mono-tech text-white/50 mt-1">{doc.title}</p>
            </div>
            <Badge className={cn("text-[9px] font-display uppercase", statusStyle.bg, statusStyle.text, statusStyle.border, statusStyle.glow)}>
              {DOCUMENT_STATUS_LABELS[doc.status]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-primary/5 rounded-none p-1 border border-primary/20">
            <TabsTrigger value="info" className="text-[10px] font-display uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none">
              Información
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-[10px] font-display uppercase data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-none flex items-center gap-2">
              <Activity className="w-3 h-3" /> Trazabilidad
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-1 pt-2">
            <InfoRow label="Proyecto" value={`${doc.project_code} — ${doc.project_name}`} />
            <InfoRow label="Cliente" value={doc.client} />
            <InfoRow label="Contratista" value={doc.contractor} />
            <InfoRow label="Tipo" value={DOCUMENT_TYPE_LABELS[doc.document_type]} />
            <InfoRow label="Disciplina" value={DISCIPLINE_LABELS[doc.discipline]} className={DISCIPLINE_COLORS[doc.discipline]} />
            <InfoRow label="Revisión" value={doc.revision} className="text-primary" />
            <InfoRow label="Archivo" value={`${doc.file_name} (${doc.file_type?.toUpperCase()}) — ${formatFileSize(doc.file_size_kb * 1024)}`} />
            <InfoRow label="Subido por" value={doc.uploaded_by} />
            <InfoRow label="Fecha subida" value={new Date(doc.upload_date).toLocaleString("es-CO")} />
            <InfoRow label="Última mod." value={new Date(doc.last_modified).toLocaleString("es-CO")} />

            {doc.related_equipment && (
              <div className="flex items-start gap-3 py-2 border-b border-primary/5">
                <span className="text-[9px] font-display uppercase tracking-widest text-primary/40 w-32 shrink-0 pt-0.5">Equipo</span>
                <div className="flex items-center gap-2">
                  <Wrench className="w-3 h-3 text-orange-400" />
                  <span className="text-xs font-mono-tech text-orange-400">{doc.related_equipment}</span>
                </div>
              </div>
            )}

            {doc.tags && doc.tags.length > 0 && doc.tags[0] !== "" && (
              <div className="flex items-start gap-3 py-2 border-b border-primary/5">
                <span className="text-[9px] font-display uppercase tracking-widest text-primary/40 w-32 shrink-0 pt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] font-mono-tech border-primary/20 text-primary/60 px-2 py-0">
                      <Tag className="w-2 h-2 mr-1" />{tag.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {doc.linked_documents && doc.linked_documents.length > 0 && doc.linked_documents[0] !== "" && (
              <div className="flex items-start gap-3 py-2 border-b border-primary/5">
                <span className="text-[9px] font-display uppercase tracking-widest text-primary/40 w-32 shrink-0 pt-0.5">Vinculados</span>
                <div className="flex flex-wrap gap-1.5">
                  {doc.linked_documents.map((ld, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] font-mono-tech border-blue-500/20 text-blue-400/60 px-2 py-0">
                      <LinkIcon className="w-2 h-2 mr-1" />{ld}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {doc.observations && (
              <div className="mt-3 bg-primary/[0.03] border border-primary/10 p-3">
                <span className="text-[9px] font-display uppercase tracking-widest text-primary/40 block mb-2">Observaciones</span>
                <p className="text-[11px] font-mono-tech text-white/60 leading-relaxed">{doc.observations}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 w-full mt-4">
              <Button onClick={() => setIsNcDialogOpen(true)}
                variant="outline"
                className="flex-1 rounded-none h-11 border-red-500/20 text-red-500 hover:bg-red-500/10 font-display text-[10px] uppercase tracking-widest">
                <ShieldAlert className="w-4 h-4 mr-2" /> Rechazar (NC)
              </Button>
              <Button onClick={handleDownload}
                disabled={!doc.download_url || doc.download_url === "pending"}
                className="flex-1 rounded-none h-11 bg-primary text-primary-foreground font-display text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                <Download className="w-4 h-4 mr-2" /> Descargar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="pt-2">
            <ScrollArea className="h-[300px] w-full border border-primary/10 bg-primary/[0.02] p-4">
              {loadingLogs ? (
                <div className="text-center py-8 text-primary/50 text-xs font-mono-tech flex flex-col items-center">
                  <Activity className="w-6 h-6 animate-pulse mb-2" />
                  Cargando trazabilidad...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-primary/30 text-xs font-mono-tech">
                  No hay registros de trazabilidad.
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-4 border-l border-primary/20 pb-4 last:pb-0">
                      <div className="absolute w-2 h-2 bg-primary rounded-full -left-[4.5px] top-1.5 shadow-[0_0_5px_rgba(0,229,255,0.5)]" />
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-display uppercase text-primary/80 tracking-widest bg-primary/10 px-2 py-0.5 rounded-sm">
                          {log.action}
                        </span>
                        <span className="text-[9px] font-mono-tech text-primary/40 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(log.timestamp).toLocaleString("es-CO")}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-tech text-white/70 mt-2">{log.details}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/5">
                        <span className="text-[9px] font-display text-primary/50">Por: {log.user_name}</span>
                        {log.new_status && (
                          <span className="text-[9px] font-mono-tech text-primary/40">Status: {log.new_status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

      </DialogContent>
      <NcDialog 
        open={isNcDialogOpen} 
        onOpenChange={setIsNcDialogOpen} 
        onSubmit={handleNcCreated}
        initialData={{
          project_code: doc.project_code,
          related_document_id: doc.document_id,
          title: `Rechazo de documento ${doc.document_id}`,
          severity: "media",
          origin: "revision_documental"
        }}
      />
    </Dialog>
  );
}
