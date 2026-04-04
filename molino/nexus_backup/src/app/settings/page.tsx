
"use client";

import { useState, useRef, useEffect } from "react";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldAlert, Upload, Save, Loader2, User, Mail, ShieldCheck } from "lucide-react";
import { useUser, useAuth, useFirestore, setDocumentNonBlocking, useMemoFirebase, useDoc } from "@/firebase";
import { updateProfile } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];
const OWNER_FULL_NAME = "MSC. ING. Jhon Alexander Valencia Marulanda";

export default function SettingsPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtener datos de Firestore para validar rol real
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const isOwner = user?.email && OWNER_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    setIsMounted(true);
    if (user) {
      setDisplayName(userData?.displayName || user.displayName || (isOwner ? OWNER_FULL_NAME : ""));
      setPhotoURL(userData?.photoURL || user.photoURL || "");
    }
  }, [user, userData, isOwner]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "FORMATO INVÁLIDO",
          description: "Por favor seleccione un archivo de imagen válido.",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 512;
          const MAX_HEIGHT = 512;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotoURL(resizedDataUrl);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.currentUser || !firestore) return;
    setLoading(true);

    try {
      // Actualizar perfil de Auth (Solo Display Name)
      await updateProfile(auth.currentUser, {
        displayName: displayName || (isOwner ? OWNER_FULL_NAME : auth.currentUser.displayName),
      });

      // Sincronizar con Firestore (Persistencia Real)
      const userRef = doc(firestore, "users", auth.currentUser.uid);
      
      setDocumentNonBlocking(userRef, {
        id: auth.currentUser.uid,
        displayName: displayName || (isOwner ? OWNER_FULL_NAME : auth.currentUser.displayName),
        photoURL: photoURL,
        email: auth.currentUser.email?.toLowerCase(),
        role: isOwner ? "ROOT_MONITOR" : (userData?.role || "ENGINEER"),
        specialty: isOwner ? "System Monitor • Root Authority" : (userData?.specialty || "Mechanical Engineer"),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      toast({
        title: "SISTEMA SINCRONIZADO",
        description: isOwner 
          ? `Protocolo ROOT completado. Su identidad biométrica ha sido anclada.`
          : "Su perfil ha sido actualizado correctamente.",
      });
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "FALLO DE SEGURIDAD",
        description: "Hubo un problema al sincronizar su identidad con el núcleo.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || isUserLoading) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="space-y-2 border-b border-primary/10 pb-4">
              <h1 className={cn(
                "text-3xl font-display font-black tracking-widest uppercase",
                isOwner ? "text-amber-500 glow-amber" : "text-primary glow-cyan"
              )}>
                {isOwner ? "Configuración de Autoridad ROOT" : "Configuración de Perfil"}
              </h1>
              <h2 className="text-[10px] font-mono-tech uppercase tracking-[0.3em] text-muted-foreground">
                Gestión de credenciales y biometría digital
              </h2>
            </header>

            <Card className={cn(
              "corner-card border-primary/20 bg-black/40 backdrop-blur-md",
              isOwner ? "border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.05)]" : ""
            )}>
              <CardContent className="p-8 space-y-10">
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className={cn(
                      "w-48 h-48 rounded-sm border-2 p-1.5 overflow-hidden transition-all duration-700 flex items-center justify-center bg-slate-900 group",
                      isOwner ? "border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.4)]" : "border-primary/20"
                    )}>
                      <Avatar className="w-full h-full rounded-none">
                        <AvatarImage src={photoURL} className="object-cover" />
                        <AvatarFallback className="bg-slate-800 text-primary rounded-none flex flex-col items-center justify-center gap-2">
                          {isOwner ? (
                            <ShieldAlert className="w-16 h-16 text-amber-500 animate-pulse" />
                          ) : <User className="w-16 h-16" />}
                        </AvatarFallback>
                      </Avatar>
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white"
                      >
                        <Upload className="w-8 h-8 text-amber-500" />
                        <span className="text-[9px] font-display uppercase tracking-widest">Subir Biometría</span>
                      </button>
                    </div>
                    
                    {isOwner && (
                      <div className="absolute -top-3 -right-3 bg-amber-500 p-2 rounded-sm shadow-lg">
                        <ShieldCheck className="w-5 h-5 text-black" />
                      </div>
                    )}
                    
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                    />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className={cn("text-[11px] font-display uppercase tracking-[0.2em] font-black", isOwner ? "text-amber-500" : "text-primary")}>
                      {isOwner ? "Identificador de Biometría ROOT" : "Avatar de Usuario"}
                    </p>
                    <p className="text-[9px] text-muted-foreground font-mono-tech uppercase max-w-sm mx-auto leading-relaxed">
                      Sincronice su imagen oficial para que sea reconocida en todos los nodos de la red Nexus.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Nombre y Título Académico</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={isOwner ? OWNER_FULL_NAME : "NOMBRE COMPLETO"}
                        className={cn(
                          "bg-primary/5 border-primary/20 pl-12 h-14 rounded-none font-mono-tech text-sm uppercase tracking-widest focus-visible:ring-primary/40",
                          isOwner ? "text-amber-500 border-amber-500/30" : "text-foreground"
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-display uppercase tracking-widest text-primary/70">Nodo de Red Institucional</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input 
                        value={user?.email || ""}
                        disabled
                        className="bg-black/40 border-primary/10 pl-12 h-14 rounded-none font-mono-tech text-sm text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className={cn(
                      "w-full h-14 rounded-none font-display text-xs uppercase tracking-[0.3em] shadow-[0_0_25px] transition-all active:scale-[0.98]",
                      isOwner ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/40" : "bg-primary hover:bg-primary/80 text-primary-foreground shadow-primary/30"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-3" /> Sincronizar Identidad
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {isOwner && (
              <div className="p-6 bg-amber-500/5 border border-amber-500/20 flex gap-4 items-start animate-pulse">
                <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-[10px] font-display font-bold text-amber-500 uppercase tracking-widest">Protocolo de Blindaje Activo</h4>
                  <p className="text-[9px] text-muted-foreground font-mono-tech leading-relaxed uppercase">
                    Monitor, su identidad ha sido anclada a su correo institucional. Su biometría se mantendrá persistente en cada inicio de sesión.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
