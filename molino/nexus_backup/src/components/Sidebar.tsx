
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardCheck,
  MessageSquare,
  Box,
  FolderOpen,
  Shield,
  Database,
  ShieldAlert,
  Camera,
  SearchCode,
  Sparkles,
  ClipboardList,
  CalendarDays,
  FileText,
  BookMarked,
  GalleryHorizontalEnd,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const OWNER_EMAILS = ["jhonalexandervm@outlook.com", "jhonalexanderv@gmail.com"];
const OWNER_FULL_NAME = "MSC. ING. Jhon Alexander Valencia Marulanda";
const OWNER_UID = "R3MVwE12nVMg128Kv6bdwJ6MKav1";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const isOwner = user?.uid === OWNER_UID || 
                  (user?.email && OWNER_EMAILS.includes(user.email.toLowerCase())) || 
                  userData?.role === "ROOT_MONITOR";
  
  const navItems = [
    { name: "Nexus Dashboard", icon: LayoutDashboard, href: "/" },
    { name: "Quality No Conformances", icon: ShieldAlert, href: "/calidad" },
    { name: "QA/QC Soleplates", icon: ClipboardList, href: "/qa-qc" },
    { name: "Bitácora Senior", icon: ClipboardCheck, href: "/bitacora" },
    { name: "Design Review AI", icon: Sparkles, href: "/design-review" },
    { name: "Communication Hub", icon: MessageSquare, href: "/chat" },
    { name: "Project Data", icon: FolderOpen, href: "/projects" },
    { name: "Research Center", icon: SearchCode, href: "/research" },
    { name: "PDT Schedule", icon: CalendarDays, href: "/pdt-schedule" },
    { name: "Reportes Diarios", icon: FileText, href: "/daily-reports" },
    { name: "Informe Semanal", icon: BarChart3, href: "/weekly-report" },
    { name: "Galería de Campo", icon: GalleryHorizontalEnd, href: "/fotos-campo" },
    { name: "Biblioteca de Planos", icon: BookMarked, href: "/planos" },
  ];

  const finalPhotoURL = userData?.photoURL || user?.photoURL;
  const finalDisplayName = userData?.displayName || user?.displayName || (isOwner ? OWNER_FULL_NAME : "Engineer");

  return (
    <aside className="w-64 border-r border-primary/10 bg-[#020617] flex flex-col h-[calc(100vh-64px)] overflow-y-auto scrollbar-hide">
      <div className={cn(
        "p-6 border-b transition-all duration-500",
        isOwner ? "bg-amber-500/[0.05] border-amber-500/30" : "bg-primary/[0.02] border-primary/10"
      )}>
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative group">
            <div className={cn(
              "w-24 h-24 rounded-sm border-2 p-0.5 overflow-hidden transition-all duration-700 flex items-center justify-center bg-slate-900",
              isOwner ? "border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.5)]" : "border-primary/30"
            )}>
              <Avatar className="w-full h-full rounded-none">
                {finalPhotoURL && <AvatarImage src={finalPhotoURL} className="object-cover h-full w-full" />}
                <AvatarFallback className={cn("rounded-none font-display", isOwner ? "bg-amber-500/20 text-amber-500" : "bg-slate-900 text-primary")}>
                  {isOwner ? <ShieldAlert className="w-12 h-12" /> : (finalDisplayName[0])}
                </AvatarFallback>
              </Avatar>
              <Link href="/settings" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-amber-500">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[7px] font-display uppercase tracking-widest text-center">SINCRONIZAR</span>
              </Link>
            </div>
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 border-2 border-background rounded-full",
              isOwner ? "bg-amber-500 animate-pulse" : (user && !user.isAnonymous ? "bg-emerald-500" : "bg-orange-500")
            )} />
          </div>
          <div className="text-center w-full">
            <h3 className={cn(
              "text-[11px] font-display font-bold tracking-tight uppercase leading-tight mb-2",
              isOwner ? "text-amber-400 glow-amber" : "text-primary"
            )}>
              {finalDisplayName}
            </h3>
            <p className="text-[8px] text-accent font-mono-tech tracking-widest font-black uppercase">
              {isOwner ? "ROOT MONITOR" : (userData?.role || (user && !user.isAnonymous ? "CERTIFIED ENGINEER" : "GUEST ACCESS"))}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-4 w-full px-4 py-3 text-[11px] font-display transition-all duration-300 group relative",
                isActive 
                  ? (isOwner ? "bg-amber-500/10 text-amber-500 border-l-2 border-amber-500" : "bg-primary/10 text-primary border-l-2 border-primary")
                  : "text-muted-foreground hover:bg-primary/5 hover:text-primary/80"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? (isOwner ? "text-amber-500" : "text-primary") : "text-muted-foreground/40")} />
              <span className="font-black tracking-widest uppercase">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
