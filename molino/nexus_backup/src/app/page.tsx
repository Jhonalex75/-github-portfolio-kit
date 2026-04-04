
"use client";
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/Navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/firebase";
import { 
  Monitor, 
  Activity, 
  Loader2,
  AlertCircle,
  Info,
  ShieldCheck,
  Zap,
  Layers,
  ShieldAlert,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNonConformities } from "@/hooks/useNonConformities";

const PHASES_METADATA = [
  {
    title: "NIVEL 1: CIMENTACIÓN",
    desc: "Obra civil de concreto estructural. Pedestales principales robustos según plano Metso.",
    spec: "Resistencia Concrete: 35MPa",
    tools: "Nivel Óptico, Topografía"
  },
  {
    title: "NIVEL 2: CHUMACERAS",
    desc: "Asentamiento de cojinetes hidrostáticos sobre las placas base. Inspección de patrón de contacto.",
    spec: "Contacto: >85% (Azul Prusia)",
    tools: "Galgas, Azul Prusia"
  },
  {
    title: "NIVEL 3: CUERPO DEL MOLINO",
    desc: "Descenso concéntrico del Shell con tapas cónicas (Heads) sobre las chumaceras.",
    spec: "Concentricidad: ±0.005\"",
    tools: "Grúas Dual Lift"
  },
  {
    title: "NIVEL 4: CORONA (GIRTH GEAR)",
    desc: "Acoplamiento de la corona a la brida diametral del molino. Centrado absoluto obligatorio.",
    spec: "Runout Axial: <0.015\"",
    tools: "Tensionadores Hidráulicos"
  },
  {
    title: "NIVEL 5: TREN DE POTENCIA",
    desc: "Alineación Motor -> Reductor (Rojo) -> Piñón. Engrane final con la corona.",
    spec: "Backlash: 0.030\" - 0.045\"",
    tools: "Alineador Láser, Galgas"
  }
];

