// ============================================================================
// NEXUS COMMAND CENTER — Technical Data Module
// Source: DOC MOLINO / Metso IOM C.4817 / ARIS MINING - Lower Mining Marmato
// ============================================================================

// ---------------------------------------------------------------------------
// PHASES: Enriched from IOM Manual + Installation Stages
// ---------------------------------------------------------------------------
export const PHASES_METADATA = [
  {
    id: 1,
    title: "NIVEL 1: CIMENTACIÓN Y PLACAS BASE",
    desc: "Preparación civil: Chipping de cimentación, limpieza a metal blanco, grouting epóxico según Metso Spec. Trazado topográfico de ejes y colocación de Anchor Bolts Cast-In según planos BCI.",
    spec: "Resistencia Concrete: 35 MPa · Planeidad: ≤0.08mm TIR",
    tools: "Nivel Óptico, Topografía, Galgas",
    icon: "foundation",
    protocols: ["QA-QC-BM-01"],
    docRef: "BCI-1624 / BCI-2216, CCPD, CLL"
  },
  {
    id: 2,
    title: "NIVEL 2: CHUMACERAS (TRUNNION BEARINGS)",
    desc: "Asentamiento de cojinetes hidrostáticos Trunnion Bearings sobre placas base alineadas. Inspección de patrón de contacto con Azul Prusia (>85%). Verificación de coplanaridad.",
    spec: "Contacto: >85% Azul Prusia · Coplanaridad ±0.002\"",
    tools: "Galgas, Azul Prusia, Alineador Láser",
    icon: "bearings",
    protocols: ["QA-QC-BM-01", "QA-QC-BM-03"],
    docRef: "IOM Pág. 726"
  },
  {
    id: 3,
    title: "NIVEL 3: CUERPO DEL MOLINO (SHELL ASSEMBLY)",
    desc: "Secuencia de izaje: Bottom Feed Shell → Top Feed Shell → Discharge End Halves → Feed/Discharge Heads → Trunnions. Según Installation Stages IS-2216/IS-1624.",
    spec: "Concentricidad: ±0.005\" · Alineación de marcas 0°",
    tools: "Grúas Dual Lift, Rigging certificado",
    icon: "shell",
    protocols: [],
    docRef: "IS-2216-18 Sht1-3, IS-1624-18 Sht2"
  },
  {
    id: 4,
    title: "NIVEL 4: CORONA DENTADA (GIRTH GEAR)",
    desc: "Acoplamiento de la corona a la brida diametral del molino. Centrado absoluto obligatorio. Verificación de Runout Axial y Radial en 4 posiciones (0°, 90°, 180°, 270°).",
    spec: "Runout Axial: <0.015\" · Backlash: 0.030\"-0.045\"",
    tools: "Tensionadores Hidráulicos, Comparadores",
    icon: "gear",
    protocols: ["QA-QC-BM-05"],
    docRef: "IOM Pág. 737+"
  },
  {
    id: 5,
    title: "NIVEL 5: TREN DE POTENCIA (DRIVE TRAIN)",
    desc: "Alineación Motor → Reductor (Main Gearbox) → Piñón (Pinion Assembly). Engrane final con la corona. Incluye Barring Drive para giro lento de mantenimiento.",
    spec: "Backlash Final: 0.030\"-0.045\" · Alineación Láser",
    tools: "Alineador Láser, Galgas de Espesores",
    icon: "drivetrain",
    protocols: ["QA-QC-BM-02", "QA-QC-BM-05"],
    docRef: "IOM Pág. 670, 696, 701, 704"
  }
];

