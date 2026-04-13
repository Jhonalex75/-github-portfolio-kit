import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// ─── Professional Data ────────────────────────────────────────────────────────
const PROF_LICENSE  = 'CL230-31983';
const PROF_NAME     = 'MSC. ING. JHON ALEXANDER VALENCIA MARULANDA';
const PROF_ROLE     = 'Senior Mechanical Engineer — Monitor Maestro';
const CERT_ISO      = 'ISO 9001:2015 — Cert. No. CO23-1234-QMS';
const SYSTEM_VER    = 'NEXUS Command Center v2.1 — SGS Quality Portal';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyReportData {
  id?: string;
  metadata: {
    consecutiveId: string;
    date: string;
    weather: string;
    authorUid: string;
    authorName: string;
    frente: string;
    proyectoRef?: string;
    status?: string;
  };
  recursos: Array<{ type: string; count: number }>;
  checklist_hse: {
    workAtHeights: boolean;
    hotWork: boolean;
    confinedSpace: boolean;
    scaffolding: boolean;
    hasActiveRisk?: boolean;
  };
  activities: string;
  evidence: Array<{
    type: 'photo' | 'pdf';
    urlOrBase64: string;
    name: string;
    uploadMethod?: string;
  }>;
  // ── Extended Fields ──
  contractors?: Array<{
    name: string;
    personnel: number;
    breakdown?: { mecanicos?: number; soldadores?: number; auxiliares?: number; armadores?: number };
    equipment?: { grua?: number; generador?: number; andamios?: number; camionGrua?: number; torreGrua?: number; equipoEspecial?: string };
    lostHours?: { malClima?: number; parosHSE?: number; fallasTecnicas?: number };
  }>;
  safety_info?: {
    comments: string;
    incidents: number;
    nearMisses: number;
    eppObservations: string;
    lessonsLearned: string;
  };
  admin_activities?: Array<{ name: string; progress: number }>;
  // ── Per-contractor sections (new format) ──
  contractor_sections?: Record<string, {
    activities:     string;
    personnel:      { mecanicos: number; soldadores: number; auxiliares: number; armadores: number; inspectoresHSE: number };
    checklist:      { workAtHeights: boolean; hotWork: boolean; confinedSpace: boolean; scaffolding: boolean };
    safetyInfo:     { comments: string; incidents: number; nearMisses: number; eppObservations: string; lessonsLearned: string };
    equipment:      { grua: number; generador: number; andamios: number; camionGrua: number; torreGrua: number; equipoEspecial: string };
    lostHours:      { malClima: number; parosHSE: number; fallasTecnicas: number };
    weldingMetrics?: Array<{ estructura: string; metrajeMl: number; soldadores: number }>;
  }>;
}

// ─── SGS Color Palette ────────────────────────────────────────────────────────
const C = {
  sgsOrange:  'FFFF6B00',
  sgsDark:    'FF1A1A2E',
  black:      'FF0A0E14',
  cyan:       'FF00BCD4',
  gold:       'FFD4A017',
  white:      'FFFFFFFF',
  darkBg:     'FF0B1018',
  amber:      'FFFFA000',
  red:        'FFD32F2F',
  green:      'FF2E7D32',
  greenLight: 'FFE8F5E9',
  gray:       'FF424242',
  lightGray:  'FFF5F5F5',
  midGray:    'FFECEFF1',
  orange:     'FFFF6B00',
  yellowWarn: 'FFFFF9C4',
  redWarn:    'FFFFEBEE',
  blueLight:  'FFE3F2FD',
};

