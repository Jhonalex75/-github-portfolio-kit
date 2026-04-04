
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, 
  Shield, 
  Paperclip, 
  Loader2, 
  Plus, 
  MessageSquare, 
  X,
  Trash2,
  Download,
  FileText
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
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

const OWNER_UID = "R3MVwE12nVMg128Kv6bdwJ6MKav1";
const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];
const OWNER_FULL_NAME = "MSC. ING. Jhon Alexander Valencia Marulanda";

export default function ChatPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'image' | 'video' | 'file', name: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Protocolo de Blindaje: Redirección si no hay usuario o es anónimo
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

  const convsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, "conversations"), orderBy("createdAt", "desc"), limit(50));
  }, [firestore, user]);
  const { data: conversations } = useCollection(convsQuery);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !activeConvId) return null;
    return query(
      collection(firestore, "conversations", activeConvId, "messages"), 
      orderBy("createdAt", "asc"), 
      limit(200)
    );
  }, [firestore, user, activeConvId]);
  const { data: messages } = useCollection(messagesQuery);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCreateConversation = async () => {
    if (!newTopicTitle.trim() || !user || !firestore) return;
    
    const convData = {
      title: newTopicTitle.toUpperCase(),
      authorId: user.uid,
      authorName: isOwner ? OWNER_FULL_NAME : (userData?.displayName || user.displayName || "Engineer"),
      createdAt: new Date().toISOString(),
      lastMessage: "Salón de charla iniciado."
    };

    addDocumentNonBlocking(collection(firestore, "conversations"), convData);
    setNewTopicTitle("");
    toast({ title: "SALÓN CREADO", description: "Protocolo de charla activado." });
  };

  const handleDownloadChatLog = () => {
    if (!messages || messages.length === 0 || !activeConv) return;
    const logHeader = `NEXUS BITÁCORA - TEMA: ${activeConv.title}\nFECHA: ${new Date().toLocaleString()}\n--------------------------------\n\n`;
    const logBody = messages.map(msg => `[${new Date(msg.createdAt).toLocaleTimeString()}] ${msg.senderName}: ${msg.text || '(Archivo)'}`).join('\n');
    const blob = new Blob([logHeader + logBody], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitacora_${activeConv.title.replace(/\s+/g, '_')}.txt`;
    link.click();
    toast({ title: "BITÁCORA EXPORTADA", description: "Historial guardado localmente." });
  };

  const handleDeleteConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!firestore || !isOwner) return;
    if (confirm("¿CONFIRMA LA PURGA DEL SALÓN?")) {
      deleteDocumentNonBlocking(doc(firestore, "conversations", convId));
      if (activeConvId === convId) setActiveConvId(null);
      toast({ title: "SALÓN PURGADO", description: "Rastro eliminado del núcleo." });
    }
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!firestore || !activeConvId || !isOwner) return;
    deleteDocumentNonBlocking(doc(firestore, "conversations", activeConvId, "messages", msgId));
    toast({ title: "MENSAJE ELIMINADO", description: "Evidencia purgada." });
  };

  const handleDownloadMedia = (dataUri: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = fileName;
    link.click();
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({ variant: "destructive", title: "ADVERTENCIA", description: "Archivos > 1MB pueden fallar en Firestore." });
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        let type: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        setSelectedMedia({ url: reader.result as string, type, name: file.name });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessage = () => {
    if ((!inputValue.trim() && !selectedMedia) || !user || !firestore || !activeConvId) return;

    const messageData = {
      conversationId: activeConvId,
      senderId: user.uid,
      senderName: isOwner ? OWNER_FULL_NAME : (userData?.displayName || user.displayName || "Engineer"),
      senderAvatar: userData?.photoURL || user.photoURL || "",
      text: inputValue,
      mediaUrl: selectedMedia?.url || null,
      mediaType: selectedMedia?.type || 'none',
      fileName: selectedMedia?.name || null,
      createdAt: new Date().toISOString(),
    };

    addDocumentNonBlocking(collection(firestore, "conversations", activeConvId, "messages"), messageData);
    setInputValue("");
    setSelectedMedia(null);
  };

  if (!isMounted || isUserLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const filteredConvs = conversations?.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const activeConv = conversations?.find(c => c.id === activeConvId);

  return (
    <div className="flex flex-col min-h-screen bg-[#0b141a] text-foreground">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden bg-[#0b141a]">
          <aside className="w-96 border-r border-white/5 flex flex-col bg-[#111b21] z-10">
            <header className="p-4 bg-[#202c33] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display font-black text-primary uppercase tracking-widest">Salones de Charla</span>
              </div>
              <Input 
                placeholder="Buscar tema..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#2a3942] border-none text-xs rounded-lg"
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Nuevo salón..." 
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="bg-[#2a3942] border-none text-xs h-9"
                />
                <Button onClick={handleCreateConversation} size="icon" className="h-9 w-9 bg-primary"><Plus className="w-4 h-4 text-black" /></Button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    "w-full p-4 flex items-center gap-4 cursor-pointer border-b border-white/5 transition-colors",
                    activeConvId === conv.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-white truncate uppercase">{conv.title}</span>
                      {isOwner && <Trash2 className="w-3.5 h-3.5 text-red-500/40 hover:text-red-500" onClick={(e) => handleDeleteConversation(conv.id, e)} />}
                    </div>
                    <p className="text-[11px] text-white/40 truncate italic">{conv.lastMessage || "Abierto..."}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <section className="flex-1 flex flex-col overflow-hidden bg-[#0b141a]">
            {!activeConvId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Shield className="w-16 h-16 text-primary mb-4" />
                <h3 className="text-xl font-display font-black text-primary uppercase">NEXUS COMMUNICATION</h3>
              </div>
            ) : (
              <>
                <header className="px-6 py-3 bg-[#202c33] flex items-center justify-between border-l border-white/5">
                  <div className="flex items-center gap-4">
                    <h1 className="text-sm font-bold uppercase text-white">{activeConv?.title}</h1>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDownloadChatLog} className="text-[10px] uppercase text-primary">
                    <Download className="w-4 h-4 mr-2" /> Exportar Chat
                  </Button>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[70%] group", msg.senderId === user?.uid ? "ml-auto" : "mr-auto")}>
                      <div className={cn(
                        "p-3 rounded-lg border relative",
                        msg.senderId === user?.uid ? "bg-[#005c4b] border-white/10" : "bg-[#202c33] border-white/10"
                      )}>
                        <div className="text-[10px] font-bold text-primary mb-1">{msg.senderName}</div>
                        {msg.text && <p className="text-sm text-white">{msg.text}</p>}
                        {msg.mediaUrl && (
                          <div className="mt-2 rounded bg-black/20 p-2 border border-white/5">
                            {msg.mediaType === 'image' ? (
                              <div className="relative aspect-video"><Image src={msg.mediaUrl} alt="Img" fill className="object-contain" unoptimized /></div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <FileText className="w-8 h-8 text-primary" />
                                <span className="text-xs truncate max-w-[150px]">{msg.fileName}</span>
                                <Button size="icon" variant="ghost" onClick={() => handleDownloadMedia(msg.mediaUrl, msg.fileName || 'file')}><Download className="w-4 h-4" /></Button>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-2 opacity-40 text-[9px]">
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isOwner && <Trash2 className="w-3 h-3 text-red-500 cursor-pointer ml-2" onClick={() => handleDeleteMessage(msg.id)} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <footer className="p-4 bg-[#202c33] border-l border-white/5 space-y-2">
                  {selectedMedia && (
                    <div className="bg-[#2a3942] p-2 rounded flex justify-between items-center text-[10px] text-primary">
                      <span>DOC: {selectedMedia.name}</span>
                      <X className="w-4 h-4 cursor-pointer text-red-500" onClick={() => setSelectedMedia(null)} />
                    </div>
                  )}
                  <div className="flex items-center gap-3 max-w-5xl mx-auto">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleMediaSelect} />
                    <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-white/40"><Paperclip className="w-6 h-6" /></Button>
                    <Input 
                      value={inputValue} 
                      onChange={(e) => setInputValue(e.target.value)} 
                      placeholder="Transmisión técnica..." 
                      className="bg-[#2a3942] border-none text-sm h-11"
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} className="bg-primary rounded-full h-11 w-11 p-0"><Send className="w-5 h-5 text-black" /></Button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
