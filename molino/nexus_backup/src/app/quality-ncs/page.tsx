'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  Search,
  Plus,
  Loader2,
  Camera,
  X,
  Save,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Eye,
  Wrench,
  FileText,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  ImageIcon,
  TrendingUp,
  CheckSquare,
  Pencil,
  History,
  Download,
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useStorage,
  useMemoFirebase,
  useCollection,
  useDoc,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  arrayUnion,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EQUIPOS_TECNICOS, WBS_GRUPOS, type EquipoTecnico } from '@/lib/equipment-data';
import Image from 'next/image';

// ─── Plan de Montaje — Tipos y datos estáticos ────────────────────────────────
type EtapaEstado = 'Pendiente' | 'En Proceso' | 'Completado';

interface HistorialEtapa {
  fecha: string;
  estado: EtapaEstado;
  responsable: string;
  observaciones: string;
  actualizadoPor: string;
}

interface EtapaMontaje {
  id?: string;
  numero_etapa: number;
  titulo: string;
  descripcion: string;
  peso_porcentual: number;
  estado: EtapaEstado;
  responsable: string;
  observaciones: string;
  historial?: HistorialEtapa[];
  partida_bmp?: string;
}

type PunchCategoria = 'A' | 'B' | 'C';
type PunchEstado = 'ABIERTO' | 'EN_GESTION' | 'CERRADO';

interface EvidenciaItem {
  id: string;
  tipo: 'foto' | 'pdf';
  nombre: string;
  url: string;
  subido_por: string;
  fecha_subida: string;
  descripcion?: string;
}

interface PunchItem {
  id?: string;
  numero_item: string;
  etapa_numero?: number | null;
  etapa_titulo?: string | null;
  titulo: string;
  categoria: PunchCategoria;
  descripcion: string;
  responsable: string;
  disciplina: string;
  estado: PunchEstado;
  fecha_limite: string | null;
  evidencias?: EvidenciaItem[];
  ncr_referencia?: string | null;
  fecha_cierre?: string | null;
  cerrado_por?: string | null;
  createdAt: string;
  authorId: string;
  authorName: string;
}

const PLANES_MONTAJE: Record<string, Omit<EtapaMontaje, 'id'>[]> = {
  // ── ESP-CON-001 · Espesador de Concentrado HRT-035 ───────────────────────
  // Ref. BMP: LM-ED-MEL-3410-3400-0001  Partida M10 — ESPESADOR
  // Ref. Procedimiento: LM-HLGS-C-1000-3940-PRO-0034 + Manual Metso ES-LX-OU500911029_R0_IOMS
  // Pesos: Montaje Cuerpo Terminado 70% (et. 1-7) | Verificación Tolerancias 10% | Pruebas Funcionales 10% | Protocolos Entrega 10%
  // Avance al 30/04/2026: 20% (etapas 1+2+3 completadas: 5+5+10)
  'ESP-CON-001': [
    {
      numero_etapa: 1,
      titulo: 'Actividades Preliminares',
      descripcion:
        'Recepción e inspección de todos los componentes contra packing list del fabricante Metso (ES-LX-OU500911029_R0_IOMS). ' +
        'Verificación de estado de preservación; almacenamiento de componentes engomados protegidos de rayos UV. ' +
        'Verificación topográfica de fundaciones civiles y pernos de anclaje (altura ±10 mm, distancia entre pernos ±3 mm a ±6 mm). ' +
        'Liberación formal de anclajes y áreas. Planificación de izajes. ' +
        'Ref.: LM-HLGS-C-1000-3940-FRM-0005 (Topografía) · Proc.: LM-HLGS-C-1000-3940-PRO-0034.',
      peso_porcentual: 5,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 2,
      titulo: 'Instalación de Underflow (Bota de Descarga Inferior)',
      descripcion:
        'Pre-ensamble e instalación del Underflow Boot (cono de descarga inferior) sobre la base civil. ' +
        'Verificación de orientación de boquillas de underflow respecto a la brida de descarga. ' +
        'Alineación y torqueo de pernos de anclaje conforme a tabla de torques del fabricante. ' +
        'Este componente establece la referencia geométrica central para todas las etapas posteriores.',
      peso_porcentual: 5,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 3,
      titulo: 'Instalación de Columnas / Estructura Soporte',
      descripcion:
        'Instalación del Anillo de Compresión: verificación de orientación de boquillas y pedestales, geometría radial en 16 puntos cada 22,5°. ' +
        'Izaje, posicionamiento y verticalización de columnas (tolerancia estricta L/500). ' +
        'Instalación de arriostramientos cruzados (Cross Bracing) y elementos de rigidización. ' +
        'Nivelación y torqueo progresivo de pernos de anclaje según tabla de torques del fabricante.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 4,
      titulo: 'Instalación de Piso y Pared del Tanque',
      descripcion:
        'Pre-ensamble en suelo de hasta 8 secciones de piso para minimizar trabajo en alturas. Instalación de vigas radiales sobre las columnas. ' +
        'Montaje de segmentos de piso y segmentos superiores del manto (Shell Plates). ' +
        'NOTA: todos los pernos se instalan en condición snug tight (sin torque final en esta fase). ' +
        'Atornillado definitivo: prueba de lubricación de pernos (giro 300°) y torque final con arandelas Squirter Washers (1:25 pernos) método giro de tuerca. ' +
        'Preparación de superficies (Sika Aktivator-205) y sellado de juntas con Sikaflex 221. ' +
        'Ref.: LM-HLGS-C-1000-3940-FRM-0021 (Torque).',
      peso_porcentual: 20,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 5,
      titulo: 'Instalación del Puente',
      descripcion:
        'Ensamble de módulos del puente en suelo y verificación de contraflecha (Precamber positivo 55–65 mm). ' +
        'Izaje del puente completo; centrado con 4 plomadas respecto al underflow (offsets Z1, Z2, Z3, Z4 — tolerancia ±20 mm entre ellas). ' +
        'Descenso e instalación del Drive Unit sobre la brida central con torque en estrella de 1 440 Nm.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 6,
      titulo: 'Instalación de Mecanismo de Giro y Rastras',
      descripcion:
        'Instalación vertical del Drive Shaft, soportado temporalmente 100 mm por encima de la cota final (desviación máxima 5 mm). ' +
        'Montaje de brazos cortos y largos (Short & Long Rake Arms) y puntales (Struts) con Shim Packs preliminares. ' +
        'Instalación del Steady Pin y Steady Bearing; holgura nominal del rodamiento: 25 mm (pasador sin contacto con rodamiento). ' +
        'Cálculo y ajuste del offset del pasador según marcas de contacto; torque final del Steady Pin. ' +
        'Rotación del mecanismo 360° mediante HPU para verificar giro libre. ' +
        'Ref.: LM-HLGS-C-1000-3940-FRM-0110 (Alineación).',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 7,
      titulo: 'Instalación de Componentes de Alimentación',
      descripcion:
        'Pre-ensamble e instalación del Feedwell (Metso Reactorwell™) suspendido debajo del puente. ' +
        'Instalación de cono deflector, scraper y accesorios misceláneos; verificación de holguras. ' +
        'Conexión de tubería de alimentación, caja de transición, tuberías de floculante y aspersores. ' +
        'Nivelación final de brazos de rastra: diferencia máxima en punta de brazos largos ≤ 25 mm y brazos cortos ≤ 15 mm (ajuste definitivo de Shim Packs).',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-A · Montaje Cuerpo Terminado (70%)',
    },
    {
      numero_etapa: 8,
      titulo: 'Verificación de Tolerancias',
      descripcion:
        'Verificación de todas las tolerancias mecánicas del espesador ensamblado: verticalidad de columnas (L/500), nivel del tanque, ' +
        'holguras de rastras (brazos largos ≤ 25 mm, brazos cortos ≤ 15 mm), contraflecha del puente (55–65 mm), offset del Steady Pin y torqueo estructural. ' +
        'Aprobación de protocolos QC: LM-HLGS-C-1000-3940-FRM-0005 (Topografía), FRM-0110 (Alineación), FRM-0021 (Torque). ' +
        'PARTIDA BMP INDEPENDIENTE — 10% del total. Ref.: LM-ED-MEL-3410-3400-0001.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-B · Verificación de Tolerancias (10%)',
    },
    {
      numero_etapa: 9,
      titulo: 'Pruebas Funcionales',
      descripcion:
        'Pre-comisionamiento en seco: giro manual de rastras para verificar libre movimiento; prueba HPU (levantamiento hidráulico de emergencia y verificación de sentido de rotación). ' +
        'Prueba de estanqueidad: llenado con agua mínimo 24 h, inspección de fugas en juntas, boquillas y fondo. ' +
        'Verificación de torque de rastra girando sumergido; medición de torque de arranque vs. nominal del fabricante. ' +
        'PARTIDA BMP INDEPENDIENTE — 10% del total. Ref.: LM-ED-MEL-3410-3400-0001.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-C · Pruebas Funcionales (10%)',
    },
    {
      numero_etapa: 10,
      titulo: 'Protocolos de Entrega del Equipo',
      descripcion:
        'Reemplazo del aceite de prueba del reductor y HPU por aceite definitivo según especificación del fabricante. Entrega de tarjeta de lubricación. ' +
        'Entrega formal del dossier de calidad: ITPs firmados, registros de torqueo, protocolos de topografía y alineación, certificado de prueba hidráulica y manual de O&M Metso. ' +
        'HITO FINAL — Mechanical Completion. No completado hasta firma de todos los protocolos por SGS|ETSA y Aris Mining. ' +
        'PARTIDA BMP INDEPENDIENTE — 10% del total. Ref.: LM-ED-MEL-3410-3400-0001.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
      partida_bmp: 'M10-D · Protocolos de Entrega (10%)',
    },
  ],
};

// ─── BMP — Bases de Medición y Pago — LM-ED-MEL-3410-3400-0001 ──────────────
// Marmato 5,000 TPD · Pesos de avance por tipo de equipo (partidas M01–M12)

type BmpPartida = 'M01' | 'M02' | 'M05' | 'M06' | 'M07' | 'M08' | 'M10' | 'M12';

interface BmpTemplate {
  partida: BmpPartida;
  descripcion: string;
  etapas: Array<Omit<EtapaMontaje, 'id' | 'estado' | 'responsable' | 'observaciones'>>;
}