// ─── Style Factories ──────────────────────────────────────────────────────────
function hdr(bg: string, fg = C.white, sz = 10, bold = true): Partial<ExcelJS.Style> {
  return {
    font: { bold, name: 'Calibri', size: sz, color: { argb: fg } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: { top: thin(C.gray), bottom: thin(C.gray), left: thin(C.gray), right: thin(C.gray) },
  };
}
function dat(bg = C.white, fg = C.black, sz = 10): Partial<ExcelJS.Style> {
  return {
    font: { name: 'Calibri', size: sz, color: { argb: fg } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true },
    border: { top: thin('FFD0D0D0'), bottom: thin('FFD0D0D0'), left: thin('FFD0D0D0'), right: thin('FFD0D0D0') },
  };
}
function thin(argb: string): Partial<ExcelJS.Border>  { return { style: 'thin',   color: { argb } }; }
function thick(argb: string): Partial<ExcelJS.Border> { return { style: 'medium', color: { argb } }; }

// ─── Reusable section header ──────────────────────────────────────────────────
function sectionHeader(ws: ExcelJS.Worksheet, title: string, bg: string, cols = 2) {
  ws.addRow([]);
  const rn = ws.rowCount;
  ws.mergeCells(`A${rn}:${String.fromCharCode(64 + cols)}${rn}`);
  const cell = ws.getCell(`A${rn}`);
  cell.value = `◆  ${title}`;
  Object.assign(cell, hdr(bg, C.white, 10));
  cell.font = { bold: true, name: 'Calibri', size: 10, color: { argb: C.white } };
  ws.getRow(rn).height = 22;
}

// ─── SGS/ISO Document Header (common to all sheets) ──────────────────────────
function addDocumentHeader(
  ws: ExcelJS.Worksheet,
  sheetTitle: string,
  report: DailyReportData,
  cols: number,
) {
  const lastCol = String.fromCharCode(64 + cols);

  // Row 1: SGS / Company band
  ws.mergeCells(`A1:${lastCol}1`);
  const r1 = ws.getCell('A1');
  r1.value = `SGS S.A.  |  DOCUMENTO CONTROLADO — ${CERT_ISO}`;
  Object.assign(r1, hdr(C.sgsOrange, C.white, 9));
  ws.getRow(1).height = 18;

  // Row 2: Main document title
  ws.mergeCells(`A2:${lastCol}2`);
  const r2 = ws.getCell('A2');
  r2.value = `ARIS MINING S.A.S.  |  ${sheetTitle}`;
  Object.assign(r2, hdr(C.black, C.white, 14));
  ws.getRow(2).height = 34;

  // Row 3: Project reference
  ws.mergeCells(`A3:${lastCol}3`);
  const r3 = ws.getCell('A3');
  r3.value = `Proyecto: ${report.metadata.proyectoRef || 'MIL24.001 — Lower Mining Marmato'}   |   Folio: ${report.metadata.consecutiveId}   |   Fecha: ${new Date(report.metadata.date).toLocaleDateString('es-CO', { dateStyle: 'full' })}`;
  Object.assign(r3, hdr(C.sgsDark, C.gold, 9));
  ws.getRow(3).height = 18;

  // Row 4: Control meta band (document code / revision / page)
  const docCode = `DOC-NEXUS-${report.metadata.consecutiveId}`;
  let cell4a: ExcelJS.Cell;
  let cell4b: ExcelJS.Cell;
  let cell4c: ExcelJS.Cell;
  if (cols >= 4) {
    const midLeft  = Math.floor(cols / 2);
    const midRight = midLeft + 1;
    ws.mergeCells(`A4:${String.fromCharCode(64 + midLeft)}4`);
    ws.mergeCells(`${String.fromCharCode(64 + midRight)}4:${lastCol}4`);
    cell4a = ws.getCell('A4');
    cell4b = ws.getCell(`${String.fromCharCode(64 + midRight)}4`);
  } else {
    ws.mergeCells(`A4:B4`);
    cell4a = ws.getCell('A4');
    cell4b = cell4a;
  }
  cell4a.value = `Código: ${docCode}   Rev: 01   Emisor: ${PROF_NAME}   Matrícula: ${PROF_LICENSE}`;
  Object.assign(cell4a, dat(C.midGray, C.gray, 8));
  cell4a.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(4).height = 16;

  ws.addRow([]); // spacer
}

// ─── Common footer (last row) ─────────────────────────────────────────────────
function addFooter(ws: ExcelJS.Worksheet, cols: number) {
  ws.addRow([]);
  const rn = ws.rowCount;
  const lastCol = String.fromCharCode(64 + cols);
  ws.mergeCells(`A${rn}:${lastCol}${rn}`);
  const cell = ws.getCell(`A${rn}`);
  cell.value =
    `Documento generado electrónicamente por ${SYSTEM_VER}  |  ` +
    `${PROF_NAME}  |  Mat. Prof.: ${PROF_LICENSE}  |  ${CERT_ISO}  |  ` +
    `${new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' })}`;
  Object.assign(cell, {
    font: { italic: true, size: 8, color: { argb: '999E9E9E' }, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsOrange } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  });
  ws.getRow(rn).height = 28;
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 1 — REPORTE DIARIO OPERATIVO
// ═════════════════════════════════════════════════════════════════════════════
async function buildSheetReporteDiario(wb: ExcelJS.Workbook, report: DailyReportData) {
  const ws = wb.addWorksheet('1. REPORTE DIARIO', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToHeight: 0, fitToWidth: 1 },
  });
  ws.columns = [{ key: 'campo', width: 36 }, { key: 'valor', width: 68 }];

  // ── Normalize HSE checklist — supports old ('checklist') and new ('checklist_hse') field names ──
  const anyReport = report as any;
  const hse = report.checklist_hse ?? anyReport.checklist ?? {
    workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false, hasActiveRisk: false,
  };
  // Normalize recursos — may be undefined in old documents
  const recursos = report.recursos ?? [];

  addDocumentHeader(ws, 'REPORTE DIARIO DE MONTAJE INDUSTRIAL', report, 2);

  // ── Identification ──
  sectionHeader(ws, 'IDENTIFICACIÓN DEL REPORTE', C.black);
  const metaRows: [string, string][] = [
    ['Consecutivo / Folio ID',   report.metadata.consecutiveId],
    ['Fecha de Operación',        new Date(report.metadata.date).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })],
    ['Frente / Empresa Principal', report.metadata.frente],
    ['Condición Climática',        report.metadata.weather],
    ['Supervisor Emisor',          report.metadata.authorName],
    ['Matrícula Profesional',      PROF_LICENSE],
    ['Estado del Folio',           (report.metadata.status || 'ANCLADO').toUpperCase()],
    ['Proyecto',                   report.metadata.proyectoRef || 'ARIS MINING — MIL24.001'],
    ['Sistema de Gestión',         CERT_ISO],
  ];
  metaRows.forEach(([campo, valor]) => {
    ws.addRow([campo, valor]);
    const row = ws.getRow(ws.rowCount);
    Object.assign(row.getCell(1), dat(C.midGray, C.black)); row.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
    Object.assign(row.getCell(2), dat(C.white, C.black));
    row.height = 18;
  });

  // ── Activities ──
  sectionHeader(ws, 'NARRATIVA DE ACTIVIDADES EJECUTADAS', C.gray);
  ws.addRow(['Descripción Detallada', report.activities || 'Sin descripción registrada']);
  const actRow = ws.getRow(ws.rowCount);
  Object.assign(actRow.getCell(1), dat(C.midGray, C.black)); actRow.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
  Object.assign(actRow.getCell(2), dat(C.white, C.black));
  actRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  actRow.height = 100;

  // ── Recursos internos ──
  const activeRecursos = recursos.filter(r => r.type && r.count > 0);
  const totalPersonal = activeRecursos.reduce((s, r) => s + r.count, 0);
  sectionHeader(ws, `POOL DE RECURSOS HUMANOS DIRECTOS — Total: ${totalPersonal} personas`, C.gold);
  ws.addRow(['TIPO DE RECURSO / ESPECIALIDAD', 'CANTIDAD']);
  const rHead = ws.getRow(ws.rowCount);
  Object.assign(rHead.getCell(1), hdr(C.gold, C.black)); Object.assign(rHead.getCell(2), hdr(C.gold, C.black));
  rHead.height = 18;
  if (activeRecursos.length > 0) {
    activeRecursos.forEach(r => {
      ws.addRow([r.type, r.count]);
      const row = ws.getRow(ws.rowCount);
      Object.assign(row.getCell(1), dat(C.white, C.black));
      Object.assign(row.getCell(2), dat(C.white, C.black)); row.getCell(2).alignment = { horizontal: 'center' };
      row.height = 18;
    });
    ws.addRow(['TOTAL PERSONAL DIRECTO', totalPersonal]);
    const totRow = ws.getRow(ws.rowCount);
    Object.assign(totRow.getCell(1), hdr(C.sgsDark, C.gold, 10));
    Object.assign(totRow.getCell(2), hdr(C.sgsDark, C.gold, 10));
    totRow.height = 20;
  } else {
    ws.addRow(['Sin recursos directos registrados', '—']);
  }

  // ── HSE Checklist ──
  sectionHeader(ws, 'CHECKLIST HSE — PERMISOS DE TRABAJO ACTIVOS', C.red);
  ws.addRow(['TIPO DE PERMISO / RIESGO', 'ESTADO']);
  const hseHead = ws.getRow(ws.rowCount);
  Object.assign(hseHead.getCell(1), hdr(C.red)); Object.assign(hseHead.getCell(2), hdr(C.red));
  hseHead.height = 18;
  const hseItems: [string, boolean][] = [
    ['🪜  Trabajo en Alturas  — Certificación requerida',    !!hse.workAtHeights],
    ['🔥  Trabajo en Caliente  — APT obligatorio',           !!hse.hotWork],
    ['⚠️   Espacios Confinados  — Monitoreo atmosférico',    !!hse.confinedSpace],
    ['🏗️  Andamios Certificados  — Inspección diaria',       !!hse.scaffolding],
  ];
  hseItems.forEach(([label, active]) => {
    ws.addRow([label, active ? '✅  AUTORIZADO — APT FIRMADO Y VALIDADO' : '—  N/A — Sin riesgo identificado para esta actividad']);
    const row = ws.getRow(ws.rowCount);
    const bg = active ? C.yellowWarn : C.white;
    Object.assign(row.getCell(1), dat(bg, C.black)); Object.assign(row.getCell(2), dat(bg, active ? 'FF8B4000' : C.gray));
    row.getCell(2).font = { bold: active, name: 'Calibri', size: 10, color: { argb: active ? C.amber : C.gray } };
    row.height = 18;
  });
  if (hse.hasActiveRisk) {
    ws.addRow(['⚠️ ALERTA — PERMISOS DE TRABAJO ACTIVOS', 'Verificar APT antes de iniciar labores']);
    const alertRow = ws.getRow(ws.rowCount);
    Object.assign(alertRow.getCell(1), hdr(C.amber, C.black)); Object.assign(alertRow.getCell(2), hdr(C.amber, C.black));
    alertRow.height = 20;
  }

  // ── Evidence list ──
  if (report.evidence && report.evidence.length > 0) {
    sectionHeader(ws, `BÓVEDA DE EVIDENCIA FOTOGRÁFICA (${report.evidence.length} adjunto(s))`, C.cyan);
    ws.addRow(['ARCHIVO / NOMBRE', 'ORIGEN / HIPERVÍNCULO']);
    const evHead = ws.getRow(ws.rowCount);
    Object.assign(evHead.getCell(1), hdr(C.cyan)); Object.assign(evHead.getCell(2), hdr(C.cyan));
    evHead.height = 18;

    for (const ev of report.evidence) {
      if (ev.type === 'photo') {
        try {
          let base64Data = ev.urlOrBase64;
          let extension: 'jpeg' | 'png' | 'gif' = 'png';
          if (ev.urlOrBase64.startsWith('http')) {
            const response = await fetch(ev.urlOrBase64);
            if (!response.ok) throw new Error('CORS');
            const ab = await response.arrayBuffer();
            let bin = '';
            new Uint8Array(ab).forEach(b => bin += String.fromCharCode(b));
            base64Data = window.btoa(bin);
            const ct = response.headers.get('content-type') || 'image/png';
            extension = ct.includes('jpeg') || ct.includes('jpg') ? 'jpeg' : 'png';
          } else {
            const parts = ev.urlOrBase64.split(',');
            if (parts.length > 1) {
              base64Data = parts[1];
              const m = parts[0].match(/image\/(jpeg|jpg|png|gif)/);
              if (m) extension = (m[1] === 'jpg' ? 'jpeg' : m[1]) as 'jpeg' | 'png' | 'gif';
            }
          }
          const imageId = wb.addImage({ base64: base64Data, extension });
          ws.addRow([`📷  ${ev.name}`, ev.uploadMethod === 'storage' ? '☁️  Firebase Storage — URL pública' : '💾  Base64 local']);
          ws.getRow(ws.rowCount).height = 18;
          const imgRow = ws.rowCount;
          ws.addRow([]);  ws.getRow(ws.rowCount).height = 170;
          ws.addImage(imageId, { tl: { col: 1, row: imgRow }, ext: { width: 340, height: 214 } });
        } catch {
          ws.addRow([`📷  ${ev.name}`, ev.urlOrBase64.startsWith('http') ? ev.urlOrBase64 : '(Base64)']);
          const r = ws.getRow(ws.rowCount);
          if (ev.urlOrBase64.startsWith('http')) r.getCell(2).value = { text: '↗ Abrir fotografía', hyperlink: ev.urlOrBase64 } as ExcelJS.CellHyperlinkValue;
          r.height = 18;
        }
      } else {
        ws.addRow([`📄  ${ev.name}`, '']);
        const r = ws.getRow(ws.rowCount);
        if (ev.urlOrBase64.startsWith('http')) r.getCell(2).value = { text: '↗ Descargar PDF', hyperlink: ev.urlOrBase64 } as ExcelJS.CellHyperlinkValue;
        else r.getCell(2).value = 'PDF almacenado en sistema';
        r.height = 18;
      }
    }
  }

  addFooter(ws, 2);
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 2 — CONTRATISTAS: PERSONAL, EQUIPOS Y HORAS PERDIDAS
// ═════════════════════════════════════════════════════════════════════════════
function buildSheetContratistas(wb: ExcelJS.Workbook, report: DailyReportData) {
  // 10 columns: N° | Contratista | Mecánicos | Soldadores | Auxiliares | Armadores | Total | Grúa | Generador | Andamios | C.Grúa | T.Grúa | Equipo Esp. | H.Clima | H.HSE | H.TécFalla
  const COLS = 16;
  const ws = wb.addWorksheet('2. CONTRATISTAS', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { key: 'n',        width: 5  },
    { key: 'empresa',  width: 32 },
    { key: 'mec',      width: 11 },
    { key: 'sold',     width: 11 },
    { key: 'aux',      width: 11 },
    { key: 'arm',      width: 11 },
    { key: 'tot',      width: 11 },
    { key: 'grua',     width: 10 },
    { key: 'gen',      width: 11 },
    { key: 'and',      width: 12 },
    { key: 'cgrua',    width: 12 },
    { key: 'tgrua',    width: 12 },
    { key: 'esp',      width: 22 },
    { key: 'hclima',   width: 12 },
    { key: 'hhse',     width: 12 },
    { key: 'htec',     width: 13 },
  ];

  addDocumentHeader(ws, 'CONTRATISTAS — PERSONAL, EQUIPOS Y HORAS PERDIDAS', report, COLS);

  // ── SECCIÓN PERSONAL ──────────────────────────────────────────────────────
  sectionHeader(ws, 'PERSONAL POR CONTRATISTA (Clasificación por Especialidad)', C.sgsOrange, COLS);

  ws.addRow(['N°','EMPRESA / CONTRATISTA','MECÁNICOS','SOLDADORES','AUXILIARES','ARMADORES','TOTAL PERS.','GRÚA (und)','GENERADOR','ANDAMIOS (m³)','CAM. GRÚA','TORRE GRÚA','EQUIPO ESPECIAL','H.MAL CLIMA','H.PARO HSE','H.FALLA TÉC.']);
  const hR = ws.rowCount;
  // Headers section: personal (cyan-ish), equipment (green-ish), lost hours (red-ish)
  const colColors: [string, string][] = [
    [C.sgsDark, C.gold],   // N°
    [C.sgsDark, C.gold],   // Empresa
    ['FF006064', C.white], // Mecánicos
    ['FF006064', C.white], // Soldadores
    ['FF006064', C.white], // Auxiliares
    ['FF006064', C.white], // Armadores
    ['FF004D40', C.white], // Total
    ['FF1B5E20', C.white], // Grúa
    ['FF1B5E20', C.white], // Generador
    ['FF1B5E20', C.white], // Andamios
    ['FF1B5E20', C.white], // Cam.Grúa
    ['FF1B5E20', C.white], // Torre Grúa
    ['FF1B5E20', C.white], // Equipo Esp.
    ['FF7B1FA2', C.white], // H.Clima
    ['FF880E4F', C.white], // H.HSE
    ['FFB71C1C', C.white], // H.Falla
  ];
  colColors.forEach(([bg, fg], ci) => {
    const colLetter = String.fromCharCode(65 + ci);
    const cell = ws.getCell(`${colLetter}${hR}`);
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font   = { bold: true, name: 'Calibri', size: 9, color: { argb: fg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: thin(C.gray), bottom: thin(C.gray), left: thin(C.gray), right: thin(C.gray) };
  });
  ws.getRow(hR).height = 28;

  const totalDirectos = report.recursos.filter(r => r.count > 0).reduce((s, r) => s + r.count, 0);

  // Contractor color map (matches UI design)
  const CONTRACTOR_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
    'HL-GISAICO':   { bg: 'FFE3F2FD', fg: 'FF0D47A1', label: '🏗️ HL-GISAICO — CONTRATISTA PRINCIPAL (MECÁNICA/CIVIL)' },
    'TECNITANQUES': { bg: 'FFE8F5E9', fg: 'FF1B5E20', label: '🛢️ TECNITANQUES — SISTEMA LIXIVIACIÓN' },
    'CYC':          { bg: 'FFF3E5F5', fg: 'FF4A148C', label: '⚗️ CYC — SISTEMA CIP' },
  };

  // Build normalized contractor rows: prefer new contractor_sections, fall back to legacy contractors[]
  const CONTRACTOR_IDS = ['HL-GISAICO', 'TECNITANQUES', 'CYC'] as const;
  type ContractorRow = {
    name: string; mec: number; sold: number; aux: number; arm: number; tot: number;
    grua: number; gen: number; and: number; cg: number; tg: number; esp: string;
    hcl: number; hhse: number; htec: number;
  };

  let contractorRows: ContractorRow[] = [];
  if (report.contractor_sections) {
    // New format
    contractorRows = CONTRACTOR_IDS.map(id => {
      const s = report.contractor_sections![id] ?? {};
      const p  = s.personnel   ?? {};
      const eq = s.equipment   ?? {};
      const lh = s.lostHours   ?? {};
      const mec  = (p.mecanicos      ?? 0);
      const sold = (p.soldadores     ?? 0);
      const aux  = (p.auxiliares     ?? 0);
      const arm  = (p.armadores      ?? 0);
      const insp = (p.inspectoresHSE ?? 0);
      return {
        name: id,
        mec, sold, aux, arm, tot: mec + sold + aux + arm + insp,
        grua: eq.grua ?? 0, gen: eq.generador ?? 0, and: eq.andamios ?? 0,
        cg: eq.camionGrua ?? 0, tg: eq.torreGrua ?? 0, esp: eq.equipoEspecial || '—',
        hcl: lh.malClima ?? 0, hhse: lh.parosHSE ?? 0, htec: lh.fallasTecnicas ?? 0,
      };
    });
  } else {
    // Legacy format
    contractorRows = (report.contractors || []).map(c => {
      const bd = c.breakdown ?? {};
      const eq = c.equipment ?? {};
      const lh = c.lostHours ?? {};
      const mec  = bd.mecanicos  ?? 0;
      const sold = bd.soldadores ?? 0;
      const aux  = bd.auxiliares ?? 0;
      const arm  = bd.armadores  ?? 0;
      return {
        name: c.name,
        mec, sold, aux, arm, tot: mec + sold + aux + arm || c.personnel || 0,
        grua: eq.grua ?? 0, gen: eq.generador ?? 0, and: eq.andamios ?? 0,
        cg: eq.camionGrua ?? 0, tg: eq.torreGrua ?? 0, esp: eq.equipoEspecial || '—',
        hcl: lh.malClima ?? 0, hhse: lh.parosHSE ?? 0, htec: lh.fallasTecnicas ?? 0,
      };
    });
  }

  let totalMec = 0, totalSold = 0, totalAux = 0, totalArm = 0, totalPers = 0;
  let totalGrua = 0, totalGen = 0, totalAnd = 0, totalCG = 0, totalTG = 0;
  let totalHClima = 0, totalHHSE = 0, totalHTec = 0;

  if (contractorRows.length > 0) {
    contractorRows.forEach((c, idx) => {
      const { mec, sold, aux, arm, tot, grua, gen, and: and_, cg, tg, esp, hcl, hhse, htec } = c;

      totalMec += mec; totalSold += sold; totalAux += aux; totalArm += arm; totalPers += tot;
      totalGrua += grua; totalGen += gen; totalAnd += and_; totalCG += cg; totalTG += tg;
      totalHClima += hcl; totalHHSE += hhse; totalHTec += htec;

      const cStyle = CONTRACTOR_STYLE[c.name] ?? { bg: idx % 2 === 0 ? C.white : C.lightGray, fg: C.black, label: c.name };
      const bg = cStyle.bg;

      ws.addRow([idx + 1, cStyle.label, mec, sold, aux, arm, tot, grua, gen, and_, cg, tg, esp, hcl, hhse, htec]);
      const rn  = ws.rowCount;
      const row = ws.getRow(rn);

      ws.getCell(`A${rn}`).alignment = { horizontal: 'center' };
      ws.getCell(`B${rn}`).font = { bold: true, name: 'Calibri', size: 10, color: { argb: cStyle.fg } };
      ws.getCell(`B${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };

      // Center numeric columns
      'CDEFGHIJKLMN'.split('').forEach(col => {
        const cell = ws.getCell(`${col}${rn}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
        cell.font = { name: 'Calibri', size: 10, color: { argb: C.black } };
      });
      // Color lost hours if > 0
      (['N','O','P'] as const).forEach((col, ci) => {
        const vals = [hcl, hhse, htec];
        const cell = ws.getCell(`${col}${rn}`);
        const hasLoss = vals[ci] > 0;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasLoss ? 'FFFFEBEE' : bg } };
        cell.font = { bold: hasLoss, name: 'Calibri', size: 10, color: { argb: hasLoss ? 'FFCC0000' : C.black } };
        cell.alignment = { horizontal: 'center' };
      });
      ws.getCell(`A${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      ws.getCell(`A${rn}`).border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
      row.height = 22;
    });

    // Totals
    const addTotalsRow = (label: string, vals: (number|string)[], bg: string, fg: string) => {
      ws.addRow(['', label, ...vals]);
      const rn = ws.rowCount; const row = ws.getRow(rn);
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = { bold: true, name: 'Calibri', size: 10, color: { argb: fg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: thick(C.gray), bottom: thick(C.gray), left: thin(C.gray), right: thin(C.gray) };
      });
      ws.getCell(`B${rn}`).alignment = { horizontal: 'left', vertical: 'middle' };
      row.height = 22;
    };

    addTotalsRow('SUBTOTAL CONTRATISTAS', [totalMec, totalSold, totalAux, totalArm, totalPers, totalGrua, totalGen, totalAnd, totalCG, totalTG, '', totalHClima.toFixed(1), totalHHSE.toFixed(1), totalHTec.toFixed(1)], C.sgsDark, C.gold);
    addTotalsRow('PERSONAL DIRECTO EN CAMPO (Supervisor)', [0, 0, 0, 0, totalDirectos, 0, 0, 0, 0, 0, '', 0, 0, 0], C.gray, C.white);

    ws.addRow(['', '✅  TOTAL GENERAL EN CAMPO', totalMec, totalSold, totalAux, totalArm, totalPers + totalDirectos, totalGrua, totalGen, totalAnd, totalCG, totalTG, '', totalHClima.toFixed(1), totalHHSE.toFixed(1), totalHTec.toFixed(1)]);
    const gR = ws.rowCount; const gRow = ws.getRow(gR);
    gRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
      cell.font = { bold: true, name: 'Calibri', size: 11, color: { argb: C.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: thick(C.gray), bottom: thick(C.gray), left: thin(C.gray), right: thin(C.gray) };
    });
    ws.getCell(`B${gR}`).alignment = { horizontal: 'left', vertical: 'middle' };
    gRow.height = 26;

    // ── RESUMEN DE HORAS PERDIDAS ─────────────────────────────────────────
    if (totalHClima + totalHHSE + totalHTec > 0) {
      sectionHeader(ws, 'RESUMEN CONSOLIDADO — HORAS PERDIDAS POR CAUSA', 'FFAD1457', COLS);
      ws.addRow(['', 'CAUSA', '', '', '', '', 'HORAS PERDIDAS', '', '', '', '', '', '', '', '', '']);
      const lhH = ws.rowCount;
      ws.mergeCells(`B${lhH}:F${lhH}`);
      ws.mergeCells(`G${lhH}:P${lhH}`);
      Object.assign(ws.getCell(`B${lhH}`), hdr('FFAD1457', C.white));
      Object.assign(ws.getCell(`G${lhH}`), hdr('FFAD1457', C.white));
      ws.getRow(lhH).height = 20;

      const lhData: [string, number, string][] = [
        ['🌧️  Mal Clima / Condiciones Atmosféricas', totalHClima, 'Lluvia, tormenta eléctrica, viento fuerte'],
        ['🚨  Paros HSE / Seguridad Industrial',     totalHHSE,   'Incidentes, near-miss, inspecciones, reuniones safety'],
        ['🔧  Fallas Técnicas / Problemas de Equipos', totalHTec, 'Averías mecánicas, eléctricas, falta de insumos'],
      ];
      const totalLost = totalHClima + totalHHSE + totalHTec;
      lhData.forEach(([causa, horas, desc], i) => {
        ws.addRow(['', causa, '', '', '', '', horas.toFixed(1), '', '', '', '', '', '', '', '', desc]);
        const rn = ws.rowCount;
        ws.mergeCells(`B${rn}:F${rn}`);
        ws.mergeCells(`G${rn}:M${rn}`);
        ws.mergeCells(`N${rn}:P${rn}`);
        const bg = i % 2 === 0 ? 'FFFCE4EC' : 'FFFFF3E0';
        ws.getCell(`B${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        ws.getCell(`B${rn}`).font = { bold: true, name: 'Calibri', size: 10 };
        ws.getCell(`B${rn}`).alignment = { vertical: 'middle' };
        ws.getCell(`G${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: horas > 0 ? 'FFFFEBEE' : C.white } };
        ws.getCell(`G${rn}`).font = { bold: horas > 0, name: 'Calibri', size: 12, color: { argb: horas > 0 ? 'FFCC0000' : C.gray } };
        ws.getCell(`G${rn}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell(`N${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        ws.getCell(`N${rn}`).font = { italic: true, name: 'Calibri', size: 9, color: { argb: C.gray } };
        ws.getCell(`N${rn}`).alignment = { wrapText: true, vertical: 'top' };
        ws.getRow(rn).height = 22;
      });

      ws.addRow(['', '⏱  TOTAL HORAS PERDIDAS EN EL DÍA', '', '', '', '', totalLost.toFixed(1),'','','','','','','','','']);
      const tlR = ws.rowCount;
      ws.mergeCells(`B${tlR}:F${tlR}`);
      ws.mergeCells(`G${tlR}:P${tlR}`);
      Object.assign(ws.getCell(`B${tlR}`), hdr('FFAD1457', C.white));
      Object.assign(ws.getCell(`G${tlR}`), hdr('FFAD1457', C.white));
      ws.getCell(`G${tlR}`).font = { bold: true, name: 'Calibri', size: 13, color: { argb: C.white } };
      ws.getRow(tlR).height = 26;
    }
  } else {
    ws.addRow(['—', 'Sin contratistas registrados en este folio', ...Array(14).fill('')]);
    ws.mergeCells(`B${ws.rowCount}:P${ws.rowCount}`);
    ws.getRow(ws.rowCount).eachCell(c => Object.assign(c, dat(C.lightGray, C.gray)));
    ws.getRow(ws.rowCount).height = 22;
  }

  addFooter(ws, COLS);
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 3 — AVANCES ADMINISTRATIVOS
// ═════════════════════════════════════════════════════════════════════════════
function buildSheetAvances(wb: ExcelJS.Workbook, report: DailyReportData) {
  const ws = wb.addWorksheet('3. AVANCES ADMIN', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });
  // 14 columns: A(name), B(%), C-L(progress bar cells x10), M(status)
  ws.columns = [
    { key: 'actividad', width: 46 },
    { key: 'pct',       width: 10 },
    ...Array.from({ length: 10 }, (_, i) => ({ key: `b${i}`, width: 4 })),
    { key: 'estado',    width: 24 },
    { key: 'fecha',     width: 20 },
  ];

  addDocumentHeader(ws, 'AVANCES DE ACTIVIDADES ADMINISTRATIVAS', report, 14);

  sectionHeader(ws, 'CONTROL DE AVANCE — GESTIÓN Y ADMINISTRACIÓN DEL PROYECTO', C.sgsDark, 14);

  // Column headers
  ws.addRow(['ACTIVIDAD ADMINISTRATIVA', '%', ...(Array(10).fill('')), 'ESTADO', 'PRÓXIMA ACCIÓN']);
  const hRow = ws.getRow(ws.rowCount);
  ws.mergeCells(`C${ws.rowCount}:L${ws.rowCount}`);
  Object.assign(ws.getCell(`A${ws.rowCount}`), hdr(C.sgsDark, C.gold));
  Object.assign(ws.getCell(`B${ws.rowCount}`), hdr(C.sgsDark, C.gold));
  Object.assign(ws.getCell(`C${ws.rowCount}`), hdr(C.sgsDark, C.gold));
  Object.assign(ws.getCell(`M${ws.rowCount}`), hdr(C.sgsDark, C.gold));
  Object.assign(ws.getCell(`N${ws.rowCount}`), hdr(C.sgsDark, C.gold));
  ws.getCell(`C${ws.rowCount}`).value = 'BARRA DE AVANCE VISUAL';
  hRow.height = 22;

  const activities = report.admin_activities || [];
  if (activities.length > 0) {
    activities.forEach((act, idx) => {
      const pct = Math.max(0, Math.min(100, act.progress));
      const filled = Math.round(pct / 10); // 0-10 filled cells
      const status = pct < 30 ? '🔴  CRÍTICO' : pct < 70 ? '🟡  EN PROGRESO' : pct < 100 ? '🟢  AVANZADO' : '✅  COMPLETADO';
      const bgStatus = pct < 30 ? C.redWarn : pct < 70 ? C.yellowWarn : C.greenLight;

      const rowData = [act.name, `${pct}%`, ...Array(10).fill(''), status, ''];
      ws.addRow(rowData);
      const rn = ws.rowCount;
      const row = ws.getRow(rn);
      const bg = idx % 2 === 0 ? C.white : C.lightGray;

      Object.assign(ws.getCell(`A${rn}`), dat(bg, C.black));
      ws.getCell(`A${rn}`).font = { name: 'Calibri', size: 10, bold: false };

      Object.assign(ws.getCell(`B${rn}`), dat(bgStatus, C.black));
      ws.getCell(`B${rn}`).font = { bold: true, name: 'Calibri', size: 10 };
      ws.getCell(`B${rn}`).alignment = { horizontal: 'center', vertical: 'middle' };

      // Progress bar cells C–L
      for (let i = 0; i < 10; i++) {
        const colLetter = String.fromCharCode(67 + i); // C=67
        const isFilled = i < filled;
        const barBg = isFilled
          ? (pct < 30 ? 'FFEF5350' : pct < 70 ? 'FFFFB300' : 'FF66BB6A')
          : 'FFEEEEEE';
        const cell = ws.getCell(`${colLetter}${rn}`);
        cell.value = isFilled ? '▌' : '';
        Object.assign(cell, {
          fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: barBg } },
          font:      { name: 'Calibri', size: 8, color: { argb: barBg } },
          alignment: { horizontal: 'center', vertical: 'middle' },
          border:    { left: thin('FFCCCCCC'), right: thin('FFCCCCCC') },
        });
      }

      Object.assign(ws.getCell(`M${rn}`), dat(bgStatus, C.black));
      ws.getCell(`M${rn}`).font = { bold: true, name: 'Calibri', size: 9 };
      ws.getCell(`M${rn}`).alignment = { horizontal: 'center', vertical: 'middle' };

      Object.assign(ws.getCell(`N${rn}`), dat(bg, C.gray));
      row.height = 20;
    });

    // Average row
    const avg = Math.round(activities.reduce((s, a) => s + a.progress, 0) / activities.length);
    ws.addRow([]);
    const avgN = ws.rowCount;
    ws.mergeCells(`A${avgN}:B${avgN}`);
    ws.mergeCells(`C${avgN}:N${avgN}`);
    ws.getCell(`A${avgN}`).value = `AVANCE PROMEDIO GENERAL — GESTIÓN ADMINISTRATIVA`;
    Object.assign(ws.getCell(`A${avgN}`), hdr(C.sgsOrange, C.white, 11));
    ws.getCell(`C${avgN}`).value = `${avg}%  ${avg < 50 ? '⚠️ Requiere Aceleración' : avg < 80 ? '📈 En Buen Ritmo' : '🏆 Excelente Avance'}`;
    Object.assign(ws.getCell(`C${avgN}`), hdr(C.sgsOrange, C.white, 12));
    ws.getRow(avgN).height = 26;
  } else {
    ws.addRow(['Sin actividades administrativas registradas', '—', ...Array(12).fill('')]);
    ws.getRow(ws.rowCount).height = 22;
  }

  addFooter(ws, 14);
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 4 — SEGURIDAD INDUSTRIAL
// ═════════════════════════════════════════════════════════════════════════════
function buildSheetSeguridad(wb: ExcelJS.Workbook, report: DailyReportData) {
  const ws = wb.addWorksheet('4. HSE & SEGURIDAD', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true },
  });
  ws.columns = [{ key: 'campo', width: 36 }, { key: 'valor', width: 68 }];

  addDocumentHeader(ws, 'INFORME DE SEGURIDAD INDUSTRIAL — HSE CONSOLIDADO', report, 2);

  const safety = report.safety_info;
  // ── Normalize HSE + recursos for this sheet too ──
  const anyRep2 = report as any;
  const hse2 = report.checklist_hse ?? anyRep2.checklist ?? {
    workAtHeights: false, hotWork: false, confinedSpace: false, scaffolding: false, hasActiveRisk: false,
  };
  const recursos2 = report.recursos ?? [];

  // ── HSE Indicators ──
  sectionHeader(ws, 'INDICADORES HSE DEL DÍA', C.red);
  const indicators: [string, string | number][] = [
    ['Incidentes Reportados',         safety?.incidents   ?? 0],
    ['Cuasi-Accidentes (Near Miss)',   safety?.nearMisses  ?? 0],
    ['Permisos de Trabajo Activos',    Object.values(hse2).filter(Boolean).length],
    ['Personal Total en Campo',        ((report.contractors || []).reduce((s, c) => s + c.personnel, 0)) + (recursos2.filter(r => r.count > 0).reduce((s, r) => s + r.count, 0))],
  ];
  indicators.forEach(([campo, valor]) => {
    ws.addRow([campo, valor]);
    const rn = ws.rowCount;
    const row = ws.getRow(rn);
    Object.assign(ws.getCell(`A${rn}`), dat(C.midGray, C.black));
    ws.getCell(`A${rn}`).font = { bold: true, name: 'Calibri', size: 10 };
    const isAlert = typeof valor === 'number' && valor > 0 && campo.includes('Incidente');
    Object.assign(ws.getCell(`B${rn}`), dat(isAlert ? C.redWarn : C.white, C.black));
    ws.getCell(`B${rn}`).font = { bold: isAlert, name: 'Calibri', size: 11, color: { argb: isAlert ? 'FFCC0000' : C.black } };
    ws.getCell(`B${rn}`).alignment = { horizontal: 'center' };
    row.height = 22;
  });

  // ── Full HSE Matrix ──
  sectionHeader(ws, 'MATRIZ COMPLETA DE PERMISOS DE TRABAJO', C.sgsDark);
  ws.addRow(['PERMISO / TIPO DE RIESGO', 'ESTADO Y DISPOSICIÓN']);
  const hseHead = ws.getRow(ws.rowCount);
  Object.assign(hseHead.getCell(1), hdr(C.sgsDark, C.gold)); Object.assign(hseHead.getCell(2), hdr(C.sgsDark, C.gold));
  hseHead.height = 20;

  const permisos: [string, boolean, string][] = [
    ['🪜  Trabajo en Alturas (>1.5m) — Certificación obligatoria ARL', !!hse2.workAtHeights, 'Arnés, línea de vida, permiso firmado supervisor y HSE'],
    ['🔥  Trabajo en Caliente — Soldadura, corte, esmerilado',         !!hse2.hotWork,       'Extintor en sitio, retiro de inflamables, vigía de fuego'],
    ['⚠️   Espacios Confinados — Tanques, sótanos, tuberías',          !!hse2.confinedSpace, 'Monitor 4 gases, comunicación permanente, rescatista en standby'],
    ['🏗️  Andamios Certificados — Más de 2 cuerpos',                   !!hse2.scaffolding,   'Tarjeta verde vigente, inspección diaria, amarres certificados'],
  ];
  permisos.forEach(([label, active, measures]) => {
    ws.addRow([label, active ? `✅ ACTIVO — ${measures}` : '⬜ N/A — Sin actividad de este tipo en el turno']);
    const rn = ws.rowCount; const row = ws.getRow(rn);
    const bg = active ? C.yellowWarn : C.white;
    Object.assign(ws.getCell(`A${rn}`), dat(bg, C.black));
    ws.getCell(`A${rn}`).font = { bold: active, name: 'Calibri', size: 10 };
    Object.assign(ws.getCell(`B${rn}`), dat(bg, active ? 'FF5D4037' : C.gray));
    ws.getCell(`B${rn}`).font = { bold: false, name: 'Calibri', size: 9, color: { argb: active ? 'FF5D4037' : C.gray } };
    row.height = 24;
  });

  // ── Safety Comments ──
  sectionHeader(ws, 'OBSERVACIONES DE SEGURIDAD INDUSTRIAL — NARRATIVA DEL TURNO', C.amber);
  ws.addRow(['Comentarios y Observaciones HSE', safety?.comments || 'Sin observaciones adicionales de seguridad.']);
  const commRow = ws.getRow(ws.rowCount);
  Object.assign(commRow.getCell(1), dat(C.midGray, C.black)); commRow.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
  Object.assign(commRow.getCell(2), dat(C.yellowWarn, C.black));
  commRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  commRow.height = 80;

  ws.addRow(['Observaciones EPP', safety?.eppObservations || 'Cumplimiento satisfactorio de EPP en campo.']);
  const eppRow = ws.getRow(ws.rowCount);
  Object.assign(eppRow.getCell(1), dat(C.midGray, C.black)); eppRow.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
  Object.assign(eppRow.getCell(2), dat(C.white, C.black));
  eppRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  eppRow.height = 50;

  ws.addRow(['Lecciones Aprendidas HSE', safety?.lessonsLearned || 'Sin lecciones aprendidas registradas.']);
  const llRow = ws.getRow(ws.rowCount);
  Object.assign(llRow.getCell(1), dat(C.midGray, C.black)); llRow.getCell(1).font = { bold: true, name: 'Calibri', size: 10 };
  Object.assign(llRow.getCell(2), dat(C.blueLight, C.black));
  llRow.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  llRow.height = 60;

  // ── Digital Signature ──
  sectionHeader(ws, 'FIRMA DIGITAL DE CERTIFICACIÓN TÉCNICA — VALIDACIÓN HSE', C.black);
  const sigRows: [string, string][] = [
    ['Nombre Completo',         PROF_NAME],
    ['Matrícula Profesional',   PROF_LICENSE],
    ['Cargo',                   PROF_ROLE],
    ['Especialidad',            'Ingeniería Mecánica de Montaje Industrial'],
    ['Sistema de Gestión',      CERT_ISO],
    ['Proyecto Certificado',    report.metadata.proyectoRef || 'ARIS MINING — MIL24.001'],
    ['Folio Referenciado',      report.metadata.consecutiveId],
    ['Documento Generado',      new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'long' })],
    ['Sistema Emisor',          SYSTEM_VER],
  ];
  sigRows.forEach(([campo, valor]) => {
    ws.addRow([campo, valor]);
    const rn = ws.rowCount; const row = ws.getRow(rn);
    Object.assign(ws.getCell(`A${rn}`), dat('FF1A1A2E', C.gold));
    ws.getCell(`A${rn}`).font = { bold: true, name: 'Calibri', size: 10, color: { argb: C.gold } };
    Object.assign(ws.getCell(`B${rn}`), dat('FF1A1A2E', C.white));
    row.height = 18;
  });

  addFooter(ws, 2);
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 5 — REPORTE COMPLETO POR CONTRATISTA (layout tipo PDF)
// ═════════════════════════════════════════════════════════════════════════════
function buildSheetNarrativasContratistas(wb: ExcelJS.Workbook, report: DailyReportData) {
  const sections = report.contractor_sections;
  if (!sections) return;

  const COLS = 6;
  const CONTRACTORS = [
    { id: 'HL-GISAICO',   label: '\u{1F3D7}\uFE0F  HL-GISAICO',   sistema: 'CONTRATISTA PRINCIPAL \u2014 MEC\u00C1NICA Y CIVIL', headerBg: 'FF0D47A1', rowBg: 'FFE3F2FD', fg: 'FF0D47A1', weld: false },
    { id: 'TECNITANQUES', label: '\u{1F6E2}\uFE0F  TECNITANQUES', sistema: 'SISTEMA LIXIVIACI\u00D3N',                            headerBg: 'FF1B5E20', rowBg: 'FFE8F5E9', fg: 'FF1B5E20', weld: true  },
    { id: 'CYC',          label: '\u2697\uFE0F  CYC',             sistema: 'SISTEMA CIP',                                         headerBg: 'FF4A148C', rowBg: 'FFF3E5F5', fg: 'FF4A148C', weld: true  },
  ];

  const ws = wb.addWorksheet('5. DETALLE CONTRATISTAS', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToHeight: 0, fitToWidth: 1 },
  });
  ws.columns = [
    { key: 'a', width: 6  },
    { key: 'b', width: 30 },
    { key: 'c', width: 14 },
    { key: 'd', width: 2  },
    { key: 'e', width: 30 },
    { key: 'f', width: 14 },
  ];

  addDocumentHeader(ws, 'REPORTE DETALLADO POR CONTRATISTA \u2014 ISO 9001:2015', report, COLS);

  // ── helpers ──
  const contractorBanner = (label: string, sistema: string, total: number, bg: string) => {
    ws.addRow([]);
    const rn = ws.rowCount;
    ws.mergeCells(`A${rn}:F${rn}`);
    const cell = ws.getCell(`A${rn}`);
    cell.value = `${label}   |   ${sistema}   |   \uD83D\uDC77 ${total} personas`;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font  = { bold: true, name: 'Calibri', size: 12, color: { argb: C.white } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = { left: { style: 'thick', color: { argb: 'FFFF6B00' } } };
    ws.getRow(rn).height = 28;
  };

  const subHdr = (title: string, fromCol: string, toCol: string, bg: string) => {
    ws.addRow([]);
    const rn = ws.rowCount;
    ws.mergeCells(`${fromCol}${rn}:${toCol}${rn}`);
    const cell = ws.getCell(`${fromCol}${rn}`);
    cell.value = `\u25C6  ${title}`;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font  = { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(rn).height = 20;
  };

  const styleCell5 = (col: string, rn: number, val: string | number | undefined, bold: boolean, bg: string, fg = C.black, center = false) => {
    const cell = ws.getCell(`${col}${rn}`);
    cell.value = val ?? '';
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font  = { bold, name: 'Calibri', size: 9, color: { argb: fg } };
    cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
    cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle', wrapText: true };
  };

  for (const cfg of CONTRACTORS) {
    const data = sections[cfg.id];
    if (!data) continue;
    const p  = data.personnel;
    const eq = data.equipment;
    const si = data.safetyInfo;
    const ck = data.checklist;
    const lh = data.lostHours;
    const totalP = p.mecanicos + p.soldadores + p.auxiliares + p.armadores + p.inspectoresHSE;

    contractorBanner(cfg.label, cfg.sistema, totalP, cfg.headerBg);

    // ── ACTIVIDADES ──
    subHdr('NARRATIVA DE ACTIVIDADES EJECUTADAS', 'A', 'F', C.gray);
    const lines = (data.activities || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length > 0) {
      lines.forEach((line, i) => {
        ws.addRow([i + 1, line, '', '', '', '']);
        const rn = ws.rowCount;
        ws.mergeCells(`B${rn}:F${rn}`);
        const bg = i % 2 === 0 ? C.white : cfg.rowBg;
        styleCell5('A', rn, i + 1, true,  bg, cfg.fg, true);
        styleCell5('B', rn, line,  false, bg, C.black);
        ws.getCell(`B${rn}`).alignment = { vertical: 'top', wrapText: true };
        ws.getRow(rn).height = 20;
      });
    } else {
      ws.addRow(['', 'Sin actividades registradas.', '', '', '', '']);
      const rn = ws.rowCount;
      ws.mergeCells(`B${rn}:F${rn}`);
      styleCell5('B', rn, 'Sin actividades registradas.', false, cfg.rowBg, C.gray);
      ws.getRow(rn).height = 18;
    }

    // ── PERSONAL + EQUIPOS (side-by-side) ──
    ws.addRow([]);
    const phRn = ws.rowCount;
    ws.mergeCells(`A${phRn}:C${phRn}`);
    ws.mergeCells(`E${phRn}:F${phRn}`);
    const mkPH = (col: string, title: string) => {
      const cell = ws.getCell(`${col}${phRn}`);
      cell.value = `\u25C6  ${title}`;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF455A64' } };
      cell.font  = { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    };
    mkPH('A', 'RECURSO HUMANO');
    ws.getCell(`D${phRn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    mkPH('E', 'EQUIPOS Y MAQUINARIA');
    ws.getRow(phRn).height = 20;

    // sub-header row
    ws.addRow([]);
    const shRn = ws.rowCount;
    [['A','N\u00B0'],['B','ESPECIALIDAD'],['C','CANT.'],['D',''],['E','EQUIPO'],['F','CANT.']].forEach(([col, val]) => {
      const cell = ws.getCell(`${col}${shRn}`);
      cell.value = val;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col === 'D' ? 'FFF0F0F0' : 'FF546E7A' } };
      cell.font  = { bold: true, name: 'Calibri', size: 8, color: { argb: C.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: thin(C.gray), bottom: thin(C.gray), left: thin(C.gray), right: thin(C.gray) };
    });
    ws.getRow(shRn).height = 16;

    const personRows: [string, number][] = [
      ['Mec\u00E1nicos Armadores', p.mecanicos],
      ['Soldadores Calificados', p.soldadores],
      ['Auxiliares / Ayudantes', p.auxiliares],
      ['Armadores Estructurales', p.armadores],
      ['Inspectores HSE', p.inspectoresHSE],
    ];
    const equipRows: [string, string | number][] = [
      ['Gr\u00FAa', eq.grua],
      ['Generador', eq.generador],
      ['Andamios (m\u00B3)', eq.andamios],
      ['Cami\u00F3n Gr\u00FAa', eq.camionGrua],
      ['Torre Gr\u00FAa', eq.torreGrua],
    ];
    for (let i = 0; i < 5; i++) {
      const pr = personRows[i];
      const er = equipRows[i];
      const bg = i % 2 === 0 ? C.white : cfg.rowBg;
      ws.addRow([]);
      const rn = ws.rowCount;
      const sR = (col: string, val: string | number | undefined, bold = false, center = false) => {
        const cell = ws.getCell(`${col}${rn}`);
        cell.value = val ?? '';
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col === 'D' ? 'FFF0F0F0' : bg } };
        cell.font  = { bold, name: 'Calibri', size: 9, color: { argb: bold ? cfg.fg : C.black } };
        cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle' };
        cell.border = { top: thin('FFEEEEEE'), bottom: thin('FFEEEEEE'), left: thin('FFEEEEEE'), right: thin('FFEEEEEE') };
      };
      sR('A', i + 1, true, true);
      sR('B', pr[0]);  sR('C', pr[1], true, true);
      sR('D', '');
      sR('E', er[0]);  sR('F', er[1], true, true);
      ws.getRow(rn).height = 17;
    }

    // totals row
    ws.addRow([]);
    const totRn = ws.rowCount;
    ['A','B','C','D','E','F'].forEach(col => {
      const cell = ws.getCell(`${col}${totRn}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col === 'D' ? 'FFF0F0F0' : cfg.headerBg } };
      cell.font = { bold: true, name: 'Calibri', size: 9, color: { argb: col === 'D' ? C.black : C.white } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: thick(C.gray), bottom: thick(C.gray) };
    });
    ws.mergeCells(`A${totRn}:B${totRn}`);
    ws.getCell(`A${totRn}`).value = 'TOTAL PERSONAL';
    ws.getCell(`A${totRn}`).alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getCell(`C${totRn}`).value = totalP;
    if (eq.equipoEspecial) {
      ws.mergeCells(`E${totRn}:F${totRn}`);
      ws.getCell(`E${totRn}`).value = `Equipo especial: ${eq.equipoEspecial}`;
      ws.getCell(`E${totRn}`).font = { italic: true, name: 'Calibri', size: 8, color: { argb: C.white } };
      ws.getCell(`E${totRn}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    }
    ws.getRow(totRn).height = 20;

    // ── HSE CHECKLIST ──
    subHdr('CHECKLIST HSE \u2014 PERMISOS DE TRABAJO ACTIVOS', 'A', 'F', 'FFB71C1C');
    const hseItems: [string, boolean, string][] = [
      ['\uD83E\uDEDC  Trabajo en Alturas',    !!ck.workAtHeights, '\u2705 AUTORIZADO \u2014 APT FIRMADO Y VALIDADO'],
      ['\uD83D\uDD25  Trabajo en Caliente',   !!ck.hotWork,       '\u2705 AUTORIZADO \u2014 APT FIRMADO Y VALIDADO'],
      ['\u26A0\uFE0F   Espacios Confinados',  !!ck.confinedSpace, '\uD83D\uDD34 ACTIVO \u2014 Monitoreo atm. requerido'],
      ['\uD83C\uDFD7\uFE0F  Andamios Cert.',  !!ck.scaffolding,   '\u2705 AUTORIZADO \u2014 APT FIRMADO Y VALIDADO'],
    ];
    for (let i = 0; i < 4; i += 2) {
      const [l1, a1, s1] = hseItems[i];
      const [l2, a2, s2] = hseItems[i + 1] ?? ['', false, ''];
      ws.addRow([]);
      const rn = ws.rowCount;
      const bg1 = a1 ? 'FFFFF9C4' : C.white;
      const bg2 = a2 ? 'FFFFF9C4' : C.white;
      const sH = (col: string, val: string, bold: boolean, bg: string, fg = C.black) => {
        const cell = ws.getCell(`${col}${rn}`);
        cell.value = val;
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font  = { bold, name: 'Calibri', size: 9, color: { argb: fg } };
        cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
        cell.alignment = { vertical: 'middle', wrapText: true };
      };
      sH('A', '', false, C.white);
      sH('B', l1, true, bg1);
      sH('C', a1 ? s1 : '\u2014 N/A', false, bg1, a1 ? 'FF8B4000' : C.gray);
      sH('D', '', false, 'FFF0F0F0');
      sH('E', l2, true, bg2);
      sH('F', a2 ? s2 : '\u2014 N/A', false, bg2, a2 ? 'FF8B4000' : C.gray);
      ws.getRow(rn).height = 18;
    }

    // ── SEGURIDAD ──
    subHdr('CONDICIONES DE SEGURIDAD Y MEDIO AMBIENTE', 'A', 'F', 'FF4A148C');
    const addSafetyRow = (l1: string, v1: string | number, l2?: string, v2?: string | number, alertBg = C.white) => {
      ws.addRow([]);
      const rn = ws.rowCount;
      styleCell5('A', rn, '', false, alertBg);
      styleCell5('B', rn, l1, true,  alertBg === C.white ? C.lightGray : alertBg);
      styleCell5('C', rn, v1, false, alertBg);
      styleCell5('D', rn, '', false, 'FFF0F0F0');
      if (l2 !== undefined) {
        styleCell5('E', rn, l2, true,  alertBg === C.white ? C.lightGray : alertBg);
        styleCell5('F', rn, v2 ?? '', false, alertBg);
      } else {
        ws.mergeCells(`E${rn}:F${rn}`);
        styleCell5('E', rn, '', false, alertBg);
      }
      ws.getRow(rn).height = 22;
    };
    addSafetyRow('Comentarios Generales', si.comments || '\u2014', 'Observaciones EPP', si.eppObservations || '\u2014');
    addSafetyRow('\uD83D\uDD34 Incidentes', si.incidents, '\uD83D\uDFE1 Near Miss', si.nearMisses, 'FFFFEBEE');
    if (si.lessonsLearned) {
      ws.addRow([]);
      const llRn = ws.rowCount;
      ws.mergeCells(`A${llRn}:F${llRn}`);
      const llCell = ws.getCell(`A${llRn}`);
      llCell.value = `\uD83D\uDCDA  Lecci\u00F3n Aprendida: ${si.lessonsLearned}`;
      llCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      llCell.font  = { italic: true, name: 'Calibri', size: 9, color: { argb: 'FF1B5E20' } };
      llCell.alignment = { wrapText: true, vertical: 'middle' };
      ws.getRow(llRn).height = 22;
    }

    // ── HORAS PERDIDAS ──
    const totalLH = lh.malClima + lh.parosHSE + lh.fallasTecnicas;
    if (totalLH > 0) {
      subHdr('HORAS PERDIDAS DEL TURNO', 'A', 'F', 'FFAD1457');
      addSafetyRow('\uD83C\uDF27\uFE0F Mal Clima (h)', lh.malClima.toFixed(1), '\uD83D\uDEA8 Paros HSE (h)', lh.parosHSE.toFixed(1));
      addSafetyRow('\uD83D\uDD27 Falla T\u00E9c. (h)', lh.fallasTecnicas.toFixed(1), '\u23F1 TOTAL PERDIDAS', totalLH.toFixed(1), 'FFFCE4EC');
    }

    // ── METRAJES DE SOLDADURA (solo TECNITANQUES y CYC) ──
    if (cfg.weld) {
      const wm = (data as any).weldingMetrics as Array<{ estructura: string; metrajeMl: number; soldadores: number }> | undefined;
      if (wm && wm.length > 0) {
        const weldBg    = cfg.id === 'TECNITANQUES' ? 'FF1B5E20' : 'FF4A148C';
        const weldLight = cfg.id === 'TECNITANQUES' ? 'FFE8F5E9'  : 'FFF3E5F5';

        // Section header
        ws.addRow([]);
        const wmTitleRn = ws.rowCount;
        ws.mergeCells(`A${wmTitleRn}:F${wmTitleRn}`);
        const wmT = ws.getCell(`A${wmTitleRn}`);
        wmT.value = '\u25C6  METRAJES DE SOLDADURA \u2014 RENDIMIENTO DIARIO';
        wmT.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: weldBg } };
        wmT.font  = { bold: true, name: 'Calibri', size: 10, color: { argb: C.white } };
        wmT.alignment = { horizontal: 'left', vertical: 'middle' };
        wmT.border = { left: { style: 'thick', color: { argb: 'FFFF6B00' } } };
        ws.getRow(wmTitleRn).height = 22;

        // Column headers: A=N° | B-C=Estructura | D=Metraje | E=Soldadores | F=
        ws.addRow([]);
        const wmHRn = ws.rowCount;
        ws.mergeCells(`B${wmHRn}:C${wmHRn}`);
        [['A','N\u00B0'],['B','ESTRUCTURA / TANQUE'],['D','METRAJE (ml)'],['E','SOLDADORES'],['F','']].forEach(([col, val]) => {
          const cell = ws.getCell(`${col}${wmHRn}`);
          cell.value = val;
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: weldBg } };
          cell.font  = { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: thin(C.gray), bottom: thin(C.gray), left: thin(C.gray), right: thin(C.gray) };
        });
        ws.getRow(wmHRn).height = 18;

        let totalMl = 0, totalSold = 0;
        wm.forEach((row, i) => {
          totalMl   += row.metrajeMl;
          totalSold += row.soldadores;
          ws.addRow([]);
          const rn = ws.rowCount;
          const bg = i % 2 === 0 ? C.white : weldLight;
          ws.mergeCells(`B${rn}:C${rn}`);
          const sW = (col: string, val: string | number, bold = false, center = false) => {
            const cell = ws.getCell(`${col}${rn}`);
            cell.value = val;
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.font  = { bold, name: 'Calibri', size: 10, color: { argb: bold ? weldBg : C.black } };
            cell.alignment = { horizontal: center ? 'center' : 'left', vertical: 'middle' };
            cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
          };
          sW('A', i + 1, true, true);
          sW('B', row.estructura || '\u2014');
          sW('D', row.metrajeMl % 1 === 0 ? row.metrajeMl : row.metrajeMl.toFixed(1), true, true);
          sW('E', row.soldadores, true, true);
          sW('F', '');
          ws.getRow(rn).height = 18;
        });

        // Totals row
        ws.addRow([]);
        const wmTotRn = ws.rowCount;
        ws.mergeCells(`A${wmTotRn}:C${wmTotRn}`);
        ws.mergeCells(`F${wmTotRn}:F${wmTotRn}`);
        ['A','B','C','D','E','F'].forEach(col => {
          const cell = ws.getCell(`${col}${wmTotRn}`);
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: weldBg } };
          cell.font = { bold: true, name: 'Calibri', size: 11, color: { argb: 'FFFFD700' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: thick(C.gray), bottom: thick(C.gray) };
        });
        ws.getCell(`A${wmTotRn}`).value = '\uD83D\uDD25  TOTAL SOLDADURA DEL D\u00CDA';
        ws.getCell(`A${wmTotRn}`).alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getCell(`D${wmTotRn}`).value = `${totalMl % 1 === 0 ? totalMl : totalMl.toFixed(1)} ml`;
        ws.getCell(`E${wmTotRn}`).value = `${totalSold} sold.`;
        ws.getRow(wmTotRn).height = 24;
      }
    }
  }

  addFooter(ws, COLS);
}

