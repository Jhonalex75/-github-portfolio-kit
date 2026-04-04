
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Bell, 
  Settings,
  Hexagon,
  HelpCircle,
  LogIn,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";

const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];
const OWNER_FULL_NAME = "MSC. ING. Jhon Alexander Valencia Marulanda";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  // Obtener datos de Firestore para validar rol real y evitar suplantación
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  // Verificación ROOT blindada
  const isOwner = user?.email && OWNER_EMAILS.includes(user.email.toLowerCase());

  const handleSignOut = () => {
    if (auth) {
      signOut(auth).then(() => {
        router.push("/auth");
      });
    }
  };

  // Priorizar foto y nombre de Firestore para persistencia real
  const finalPhotoURL = userData?.photoURL || user?.photoURL;
  const finalDisplayName = userData?.displayName || user?.displayName || (isOwner ? OWNER_FULL_NAME : "Engineer");

  return (
    <header className="h-16 border-b border-primary/10 bg-[#020617] flex items-center px-6 sticky top-0 z-50 backdrop-blur-xl">
      <div className="flex items-center gap-4 mr-12">
        <div className={cn(
          "w-8 h-8 flex items-center justify-center border rounded-sm shadow-[0_0_15px_rgba(0,229,255,0.4)]",
          isOwner ? "border-amber-500 text-amber-500 shadow-amber-500/50" : "border-primary/40 text-primary"
        )}>
          {isOwner ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Hexagon className="w-5 h-5 fill-primary/10" />}
        </div>
        <div className="flex flex-col">
          <span className={cn(
            "font-display font-black text-sm tracking-[0.2em] uppercase",
            isOwner ? "text-amber-500 glow-amber" : "text-primary glow-cyan"
          )}>
            {isOwner ? "NEXUS_ROOT" : "ENG.INTEL_SYS"}
          </span>
          <span className="text-[7px] font-mono-tech text-muted-foreground tracking-[0.4em] uppercase">
            {isOwner ? "SYSTEM MONITOR OVERRIDE" : "Cybernetic Command v4.2"}
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-md relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
        <Input 
          className="bg-primary/5 border-primary/10 pl-10 h-10 rounded-none focus-visible:ring-primary/50 font-mono-tech text-xs tracking-wider" 
          placeholder="SEARCH TECHNICAL PARAMETERS..." 
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="p-2.5 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5 rounded-sm">
          <HelpCircle className="w-4 h-4" />
        </button>
        <button className="p-2.5 text-muted-foreground hover:text-primary transition-colors hover:bg-primary/5 rounded-sm relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        
        <div className="h-8 w-[1px] bg-primary/10 mx-2" />

        {!user || user.isAnonymous ? (
          <Link href="/auth">
            <Button className="bg-primary hover:bg-primary/80 text-primary-foreground h-9 px-6 rounded-none font-display font-bold text-[10px] tracking-widest uppercase shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <LogIn className="w-3.5 h-3.5 mr-2" /> Identify
            </Button>
          </Link>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/settings">
              <button className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </Link>
            <Button 
              variant="ghost" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-primary text-[10px] font-display uppercase tracking-widest p-0 h-auto"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <Avatar className={cn(
              "w-10 h-10 border-2 rounded-none p-0.5 transition-all duration-500 bg-slate-900",
              isOwner ? "border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.6)] scale-110" : "border-primary/20"
            )}>
              {finalPhotoURL && <AvatarImage src={finalPhotoURL} className="rounded-none object-cover" />}
              <AvatarFallback className={cn("rounded-none font-display text-[10px]", isOwner ? "bg-amber-500/20 text-amber-500" : "bg-slate-900")}>
                {isOwner ? <ShieldAlert className="w-6 h-6" /> : (finalDisplayName.slice(0, 2).toUpperCase())}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </header>
  );
}
