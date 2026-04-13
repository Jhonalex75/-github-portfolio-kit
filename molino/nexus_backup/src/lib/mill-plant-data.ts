/**
 * ARIS MINING — Marmato Lower Mine Expansion
 * Planta de Procesamiento Mineral: SAG Mill + Ball Mill Circuit
 * ─────────────────────────────────────────────────────────────
 * Datos maestros de áreas WBS, equipos y categorías de NC
 * para el sistema de gestión de proyectos de ingeniería.
 *
 * Nomenclatura de áreas compatible con Oracle Primavera P6 y
 * estándares de plantas de procesamiento mineral (SMMI / MRMR).
 *
 * Proyecto de referencia: AMM_OC_20000
 * Elaborado: Abril 2026
 */

// ═══════════════════════════════════════════════════════════════
// 1. ÁREAS WBS — PLANT AREA BREAKDOWN STRUCTURE
// ═══════════════════════════════════════════════════════════════

export interface PlantArea {
  /** Código numérico de área (estilo Primavera / MRMR) */
  code: string;
  /** Nombre en español del área */
  name: string;
  /** Descripción funcional del área */
  description: string;
  /** Disciplina principal de la construcción/montaje */
  primaryDiscipline: string;
  /** Código WBS padre (null = nivel raíz) */
  parentCode: string | null;
}

export const PLANT_AREAS: PlantArea[] = [
  // ── NIVEL 0: PROYECTO RAÍZ ──────────────────────────────────
  {
    code: "1000",
    name: "Planta de Procesamiento Mineral",
    description: "Alcance total de la planta de procesamiento — SAG + Ball Mill circuit",
    primaryDiscipline: "Multidisciplinario",
    parentCode: null,
  },

  // ── NIVEL 1: GRANDES ÁREAS DE PROCESO ──────────────────────
  {
    code: "1100",
    name: "Recibo y Almacenamiento de Mineral",
    description: "Área de tolvas de recibo, apilamiento y recuperación de mineral ROM",
    primaryDiscipline: "Mecánica / Civil",
    parentCode: "1000",
  },
  {
    code: "1200",
    name: "Trituración (Crushing)",
    description: "Circuito de trituración primaria, secundaria y terciaria",
    primaryDiscipline: "Mecánica",
    parentCode: "1000",
  },
  {
    code: "1300",
    name: "Correas Transportadoras",
    description: "Sistema de transporte de mineral por correas entre áreas",
    primaryDiscipline: "Mecánica",
    parentCode: "1000",
  },
  {
    code: "1400",
    name: "Molienda SAG",
    description: "Circuito de molienda Semi-Autógena (SAG Mill) con clasificación",
    primaryDiscipline: "Mecánica",
    parentCode: "1000",
  },
  {
    code: "1500",
    name: "Molienda de Bolas (Ball Mill)",
    description: "Circuito de molienda secundaria con molinos de bolas",
    primaryDiscipline: "Mecánica",
    parentCode: "1000",
  },
  {
    code: "1600",
    name: "Clasificación (Ciclones y Cribas)",
    description: "Baterías de hidrociclones y cribas de alta frecuencia para clasificación granulométrica",
    primaryDiscipline: "Mecánica / Piping",
    parentCode: "1000",
  },
  {
    code: "1700",
    name: "Flotación",
    description: "Circuito de flotación rougher, scavenger y cleaner",
    primaryDiscipline: "Mecánica / Piping",
    parentCode: "1000",
  },
  {
    code: "1800",
    name: "Espesadores y Filtros",
    description: "Espesadores de relaves, concentrado y filtros de presión",
    primaryDiscipline: "Mecánica",
    parentCode: "1000",
  },
  {
    code: "1900",
    name: "Manejo de Reactivos",
    description: "Sistemas de preparación y dosificación de reactivos químicos",
    primaryDiscipline: "Piping / Mecánica",
    parentCode: "1000",
  },
  {
    code: "2000",
    name: "Sistema de Agua de Proceso",
    description: "Tuberías, tanques, bombas y distribución de agua de proceso y agua fresca",
    primaryDiscipline: "Piping / Civil",
    parentCode: "1000",
  },
  {
    code: "2100",
    name: "Infraestructura Eléctrica",
    description: "Subestación principal, transformadores, tableros MCC, cableado de potencia",
    primaryDiscipline: "Eléctrica",
    parentCode: "1000",
  },
  {
    code: "2200",
    name: "Instrumentación y Control (DCS/SCADA)",
    description: "Sistema de control distribuido, instrumentos de campo, lazo de control, sala de control",
    primaryDiscipline: "Instrumentación",
    parentCode: "1000",
  },
  {
    code: "2300",
    name: "Obras Civiles y Fundaciones",
    description: "Fundaciones de equipos, losas, canales, edificios y estructuras de concreto",
    primaryDiscipline: "Civil",
    parentCode: "1000",
  },
  {
    code: "2400",
    name: "Estructura Metálica y Arquitectura",
    description: "Estructura de acero, plataformas, escaleras, pasarelas, cubierta y cerramiento",
    primaryDiscipline: "Estructural",
    parentCode: "1000",
  },
  {
    code: "2500",
    name: "Sistemas Auxiliares y HVAC",
    description: "Colectores de polvo, ventilación industrial, aire comprimido, contraincendio",
    primaryDiscipline: "Mecánica / HVAC",
    parentCode: "1000",
  },
  {
    code: "2600",
    name: "Manejo de Relaves (Tailings)",
    description: "Bombas de relaves, tuberías de impulsión y depósito de relaves",
    primaryDiscipline: "Piping / Civil",
    parentCode: "1000",
  },
  {
    code: "2700",
    name: "Servicios Industriales",
    description: "Taller de mantenimiento, bodega, grúas puente, monorriel, sala de aceites",
    primaryDiscipline: "Mecánica / Civil",
    parentCode: "1000",
  },
  {
    code: "2800",
    name: "Puesta en Marcha y Comisionamiento",
    description: "Pre-comisionamiento, comisionamiento mecánico, pruebas en vacío y bajo carga",
    primaryDiscipline: "Multidisciplinario",
    parentCode: "1000",
  },

  // ── NIVEL 2: SUB-ÁREAS DETALLADAS ──────────────────────────
  {
    code: "1400.01",
    name: "Fundación y Estructura SAG",
    description: "Fundación de concreto reforzado y estructura metálica de soporte del SAG Mill",
    primaryDiscipline: "Civil / Estructural",
    parentCode: "1400",
  },
  {
    code: "1400.02",
    name: "Montaje Mecánico SAG",
    description: "Ensamble del casco, tapas, piñón, corona, motor y accionamiento del SAG",
    primaryDiscipline: "Mecánica",
    parentCode: "1400",
  },
  {
    code: "1400.03",
    name: "Sistema de Lubricación SAG",
    description: "Unidad de lubricación de alta y baja presión para cojinetes y corona del SAG",
    primaryDiscipline: "Mecánica / Piping",
    parentCode: "1400",
  },
  {
    code: "1400.04",
    name: "Accionamiento y Variador SAG",
    description: "Motor principal, variador de velocidad (VSD/VFD) y acoplamiento del SAG",
    primaryDiscipline: "Eléctrica / Mecánica",
    parentCode: "1400",
  },
  {
    code: "1500.01",
    name: "Fundación y Estructura Ball Mill",
    description: "Fundación y estructura del molino de bolas",
    primaryDiscipline: "Civil / Estructural",
    parentCode: "1500",
  },
  {
    code: "1500.02",
    name: "Montaje Mecánico Ball Mill",
    description: "Ensamble del casco, tapas, piñón, corona, motor y descarga del Ball Mill",
    primaryDiscipline: "Mecánica",
    parentCode: "1500",
  },
  {
    code: "1500.03",
    name: "Sistema de Lubricación Ball Mill",
    description: "Unidad de lubricación de alta y baja presión del Ball Mill",
    primaryDiscipline: "Mecánica / Piping",
    parentCode: "1500",
  },
  {
    code: "1600.01",
    name: "Baterías de Hidrociclones",
    description: "Estructura y tuberías de manifolds de hidrociclones primarios y secundarios",
    primaryDiscipline: "Piping / Mecánica",
    parentCode: "1600",
  },
  {
    code: "1600.02",
    name: "Cribas Vibratorias / Alta Frecuencia",
    description: "Montaje de cribas de media y alta frecuencia para oversize del SAG",
    primaryDiscipline: "Mecánica",
    parentCode: "1600",
  },
];

// ═══════════════════════════════════════════════════════════════
// 2. LISTA DE EQUIPOS POR ÁREA
// ═══════════════════════════════════════════════════════════════

export type EquipmentCategory =
  | "molino"
  | "trituradora"
  | "correa_transportadora"
  | "criba_clasificador"
  | "hidrociclón"
  | "celda_flotacion"
  | "espesador"
  | "filtro"
  | "bomba"
  | "agitador"
  | "tanque_silo"
  | "dosificador_reactivo"
  | "estructura_metalica"
  | "grua_izaje"
  | "sistema_lubricacion"
  | "accionamiento_electrico"
  | "transformador"
  | "tablero_electrico"
  | "instrumento_campo"
  | "sistema_control"
  | "colector_polvo"
  | "compresor"
  | "ventilador"
  | "tuberías_piping";

export const EQUIPMENT_CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  molino: "Molino",
  trituradora: "Trituradora",
  correa_transportadora: "Correa Transportadora",
  criba_clasificador: "Criba / Clasificador",
  hidrociclón: "Hidrociclón",
  celda_flotacion: "Celda de Flotación",
  espesador: "Espesador",
  filtro: "Filtro",
  bomba: "Bomba",
  agitador: "Agitador",
  tanque_silo: "Tanque / Silo",
  dosificador_reactivo: "Dosificador de Reactivo",
  estructura_metalica: "Estructura Metálica",
  grua_izaje: "Grúa / Equipo de Izaje",
  sistema_lubricacion: "Sistema de Lubricación",
  accionamiento_electrico: "Accionamiento Eléctrico",
  transformador: "Transformador",
  tablero_electrico: "Tablero Eléctrico / MCC",
  instrumento_campo: "Instrumento de Campo",
  sistema_control: "Sistema de Control (DCS/PLC)",
  colector_polvo: "Colector de Polvo",
  compresor: "Compresor",
  ventilador: "Ventilador Industrial",
  tuberías_piping: "Sistema de Tuberías (Piping)",
};

export interface PlantEquipment {
  /** Tag único del equipo (ej. MIL-SAG-001) */
  tag: string;
  /** Nombre del equipo en español */
  name: string;
  /** Código del área WBS */
  areaCode: string;
  /** Nombre del área */
  areaName: string;
  /** Categoría del equipo */
  category: EquipmentCategory;
  /** Descripción técnica del equipo */
  description: string;
  /** Disciplina de montaje responsable */
  discipline: string;
  /** Fabricante de referencia típico (no vinculante) */
  typicalManufacturer?: string;
  // ── Campos enriquecidos (equipos principales) ──────────────────
  model?: string;
  supplier?: string;
  purchaseOrder?: string;
  weightKg?: string;
  dimensions?: string;
  motorPowerKw?: string;
  voltageV?: string;
  capacityDesign?: string;
  docIngenieria?: string;
  pid?: string;
  iomManual?: string;
  procedureRef?: string;
  remarks?: string;
}

