
'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

interface ThreeSceneProps {
  currentStep: number;
}

export function ThreeScene({ currentStep }: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const groupsRef = useRef<{ [key: number]: THREE.Group }>({});
  
  const [loadingStatus, setLoadingStatus] = useState<string>("SINCROZINANDO NÚCLEO 3D...");
  const [isLoaded, setIsLoaded] = useState(false);

  // La ruta / apunta a la carpeta public de Next.js
  const MODEL_PATH = "/M001-101_Sag Mill Assembly 3D Model_R1_InfoOnly.glb";

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 1, 5000);
    camera.position.set(350, 250, 450);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    sunLight.position.set(200, 400, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    scene.add(sunLight);

    const rimLight = new THREE.PointLight(0x00E5FF, 1.2);
    rimLight.position.set(-200, 200, -200);
    scene.add(rimLight);

    for (let i = 0; i <= 5; i++) {
      const group = new THREE.Group();
      groupsRef.current[i] = group;
      scene.add(group);
    }

    createHighFidelityFallback();

    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        setLoadingStatus("ACTIVO REAL DETECTADO. INTEGRANDO GEOMETRÍA GLB...");
        
        Object.values(groupsRef.current).forEach(g => {
          while(g.children.length > 0) g.remove(g.children[0]);
        });

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = child.receiveShadow = true;
            const mat = child.material as THREE.MeshStandardMaterial;
            if(mat) {
              mat.metalness = 0.8;
              mat.roughness = 0.35;
              mat.color.set(0x94a3b8);
            }
            
            const box = new THREE.Box3().setFromObject(child);
            const center = new THREE.Vector3();
            box.getCenter(center);
            
            let phase = 3; 
            if (center.y < 15) phase = 0; 
            else if (center.y < 30) phase = 1;
            else if (center.y < 45) phase = 2;
            else if (center.z > 90 || center.x > 120) phase = 5;
            else if (child.name.toLowerCase().includes('gear') || child.name.toLowerCase().includes('corona')) phase = 4;

            const clone = child.clone();
            clone.userData.originalY = clone.position.y;
            groupsRef.current[phase].add(clone);
          }
        });
        finalize();
      },
      (xhr) => {
        const progress = Math.round((xhr.loaded / xhr.total) * 100);
        setLoadingStatus(`PROCESANDO BINARIO: ${progress}%`);
      },
      (error) => {
        console.warn("MODELO GLB NO ENCONTRADO EN /public/. UTILIZANDO GEMELO DIGITAL DE RESPALDO.");
        finalize();
      }
    );

    function createHighFidelityFallback() {
      const concrete = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
      const steel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
      const bearings = new THREE.MeshStandardMaterial({ color: 0x8A2BE2, metalness: 0.9, roughness: 0.2 });
      const gear = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 1, roughness: 0.2 });

      const p1 = new THREE.Mesh(new THREE.BoxGeometry(70, 60, 80), concrete);
      p1.position.set(-110, 30, 0); p1.castShadow = true;
      const p2 = p1.clone(); p2.position.x = 110;
      groupsRef.current[0].add(p1, p2);

      const pl1 = new THREE.Mesh(new THREE.BoxGeometry(60, 5, 70), new THREE.MeshStandardMaterial({color: 0x00E5FF, metalness: 0.9}));
      pl1.position.set(-110, 62.5, 0);
      const pl2 = pl1.clone(); pl2.position.x = 110;
      groupsRef.current[1].add(pl1, pl2);

      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 40, 32), bearings);
      b1.rotation.z = Math.PI/2; b1.position.set(-110, 85, 0);
      const b2 = b1.clone(); b2.position.x = 110;
      groupsRef.current[2].add(b1, b2);

      const shell = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 180, 64), steel);
      shell.rotation.z = Math.PI/2; shell.position.y = 110;
      const head1 = new THREE.Mesh(new THREE.CylinderGeometry(30, 60, 40, 64), steel);
      head1.rotation.z = Math.PI/2; head1.position.set(-110, 110, 0);
      const head2 = head1.clone(); head2.rotation.z = -Math.PI/2; head2.position.x = 110;
      groupsRef.current[3].add(shell, head1, head2);

      const corona = new THREE.Mesh(new THREE.TorusGeometry(62, 8, 16, 100), gear);
      corona.rotation.y = Math.PI/2; corona.position.y = 110;
      groupsRef.current[4].add(corona);

      const mBase = new THREE.Mesh(new THREE.BoxGeometry(60, 50, 70), concrete);
      mBase.position.set(0, 25, 160);
      const motor = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 50), new THREE.MeshStandardMaterial({color: 0x22c55e, metalness: 0.9}));
      motor.position.set(0, 65, 160);
      groupsRef.current[5].add(mBase, motor);

      Object.values(groupsRef.current).forEach(g => {
        g.children.forEach(c => c.userData.originalY = c.position.y);
      });
    }

    function finalize() {
      Object.entries(groupsRef.current).forEach(([idxStr, group]) => {
        const idx = parseInt(idxStr);
        if (idx > 0) {
          group.visible = false;
          group.position.y = 100;
        }
      });
      setIsLoaded(true);
      setLoadingStatus("SISTEMA OPERATIVO.");
    }

    const animate = () => {
      requestAnimationFrame(animate);
      if (controlsRef.current) controlsRef.current.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    Object.entries(groupsRef.current).forEach(([idxStr, group]) => {
      const idx = parseInt(idxStr);
      if (idx <= currentStep) {
        group.visible = true;
        if (idx === currentStep && group.position.y > 0) {
          gsap.to(group.position, { 
            y: 0, 
            duration: 3, 
            ease: "power2.inOut",
            onStart: () => {
              group.traverse(child => {
                if (child instanceof THREE.Mesh && child.material) {
                  child.material.emissive = new THREE.Color(0x00E5FF);
                  child.material.emissiveIntensity = 0.3;
                }
              });
            },
            onComplete: () => {
              group.traverse(child => {
                if (child instanceof THREE.Mesh && child.material) {
                  child.material.emissiveIntensity = 0;
                }
              });
            }
          });
        } else {
          group.position.y = 0;
        }
      } else {
        group.visible = false;
        group.position.y = 100;
      }
    });

    if (currentStep === 5 && cameraRef.current) {
      gsap.to(cameraRef.current.position, { x: 300, y: 150, z: 400, duration: 2 });
    }
  }, [currentStep, isLoaded]);

  return (
    <div className="relative w-full h-full bg-[#020617] overflow-hidden min-h-[500px]">
      <div ref={containerRef} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] z-50">
          <div className="text-primary font-display text-sm animate-pulse mb-4 uppercase tracking-[0.2em]">
            {loadingStatus}
          </div>
          <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-loading" />
          </div>
        </div>
      )}
    </div>
  );
}