// ---------------------------------------------------------------------------
// INSTALLATION STAGES: Ball Mill 16'x24.5' (1624) — from IS drawings  
// ---------------------------------------------------------------------------
export const INSTALLATION_STAGES_1624 = [
  { stage: 1, action: "LIFT BOTTOM FEED SHELL ONTO CRADLES", actionEs: "Izar mitad inferior carcasa alimentación sobre soportes", weight: "16,852 kg", checked: false },
  { stage: 2, action: "LIFT TOP FEED SHELL (INCL. BALL PORT) ONTO BOTTOM SHELL", actionEs: "Izar mitad superior carcasa alimentación sobre la mitad inferior", weight: "16,820 kg", checked: false },
  { stage: 3, action: "SECURE DISCHARGE END HALF TO FEED END SHELL (Part 1)", actionEs: "Instalar primera mitad de carcasa de descarga", weight: "16,776 kg", checked: false },
  { stage: 4, action: "SECURE DISCHARGE END HALF TO FEED END SHELL (Part 2)", actionEs: "Instalar segunda mitad de carcasa de descarga", weight: "16,776 kg", checked: false },
  { stage: 5, action: "SECURE FEED END HEAD HALF 1 TO SHELL CAN", actionEs: "Asegurar primera mitad cabeza de alimentación", weight: "18,650 kg", checked: false },
  { stage: 6, action: "SECURE FEED END HEAD HALF 2 TO SHELL CAN", actionEs: "Asegurar segunda mitad cabeza de alimentación", weight: "18,650 kg", checked: false },
  { stage: 7, action: "SECURE DISCHARGE END HEAD HALF 1 TO SHELL CAN", actionEs: "Asegurar primera mitad cabeza de descarga", weight: "18,650 kg", checked: false },
  { stage: 8, action: "SECURE DISCHARGE END HEAD HALF 2 TO SHELL CAN", actionEs: "Asegurar segunda mitad cabeza de descarga", weight: "18,650 kg", checked: false },
  { stage: 9, action: "SECURE FEED END TRUNNION TO FEED END HEADS", actionEs: "Asegurar Chumacera/Trunnion de Alimentación", weight: "14,450 kg", checked: false },
  { stage: 10, action: "SECURE DISCHARGE TRUNNION TO DISCHARGE HEAD", actionEs: "Asegurar Chumacera/Trunnion de Descarga", weight: "14,450 kg", checked: false },
];

// ---------------------------------------------------------------------------
// FASTENER INVENTORY: From Tornilleria_Especifica_Molinos.xlsx
// ---------------------------------------------------------------------------
export interface FastenerItem {
  equipo: string;
  aplicacion: string;
  uso: string;
  cantidad: number;
  tamano: string;
  material: string;
  observaciones: string;
}

export const FASTENER_INVENTORY: FastenerItem[] = [
  { equipo: "Molino Bolas (1624)", aplicacion: "Trunnion Bearings Located (Outside)", uso: "Anclaje", cantidad: 4, tamano: "M68 x 1950", material: "Grado 8.8 (Tipo 1)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Trunnion Bearings Located (Inside)", uso: "Anclaje", cantidad: 4, tamano: "M42 x 1750", material: "Grado 8.8 (Tipo 1)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Trunnion Bearing Non-Located (Outside)", uso: "Anclaje", cantidad: 4, tamano: "M68 x 1950", material: "Grado 8.8 (Tipo 1)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Trunnion Bearing Non-Located (Inside)", uso: "Anclaje", cantidad: 4, tamano: "M42 x 1750", material: "Grado 8.8 (Tipo 1)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Pinion Bearing (Outside)", uso: "Anclaje", cantidad: 4, tamano: "M68 x 1800", material: "EN19T (Tipo 2)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Pinion Bearing (Inside)", uso: "Anclaje", cantidad: 2, tamano: "M48 x 1650", material: "EN19T (Tipo 2)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Molino Bolas (1624)", aplicacion: "Barring Gearbox", uso: "Anclaje", cantidad: 7, tamano: "M36 x 1300", material: "EN19T (Tipo 2)", observaciones: "Tuercas Gr. 8, Arandelas Templadas. Dureza 45 HRC." },
  { equipo: "Ambos (1624 y 2216)", aplicacion: "Pernos de Girth Gear (Corona Dentada)", uso: "Transmisión", cantidad: 0, tamano: "Por Revisar", material: "EN19T o superior", observaciones: "Verificar Pág. 737+ en el IOM Manual." },
];

// ---------------------------------------------------------------------------
// COMPONENT INVENTORY: From Listado_Componentes_Montaje_Discriminado.xlsx
// ---------------------------------------------------------------------------
export interface ComponentItem {
  item: number;
  equipo: string;
  codigo: string;
  componente: string;
  paginaIOM: string;
  estado: string;
  observaciones: string;
}