export const PLANT_EQUIPMENT: PlantEquipment[] = [

  // ── ÁREA 1100 — RECIBO Y ALMACENAMIENTO ─────────────────────
  {
    tag: "TLV-001",
    name: "Tolva de Recibo de Mineral ROM",
    areaCode: "1100",
    areaName: "Recibo y Almacenamiento de Mineral",
    category: "tanque_silo",
    description: "Tolva de recibo de mineral run-of-mine, capacidad 500 t, revestimiento en acero AR400",
    discipline: "Civil / Mecánica",
    typicalManufacturer: "Metso / FLSmidth",
  },
  {
    tag: "ALM-001",
    name: "Apilador de Mineral (Stacker)",
    areaCode: "1100",
    areaName: "Recibo y Almacenamiento de Mineral",
    category: "correa_transportadora",
    description: "Apilador radial para formación de pila de mineral en patio de acopio",
    discipline: "Mecánica",
  },
  {
    tag: "REC-001",
    name: "Recuperador de Mineral (Reclaimer)",
    areaCode: "1100",
    areaName: "Recibo y Almacenamiento de Mineral",
    category: "correa_transportadora",
    description: "Recuperador tipo puente para extracción de mineral del patio de acopio",
    discipline: "Mecánica",
  },
  {
    tag: "ALI-001",
    name: "Alimentador de Placa (Apron Feeder)",
    areaCode: "1100",
    areaName: "Recibo y Almacenamiento de Mineral",
    category: "correa_transportadora",
    description: "Alimentador de placa pesada bajo tolva de recibo, para carga a trituradora primaria",
    discipline: "Mecánica",
    typicalManufacturer: "Metso / Sandvik",
  },

  // ── ÁREA 1200 — TRITURACIÓN ──────────────────────────────────
  {
    tag: "TRI-001",
    name: "Trituradora de Mandíbulas Primaria",
    areaCode: "1200",
    areaName: "Trituración (Crushing)",
    category: "trituradora",
    description: "Trituradora de mandíbulas para reducción primaria de mineral ROM, apertura 1200x900mm",
    discipline: "Mecánica",
    typicalManufacturer: "Metso (C Series) / Sandvik",
  },
  {
    tag: "TRI-002",
    name: "Trituradora de Cono Secundaria",
    areaCode: "1200",
    areaName: "Trituración (Crushing)",
    category: "trituradora",
    description: "Trituradora de cono para trituración secundaria, 400 kW",
    discipline: "Mecánica",
    typicalManufacturer: "Metso HP / Sandvik CH",
  },
  {
    tag: "TRI-003",
    name: "Trituradora de Cono Terciaria",
    areaCode: "1200",
    areaName: "Trituración (Crushing)",
    category: "trituradora",
    description: "Trituradora de cono para reducción terciaria (pebble crushing), 250 kW",
    discipline: "Mecánica",
    typicalManufacturer: "Metso HP / FLSmidth",
  },
  {
    tag: "CRB-CRS-001",
    name: "Criba de Clasificación Primaria (Pre-screening)",
    areaCode: "1200",
    areaName: "Trituración (Crushing)",
    category: "criba_clasificador",
    description: "Criba vibratoria de doble cubierta para clasificación antes de trituración secundaria",
    discipline: "Mecánica",
    typicalManufacturer: "Metso / Haver & Boecker",
  },

  // ── ÁREA 1300 — CORREAS TRANSPORTADORAS ─────────────────────
  {
    tag: "CV-001",
    name: "Correa Transportadora No.1 — ROM a Trituradora",
    areaCode: "1300",
    areaName: "Correas Transportadoras",
    category: "correa_transportadora",
    description: "Correa de alimentación de mineral desde tolva ROM a trituradora primaria, 750mm ancho, 120m longitud",
    discipline: "Mecánica",
    typicalManufacturer: "Bando / ContiTech",
  },
  {
    tag: "CV-002",
    name: "Correa Transportadora No.2 — Trituradora a Patio",
    areaCode: "1300",
    areaName: "Correas Transportadoras",
    category: "correa_transportadora",
    description: "Correa de descarga desde trituradora primaria a patio de acopio, 900mm, 180m",
    discipline: "Mecánica",
  },
  {
    tag: "CV-003",
    name: "Correa Transportadora No.3 — Patio a Molienda SAG",
    areaCode: "1300",
    areaName: "Correas Transportadoras",
    category: "correa_transportadora",
    description: "Correa de alimentación de mineral desde patio de acopio al molino SAG, 1000mm, 350m",
    discipline: "Mecánica",
  },
  {
    tag: "CV-004",
    name: "Correa Transportadora No.4 — Pebbles a Trituradora Terciaria",
    areaCode: "1300",
    areaName: "Correas Transportadoras",
    category: "correa_transportadora",
    description: "Correa de recirculación de pebbles (oversize SAG) a trituradora terciaria, 650mm, 200m",
    discipline: "Mecánica",
  },
  {
    tag: "PES-CV-001",
    name: "Balanza de Pesaje en Correa (Belt Scale) — CV-003",
    areaCode: "1300",
    areaName: "Correas Transportadoras",
    category: "instrumento_campo",
    description: "Balanza de correa para control tonelaje alimentado al SAG",
    discipline: "Instrumentación",
    typicalManufacturer: "Ramsey / Schenck",
  },

  // ── ÁREA 1400 — MOLIENDA SAG ─────────────────────────────────
  {
    tag: "MIL-SAG-001",
    name: "Molino SAG (Semi-Autógeno) M-01",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "molino",
    description: "Molino semi-autógeno 22' × 16' (EGL): Ø interior 6.710 mm × EGL 4.530 mm. Descarga por trampa (trunnion overflow). Trommel integrado (Ø2.100 mm × L 2.545 mm). Revestimiento interior intercambiable en goma/acero. Sistema de lubricación HP/LP. Accionamiento auxiliar (inching) 55 kW.",
    discipline: "Mecánica",
    typicalManufacturer: "Metso Outotec / CITIC-SMCC / FLSmidth",
    model: "SAG Mill 22' × 16' (2216)",
    supplier: "Metso Outotec / CITIC-SMCC",
    purchaseOrder: "P0001",
    weightKg: "294,395 kg",
    dimensions: "Ø interior carcasa: 6,710 mm  ×  EGL: 4,530 mm  (22' × 16')",
    motorPowerKw: "3,200 kW (motor GMD principal) + 55 kW (inching drive) + 2×75 kW (bombas HP) + 2×15 kW (bombas LP)",
    voltageV: "13,800 V (motor GMD) / 480 V (auxiliares)",
    capacityDesign: "371.2 m³/h pulpa de diseño  ·  Trommel: 371 m³/h",
    docIngenieria: "LM-ED-MEX-1205-3400-0001_0",
    pid: "LM-ED-PRE-1205-4000-0004",
    iomManual: "MIL24.001-IC-10-001 — IOM Manual Final (Metso Outotec)",
    procedureRef: "LM-HLGS-C-1000-3940-PRO-0038-ME — Procedimiento Operativo Montaje Mecánico Molinos",
    remarks: "Equipo crítico — Paquete P0001. Capacidad tanque aceite lubricación trunnion: 2,810 L. Capacidad tanque lubricación caja reductora/piñón: 1,200 L. Accionamiento auxiliar: WEG WTBA-NEMA 55 kW. Trommel descarga: Ø2,100 × 2,545 mm.",
  },
  {
    tag: "GMD-SAG-001",
    name: "Accionamiento Sin Engranaje SAG (Gearless Mill Drive)",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "accionamiento_electrico",
    description: "Motor GMD tipo anillo (ring motor) para accionamiento directo del SAG, 17 MW, ABB / Siemens",
    discipline: "Eléctrica / Mecánica",
    typicalManufacturer: "ABB / Siemens",
  },
  {
    tag: "LUB-SAG-HP-001",
    name: "Unidad de Lubricación de Alta Presión SAG",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "sistema_lubricacion",
    description: "Sistema de lubricación hidrostática de alta presión para cojinetes de muñón del SAG, presión 25 MPa",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "SKF / Flowserve",
  },
  {
    tag: "LUB-SAG-LP-001",
    name: "Unidad de Lubricación de Baja Presión SAG",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "sistema_lubricacion",
    description: "Sistema de circulación de aceite de baja presión para cojinetes y corona del SAG",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "TRP-SAG-001",
    name: "Trampa de Pebbles SAG (Trommel Screen)",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "criba_clasificador",
    description: "Trommel de descarga del SAG para separación de pebbles (oversize) de la pulpa",
    discipline: "Mecánica",
  },
  {
    tag: "BOM-TR-001",
    name: "Bomba de Transferencia de Pulpa SAG a Ciclones",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "bomba",
    description: "Bomba centrífuga de pulpa horizontal, 450 kW, para bombear descarga SAG a batería de ciclones",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / GIW / Metso",
  },
  {
    tag: "TK-SAG-001",
    name: "Caja Colectora de Descarga SAG (Discharge Sump)",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "tanque_silo",
    description: "Caja o sump de recepción de pulpa de descarga del SAG, revestido en goma",
    discipline: "Mecánica / Civil",
  },
  {
    tag: "CRB-SAG-001",
    name: "Criba de Alta Frecuencia — Descarga SAG",
    areaCode: "1400",
    areaName: "Molienda SAG",
    category: "criba_clasificador",
    description: "Criba de alta frecuencia (300 Hz) para clasificación de descarga SAG y control de pebbles",
    discipline: "Mecánica",
    typicalManufacturer: "Derrick / Linatex",
  },

  // ── ÁREA 1500 — MOLIENDA DE BOLAS ────────────────────────────
  {
    tag: "MIL-BM-001",
    name: "Molino de Bolas No.1 (Ball Mill) MB-01",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "molino",
    description: "Molino de bolas 16' × 24.5' (EGL): Ø interior 4,878 mm × EGL 7,480 mm. Descarga por parrilla (grate discharge). Accionamiento piñón-corona con caja reductora. Carga de bolas forjadas: 35% vol. Sistema de lubricación HP/LP. Accionamiento auxiliar (inching) 45 kW.",
    discipline: "Mecánica",
    typicalManufacturer: "Metso Outotec / CITIC / FLSmidth",
    model: "Ball Mill 16' × 24.5' (1624)",
    supplier: "Metso Outotec / CITIC",
    purchaseOrder: "P0001",
    weightKg: "TBA (ver IOM Manual)",
    dimensions: "Ø interior carcasa: 4,878 mm  ×  EGL: 7,480 mm  (16' × 24.5')",
    motorPowerKw: "7,500 kW (motor principal) + 45 kW (inching drive) + 2×7.5 kW (bombas LP) + 4 kW (enfriador)",
    voltageV: "13,800 V (motor principal) / 480 V (auxiliares)",
    capacityDesign: "Carga de bolas: 35% vol.  ·  Tanque aceite LP: 1,200 L",
    docIngenieria: "LM-ED-MEX-1210-3400-0001",
    pid: "LM-ED-PRE-1210-4000-0004",
    iomManual: "MIL24.001-IC-10-001 — IOM Manual Final (Metso Outotec)",
    procedureRef: "LM-HLGS-C-1000-3940-PRO-0038-ME — Procedimiento Operativo Montaje Mecánico Molinos",
    remarks: "Equipo crítico — Paquete P0001. Descarga por parrilla (grate discharge). Sistema de lubricación HP/LP (1205-LU-004). Inching drive 45 kW. Ver planos IS: MIL24.001-IS-1624-18.",
  },
  {
    tag: "MIL-BM-002",
    name: "Molino de Bolas No.2 (Ball Mill) MB-02",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "molino",
    description: "Molino de bolas 16' × 24.5' (EGL): Ø interior 4,878 mm × EGL 7,480 mm. Descarga por parrilla (grate discharge). Accionamiento piñón-corona con caja reductora. Carga de bolas forjadas: 35% vol. Sistema de lubricación HP/LP. Accionamiento auxiliar (inching) 45 kW.",
    discipline: "Mecánica",
    typicalManufacturer: "Metso Outotec / CITIC / FLSmidth",
    model: "Ball Mill 16' × 24.5' (1624)",
    supplier: "Metso Outotec / CITIC",
    purchaseOrder: "P0001",
    weightKg: "TBA (ver IOM Manual)",
    dimensions: "Ø interior carcasa: 4,878 mm  ×  EGL: 7,480 mm  (16' × 24.5')",
    motorPowerKw: "7,500 kW (motor principal) + 45 kW (inching drive)",
    voltageV: "13,800 V (motor principal) / 480 V (auxiliares)",
    iomManual: "MIL24.001-IC-10-001 — IOM Manual Final (Metso Outotec)",
    procedureRef: "LM-HLGS-C-1000-3940-PRO-0038-ME — Procedimiento Operativo Montaje Mecánico Molinos",
    remarks: "Equipo crítico — Paquete P0001. Unidad gemela del MB-01.",
  },
  {
    tag: "LUB-BM-001",
    name: "Unidad de Lubricación Ball Mill MB-01",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "sistema_lubricacion",
    description: "Unidad de lubricación hidrostática de alta y baja presión para cojinetes de muñón del Ball Mill MB-01",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "SKF / Flowserve",
  },
  {
    tag: "LUB-BM-002",
    name: "Unidad de Lubricación Ball Mill MB-02",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "sistema_lubricacion",
    description: "Unidad de lubricación hidrostática de alta y baja presión para cojinetes de muñón del Ball Mill MB-02",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "MOT-BM-001",
    name: "Motor Principal Ball Mill MB-01",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "accionamiento_electrico",
    description: "Motor eléctrico síncrono de velocidad fija para Ball Mill MB-01, 7500 kW, 11 kV",
    discipline: "Eléctrica",
  },
  {
    tag: "MOT-BM-002",
    name: "Motor Principal Ball Mill MB-02",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "accionamiento_electrico",
    description: "Motor eléctrico síncrono de velocidad fija para Ball Mill MB-02, 7500 kW, 11 kV",
    discipline: "Eléctrica",
  },
  {
    tag: "BOM-CIR-001",
    name: "Bomba de Pulpa Circuito Ball Mill No.1",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "bomba",
    description: "Bomba centrífuga de pulpa para descarga del Ball Mill MB-01 a batería de ciclones secundarios",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / GIW",
  },
  {
    tag: "BOM-CIR-002",
    name: "Bomba de Pulpa Circuito Ball Mill No.2",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "bomba",
    description: "Bomba centrífuga de pulpa para descarga del Ball Mill MB-02 a batería de ciclones secundarios",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / GIW",
  },
  {
    tag: "ADD-BM-001",
    name: "Sistema de Adición de Bolas de Molienda",
    areaCode: "1500",
    areaName: "Molienda de Bolas (Ball Mill)",
    category: "dosificador_reactivo",
    description: "Alimentador automático de bolas de acero forjado para carga de media moledora al Ball Mill",
    discipline: "Mecánica",
    typicalManufacturer: "Magotteaux / ME Elecmetal",
  },

  // ── ÁREA 1600 — CLASIFICACIÓN ─────────────────────────────────
  {
    tag: "CYC-001",
    name: "Batería de Hidrociclones Primarios No.1",
    areaCode: "1600",
    areaName: "Clasificación (Ciclones y Cribas)",
    category: "hidrociclón",
    description: "Batería de 12 hidrociclones Ø660mm (26\") para clasificación de descarga SAG. Overflow a flotación, underflow a Ball Mill.",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "FLSmidth (Krebs) / Weir (Cavex)",
  },
  {
    tag: "CYC-002",
    name: "Batería de Hidrociclones Secundarios No.2",
    areaCode: "1600",
    areaName: "Clasificación (Ciclones y Cribas)",
    category: "hidrociclón",
    description: "Batería de 10 hidrociclones Ø500mm (20\") para reclasificación de pulpa de Ball Mill. P80 objetivo 150-180 µm.",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "FLSmidth (Krebs) / Weir (Cavex)",
  },
  {
    tag: "CRB-CLS-001",
    name: "Criba Vibratoria de Clasificación — Oversize SAG",
    areaCode: "1600",
    areaName: "Clasificación (Ciclones y Cribas)",
    category: "criba_clasificador",
    description: "Criba vibratoria de doble cubierta para clasificación de oversize del SAG y retorno de pebbles",
    discipline: "Mecánica",
    typicalManufacturer: "Metso / Sandvik",
  },
  {
    tag: "CRB-CLS-002",
    name: "Criba de Alta Frecuencia — Circuito Ball Mill",
    areaCode: "1600",
    areaName: "Clasificación (Ciclones y Cribas)",
    category: "criba_clasificador",
    description: "Criba de alta frecuencia para control fino de granulometría en circuito de molienda secundaria",
    discipline: "Mecánica",
    typicalManufacturer: "Derrick / Linatex",
  },
  {
    tag: "TK-CYC-001",
    name: "Caja de Distribución de Pulpa a Ciclones (Feed Box)",
    areaCode: "1600",
    areaName: "Clasificación (Ciclones y Cribas)",
    category: "tanque_silo",
    description: "Caja distribuidora de pulpa para alimentación equitativa a todos los ciclones de la batería",
    discipline: "Mecánica / Piping",
  },

  // ── ÁREA 1700 — FLOTACIÓN ─────────────────────────────────────
  {
    tag: "CEL-RGH-001",
    name: "Celda de Flotación Rougher No.1",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación mecánica Rougher, 160 m³, impelente de alta eficiencia",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Metso (RCS) / FLSmidth (Wemco) / Outotec",
  },
  {
    tag: "CEL-RGH-002",
    name: "Celda de Flotación Rougher No.2",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación mecánica Rougher, 160 m³",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "CEL-RGH-003",
    name: "Celda de Flotación Rougher No.3",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación mecánica Rougher, 160 m³",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "CEL-SCV-001",
    name: "Celda de Flotación Scavenger No.1",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación Scavenger para recuperación de cola Rougher, 50 m³",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Metso / Outotec",
  },
  {
    tag: "CEL-CLN-001",
    name: "Celda de Flotación Cleaner No.1",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación Cleaner para concentrado de mayor ley, 30 m³",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "CEL-CLN-002",
    name: "Celda de Flotación Cleaner No.2",
    areaCode: "1700",
    areaName: "Flotación",
    category: "celda_flotacion",
    description: "Celda de flotación Cleaner secundaria, 30 m³",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "BOM-FLT-001",
    name: "Bomba de Pulpa — Alimentación a Flotación",
    areaCode: "1700",
    areaName: "Flotación",
    category: "bomba",
    description: "Bomba centrífuga de pulpa para transferir overflow de ciclones a circuito de flotación",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / Metso",
  },
  {
    tag: "AGI-001",
    name: "Agitador de Tanque de Acondicionamiento Rougher",
    areaCode: "1700",
    areaName: "Flotación",
    category: "agitador",
    description: "Agitador mecánico de eje vertical para acondicionamiento de pulpa con reactivos antes de flotación Rougher",
    discipline: "Mecánica",
    typicalManufacturer: "Lightnin / Philadelphia",
  },

  // ── ÁREA 1800 — ESPESADORES Y FILTROS ────────────────────────
  {
    tag: "ESP-CON-001",
    name: "Espesador de Concentrado HRT-035",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "espesador",
    description: "Espesador de alto rendimiento (HRT) Metso para concentrados de oro/plata. Diámetro: 35 m. Altura de pared lateral: 2,800 mm. Inclinación del suelo: 1:6. Tanque de acero al carbono atornillado, soporte independiente tipo viga radial. Sistema de alimentación Metso Reactorwell™ (Ø 4,000 mm) con Autodilución direccional. Capacidad: 512.4 m³/h volumen / 183.5 t/h sólidos. Accionamiento de rastras hidráulico (SAI GM2 300 + Reggiana Riduttori). Par máx: 800,000 Nm. Velocidad: 0.055 rpm. Elevador de rastras hidráulico Mega (300 mm recorrido).",
    discipline: "Mecánica / Civil",
    typicalManufacturer: "Metso",
    model: "HRT-035",
    supplier: "Metso",
    purchaseOrder: "TBA",
    weightKg: "TBA",
    dimensions: "Ø 35,000 mm × Pared 2,800 mm — Inclinación suelo 1:6",
    motorPowerKw: "11",
    voltageV: "460",
    capacityDesign: "512.4 m³/h volumen / 183.5 t/h sólidos",
    iomManual: "OU500911039 Rev 0",
    procedureRef: "LM-HLGS-C-1000-3940-PRO-0034 Rev A",
    remarks: "Proyecto: Marmato Lower Mine Expansion — MIL24.001. Contratista: HLGS. Par de torque diseño máx: 800,000 Nm. Velocidad rastra: 0.055 rpm. HPU: Motor WEG 11 kW, 460 V, 60 Hz.",
  },
  {
    tag: "ESP-REL-001",
    name: "Espesador de Relaves No.1",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "espesador",
    description: "Espesador convencional de relaves, diámetro 45m, para recuperación de agua de proceso",
    discipline: "Mecánica / Civil",
    typicalManufacturer: "FLSmidth / Metso / Outotec",
  },
  {
    tag: "ESP-REL-002",
    name: "Espesador de Relaves No.2",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "espesador",
    description: "Espesador convencional de relaves No.2 (paralelo a ESP-REL-001), diámetro 45m",
    discipline: "Mecánica / Civil",
  },
  {
    tag: "FIL-001",
    name: "Filtro de Presión (Filter Press) — Concentrado",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "filtro",
    description: "Filtro de presión de placas para deshidratación de concentrado, 60 cámaras, humedad final <10%",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Metso (Larox) / FLSmidth",
  },
  {
    tag: "BOM-ESP-001",
    name: "Bomba de Underflow Espesador de Concentrado",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "bomba",
    description: "Bomba peristáltica o centrífuga de baja velocidad para underflow del espesador de concentrado",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / Hose Pump (Watson-Marlow)",
  },
  {
    tag: "BOM-REL-001",
    name: "Bomba de Underflow Espesador de Relaves No.1",
    areaCode: "1800",
    areaName: "Espesadores y Filtros",
    category: "bomba",
    description: "Bomba centrífuga de pulpa para bombeo de underflow del espesador de relaves hacia depósito",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / GIW",
  },

  // ── ÁREA 1900 — REACTIVOS ──────────────────────────────────────
  {
    tag: "DOS-XAN-001",
    name: "Dosificador de Xantato (Colector)",
    areaCode: "1900",
    areaName: "Manejo de Reactivos",
    category: "dosificador_reactivo",
    description: "Sistema de preparación y dosificación de xantato de potasio (colector) para circuito de flotación",
    discipline: "Piping / Mecánica",
  },
  {
    tag: "DOS-ESP-001",
    name: "Dosificador de Espumante (MIBC/Frother)",
    areaCode: "1900",
    areaName: "Manejo de Reactivos",
    category: "dosificador_reactivo",
    description: "Sistema de dosificación de espumante MIBC o equivalente para flotación",
    discipline: "Piping / Mecánica",
  },
  {
    tag: "DOS-CAL-001",
    name: "Sistema de Dosificación de Cal (Lechada)",
    areaCode: "1900",
    areaName: "Manejo de Reactivos",
    category: "dosificador_reactivo",
    description: "Sistema completo: silo de cal viva, apagador, tanque de lechada de cal y bombas dosificadoras con control de pH",
    discipline: "Piping / Mecánica / Instrumentación",
  },
  {
    tag: "TK-CAL-001",
    name: "Tanque de Lechada de Cal",
    areaCode: "1900",
    areaName: "Manejo de Reactivos",
    category: "tanque_silo",
    description: "Tanque de almacenamiento y agitación de lechada de cal al 10%, con revestimiento en goma",
    discipline: "Mecánica / Civil",
  },
  {
    tag: "SIL-CAL-001",
    name: "Silo de Cal Viva",
    areaCode: "1900",
    areaName: "Manejo de Reactivos",
    category: "tanque_silo",
    description: "Silo de almacenamiento de cal viva, 100 t de capacidad, con sistema de extracción por tornillo",
    discipline: "Mecánica / Civil",
  },

  // ── ÁREA 2000 — AGUA DE PROCESO ──────────────────────────────
  {
    tag: "TK-H2O-001",
    name: "Tanque de Agua de Proceso (Process Water Tank)",
    areaCode: "2000",
    areaName: "Sistema de Agua de Proceso",
    category: "tanque_silo",
    description: "Tanque de almacenamiento de agua de proceso recuperada de espesadores, 5000 m³, HDPE o concreto",
    discipline: "Civil / Piping",
  },
  {
    tag: "TK-H2O-002",
    name: "Tanque de Agua Fresca (Fresh Water Tank)",
    areaCode: "2000",
    areaName: "Sistema de Agua de Proceso",
    category: "tanque_silo",
    description: "Tanque de agua fresca de suministro externo, 2000 m³",
    discipline: "Civil / Piping",
  },
  {
    tag: "BOM-H2O-001",
    name: "Bomba de Agua de Proceso No.1",
    areaCode: "2000",
    areaName: "Sistema de Agua de Proceso",
    category: "bomba",
    description: "Bomba centrífuga de agua de proceso para distribución a planta, 250 m³/h",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Grundfos / Flowserve",
  },
  {
    tag: "BOM-H2O-002",
    name: "Bomba de Agua de Proceso No.2 (Standby)",
    areaCode: "2000",
    areaName: "Sistema de Agua de Proceso",
    category: "bomba",
    description: "Bomba de agua de proceso en standby (1+1), 250 m³/h",
    discipline: "Mecánica / Piping",
  },
  {
    tag: "BOM-REL-TL-001",
    name: "Bomba de Impulsión de Relaves — Línea 1",
    areaCode: "2600",
    areaName: "Manejo de Relaves (Tailings)",
    category: "bomba",
    description: "Bomba centrífuga de alta presión para impulsión de relaves espesados a depósito (1.5 km), 500 m³/h",
    discipline: "Mecánica / Piping",
    typicalManufacturer: "Warman / GIW / Metso",
  },

  // ── ÁREA 2100 — INFRAESTRUCTURA ELÉCTRICA ────────────────────
  {
    tag: "SSE-001",
    name: "Subestación Eléctrica Principal (115/13.8 kV)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "transformador",
    description: "Subestación principal de potencia 115/13.8 kV, 40 MVA, con transformadores de potencia y celdas de media tensión",
    discipline: "Eléctrica",
    typicalManufacturer: "ABB / Siemens / Schneider",
  },
  {
    tag: "TRAFO-001",
    name: "Transformador Principal No.1 (40 MVA)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "transformador",
    description: "Transformador trifásico de potencia 115/13.8 kV, 40 MVA, ONAN/ONAF",
    discipline: "Eléctrica",
    typicalManufacturer: "ABB / Siemens",
  },
  {
    tag: "TRAFO-002",
    name: "Transformador de Distribución — Área Molienda (2.5 MVA)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "transformador",
    description: "Transformador de distribución 13.8 kV / 480 V, 2.5 MVA para alimentación de cargas 480V en área de molienda",
    discipline: "Eléctrica",
  },
  {
    tag: "MCC-MOL-001",
    name: "Centro de Control de Motores — Molienda (MCC-01)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "tablero_electrico",
    description: "MCC de 480V para control y protección de motores del área de molienda SAG y Ball Mill",
    discipline: "Eléctrica",
    typicalManufacturer: "ABB / Schneider / Siemens",
  },
  {
    tag: "MCC-FLT-001",
    name: "Centro de Control de Motores — Flotación (MCC-02)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "tablero_electrico",
    description: "MCC de 480V para control y protección de motores del área de flotación y espesadores",
    discipline: "Eléctrica",
  },
  {
    tag: "VFD-SAG-001",
    name: "Variador de Frecuencia (VFD) — Bombas Área SAG",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "accionamiento_electrico",
    description: "Variador de frecuencia para bombas de pulpa del área SAG, 600 kW, 480V",
    discipline: "Eléctrica",
    typicalManufacturer: "ABB / Danfoss / Siemens",
  },
  {
    tag: "UPS-001",
    name: "Sistema de Alimentación Ininterrumpida (UPS)",
    areaCode: "2100",
    areaName: "Infraestructura Eléctrica",
    category: "tablero_electrico",
    description: "UPS de 60 kVA para alimentación de sistemas críticos de control e instrumentación",
    discipline: "Eléctrica",
  },

  // ── ÁREA 2200 — INSTRUMENTACIÓN Y CONTROL ────────────────────
  {
    tag: "DCS-001",
    name: "Sistema de Control Distribuido (DCS) — Servidor Principal",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "sistema_control",
    description: "Servidor del DCS para control de todo el proceso de planta, redundante, con interface a SCADA",
    discipline: "Instrumentación",
    typicalManufacturer: "Honeywell / ABB / Siemens",
  },
  {
    tag: "PLC-MOL-001",
    name: "PLC Área Molienda",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "sistema_control",
    description: "Controlador lógico programable para automatización de subsistemas de molienda SAG y Ball Mill",
    discipline: "Instrumentación",
  },
  {
    tag: "SCADA-001",
    name: "Estación de Supervisión SCADA — Sala de Control",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "sistema_control",
    description: "Estación de operador con interface gráfica SCADA para supervisión y control de toda la planta",
    discipline: "Instrumentación",
    typicalManufacturer: "AVEVA / Wonderware / Ignition",
  },
  {
    tag: "FT-SAG-001",
    name: "Medidor de Flujo de Pulpa — Alimentación SAG",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Flujómetro electromagnético DN300 para medición de caudal de pulpa en alimentación del SAG",
    discipline: "Instrumentación",
    typicalManufacturer: "Endress+Hauser / Krohne / Yokogawa",
  },
  {
    tag: "PT-LUB-001",
    name: "Transmisor de Presión — Sistema Lubricación SAG",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Transmisor de presión diferencial para monitoreo del sistema de lubricación de alta presión del SAG",
    discipline: "Instrumentación",
    typicalManufacturer: "Endress+Hauser / Rosemount",
  },
  {
    tag: "TT-CJT-001",
    name: "Sensor de Temperatura de Cojinete SAG (PT100)",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Sensor PT100 de temperatura de cojinetes de muñón del molino SAG, instalación en 4 puntos",
    discipline: "Instrumentación",
    typicalManufacturer: "Endress+Hauser / Pt100 Clase A",
  },
  {
    tag: "VT-MOL-001",
    name: "Transmisor de Vibración — Molino SAG",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Transductor piezo-eléctrico para monitoreo de vibración (mm/s RMS) en cojinetes del SAG",
    discipline: "Instrumentación",
    typicalManufacturer: "SKF / Brüel & Kjær",
  },
  {
    tag: "pH-001",
    name: "Analizador de pH — Circuito de Flotación",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Medidor de pH en línea para control de dosificación de cal en pulpa de flotación",
    discipline: "Instrumentación",
    typicalManufacturer: "Endress+Hauser (Liquiline) / Mettler-Toledo",
  },
  {
    tag: "DEN-001",
    name: "Medidor de Densidad de Pulpa — Underflow Ciclones",
    areaCode: "2200",
    areaName: "Instrumentación y Control (DCS/SCADA)",
    category: "instrumento_campo",
    description: "Medidor de densidad nuclear o por ultrasonido para control de dilución en underflow de ciclones",
    discipline: "Instrumentación",
    typicalManufacturer: "Rhosonics / Ramsey",
  },

  // ── ÁREA 2300 — CIVIL Y FUNDACIONES ─────────────────────────
  {
    tag: "CIV-FUN-SAG-001",
    name: "Fundación de Concreto — Molino SAG",
    areaCode: "2300",
    areaName: "Obras Civiles y Fundaciones",
    category: "tuberías_piping",
    description: "Fundación masiva de concreto reforzado f'c=28 MPa para soporte del molino SAG, incluye cimentación de pedestales de cojinetes",
    discipline: "Civil",
  },
  {
    tag: "CIV-FUN-BM-001",
    name: "Fundación de Concreto — Molino de Bolas MB-01",
    areaCode: "2300",
    areaName: "Obras Civiles y Fundaciones",
    category: "tuberías_piping",
    description: "Fundación masiva de concreto reforzado f'c=28 MPa para soporte del Ball Mill MB-01",
    discipline: "Civil",
  },
  {
    tag: "CIV-FUN-BM-002",
    name: "Fundación de Concreto — Molino de Bolas MB-02",
    areaCode: "2300",
    areaName: "Obras Civiles y Fundaciones",
    category: "tuberías_piping",
    description: "Fundación masiva de concreto reforzado f'c=28 MPa para soporte del Ball Mill MB-02",
    discipline: "Civil",
  },

  // ── ÁREA 2400 — ESTRUCTURA METÁLICA ─────────────────────────
  {
    tag: "EST-MOL-001",
    name: "Estructura Metálica Edificio de Molienda",
    areaCode: "2400",
    areaName: "Estructura Metálica y Arquitectura",
    category: "estructura_metalica",
    description: "Estructura de acero A572 Gr.50 para edificio de molienda SAG y Ball Mill, 4 niveles, con plataformas de mantenimiento",
    discipline: "Estructural",
  },
  {
    tag: "EST-FLT-001",
    name: "Estructura Metálica Edificio de Flotación",
    areaCode: "2400",
    areaName: "Estructura Metálica y Arquitectura",
    category: "estructura_metalica",
    description: "Estructura de acero para edificio de flotación, celdas y acondicionadores, 2 niveles",
    discipline: "Estructural",
  },
  {
    tag: "GRP-MOL-001",
    name: "Grúa Puente Edificio de Molienda (15 t)",
    areaCode: "2400",
    areaName: "Estructura Metálica y Arquitectura",
    category: "grua_izaje",
    description: "Grúa puente de 15 t para mantenimiento de equipos pesados en edificio de molienda (extracción de liners y cojinetes)",
    discipline: "Mecánica / Estructural",
    typicalManufacturer: "Demag / Konecranes / GH",
  },
  {
    tag: "GRP-FLT-001",
    name: "Grúa Puente Edificio de Flotación (5 t)",
    areaCode: "2400",
    areaName: "Estructura Metálica y Arquitectura",
    category: "grua_izaje",
    description: "Grúa puente de 5 t para mantenimiento de impelentes y motores de celdas de flotación",
    discipline: "Mecánica / Estructural",
  },

  // ── ÁREA 2500 — SISTEMAS AUXILIARES ─────────────────────────
  {
    tag: "CD-MOL-001",
    name: "Colector de Polvo — Área de Trituración",
    areaCode: "2500",
    areaName: "Sistemas Auxiliares y HVAC",
    category: "colector_polvo",
    description: "Colector de polvo de mangas (baghouse) para supresión de polvo en área de trituración y correas, 30.000 m³/h",
    discipline: "Mecánica / HVAC",
    typicalManufacturer: "Donaldson / Camfil",
  },
  {
    tag: "CD-MOL-002",
    name: "Colector de Polvo — Área de Molienda",
    areaCode: "2500",
    areaName: "Sistemas Auxiliares y HVAC",
    category: "colector_polvo",
    description: "Colector de polvo de mangas para edificio de molienda, 20.000 m³/h",
    discipline: "Mecánica / HVAC",
  },
  {
    tag: "COMP-001",
    name: "Compresor de Aire de Instrumentos No.1",
    areaCode: "2500",
    areaName: "Sistemas Auxiliares y HVAC",
    category: "compresor",
    description: "Compresor de tornillo rotativo para aire de instrumentos (55 psi, seco), 30 m³/min",
    discipline: "Mecánica",
    typicalManufacturer: "Atlas Copco / Ingersoll Rand",
  },
  {
    tag: "COMP-002",
    name: "Compresor de Aire de Servicios No.2 (Standby)",
    areaCode: "2500",
    areaName: "Sistemas Auxiliares y HVAC",
    category: "compresor",
    description: "Compresor de servicio en standby (1+1), 30 m³/min",
    discipline: "Mecánica",
  },
];