const BMP_TEMPLATES: Record<BmpPartida, BmpTemplate> = {
  // ── M01 · Filtro de Prensa (70 / 20 / 10) ────────────────────────────────
  M01: {
    partida: 'M01',
    descripcion: 'Filtro de Prensa',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción, Inspección y Preservación', peso_porcentual: 5,
        descripcion: 'Recepción e inspección contra packing list. Verificación de estado de preservación, placas filtrantes, membranas y bastidor. Registro fotográfico de todos los bultos.' },
      { numero_etapa: 2, titulo: 'Montaje del Marco Estructural y Placas Filtrantes', peso_porcentual: 30,
        descripcion: 'Montaje del bastidor principal sobre fundación. Instalación de placas filtrantes en secuencia, verificación de alineación lateral (tolerancia ±1 mm). Torqueo de pernos de anclaje según planos.' },
      { numero_etapa: 3, titulo: 'Alineación del Pistón Hidráulico y Conexionado', peso_porcentual: 35,
        descripcion: 'Alineación del cilindro hidráulico con la placa de presión. Conexionado de líneas hidráulicas (HP/LP), tuberías de alimentación/descarga de pulpa y cañerías de aire. Instalación del tablero local.' },
      { numero_etapa: 4, titulo: 'Prueba en Vacío — Ciclo de Prensado y Apertura', peso_porcentual: 20,
        descripcion: 'Verificación de sentido de movimiento del pistón hidráulico. Ciclo completo de prensado y apertura en vacío (sin pulpa). Verificación de presión de cierre, sellos y ausencia de fugas. OBLIGATORIO antes de autorización de energización.' },
      { numero_etapa: 5, titulo: 'Reemplazo de Aceite de Prueba, Tarjeta Lube y Entrega de Protocolos', peso_porcentual: 10,
        descripcion: 'Reemplazo del aceite hidráulico de prueba por aceite definitivo según especificación. Entrega de tarjeta de lubricación. Entrega formal del dossier de calidad (ITPs, torqueos, certificados). HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M02 · Bombas (Centrífugas, Pulpa, Pistón), Sist. Aire y Duchas (70/20/10) ─
  M02: {
    partida: 'M02',
    descripcion: 'Bombas, Sistema de Aire y Duchas',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción, Inspección y Preservación', peso_porcentual: 5,
        descripcion: 'Recepción e inspección contra packing list. Verificación de estado de preservación y bridas ciegas. Registro de números de serie. Almacenamiento según recomendación del fabricante.' },
      { numero_etapa: 2, titulo: 'Preparación de Base y Montaje del Cuerpo de Bomba', peso_porcentual: 25,
        descripcion: 'Verificación dimensional de placa base y pernos de anclaje. Grouteo con mortero epóxico (curado mínimo 72 h). Montaje del cuerpo de bomba y nivelación preliminar.' },
      { numero_etapa: 3, titulo: 'Montaje de Motor, Alineación y Conexión de Acoplamiento', peso_porcentual: 20,
        descripcion: 'Montaje del motor eléctrico. Alineación bomba–motor (método dial gauge o láser): paralelismo y angularidad dentro de tolerancias del fabricante. Instalación y torqueo del acoplamiento. Verificación de juego axial.' },
      { numero_etapa: 4, titulo: 'Conexionado de Tuberías, Instrumentación y Eléctrico', peso_porcentual: 20,
        descripcion: 'Conexión de cañerías de succión y descarga, bridas y soportes. Instalación de instrumentación (presostatos, termómetros, sensores de vibración). Tendido de cables, conexión al tablero y prueba de aislamiento del motor.' },
      { numero_etapa: 5, titulo: 'Prueba en Vacío — Verificación de Rotación y Ajuste de Sellos', peso_porcentual: 20,
        descripcion: 'Verificación de sentido de rotación ANTES de energización definitiva. Prueba de marcha en vacío. Verificación de temperatura de rodamientos, vibración y estanqueidad de sellos. REQUISITO PREVIO a la autorización de energización.' },
      { numero_etapa: 6, titulo: 'Lubricación Inicial, Tarjeta Lube y Entrega de Protocolos', peso_porcentual: 10,
        descripcion: 'Reemplazo de aceite/grasa de prueba por lubricante definitivo. Entrega de tarjeta de lubricación al área de mantenimiento. Entrega formal del dossier de calidad. HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M05 · Agitadores (70 / 10 / 15 / 5) ─────────────────────────────────
  M05: {
    partida: 'M05',
    descripcion: 'Agitadores',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción e Inspección de Componentes', peso_porcentual: 5,
        descripcion: 'Recepción e inspección del eje, impeller, caja reductora, motor y accesorios contra packing list. Verificación de preservación del eje y rodamientos. Registro fotográfico.' },
      { numero_etapa: 2, titulo: 'Montaje de Cuerpo y Estructura Soporte', peso_porcentual: 35,
        descripcion: 'Instalación del pedestal soporte sobre el techo del tanque. Nivelación y torqueo de pernos de anclaje. Montaje del reductor de velocidades y motor eléctrico.' },
      { numero_etapa: 3, titulo: 'Montaje de Baffles, Eje e Impeller', peso_porcentual: 30,
        descripcion: 'Instalación de baffles según planos. Ensamble e instalación del eje de agitación (verticalidad ±0,5°). Montaje del impeller o turbina. Conexión del acoplamiento eje–reductor.' },
      { numero_etapa: 4, titulo: 'Verificación de Tolerancias y Alineación Final', peso_porcentual: 10,
        descripcion: 'Verificación de holguras radiales y axiales del eje según tolerancias del fabricante. Verificación de espaciado impeller-pared. Torqueo final de todos los pernos según tabla de torques.' },
      { numero_etapa: 5, titulo: 'Prueba Funcional en Vacío — Sentido de Rotación y Vibración', peso_porcentual: 15,
        descripcion: 'Verificación de sentido de rotación del impeller ANTES de energización con fluido. Prueba de marcha en vacío: temperatura de rodamientos, vibración (< 2,5 mm/s RMS) y nivel de ruido. REQUISITO PREVIO a llenado del tanque.' },
      { numero_etapa: 6, titulo: 'Lubricación (Aceite Definitivo), Tarjeta Lube y Entrega de Protocolos', peso_porcentual: 5,
        descripcion: 'Drenaje y reemplazo del aceite del reductor de prueba por aceite definitivo según fabricante. Entrega de tarjeta de lubricación. Entrega formal del dossier de calidad. HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M06 · Tanques (80 / 15 / 5) ──────────────────────────────────────────
  M06: {
    partida: 'M06',
    descripcion: 'Tanques',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción, Inspección y Verificación Dimensional', peso_porcentual: 5,
        descripcion: 'Recepción e inspección de planchas, perfiles, boquillas y accesorios. Verificación dimensional y de calidad de material (certificados de acero, espesores). Registro fotográfico.' },
      { numero_etapa: 2, titulo: 'Armado y Soldadura del Fondo del Tanque', peso_porcentual: 25,
        descripcion: 'Preparación de superficies (sandblasting Sa 2½). Armado y soldadura de planchas del fondo. Inspección visual y prueba de burbuja en uniones soldadas. Verificación de planitud (máx. 6 mm en 3 m).' },
      { numero_etapa: 3, titulo: 'Montaje y Soldadura de Paredes y Secciones', peso_porcentual: 25,
        descripcion: 'Armado y soldadura de cilindros de pared en secciones. Verificación de redondez y verticalidad (±0,5% de diámetro). Instalación de refuerzos estructurales y rigidizadores.' },
      { numero_etapa: 4, titulo: 'Instalación de Boquillas, Accesorios y Revestimiento', peso_porcentual: 25,
        descripcion: 'Instalación y soldadura de boquillas, escaleras, plataformas y soportes. Aplicación de revestimiento interior (pintura o liner elastomérico). Curado según ficha técnica del recubrimiento.' },
      { numero_etapa: 5, titulo: 'Prueba de Estanqueidad — Llenado con Agua (24 h mínimo)', peso_porcentual: 15,
        descripcion: 'Llenado completo del tanque con agua para prueba de estanqueidad estática (mínimo 24 h). Inspección de uniones soldadas, boquillas y fondo. Verificación de asentamiento de fundación.' },
      { numero_etapa: 6, titulo: 'Entrega de Dossier de Soldadura, Certificados NDT y Protocolos', peso_porcentual: 5,
        descripcion: 'Entrega formal del dossier de calidad: registros de soldadura (WPS/PQR), inspecciones NDT (ultrasonido/LP), certificado de prueba hidráulica y protocolos de pintura. HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M07 · Puente Grúa (80 / 10 / 10) ─────────────────────────────────────
  M07: {
    partida: 'M07',
    descripcion: 'Puente Grúa',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción e Inspección de Estructuras y Componentes', peso_porcentual: 5,
        descripcion: 'Recepción e inspección de vigas principales, carrileras, polipasto y sistema eléctrico. Verificación dimensional y de pintura de las vigas. Registro fotográfico.' },
      { numero_etapa: 2, titulo: 'Montaje de Vigas Principales y Arriostramientos', peso_porcentual: 25,
        descripcion: 'Izaje e instalación de vigas principales sobre la estructura civil o metálica. Alineación longitudinal y transversal (rectitud de carrilera ±1 mm/m). Torqueo de empalmes de vigas.' },
      { numero_etapa: 3, titulo: 'Ensamble del Carro Viajero y Polipasto / Winche', peso_porcentual: 25,
        descripcion: 'Montaje del carro viajero sobre las vigas. Instalación del polipasto o winche. Verificación de holguras entre ruedas y carrilera. Instalación de topes de fin de carrera mecánicos y eléctricos.' },
      { numero_etapa: 4, titulo: 'Balance, Alineación Final de Rieles y Conexión Eléctrica', peso_porcentual: 25,
        descripcion: 'Verificación de balance y nivelación del puente (tolerancia ±2 mm de desnivel). Alineación precisa de rieles. Tendido de barra conductora, cableado del carro viajero y conexión al tablero.' },
      { numero_etapa: 5, titulo: 'Prueba de Carga y Verificación de Seguridades (125% carga nominal)', peso_porcentual: 10,
        descripcion: 'Prueba de funcionamiento en vacío. Prueba de carga estática (125% de la carga nominal, ASME B30.2). Verificación de limitadores de carga, finales de carrera y frenos. Medición de flecha máxima de la viga principal.' },
      { numero_etapa: 6, titulo: 'Entrega de Certificado de Carga, Manual y Protocolos de Calidad', peso_porcentual: 10,
        descripcion: 'Lubricación de mecanismos de traslación y elevación. Entrega formal del Certificado de Prueba de Carga, Manual de O&M y protocolos de calidad. HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M08 · Planta de Floculante (80 / 10 / 10) ────────────────────────────
  M08: {
    partida: 'M08',
    descripcion: 'Planta de Floculante',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción e Inspección del Skid y Componentes', peso_porcentual: 5,
        descripcion: 'Recepción e inspección del skid de floculante (tanques de preparación, maduración y día), bombas dosificadoras, instrumentación y tablero. Verificación contra packing list del proveedor.' },
      { numero_etapa: 2, titulo: 'Montaje de Tanques y Agitadores de Preparación', peso_porcentual: 30,
        descripcion: 'Montaje de tanques de preparación (make-up) y maduración sobre estructura soporte. Nivelación y anclaje. Montaje de agitadores de bajo corte para cada tanque.' },
      { numero_etapa: 3, titulo: 'Montaje de Bombas Dosificadoras y Sistema de Tuberías', peso_porcentual: 25,
        descripcion: 'Montaje de bombas dosificadoras de pistón o peristálticas. Conexionado de tuberías de solución de floculante, agua de dilución y dosificación a los espesadores.' },
      { numero_etapa: 4, titulo: 'Alineación Final, Calibración de Instrumentos e Instalación Eléctrica', peso_porcentual: 20,
        descripcion: 'Alineación de bombas con motores. Calibración de instrumentos de flujo y nivel. Tendido de cables, conexión al sistema de control (PLC/DCS) y puesta a punto del tablero local.' },
      { numero_etapa: 5, titulo: 'Prueba Funcional — Secuencia de Preparación y Dosificación', peso_porcentual: 10,
        descripcion: 'Prueba de secuencia de preparación de solución de floculante con agua. Verificación de bombas dosificadoras (caudal y presión nominal). Simulación de dosificación. Verificación de alarmas y enclavamientos.' },
      { numero_etapa: 6, titulo: 'Lubricación, Tarjeta Lube y Entrega de Protocolos', peso_porcentual: 10,
        descripcion: 'Lubricación de bombas dosificadoras y agitadores según especificación. Entrega de tarjeta de lubricación. Entrega formal del dossier de calidad (ITPs, certificados de prueba, manual de operación). HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M10 · Espesador (70 / 10 / 10 / 10) ──────────────────────────────────
  M10: {
    partida: 'M10',
    descripcion: 'Espesador',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción, Inspección y Topografía Inicial', peso_porcentual: 5,
        descripcion: 'Inspección de componentes contra packing list. Liberación topográfica de la fundación civil, pedestales y pernos de anclaje. Verificación dimensional de placas base.' },
      { numero_etapa: 2, titulo: 'Montaje de Estructura Soporte y Columnas', peso_porcentual: 20,
        descripcion: 'Izaje e instalación de columnas radiales y centrales. Montaje de arriostramientos cruzados y anillo de compresión. Nivelación y torqueo progresivo de pernos de anclaje.' },
      { numero_etapa: 3, titulo: 'Montaje de Piso y Paredes del Tanque', peso_porcentual: 20,
        descripcion: 'Ensamblaje en suelo y elevación de segmentos de pared. Atornillado progresivo con squirter washers y aplicación de sellante en juntas. Verificación de circularidad y nivel del tanque.' },
      { numero_etapa: 4, titulo: 'Montaje del Mecanismo de Accionamiento y Puente', peso_porcentual: 15,
        descripcion: 'Instalación del reductor de velocidades y anillo giratorio. Armado del puente (precamber), torqueo e izaje en tándem o simple. Sistema hidráulico de accionamiento (HPU) y elevador de rastras.' },
      { numero_etapa: 5, titulo: 'Instalación del Pozo de Alimentación (Feedwell) y Brazos de Rastra', peso_porcentual: 10,
        descripcion: 'Pre-ensamble e instalación del Feedwell (puertos de alimentación y dilución). Montaje de brazos de rastra (largos y cortos), palas y steady bearing inferior. Conexión del cableado de la HPU.' },
      { numero_etapa: 6, titulo: 'Verificación de Tolerancias y Nivelación Final de Brazos', peso_porcentual: 10,
        descripcion: 'Nivelación final de brazos de rastra (tolerancia ±2 mm). Verificación de holguras entre rastras y fondo del tanque. Torqueo final de todos los pernos según tabla de torques del fabricante.' },
      { numero_etapa: 7, titulo: 'Pre-Comisionamiento: Prueba en Seco (Giro manual + HPU)', peso_porcentual: 5,
        descripcion: 'Giro manual de rastras para verificar libre movimiento. Encendido de bomba hidráulica y verificación del levantamiento hidráulico de emergencia. Verificación de sentido de rotación. OBLIGATORIO antes de autorización de llenado.' },
      { numero_etapa: 8, titulo: 'Pre-Comisionamiento: Prueba con Agua — Estanqueidad (24 h)', peso_porcentual: 5,
        descripcion: 'Llenado del tanque con agua para prueba de fugas estáticas (mínimo 24 h). Verificación del torque de rastra girando sumergido. Medición de torque de arranque vs. nominal del fabricante.' },
      { numero_etapa: 9, titulo: 'Lubricación (Reemplazo de Aceite de Prueba), Tarjeta Lube y Entrega de Protocolos', peso_porcentual: 10,
        descripcion: 'Drenaje y reemplazo del aceite de prueba del reductor y HPU por aceite definitivo. Entrega de tarjeta de lubricación. Entrega formal del dossier de calidad (ITPs, certificados de prueba, registros de torqueo, manual de O&M). HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
  // ── M12 · Misceláneos (70 / 10 / 15 / 5) ─────────────────────────────────
  M12: {
    partida: 'M12',
    descripcion: 'Misceláneos',
    etapas: [
      { numero_etapa: 1, titulo: 'Recepción e Inspección de Componentes', peso_porcentual: 5,
        descripcion: 'Recepción e inspección contra packing list. Verificación de estado general, números de serie y certificados del fabricante. Registro fotográfico.' },
      { numero_etapa: 2, titulo: 'Preparación de Fundación o Estructura Soporte', peso_porcentual: 20,
        descripcion: 'Verificación dimensional de la fundación civil o estructura metálica. Instalación y nivelación de pernos de anclaje. Grouteo epóxico de placa base si aplica (curado mínimo 72 h).' },
      { numero_etapa: 3, titulo: 'Montaje Principal del Equipo', peso_porcentual: 25,
        descripcion: 'Izaje e instalación del equipo sobre la fundación o estructura soporte. Nivelación y alineación preliminar. Torqueo de pernos de anclaje según planos y especificaciones del fabricante.' },
      { numero_etapa: 4, titulo: 'Conexionado Mecánico, Eléctrico e Instrumental', peso_porcentual: 20,
        descripcion: 'Conexión de tuberías de proceso, hidráulicas o neumáticas. Tendido de cables y conexión al tablero de control. Instalación de instrumentación y señalización de seguridad.' },
      { numero_etapa: 5, titulo: 'Verificación de Tolerancias y Ajuste Final', peso_porcentual: 10,
        descripcion: 'Verificación de todas las holguras, juegos y tolerancias del equipo según manual del fabricante. Ajuste y retorqueo final. Prueba de aislamiento de motor (si aplica).' },
      { numero_etapa: 6, titulo: 'Prueba Funcional en Vacío — Sentido de Rotación y Seguridades', peso_porcentual: 15,
        descripcion: 'Verificación de sentido de rotación ANTES de energización con fluido o carga. Prueba de marcha en vacío. Medición de temperatura de rodamientos y vibración. Verificación de alarmas de protección. REQUISITO PREVIO a la autorización de energización.' },
      { numero_etapa: 7, titulo: 'Lubricación (Tarjeta Lube + Aceite Definitivo) y Entrega de Protocolos', peso_porcentual: 5,
        descripcion: 'Reemplazo de aceite/grasa de prueba por lubricante definitivo conforme a especificación del fabricante. Entrega de tarjeta de lubricación. Entrega formal del dossier de calidad. HITO FINAL — no completado hasta firma del protocolo de aceptación.' },
    ],
  },
};

/** Determina la partida BMP (M01–M12) según el nombre del equipo. */
function getEquipoBmpPartida(eq: EquipoTecnico): BmpPartida {
  const n = (eq.nombre || '').toUpperCase();
  if (n.includes('FILTRO DE PRENSA') || n.includes('FILTER PRESS')) return 'M01';
  if (
    n.includes('PUENTE GRÚA') || n.includes('PUENTE GRUA') ||
    n.includes('GRÚA PUENTE') || n.includes('GRUA PUENTE') ||
    n.includes('OVERHEAD CRANE') || n.includes('BRIDGE CRANE') || n.includes('EOT CRANE')
  ) return 'M07';
  if (n.includes('ESPESADOR') || n.includes('THICKENER')) return 'M10';
  if (n.includes('FLOCULANTE') || n.includes('FLOCCULANT') || n.includes('REACTORWELL')) return 'M08';
  if (n.includes('AGITADOR') || n.includes('AGITATOR') || n.includes('MEZCLADOR') || n.includes('MIXER')) return 'M05';
  if (
    n.includes('TANQUE') || n.includes('TANK') ||
    n.includes('ESTANQUE') || n.includes('SUMP') ||
    n.includes('CAJÓN') || n.includes('CAJON')
  ) return 'M06';
  if (
    n.includes('BOMBA') || n.includes('PUMP') ||
    n.includes('SISTEMA DE AIRE') || n.includes('AIR SYSTEM') ||
    n.includes('DUCHA') || n.includes('SHOWER') ||
    n.includes('COMPRESOR') || n.includes('COMPRESSOR') ||
    n.includes('SOPLADOR') || n.includes('BLOWER')
  ) return 'M02';
  return 'M12';
}

/**
 * Devuelve el plan de etapas para un equipo.
 * Prioridad: plan personalizado en PLANES_MONTAJE → plantilla BMP automática.
 */
function getBmpPlan(eq: EquipoTecnico): Omit<EtapaMontaje, 'id'>[] {
  if (PLANES_MONTAJE[eq.tag]) return PLANES_MONTAJE[eq.tag];
  const partida = getEquipoBmpPartida(eq);
  return BMP_TEMPLATES[partida].etapas.map((e) => ({
    ...e,
    estado: 'Pendiente' as EtapaEstado,
    responsable: '',
    observaciones: '',
  }));
}

/** Etiqueta de partida BMP para mostrar en la interfaz. */
function getEquipoBmpLabel(eq: EquipoTecnico): string {
  if (PLANES_MONTAJE[eq.tag]) return 'Plan Personalizado';
  const partida = getEquipoBmpPartida(eq);
  return `${partida} — ${BMP_TEMPLATES[partida].descripcion}`;
}

// ─────────────────────────────────────────────────────────────────────────────

const ETAPA_ESTADO_COLORS: Record<EtapaEstado, string> = {
  'Pendiente':  'bg-slate-500/10 text-slate-400 border-slate-500/30',
  'En Proceso': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Completado': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const PUNCH_CATEGORIA_COLORS: Record<PunchCategoria, string> = {
  A: 'bg-red-500/15 text-red-400 border-red-500/30',
  B: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  C: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const PUNCH_ESTADO_COLORS: Record<PunchEstado, string> = {
  ABIERTO:    'bg-red-500/10 text-red-400 border-red-500/30',
  EN_GESTION: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  CERRADO:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const PUNCH_ESTADO_LABELS: Record<PunchEstado, string> = {
  ABIERTO:    'Abierto',
  EN_GESTION: 'En Gestión',
  CERRADO:    'Cerrado',
};

const PUNCH_DISCIPLINAS = ['Mecánica', 'Eléctrica', 'Civil', 'Instrumentación', 'Tubería', 'Otro'];

// ─── Sub-componente: fila de ítem de punch list ────────────────────────────────
function PunchItemRow({
  item,
  isOwner,
  onView,
  onUpdateEstado,
}: {
  item: PunchItem & { id: string };
  isOwner: boolean;
  onView: () => void;
  onUpdateEstado: (id: string, estado: PunchEstado) => void;
}) {
  return (
    <div
      className={cn(
        'border p-3 flex items-start justify-between gap-3 hover:border-primary/30 transition-colors cursor-pointer',
        item.estado === 'CERRADO'
          ? 'border-emerald-500/15 bg-emerald-500/5 opacity-70'
          : item.estado === 'EN_GESTION'
          ? 'border-yellow-500/15 bg-yellow-500/5'
          : 'border-primary/10 bg-slate-950/40'
      )}
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <Badge className={cn('rounded-none text-[7px] font-display border px-1.5', PUNCH_CATEGORIA_COLORS[item.categoria])}>
            {item.categoria}
          </Badge>
          <Badge className={cn('rounded-none text-[7px] font-display border px-1.5', PUNCH_ESTADO_COLORS[item.estado])}>
            {PUNCH_ESTADO_LABELS[item.estado]}
          </Badge>
          <span className="text-[8px] font-mono-tech text-primary/40">{item.numero_item}</span>
          <Badge variant="outline" className="rounded-none text-[7px] font-display border-primary/20 text-primary/40 px-1.5">
            {item.disciplina}
          </Badge>
          {item.evidencias && item.evidencias.length > 0 && (
            <span className="flex items-center gap-0.5 text-[8px] font-mono-tech text-primary/50">
              <Camera className="w-2.5 h-2.5" />{item.evidencias.length}
            </span>
          )}
          {item.ncr_referencia && (
            <Badge variant="outline" className="rounded-none text-[7px] font-display border-red-500/30 text-red-400/60 px-1.5">
              NCR: {item.ncr_referencia}
            </Badge>
          )}
        </div>
        <p className="text-[10px] font-mono-tech font-bold text-foreground/90">{item.titulo}</p>
        {item.descripcion && (
          <p className="text-[9px] font-mono-tech text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">{item.descripcion}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[8px] text-muted-foreground font-mono-tech">
          <span>{item.responsable}</span>
          {item.fecha_limite && <><span>·</span><span className="text-yellow-400/70">Vence: {item.fecha_limite}</span></>}
          {item.fecha_cierre && <><span>·</span><span className="text-emerald-400/60">Cerrado: {item.fecha_cierre}</span></>}
        </div>
      </div>
      {/* Acciones rápidas (para owner) */}
      {isOwner && item.estado !== 'CERRADO' && (
        <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {item.estado === 'ABIERTO' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 text-[8px]"
              onClick={() => onUpdateEstado(item.id, 'EN_GESTION')}
              title="Marcar En Gestión"
            >
              <Clock className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            onClick={() => onUpdateEstado(item.id, 'CERRADO')}
            title="Cerrar pendiente"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
      {(!isOwner || item.estado === 'CERRADO') && (
        <Eye className="w-3 h-3 text-muted-foreground/30 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}

const OWNER_UID = 'R3MVwE12nVMg128Kv6bdwJ6MKav1';
const OWNER_EMAILS = ['jhonalexandervm@outlook.com', 'jhonalexanderv@gmail.com'];

type ActivityType = 'MANTENIMIENTO' | 'INSPECCION' | 'REPARACION' | 'NCR' | 'OTRO';
type ActivityStatus = 'ABIERTO' | 'EN_PROCESO' | 'CERRADO';
type NCRPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

interface Activity {
  id?: string;
  tipo: ActivityType;
  descripcion: string;
  fecha: string;
  responsable: string;
  fotoURLs: string[];
  estado: ActivityStatus;
  ncr?: {
    numero: string;
    descripcion: string;
    accionCorrectiva: string;
    prioridad: NCRPriority;
  };
  authorId: string;
  authorName: string;
  createdAt: string;
}

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'NCR', label: 'No Conformidad (NCR)' },
  { value: 'OTRO', label: 'Otro' },
];

const ACTIVITY_STATUS: { value: ActivityStatus; label: string }[] = [
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'CERRADO', label: 'Cerrado' },
];

const NCR_PRIORITIES: { value: NCRPriority; label: string }[] = [
  { value: 'CRITICA', label: 'Crítica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

export default function QualityNCSPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const equipoPhotoInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'equipos' | 'hoja-vida' | 'ncr'>('equipos');
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoTecnico | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterWBS, setFilterWBS] = useState('ALL');

  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [activitySaving, setActivitySaving] = useState(false);
  const [actFecha, setActFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [actTipo, setActTipo] = useState<ActivityType>('MANTENIMIENTO');
  const [actDescripcion, setActDescripcion] = useState('');
  const [actResponsable, setActResponsable] = useState('');
  const [actEstado, setActEstado] = useState<ActivityStatus>('ABIERTO');
  const [actFotoURLs, setActFotoURLs] = useState<string[]>([]);
  const [actUploadingPhotos, setActUploadingPhotos] = useState(false);
  const [ncrNumero, setNcrNumero] = useState('');
  const [ncrDescripcion, setNcrDescripcion] = useState('');
  const [ncrAccion, setNcrAccion] = useState('');
  const [ncrPrioridad, setNcrPrioridad] = useState<NCRPriority>('MEDIA');

  const [equipoPhotoUploading, setEquipoPhotoUploading] = useState(false);

  const [ncrFilterStatus, setNcrFilterStatus] = useState<'ALL' | ActivityStatus>('ALL');
  const [ncrFilterPriority, setNcrFilterPriority] = useState<'ALL' | NCRPriority>('ALL');
  const [ncrSearch, setNcrSearch] = useState('');

  const [viewActivity, setViewActivity] = useState<any | null>(null);

  // Plan de Montaje
  const [planUpdating, setPlanUpdating] = useState<string | null>(null);
  const [planSeeding, setPlanSeeding] = useState(false);

  // Punch List / Pendientes
  const [isAddingPendiente, setIsAddingPendiente] = useState(false);
  const [pendienteSaving, setPendienteSaving] = useState(false);
  const [pendTitulo, setPendTitulo] = useState('');
  const [pendDescripcion, setPendDescripcion] = useState('');
  const [pendCategoria, setPendCategoria] = useState<PunchCategoria>('B');
  const [pendResponsable, setPendResponsable] = useState('');
  const [pendDisciplina, setPendDisciplina] = useState('Mecánica');
  const [pendFechaLimite, setPendFechaLimite] = useState('');
  const [pendEtapaNumero, setPendEtapaNumero] = useState<number | null>(null);
  const [pendNcrReferencia, setPendNcrReferencia] = useState('');
  const [pendEvidencias, setPendEvidencias] = useState<EvidenciaItem[]>([]);
  const [pendUploadingFiles, setPendUploadingFiles] = useState(false);
  const [viewPunchItem, setViewPunchItem] = useState<(PunchItem & { id: string }) | null>(null);
  const [expandedEtapas, setExpandedEtapas] = useState<Set<string>>(new Set());
  const [expandedHistoriales, setExpandedHistoriales] = useState<Set<string>>(new Set());
  const [punchExporting, setPunchExporting] = useState(false);
  const pendFileInputRef = useRef<HTMLInputElement>(null);

  // Plan de Montaje — inline edit + historial
  const [editingEtapaId, setEditingEtapaId] = useState<string | null>(null);
  const [editResponsable, setEditResponsable] = useState('');
  const [editObservaciones, setEditObservaciones] = useState('');
  const [planExporting, setPlanExporting] = useState(false);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push('/auth');
    }
  }, [user, isUserLoading, router]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user?.uid]);
  const { data: userData } = useDoc(userDocRef);

  const equipoDocRef = useMemoFirebase(() => {
    if (!firestore || !selectedEquipo) return null;
    return doc(firestore, 'equipment', selectedEquipo.tag);
  }, [firestore, selectedEquipo]);
  const { data: equipoDoc } = useDoc(equipoDocRef);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !user || !selectedEquipo) return null;
    return query(
      collection(firestore, 'equipment_activities'),
      where('equipoTag', '==', selectedEquipo.tag)
    );
  }, [firestore, user, selectedEquipo]);
  const { data: activitiesRaw, isLoading: activitiesLoading } = useCollection(activitiesQuery);
  const activities = activitiesRaw
    ? [...activitiesRaw].sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
    : null;

  const allNcrQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'non_conformities');
  }, [firestore, user]);
  const { data: allNcrsRaw, isLoading: ncrsLoading } = useCollection(allNcrQuery);
  const allNcrs = allNcrsRaw
    ? [...allNcrsRaw].sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1))
    : null;

  // ── Plan de Montaje (subcollección) ─────────────────────────────────────────
  const planMontajeQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEquipo) return null;
    return collection(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje');
  }, [firestore, selectedEquipo]);
  const { data: planRaw, isLoading: planLoading } = useCollection(planMontajeQuery);

  // Merge: estructura siempre desde el template de código (PLANES_MONTAJE / BMP),
  // estado editable (estado, responsable, observaciones, historial) desde Firestore.
  // Así el plan refleja el template actualizado sin necesidad de Re-init.
  const planMontaje = useMemo((): (EtapaMontaje & { id: string })[] | null => {
    if (!selectedEquipo) return null;
    const template = getBmpPlan(selectedEquipo);
    if (!template || template.length === 0) return null;
    const fsMap = new Map<number, any>();
    if (planRaw) {
      for (const e of planRaw as any[]) fsMap.set(e.numero_etapa, e);
    }
    return template.map((etapa) => {
      const fs = fsMap.get(etapa.numero_etapa);
      return {
        ...etapa,
        id: fs?.id ?? `etapa_${String(etapa.numero_etapa).padStart(2, '0')}`,
        estado:       (fs?.estado       ?? etapa.estado)       as EtapaEstado,
        responsable:  fs?.responsable   ?? etapa.responsable,
        observaciones:fs?.observaciones ?? etapa.observaciones,
        historial:    fs?.historial     ?? [],
      };
    }) as (EtapaMontaje & { id: string })[];
  }, [selectedEquipo, planRaw]);

  const avanceCalculado = useMemo(() => {
    if (!planMontaje || planMontaje.length === 0) return 0;
    return Math.round(
      planMontaje.reduce((acc, e) => {
        const f = e.estado === 'Completado' ? 1 : e.estado === 'En Proceso' ? 0.5 : 0;
        return acc + e.peso_porcentual * f;
      }, 0)
    );
  }, [planMontaje]);

  // ── Punch List / Pendientes (subcollección) ──────────────────────────────────
  const pendientesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEquipo) return null;
    return collection(firestore, 'equipment', selectedEquipo.tag, 'pendientes');
  }, [firestore, selectedEquipo]);
  const { data: punchRaw, isLoading: punchLoading } = useCollection(pendientesQuery);
  const punchItems: (PunchItem & { id: string })[] | null = punchRaw
    ? ([...punchRaw].sort((a: any, b: any) => (b.createdAt > a.createdAt ? 1 : -1)) as any)
    : null;

  // ── Permisos ─────────────────────────────────────────────────────────────────
  const isOwner = user?.uid === OWNER_UID || OWNER_EMAILS.includes(user?.email || '');

  const filteredEquipos = EQUIPOS_TECNICOS.filter((eq) => {
    if (filterWBS !== 'ALL' && eq.sub_wbs !== filterWBS) return false;
    const term = searchTerm.toLowerCase();
    if (
      term &&
      !eq.tag.toLowerCase().includes(term) &&
      !eq.nombre.toLowerCase().includes(term) &&
      !eq.proveedor.toLowerCase().includes(term) &&
      !eq.marca.toLowerCase().includes(term)
    )
      return false;
    return true;
  });

  const filteredNcrs = (allNcrs || []).filter((ncr: any) => {
    if (ncrFilterStatus !== 'ALL' && ncr.estado !== ncrFilterStatus) return false;
    if (ncrFilterPriority !== 'ALL' && ncr.ncr?.prioridad !== ncrFilterPriority) return false;
    if (
      ncrSearch &&
      !ncr.equipoTag?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.equipoNombre?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.ncr?.numero?.toLowerCase().includes(ncrSearch.toLowerCase()) &&
      !ncr.descripcion?.toLowerCase().includes(ncrSearch.toLowerCase())
    )
      return false;
    return true;
  });

  const uploadToStorage = async (file: File, path: string): Promise<string> => {
    if (!storage) throw new Error('Firebase Storage no está configurado.');
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  };

  const handleActivityPhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEquipo || !e.target.files) return;
    const files = Array.from(e.target.files);
    if (actFotoURLs.length + files.length > 5) {
      toast({ variant: 'destructive', title: 'LÍMITE', description: 'Máximo 5 fotografías.' });
      return;
    }
    setActUploadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const path = `equipment/${selectedEquipo.tag}/${Date.now()}_${file.name}`;
        const url = await uploadToStorage(file, path);
        urls.push(url);
      }
      setActFotoURLs((prev) => [...prev, ...urls]);
      toast({ title: 'FOTOS SUBIDAS', description: `${urls.length} foto(s) en Cloud Storage.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR FOTOS', description: err?.message || 'No se pudieron subir las fotos.' });
    } finally {
      setActUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEquipoPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEquipo || !e.target.files?.[0] || !firestore) return;
    const file = e.target.files[0];
    setEquipoPhotoUploading(true);
    try {
      const path = `equipment/${selectedEquipo.tag}/profile_${Date.now()}_${file.name}`;
      const url = await uploadToStorage(file, path);
      await setDoc(
        doc(firestore, 'equipment', selectedEquipo.tag),
        { tag: selectedEquipo.tag, nombre: selectedEquipo.nombre, photoURL: url, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      toast({ title: 'FOTO GUARDADA', description: 'Fotografía del equipo actualizada.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message || 'No se pudo subir la foto.' });
    } finally {
      setEquipoPhotoUploading(false);
      if (equipoPhotoInputRef.current) equipoPhotoInputRef.current.value = '';
    }
  };

  const resetActivityForm = () => {
    setActFecha(new Date().toISOString().split('T')[0]);
    setActTipo('MANTENIMIENTO');
    setActDescripcion('');
    setActResponsable('');
    setActEstado('ABIERTO');
    setActFotoURLs([]);
    setNcrNumero('');
    setNcrDescripcion('');
    setNcrAccion('');
    setNcrPrioridad('MEDIA');
  };

  const handleSaveActivity = async () => {
    if (!user || !firestore || !selectedEquipo) return;
    if (!actDescripcion.trim() || !actResponsable.trim()) {
      toast({ variant: 'destructive', title: 'CAMPOS REQUERIDOS', description: 'Complete descripción y responsable.' });
      return;
    }
    if (actTipo === 'NCR' && (!ncrNumero.trim() || !ncrDescripcion.trim())) {
      toast({ variant: 'destructive', title: 'NCR INCOMPLETA', description: 'Complete número y descripción de la NCR.' });
      return;
    }

    setActivitySaving(true);
    try {
      const activityData: Omit<Activity, 'id'> = {
        tipo: actTipo,
        descripcion: actDescripcion.trim(),
        fecha: actFecha,
        responsable: actResponsable.trim(),
        fotoURLs: actFotoURLs,
        estado: actEstado,
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName || 'Engineer',
        createdAt: new Date().toISOString(),
        ...(actTipo === 'NCR' && {
          ncr: {
            numero: ncrNumero.trim(),
            descripcion: ncrDescripcion.trim(),
            accionCorrectiva: ncrAccion.trim(),
            prioridad: ncrPrioridad,
          },
        }),
      };

      // Guardar actividad en colección plana — igual al patrón de QualityHallazgos
      await addDoc(
        collection(firestore, 'equipment_activities'),
        { ...activityData, equipoTag: selectedEquipo.tag, equipoNombre: selectedEquipo.nombre }
      );

      // Si es NCR, también guardar en colección global
      if (actTipo === 'NCR') {
        await addDoc(collection(firestore, 'non_conformities'), {
          ...activityData,
          equipoTag: selectedEquipo.tag,
          equipoNombre: selectedEquipo.nombre,
        });
      }

      toast({ title: 'ACTIVIDAD REGISTRADA', description: 'Guardada correctamente en Firebase.' });
      resetActivityForm();
      setIsCreatingActivity(false);
    } catch (err: any) {
      console.error('ERROR GUARDAR ACTIVIDAD:', err);
      toast({
        variant: 'destructive',
        title: 'ERROR AL GUARDAR',
        description: err?.message || err?.code || err?.toString() || 'Error desconocido.',
      });
    } finally {
      setActivitySaving(false);
    }
  };

  // ── Handlers Plan de Montaje ────────────────────────────────────────────────
  const handleSeedPlan = async () => {
    if (!firestore || !selectedEquipo || !user) return;
    const plan = getBmpPlan(selectedEquipo);
    if (!plan || plan.length === 0) return;
    setPlanSeeding(true);
    try {
      // Delete all existing plan_montaje docs (clean start — prevents duplicates from addDoc)
      const colRef = collection(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje');
      const existing = await getDocs(colRef);
      if (existing.docs.length > 0) {
        const delBatch = writeBatch(firestore);
        existing.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }
      // Seed with fixed document IDs (etapa_01, etapa_02…) — safe to re-run
      const seedBatch = writeBatch(firestore);
      plan.forEach((etapa) => {
        const fixedId = `etapa_${String(etapa.numero_etapa).padStart(2, '0')}`;
        const ref = doc(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje', fixedId);
        seedBatch.set(ref, { ...etapa, historial: [], createdAt: new Date().toISOString() });
      });
      const equipRef = doc(firestore, 'equipment', selectedEquipo.tag);
      seedBatch.set(equipRef, {
        tag: selectedEquipo.tag,
        nombre: selectedEquipo.nombre,
        proyecto: 'Marmato Lower Mine Expansion',
        proyecto_codigo: 'MIL24.001',
        area_wbs: '1510',
        fabricante: selectedEquipo.marca,
        modelo: selectedEquipo.modelo,
        avance_calculado: 0,
        fecha_creacion: new Date().toISOString(),
        fecha_actualizacion: new Date().toISOString(),
      }, { merge: true });
      await seedBatch.commit();
      toast({ title: 'PLAN INICIALIZADO', description: `${plan.length} etapas cargadas con IDs fijos. Datos anteriores eliminados.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPlanSeeding(false);
    }
  };

  const handleUpdateEtapa = async (etapaId: string, changes: Partial<EtapaMontaje>) => {
    if (!firestore || !selectedEquipo || !planMontaje || !user) return;
    setPlanUpdating(etapaId);
    try {
      const etapa = planMontaje.find((e) => e.id === etapaId);
      if (!etapa) return;
      const historialEntry: HistorialEtapa = {
        fecha: new Date().toISOString(),
        estado: changes.estado ?? etapa.estado,
        responsable: changes.responsable ?? etapa.responsable ?? '',
        observaciones: changes.observaciones ?? etapa.observaciones ?? '',
        actualizadoPor: userData?.displayName || user.displayName || 'Engineer',
      };
      // setDoc con merge crea el doc si no existe (no requiere Re-init previo)
      await setDoc(
        doc(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje', etapaId),
        { ...changes, historial: arrayUnion(historialEntry), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      const updated = planMontaje.map((e) => (e.id === etapaId ? { ...e, ...changes } : e));
      const newAvance = Math.round(
        updated.reduce((acc, e) => {
          const f = e.estado === 'Completado' ? 1 : e.estado === 'En Proceso' ? 0.5 : 0;
          return acc + e.peso_porcentual * f;
        }, 0)
      );
      await updateDoc(doc(firestore, 'equipment', selectedEquipo.tag), {
        avance_calculado: newAvance,
        fecha_actualizacion: new Date().toISOString(),
      });
      toast({ title: 'ETAPA ACTUALIZADA', description: `Avance global: ${newAvance}%` });
      setEditingEtapaId(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPlanUpdating(null);
    }
  };

  const handleExportPlanMontajeExcel = async () => {
    if (!selectedEquipo || !planMontaje || planMontaje.length === 0) return;
    setPlanExporting(true);
    try {
      const { exportPlanMontajeExcel } = await import('@/lib/excel-plan-montaje');
      await exportPlanMontajeExcel(selectedEquipo.tag, selectedEquipo.nombre, planMontaje, punchItems ?? []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR EXCEL', description: err?.message });
    } finally {
      setPlanExporting(false);
    }
  };

  // ── Handlers Punch List ──────────────────────────────────────────────────────
  const resetPendienteForm = () => {
    setPendTitulo('');
    setPendDescripcion('');
    setPendCategoria('B');
    setPendResponsable('');
    setPendDisciplina('Mecánica');
    setPendFechaLimite('');
    setPendEtapaNumero(null);
    setPendNcrReferencia('');
    setPendEvidencias([]);
  };

  const handlePunchFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEquipo || !e.target.files || !storage || !user) return;
    const files = Array.from(e.target.files);
    const MAX_EV = 10;
    if (pendEvidencias.length + files.length > MAX_EV) {
      toast({ variant: 'destructive', title: 'LÍMITE', description: `Máximo ${MAX_EV} archivos de evidencia.` });
      return;
    }
    setPendUploadingFiles(true);
    try {
      const nuevas: EvidenciaItem[] = [];
      for (const file of files) {
        const tipo: 'foto' | 'pdf' = file.type === 'application/pdf' ? 'pdf' : 'foto';
        const path = `equipment/${selectedEquipo.tag}/punch/${Date.now()}_${file.name}`;
        const url = await uploadToStorage(file, path);
        nuevas.push({
          id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          tipo,
          nombre: file.name,
          url,
          subido_por: userData?.displayName || user?.displayName || 'Engineer',
          fecha_subida: new Date().toISOString(),
        });
      }
      setPendEvidencias((prev) => [...prev, ...nuevas]);
      toast({ title: 'EVIDENCIAS SUBIDAS', description: `${nuevas.length} archivo(s) cargado(s) en Cloud Storage.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR UPLOAD', description: err?.message });
    } finally {
      setPendUploadingFiles(false);
      if (pendFileInputRef.current) pendFileInputRef.current.value = '';
    }
  };

  const handleSavePendiente = async () => {
    if (!firestore || !selectedEquipo || !user) return;
    if (!pendTitulo.trim()) {
      toast({ variant: 'destructive', title: 'CAMPO REQUERIDO', description: 'El título del pendiente es obligatorio.' });
      return;
    }
    if (!pendResponsable.trim()) {
      toast({ variant: 'destructive', title: 'CAMPO REQUERIDO', description: 'Complete el responsable.' });
      return;
    }
    setPendienteSaving(true);
    try {
      const count = (punchItems?.length || 0) + 1;
      const etapaTag = pendEtapaNumero ? `E${String(pendEtapaNumero).padStart(2, '0')}` : 'GEN';
      const numero = `PL-${selectedEquipo.tag}-${etapaTag}-${String(count).padStart(3, '0')}`;
      const etapaTitulo = pendEtapaNumero
        ? planMontaje?.find((e) => e.numero_etapa === pendEtapaNumero)?.titulo ?? null
        : null;
      await addDoc(collection(firestore, 'equipment', selectedEquipo.tag, 'pendientes'), {
        numero_item: numero,
        etapa_numero: pendEtapaNumero ?? null,
        etapa_titulo: etapaTitulo,
        titulo: pendTitulo.trim(),
        categoria: pendCategoria,
        descripcion: pendDescripcion.trim(),
        responsable: pendResponsable.trim(),
        disciplina: pendDisciplina,
        estado: 'ABIERTO' as PunchEstado,
        fecha_limite: pendFechaLimite || null,
        fecha_cierre: null,
        cerrado_por: null,
        evidencias: pendEvidencias,
        ncr_referencia: pendNcrReferencia.trim() || null,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName || 'Engineer',
      });
      toast({ title: 'PENDIENTE REGISTRADO', description: `${numero} — "${pendTitulo.trim()}"` });
      resetPendienteForm();
      setIsAddingPendiente(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPendienteSaving(false);
    }
  };

  const handleUpdatePendienteEstado = async (itemId: string, nuevoEstado: PunchEstado) => {
    if (!firestore || !selectedEquipo) return;
    try {
      const updates: Record<string, any> = {
        estado: nuevoEstado,
        updatedAt: new Date().toISOString(),
      };
      if (nuevoEstado === 'CERRADO') {
        updates.fecha_cierre = new Date().toISOString().split('T')[0];
        updates.cerrado_por = userData?.displayName || user?.displayName || 'Engineer';
      } else {
        updates.fecha_cierre = null;
        updates.cerrado_por = null;
      }
      await updateDoc(doc(firestore, 'equipment', selectedEquipo.tag, 'pendientes', itemId), updates);
      toast({ title: PUNCH_ESTADO_LABELS[nuevoEstado], description: `Estado actualizado correctamente.` });
      if (viewPunchItem?.id === itemId) setViewPunchItem((prev) => prev ? { ...prev, estado: nuevoEstado } : null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    }
  };

  const handleExportPunchListExcel = async () => {
    if (!selectedEquipo || !punchItems) return;
    setPunchExporting(true);
    try {
      const { exportPunchListNCS } = await import('@/lib/excel-punch-list-ncs');
      await exportPunchListNCS(
        selectedEquipo.tag,
        selectedEquipo.nombre,
        planMontaje ?? [],
        punchItems,
      );
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR EXCEL', description: err?.message });
    } finally {
      setPunchExporting(false);
    }
  };

  const openHojaVida = (eq: EquipoTecnico) => {
    setSelectedEquipo(eq);
    setActiveTab('hoja-vida');
    resetActivityForm();
    setIsCreatingActivity(false);
  };

  const statusBadge = (status: ActivityStatus) => {
    const colors: Record<ActivityStatus, string> = {
      ABIERTO: 'bg-red-500/10 text-red-400 border-red-500/30',
      EN_PROCESO: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      CERRADO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
    const labels: Record<ActivityStatus, string> = { ABIERTO: 'Abierto', EN_PROCESO: 'En Proceso', CERRADO: 'Cerrado' };
    return (
      <Badge className={cn('rounded-none text-[9px] font-display uppercase tracking-widest border', colors[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const priorityBadge = (p?: NCRPriority) => {
    if (!p) return null;
    const colors: Record<NCRPriority, string> = {
      CRITICA: 'bg-red-600/20 text-red-400 border-red-500/40',
      ALTA: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      MEDIA: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      BAJA: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    };
    return (
      <Badge className={cn('rounded-none text-[9px] font-display uppercase tracking-widest border', colors[p])}>
        {p}
      </Badge>
    );
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-foreground font-mono-tech">
      <TopNav />
      <div className="flex h-[calc(100vh-64px)]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'hoja-vida' && selectedEquipo && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-muted-foreground hover:text-primary"
                  onClick={() => { setActiveTab('equipos'); setSelectedEquipo(null); }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-lg font-display font-black uppercase tracking-widest text-primary">
                  {activeTab === 'hoja-vida' && selectedEquipo ? selectedEquipo.tag : 'QUALITY — NO CONFORMANCES'}
                </h1>
                <p className="text-[10px] text-muted-foreground font-mono-tech uppercase tracking-widest">
                  {activeTab === 'hoja-vida' && selectedEquipo ? selectedEquipo.nombre : 'Gestión de equipos y no conformidades'}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="rounded-none bg-slate-900 border border-primary/10">
              <TabsTrigger value="equipos" className="rounded-none font-display font-black uppercase tracking-widest text-[10px]">
                <Wrench className="w-3 h-3 mr-1" /> Equipos ({EQUIPOS_TECNICOS.length})
              </TabsTrigger>
              <TabsTrigger
                value="hoja-vida"
                className="rounded-none font-display font-black uppercase tracking-widest text-[10px]"
                disabled={!selectedEquipo}
              >
                <ClipboardList className="w-3 h-3 mr-1" /> Hoja de Vida
              </TabsTrigger>
              <TabsTrigger value="ncr" className="rounded-none font-display font-black uppercase tracking-widest text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-1" /> No Conformidades
              </TabsTrigger>
            </TabsList>

            {/* ── TAB EQUIPOS ─────────────────────────────────────────────── */}
            <TabsContent value="equipos" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar TAG, nombre, proveedor, marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  />
                </div>
                <Select value={filterWBS} onValueChange={setFilterWBS}>
                  <SelectTrigger className="w-[280px] rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Filtrar por WBS" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20 max-h-72">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todos los grupos WBS</SelectItem>
                    {WBS_GRUPOS.map((wbs) => (
                      <SelectItem key={wbs} value={wbs} className="font-mono-tech text-[10px]">{wbs}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant="outline" className="rounded-none font-display font-black text-[10px] uppercase tracking-widest border-primary/30 text-primary/70 self-center px-3 h-9 flex items-center">
                  {filteredEquipos.length} equipos
                </Badge>
              </div>

              <Card className="rounded-none border-primary/10 bg-slate-900/50">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-primary/10 hover:bg-transparent">
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60 w-12">ITEM</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">TAG</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">NOMBRE</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">PROVEEDOR</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">MARCA / MODELO</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">ESTADO PROVEEDOR</TableHead>
                        <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">GRUPO WBS</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipos.slice(0, 200).map((eq) => (
                        <TableRow
                          key={eq.tag}
                          className="border-primary/5 hover:bg-primary/5 cursor-pointer transition-colors"
                          onClick={() => openHojaVida(eq)}
                        >
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{eq.item}</TableCell>
                          <TableCell className="font-mono-tech text-[11px] text-primary font-bold">{eq.tag}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] max-w-[240px] truncate">{eq.nombre}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{eq.proveedor !== 'N/A' && eq.proveedor ? eq.proveedor : '—'}</TableCell>
                          <TableCell className="font-mono-tech text-[10px] text-muted-foreground">
                            {[eq.marca, eq.modelo].filter(v => v && v !== 'N/A').join(' / ') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-none text-[8px] border-primary/20 text-primary/60 font-display uppercase">
                              {eq.estado_proveedor || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono-tech text-[9px] text-muted-foreground/60 max-w-[140px] truncate">
                            {eq.sub_wbs.replace('WBS ', '')}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredEquipos.length > 200 && (
                  <div className="p-3 text-center text-[10px] text-muted-foreground font-mono-tech border-t border-primary/10">
                    Mostrando 200 de {filteredEquipos.length}. Refine la búsqueda para ver más.
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ── TAB HOJA DE VIDA ─────────────────────────────────────────── */}
            <TabsContent value="hoja-vida" className="space-y-4 mt-4">
              {!selectedEquipo ? (
                <div className="text-center py-20 text-muted-foreground font-mono-tech text-[11px]">
                  Seleccione un equipo en la pestaña EQUIPOS
                </div>
              ) : (
                <>
                  {/* Foto + Especificaciones */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Foto */}
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardContent className="p-4 flex flex-col items-center gap-3">
                        <div className="w-full h-48 bg-slate-800 border border-primary/10 flex items-center justify-center relative overflow-hidden">
                          {equipoDoc?.photoURL ? (
                            <Image src={equipoDoc.photoURL} alt={selectedEquipo.nombre} fill className="object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <ImageIcon className="w-10 h-10 opacity-20" />
                              <span className="text-[9px] font-display uppercase tracking-widest opacity-40">Sin fotografía</span>
                            </div>
                          )}
                        </div>
                        <input ref={equipoPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleEquipoPhotoUpload} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
                          onClick={() => equipoPhotoInputRef.current?.click()}
                          disabled={equipoPhotoUploading || !storage}
                        >
                          {equipoPhotoUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Camera className="w-3 h-3 mr-1" />}
                          {equipoPhotoUploading ? 'Subiendo...' : (storage ? 'Subir Fotografía' : 'Storage no configurado')}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Especificaciones técnicas */}
                    <Card className="rounded-none border-primary/10 bg-slate-900/50 lg:col-span-2">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary">
                          Especificaciones Técnicas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {([
                            ['TAG', selectedEquipo.tag],
                            ['ITEM N°', String(selectedEquipo.item)],
                            ['PAQUETE', selectedEquipo.paquete],
                            ['ESTADO', selectedEquipo.estado],
                            ['CAPACIDAD', selectedEquipo.capacidad],
                            ['PESO (kg)', selectedEquipo.peso_kg],
                            ['ORDEN DE COMPRA', selectedEquipo.orden_compra],
                            ['PROVEEDOR', selectedEquipo.proveedor],
                            ['MARCA', selectedEquipo.marca],
                            ['MODELO', selectedEquipo.modelo],
                            ['ESTADO PROVEEDOR', selectedEquipo.estado_proveedor],
                            ['SERVICIO', selectedEquipo.servicio],
                            ['TIPO ACCIONAMIENTO', selectedEquipo.tipo_accionamiento],
                            ['MÉTODO ARRANQUE', selectedEquipo.metodo_arranque],
                            ['POTENCIA (kW)', selectedEquipo.potencia_kw],
                            ['VOLTAJE (V)', selectedEquipo.voltaje_v],
                            ['CANT. MOTORES', selectedEquipo.cantidad_motores],
                            ['CRITICIDAD POTENCIA', selectedEquipo.criticidad_potencia],
                            ['REV.', selectedEquipo.rev],
                            ['GRUPO WBS', selectedEquipo.sub_wbs.replace('WBS ', '')],
                          ] as [string, string][]).map(([label, value]) => (
                            <div key={label} className="border-b border-primary/5 pb-1.5">
                              <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">{label}</p>
                              <p className="text-[10px] font-mono-tech text-foreground/80 truncate" title={value}>
                                {value && value !== 'N/A' && value !== 'None' && value !== 'TBD' ? value : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Documentos de ingeniería */}
                  {(selectedEquipo.doc_ingenieria || selectedEquipo.pid || selectedEquipo.pfd) && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" /> Documentos de Ingeniería
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedEquipo.doc_ingenieria && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Doc. Ingeniería de Detalles</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.doc_ingenieria}</p>
                          </div>
                        )}
                        {selectedEquipo.pid && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">N° de P&ID</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.pid}</p>
                          </div>
                        )}
                        {selectedEquipo.pfd && (
                          <div>
                            <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">N° de PFD</p>
                            <p className="text-[10px] font-mono-tech text-primary">{selectedEquipo.pfd}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Descripción técnica */}
                  {selectedEquipo.descripcion && selectedEquipo.descripcion !== 'None' && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary">
                          Descripción Técnica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-[11px] font-mono-tech text-foreground/70 whitespace-pre-wrap leading-relaxed">
                          {selectedEquipo.descripcion}
                        </p>
                        {selectedEquipo.comentarios && selectedEquipo.comentarios !== 'None' && selectedEquipo.comentarios !== '' && (
                          <p className="text-[10px] font-mono-tech text-primary/60 mt-2 italic border-t border-primary/10 pt-2">
                            Comentarios: {selectedEquipo.comentarios}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── Plan de Montaje + Punch List Integrado ─────────────── */}
                  {selectedEquipo && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Plan de Montaje · Punch List
                          </CardTitle>
                          <p className="text-[8px] font-display uppercase tracking-widest text-primary/40 mt-0.5">
                            BMP · {getEquipoBmpLabel(selectedEquipo)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {planMontaje && planMontaje.length > 0 && punchItems && punchItems.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20 h-7 px-3"
                              onClick={handleExportPunchListExcel}
                              disabled={punchExporting}
                            >
                              {punchExporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
                              Punch XLS
                            </Button>
                          )}
                          {planMontaje && planMontaje.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20 h-7 px-3"
                              onClick={handleExportPlanMontajeExcel}
                              disabled={planExporting}
                            >
                              {planExporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
                              Plan XLS
                            </Button>
                          )}
                          {isOwner && !planLoading && (
                            <Button
                              size="sm"
                              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground h-7 px-3"
                              onClick={handleSeedPlan}
                              disabled={planSeeding}
                              title={planMontaje && planMontaje.length > 0 ? 'Re-inicializar plan (borra datos actuales)' : 'Inicializar plan de montaje'}
                            >
                              {planSeeding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                              {planMontaje && planMontaje.length > 0 ? 'Re-init' : 'Inicializar'}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {planLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : !planMontaje || planMontaje.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground font-mono-tech text-[10px]">
                            {isOwner
                              ? 'Plan de montaje no inicializado. Use el botón "Inicializar Plan".'
                              : 'Plan de montaje aún no disponible para este equipo.'}
                          </div>
                        ) : (
                          <>
                            {/* ── Dashboard de progreso ──────────────────────── */}
                            <div className="mb-4 p-3 bg-slate-950/80 border border-primary/10">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[28px] font-display font-black text-primary leading-none">{avanceCalculado}%</span>
                                  <span className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Avance Global</span>
                                  {isOwner && !planLoading && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="ml-3 rounded-none font-display font-black uppercase tracking-widest text-[9px] border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 h-6 px-2"
                                      onClick={handleSeedPlan}
                                      disabled={planSeeding}
                                      title={planMontaje && planMontaje.length > 0 ? 'Re-inicializar plan con etapas BMP actualizadas (borra datos actuales)' : 'Inicializar plan de montaje'}
                                    >
                                      {planSeeding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                                      {planMontaje && planMontaje.length > 0 ? 'Re-init Plan BMP' : 'Inicializar Plan'}
                                    </Button>
                                  )}
                                </div>
                                <div className="flex items-center gap-5">
                                  {[
                                    { label: 'Completadas', count: planMontaje.filter(e => e.estado === 'Completado').length, color: 'text-emerald-400', dot: 'bg-emerald-500' },
                                    { label: 'En Proceso',  count: planMontaje.filter(e => e.estado === 'En Proceso').length,  color: 'text-yellow-400',  dot: 'bg-yellow-500'  },
                                    { label: 'Pendientes',  count: planMontaje.filter(e => e.estado === 'Pendiente').length,   color: 'text-slate-400',   dot: 'bg-slate-600'   },
                                    { label: 'Punch Abiertos', count: (punchItems ?? []).filter(p => p.estado !== 'CERRADO').length, color: 'text-red-400', dot: 'bg-red-500' },
                                  ].map(({ label, count, color, dot }) => (
                                    <div key={label} className="text-center min-w-[44px]">
                                      <div className={cn('text-[18px] font-display font-black leading-none', color)}>{count}</div>
                                      <div className="flex items-center justify-center gap-1 mt-0.5">
                                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
                                        <span className="text-[6.5px] font-display uppercase tracking-widest text-muted-foreground">{label}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Barra segmentada por etapa */}
                              <div className="flex h-4 w-full gap-px">
                                {planMontaje.map((etapa) => {
                                  const segColor =
                                    etapa.estado === 'Completado' ? 'bg-emerald-500' :
                                    etapa.estado === 'En Proceso' ? 'bg-yellow-500' :
                                    'bg-slate-700/60';
                                  return (
                                    <div
                                      key={etapa.id}
                                      className={cn('h-full relative group cursor-default transition-all duration-500 overflow-hidden', segColor)}
                                      style={{ width: `${etapa.peso_porcentual}%` }}
                                      title={`Etapa ${etapa.numero_etapa}: ${etapa.titulo} — ${etapa.peso_porcentual}% — ${etapa.estado}`}
                                    >
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <span className="text-[6px] font-display font-black text-white leading-none drop-shadow">
                                          {etapa.peso_porcentual}%
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Leyenda */}
                              <div className="flex items-center gap-4 mt-1.5">
                                {[
                                  { label: 'Completado', color: 'bg-emerald-500' },
                                  { label: 'En Proceso (50%)', color: 'bg-yellow-500' },
                                  { label: 'Pendiente', color: 'bg-slate-700/60' },
                                ].map(({ label, color }) => (
                                  <span key={label} className="flex items-center gap-1 text-[7px] font-mono-tech text-muted-foreground">
                                    <span className={cn('w-2 h-2 inline-block flex-shrink-0', color)} />
                                    {label}
                                  </span>
                                ))}
                                <span className="ml-auto text-[7px] font-mono-tech text-muted-foreground/50">
                                  Hover sobre segmento para ver peso %
                                </span>
                              </div>
                            </div>

                            {/* ── Accordion de etapas ──────────────────────────── */}
                            <div className="space-y-1">
                              {planMontaje.map((etapa) => {
                                const etapaPunch = (punchItems ?? []).filter(p => p.etapa_numero === etapa.numero_etapa);
                                const etapaAbiertos = etapaPunch.filter(p => p.estado !== 'CERRADO').length;
                                const isExpanded = expandedEtapas.has(etapa.id ?? '');
                                const isHistorialExpanded = expandedHistoriales.has(etapa.id ?? '');
                                const isEditing = editingEtapaId === etapa.id;
                                const historial = [...(etapa.historial ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));

                                const toggleExpand = () => {
                                  const id = etapa.id ?? '';
                                  setExpandedEtapas(prev => {
                                    const next = new Set(prev);
                                    next.has(id) ? next.delete(id) : next.add(id);
                                    return next;
                                  });
                                };
                                const toggleHistorial = (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  const id = etapa.id ?? '';
                                  setExpandedHistoriales(prev => {
                                    const next = new Set(prev);
                                    next.has(id) ? next.delete(id) : next.add(id);
                                    return next;
                                  });
                                };

                                return (
                                  <div key={etapa.id} className={cn(
                                    'border transition-colors',
                                    etapa.estado === 'Completado' ? 'border-emerald-500/20' :
                                    etapa.estado === 'En Proceso' ? 'border-yellow-500/20' :
                                    'border-primary/10'
                                  )}>
                                    {/* ── Fila cabecera: siempre visible, clic expande ── */}
                                    <div
                                      className={cn(
                                        'flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors select-none',
                                        etapa.estado === 'Completado' ? 'bg-emerald-500/5 hover:bg-emerald-500/10' :
                                        etapa.estado === 'En Proceso' ? 'bg-yellow-500/5 hover:bg-yellow-500/10' :
                                        'bg-slate-950/60 hover:bg-slate-900/80'
                                      )}
                                      onClick={toggleExpand}
                                    >
                                      {/* Barra lateral de estado */}
                                      <div className={cn(
                                        'w-0.5 self-stretch flex-shrink-0 rounded-full',
                                        etapa.estado === 'Completado' ? 'bg-emerald-500' :
                                        etapa.estado === 'En Proceso' ? 'bg-yellow-500' :
                                        'bg-slate-600'
                                      )} />
                                      {/* Número */}
                                      <span className="text-[10px] font-display font-black text-primary/25 w-5 flex-shrink-0 text-right tabular-nums">
                                        {String(etapa.numero_etapa).padStart(2, '0')}
                                      </span>
                                      {/* Título */}
                                      <span className="text-[10px] font-mono-tech font-bold text-foreground/90 flex-1 min-w-0 truncate">
                                        {etapa.titulo}
                                      </span>
                                      {/* Badges + acciones */}
                                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <Badge className="rounded-none text-[7px] font-display border bg-primary/10 text-primary/50 border-primary/15 px-1.5">
                                          {etapa.peso_porcentual}%
                                        </Badge>
                                        <Badge className={cn('rounded-none text-[7px] font-display border px-1.5', ETAPA_ESTADO_COLORS[etapa.estado])}>
                                          {etapa.estado}
                                        </Badge>
                                        {/* Punch badge */}
                                        {etapaPunch.length > 0 ? (
                                          <span className={cn(
                                            'flex items-center gap-1 px-1.5 text-[7px] font-display uppercase tracking-widest border',
                                            etapaAbiertos > 0
                                              ? 'bg-red-500/10 text-red-400 border-red-500/25'
                                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                          )}>
                                            <CheckSquare className="w-2.5 h-2.5" />
                                            {etapaAbiertos > 0 ? `${etapaAbiertos} abierto${etapaAbiertos > 1 ? 's' : ''}` : `${etapaPunch.length} ✓`}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1 px-1.5 text-[7px] font-display uppercase tracking-widest border border-primary/10 text-primary/25">
                                            <CheckSquare className="w-2.5 h-2.5" />
                                            0
                                          </span>
                                        )}
                                        {/* Historial */}
                                        {historial.length > 0 && (
                                          <button
                                            onClick={toggleHistorial}
                                            className={cn(
                                              'flex items-center gap-1 px-1.5 text-[7px] font-display uppercase tracking-widest border transition-colors',
                                              isHistorialExpanded
                                                ? 'bg-primary/15 text-primary/80 border-primary/30'
                                                : 'bg-primary/5 text-primary/35 border-primary/12 hover:bg-primary/10'
                                            )}
                                          >
                                            <History className="w-2.5 h-2.5" />
                                            {historial.length}
                                          </button>
                                        )}
                                        {/* Editar */}
                                        {user && !isEditing && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setEditingEtapaId(etapa.id ?? null); setEditResponsable(etapa.responsable || ''); setEditObservaciones(etapa.observaciones || ''); }}
                                            className="p-1 text-primary/25 hover:text-primary/70 hover:bg-primary/10 transition-colors"
                                            title="Editar responsable y observaciones"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        )}
                                        {/* Selector de estado */}
                                        <Select
                                          value={etapa.estado}
                                          onValueChange={(v) => etapa.id && handleUpdateEtapa(etapa.id, { estado: v as EtapaEstado })}
                                          disabled={!!planUpdating || !user}
                                        >
                                          <SelectTrigger className="h-6 w-28 rounded-none bg-slate-900/80 border-primary/15 font-mono-tech text-[9px]">
                                            {planUpdating === etapa.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                                          </SelectTrigger>
                                          <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                                            {(['Pendiente', 'En Proceso', 'Completado'] as EtapaEstado[]).map((e) => (
                                              <SelectItem key={e} value={e} className="font-mono-tech text-[11px]">{e}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {/* Agregar punch */}
                                        {user && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); resetPendienteForm(); setPendEtapaNumero(etapa.numero_etapa); setIsAddingPendiente(true); }}
                                            className="p-1 text-orange-400/60 hover:text-orange-300 hover:bg-orange-500/10 transition-colors"
                                            title={`Agregar pendiente a Etapa ${etapa.numero_etapa}`}
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                      {/* Chevron expander */}
                                      <ChevronDown
                                        onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                                        className={cn('w-3.5 h-3.5 text-primary/30 transition-transform duration-200 flex-shrink-0 ml-1 cursor-pointer', isExpanded && 'rotate-180')}
                                      />
                                    </div>

                                    {/* ── Panel expandido ─────────────────────────── */}
                                    {isExpanded && (
                                      <div className="border-t border-primary/10">
                                        {/* Descripción técnica */}
                                        <div className="px-5 py-2.5 bg-slate-950/50">
                                          <p className="text-[9px] font-mono-tech text-muted-foreground leading-relaxed">
                                            {etapa.descripcion}
                                          </p>
                                          {/* Inline edit o datos */}
                                          {isEditing ? (
                                            <div className="mt-2 space-y-2 border border-primary/20 bg-slate-900/60 p-2">
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <label className="text-[7px] font-display font-black uppercase tracking-widest text-primary/40">Responsable</label>
                                                  <Input value={editResponsable} onChange={(e) => setEditResponsable(e.target.value)} className="rounded-none bg-slate-950 border-primary/20 font-mono-tech text-[10px] h-7" placeholder="Nombre del responsable" />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[7px] font-display font-black uppercase tracking-widest text-primary/40">Observaciones</label>
                                                  <Input value={editObservaciones} onChange={(e) => setEditObservaciones(e.target.value)} className="rounded-none bg-slate-950 border-primary/20 font-mono-tech text-[10px] h-7" placeholder="Observaciones de progreso..." />
                                                </div>
                                              </div>
                                              <div className="flex gap-1.5">
                                                <Button size="sm" className="rounded-none h-6 px-2 text-[8px] font-display uppercase tracking-widest bg-primary text-primary-foreground" onClick={() => etapa.id && handleUpdateEtapa(etapa.id, { responsable: editResponsable.trim(), observaciones: editObservaciones.trim() })} disabled={!!planUpdating}>
                                                  {planUpdating === etapa.id ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <Save className="w-2.5 h-2.5 mr-1" />}
                                                  Guardar
                                                </Button>
                                                <Button size="sm" variant="ghost" className="rounded-none h-6 px-2 text-[8px] font-display uppercase tracking-widest text-muted-foreground" onClick={() => setEditingEtapaId(null)}>
                                                  Cancelar
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex flex-wrap gap-4 mt-1.5">
                                              {etapa.responsable && (
                                                <span className="text-[8px] font-mono-tech text-primary/55">
                                                  <span className="text-primary/25 mr-1">Resp:</span>{etapa.responsable}
                                                </span>
                                              )}
                                              {etapa.observaciones && (
                                                <span className="text-[8px] font-mono-tech text-primary/45 italic border-l border-primary/20 pl-2">
                                                  {etapa.observaciones}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* ── Punch list integrado ─────────────────── */}
                                        <div className="border-t border-primary/10 bg-slate-950/70 px-5 py-3">
                                          <div className="flex items-center justify-between mb-2.5">
                                            <span className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 flex items-center gap-1.5">
                                              <CheckSquare className="w-2.5 h-2.5 text-primary/40" />
                                              Punch List
                                              {etapaPunch.length > 0 && (
                                                <span className={cn('font-normal normal-case tracking-normal ml-1', etapaAbiertos > 0 ? 'text-red-400/70' : 'text-emerald-400/70')}>
                                                  — {etapaAbiertos > 0 ? `${etapaAbiertos} abierto${etapaAbiertos > 1 ? 's' : ''} · ${etapaPunch.length} total` : `${etapaPunch.length} cerrado${etapaPunch.length > 1 ? 's' : ''} ✓`}
                                                </span>
                                              )}
                                            </span>
                                            {user && (
                                              <Button size="sm" variant="ghost" className="h-6 px-2 text-orange-400/70 hover:text-orange-300 hover:bg-orange-500/10 text-[8px] font-display uppercase tracking-widest" onClick={() => { resetPendienteForm(); setPendEtapaNumero(etapa.numero_etapa); setIsAddingPendiente(true); }}>
                                                <Plus className="w-2.5 h-2.5 mr-1" /> Agregar
                                              </Button>
                                            )}
                                          </div>
                                          {etapaPunch.length === 0 ? (
                                            <p className="text-[9px] font-mono-tech text-muted-foreground/40 text-center py-3 border border-dashed border-primary/10">
                                              Sin pendientes — Etapa limpia
                                            </p>
                                          ) : (
                                            <div className="space-y-1">
                                              {etapaPunch.map((item) => (
                                                <PunchItemRow
                                                  key={item.id}
                                                  item={item as PunchItem & { id: string }}
                                                  isOwner={isOwner}
                                                  onView={() => setViewPunchItem(item as PunchItem & { id: string })}
                                                  onUpdateEstado={handleUpdatePendienteEstado}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* ── Panel historial (toggle independiente) ─── */}
                                    {isHistorialExpanded && historial.length > 0 && (
                                      <div className="border-t border-primary/10 bg-slate-900/30 px-5 py-3">
                                        <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/30 mb-2">
                                          Historial de Actualizaciones
                                        </p>
                                        <div className="space-y-1.5">
                                          {historial.map((h, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-[9px] font-mono-tech border-l-2 border-primary/15 pl-2">
                                              <span className="text-muted-foreground/50 flex-shrink-0 w-28 text-[8px]">
                                                {new Date(h.fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                              <Badge className={cn('rounded-none text-[7px] font-display border px-1 flex-shrink-0', ETAPA_ESTADO_COLORS[h.estado])}>
                                                {h.estado}
                                              </Badge>
                                              {h.responsable && <span className="text-foreground/60 flex-shrink-0">{h.responsable}</span>}
                                              {h.observaciones && <span className="text-muted-foreground italic flex-1 truncate">— {h.observaciones}</span>}
                                              <span className="text-muted-foreground/30 flex-shrink-0 text-[8px]">{h.actualizadoPor}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Punch items sin etapa asignada */}
                            {punchItems && punchItems.filter(p => !p.etapa_numero).length > 0 && (
                              <div className="mt-3 border border-dashed border-primary/15 px-4 py-3">
                                <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/30 mb-2 flex items-center gap-1.5">
                                  <CheckSquare className="w-2.5 h-2.5" /> Sin Etapa Asignada
                                  <span className="font-normal normal-case tracking-normal text-muted-foreground ml-1">
                                    — {punchItems.filter(p => !p.etapa_numero).length} ítem(s)
                                  </span>
                                </p>
                                <div className="space-y-1">
                                  {punchItems.filter(p => !p.etapa_numero).map((item) => (
                                    <PunchItemRow
                                      key={item.id}
                                      item={item as PunchItem & { id: string }}
                                      isOwner={isOwner}
                                      onView={() => setViewPunchItem(item as PunchItem & { id: string })}
                                      onUpdateEstado={handleUpdatePendienteEstado}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* ── (bloque eliminado: Punch List ya integrado en accordion) ── */}
                  {false && selectedEquipo && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <CheckSquare className="w-3.5 h-3.5" /> (INTEGRADO EN PLAN)
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {/* BLOQUE ANTIGUO — eliminado: el punch list ahora vive dentro del accordion de etapas */}
                        {(() => {
                          const sinEtapa = (punchItems ?? []).filter(p => !p.etapa_numero);
                          const porEtapa = (planMontaje ?? []).map(et => ({
                            etapa: et,
                            items: (punchItems ?? []).filter(p => p.etapa_numero === et.numero_etapa),
                          })).filter(g => g.items.length > 0);

                          return (
                            <>
                              {porEtapa.map(({ etapa, items }) => (
                                <div key={etapa.id} className="space-y-1.5">
                                  <div className="flex items-center gap-2 pb-1">
                                    <span className="text-[8px] font-display font-black uppercase tracking-widest text-primary/50">
                                      Etapa {String(etapa.numero_etapa).padStart(2, '0')} — {etapa.titulo}
                                    </span>
                                    <div className="flex-1 h-px bg-primary/10" />
                                  </div>
                                  {items.map((item) => (
                                    <PunchItemRow key={item.id} item={item} isOwner={isOwner} onView={() => setViewPunchItem(item as PunchItem & { id: string })} onUpdateEstado={handleUpdatePendienteEstado} />
                                  ))}
                                </div>
                              ))}
                              {sinEtapa.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 pb-1">
                                    <span className="text-[8px] font-display font-black uppercase tracking-widest text-primary/30">Sin Etapa Asignada</span>
                                    <div className="flex-1 h-px bg-primary/10" />
                                  </div>
                                  {sinEtapa.map((item) => (
                                    <PunchItemRow key={item.id} item={item} isOwner={isOwner} onView={() => setViewPunchItem(item as PunchItem & { id: string })} onUpdateEstado={handleUpdatePendienteEstado} />
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actividades */}
                  <Card className="rounded-none border-primary/10 bg-slate-900/50">
                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5" /> Historial de Actividades
                      </CardTitle>
                      <Button
                        size="sm"
                        className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground h-7 px-3"
                        onClick={() => { resetActivityForm(); setIsCreatingActivity(true); }}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Agregar
                      </Button>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      {activitiesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : !activities?.length ? (
                        <div className="text-center py-8 text-muted-foreground font-mono-tech text-[10px]">
                          Sin actividades registradas. Agregue la primera actividad con el botón de arriba.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activities.map((act: any) => (
                            <div
                              key={act.id}
                              className="border border-primary/10 bg-slate-950/50 p-3 flex items-start justify-between gap-3 hover:border-primary/30 transition-colors cursor-pointer"
                              onClick={() => setViewActivity(act)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="rounded-none text-[8px] font-display uppercase tracking-widest border-primary/30 text-primary/70">
                                    {act.tipo}
                                  </Badge>
                                  {statusBadge(act.estado)}
                                  {act.ncr && priorityBadge(act.ncr.prioridad)}
                                </div>
                                <p className="text-[10px] font-mono-tech text-foreground/80 truncate">{act.descripcion}</p>
                                <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground font-mono-tech">
                                  <span>{act.fecha}</span>
                                  <span>·</span>
                                  <span>{act.responsable}</span>
                                  {act.fotoURLs?.length > 0 && (
                                    <><span>·</span><span className="flex items-center gap-1"><Camera className="w-2.5 h-2.5" />{act.fotoURLs.length}</span></>
                                  )}
                                </div>
                              </div>
                              <Eye className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 mt-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ── TAB NO CONFORMIDADES ─────────────────────────────────────── */}
            <TabsContent value="ncr" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total NCRs', value: (allNcrs || []).length, icon: AlertTriangle, color: 'text-primary' },
                  { label: 'Abiertas', value: (allNcrs || []).filter((n: any) => n.estado === 'ABIERTO').length, icon: XCircle, color: 'text-red-400' },
                  { label: 'En Proceso', value: (allNcrs || []).filter((n: any) => n.estado === 'EN_PROCESO').length, icon: Clock, color: 'text-yellow-400' },
                  { label: 'Cerradas', value: (allNcrs || []).filter((n: any) => n.estado === 'CERRADO').length, icon: CheckCircle2, color: 'text-emerald-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="rounded-none border-primary/10 bg-slate-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className={cn('w-5 h-5', color)} />
                      <div>
                        <p className="text-[8px] font-display font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                        <p className={cn('text-xl font-display font-black', color)}>{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar NCR, equipo, descripción..."
                    value={ncrSearch}
                    onChange={(e) => setNcrSearch(e.target.value)}
                    className="pl-9 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  />
                </div>
                <Select value={ncrFilterStatus} onValueChange={(v) => setNcrFilterStatus(v as any)}>
                  <SelectTrigger className="w-36 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todos</SelectItem>
                    {ACTIVITY_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="font-mono-tech text-[11px]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ncrFilterPriority} onValueChange={(v) => setNcrFilterPriority(v as any)}>
                  <SelectTrigger className="w-36 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    <SelectItem value="ALL" className="font-mono-tech text-[11px]">Todas</SelectItem>
                    {NCR_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value} className="font-mono-tech text-[11px]">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {ncrsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : !filteredNcrs.length ? (
                <Card className="rounded-none border-primary/10 bg-slate-900/50">
                  <CardContent className="py-12 text-center text-muted-foreground font-mono-tech text-[10px]">
                    {(allNcrs || []).length === 0
                      ? 'Sin no conformidades. Las NCRs creadas en la Hoja de Vida aparecerán aquí.'
                      : 'No se encontraron NCRs con los filtros aplicados.'}
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-none border-primary/10 bg-slate-900/50">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-primary/10 hover:bg-transparent">
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">N° NCR</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">EQUIPO</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">DESCRIPCIÓN</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">FECHA</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">PRIORIDAD</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">ESTADO</TableHead>
                          <TableHead className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">RESPONSABLE</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNcrs.map((ncr: any) => (
                          <TableRow key={ncr.id} className="border-primary/5 hover:bg-primary/5 cursor-pointer" onClick={() => setViewActivity(ncr)}>
                            <TableCell className="font-mono-tech text-[10px] text-primary font-bold">{ncr.ncr?.numero || '—'}</TableCell>
                            <TableCell className="font-mono-tech text-[10px]">
                              <div>{ncr.equipoTag}</div>
                              <div className="text-[9px] text-muted-foreground truncate max-w-[140px]">{ncr.equipoNombre}</div>
                            </TableCell>
                            <TableCell className="font-mono-tech text-[10px] max-w-[200px] truncate">{ncr.descripcion}</TableCell>
                            <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{ncr.fecha}</TableCell>
                            <TableCell>{priorityBadge(ncr.ncr?.prioridad)}</TableCell>
                            <TableCell>{statusBadge(ncr.estado)}</TableCell>
                            <TableCell className="font-mono-tech text-[10px] text-muted-foreground">{ncr.responsable}</TableCell>
                            <TableCell><Eye className="w-3.5 h-3.5 text-muted-foreground/40" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* ── Dialog: Nueva Actividad ───────────────────────────────────────────── */}
      <Dialog
        open={isCreatingActivity}
        onOpenChange={(open) => { if (!open) { setIsCreatingActivity(false); resetActivityForm(); } }}
      >
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary">
              Nueva Actividad — {selectedEquipo?.tag}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Fecha *</Label>
                <Input
                  type="date"
                  value={actFecha}
                  onChange={(e) => setActFecha(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Tipo *</Label>
                <Select value={actTipo} onValueChange={(v) => setActTipo(v as ActivityType)}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="font-mono-tech text-[11px]">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción *</Label>
              <textarea
                value={actDescripcion}
                onChange={(e) => setActDescripcion(e.target.value)}
                rows={3}
                className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                placeholder="Describa la actividad realizada..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Responsable *</Label>
                <Input
                  value={actResponsable}
                  onChange={(e) => setActResponsable(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Estado</Label>
                <Select value={actEstado} onValueChange={(v) => setActEstado(v as ActivityStatus)}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    {ACTIVITY_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value} className="font-mono-tech text-[11px]">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos NCR */}
            {actTipo === 'NCR' && (
              <div className="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <p className="font-display font-black uppercase tracking-widest text-[9px] text-red-400">Datos de No Conformidad</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">N° NCR *</Label>
                    <Input
                      value={ncrNumero}
                      onChange={(e) => setNcrNumero(e.target.value)}
                      className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                      placeholder="NCR-001"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Prioridad</Label>
                    <Select value={ncrPrioridad} onValueChange={(v) => setNcrPrioridad(v as NCRPriority)}>
                      <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                        {NCR_PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value} className="font-mono-tech text-[11px]">{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción NC *</Label>
                  <textarea
                    value={ncrDescripcion}
                    onChange={(e) => setNcrDescripcion(e.target.value)}
                    rows={2}
                    className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Descripción de la no conformidad..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Acción Correctiva</Label>
                  <textarea
                    value={ncrAccion}
                    onChange={(e) => setNcrAccion(e.target.value)}
                    rows={2}
                    className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                    placeholder="Acción correctiva propuesta..."
                  />
                </div>
              </div>
            )}

            {/* Fotos */}
            <div className="space-y-2">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">
                Fotografías de Evidencia ({actFotoURLs.length}/5)
                {!storage && <span className="text-yellow-400 ml-2">— Storage no configurado</span>}
              </Label>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleActivityPhotoAdd} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20 w-full h-9"
                onClick={() => fileInputRef.current?.click()}
                disabled={actUploadingPhotos || actFotoURLs.length >= 5 || !storage}
              >
                {actUploadingPhotos ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                {actUploadingPhotos ? 'Subiendo a Cloud Storage...' : 'Subir Fotografías'}
              </Button>
              {actFotoURLs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {actFotoURLs.map((url, i) => (
                    <div key={i} className="relative w-16 h-16 border border-primary/20">
                      <Image src={url} alt={`foto-${i}`} fill className="object-cover" />
                      <button
                        onClick={() => setActFotoURLs((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => { setIsCreatingActivity(false); resetActivityForm(); }}
              disabled={activitySaving}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground"
              onClick={handleSaveActivity}
              disabled={activitySaving || actUploadingPhotos}
            >
              {activitySaving
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Guardando...</>
                : <><Save className="w-3 h-3 mr-1" /> Guardar Actividad</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nuevo Pendiente ──────────────────────────────────────────── */}
      <Dialog
        open={isAddingPendiente}
        onOpenChange={(open) => { if (!open) { setIsAddingPendiente(false); resetPendienteForm(); } }}
      >
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Nuevo Pendiente — {selectedEquipo?.tag}
              {pendEtapaNumero && (
                <Badge className="rounded-none text-[8px] font-display border bg-primary/10 text-primary/70 border-primary/20 px-1.5">
                  Etapa {pendEtapaNumero}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Título */}
            <div className="space-y-1">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Título del Pendiente *</Label>
              <Input
                value={pendTitulo}
                onChange={(e) => setPendTitulo(e.target.value)}
                className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                placeholder="Ej: Verticalidad columna C-07 fuera de tolerancia"
                maxLength={120}
              />
            </div>

            {/* Categoría + Disciplina + Etapa */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Categoría *</Label>
                <Select value={pendCategoria} onValueChange={(v) => setPendCategoria(v as PunchCategoria)}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    <SelectItem value="A" className="font-mono-tech text-[11px]">A — Crítico (bloquea comisionamiento)</SelectItem>
                    <SelectItem value="B" className="font-mono-tech text-[11px]">B — Mayor (resolver antes de arranque)</SelectItem>
                    <SelectItem value="C" className="font-mono-tech text-[11px]">C — Menor (no bloquea operación)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Disciplina *</Label>
                <Select value={pendDisciplina} onValueChange={setPendDisciplina}>
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                    {PUNCH_DISCIPLINAS.map((d) => (
                      <SelectItem key={d} value={d} className="font-mono-tech text-[11px]">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Etapa Montaje</Label>
                <Select
                  value={pendEtapaNumero ? String(pendEtapaNumero) : '__none__'}
                  onValueChange={(v) => setPendEtapaNumero(v === '__none__' ? null : Number(v))}
                >
                  <SelectTrigger className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9">
                    <SelectValue placeholder="Sin etapa" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none bg-slate-950 border-primary/20 max-h-60">
                    <SelectItem value="__none__" className="font-mono-tech text-[11px]">— Sin etapa</SelectItem>
                    {(planMontaje ?? []).map((et) => (
                      <SelectItem key={et.numero_etapa} value={String(et.numero_etapa)} className="font-mono-tech text-[10px]">
                        {String(et.numero_etapa).padStart(2, '0')} — {et.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción detallada */}
            <div className="space-y-1">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción Técnica Detallada</Label>
              <textarea
                value={pendDescripcion}
                onChange={(e) => setPendDescripcion(e.target.value)}
                rows={3}
                className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                placeholder="Descripción técnica del hallazgo, tolerancias incumplidas, condición observada..."
              />
            </div>

            {/* Responsable + Fecha Límite + NCR Ref */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Responsable *</Label>
                <Input
                  value={pendResponsable}
                  onChange={(e) => setPendResponsable(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Fecha Límite</Label>
                <Input
                  type="date"
                  value={pendFechaLimite}
                  onChange={(e) => setPendFechaLimite(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Ref. NCR (opcional)</Label>
                <Input
                  value={pendNcrReferencia}
                  onChange={(e) => setPendNcrReferencia(e.target.value)}
                  className="rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[11px] h-9"
                  placeholder="NCR-001"
                />
              </div>
            </div>

            {/* Evidencias: Fotos y PDFs */}
            <div className="space-y-2 border border-primary/10 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">
                  Evidencias — Fotos y Documentos PDF ({pendEvidencias.length}/10)
                  {!storage && <span className="text-yellow-400 ml-2">— Storage no configurado</span>}
                </Label>
              </div>
              <input
                ref={pendFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={handlePunchFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20 w-full h-9"
                onClick={() => pendFileInputRef.current?.click()}
                disabled={pendUploadingFiles || pendEvidencias.length >= 10 || !storage}
              >
                {pendUploadingFiles
                  ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Subiendo a Cloud Storage...</>
                  : <><Upload className="w-3 h-3 mr-1" /> Adjuntar Fotos o PDF</>
                }
              </Button>
              {pendEvidencias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {pendEvidencias.map((ev, i) => (
                    <div
                      key={ev.id}
                      className="relative border border-primary/20 bg-slate-900"
                      title={ev.nombre}
                    >
                      {ev.tipo === 'foto' ? (
                        <div className="w-16 h-16 relative">
                          <Image src={ev.url} alt={ev.nombre} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 flex flex-col items-center justify-center gap-1 bg-red-500/10">
                          <FileText className="w-5 h-5 text-red-400" />
                          <span className="text-[7px] font-mono-tech text-red-400/70 text-center px-1 leading-tight truncate w-full px-1">PDF</span>
                        </div>
                      )}
                      <button
                        onClick={() => setPendEvidencias((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full w-4 h-4 flex items-center justify-center z-10"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[8px] text-muted-foreground font-mono-tech">
                Formatos aceptados: JPG, PNG, WEBP, PDF. Máx. 10 MB por archivo. Las evidencias quedan almacenadas en Firebase Storage.
              </p>
            </div>

          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => { setIsAddingPendiente(false); resetPendienteForm(); }}
              disabled={pendienteSaving}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground"
              onClick={handleSavePendiente}
              disabled={pendienteSaving || pendUploadingFiles}
            >
              {pendienteSaving
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Guardando...</>
                : <><Save className="w-3 h-3 mr-1" /> Registrar Pendiente</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Pendiente ─────────────────────────────────────────────── */}
      <Dialog open={!!viewPunchItem} onOpenChange={(open) => { if (!open) setViewPunchItem(null); }}>
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              {viewPunchItem?.numero_item} — {selectedEquipo?.tag}
            </DialogTitle>
          </DialogHeader>
          {viewPunchItem && (
            <div className="space-y-4 py-2">
              {/* Badges de estado */}
              <div className="flex flex-wrap gap-2">
                <Badge className={cn('rounded-none text-[8px] font-display border px-2', PUNCH_CATEGORIA_COLORS[viewPunchItem.categoria])}>
                  Prioridad {viewPunchItem.categoria}
                </Badge>
                <Badge className={cn('rounded-none text-[8px] font-display border px-2', PUNCH_ESTADO_COLORS[viewPunchItem.estado])}>
                  {PUNCH_ESTADO_LABELS[viewPunchItem.estado]}
                </Badge>
                <Badge variant="outline" className="rounded-none text-[8px] font-display border-primary/20 text-primary/60 px-2">
                  {viewPunchItem.disciplina}
                </Badge>
                {viewPunchItem.etapa_numero && (
                  <Badge variant="outline" className="rounded-none text-[8px] font-display border-primary/20 text-primary/60 px-2">
                    Etapa {viewPunchItem.etapa_numero}
                  </Badge>
                )}
                {viewPunchItem.ncr_referencia && (
                  <Badge className="rounded-none text-[8px] font-display border bg-red-500/10 text-red-400 border-red-500/30 px-2">
                    NCR: {viewPunchItem.ncr_referencia}
                  </Badge>
                )}
              </div>

              {/* Título */}
              <div>
                <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Título</p>
                <p className="text-[13px] font-mono-tech font-bold text-foreground/90">{viewPunchItem.titulo}</p>
              </div>

              {/* Etapa */}
              {viewPunchItem.etapa_titulo && (
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Etapa de Montaje</p>
                  <p className="text-[10px] font-mono-tech text-primary/70">{String(viewPunchItem.etapa_numero).padStart(2, '0')} — {viewPunchItem.etapa_titulo}</p>
                </div>
              )}

              {/* Descripción */}
              {viewPunchItem.descripcion && (
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Descripción Técnica</p>
                  <p className="text-[11px] font-mono-tech text-foreground/80 whitespace-pre-wrap leading-relaxed">{viewPunchItem.descripcion}</p>
                </div>
              )}

              {/* Metadatos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Responsable</p>
                  <p className="text-[11px] font-mono-tech">{viewPunchItem.responsable}</p>
                </div>
                {viewPunchItem.fecha_limite && (
                  <div>
                    <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Fecha Límite</p>
                    <p className="text-[11px] font-mono-tech text-yellow-400">{viewPunchItem.fecha_limite}</p>
                  </div>
                )}
                {viewPunchItem.fecha_cierre && (
                  <div>
                    <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Fecha Cierre</p>
                    <p className="text-[11px] font-mono-tech text-emerald-400">{viewPunchItem.fecha_cierre}</p>
                  </div>
                )}
                {viewPunchItem.cerrado_por && (
                  <div>
                    <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Cerrado Por</p>
                    <p className="text-[11px] font-mono-tech">{viewPunchItem.cerrado_por}</p>
                  </div>
                )}
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Registrado Por</p>
                  <p className="text-[11px] font-mono-tech">{viewPunchItem.authorName}</p>
                </div>
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Fecha Registro</p>
                  <p className="text-[11px] font-mono-tech text-muted-foreground">
                    {new Date(viewPunchItem.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Evidencias: Fotos y PDFs */}
              {viewPunchItem.evidencias && viewPunchItem.evidencias.length > 0 && (
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-2">
                    Evidencias ({viewPunchItem.evidencias.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {viewPunchItem.evidencias.map((ev) => (
                      ev.tipo === 'foto' ? (
                        <a
                          key={ev.id}
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-full h-24 block border border-primary/20 hover:border-primary/60 transition-colors group"
                          title={ev.nombre}
                        >
                          <Image src={ev.url} alt={ev.nombre} fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </a>
                      ) : (
                        <a
                          key={ev.id}
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center gap-1 h-24 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40 transition-colors p-2"
                          title={ev.nombre}
                        >
                          <FileText className="w-6 h-6 text-red-400" />
                          <span className="text-[8px] font-mono-tech text-red-400/70 text-center leading-tight break-all line-clamp-2">
                            {ev.nombre}
                          </span>
                        </a>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones de estado (solo owner) */}
              {isOwner && viewPunchItem.estado !== 'CERRADO' && (
                <div className="border border-primary/10 bg-slate-900/50 p-3 space-y-2">
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Actualizar Estado</p>
                  <div className="flex gap-2">
                    {viewPunchItem.estado === 'ABIERTO' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 h-8"
                        onClick={() => handleUpdatePendienteEstado(viewPunchItem.id, 'EN_GESTION')}
                      >
                        <Clock className="w-3 h-3 mr-1" /> Marcar En Gestión
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-emerald-600 text-white hover:bg-emerald-500 h-8"
                      onClick={() => { handleUpdatePendienteEstado(viewPunchItem.id, 'CERRADO'); setViewPunchItem(null); }}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Cerrar Pendiente
                    </Button>
                    {viewPunchItem.estado === 'EN_GESTION' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-none font-display font-black uppercase tracking-widest text-[9px] text-muted-foreground h-8"
                        onClick={() => handleUpdatePendienteEstado(viewPunchItem.id, 'ABIERTO')}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => setViewPunchItem(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Ver Actividad ─────────────────────────────────────────────── */}
      <Dialog open={!!viewActivity} onOpenChange={(open) => { if (!open) setViewActivity(null); }}>
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary flex items-center gap-2">
              {viewActivity?.tipo === 'NCR' && <AlertTriangle className="w-4 h-4 text-red-400" />}
              {viewActivity?.tipo} — {viewActivity?.fecha}
            </DialogTitle>
          </DialogHeader>
          {viewActivity && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap gap-2">
                {statusBadge(viewActivity.estado)}
                {viewActivity.ncr && priorityBadge(viewActivity.ncr.prioridad)}
                {viewActivity.equipoTag && (
                  <Badge variant="outline" className="rounded-none text-[9px] font-display uppercase tracking-widest border-primary/30 text-primary/70">
                    {viewActivity.equipoTag}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Descripción</p>
                <p className="text-[11px] font-mono-tech text-foreground/80 whitespace-pre-wrap">{viewActivity.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Responsable</p>
                  <p className="text-[11px] font-mono-tech">{viewActivity.responsable}</p>
                </div>
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Registrado por</p>
                  <p className="text-[11px] font-mono-tech">{viewActivity.authorName}</p>
                </div>
              </div>
              {viewActivity.ncr && (
                <div className="border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                  <p className="font-display font-black uppercase tracking-widest text-[9px] text-red-400">No Conformidad</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">N° NCR</p>
                      <p className="text-[11px] font-mono-tech text-primary">{viewActivity.ncr.numero}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40">Prioridad</p>
                      {priorityBadge(viewActivity.ncr.prioridad)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Descripción NC</p>
                    <p className="text-[10px] font-mono-tech text-foreground/70 whitespace-pre-wrap">{viewActivity.ncr.descripcion}</p>
                  </div>
                  {viewActivity.ncr.accionCorrectiva && (
                    <div>
                      <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-1">Acción Correctiva</p>
                      <p className="text-[10px] font-mono-tech text-foreground/70 whitespace-pre-wrap">{viewActivity.ncr.accionCorrectiva}</p>
                    </div>
                  )}
                </div>
              )}
              {viewActivity.fotoURLs?.length > 0 && (
                <div>
                  <p className="text-[8px] font-display font-black uppercase tracking-widest text-primary/40 mb-2">Fotografías</p>
                  <div className="grid grid-cols-3 gap-2">
                    {viewActivity.fotoURLs.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative w-full h-24 block border border-primary/20 hover:border-primary/50 transition-colors">
                        <Image src={url} alt={`evidencia-${i}`} fill className="object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none font-display font-black uppercase tracking-widest text-[9px] border-primary/20"
              onClick={() => setViewActivity(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
