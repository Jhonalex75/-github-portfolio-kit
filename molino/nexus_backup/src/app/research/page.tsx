
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Download, 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  Upload, 
  BookOpen, 
  Trash2, 
  CheckSquare, 
  Square, 
  X, 
  AlertTriangle,
  Info,
  Terminal
} from "lucide-react";
import { researchDocQA, type ResearchDocQAOutput } from "@/ai/flows/research-doc-qa";
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

export default function ResearchPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [queryInput, setQueryInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ResearchDocQAOutput | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const docsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "research_documents"), orderBy("createdAt", "desc"), limit(50));
  }, [firestore, user]);

  const { data: libraryDocs, isLoading: isLibraryLoading } = useCollection(docsQuery);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file || !firestore || !user) return;

    if (file.type !== "application/pdf") {
      setUploadError("SOLO PROTOCOLO PDF ADMITIDO.");
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setUploadError("EL ARCHIVO SUPERA EL LÍMITE ESTRUCTURAL DE 30MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const docData = {
        name: file.name,
        dataUri: reader.result as string,
        uploadedBy: user.uid,
        size: file.size,
        createdAt: new Date().toISOString()
      };
      addDocumentNonBlocking(collection(firestore, "research_documents"), docData);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = (dataUri: string, fileName: string) => {
    try {
      const byteString = atob(dataUri.split(',')[1]);
      const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Fallo en la reconstrucción del binario:", e);
      alert("Error al reconstruir el archivo para descarga.");
    }
  };

  const handleResearch = async () => {
    if (!queryInput.trim() || !libraryDocs) return;
    setLoading(true);
    setReport(null);

    try {
      const docsToAnalyze = libraryDocs
        .filter(d => selectedDocs.includes(d.id))
        .map(d => d.dataUri);

      const contextDocs = docsToAnalyze.length > 0 
        ? docsToAnalyze 
        : libraryDocs.slice(0, 3).map(d => d.dataUri);

      if (contextDocs.length === 0) {
        alert("LA BIBLIOTECA ESTÁ VACÍA. CARGUE NORMAS PARA ANALIZAR.");
        setLoading(false);
        return;
      }

      const result = await researchDocQA({
        question: queryInput,
        pdfDataUris: contextDocs
      });
      setReport(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm("¿CONFIRMA LA ELIMINACIÓN PERMANENTE DE ESTA NORMA?")) {
      deleteDocumentNonBlocking(doc(firestore, "research_documents", id));
      setSelectedDocs(prev => prev.filter(item => item !== id));
    }
  };

  if (!mounted || isUserLoading || !user || user.isAnonymous) {
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
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase">Research Intelligence</h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">Sincronización de Normas Técnicas & Análisis de IA</p>
            </div>
            <div className="flex gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="application/pdf"
                onChange={handleFileUpload} 
              />
              <Button 
                onClick={() => setIsLibraryOpen(true)}
                className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-none h-11 px-6 font-display text-[10px] uppercase tracking-widest"
              >
                <BookOpen className="w-4 h-4 mr-2" /> Ver Biblioteca Central
              </Button>
              <Button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-none h-11 px-6 font-display text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.3)]"
              >
                <Upload className="w-4 h-4 mr-2" /> Cargar PDF (30MB)
              </Button>
            </div>
          </header>

          {uploadError && (
            <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-mono-tech uppercase flex items-center gap-3 animate-in shake-1">
              <AlertTriangle className="w-4 h-4" />
              {uploadError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="corner-card bg-primary/[0.02] border-primary/20">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                      <Input 
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        placeholder="CONSULTE A LA IA SOBRE LAS NORMAS TÉCNICAS CARGADAS..." 
                        className="bg-black/40 border-primary/10 pl-12 h-14 rounded-none font-mono-tech text-sm focus-visible:ring-primary/40"
                        onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                      />
                    </div>
                    <Button 
                      onClick={handleResearch}
                      disabled={loading || !queryInput.trim() || !libraryDocs?.length}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground h-14 px-8 rounded-none font-display text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                    >
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5 mr-2" />}
                      ANALIZAR
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {loading && (
                <div className="h-[400px] flex flex-col items-center justify-center space-y-6 bg-primary/5 border border-primary/10 rounded-none animate-pulse">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="text-primary font-display text-xs tracking-[0.3em] uppercase">SINCROZINANDO CON EL NÚCLEO NEXUS...</p>
                  </div>
                </div>
              )}

              {report && (
                <Card className="corner-card bg-white/[0.02] border-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <CardHeader className="border-b border-primary/10">
                    <CardTitle className="text-xl font-display font-black text-primary glow-cyan uppercase">Resumen de Investigación Estratégica</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <div className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-body text-sm border-l-2 border-primary/20 pl-6 italic">
                      {report.answer}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <aside className="space-y-6">
              <div className="p-6 bg-primary/5 border border-primary/10 corner-card">
                <div className="flex items-center gap-3 text-primary mb-4">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-display font-bold uppercase tracking-widest">Protocolo Operativo</span>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Terminal className="w-4 h-4 text-primary shrink-0 mt-1" />
                    <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono-tech">
                      <span className="text-primary font-bold">BASE DE DATOS:</span> Los documentos se fragmentan y guardan en el núcleo Firestore vinculado a su ID de Monitor.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Download className="w-4 h-4 text-primary shrink-0 mt-1" />
                    <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono-tech">
                      <span className="text-primary font-bold">RECUPERACIÓN:</span> La descarga reconstruye el binario desde Base64 para garantizar integridad del 100%.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-1" />
                    <p className="text-[9px] text-muted-foreground leading-relaxed uppercase font-mono-tech">
                      <span className="text-primary font-bold">IA CONTEXTUAL:</span> Las respuestas solo se basan en los documentos seleccionados o los 3 más recientes.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
            <DialogContent className="max-w-4xl bg-[#020617] border-primary/20 rounded-none p-0 overflow-hidden">
              <div className="corner-card h-full border-none">
                <DialogHeader className="p-8 border-b border-primary/10 bg-black/40 text-left">
                  <div className="flex justify-between items-center w-full">
                    <div>
                      <DialogTitle className="text-2xl font-display font-black text-primary glow-cyan uppercase tracking-widest">Biblioteca Central de Normas</DialogTitle>
                      <p className="text-[9px] font-mono-tech text-muted-foreground uppercase mt-1">Gestión de activos técnicos vinculados a su nodo</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsLibraryOpen(false)} className="text-primary/40 hover:text-primary">
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                </DialogHeader>

                <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
                  {isLibraryLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {libraryDocs?.map((docItem) => (
                        <div 
                          key={docItem.id} 
                          className={cn(
                            "group p-4 border transition-all duration-300 relative bg-black/40",
                            selectedDocs.includes(docItem.id) 
                              ? "border-primary/60 shadow-[0_0_15px_rgba(0,229,255,0.1)]" 
                              : "border-white/5 hover:border-primary/30"
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <button 
                              onClick={() => toggleDocSelection(docItem.id)}
                              className={cn(
                                "mt-1 transition-colors",
                                selectedDocs.includes(docItem.id) ? "text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                            >
                              {selectedDocs.includes(docItem.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-display font-bold text-foreground/90 truncate uppercase tracking-tight">
                                {docItem.name}
                              </p>
                              <p className="text-[8px] font-mono-tech text-muted-foreground mt-1 uppercase">
                                {(docItem.size / 1024 / 1024).toFixed(2)} MB • {new Date(docItem.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleDownload(docItem.dataUri, docItem.name)}
                                className="p-2 bg-primary/5 border border-primary/10 hover:bg-primary/20 text-primary transition-colors"
                                title="Descargar Binario"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteDoc(docItem.id)}
                                className="p-2 bg-red-500/5 border border-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                title="Eliminar del Nodo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-8 border-t border-primary/10 bg-black/40 flex justify-end">
                  <Button 
                    onClick={() => setIsLibraryOpen(false)}
                    className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 rounded-none h-10 px-8 font-display text-[10px] uppercase tracking-widest"
                  >
                    Ocultar Biblioteca
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
