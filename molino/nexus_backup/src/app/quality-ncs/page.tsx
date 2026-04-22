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
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { EQUIPOS_TECNICOS, WBS_GRUPOS, type EquipoTecnico } from '@/lib/equipment-data';
import Image from 'next/image';

// ─── Plan de Montaje — Tipos y datos estáticos ────────────────────────────────
type EtapaEstado = 'Pendiente' | 'En Proceso' | 'Completado';

interface EtapaMontaje {
  id?: string;
  numero_etapa: number;
  titulo: string;
  descripcion: string;
  peso_porcentual: number;
  estado: EtapaEstado;
  responsable: string;
  observaciones: string;
}

type PunchCategoria = 'A' | 'B' | 'C';
type PunchEstado = 'ABIERTO' | 'CERRADO';

interface PunchItem {
  id?: string;
  numero_item: string;
  categoria: PunchCategoria;
  descripcion: string;
  responsable: string;
  disciplina: string;
  estado: PunchEstado;
  fecha_limite: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

const PLANES_MONTAJE: Record<string, Omit<EtapaMontaje, 'id'>[]> = {
  'ESP-CON-001': [
    {
      numero_etapa: 1,
      titulo: 'Recepción, Inspección y Trazabilidad',
      descripcion: 'Verificación de componentes según packing list, inspección de preservación, y revisión dimensional de placas base.',
      peso_porcentual: 3,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 2,
      titulo: 'Verificación Topográfica Inicial',
      descripcion: 'Liberación topográfica de la fundación civil, pedestales y pernos de anclaje (Planos Metso OU602289964).',
      peso_porcentual: 2,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 3,
      titulo: 'Montaje de Estructura Soporte',
      descripcion: 'Izaje e instalación de columnas (radiales y centrales), arriostramientos cruzados y nivelación del anillo de compresión.',
      peso_porcentual: 15,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 4,
      titulo: 'Montaje de Piso y Pared del Tanque',
      descripcion: 'Ensamblaje en suelo y elevación de segmentos. Atornillado progresivo con squirter washers y aplicación de sellante en juntas.',
      peso_porcentual: 20,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 5,
      titulo: 'Montaje del Mecanismo de Giro y Elevación',
      descripcion: 'Instalación del reductor de velocidades, anillo giratorio, sistema hidráulico de accionamiento (SAI) y elevador de rastras Mega.',
      peso_porcentual: 15,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 6,
      titulo: 'Ensamble e Instalación del Puente',
      descripcion: 'Armado en piso del puente (precamber), torqueo, izaje en tándem o simple e instalación sobre el tanque.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 7,
      titulo: 'Instalación de Pozo de Alimentación (Feedwell)',
      descripcion: 'Pre-ensamble e instalación del cuerpo del Metso Reactorwell™, puertos Autodil™ e instalación de cabezal de floculante.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 8,
      titulo: 'Instalación de Componentes Internos',
      descripcion: 'Montaje de brazos de rastra (2 largos, 2 cortos), palas, steady bearing (rodamiento del pasador fijo) inferior y scraper.',
      peso_porcentual: 10,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 9,
      titulo: 'Nivelación, Torqueo Final y Tuberías',
      descripcion: 'Nivelación final de brazos de rastra (verificación de tolerancias), cableado e interconexión de Unidad de Potencia Hidráulica (HPU).',
      peso_porcentual: 5,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 10,
      titulo: 'Pre-Comisionamiento (Prueba en Seco)',
      descripcion: 'Giro manual de rastras, encendido de bomba hidráulica, verificación de levantamiento hidráulico y calibración del torque.',
      peso_porcentual: 5,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
    },
    {
      numero_etapa: 11,
      titulo: 'Pre-Comisionamiento (Prueba Húmeda)',
      descripcion: 'Llenado del tanque con agua para prueba de fugas estática (24 h) y verificación del torque de rastra girando sumergido.',
      peso_porcentual: 5,
      estado: 'Pendiente',
      responsable: '',
      observaciones: '',
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

const PUNCH_DISCIPLINAS = ['Mecánica', 'Eléctrica', 'Civil', 'Instrumentación', 'Tubería', 'Otro'];

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
  const [pendDescripcion, setPendDescripcion] = useState('');
  const [pendCategoria, setPendCategoria] = useState<PunchCategoria>('B');
  const [pendResponsable, setPendResponsable] = useState('');
  const [pendDisciplina, setPendDisciplina] = useState('Mecánica');
  const [pendFechaLimite, setPendFechaLimite] = useState('');

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
  const planMontaje: (EtapaMontaje & { id: string })[] | null = planRaw
    ? ([...planRaw].sort((a: any, b: any) => a.numero_etapa - b.numero_etapa) as any)
    : null;

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
      const batch = writeBatch(firestore);
      plan.forEach((etapa) => {
        const ref = doc(collection(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje'));
        batch.set(ref, { ...etapa, createdAt: new Date().toISOString() });
      });
      const equipRef = doc(firestore, 'equipment', selectedEquipo.tag);
      batch.set(equipRef, {
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
      await batch.commit();
      toast({ title: 'PLAN INICIALIZADO', description: `${plan.length} etapas de montaje cargadas en Firestore.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPlanSeeding(false);
    }
  };

  const handleUpdateEtapa = async (etapaId: string, changes: Partial<EtapaMontaje>) => {
    if (!firestore || !selectedEquipo || !planMontaje) return;
    setPlanUpdating(etapaId);
    try {
      await updateDoc(
        doc(firestore, 'equipment', selectedEquipo.tag, 'plan_montaje', etapaId),
        { ...changes, updatedAt: new Date().toISOString() }
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
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPlanUpdating(null);
    }
  };

  // ── Handlers Punch List ──────────────────────────────────────────────────────
  const resetPendienteForm = () => {
    setPendDescripcion('');
    setPendCategoria('B');
    setPendResponsable('');
    setPendDisciplina('Mecánica');
    setPendFechaLimite('');
  };

  const handleSavePendiente = async () => {
    if (!firestore || !selectedEquipo || !user) return;
    if (!pendDescripcion.trim() || !pendResponsable.trim()) {
      toast({ variant: 'destructive', title: 'CAMPOS REQUERIDOS', description: 'Complete descripción y responsable.' });
      return;
    }
    setPendienteSaving(true);
    try {
      const count = (punchItems?.length || 0) + 1;
      const numero = `PL-${selectedEquipo.tag}-${String(count).padStart(3, '0')}`;
      await addDoc(collection(firestore, 'equipment', selectedEquipo.tag, 'pendientes'), {
        numero_item: numero,
        categoria: pendCategoria,
        descripcion: pendDescripcion.trim(),
        responsable: pendResponsable.trim(),
        disciplina: pendDisciplina,
        estado: 'ABIERTO' as PunchEstado,
        fecha_limite: pendFechaLimite || null,
        fecha_cierre: null,
        createdAt: new Date().toISOString(),
        authorId: user.uid,
        authorName: userData?.displayName || user.displayName || 'Engineer',
      });
      toast({ title: 'PENDIENTE REGISTRADO', description: `${numero} agregado al punch list.` });
      resetPendienteForm();
      setIsAddingPendiente(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
    } finally {
      setPendienteSaving(false);
    }
  };

  const handleClosePendiente = async (itemId: string) => {
    if (!firestore || !selectedEquipo) return;
    try {
      await updateDoc(doc(firestore, 'equipment', selectedEquipo.tag, 'pendientes', itemId), {
        estado: 'CERRADO' as PunchEstado,
        fecha_cierre: new Date().toISOString().split('T')[0],
      });
      toast({ title: 'ÍTEM CERRADO', description: 'Pendiente marcado como resuelto.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err?.message });
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

                  {/* ── Plan de Montaje ────────────────────────────────────── */}
                  {selectedEquipo && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <TrendingUp className="w-3.5 h-3.5" /> Plan de Montaje
                          </CardTitle>
                          <p className="text-[8px] font-display uppercase tracking-widest text-primary/40 mt-0.5">
                            BMP · {getEquipoBmpLabel(selectedEquipo)}
                          </p>
                          {planMontaje && planMontaje.length > 0 && (
                            <p className="text-[9px] text-muted-foreground font-mono-tech mt-0.5">
                              Avance global: <span className="text-primary font-bold">{avanceCalculado}%</span>
                              {' '}— {planMontaje.filter(e => e.estado === 'Completado').length}/{planMontaje.length} etapas completadas
                            </p>
                          )}
                        </div>
                        {isOwner && planMontaje !== null && planMontaje.length === 0 && !planLoading && (
                          <Button
                            size="sm"
                            className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground h-7 px-3"
                            onClick={handleSeedPlan}
                            disabled={planSeeding}
                          >
                            {planSeeding ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                            Inicializar Plan
                          </Button>
                        )}
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
                            {/* Barra de progreso global */}
                            <div className="mb-4 p-3 bg-slate-950/60 border border-primary/10">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[8px] font-display font-black uppercase tracking-widest text-primary/50">Avance Global</span>
                                <span className="text-[13px] font-display font-black text-primary">{avanceCalculado}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-800 w-full">
                                <div
                                  className="h-full bg-primary transition-all duration-700"
                                  style={{ width: `${avanceCalculado}%` }}
                                />
                              </div>
                              <div className="flex gap-4 mt-2">
                                {(['Pendiente', 'En Proceso', 'Completado'] as EtapaEstado[]).map((est) => (
                                  <span key={est} className="text-[8px] font-mono-tech text-muted-foreground">
                                    <span className="font-bold text-foreground/60">
                                      {planMontaje.filter(e => e.estado === est).length}
                                    </span> {est}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Tabla de etapas */}
                            <div className="space-y-1.5">
                              {planMontaje.map((etapa) => (
                                <div
                                  key={etapa.id}
                                  className={cn(
                                    'border p-3 flex items-start justify-between gap-3 transition-colors',
                                    etapa.estado === 'Completado'
                                      ? 'border-emerald-500/20 bg-emerald-500/5'
                                      : etapa.estado === 'En Proceso'
                                      ? 'border-yellow-500/20 bg-yellow-500/5'
                                      : 'border-primary/8 bg-slate-950/40'
                                  )}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <span className="text-[8px] font-display font-black text-primary/30 w-4 flex-shrink-0">
                                        {String(etapa.numero_etapa).padStart(2, '0')}
                                      </span>
                                      <span className="text-[10px] font-mono-tech font-bold text-foreground/90">
                                        {etapa.titulo}
                                      </span>
                                      <Badge
                                        className="rounded-none text-[7px] font-display uppercase tracking-widest border bg-primary/10 text-primary/60 border-primary/20 px-1.5"
                                      >
                                        {etapa.peso_porcentual}%
                                      </Badge>
                                    </div>
                                    <p className="text-[9px] font-mono-tech text-muted-foreground leading-relaxed line-clamp-2 ml-6">
                                      {etapa.descripcion}
                                    </p>
                                    {etapa.observaciones && (
                                      <p className="text-[9px] font-mono-tech text-primary/60 italic mt-1 ml-6 border-l border-primary/20 pl-2">
                                        {etapa.observaciones}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex-shrink-0">
                                    <Select
                                      value={etapa.estado}
                                      onValueChange={(v) => etapa.id && handleUpdateEtapa(etapa.id, { estado: v as EtapaEstado })}
                                      disabled={!!planUpdating || !user}
                                    >
                                      <SelectTrigger className="h-7 w-32 rounded-none bg-slate-900 border-primary/20 font-mono-tech text-[10px]">
                                        {planUpdating === etapa.id
                                          ? <Loader2 className="w-3 h-3 animate-spin" />
                                          : <SelectValue />
                                        }
                                      </SelectTrigger>
                                      <SelectContent className="rounded-none bg-slate-950 border-primary/20">
                                        {(['Pendiente', 'En Proceso', 'Completado'] as EtapaEstado[]).map((e) => (
                                          <SelectItem key={e} value={e} className="font-mono-tech text-[11px]">
                                            {e}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
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
                  {/* ── Punch List / Pendientes ─────────────────────────── */}
                  {selectedEquipo && (
                    <Card className="rounded-none border-primary/10 bg-slate-900/50">
                      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-[11px] font-display font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <CheckSquare className="w-3.5 h-3.5" /> Punch List
                          </CardTitle>
                          {punchItems && punchItems.length > 0 && (
                            <p className="text-[9px] text-muted-foreground font-mono-tech mt-0.5">
                              <span className="text-red-400 font-bold">{punchItems.filter(p => p.estado === 'ABIERTO').length}</span> abiertos
                              {' '}· <span className="text-emerald-400 font-bold">{punchItems.filter(p => p.estado === 'CERRADO').length}</span> cerrados
                            </p>
                          )}
                        </div>
                        {user && (
                          <Button
                            size="sm"
                            className="rounded-none font-display font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground h-7 px-3"
                            onClick={() => { resetPendienteForm(); setIsAddingPendiente(true); }}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Agregar
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        {punchLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          </div>
                        ) : !punchItems || punchItems.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground font-mono-tech text-[10px]">
                            Sin pendientes registrados. Use el botón Agregar para crear un ítem.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Categoría legend */}
                            <div className="flex gap-3 mb-3">
                              {(['A', 'B', 'C'] as PunchCategoria[]).map((cat) => (
                                <span key={cat} className="flex items-center gap-1 text-[8px] font-mono-tech text-muted-foreground">
                                  <Badge className={cn('rounded-none text-[7px] font-display border px-1.5', PUNCH_CATEGORIA_COLORS[cat])}>
                                    {cat}
                                  </Badge>
                                  {cat === 'A' ? 'Crítico' : cat === 'B' ? 'Mayor' : 'Menor'}
                                </span>
                              ))}
                            </div>

                            {punchItems.map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  'border p-3 flex items-start justify-between gap-3',
                                  item.estado === 'CERRADO'
                                    ? 'border-emerald-500/15 bg-emerald-500/5 opacity-60'
                                    : 'border-primary/10 bg-slate-950/40'
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <Badge className={cn('rounded-none text-[7px] font-display border px-1.5', PUNCH_CATEGORIA_COLORS[item.categoria])}>
                                      {item.categoria}
                                    </Badge>
                                    <span className="text-[9px] font-mono-tech text-primary/60">{item.numero_item}</span>
                                    <Badge variant="outline" className="rounded-none text-[7px] font-display border-primary/20 text-primary/40 px-1.5">
                                      {item.disciplina}
                                    </Badge>
                                    {item.estado === 'CERRADO'
                                      ? <Badge className="rounded-none text-[7px] font-display border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1.5">Cerrado</Badge>
                                      : <Badge className="rounded-none text-[7px] font-display border bg-red-500/10 text-red-400 border-red-500/30 px-1.5">Abierto</Badge>
                                    }
                                  </div>
                                  <p className="text-[10px] font-mono-tech text-foreground/80">{item.descripcion}</p>
                                  <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground font-mono-tech">
                                    <span>{item.responsable}</span>
                                    {item.fecha_limite && <><span>·</span><span className="text-yellow-400/70">Vence: {item.fecha_limite}</span></>}
                                  </div>
                                </div>
                                {item.estado === 'ABIERTO' && isOwner && item.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 flex-shrink-0"
                                    onClick={() => handleClosePendiente(item.id!)}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
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
        <DialogContent className="rounded-none bg-slate-950 border-primary/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display font-black uppercase tracking-widest text-[12px] text-primary flex items-center gap-2">
              <CheckSquare className="w-4 h-4" /> Nuevo Pendiente — {selectedEquipo?.tag}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div className="space-y-1">
              <Label className="font-display font-black uppercase tracking-widest text-[9px] text-primary/60">Descripción *</Label>
              <textarea
                value={pendDescripcion}
                onChange={(e) => setPendDescripcion(e.target.value)}
                rows={3}
                className="w-full rounded-none bg-slate-900 border border-primary/20 font-mono-tech text-[11px] p-2 text-foreground resize-none focus:outline-none focus:border-primary/50"
                placeholder="Describa el pendiente o hallazgo..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              disabled={pendienteSaving}
            >
              {pendienteSaving
                ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Guardando...</>
                : <><Save className="w-3 h-3 mr-1" /> Guardar Pendiente</>
              }
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