// ═════════════════════════════════════════════════════════════════════════════
// SHEET 6 — CONSOLIDADO DE METRAJES DE SOLDADURA
// ═════════════════════════════════════════════════════════════════════════════
function buildSheetMetrajesSoldadura(wb: ExcelJS.Workbook, report: DailyReportData) {
  const sections = report.contractor_sections;
  if (!sections) return;

  const weldContractors = [
    { id: 'TECNITANQUES', label: '\uD83D\uDEE2\uFE0F  TECNITANQUES', sistema: 'SISTEMA LIXIVIACI\u00D3N', headerBg: 'FF1B5E20', rowBg: 'FFE8F5E9', fg: 'FF1B5E20' },
    { id: 'CYC',          label: '\u2697\uFE0F  CYC',               sistema: 'SISTEMA CIP',              headerBg: 'FF4A148C', rowBg: 'FFF3E5F5', fg: 'FF4A148C' },
  ];

  const hasAnyWeld = weldContractors.some(cfg => {
    const wm = (sections[cfg.id] as any)?.weldingMetrics;
    return wm && wm.length > 0;
  });
  if (!hasAnyWeld) return;

  const COLS = 5;
  const ws = wb.addWorksheet('6. METRAJES SOLDADURA', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToHeight: 0, fitToWidth: 1 },
  });
  ws.columns = [
    { key: 'n',          width: 6  },
    { key: 'estructura', width: 40 },
    { key: 'metraje',    width: 18 },
    { key: 'soldadores', width: 18 },
    { key: 'obs',        width: 24 },
  ];

  addDocumentHeader(ws, 'CONSOLIDADO DE METRAJES DE SOLDADURA', report, COLS);

  let grandTotalMl = 0, grandTotalSold = 0;

  for (const cfg of weldContractors) {
    const data = sections[cfg.id];
    if (!data) continue;
    const wm = (data as any).weldingMetrics as Array<{ estructura: string; metrajeMl: number; soldadores: number }> | undefined;
    if (!wm || wm.length === 0) continue;

    const declaredSold = data.personnel?.soldadores ?? 0;

    // Contractor banner
    ws.addRow([]);
    const banRn = ws.rowCount;
    ws.mergeCells(`A${banRn}:E${banRn}`);
    const banCell = ws.getCell(`A${banRn}`);
    banCell.value = `${cfg.label}   |   ${cfg.sistema}   |   Soldadores declarados: ${declaredSold}`;
    banCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfg.headerBg } };
    banCell.font  = { bold: true, name: 'Calibri', size: 11, color: { argb: C.white } };
    banCell.alignment = { horizontal: 'left', vertical: 'middle' };
    banCell.border = { left: { style: 'thick', color: { argb: 'FFFF6B00' } } };
    ws.getRow(banRn).height = 26;

    // Column headers
    ws.addRow(['N\u00B0', 'ESTRUCTURA / TANQUE', 'METRAJE (ml)', 'SOLDADORES', 'OBSERVACIONES']);
    const hRn = ws.rowCount;
    ['A','B','C','D','E'].forEach(col => {
      const cell = ws.getCell(`${col}${hRn}`);
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfg.fg } };
      cell.font  = { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } };
      cell.alignment = { horizontal: col === 'B' ? 'left' : 'center', vertical: 'middle' };
      cell.border = { top: thin(C.gray), bottom: thin(C.gray), left: thin(C.gray), right: thin(C.gray) };
    });
    ws.getRow(hRn).height = 18;

    let cTotalMl = 0, cTotalSold = 0;
    wm.forEach((row, i) => {
      cTotalMl   += row.metrajeMl;
      cTotalSold += row.soldadores;
      const ml = row.metrajeMl % 1 === 0 ? row.metrajeMl : row.metrajeMl.toFixed(1);
      ws.addRow([i + 1, row.estructura || '\u2014', ml, row.soldadores, '']);
      const rn  = ws.rowCount;
      const bg  = i % 2 === 0 ? C.white : cfg.rowBg;
      ['A','B','C','D','E'].forEach(col => {
        const cell = ws.getCell(`${col}${rn}`);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.font = {
          bold: col === 'C' || col === 'D',
          name: 'Calibri', size: 10,
          color: { argb: (col === 'C' || col === 'D') ? cfg.fg : C.black },
        };
        cell.alignment = { horizontal: col === 'B' || col === 'E' ? 'left' : 'center', vertical: 'middle' };
        cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
      });
      ws.getRow(rn).height = 20;
    });

    grandTotalMl   += cTotalMl;
    grandTotalSold += cTotalSold;

    // Subtotals
    const cml = cTotalMl % 1 === 0 ? cTotalMl : cTotalMl.toFixed(1);
    ws.addRow(['', `SUBTOTAL ${cfg.id}`, cml, cTotalSold, '']);
    const stRn = ws.rowCount;
    ['A','B','C','D','E'].forEach(col => {
      const cell = ws.getCell(`${col}${stRn}`);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cfg.headerBg } };
      cell.font = { bold: true, name: 'Calibri', size: 10, color: { argb: 'FFFFD700' } };
      cell.alignment = { horizontal: col === 'B' ? 'left' : 'center', vertical: 'middle' };
      cell.border = { top: thick(C.gray), bottom: thick(C.gray) };
    });
    ws.getRow(stRn).height = 22;

    // Validation note
    const diff = declaredSold - cTotalSold;
    const valMsg = diff === 0
      ? '\u2705 Soldadores asignados = declarados'
      : `\u26A0\uFE0F Diferencia: ${Math.abs(diff)} soldador(es) ${diff > 0 ? 'sin asignar' : 'en exceso'}`;
    ws.addRow(['', valMsg, '', '', '']);
    const valRn = ws.rowCount;
    ws.mergeCells(`B${valRn}:E${valRn}`);
    ws.getCell(`B${valRn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: diff === 0 ? 'FFE8F5E9' : 'FFFFF9C4' } };
    ws.getCell(`B${valRn}`).font = { italic: true, name: 'Calibri', size: 9, color: { argb: diff === 0 ? 'FF1B5E20' : 'FF8B4000' } };
    ws.getCell(`B${valRn}`).alignment = { vertical: 'middle' };
    ws.getRow(valRn).height = 18;
  }

  // ── GRAN TOTAL ──
  ws.addRow([]);
  const gml = grandTotalMl % 1 === 0 ? grandTotalMl : grandTotalMl.toFixed(1);
  ws.addRow(['', '\u2705  GRAN TOTAL SOLDADURA DEL D\u00CDA', gml, grandTotalSold, '']);
  const gtRn = ws.rowCount;
  ['A','B','C','D','E'].forEach(col => {
    const cell = ws.getCell(`${col}${gtRn}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.green } };
    cell.font = { bold: true, name: 'Calibri', size: 12, color: { argb: C.white } };
    cell.alignment = { horizontal: col === 'B' ? 'left' : 'center', vertical: 'middle' };
    cell.border = { top: thick(C.gray), bottom: thick(C.gray) };
  });
  ws.getCell(`C${gtRn}`).font = { bold: true, name: 'Calibri', size: 14, color: { argb: 'FFFFD700' } };
  ws.getCell(`D${gtRn}`).font = { bold: true, name: 'Calibri', size: 13, color: { argb: 'FFFFD700' } };
  ws.getRow(gtRn).height = 30;

  addFooter(ws, COLS);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═════════════════════════════════════════════════════════════════════════════
