
"use client";

import { useState, useEffect, useMemo } from "react";
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
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  Wrench,
  Boxes,
  Filter,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import {
  FASTENER_INVENTORY,
  COMPONENTS_BOLAS_1624,
  COMPONENTS_SAG_2216,
  type FastenerItem,
  type ComponentItem,
} from "@/lib/mill-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const [searchFastener, setSearchFastener] = useState("");
  const [searchComponent, setSearchComponent] = useState("");
  const [activeTab, setActiveTab] = useState("fasteners");
  const [selectedMill, setSelectedMill] = useState<"1624" | "2216">("1624");

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const filteredFasteners = useMemo(() => {
    if (!searchFastener.trim()) return FASTENER_INVENTORY;
    const term = searchFastener.toLowerCase();
    return FASTENER_INVENTORY.filter(
      (f) =>
        f.aplicacion.toLowerCase().includes(term) ||
        f.equipo.toLowerCase().includes(term) ||
        f.tamano.toLowerCase().includes(term) ||
        f.material.toLowerCase().includes(term)
    );
  }, [searchFastener]);

  const currentComponents = selectedMill === "1624" ? COMPONENTS_BOLAS_1624 : COMPONENTS_SAG_2216;
  const filteredComponents = useMemo(() => {
    if (!searchComponent.trim()) return currentComponents;
    const term = searchComponent.toLowerCase();
    return currentComponents.filter(
      (c) =>
        c.componente.toLowerCase().includes(term) ||
        c.paginaIOM.toLowerCase().includes(term)
    );
  }, [searchComponent, currentComponents]);

  const totalFasteners = FASTENER_INVENTORY.reduce((sum, f) => sum + f.cantidad, 0);

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
              <h1 className="text-4xl font-display font-black tracking-widest text-primary glow-cyan mb-2 uppercase italic">
                Inventario Técnico
              </h1>
              <p className="text-muted-foreground font-mono-tech text-xs uppercase tracking-widest">
                Tornillería, Componentes y Materiales • Metso IOM C.4817
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="border-primary/30 text-primary py-1.5 px-4 font-mono-tech uppercase text-[10px]">
                <Wrench className="w-3 h-3 mr-2" /> {totalFasteners} ANCLAJES REGISTRADOS
              </Badge>
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 py-1.5 px-4 font-mono-tech uppercase text-[10px]">
                <Boxes className="w-3 h-3 mr-2" /> {currentComponents.length} COMPONENTES
              </Badge>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-primary/5 border border-primary/10 p-1 h-14 rounded-none w-full justify-start">
              <TabsTrigger value="fasteners" className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none tracking-widest">
                <Wrench className="w-3 h-3 mr-2" /> Tornillería Específica
              </TabsTrigger>
              <TabsTrigger value="components" className="data-[state=active]:bg-primary/20 px-8 font-display text-[9px] uppercase h-full rounded-none tracking-widest">
                <Boxes className="w-3 h-3 mr-2" /> Componentes de Montaje
              </TabsTrigger>
            </TabsList>

            {/* FASTENERS TAB */}
            <TabsContent value="fasteners" className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input
                  placeholder="FILTRAR TORNILLERÍA..."
                  value={searchFastener}
                  onChange={(e) => setSearchFastener(e.target.value)}
                  className="bg-primary/5 border-primary/10 pl-10 h-11 rounded-none font-mono-tech text-xs tracking-wider"
                />
              </div>

              <Card className="corner-card bg-primary/[0.02] border-primary/20">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="border-primary/10">
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Equipo</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Aplicación</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Uso</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary text-center">Cant.</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Tamaño (mm)</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Material</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFasteners.map((f, idx) => (
                        <TableRow key={idx} className="border-primary/5 hover:bg-primary/5 transition-colors">
                          <TableCell className="text-[10px] font-display text-primary/80 font-bold uppercase">{f.equipo}</TableCell>
                          <TableCell className="text-[10px] font-mono-tech text-white/70 uppercase">{f.aplicacion}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] rounded-none border-amber-500/20 text-amber-400 uppercase">{f.uso}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm font-display font-black text-primary">{f.cantidad || "—"}</TableCell>
                          <TableCell className="text-[10px] font-mono-tech text-white/60">{f.tamano}</TableCell>
                          <TableCell className="text-[10px] font-mono-tech text-white/60">{f.material}</TableCell>
                          <TableCell className="text-[9px] font-mono-tech text-white/40 max-w-[200px] truncate">{f.observaciones}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* COMPONENTS TAB */}
            <TabsContent value="components" className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-4 items-center">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                  <Input
                    placeholder="FILTRAR COMPONENTES..."
                    value={searchComponent}
                    onChange={(e) => setSearchComponent(e.target.value)}
                    className="bg-primary/5 border-primary/10 pl-10 h-11 rounded-none font-mono-tech text-xs tracking-wider"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedMill === "1624" ? "default" : "outline"}
                    onClick={() => setSelectedMill("1624")}
                    className={cn(
                      "h-11 rounded-none font-display text-[9px] uppercase tracking-widest px-6",
                      selectedMill === "1624"
                        ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                        : "border-primary/20 text-primary"
                    )}
                  >
                    Bolas 1624
                  </Button>
                  <Button
                    variant={selectedMill === "2216" ? "default" : "outline"}
                    onClick={() => setSelectedMill("2216")}
                    className={cn(
                      "h-11 rounded-none font-display text-[9px] uppercase tracking-widest px-6",
                      selectedMill === "2216"
                        ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        : "border-amber-500/20 text-amber-500"
                    )}
                  >
                    SAG 2216
                  </Button>
                </div>
              </div>

              <Card className="corner-card bg-primary/[0.02] border-primary/20">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="border-primary/10">
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary w-12">#</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Componente Mecánico</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Ref. IOM</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Estado</TableHead>
                        <TableHead className="text-[9px] font-mono-tech uppercase text-primary">Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredComponents.map((c, idx) => (
                        <TableRow key={idx} className="border-primary/5 hover:bg-primary/5 transition-colors">
                          <TableCell className="text-xs font-display font-bold text-primary/50">{c.item}</TableCell>
                          <TableCell className="text-[11px] font-display text-white/90 font-bold uppercase">{c.componente}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] border-primary/30 text-primary rounded-none uppercase font-mono-tech">
                              <BookOpen className="w-2.5 h-2.5 mr-1" /> {c.paginaIOM}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={c.estado === "Pendiente" ? "outline" : "default"}
                              className={cn(
                                "text-[8px] rounded-none uppercase",
                                c.estado === "Pendiente"
                                  ? "border-amber-500/20 text-amber-400"
                                  : "bg-emerald-500 text-black"
                              )}
                            >
                              {c.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[9px] font-mono-tech text-white/40 uppercase">{c.observaciones}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