export const COMPONENTS_BOLAS_1624: ComponentItem[] = [
  { item: 1, equipo: "Molino de Bolas", codigo: "1624", componente: "Trunnion Bearings (Cojinetes de Soporte)", paginaIOM: "Pág. 726", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 2, equipo: "Molino de Bolas", codigo: "1624", componente: "Feed Chute (Conducto de Alimentación)", paginaIOM: "Pág. 729", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 3, equipo: "Molino de Bolas", codigo: "1624", componente: "Trommel Screen (Criba Trommel)", paginaIOM: "Pág. 734", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 4, equipo: "Molino de Bolas", codigo: "1624", componente: "Mill Liners (Revestimientos del Molino)", paginaIOM: "Pág. 707", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 5, equipo: "Molino de Bolas", codigo: "1624", componente: "Main Drive Motor (Motor Principal)", paginaIOM: "Pág. 670", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 6, equipo: "Molino de Bolas", codigo: "1624", componente: "Main Drive Gearbox (Caja Reductora Principal)", paginaIOM: "Pág. 696", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 7, equipo: "Molino de Bolas", codigo: "1624", componente: "Pinion Assembly (Conjunto de Piñón)", paginaIOM: "Pág. 704", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 8, equipo: "Molino de Bolas", codigo: "1624", componente: "Barring Drive Assembly (Accionamiento Auxiliar)", paginaIOM: "Pág. 701", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 9, equipo: "Molino de Bolas", codigo: "1624", componente: "Lubrication Systems (Sistemas de Lubricación)", paginaIOM: "Pág. 710", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 10, equipo: "Molino de Bolas", codigo: "1624", componente: "Fastener Schedule (Tornillería y Fijaciones)", paginaIOM: "Pág. 737", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 11, equipo: "Molino de Bolas", codigo: "1624", componente: "Mill Jacks (Gatos Hidráulicos)", paginaIOM: "Pág. 753", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 12, equipo: "Molino de Bolas", codigo: "1624", componente: "Equipment Guards (Guardas de Protección)", paginaIOM: "Pág. 758", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 13, equipo: "Molino de Bolas", codigo: "1624", componente: "Lifting Arrangements (Dispositivos de Izaje)", paginaIOM: "Pág. 761", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
];

export const COMPONENTS_SAG_2216: ComponentItem[] = [
  { item: 1, equipo: "Molino SAG", codigo: "2216", componente: "Trunnion Bearings (Cojinetes de Soporte)", paginaIOM: "Pág. 726", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 2, equipo: "Molino SAG", codigo: "2216", componente: "Feed Chute (Conducto de Alimentación)", paginaIOM: "Pág. 729", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 3, equipo: "Molino SAG", codigo: "2216", componente: "Trommel Screen (Criba Trommel)", paginaIOM: "Pág. 734", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 4, equipo: "Molino SAG", codigo: "2216", componente: "Mill Liners (Revestimientos del Molino)", paginaIOM: "Pág. 707", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 5, equipo: "Molino SAG", codigo: "2216", componente: "Main Drive Motor (Motor Principal)", paginaIOM: "Pág. 670", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 6, equipo: "Molino SAG", codigo: "2216", componente: "Main Drive Gearbox (Caja Reductora Principal)", paginaIOM: "Pág. 696", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 7, equipo: "Molino SAG", codigo: "2216", componente: "Pinion Assembly (Conjunto de Piñón)", paginaIOM: "Pág. 704", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 8, equipo: "Molino SAG", codigo: "2216", componente: "Barring Drive Assembly (Accionamiento Auxiliar)", paginaIOM: "Pág. 701", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 9, equipo: "Molino SAG", codigo: "2216", componente: "Lubrication Systems (Sistemas de Lubricación)", paginaIOM: "Pág. 710", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 10, equipo: "Molino SAG", codigo: "2216", componente: "Fastener Schedule (Tornillería y Fijaciones)", paginaIOM: "Pág. 737", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 11, equipo: "Molino SAG", codigo: "2216", componente: "Mill Jacks (Gatos Hidráulicos)", paginaIOM: "Pág. 753", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 12, equipo: "Molino SAG", codigo: "2216", componente: "Equipment Guards (Guardas de Protección)", paginaIOM: "Pág. 758", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
  { item: 13, equipo: "Molino SAG", codigo: "2216", componente: "Lifting Arrangements (Dispositivos de Izaje)", paginaIOM: "Pág. 761", estado: "Pendiente", observaciones: "Requiere validación en sitio" },
];

// ---------------------------------------------------------------------------
// PROJECT KPIs (Simulated defaults for Dashboard)
// ---------------------------------------------------------------------------
export const PROJECT_INFO = {
  nombre: "LOWER MINING MARMATO",
  cliente: "ARIS MINING",
  contratista: "NCP INTERNATIONAL",
  equipos: ["Molino SAG 22' x 16' (2216)", "Molino de Bolas 16' x 24.5' (1624)"],
  documentoBase: "MIL24.001-IC-10-001 — IOM Manual Metso",
  normas: ["Metso IOM C.4817", "ASME Y14.5 GD&T", "ISO 2768"],
};
