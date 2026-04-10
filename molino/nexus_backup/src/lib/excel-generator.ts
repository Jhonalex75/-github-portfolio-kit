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
  // ── NEW Extended Fields ──
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

  const contractors = report.contractors || [];
  const totalDirectos = report.recursos.filter(r => r.count > 0).reduce((s, r) => s + r.count, 0);

  let totalMec = 0, totalSold = 0, totalAux = 0, totalArm = 0, totalPers = 0;
  let totalGrua = 0, totalGen = 0, totalAnd = 0, totalCG = 0, totalTG = 0;
  let totalHClima = 0, totalHHSE = 0, totalHTec = 0;

  if (contractors.length > 0) {
    contractors.forEach((c, idx) => {
      const bd  = c.breakdown  || {};
      const eq  = c.equipment  || {};
      const lh  = c.lostHours  || {};
      const mec  = bd.mecanicos  ?? 0;
      const sold = bd.soldadores ?? 0;
      const aux  = bd.auxiliares ?? 0;
      const arm  = bd.armadores  ?? 0;
      const tot  = mec + sold + aux + arm || c.personnel || 0;
      const grua = eq.grua       ?? 0;
      const gen  = eq.generador  ?? 0;
      const and  = eq.andamios   ?? 0;
      const cg   = eq.camionGrua ?? 0;
      const tg   = eq.torreGrua  ?? 0;
      const esp  = eq.equipoEspecial ?? '—';
      const hcl  = lh.malClima      ?? 0;
      const hhse = lh.parosHSE      ?? 0;
      const htec = lh.fallasTecnicas ?? 0;

      totalMec += mec; totalSold += sold; totalAux += aux; totalArm += arm; totalPers += tot;
      totalGrua += grua; totalGen += gen; totalAnd += and; totalCG += cg; totalTG += tg;
      totalHClima += hcl; totalHHSE += hhse; totalHTec += htec;

      ws.addRow([idx + 1, c.name || '—', mec, sold, aux, arm, tot, grua, gen, and, cg, tg, esp, hcl, hhse, htec]);
      const rn  = ws.rowCount;
      const bg  = idx % 2 === 0 ? C.white : C.lightGray;
      const row = ws.getRow(rn);

      ws.getCell(`A${rn}`).alignment = { horizontal: 'center' };
      ws.getCell(`B${rn}`).font = { bold: true, name: 'Calibri', size: 10 };
      // Center numeric columns
      'CDEFGHIJKLMN'.split('').forEach(col => {
        ws.getCell(`${col}${rn}`).alignment = { horizontal: 'center', vertical: 'middle' };
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
      row.eachCell(cell => {
        if (!cell.border?.top) {
          cell.fill  = cell.fill || { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = { top: thin('FFDDDDDD'), bottom: thin('FFDDDDDD'), left: thin('FFDDDDDD'), right: thin('FFDDDDDD') };
          cell.font   = cell.font || { name: 'Calibri', size: 10, color: { argb: C.black } };
        }
      });
      row.height = 20;
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
  wb.title     = `Dossier Técnico — ${report.metadata.frente} — ${new Date(report.metadata.date).toLocaleDateString('es-CO')}`;

  // Build all 4 sheets
  await buildSheetReporteDiario(wb, report);
  buildSheetContratistas(wb, report);
  buildSheetAvances(wb, report);
  buildSheetSeguridad(wb, report);

  // ── Filename ──────────────────────────────────────────────────────────────
  const dateStr    = new Date(report.metadata.date).toISOString().split('T')[0];
  const frenteClean = report.metadata.frente.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const filename   = `SGS_ISO9001_${report.metadata.consecutiveId}_${frenteClean}_${dateStr}.xlsx`;

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
};