export default function NexusDashboard() {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const [fase, setFase] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [progreso, setProgreso] = useState(0);
  const [lotes, setLotes] = useState<THREE.Mesh[][]>([]);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const { ncs, fetchNcs } = useNonConformities();

  // Protocolo de Blindaje: Redirección si no hay usuario
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  // SGC: Cargar NCs al montar
  useEffect(() => { if (user) fetchNcs(); }, [user, fetchNcs]);

  useEffect(() => {
    if (!mountRef.current || !user) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    
    const camera = new THREE.PerspectiveCamera(40, mountRef.current.clientWidth / mountRef.current.clientHeight, 1, 100000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(1000, 2000, 1000);
    scene.add(mainLight);

    const loader = new GLTFLoader();
    loader.load('/M001-101_Sag Mill Assembly 3D Model_R1_InfoOnly.glb', 
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        camera.position.set(center.x + maxDim * 1.5, center.y + maxDim * 0.8, center.z + maxDim * 1.5);
        controls.target.copy(center);
        controls.update();

        const driveTrainMeshes: THREE.Mesh[] = [];
        const structuralMeshes: THREE.Mesh[] = [];

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.userData.originalPos = mesh.position.clone();
            mesh.visible = false;
            mesh.position.y += maxDim * 0.5;

            const name = (mesh.name || "").toLowerCase();
            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);
            
            const isPotencia = 
              Math.abs(worldPos.z - center.z) > size.z * 0.15 || 
              Math.abs(worldPos.x - center.x) > size.x * 0.3 ||
              name.includes('motor') || 
              name.includes('reductor') || 
              name.includes('gearbox') ||
              name.includes('guard') ||
              name.includes('drive');

            if (isPotencia) driveTrainMeshes.push(mesh);
            else structuralMeshes.push(mesh);
          }
        });

        structuralMeshes.sort((a, b) => a.userData.originalPos.y - b.userData.originalPos.y);

        const tempLotes: THREE.Mesh[][] = [];
        const itemsPerLote = Math.floor(structuralMeshes.length / 4);
        for (let i = 0; i < 4; i++) {
          const start = itemsPerLote * i;
          const end = i === 3 ? structuralMeshes.length : itemsPerLote * (i + 1);
          tempLotes.push(structuralMeshes.slice(start, end));
        }
        tempLotes.push(driveTrainMeshes);

        setLotes(tempLotes);
        scene.add(model);
        setCargando(false);
        activarLote(0, tempLotes);
      },
      (xhr) => {
        if (xhr.total > 0) setProgreso(Math.round((xhr.loaded / xhr.total) * 100));
      },
      () => {
        setErrorCarga("ERROR_IO: MODELO NO DETECTADO EN /PUBLIC");
        setCargando(false);
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => { 
      window.removeEventListener('resize', handleResize);
      renderer.dispose(); 
    };
  }, [user]);

  const activarLote = (index: number, currentLotes: THREE.Mesh[][]) => {
    if (!currentLotes[index]) return;
    currentLotes[index].forEach((mesh) => {
      mesh.visible = true;
      gsap.to(mesh.position, {
        y: mesh.userData.originalPos.y,
        duration: 3,
        ease: "power2.inOut",
        onStart: () => {
          if (mesh.material && 'emissive' in mesh.material) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mesh.material as any).emissive = new THREE.Color(0x00ffff);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mesh.material as any).emissiveIntensity = 0.5;
          }
        },
        onComplete: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (mesh.material && 'emissive' in mesh.material) (mesh.material as any).emissiveIntensity = 0;
        }
      });
    });
  };

  const manejarSiguienteFase = () => {
    if (fase >= 4) return;
    const nuevaFase = fase + 1;
    setFase(nuevaFase);
    activarLote(nuevaFase, lotes);
  };

  if (isUserLoading || !user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const currentMeta = PHASES_METADATA[fase];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-start pointer-events-none">
            <div className="pointer-events-auto">
              <h1 className="text-2xl font-display font-black tracking-widest text-primary glow-cyan uppercase italic">Nexus Command Center</h1>
              <p className="text-[9px] font-mono-tech text-white/40 uppercase tracking-[0.2em]">BIM 4D Unificado • MSC. ING. J. Valencia</p>
            </div>
            
            <Card className="bg-black/80 border-primary/20 backdrop-blur-xl h-12 flex items-center px-4 rounded-none border-l-4 border-l-primary pointer-events-auto">
              <span className="text-[10px] font-mono-tech text-primary mr-3 uppercase tracking-widest">Protocolo:</span>
              <span className="text-[10px] font-display font-bold text-white uppercase">
                {cargando ? `SINCRO: ${progreso}%` : "SISTEMA ONLINE"}
              </span>
            </Card>
          </div>

          <div ref={mountRef} className="flex-1 bg-black" />

          {errorCarga && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-8">
              <Card className="max-w-md bg-red-950/40 border-red-500/50 backdrop-blur-xl rounded-none p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-display font-black text-red-500 uppercase mb-2">Fallo de Comunicación</h3>
                <p className="text-xs font-mono-tech text-red-200/60 uppercase leading-relaxed">
                  Archivo GLB no detectado. Verifique integridad del activo técnico.
                </p>
              </Card>
            </div>
          )}

          <div className="absolute left-6 bottom-6 w-96 z-30 space-y-4">
            <Card className="corner-card bg-black/90 border-primary/40 backdrop-blur-xl">
              <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-display font-black uppercase text-primary flex items-center gap-2 tracking-widest">
                  <Monitor className="w-3 h-3" /> Maniobra 4D
                </CardTitle>
                <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">NIVEL {fase + 1}/5</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-xs font-display font-bold text-white uppercase">{currentMeta.title}</h3>
                  <div className="flex gap-3 bg-primary/5 p-3 border-l-2 border-primary">
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] font-mono-tech text-white/70 uppercase leading-relaxed">
                      {currentMeta.desc}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-2 border border-white/5">
                      <span className="text-[7px] text-muted-foreground uppercase block mb-1">Criterio QA/QC</span>
                      <span className="text-[9px] font-display font-bold text-primary">{currentMeta.spec}</span>
                    </div>
                    <div className="bg-white/5 p-2 border border-white/5">
                      <span className="text-[7px] text-muted-foreground uppercase block mb-1">Instrumental</span>
                      <span className="text-[9px] font-mono-tech text-white/60">{currentMeta.tools}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={manejarSiguienteFase}
                  disabled={cargando || fase >= 4}
                  className="w-full bg-[#FF4500] hover:bg-[#FF6347] text-white rounded-none font-display text-[9px] uppercase tracking-widest h-11 shadow-[0_0_20px_rgba(255,69,0,0.4)]"
                >
                  {fase >= 4 ? "MONTAJE FINALIZADO" : "EJECUTAR SIGUIENTE MANIOBRA >"}
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-5 gap-1">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className={cn(
                  "h-1 transition-all duration-700",
                  fase >= i - 1 ? "bg-primary shadow-[0_0_10px_#00E5FF]" : "bg-white/10"
                )} />
              ))}
            </div>
          </div>

          <div className="absolute right-6 top-24 w-72 space-y-4 pointer-events-none">
            <Card className="bg-black/80 border-primary/10 backdrop-blur-md p-4 space-y-4">
              <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-2 mb-2">
                <Activity className="w-3 h-3" />
                <span className="text-[8px] font-display font-bold uppercase tracking-widest">Secuencia BIM</span>
              </div>
              <div className="space-y-2 pointer-events-auto">
                {PHASES_METADATA.map((p, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 p-2 border transition-all text-[8px] font-mono-tech uppercase",
                      idx === fase 
                        ? "bg-primary/20 border-primary text-primary" 
                        : idx < fase 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 opacity-80" 
                          : "bg-black/40 border-white/5 text-muted-foreground opacity-30"
                    )}
                  >
                    {idx < fase ? <ShieldCheck className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                    <span className="flex-1 font-black truncate">{p.title.split(':')[1]}</span>
                    {idx === fase && <Zap className="w-2 h-2 animate-pulse text-primary" />}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Quality SGC Widget (bottom-right) ── */}
          <div className="absolute right-6 bottom-6 w-72 z-30 pointer-events-auto">
            <Card className="bg-black/90 border-red-500/20 backdrop-blur-xl rounded-none">
              <CardHeader className="p-3 border-b border-red-500/10 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[9px] font-display font-black uppercase tracking-widest text-red-500">SGC — Control de Calidad</span>
                </div>
                <Link href="/calidad">
                  <Button size="sm" variant="ghost" className="h-6 px-2 rounded-none hover:bg-red-500/10 text-red-500/60 hover:text-red-400">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-3">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Abiertas", value: ncs.filter(n => n.status === "abierto").length, color: "text-red-400" },
                    { label: "En Proceso", value: ncs.filter(n => n.status === "en_proceso").length, color: "text-blue-400" },
                    { label: "Cerradas", value: ncs.filter(n => n.status === "cerrado").length, color: "text-emerald-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/[0.02] border border-white/5 p-2 text-center">
                      <p className={`text-xl font-display font-bold ${color}`}>{value}</p>
                      <p className="text-[7px] font-mono-tech text-white/30 uppercase">{label}</p>
                    </div>
                  ))}
                </div>
                {ncs.filter(n => n.status === "abierto" && n.severity === "crítica").length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 animate-pulse">
                    <ShieldAlert className="w-3 h-3 text-red-500 flex-shrink-0" />
                    <span className="text-[8px] font-display uppercase tracking-widest text-red-400">
                      {ncs.filter(n => n.status === "abierto" && n.severity === "crítica").length} NC Crítica(s) pendiente(s)
                    </span>
                  </div>
                )}
                {ncs.length === 0 && (
                  <p className="text-[9px] font-mono-tech text-white/20 text-center py-2">Sin hallazgos registrados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
