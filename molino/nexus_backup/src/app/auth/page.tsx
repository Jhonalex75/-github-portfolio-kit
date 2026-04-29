
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { doc } from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from "firebase/auth";

const OWNER_UID = "R3MVwE12nVMg128Kv6bdwJ6MKav1";
const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];

function formatProfName(raw: string): string {
  const upper = raw.toUpperCase().trim();
  if (!upper) return '';
  return upper.startsWith('ING.') ? upper : `ING. ${upper}`;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profesionalName, setProfesionalName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (user && !user.isAnonymous) {
      router.push("/");
    }
  }, [user, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        
        const userRef = doc(firestore, "users", userCredential.user.uid);
        const isRoot = userCredential.user.uid === OWNER_UID || OWNER_EMAILS.includes(email.toLowerCase());
        
        const profName = isRoot
          ? 'MSC. ING. JHON ALEXANDER VALENCIA MARULANDA'
          : formatProfName(profesionalName || displayName);

        setDocumentNonBlocking(userRef, {
          id: userCredential.user.uid,
          displayName: displayName,
          email: email.toLowerCase(),
          role: isRoot ? "ROOT_MONITOR" : "ENGINEER",
          specialty: isRoot ? "System Monitor • Root Authority" : "Mechanical Engineer",
          profesionalName: profName,
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
      router.push("/");
    } catch (err: unknown) {
      const authErr = err as { code?: string };
      console.error("Auth Protocol Failure:", authErr.code);
      let message = "FALLO EN EL PROTOCOLO DE AUTENTICACIÓN.";
      
      if (authErr.code === 'auth/email-already-in-use') {
        message = "EL CORREO YA ESTÁ REGISTRADO.";
      } else if (
        authErr.code === 'auth/wrong-password' || 
        authErr.code === 'auth/user-not-found' || 
        authErr.code === 'auth/invalid-credential' ||
        authErr.code === 'auth/invalid-password'
      ) {
        message = "CREDENCIALES INVÁLIDAS. ACCESO DENEGADO.";
      } else if (authErr.code === 'auth/weak-password') {
        message = "CÓDIGO DE ACCESO DÉBIL (MIN 6 CARACTERES).";
      } else if (authErr.code === 'auth/invalid-email') {
        message = "FORMATO DE CORREO INVÁLIDO.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <Card className="w-full max-w-md corner-card bg-black/40 backdrop-blur-xl border-primary/20 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-sm border-2 border-primary/40 flex items-center justify-center text-primary bg-primary/5 glow-border">
              <Hexagon className="w-10 h-10 fill-primary/10" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display font-black tracking-widest text-primary uppercase glow-cyan">
            {isLogin ? "Identificación" : "Registro"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400 rounded-none animate-in shake-1">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-[9px] font-mono-tech uppercase">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {!isLogin && (
              <>
                <Input
                  placeholder="NOMBRE COMPLETO"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-primary/5 border-primary/20 h-12 rounded-none font-mono-tech text-xs tracking-widest uppercase"
                  required
                />
                <div className="space-y-1">
                  <Input
                    placeholder="NOMBRES Y APELLIDOS (para documentos)"
                    value={profesionalName}
                    onChange={(e) => setProfesionalName(e.target.value.toUpperCase())}
                    onBlur={(e) => setProfesionalName(formatProfName(e.target.value))}
                    className="bg-primary/5 border-cyan-500/20 h-12 rounded-none font-mono-tech text-xs tracking-widest uppercase"
                  />
                  <p className="text-[8px] font-mono text-cyan-500/40 uppercase tracking-widest px-1">
                    Nombre Profesional — aparecerá como ING. [NOMBRE] en reportes y documentos
                  </p>
                </div>
              </>
            )}
            <Input 
              type="email"
              placeholder="EMAIL@INSTITUTION.EDU" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-primary/5 border-primary/20 h-12 rounded-none font-mono-tech text-xs tracking-widest"
              required
            />
            <Input 
              type="password"
              placeholder="CÓDIGO DE ACCESO" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-primary/5 border-primary/20 h-12 rounded-none font-mono-tech text-xs tracking-widest"
              required
            />
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 rounded-none font-display text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(0,229,255,0.3)]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? "Entrar" : "Registrar")}
            </Button>
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-[9px] font-mono-tech text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors block mx-auto">
              {isLogin ? "¿Nuevo nodo? Regístrate" : "¿Ya tienes acceso? Identifícate"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