// ═══════════════════════════════════════════════════════════════
// 3. ESTRUCTURA WBS — PRIMAVERA P6 (Códigos de actividad)
// ═══════════════════════════════════════════════════════════════

export interface WBSNode {
  /** Código WBS Primavera (ej. 01.02.03) */
  wbsCode: string;
  /** Código de área de planta asociada */
  areaCode: string;
  /** Nombre de la actividad / entregable */
  activityName: string;
  /** Nivel WBS (1=raíz, 2=disciplina, 3=área, 4=actividad) */
  level: 1 | 2 | 3 | 4;
  /** Código padre WBS */
  parentWbs: string | null;
}

export const WBS_STRUCTURE: WBSNode[] = [
  // Nivel 1 — Proyecto
  { wbsCode: "01", areaCode: "1000", activityName: "AMM_OC_20000 — Planta de Procesamiento Mineral Marmato", level: 1, parentWbs: null },

  // Nivel 2 — Disciplinas / Paquetes de trabajo
  { wbsCode: "01.01", areaCode: "2300", activityName: "OBRAS CIVILES Y FUNDACIONES", level: 2, parentWbs: "01" },
  { wbsCode: "01.02", areaCode: "2400", activityName: "ESTRUCTURA METÁLICA Y ARQUITECTURA", level: 2, parentWbs: "01" },
  { wbsCode: "01.03", areaCode: "1000", activityName: "MONTAJE MECÁNICO DE EQUIPOS", level: 2, parentWbs: "01" },
  { wbsCode: "01.04", areaCode: "2000", activityName: "PIPING E INSTALACIONES HIDRÁULICAS", level: 2, parentWbs: "01" },
  { wbsCode: "01.05", areaCode: "2100", activityName: "INSTALACIONES ELÉCTRICAS", level: 2, parentWbs: "01" },
  { wbsCode: "01.06", areaCode: "2200", activityName: "INSTRUMENTACIÓN Y CONTROL", level: 2, parentWbs: "01" },
  { wbsCode: "01.07", areaCode: "2800", activityName: "PRE-COMISIONAMIENTO Y COMISIONAMIENTO", level: 2, parentWbs: "01" },

  // Nivel 3 — Áreas de Proceso
  { wbsCode: "01.01.01", areaCode: "2300", activityName: "Fundación Molino SAG", level: 3, parentWbs: "01.01" },
  { wbsCode: "01.01.02", areaCode: "2300", activityName: "Fundación Molinos de Bolas (2 unidades)", level: 3, parentWbs: "01.01" },
  { wbsCode: "01.01.03", areaCode: "2300", activityName: "Fundación Equipos Área de Flotación", level: 3, parentWbs: "01.01" },
  { wbsCode: "01.01.04", areaCode: "2300", activityName: "Fundación Espesadores y Filtros", level: 3, parentWbs: "01.01" },
  { wbsCode: "01.01.05", areaCode: "2300", activityName: "Obras Civiles Correas Transportadoras", level: 3, parentWbs: "01.01" },
  { wbsCode: "01.01.06", areaCode: "2300", activityName: "Canales, Losas y Obras Varias", level: 3, parentWbs: "01.01" },

  { wbsCode: "01.02.01", areaCode: "2400", activityName: "Estructura Edificio de Molienda", level: 3, parentWbs: "01.02" },
  { wbsCode: "01.02.02", areaCode: "2400", activityName: "Estructura Edificio de Flotación", level: 3, parentWbs: "01.02" },
  { wbsCode: "01.02.03", areaCode: "2400", activityName: "Plataformas y Pasarelas de Servicio", level: 3, parentWbs: "01.02" },
  { wbsCode: "01.02.04", areaCode: "2400", activityName: "Cubierta, Cerramiento y Arquitectura", level: 3, parentWbs: "01.02" },
  { wbsCode: "01.02.05", areaCode: "2400", activityName: "Grúas Puente e Instalación", level: 3, parentWbs: "01.02" },

  { wbsCode: "01.03.01", areaCode: "1100", activityName: "Montaje Área Recibo y Almacenamiento", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.02", areaCode: "1200", activityName: "Montaje Circuito de Trituración", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.03", areaCode: "1300", activityName: "Montaje Correas Transportadoras", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.04", areaCode: "1400", activityName: "Montaje Molino SAG (MIL-SAG-001)", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.05", areaCode: "1500", activityName: "Montaje Molino de Bolas MB-01", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.06", areaCode: "1500", activityName: "Montaje Molino de Bolas MB-02", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.07", areaCode: "1600", activityName: "Montaje Ciclones y Cribas", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.08", areaCode: "1700", activityName: "Montaje Circuito de Flotación", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.09", areaCode: "1800", activityName: "Montaje Espesadores y Filtros", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.10", areaCode: "1900", activityName: "Montaje Sistema de Reactivos", level: 3, parentWbs: "01.03" },
  { wbsCode: "01.03.11", areaCode: "1400", activityName: "Montaje Sistemas de Lubricación SAG y Ball Mill", level: 3, parentWbs: "01.03" },

  { wbsCode: "01.04.01", areaCode: "2000", activityName: "Piping Proceso — Área Molienda", level: 3, parentWbs: "01.04" },
  { wbsCode: "01.04.02", areaCode: "2000", activityName: "Piping Proceso — Área Flotación", level: 3, parentWbs: "01.04" },
  { wbsCode: "01.04.03", areaCode: "2000", activityName: "Piping Proceso — Área Espesadores", level: 3, parentWbs: "01.04" },
  { wbsCode: "01.04.04", areaCode: "2000", activityName: "Piping Agua de Proceso y Servicios", level: 3, parentWbs: "01.04" },
  { wbsCode: "01.04.05", areaCode: "2600", activityName: "Piping Relaves — Impulsión a Depósito", level: 3, parentWbs: "01.04" },
  { wbsCode: "01.04.06", areaCode: "1900", activityName: "Piping Reactivos y Dosificación", level: 3, parentWbs: "01.04" },

  { wbsCode: "01.05.01", areaCode: "2100", activityName: "Subestación Principal y Transformadores", level: 3, parentWbs: "01.05" },
  { wbsCode: "01.05.02", areaCode: "2100", activityName: "MCC y Centros de Control de Motores", level: 3, parentWbs: "01.05" },
  { wbsCode: "01.05.03", areaCode: "2100", activityName: "Cableado de Potencia y Bandejas", level: 3, parentWbs: "01.05" },
  { wbsCode: "01.05.04", areaCode: "2100", activityName: "Acometidas a Equipos y Conexiones", level: 3, parentWbs: "01.05" },
  { wbsCode: "01.05.05", areaCode: "2100", activityName: "Alumbrado, Fuerza y Tomacorrientes", level: 3, parentWbs: "01.05" },
  { wbsCode: "01.05.06", areaCode: "2100", activityName: "Sistema de Puesta a Tierra (SPT)", level: 3, parentWbs: "01.05" },

  { wbsCode: "01.06.01", areaCode: "2200", activityName: "Instrumentos de Campo — Área Molienda", level: 3, parentWbs: "01.06" },
  { wbsCode: "01.06.02", areaCode: "2200", activityName: "Instrumentos de Campo — Área Flotación", level: 3, parentWbs: "01.06" },
  { wbsCode: "01.06.03", areaCode: "2200", activityName: "Cableado de Control e Instrumentación (I&C)", level: 3, parentWbs: "01.06" },
  { wbsCode: "01.06.04", areaCode: "2200", activityName: "Sala de Control — DCS / SCADA / PLC", level: 3, parentWbs: "01.06" },
  { wbsCode: "01.06.05", areaCode: "2200", activityName: "Loop Check y Calibración de Instrumentos", level: 3, parentWbs: "01.06" },

  { wbsCode: "01.07.01", areaCode: "2800", activityName: "Pre-comisionamiento Mecánico — Revisión de Equipos", level: 3, parentWbs: "01.07" },
  { wbsCode: "01.07.02", areaCode: "2800", activityName: "Pre-comisionamiento Eléctrico — Megger y Continuidades", level: 3, parentWbs: "01.07" },
  { wbsCode: "01.07.03", areaCode: "2800", activityName: "Pre-comisionamiento Instrumentación — Loop Check", level: 3, parentWbs: "01.07" },
  { wbsCode: "01.07.04", areaCode: "2800", activityName: "Pruebas en Vacío (No-Load Testing)", level: 3, parentWbs: "01.07" },
  { wbsCode: "01.07.05", areaCode: "2800", activityName: "Puesta en Marcha con Carga (Cold / Hot Commissioning)", level: 3, parentWbs: "01.07" },
  { wbsCode: "01.07.06", areaCode: "2800", activityName: "Performance Test y Entrega a Operaciones", level: 3, parentWbs: "01.07" },
];

// ═══════════════════════════════════════════════════════════════
// 4. CATEGORÍAS DE NO CONFORMIDADES (NC) POR ÁREA/DISCIPLINA
// ═══════════════════════════════════════════════════════════════

export interface NCCategory {
  /** ID único de la categoría */
  id: string;
  /** Nombre de la categoría de NC */
  name: string;
  /** Disciplina asociada */
  discipline: string;
  /** Área típica donde ocurre */
  typicalArea: string;
  /** Ejemplos de hallazgos típicos */
  examples: string[];
  /** Normas de referencia aplicables */
  normReferences: string[];
}

export const NC_CATEGORIES: NCCategory[] = [

  // ── MOLINO SAG ──────────────────────────────────────────────
  {
    id: "NC-CAT-SAG-01",
    name: "Alineación y Nivelación del Molino SAG",
    discipline: "Mecánica",
    typicalArea: "Molienda SAG",
    examples: [
      "Desviación de nivel en pedestales de cojinetes fuera de tolerancia (>0.02 mm/m)",
      "Desalineación angular entre eje del molino y motor",
      "Diferencia de coaxialidad entre muñones superior a tolerancia del fabricante",
    ],
    normReferences: ["ISO 1101", "Especificación del fabricante (OEM)", "ASME Y14.5"],
  },
  {
    id: "NC-CAT-SAG-02",
    name: "Montaje de Liners y Revestimientos SAG",
    discipline: "Mecánica",
    typicalArea: "Molienda SAG",
    examples: [
      "Torque de apriete de pernos de liners fuera de especificación",
      "Liners instalados en posición incorrecta (orientación de ondas / levantadores)",
      "Daño físico a liners durante manipulación e instalación",
      "Interferencia entre liners adyacentes",
    ],
    normReferences: ["Procedimiento de instalación OEM", "ISO 9001-8.5", "ET-MOL-001"],
  },
  {
    id: "NC-CAT-SAG-03",
    name: "Sistema de Lubricación SAG — Defectos",
    discipline: "Mecánica / Piping",
    typicalArea: "Molienda SAG",
    examples: [
      "Fuga de aceite en conexiones de alta presión (>25 MPa)",
      "Presión de levantamiento hidrostático fuera de rango (< o > especificación)",
      "Temperatura de aceite en cojinetes excede límite de alarma (>65°C)",
      "Filtro de aceite saturado — diferencial de presión elevado",
    ],
    normReferences: ["ISO 9001-8.7", "ANSI/AGMA 9005", "Procedimiento OEM LUB-001"],
  },
  {
    id: "NC-CAT-SAG-04",
    name: "Accionamiento Eléctrico SAG (GMD / VFD)",
    discipline: "Eléctrica",
    typicalArea: "Molienda SAG",
    examples: [
      "Resistencia de aislamiento del motor GMD por debajo del límite (< 100 MΩ)",
      "Desbalance de fases en corriente del motor > 5%",
      "Falla en prueba de secuencia de arranque del VFD",
      "Temperatura de devanados del motor excede clase de aislamiento",
    ],
    normReferences: ["IEC 60034", "IEEE 43", "NEMA MG-1", "Norma IEC 60947"],
  },
  {
    id: "NC-CAT-SAG-05",
    name: "Fisuras y Defectos de Soldadura — Casco SAG",
    discipline: "Mecánica",
    typicalArea: "Molienda SAG",
    examples: [
      "Fisura longitudinal o circunferencial en casco o tapas del molino SAG",
      "Porosidad o falta de fusión en soldadura de casco detectada por NDT (UT/LP/PT)",
      "Deformación plástica del casco por izaje inadecuado",
    ],
    normReferences: ["API 579", "AWS D1.1", "ASME Sec. IX", "ISO 5817"],
  },

  // ── MOLINO DE BOLAS ─────────────────────────────────────────
  {
    id: "NC-CAT-BM-01",
    name: "Alineación Piñón-Corona Ball Mill",
    discipline: "Mecánica",
    typicalArea: "Molienda de Bolas (Ball Mill)",
    examples: [
      "Contacto de dientes piñón-corona fuera de patrón especificado (marca de contacto < 70%)",
      "Backlash fuera de rango especificado por fabricante",
      "Desalineación axial o angular del piñón superior al límite",
    ],
    normReferences: ["AGMA 6014 / AGMA 6115", "ISO 1328", "Procedimiento OEM"],
  },
  {
    id: "NC-CAT-BM-02",
    name: "Sellado y Protección de Engranaje Ball Mill",
    discipline: "Mecánica",
    typicalArea: "Molienda de Bolas (Ball Mill)",
    examples: [
      "Sello de cubierta de engranaje (girth guard) deteriorado o mal instalado",
      "Ingreso de polvo o pulpa al compartimento del piñón/corona",
      "Nivel de aceite de lubricación de corona fuera de rango",
    ],
    normReferences: ["ISO 9001-8.5", "Procedimiento OEM"],
  },
  {
    id: "NC-CAT-BM-03",
    name: "Carga de Medios Moledores (Grinding Media)",
    discipline: "Mecánica",
    typicalArea: "Molienda de Bolas (Ball Mill)",
    examples: [
      "Distribución de tamaño de bolas no cumple especificación de carga inicial",
      "Dureza o composición química de bolas fuera de especificación del proveedor",
      "Sobrecarga o subcarga de bolas en el molino vs. diseño",
    ],
    normReferences: ["ET-MOL-002", "ISO 9001-8.4", "ASTM A532"],
  },

  // ── ESTRUCTURA METÁLICA ─────────────────────────────────────
  {
    id: "NC-CAT-EST-01",
    name: "Montaje y Alineación de Estructura Metálica",
    discipline: "Estructural",
    typicalArea: "Estructura Metálica y Arquitectura",
    examples: [
      "Plomada de columnas fuera de tolerancia (> L/500)",
      "Desviación de nivel de vigas principales > ±5mm",
      "Pernos de anclaje mal posicionados respecto a planos de detalle",
      "Uniones atornilladas sin el torque de apriete requerido (AISC/RCSC)",
    ],
    normReferences: ["NSR-10 (Colombia)", "AISC 360", "ASTM A325 / A490", "AWS D1.1"],
  },
  {
    id: "NC-CAT-EST-02",
    name: "Soldaduras en Estructura Metálica",
    discipline: "Estructural",
    typicalArea: "Estructura Metálica y Arquitectura",
    examples: [
      "Soldadura sin WPS aprobado o por soldador no calificado",
      "Porosidad, socavación, traslape o falta de fusión detectada en VT o MT",
      "Tamaño de cordón de soldadura inferior al plano (refuerzo insuficiente)",
      "Soldadura en posición PG sin calificación específica",
    ],
    normReferences: ["AWS D1.1", "ASME Sec. IX", "ISO 5817 Nivel B/C"],
  },
  {
    id: "NC-CAT-EST-03",
    name: "Pintura y Protección Anticorrosiva",
    discipline: "Estructural",
    typicalArea: "Estructura Metálica y Arquitectura",
    examples: [
      "Espesor de película seca (EPS) fuera de rango especificado (medición por inspector)",
      "Grado de limpieza superficial no conforme antes de aplicar primer (SSPC-SP6 mínimo)",
      "Blistering, agrietamiento o delaminación de recubrimiento anticorrosivo",
    ],
    normReferences: ["ISO 8501-1 (Sa 2.5)", "SSPC-PA1", "NACE SP0169", "Especificación técnica pintura ET-PIN-001"],
  },

  // ── CIVIL / FUNDACIONES ─────────────────────────────────────
  {
    id: "NC-CAT-CIV-01",
    name: "Calidad del Concreto — Resistencia y Dosificación",
    discipline: "Civil",
    typicalArea: "Obras Civiles y Fundaciones",
    examples: [
      "Resistencia a compresión de cilindros por debajo de f'c especificado (28 MPa) a 28 días",
      "Relación agua/cemento fuera del límite de diseño de mezcla",
      "Revenimiento (slump) fuera de rango especificado para fundaciones masivas",
    ],
    normReferences: ["ACI 318", "NSR-10 (Título C)", "NTC 3318 (Colombia)", "ASTM C39"],
  },
  {
    id: "NC-CAT-CIV-02",
    name: "Acero de Refuerzo — Instalación y Empalmes",
    discipline: "Civil",
    typicalArea: "Obras Civiles y Fundaciones",
    examples: [
      "Recubrimiento de acero de refuerzo inferior al mínimo especificado (< 75mm en fundaciones)",
      "Longitud de empalme de traslapo insuficiente",
      "Acero sin certificado de calidad o sin coincidir con especificación (grado 60)",
    ],
    normReferences: ["ACI 318", "NSR-10", "NTC 2289 / ASTM A615"],
  },
  {
    id: "NC-CAT-CIV-03",
    name: "Placas de Asiento (Soleplates) y Pernos de Anclaje",
    discipline: "Civil / Mecánica",
    typicalArea: "Obras Civiles y Fundaciones",
    examples: [
      "Posición de pernos de anclaje fuera de tolerancia (>±3mm del plano de detalle)",
      "Nivel de soleplate fuera de tolerancia (>0.1mm/m)",
      "Lechada de epóxico no alcanza resistencia especificada a los 7 días",
      "Espacio para grouting insuficiente debajo de soleplate (<25mm)",
    ],
    normReferences: ["ACI 351.1R", "Procedimiento de Grouting PROC-CIV-005", "Especificación del fabricante OEM"],
  },
  {
    id: "NC-CAT-CIV-04",
    name: "Encofrado, Geometría y Tolerancias de Obra Civil",
    discipline: "Civil",
    typicalArea: "Obras Civiles y Fundaciones",
    examples: [
      "Dimensiones de fundación fuera de tolerancia (>±10mm vs. plano)",
      "Desviación de plomada en elementos verticales (>H/500)",
      "Falta de curado adecuado del concreto (tiempo y método de curado)",
    ],
    normReferences: ["ACI 117", "NSR-10", "NTC 3459"],
  },

  // ── PIPING ──────────────────────────────────────────────────
  {
    id: "NC-CAT-PIP-01",
    name: "Soldadura en Tuberías de Proceso (Piping Welds)",
    discipline: "Piping",
    typicalArea: "Sistema de Agua de Proceso",
    examples: [
      "Soldadura de tubería sin WPS calificado según ASME B31.3",
      "Falta de END (RT/UT) en soldaduras de clase P1 según porcentaje requerido",
      "Penetración incompleta o socavación detectada en radiografía",
      "Soldador no calificado para la posición y material requerido",
    ],
    normReferences: ["ASME B31.3", "ASME Sec. IX", "AWS D1.1", "ISO 5817"],
  },
  {
    id: "NC-CAT-PIP-02",
    name: "Soportería y Anclajes de Tuberías",
    discipline: "Piping",
    typicalArea: "Sistema de Agua de Proceso",
    examples: [
      "Espaciado entre soportes excede el máximo calculado en stress analysis",
      "Soporte tipo ancla instalado incorrectamente (permite movimiento axial no deseado)",
      "Falta de aislamiento térmico en soportes de líneas calientes",
      "Soporte instalado sobre soldadura de tubería",
    ],
    normReferences: ["ASME B31.3", "MSS SP-58", "ASME B31.1 para líneas de vapor"],
  },
  {
    id: "NC-CAT-PIP-03",
    name: "Pruebas Hidrostáticas y Neumáticas",
    discipline: "Piping",
    typicalArea: "Sistema de Agua de Proceso",
    examples: [
      "Caída de presión durante prueba hidrostática (≥ 1.5P diseño por 1h) indica fuga",
      "Falla de instrumento de medición de presión sin certificado de calibración vigente",
      "Procedimiento de prueba no aprobado antes de ejecución",
    ],
    normReferences: ["ASME B31.3 §345", "ISO 14692", "Procedimiento de Pruebas PT-PIP-002"],
  },
  {
    id: "NC-CAT-PIP-04",
    name: "Materiales de Tuberías — Certificación y Trazabilidad",
    discipline: "Piping",
    typicalArea: "Sistema de Agua de Proceso",
    examples: [
      "Tubería instalada sin MTR (Mill Test Report) o con MTR que no cumple especificación",
      "Material sustituto (ej. A53 en lugar de A106) sin aprobación de ingeniería",
      "Bridas o fitting sin identificación de material o heat number",
    ],
    normReferences: ["ASME B31.3", "ASTM A106 / A53", "ASTM A182", "ISO 9001-8.4"],
  },

  // ── ELÉCTRICA ────────────────────────────────────────────────
  {
    id: "NC-CAT-ELE-01",
    name: "Instalación de Cables y Bandejas Portacables",
    discipline: "Eléctrica",
    typicalArea: "Infraestructura Eléctrica",
    examples: [
      "Radio de curvatura de cables inferior al mínimo del fabricante",
      "Cables sin identificación en extremos y puntos intermedios",
      "Bandejas portacables sin continuidad de puesta a tierra",
      "Capacidad de bandeja superada (> 40% de llenado permitido)",
    ],
    normReferences: ["RETIE Colombia (Res. 90708/2013)", "NEC 392", "IEC 61537", "IEEE 525"],
  },
  {
    id: "NC-CAT-ELE-02",
    name: "Pruebas de Aislamiento (Megger) y Continuidad",
    discipline: "Eléctrica",
    typicalArea: "Infraestructura Eléctrica",
    examples: [
      "Resistencia de aislamiento de cable < 1 MΩ (valor mínimo RETIE)",
      "Falta de continuidad en conductor de tierra (resistencia > 0.1Ω)",
      "Polaridad invertida en terminales de motor o tablero",
    ],
    normReferences: ["RETIE Colombia", "IEEE 43", "IEC 60228", "NTC 2050"],
  },
  {
    id: "NC-CAT-ELE-03",
    name: "Puesta a Tierra y Protección contra Rayos (SPT)",
    discipline: "Eléctrica",
    typicalArea: "Infraestructura Eléctrica",
    examples: [
      "Resistencia del sistema de puesta a tierra > 5Ω (límite RETIE Colombia)",
      "Electrodo de tierra instalado sin contorno de varillas o malla de cobre",
      "Conexiones de puesta a tierra oxidadas o con contacto deficiente",
    ],
    normReferences: ["RETIE Colombia (Art. 15)", "IEC 62305", "NTC 4552", "IEEE 80"],
  },
  {
    id: "NC-CAT-ELE-04",
    name: "Conexiones y Terminaciones en MCC / Tableros",
    discipline: "Eléctrica",
    typicalArea: "Infraestructura Eléctrica",
    examples: [
      "Terminales sin capuchón aislante o con par de apriete incorrecto",
      "Conductor de sección inadecuada para la protección (breaker sobredimensionado)",
      "Etiquetado incorrecto de circuitos en tablero vs. plano unifilar",
    ],
    normReferences: ["RETIE", "NTC 2050", "IEC 60947-2", "NEMA ICS 1"],
  },

  // ── INSTRUMENTACIÓN ──────────────────────────────────────────
  {
    id: "NC-CAT-INS-01",
    name: "Calibración de Instrumentos de Campo",
    discipline: "Instrumentación",
    typicalArea: "Instrumentación y Control (DCS/SCADA)",
    examples: [
      "Instrumento calibrado sin patrón trazable a INVIMA/ONAC (Colombia)",
      "Desviación de señal fuera de tolerancia (>0.5% del span) después de calibración",
      "Certificado de calibración vencido en instrumento en servicio crítico",
    ],
    normReferences: ["ISO 17025", "ISO 9001-7.1.5", "ISA-5.1", "NTC-ISO/IEC 17025"],
  },
  {
    id: "NC-CAT-INS-02",
    name: "Loop Check e Integración DCS",
    discipline: "Instrumentación",
    typicalArea: "Instrumentación y Control (DCS/SCADA)",
    examples: [
      "Señal de campo no llega correctamente al DCS (loop check fallido)",
      "Dirección de falla de lazo (fail-safe) no corresponde con especificación funcional",
      "Rango de ingeniería configurado incorrectamente en DCS",
    ],
    normReferences: ["ISA 84.00.01 (IEC 61511)", "ISA 5.1", "Procedimiento LC-INS-003"],
  },
  {
    id: "NC-CAT-INS-03",
    name: "Instalación Física de Instrumentos",
    discipline: "Instrumentación",
    typicalArea: "Instrumentación y Control (DCS/SCADA)",
    examples: [
      "Orientación de instrumento incorrecta (transmisores de presión diferencial con bolsas de gas/líquido)",
      "Toma de proceso mal ubicada (aguas arriba de perturbación)",
      "Caja de conexiones sin sello IP adecuado (< IP65 en área húmeda)",
    ],
    normReferences: ["ISA 5.4", "IEC 60529 (IP rating)", "NFPA 70 (NEC Art. 504)"],
  },
  {
    id: "NC-CAT-INS-04",
    name: "Sistemas de Control de Seguridad (SIS/SIL)",
    discipline: "Instrumentación",
    typicalArea: "Instrumentación y Control (DCS/SCADA)",
    examples: [
      "Función SIL no alcanza el nivel de integridad requerido (SIL 1 o SIL 2)",
      "Prueba funcional de disparo de emergencia (ESD) fallida",
      "Lógica de disparo no corresponde con HAZOP / análisis de riesgo aprobado",
    ],
    normReferences: ["IEC 61511", "ISA 84.00.01", "IEC 62061"],
  },
];

// ═══════════════════════════════════════════════════════════════
// 5. HELPERS — BÚSQUEDA Y FILTRADO
// ═══════════════════════════════════════════════════════════════

/** Obtener todos los equipos de un área WBS */
export function getEquipmentByArea(areaCode: string): PlantEquipment[] {
  return PLANT_EQUIPMENT.filter(eq => eq.areaCode === areaCode);
}

/** Obtener equipo por tag */
export function getEquipmentByTag(tag: string): PlantEquipment | undefined {
  return PLANT_EQUIPMENT.find(eq => eq.tag === tag);
}

/** Obtener todos los tags de equipos como array simple */
export function getAllEquipmentTags(): string[] {
  return PLANT_EQUIPMENT.map(eq => eq.tag);
}

/** Obtener categorías de NC por disciplina */
export function getNCCategoriesByDiscipline(discipline: string): NCCategory[] {
  return NC_CATEGORIES.filter(cat => cat.discipline.includes(discipline));
}

/** Obtener nodos WBS de nivel 3 (actividades hoja de área) */
export function getWBSLeafNodes(): WBSNode[] {
  return WBS_STRUCTURE.filter(node => node.level === 3);
}

/** Mapa de área por código para lookups rápidos */
export const AREA_BY_CODE: Record<string, PlantArea> = Object.fromEntries(
  PLANT_AREAS.map(area => [area.code, area])
);

/** Mapa de equipo por tag para lookups rápidos */
export const EQUIPMENT_BY_TAG: Record<string, PlantEquipment> = Object.fromEntries(
  PLANT_EQUIPMENT.map(eq => [eq.tag, eq])
);

// ═══════════════════════════════════════════════════════════════
// 6. JSON-EXPORT SNAPSHOT (Para seed de base de datos)
// ═══════════════════════════════════════════════════════════════

/**
 * Snapshot de datos maestros listo para exportar a JSON / Firestore seed.
 * Uso: JSON.stringify(MASTER_DATA_SNAPSHOT, null, 2)
 */
export const MASTER_DATA_SNAPSHOT = {
  metadata: {
    project: "AMM_OC_20000",
    projectName: "Marmato Lower Mine Expansion — Planta de Procesamiento",
    client: "Aris Mining",
    contractor: "SGS ETSA – SIGA",
    generatedAt: "2026-04-02",
    version: "1.0.0",
    totalAreas: PLANT_AREAS.length,
    totalEquipment: PLANT_EQUIPMENT.length,
    totalWBSNodes: WBS_STRUCTURE.length,
    totalNCCategories: NC_CATEGORIES.length,
  },
  areas: PLANT_AREAS,
  equipment: PLANT_EQUIPMENT,
  wbsStructure: WBS_STRUCTURE,
  ncCategories: NC_CATEGORIES,
};

// ═══════════════════════════════════════════════════════════════
// 5. PLAN ESTÁTICO DE MONTAJE POR EQUIPO
//    Basado en: IOM Manual MIL24.001-IC-10-001 (Metso Outotec)
//    y PRO-0038-ME (Procedimiento Operativo Montaje Molinos)
// ═══════════════════════════════════════════════════════════════

export interface StaticAssemblyStep {
  step_number: number;
  title: string;
  description: string;
  weight_pct: number;   // Suma = 100 por equipo
  iom_ref?: string;
  proc_ref?: string;
}

export const MILL_ASSEMBLY_PLANS: Record<string, StaticAssemblyStep[]> = {

  // ── MOLINO SAG 22' × 16' ──────────────────────────────────────
  "MIL-SAG-001": [
    {
      step_number: 1,
      title: "Recepción e Inspección de Componentes",
      description: "Verificar componentes contra packing list del fabricante. Inspección visual de daños por transporte. Registro fotográfico de todos los bultos. Verificación dimensional de trunnions, secciones de cuerpo (shell) y cabezas (heads). Informe de recepción firmado por inspector.",
      weight_pct: 3,
      iom_ref: "IOM C.4817 §3 — Receipt & Inspection",
      proc_ref: "PRO-0038 §4.1",
    },
    {
      step_number: 2,
      title: "Preparación de Fundaciones y Pernos de Anclaje",
      description: "Verificación de cotas y niveles de la fundación civil (tolerancia ±2 mm). Instalación y posicionamiento de pernos de anclaje (J-bolts). Grouting de placas de base con mortero epóxico de alta resistencia. Curado mínimo 72 h antes de cargar. Nivelación final: tolerancia ≤ 0.05 mm/m.",
      weight_pct: 5,
      iom_ref: "IOM C.4817 §4.1 — Foundation Preparation",
      proc_ref: "PRO-0038 §4.2",
    },
    {
      step_number: 3,
      title: "Instalación y Nivelación de Pedestales de Cojinete (Trunnion Bearings)",
      description: "Posicionamiento de pedestales de cojinete de muñón sobre placas de base. Nivelación con calces de precisión (shims). Alineación de ejes — verificación de paralelismo entre cojinetes (máx. 0.10 mm). Torque de pernos de anclaje según especificación. Verificación de planitud de superficies de asiento.",
      weight_pct: 8,
      iom_ref: "IOM C.4817 §4.2 — Bearing Pedestal Installation",
      proc_ref: "PRO-0038 §4.3",
    },
    {
      step_number: 4,
      title: "Izaje e Instalación del Cuerpo del Molino (Shell Sections)",
      description: "Elaborar y aprobar plan de izaje y maniobras (grúa ≥ 200 t). Ensamble de secciones del cuerpo (shell) con bridas y pernos de alta resistencia Gr. 8.8 / ASTM A-325. Aplicar torque secuencial en patrón estrella: 30% → 70% → 100% del torque de diseño. Verificar alineación de bridas (max gap 0.3 mm). Proteger superficies mecanizadas durante maniobra.",
      weight_pct: 15,
      iom_ref: "IOM C.4817 §4.3 — Shell Assembly",
      proc_ref: "PRO-0038 §4.4",
    },
    {
      step_number: 5,
      title: "Instalación de Cabezas — Alimentación y Descarga (Heads / Trunnions)",
      description: "Instalación de cabeza de alimentación (feed head/trunnion) y cabeza de descarga (discharge head/trunnion). Alineación de trunnions con pedestales de cojinete — verificar runout radial (máx. 0.5 mm) y axial (máx. 0.3 mm). Ajuste de sellantes (grasa de alta temperatura). Torque final de pernos de cabeza con registro en ITR.",
      weight_pct: 12,
      iom_ref: "IOM C.4817 §4.4 — Head Installation",
      proc_ref: "PRO-0038 §4.5",
    },
    {
      step_number: 6,
      title: "Instalación de Revestimientos Internos (Shell & Head Liners)",
      description: "Instalar liners de cuerpo (shell liners) y liners de cabeza (head liners) según patrón de IOM. Aplicar sellante entre liner y cuerpo. Torque de pernos de liner: aplicar en dos etapas con torquímetro calibrado. Verificar ausencia de partes sueltas con golpe de martillo. Registro de torque en ITR.",
      weight_pct: 10,
      iom_ref: "IOM C.4817 §5.1 — Liner Installation",
      proc_ref: "PRO-0038 §4.6",
    },
    {
      step_number: 7,
      title: "Instalación del Motor GMD (Ring Motor) y Convertidor de Frecuencia",
      description: "Instalación del estátor del motor GMD sobre el cuerpo del molino. Alineación del entrehierro (air gap) entre estátor y rotor — tolerancia ±0.3 mm. Conexiones de barras de cobre y cables de potencia 13.8 kV. Instalación de convertidor de frecuencia (VVVF) y transformador de excitación. Prueba de aislamiento (megger) ≥ 100 MΩ.",
      weight_pct: 12,
      iom_ref: "IOM C.4817 §6.1 — GMD Installation",
      proc_ref: "PRO-0038 §4.7",
    },
    {
      step_number: 8,
      title: "Sistema de Lubricación de Alta Presión HP (Trunnion Bearings)",
      description: "Instalación de unidad hidráulica HP (2×75 kW bombas — 1205-LU-003). Conexión de líneas de alta presión (acero inox ASTM A316) a cojinetes de muñón. Prueba de estanqueidad a 1.5× presión de diseño (25 MPa). Verificación de caudal (min. 12 L/min por cojinete) y presión en cada cojinete. Ajuste de válvulas de control y alivio.",
      weight_pct: 8,
      iom_ref: "IOM C.4817 §7.1 — HP Lube System",
      proc_ref: "PRO-0038 §4.8",
    },
    {
      step_number: 9,
      title: "Sistema de Lubricación de Baja Presión LP (Circulación de Aceite)",
      description: "Instalación de unidad LP (2×15 kW bombas — 1205-LU-003). Conexiones de líneas de circulación (Ø 25–50 mm). Llenado con aceite Mobil SHC 634 ISO VG 320. Prueba de circulación y verificación de temperatura de retorno (máx. 55 °C). Ajuste de by-passes y válvulas de alivio.",
      weight_pct: 5,
      iom_ref: "IOM C.4817 §7.2 — LP Lube System",
      proc_ref: "PRO-0038 §4.9",
    },
    {
      step_number: 10,
      title: "Trommel de Descarga y Chutes (1205-TR-001 / 1205-CH-015)",
      description: "Instalación del trommel (Ø 2,100 mm × 2,545 mm longitud) en cabeza de descarga. Ajuste de marcos de soporte y verificación de holguras. Instalación de chute de alimentación (1205-CH-060) y chute de descarga (1205-CH-015) con revestimiento de caucho. Verificar ausencia de interferencias durante rotación en vacío.",
      weight_pct: 5,
      iom_ref: "IOM C.4817 §4.5 — Trommel & Discharge",
      proc_ref: "PRO-0038 §4.10",
    },
    {
      step_number: 11,
      title: "Accionamiento Auxiliar — Inching / Jacking Drive (1205-XM-011)",
      description: "Instalación del inching drive WEG WTBA-NEMA 55 kW. Conexión mecánica al molino (freno electromagnético). Conexión eléctrica y verificación de enclavamientos con GMD. Prueba de giro lento (≤ 0.3 rpm) para asentamiento de liners y verificación de sistemas de lubricación.",
      weight_pct: 3,
      iom_ref: "IOM C.4817 §6.2 — Inching Drive",
      proc_ref: "PRO-0038 §4.11",
    },
    {
      step_number: 12,
      title: "Instrumentación, Cableado y Sistema de Control",
      description: "Instalación de sensores: vibración de cojinetes (acelerómetros), temperatura de cojinetes (RTDs Pt100), presión de lubricación (transmisores), posición del molino (encoder GMD). Cableado a cajas de conexión (JBs). Prueba de continuidad y aislamiento. Loop check completo con DCS/PLC de planta. Calibración de transmisores.",
      weight_pct: 7,
      iom_ref: "IOM C.4817 §8 — Instrumentation",
      proc_ref: "PRO-0038 §4.12",
    },
    {
      step_number: 13,
      title: "Pre-Comisionamiento — Lubricación y Primera Rotación en Vacío",
      description: "Prueba de sistemas HP/LP en operación — verificar presiones, caudales y temperaturas. Levantamiento hidrostático de muñones (jacking oil). Primera rotación en vacío con inching drive — duración mínima 4 h. Monitoreo continuo: temperatura de cojinetes (alarma 60°C / disparo 70°C), vibración (alarma 7 mm/s), consumo de corriente. Firma de pre-comisionamiento checklist.",
      weight_pct: 4,
      iom_ref: "IOM C.4817 §9.1 — Pre-commissioning",
      proc_ref: "PRO-0038 §4.13",
    },
    {
      step_number: 14,
      title: "Comisionamiento bajo Carga y Ajuste Final",
      description: "Primera carga de mineral y bolas de acero. Monitoreo continuo de vibraciones, temperaturas, potencias y corriente del GMD. Ajuste de parámetros del convertidor de frecuencia. Verificación de torques de pernos de liners tras primera campaña (≥ 8 h operación). Firma de acta de comisionamiento por contratista, supervisor e interventor.",
      weight_pct: 3,
      iom_ref: "IOM C.4817 §9.2 — Load Commissioning",
      proc_ref: "PRO-0038 §4.14",
    },
  ],

  // ── MOLINO DE BOLAS 16' × 24.5' ──────────────────────────────
  "MIL-BM-001": [
    {
      step_number: 1,
      title: "Recepción e Inspección de Componentes",
      description: "Verificar componentes contra packing list. Inspección visual de daños por transporte. Registro fotográfico de todos los bultos. Verificación dimensional de shell, trunnions, piñón y corona dentada. Informe de recepción firmado.",
      weight_pct: 3,
      iom_ref: "IOM C.4817 §3 — Receipt & Inspection (BM)",
      proc_ref: "PRO-0038 §5.1",
    },
    {
      step_number: 2,
      title: "Preparación de Fundaciones y Pernos de Anclaje",
      description: "Verificación de cotas de fundación civil (tolerancia ±2 mm). Instalación de pernos de anclaje. Grouting con mortero epóxico. Nivelación final: tolerancia ≤ 0.05 mm/m.",
      weight_pct: 5,
      iom_ref: "IOM C.4817 §4.1 — Foundation Preparation (BM)",
      proc_ref: "PRO-0038 §5.2",
    },
    {
      step_number: 3,
      title: "Instalación y Nivelación de Pedestales de Cojinete",
      description: "Posicionamiento de pedestales sobre placas de base. Nivelación con calces de precisión. Verificación de paralelismo entre cojinetes (máx. 0.10 mm). Torque de pernos según especificación.",
      weight_pct: 7,
      iom_ref: "IOM C.4817 §4.2 — Bearing Pedestal (BM)",
      proc_ref: "PRO-0038 §5.3",
    },
    {
      step_number: 4,
      title: "Izaje e Instalación del Cuerpo del Molino (Shell)",
      description: "Plan de izaje aprobado (grúa ≥ 150 t). Ensamble de secciones del cuerpo con bridas y pernos Gr. 8.8. Torque secuencial en patrón estrella. Verificar alineación de bridas (max gap 0.3 mm).",
      weight_pct: 14,
      iom_ref: "IOM C.4817 §4.3 — Shell Assembly (BM)",
      proc_ref: "PRO-0038 §5.4",
    },
    {
      step_number: 5,
      title: "Instalación de Cabezas — Alimentación y Descarga",
      description: "Instalación de cabezas (heads). Alineación de trunnions. Verificación de runout radial (máx. 0.5 mm) y axial (máx. 0.3 mm). Ajuste de sellantes y torque final. Registro en ITR.",
      weight_pct: 10,
      iom_ref: "IOM C.4817 §4.4 — Head Installation (BM)",
      proc_ref: "PRO-0038 §5.5",
    },
    {
      step_number: 6,
      title: "Instalación de Revestimientos Internos y Parrilla de Descarga (Grate)",
      description: "Instalar liners de cuerpo y cabeza. Instalar parrilla de descarga (grate discharge). Torque de pernos de liner en dos etapas. Verificar ausencia de partes sueltas.",
      weight_pct: 10,
      iom_ref: "IOM C.4817 §5.1 — Liner Installation (BM)",
      proc_ref: "PRO-0038 §5.6",
    },
    {
      step_number: 7,
      title: "Montaje de Corona Dentada (Ring Gear)",
      description: "Instalación de la corona dentada sobre el cuerpo del molino. Alineación y verificación de concentricidad: runout axial máx. 0.5 mm, runout radial máx. 0.3 mm. Torque de pernos de corona según especificación. Verificar backlash inicial.",
      weight_pct: 9,
      iom_ref: "IOM C.4817 §6.3 — Ring Gear Installation (BM)",
      proc_ref: "PRO-0038 §5.7",
    },
    {
      step_number: 8,
      title: "Instalación de Piñón, Chumacera y Caja Reductora",
      description: "Instalación del piñón y su chumacera. Instalación de caja reductora. Alineación piñón-corona: verificar backlash (diseño ±10%), contact pattern (mínimo 65% de la cara). Torque de pernos de chumacera y reductor.",
      weight_pct: 9,
      iom_ref: "IOM C.4817 §6.4 — Pinion & Gearbox (BM)",
      proc_ref: "PRO-0038 §5.8",
    },
    {
      step_number: 9,
      title: "Instalación del Motor Principal y Acoplamiento Motor-Reductor",
      description: "Posicionamiento y fijación del motor 7,500 kW. Alineación motor-reductor (radial ≤ 0.05 mm, angular ≤ 0.05 mm). Instalación de acoplamiento flexible. Prueba de aislamiento ≥ 100 MΩ. Conexiones eléctricas de potencia y control.",
      weight_pct: 10,
      iom_ref: "IOM C.4817 §6.5 — Main Motor (BM)",
      proc_ref: "PRO-0038 §5.9",
    },
    {
      step_number: 10,
      title: "Sistema de Lubricación HP/LP (Trunnions y Piñón)",
      description: "Instalación de unidad HP/LP para cojinetes de muñón y piñón. Llenado con aceite ISO VG 320. Prueba de estanqueidad a 1.5× presión de diseño. Verificación de caudal y temperatura de retorno (máx. 55 °C).",
      weight_pct: 8,
      iom_ref: "IOM C.4817 §7 — Lube System (BM)",
      proc_ref: "PRO-0038 §5.10",
    },
    {
      step_number: 11,
      title: "Instrumentación y Sistema de Control",
      description: "Instalación de sensores de vibración, temperatura, presión de lubricación y posición. Cableado a tableros. Loop check completo con DCS/PLC. Calibración de instrumentos.",
      weight_pct: 6,
      iom_ref: "IOM C.4817 §8 — Instrumentation (BM)",
      proc_ref: "PRO-0038 §5.11",
    },
    {
      step_number: 12,
      title: "Pre-Comisionamiento — Lubricación y Primera Rotación en Vacío",
      description: "Prueba de sistemas HP/LP. Primera rotación en vacío con inching drive — duración mínima 4 h. Verificación de temperaturas (alarma 60°C), vibración (alarma 7 mm/s) y consumo de corriente. Firma de pre-comisionamiento checklist.",
      weight_pct: 6,
      iom_ref: "IOM C.4817 §9.1 — Pre-commissioning (BM)",
      proc_ref: "PRO-0038 §5.12",
    },
    {
      step_number: 13,
      title: "Carga de Bolas y Comisionamiento bajo Carga",
      description: "Carga inicial de bolas de acero forjado (35% vol.). Monitoreo continuo de vibraciones, temperaturas, potencia y corriente. Ajuste de parámetros de control. Verificación de torques de liner tras primera campaña. Firma de acta de comisionamiento.",
      weight_pct: 3,
      iom_ref: "IOM C.4817 §9.2 — Load Commissioning (BM)",
      proc_ref: "PRO-0038 §5.13",
    },
  ],

  // ── MOLINO DE BOLAS MB-02 (gemelo del MB-01) ──────────────────
  "MIL-BM-002": [
    {
      step_number: 1, title: "Recepción e Inspección de Componentes",
      description: "Idéntico al plan MB-01. Verificar componentes contra packing list. Inspección visual. Registro fotográfico. Verificación dimensional.",
      weight_pct: 3, iom_ref: "IOM C.4817 §3", proc_ref: "PRO-0038 §5.1",
    },
    {
      step_number: 2, title: "Preparación de Fundaciones y Pernos de Anclaje",
      description: "Verificación de cotas. Instalación de pernos. Grouting epóxico. Nivelación: tolerancia ≤ 0.05 mm/m.",
      weight_pct: 5, iom_ref: "IOM C.4817 §4.1", proc_ref: "PRO-0038 §5.2",
    },
    {
      step_number: 3, title: "Instalación y Nivelación de Pedestales de Cojinete",
      description: "Nivelación con calces de precisión. Paralelismo máx. 0.10 mm. Torque de pernos.",
      weight_pct: 7, iom_ref: "IOM C.4817 §4.2", proc_ref: "PRO-0038 §5.3",
    },
    {
      step_number: 4, title: "Izaje e Instalación del Cuerpo del Molino",
      description: "Plan de izaje aprobado. Ensamble con bridas y pernos Gr. 8.8. Torque secuencial estrella.",
      weight_pct: 14, iom_ref: "IOM C.4817 §4.3", proc_ref: "PRO-0038 §5.4",
    },
    {
      step_number: 5, title: "Instalación de Cabezas — Alimentación y Descarga",
      description: "Alineación de trunnions. Runout radial máx. 0.5 mm. Torque final.",
      weight_pct: 10, iom_ref: "IOM C.4817 §4.4", proc_ref: "PRO-0038 §5.5",
    },
    {
      step_number: 6, title: "Revestimientos Internos y Parrilla de Descarga",
      description: "Instalar liners y grate discharge. Torque en dos etapas.",
      weight_pct: 10, iom_ref: "IOM C.4817 §5.1", proc_ref: "PRO-0038 §5.6",
    },
    {
      step_number: 7, title: "Montaje de Corona Dentada",
      description: "Runout axial máx. 0.5 mm. Torque de pernos. Verificar backlash inicial.",
      weight_pct: 9, iom_ref: "IOM C.4817 §6.3", proc_ref: "PRO-0038 §5.7",
    },
    {
      step_number: 8, title: "Piñón, Chumacera y Caja Reductora",
      description: "Backlash ±10%. Contact pattern mínimo 65%.",
      weight_pct: 9, iom_ref: "IOM C.4817 §6.4", proc_ref: "PRO-0038 §5.8",
    },
    {
      step_number: 9, title: "Motor Principal y Acoplamiento",
      description: "Alineación radial ≤ 0.05 mm. Megger ≥ 100 MΩ.",
      weight_pct: 10, iom_ref: "IOM C.4817 §6.5", proc_ref: "PRO-0038 §5.9",
    },
    {
      step_number: 10, title: "Sistema de Lubricación HP/LP",
      description: "Prueba de estanqueidad 1.5×. Temperatura retorno máx. 55°C.",
      weight_pct: 8, iom_ref: "IOM C.4817 §7", proc_ref: "PRO-0038 §5.10",
    },
    {
      step_number: 11, title: "Instrumentación y Control",
      description: "Loop check completo. Calibración de instrumentos.",
      weight_pct: 6, iom_ref: "IOM C.4817 §8", proc_ref: "PRO-0038 §5.11",
    },
    {
      step_number: 12, title: "Pre-Comisionamiento en Vacío",
      description: "Duración mínima 4 h. Temperaturas, vibración y corriente dentro de límites.",
      weight_pct: 6, iom_ref: "IOM C.4817 §9.1", proc_ref: "PRO-0038 §5.12",
    },
    {
      step_number: 13, title: "Carga de Bolas y Comisionamiento bajo Carga",
      description: "35% vol. bolas forjadas. Monitoreo continuo. Firma acta.",
      weight_pct: 3, iom_ref: "IOM C.4817 §9.2", proc_ref: "PRO-0038 §5.13",
    },
  ],

  // ── ESPESADOR DE CONCENTRADO HRT-035 ─────────────────────────────
  "ESP-CON-001": [
    {
      step_number: 1,
      title: "Recepción, Inspección y Trazabilidad",
      description: "Verificación de componentes contra packing list del fabricante Metso. Inspección de preservación de superficies mecanizadas y componentes hidráulicos. Revisión dimensional de placas base y columnas radiales. Registro fotográfico de todos los bultos. Informe de recepción firmado por inspector QA/QC.",
      weight_pct: 3,
      iom_ref: "OU500911039 §3 — Receipt & Inspection",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.1",
    },
    {
      step_number: 2,
      title: "Verificación Topográfica Inicial",
      description: "Liberación topográfica de la fundación civil: cotas de pedestales y pernos de anclaje (Planos Metso OU602289964). Tolerancias: nivel ±2 mm, planeidad ≤ 0.5 mm/m. Verificación de la posición y verticalidad de los pernos de anclaje. Registro y aprobación por topógrafo certificado.",
      weight_pct: 2,
      iom_ref: "OU500911039 §4.1 — Foundation Verification",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.2",
    },
    {
      step_number: 3,
      title: "Montaje de Estructura Soporte",
      description: "Izaje e instalación de columnas radiales y centrales. Instalación de arriostramientos cruzados y anillo de compresión. Nivelación y plomado de columnas (tolerancia ≤ 1 mm/m). Atornillado de bridas con squirter washers (API 650 / RCSC) y torque secuencial en patrón estrella. Verificación topográfica intermedia.",
      weight_pct: 15,
      iom_ref: "OU500911039 §4.2 — Support Structure",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.3",
    },
    {
      step_number: 4,
      title: "Montaje de Piso y Pared del Tanque",
      description: "Ensamblaje de segmentos de piso y pared en suelo y elevación por secciones. Atornillado progresivo con squirter washers — torque final según RCSC: snug + 1/2 vuelta. Aplicación de sellante aprobado por Metso en todas las juntas (interior y exterior). Prueba de hermeticidad visual por cuadrillas. Control topográfico de circularidad (max ovalidad 0.5% del diámetro).",
      weight_pct: 20,
      iom_ref: "OU500911039 §4.3 — Tank Assembly",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.4",
    },
    {
      step_number: 5,
      title: "Montaje del Mecanismo de Giro y Elevación de Rastra",
      description: "Instalación del reductor de velocidades (Reggiana Riduttori, relación TBD). Instalación del anillo giratorio central y sistema hidráulico de accionamiento (SAI GM2 300). Montaje del elevador de rastras hidráulico Mega (300 mm de recorrido). Conexión provisional de HPU para pruebas. Verificación de holguras y alineación de eje central.",
      weight_pct: 15,
      iom_ref: "OU500911039 §5 — Drive Mechanism",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.5",
    },
    {
      step_number: 6,
      title: "Ensamble e Instalación del Puente",
      description: "Armado en piso del puente con verificación de precamber de diseño. Torqueo de todas las uniones estructurales (squirter washers). Izaje del puente en tándem (si longitud > 30 m) o izaje simple. Instalación y nivelación sobre la pared del tanque. Verificación de deflexión máxima admisible.",
      weight_pct: 10,
      iom_ref: "OU500911039 §4.4 — Bridge Assembly",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.6",
    },
    {
      step_number: 7,
      title: "Instalación del Pozo de Alimentación (Reactorwell™)",
      description: "Pre-ensamble del cuerpo del Metso Reactorwell™ (Ø 4,000 mm) en suelo. Instalación de puertos Autodil™ (Autodilución direccional) e internos de distribución de floculante. Izaje e instalación desde el puente. Nivelación y alineación concéntrica. Conexión de línea de floculante y puertos de muestreo.",
      weight_pct: 10,
      iom_ref: "OU500911039 §6 — Feedwell Installation",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.7",
    },
    {
      step_number: 8,
      title: "Instalación de Componentes Internos (Rastras)",
      description: "Montaje de brazos de rastra largos (×2) y cortos (×2) al eje central. Instalación de palas raspadoras de suelo. Montaje del steady bearing (rodamiento del pasador fijo inferior). Instalación de scraper y anillo de desgaste. Verificación del paralelismo de brazos (tolerancia ±5 mm en extremos) y holgura con el suelo (mín. 50 mm).",
      weight_pct: 10,
      iom_ref: "OU500911039 §7 — Rake Arms & Internals",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.8",
    },
    {
      step_number: 9,
      title: "Nivelación Final, Torqueo y Tuberías / HPU",
      description: "Nivelación final de brazos de rastra con verificación de tolerancias Metso. Torqueo final de toda la tornillería estructural con registro en ITR. Tendido e interconexión de líneas hidráulicas (SAI → HPU). Conexión de unidad HPU (Motor WEG 11 kW, 460 V, 60 Hz). Instalación de tuberías de alimentación, underflow y rebose.",
      weight_pct: 5,
      iom_ref: "OU500911039 §8 — Piping & HPU",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.9",
    },
    {
      step_number: 10,
      title: "Pre-Comisionamiento — Prueba en Seco",
      description: "Giro manual completo de rastras (360°) verificando ausencia de interferencias mecánicas. Encendido de bomba hidráulica HPU y verificación de presión de operación. Prueba de levantamiento hidráulico del elevador de rastras (stroke 300 mm). Calibración del sensor de torque y verificación de enclavamientos de disparo. Firma de checklist de prueba en seco.",
      weight_pct: 5,
      iom_ref: "OU500911039 Anexo 1 §A1.1 — Dry Test",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.10",
    },
    {
      step_number: 11,
      title: "Pre-Comisionamiento — Prueba Húmeda y con Pulpa",
      description: "Llenado del tanque con agua limpia. Prueba de fugas estática (24 h) — presión hidrostática a nivel de rebose. Inspección de todas las juntas atornilladas y puntos de sellado. Giro de rastras sumergidas verificando torque hidráulico dentro de límites de diseño. Prueba con pulpa (si está disponible): verificación de comportamiento reológico y sedimentación. Firma de acta de pre-comisionamiento por contratista, QA/QC e interventor Metso.",
      weight_pct: 5,
      iom_ref: "OU500911039 Anexo 1 §A1.2 — Wet Test",
      proc_ref: "LM-HLGS-C-1000-3940-PRO-0034 §4.11",
    },
  ],
};