export const generateDailyReportExcel = async (report: DailyReportData) => {
  const wb = new ExcelJS.Workbook();
  wb.creator   = `NEXUS Command Center — ARIS MINING | ${PROF_NAME} | Mat. ${PROF_LICENSE}`;
  wb.lastModifiedBy = report.metadata.authorName;
  wb.created   = new Date();
  wb.modified  = new Date();
  wb.company   = 'ARIS MINING S.A.S. — SGS Certified';
  wb.subject   = `Reporte Diario ${report.metadata.consecutiveId}`;
  wb.title     = `Dossier Técnico — Lower Mining Marmato — ${new Date(report.metadata.date).toLocaleDateString('es-CO')}`;

  // Build sheets
  await buildSheetReporteDiario(wb, report);
  buildSheetContratistas(wb, report);
  buildSheetAvances(wb, report);
  buildSheetSeguridad(wb, report);
  buildSheetNarrativasContratistas(wb, report);  // Sheet 5 — full detail per contractor
  buildSheetMetrajesSoldadura(wb, report);        // Sheet 6 — welding metrics (only if data)

  // ── Filename ──────────────────────────────────────────────────────────────
  const dateStr    = new Date(report.metadata.date).toISOString().split('T')[0];
  const frenteClean = report.metadata.frente.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const filename   = `SGS_ISO9001_${report.metadata.consecutiveId}_${frenteClean}_${dateStr}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};
