/**
 * excel-equipment.ts
 * Exportación Excel — Hoja de Vida de Equipo + Dashboard
 * ARIS Mining — Marmato Lower Mine Expansion — MIL24.001
 *
 * 5 hojas:
 *  1. DASHBOARD       — KPIs, progreso visual, matriz de etapas
 *  2. HOJA DE VIDA    — Especificaciones técnicas completas
 *  3. PLAN DE MONTAJE — Etapas con peso % y estado
 *  4. PENDIENTES      — Punch list constructivo
 *  5. HALLAZGOS NC    — No conformidades vinculadas
 */
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { PlantEquipment } from './mill-plant-data';
import { MILL_ASSEMBLY_PLANS } from './mill-plant-data';
import {
  OPERATIONAL_STATUS_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_TYPE_LABELS,
  NC_STATUS_LABELS,
  NC_SEVERITY_LABELS,
  NC_ORIGIN_LABELS,
  ASSEMBLY_STEP_STATUS_LABELS,
  PUNCH_DISCIPLINE_LABELS,
  PUNCH_PRIORITY_LABELS,
  PUNCH_STATUS_LABELS,
  calcAssemblyProgress,
  type EquipmentRecord,
  type AssemblyActivity,
  type NonConformity,
  type OperationalStatus,
  type AssemblyStep,
  type PunchListItem,
} from './quality-types';

// ─── Identity ────────────────────────────────────────────────────────────────
const PROF_NAME   = 'MSC. ING. JHON ALEXANDER VALENCIA MARULANDA';
const PROF_ROLE   = 'Senior Mechanical Engineer — Supervisor de Montaje';
const CERT_ISO    = 'ISO 9001:2015 · ISO 10005:2018';
const SYSTEM_VER  = 'NEXUS Command Center v3.0 — SGS Quality Portal';
const PROJECT_REF = 'ARIS MINING — MIL24.001 | Marmato Lower Mine Expansion';
const CONTRACTOR  = 'CONTRATISTA: LM-HLGS  ·  PRO: LM-HLGS-C-1000-3940-PRO-0038-ME';

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  // Brand
  sgsOrange:   'FFFF6B00',
  sgsDark:     'FF1A1A2E',
  black:       'FF0A0E14',
  white:       'FFFFFFFF',
  gold:        'FFD4A017',
  // Status
  red:         'FFD32F2F',
  redLight:    'FFFFEBEE',
  green:       'FF2E7D32',
  greenLight:  'FFE8F5E9',
  amber:       'FFFFA000',
  amberLight:  'FFFFF8E1',
  blue:        'FF1565C0',
  blueLight:   'FFE3F2FD',
  purple:      'FF6A1B9A',
  purpleLight: 'FFF3E5F5',
  // Grays
  gray:        'FF424242',
  lightGray:   'FFF5F5F5',
  midGray:     'FFECEFF1',
  darkRow:     'FF1E2A3A',
  altRow:      'FFF9FAFB',
  // Dashboard
  dashBg:      'FF0D1B2A',
  cardBg:      'FF132030',
  accent1:     'FFFF6B00',
  accent2:     'FF00B4D8',
  accent3:     'FF06D6A0',
  accent4:     'FFFFB703',
};

// ─── Border helpers ───────────────────────────────────────────────────────────
const thin   = (argb: string): Partial<ExcelJS.Border> => ({ style: 'thin',   color: { argb } });
const medium = (argb: string): Partial<ExcelJS.Border> => ({ style: 'medium', color: { argb } });
const brd    = (c = C.gray)    => ({ top: thin(c),   bottom: thin(c),   left: thin(c),   right: thin(c)   });
const brdMed = (c = C.sgsOrange) => ({ top: medium(c), bottom: medium(c), left: medium(c), right: medium(c) });

// ─── Style factories ──────────────────────────────────────────────────────────
function hdr(bg: string, fg = C.white, sz = 10, bold = true): Partial<ExcelJS.Style> {
  return {
    font:      { bold, name: 'Calibri', size: sz, color: { argb: fg } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border:    brd(),
  };
}
function dat(bg = C.white, fg = C.black, sz = 10, align: ExcelJS.Alignment['horizontal'] = 'left'): Partial<ExcelJS.Style> {
  return {
    font:      { name: 'Calibri', size: sz, color: { argb: fg } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } },
    alignment: { horizontal: align, vertical: 'middle', wrapText: true },
    border:    brd('FFD0D0D0'),
  };
}
function apply(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>) {
  if (style.font)      cell.font      = style.font      as ExcelJS.Font;
  if (style.fill)      cell.fill      = style.fill      as ExcelJS.Fill;
  if (style.alignment) cell.alignment = style.alignment as ExcelJS.Alignment;
  if (style.border)    cell.border    = style.border    as ExcelJS.Borders;
}

// ─── Merge + write helper ─────────────────────────────────────────────────────
function mwrite(ws: ExcelJS.Worksheet, addr: string, value: string | number, style: Partial<ExcelJS.Style>) {
  const cell = ws.getCell(addr);
  cell.value = value;
  apply(cell, style);
}
function merge(ws: ExcelJS.Worksheet, from: string, to: string) {
  try { ws.mergeCells(`${from}:${to}`); } catch (_) {}
}

// ─── Section separator ────────────────────────────────────────────────────────
function sectionHdr(ws: ExcelJS.Worksheet, title: string, bg: string, cols: number) {
  ws.addRow([]);
  const rn   = ws.rowCount;
  const last = numToCol(cols);
  merge(ws, `A${rn}`, `${last}${rn}`);
  const cell = ws.getCell(`A${rn}`);
  cell.value = `◆  ${title.toUpperCase()}`;
  apply(cell, hdr(bg, C.white, 10));
  ws.getRow(rn).height = 22;
}

// ─── Doc header block (SGS standard) ─────────────────────────────────────────
function addDocHeader(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  const last = numToCol(cols);

  ws.addRow([]);
  let rn = ws.rowCount;
  merge(ws, `A${rn}`, `${last}${rn}`);
  let cell = ws.getCell(`A${rn}`);
  cell.value = `SGS Quality Portal  |  ${PROJECT_REF}`;
  apply(cell, { font: { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsDark } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws.getRow(rn).height = 18;

  ws.addRow([]);
  rn = ws.rowCount;
  merge(ws, `A${rn}`, `${last}${rn}`);
  cell = ws.getCell(`A${rn}`);
  cell.value = title;
  apply(cell, { font: { bold: true, name: 'Calibri', size: 14, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsOrange } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws.getRow(rn).height = 30;

  ws.addRow([]);
  rn = ws.rowCount;
  merge(ws, `A${rn}`, `${last}${rn}`);
  cell = ws.getCell(`A${rn}`);
  cell.value = subtitle;
  apply(cell, { font: { name: 'Calibri', size: 10, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws.getRow(rn).height = 18;

  ws.addRow([]);
  rn = ws.rowCount;
  merge(ws, `A${rn}`, `${last}${rn}`);
  cell = ws.getCell(`A${rn}`);
  cell.value = `${PROF_NAME}  |  ${PROF_ROLE}  |  ${CERT_ISO}  |  ${SYSTEM_VER}`;
  apply(cell, { font: { italic: true, name: 'Calibri', size: 8, color: { argb: C.gray } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws.getRow(rn).height = 14;

  ws.addRow([]); // spacer
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function infoRow(ws: ExcelJS.Worksheet, label: string, value: string, cols: number) {
  ws.addRow([]);
  const rn  = ws.rowCount;
  const mid = Math.ceil(cols / 2);
  const last = numToCol(cols);
  merge(ws, `A${rn}`, `${numToCol(mid)}${rn}`);
  const lCell = ws.getCell(`A${rn}`);
  lCell.value = label;
  apply(lCell, { ...hdr(C.sgsDark, C.gold, 9), alignment: { horizontal: 'left', vertical: 'middle' } });
  merge(ws, `${numToCol(mid + 1)}${rn}`, `${last}${rn}`);
  const vCell = ws.getCell(`${numToCol(mid + 1)}${rn}`);
  vCell.value = value;
  apply(vCell, dat(C.lightGray, C.black, 10));
  ws.getRow(rn).height = 18;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AREA DASHBOARD EXPORT (stub — used by AreaDashboard component)
// ═══════════════════════════════════════════════════════════════════════════════
import type { PlantArea } from './mill-plant-data';

export async function exportAreaDashboard(
  areas:       PlantArea[],
  equipment:   PlantEquipment[],
  ncs:         NonConformity[],
  records:     Record<string, EquipmentRecord>,
  activities:  Record<string, AssemblyActivity[]>,
): Promise<void> {
  const wb   = new ExcelJS.Workbook();
  wb.creator = PROF_NAME;
  wb.created = new Date();
  const ws   = wb.addWorksheet('AREA DASHBOARD', { views: [{ showGridLines: false }] });
  ws.columns = Array(10).fill({ width: 18 });
  const now  = new Date().toLocaleString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  addDocHeader(ws, 'DASHBOARD GENERAL — ÁREAS DE PLANTA', `${PROJECT_REF}  |  ${now}`, 10);
  sectionHdr(ws, `Total equipos: ${equipment.length}  ·  Total NCs: ${ncs.length}  ·  Áreas: ${areas.filter(a => a.parentCode === '1000').length}`, C.sgsOrange, 10);

  ws.addRow([]);
  let rn = ws.rowCount;
  ['ÁREA', 'NOMBRE', 'EQUIPOS', 'NC TOTAL', 'NC ABIERTAS', 'NC CRÍTICAS', 'EN MONTAJE', 'OPERATIVOS'].forEach((h, i) => {
    ws.getCell(`${numToCol(i + 1)}${rn}`).value = h;
    apply(ws.getCell(`${numToCol(i + 1)}${rn}`), hdr(C.sgsOrange, C.white, 9));
  });
  ws.getRow(rn).height = 20;

  areas.filter(a => a.parentCode === '1000').forEach((area, idx) => {
    ws.addRow([]);
    rn = ws.rowCount;
    const areaEq  = equipment.filter(e => e.areaCode === area.code);
    const areaNcs = ncs.filter(n => areaEq.some(e => e.tag === n.related_equipment));
    const row = [
      area.code, area.name, areaEq.length,
      areaNcs.length,
      areaNcs.filter(n => n.status === 'abierto').length,
      areaNcs.filter(n => n.severity === 'crítica').length,
      areaEq.filter(e => records[e.tag]?.operational_status === 'en_montaje').length,
      areaEq.filter(e => records[e.tag]?.operational_status === 'operativo').length,
    ];
    row.forEach((v, ci) => {
      ws.getCell(`${numToCol(ci + 1)}${rn}`).value = v as string | number;
      apply(ws.getCell(`${numToCol(ci + 1)}${rn}`), dat(idx % 2 === 0 ? C.lightGray : C.white, C.black, 9));
    });
    ws.getRow(rn).height = 20;
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Dashboard_Areas_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Column letter helper ─────────────────────────────────────────────────────
function numToCol(n: number): string {
  if (n <= 26) return String.fromCharCode(64 + n);
  return String.fromCharCode(64 + Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26));
}

// ─── Color helpers ────────────────────────────────────────────────────────────
function severityFill(sev: string): string {
  if (sev === 'crítica') return C.red;
  if (sev === 'alta')    return C.amber;
  if (sev === 'media')   return C.gold;
  return C.green;
}
function ncStatusFill(s: string): string {
  if (s === 'abierto')    return C.red;
  if (s === 'en_proceso') return C.blue;
  if (s === 'cerrado')    return C.green;
  return C.gray;
}
function stepStatusFill(s: string): string {
  if (s === 'completado') return C.green;
  if (s === 'en_proceso') return C.amber;
  if (s === 'omitido')    return C.purple;
  return C.gray;
}
function punchPriorityFill(p: string): string {
  if (p === 'A') return C.red;
  if (p === 'B') return C.amber;
  return C.blue;
}
function punchStatusFill(p: string): string {
  if (p === 'abierto')    return C.red;
  if (p === 'en_gestion') return C.amber;
  return C.green;
}
function opStatusFill(s: string): string {
  if (s === 'operativo')    return C.green;
  if (s === 'comisionando') return C.blue;
  if (s === 'en_montaje')   return C.amber;
  return C.gray;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
export async function exportEquipmentHojaDeVida(
  equipment:     PlantEquipment,
  record:        EquipmentRecord | undefined,
  activities:    AssemblyActivity[],
  ncs:           NonConformity[],
  assemblySteps: AssemblyStep[],
  punchList:     PunchListItem[],
): Promise<void> {
  const wb    = new ExcelJS.Workbook();
  wb.creator  = PROF_NAME;
  wb.created  = new Date();
  wb.modified = new Date();

  const equipNcs   = ncs.filter(n => n.related_equipment === equipment.tag);
  const staticPlan = MILL_ASSEMBLY_PLANS[equipment.tag] ?? [];
  const stepsData  = assemblySteps.length > 0 ? assemblySteps : staticPlan.map((s, i) => ({
    id: `s${i}`, equipment_tag: equipment.tag,
    step_number: s.step_number, title: s.title, description: s.description,
    weight_pct: s.weight_pct, status: 'pendiente' as const,
    iom_ref: s.iom_ref, proc_ref: s.proc_ref,
  }));
  const progress      = calcAssemblyProgress(assemblySteps);
  const completedSteps = stepsData.filter(s => s.status === 'completado').length;
  const inProcSteps    = stepsData.filter(s => s.status === 'en_proceso').length;
  const now = new Date().toLocaleString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ══════════════════════════════════════════════════════════════
  // HOJA 1: DASHBOARD
  // ══════════════════════════════════════════════════════════════
  const ws1 = wb.addWorksheet('DASHBOARD', { views: [{ showGridLines: false }] });
  ws1.columns = Array(12).fill({ width: 16 });
  const DASH_COLS = 12;
  const DL = numToCol(DASH_COLS);

  // ── Banner superior ──
  ws1.addRow([]);
  let rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = `SGS Quality Portal  ·  ${PROJECT_REF}`;
  apply(ws1.getCell(`A${rn}`), { font: { bold: true, name: 'Calibri', size: 9, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsDark } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws1.getRow(rn).height = 16;

  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = `DASHBOARD DE MONTAJE — ${equipment.tag} — ${equipment.name}`;
  apply(ws1.getCell(`A${rn}`), { font: { bold: true, name: 'Calibri', size: 18, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsOrange } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws1.getRow(rn).height = 36;

  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = `${equipment.areaCode} — ${equipment.areaName}  ·  Disciplina: ${equipment.discipline}  ·  Generado: ${now}`;
  apply(ws1.getCell(`A${rn}`), { font: { name: 'Calibri', size: 10, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.gray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws1.getRow(rn).height = 18;

  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = `${PROF_NAME}  |  ${PROF_ROLE}  |  ${CERT_ISO}  |  ${CONTRACTOR}`;
  apply(ws1.getCell(`A${rn}`), { font: { italic: true, name: 'Calibri', size: 8, color: { argb: C.gray } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws1.getRow(rn).height = 13;

  ws1.addRow([]); // spacer

  // ── SECCIÓN A: KPI CARDS (fila 6–9) ──
  rn = ws1.rowCount + 1;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = '◆  INDICADORES CLAVE DE DESEMPEÑO (KPI)';
  apply(ws1.getCell(`A${rn}`), hdr(C.sgsDark, C.gold, 10));
  ws1.getRow(rn).height = 20;

  // 4 KPI cards across 12 columns (3 cols each)
  const kpiData = [
    { label: 'AVANCE GLOBAL', value: `${Math.round(progress)}%`,   color: C.sgsOrange, bg: 'FFFF6B00', sub: 'Ponderado por etapa' },
    { label: 'ETAPAS COMPLETADAS', value: `${completedSteps} / ${stepsData.length}`, color: C.green, bg: 'FF2E7D32', sub: `${inProcSteps} en proceso` },
    { label: 'PENDIENTES ABIERTOS', value: `${punchList.filter(p => p.status !== 'cerrado').length}`,  color: C.red,   bg: 'FFD32F2F', sub: `${punchList.filter(p => p.priority === 'A').length} prioridad A` },
    { label: 'HALLAZGOS NC',       value: `${equipNcs.filter(n => n.status !== 'cerrado').length}`,    color: C.amber, bg: 'FFFFA000', sub: `${equipNcs.filter(n => n.severity === 'crítica').length} críticos` },
  ];

  for (let ki = 0; ki < 4; ki++) {
    const col1 = ki * 3 + 1;
    const col2 = col1 + 2;
    const c1s  = numToCol(col1);
    const c2s  = numToCol(col2);

    // Card BG
    for (let r2 = rn + 1; r2 <= rn + 4; r2++) {
      merge(ws1, `${c1s}${r2}`, `${c2s}${r2}`);
      apply(ws1.getCell(`${c1s}${r2}`), { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }, border: { top: thin(kpiData[ki].bg), bottom: thin(kpiData[ki].bg), left: medium(kpiData[ki].bg), right: medium(kpiData[ki].bg) } });
    }

    ws1.getRow(rn + 1).height = 14;
    ws1.getRow(rn + 2).height = 30;
    ws1.getRow(rn + 3).height = 14;
    ws1.getRow(rn + 4).height = 14;

    // Label
    ws1.getCell(`${c1s}${rn + 1}`).value = kpiData[ki].label;
    apply(ws1.getCell(`${c1s}${rn + 1}`), { font: { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF999999' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }, alignment: { horizontal: 'center', vertical: 'middle' } });

    // Value
    ws1.getCell(`${c1s}${rn + 2}`).value = kpiData[ki].value;
    apply(ws1.getCell(`${c1s}${rn + 2}`), { font: { name: 'Calibri', size: 24, bold: true, color: { argb: kpiData[ki].bg } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }, alignment: { horizontal: 'center', vertical: 'middle' } });

    // Sub
    ws1.getCell(`${c1s}${rn + 3}`).value = kpiData[ki].sub;
    apply(ws1.getCell(`${c1s}${rn + 3}`), { font: { name: 'Calibri', size: 8, italic: true, color: { argb: 'FF666666' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1B2A' } }, alignment: { horizontal: 'center', vertical: 'middle' } });

    // Color bar
    const barCell = ws1.getCell(`${c1s}${rn + 4}`);
    apply(barCell, { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiData[ki].bg } } });
    ws1.getRow(rn + 4).height = 4;
  }

  ws1.addRow([]); ws1.addRow([]); ws1.addRow([]); ws1.addRow([]); ws1.addRow([]);

  // ── SECCIÓN B: BARRA DE PROGRESO VISUAL ──
  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = '◆  BARRA DE AVANCE PORCENTUAL — PLAN DE MONTAJE';
  apply(ws1.getCell(`A${rn}`), hdr(C.sgsDark, C.gold, 10));
  ws1.getRow(rn).height = 20;

  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = `Avance acumulado: ${Math.round(progress)}% — Basado en pesos ponderados de cada etapa (completado = 100%, en proceso = 50%)`;
  apply(ws1.getCell(`A${rn}`), dat(C.lightGray, C.gray, 9, 'center'));
  ws1.getRow(rn).height = 16;

  // Progress bar visual (12 cells = 100%, fill proportionally)
  ws1.addRow([]);
  rn = ws1.rowCount;
  ws1.getRow(rn).height = 20;
  const filledCols = Math.round((progress / 100) * DASH_COLS);
  for (let c = 1; c <= DASH_COLS; c++) {
    const cell = ws1.getCell(`${numToCol(c)}${rn}`);
    cell.value = '';
    const pct = c <= filledCols ? Math.round(progress) : 0;
    apply(cell, {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: c <= filledCols ? C.sgsOrange : 'FF1E2A3A' } },
      border: { top: thin('FF333333'), bottom: thin('FF333333'), left: thin('FF333333'), right: thin('FF333333') },
      font: { name: 'Calibri', size: 7, bold: true, color: { argb: C.white } },
      alignment: { horizontal: 'center', vertical: 'middle' },
    });
    if (c === filledCols && filledCols > 0) cell.value = `${Math.round(progress)}%`;
  }

  ws1.addRow([]);

  // ── SECCIÓN C: SEMÁFORO DE ETAPAS ──
  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${DL}${rn}`);
  ws1.getCell(`A${rn}`).value = '◆  SEMÁFORO DE ETAPAS — PLAN DE MONTAJE (ESTADO POR ETAPA)';
  apply(ws1.getCell(`A${rn}`), hdr(C.sgsDark, C.gold, 10));
  ws1.getRow(rn).height = 20;

  // Table header
  ws1.addRow([]);
  rn = ws1.rowCount;
  const stepHdrs = ['#', 'ETAPA', 'PESO %', 'ESTADO', 'RESPONSABLE', 'FECHA', 'REF. IOM', 'REF. PROC.'];
  const stepColWidths = [3, 30, 6, 12, 16, 10, 20, 20];
  ws1.columns = stepColWidths.map(w => ({ width: w }));

  stepHdrs.forEach((h, i) => {
    ws1.getCell(`${numToCol(i + 1)}${rn}`).value = h;
    apply(ws1.getCell(`${numToCol(i + 1)}${rn}`), hdr(C.sgsOrange, C.white, 9));
  });
  ws1.getRow(rn).height = 20;

  stepsData.forEach((step, idx) => {
    ws1.addRow([]);
    rn = ws1.rowCount;
    const statusFillColor = stepStatusFill(step.status);
    const isAlt = idx % 2 === 0;

    const rowData = [
      step.step_number,
      step.title,
      `${step.weight_pct}%`,
      ASSEMBLY_STEP_STATUS_LABELS[step.status] || step.status,
      (step as any).responsible || '—',
      (step as any).completion_date || '—',
      (step as any).iom_ref || '—',
      (step as any).proc_ref || '—',
    ];

    rowData.forEach((v, ci) => {
      const cell = ws1.getCell(`${numToCol(ci + 1)}${rn}`);
      cell.value = v;
      if (ci === 3) {
        apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: statusFillColor } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: brd('FFD0D0D0') });
      } else {
        apply(cell, dat(isAlt ? C.lightGray : C.white, C.black, 9, ci === 0 ? 'center' : 'left'));
      }
    });
    ws1.getRow(rn).height = 22;
  });

  ws1.addRow([]);

  // ── SECCIÓN D: DISTRIBUCIÓN DE PENDIENTES ──
  ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `H${rn}`);
  ws1.getCell(`A${rn}`).value = '◆  DISTRIBUCIÓN DE PENDIENTES POR PRIORIDAD';
  apply(ws1.getCell(`A${rn}`), hdr(C.sgsDark, C.gold, 10));
  ws1.getRow(rn).height = 20;

  const pByPriority = { A: 0, B: 0, C: 0 };
  punchList.forEach(p => { if (p.status !== 'cerrado') pByPriority[p.priority] = (pByPriority[p.priority] || 0) + 1; });

  ['Prioridad', 'A — Bloqueante', 'B — Importante', 'C — Menor', 'Total Abiertos'].forEach((h, i) => {
    ws1.getCell(`${numToCol(i + 1)}${rn + 1}`).value = h;
    apply(ws1.getCell(`${numToCol(i + 1)}${rn + 1}`), hdr(i === 0 ? C.sgsDark : i === 1 ? C.red : i === 2 ? C.amber : i === 3 ? C.blue : C.gray, C.white, 9));
  });
  ws1.getRow(rn + 1).height = 18;

  ws1.addRow([]);
  rn = ws1.rowCount;
  [['Cantidad', `${pByPriority.A}`, `${pByPriority.B}`, `${pByPriority.C}`, `${pByPriority.A + pByPriority.B + pByPriority.C}`]].forEach(row => {
    row.forEach((v, i) => {
      ws1.getCell(`${numToCol(i + 1)}${rn}`).value = i === 0 ? v : Number(v);
      apply(ws1.getCell(`${numToCol(i + 1)}${rn}`), dat(i === 0 ? C.lightGray : C.white, C.black, 11, 'center'));
    });
  });
  ws1.getRow(rn).height = 22;

  // ── SECCIÓN E: DISTRIBUCIÓN DE NCS ──
  ws1.addRow([]); ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `H${rn}`);
  ws1.getCell(`A${rn}`).value = '◆  DISTRIBUCIÓN DE HALLAZGOS NC POR SEVERIDAD Y ESTADO';
  apply(ws1.getCell(`A${rn}`), hdr(C.sgsDark, C.gold, 10));
  ws1.getRow(rn).height = 20;

  const ncBySev   = { baja: 0, media: 0, alta: 0, crítica: 0 };
  const ncByStat  = { abierto: 0, en_proceso: 0, cerrado: 0, anulado: 0 };
  equipNcs.forEach(n => {
    ncBySev[n.severity]  = (ncBySev[n.severity]  || 0) + 1;
    ncByStat[n.status]   = (ncByStat[n.status]   || 0) + 1;
  });

  const ncHdrs = ['SEVERIDAD', 'Baja', 'Media', 'Alta', 'Crítica', '|', 'ESTADO', 'Abierto', 'En Proceso', 'Cerrado'];
  ncHdrs.forEach((h, i) => {
    ws1.getCell(`${numToCol(i + 1)}${rn + 1}`).value = h;
    const bg = i === 0 || i === 6 ? C.sgsDark : i === 1 ? C.green : i === 2 ? C.gold : i === 3 ? C.amber : i === 4 ? C.red : i === 7 ? C.red : i === 8 ? C.blue : C.green;
    if (h !== '|') apply(ws1.getCell(`${numToCol(i + 1)}${rn + 1}`), hdr(bg, C.white, 9));
  });
  ws1.getRow(rn + 1).height = 18;

  ws1.addRow([]);
  rn = ws1.rowCount;
  const ncVals = ['Cantidad', `${ncBySev.baja}`, `${ncBySev.media}`, `${ncBySev.alta}`, `${ncBySev.crítica}`, '', 'Cantidad', `${ncByStat.abierto}`, `${ncByStat.en_proceso}`, `${ncByStat.cerrado}`];
  ncVals.forEach((v, i) => {
    ws1.getCell(`${numToCol(i + 1)}${rn}`).value = v === '' ? '' : (i === 0 || i === 6 ? v : Number(v));
    if (v !== '') apply(ws1.getCell(`${numToCol(i + 1)}${rn}`), dat(C.white, C.black, 11, 'center'));
  });
  ws1.getRow(rn).height = 22;

  // ── Firma / footer ──
  ws1.addRow([]); ws1.addRow([]);
  rn = ws1.rowCount;
  merge(ws1, `A${rn}`, `${numToCol(DASH_COLS)}${rn}`);
  ws1.getCell(`A${rn}`).value = `Documento generado por NEXUS Command Center — ${now}  |  ${PROF_NAME}  |  ${PROF_ROLE}`;
  apply(ws1.getCell(`A${rn}`), { font: { italic: true, name: 'Calibri', size: 8, color: { argb: C.gray } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
  ws1.getRow(rn).height = 14;

  // ══════════════════════════════════════════════════════════════
  // HOJA 2: HOJA DE VIDA (Especificaciones)
  // ══════════════════════════════════════════════════════════════
  const ws2 = wb.addWorksheet('HOJA DE VIDA', { views: [{ showGridLines: false }] });
  ws2.columns = [{ width: 28 }, { width: 28 }, { width: 22 }, { width: 22 }, { width: 20 }, { width: 20 }];
  const COLS2 = 6;

  addDocHeader(ws2,
    `HOJA DE VIDA — ${equipment.tag}`,
    `${equipment.name}  |  Área ${equipment.areaCode}: ${equipment.areaName}  |  ${now}`,
    COLS2,
  );

  sectionHdr(ws2, 'Identificación del Equipo', C.sgsOrange, COLS2);
  infoRow(ws2, 'TAG / Código de Equipo',     equipment.tag,                                  COLS2);
  infoRow(ws2, 'Nombre del Equipo',           equipment.name,                                 COLS2);
  infoRow(ws2, 'Área WBS',                    `${equipment.areaCode} — ${equipment.areaName}`, COLS2);
  infoRow(ws2, 'Categoría',                   equipment.category,                             COLS2);
  infoRow(ws2, 'Disciplina',                  equipment.discipline,                           COLS2);
  infoRow(ws2, 'Fabricante Típico',           equipment.typicalManufacturer || '—',           COLS2);
  infoRow(ws2, 'Modelo',                      equipment.model || '—',                         COLS2);
  infoRow(ws2, 'Proveedor',                   equipment.supplier || '—',                      COLS2);
  infoRow(ws2, 'Orden de Compra',             equipment.purchaseOrder || '—',                 COLS2);

  sectionHdr(ws2, 'Datos Técnicos', C.gray, COLS2);
  infoRow(ws2, 'Descripción Técnica',         equipment.description,                          COLS2);
  infoRow(ws2, 'Dimensiones',                 equipment.dimensions || '—',                    COLS2);
  infoRow(ws2, 'Peso Total',                  equipment.weightKg || '—',                      COLS2);
  infoRow(ws2, 'Potencia de Motor(es)',        equipment.motorPowerKw || '—',                  COLS2);
  infoRow(ws2, 'Voltaje',                     equipment.voltageV || '—',                      COLS2);
  infoRow(ws2, 'Capacidad de Diseño',         equipment.capacityDesign || '—',                COLS2);

  sectionHdr(ws2, 'Documentos de Referencia', C.blue, COLS2);
  infoRow(ws2, 'Doc. de Ingeniería',          equipment.docIngenieria || '—',                 COLS2);
  infoRow(ws2, 'P&ID',                        equipment.pid || '—',                           COLS2);
  infoRow(ws2, 'Manual IOM (Fabricante)',     equipment.iomManual || '—',                     COLS2);
  infoRow(ws2, 'Procedimiento Contratista',   equipment.procedureRef || '—',                  COLS2);

  if (equipment.remarks) {
    sectionHdr(ws2, 'Observaciones y Notas Técnicas', C.amber, COLS2);
    infoRow(ws2, 'Notas Técnicas',             equipment.remarks,                              COLS2);
  }

  sectionHdr(ws2, 'Estado Operacional (Firebase Nexus)', C.green, COLS2);
  infoRow(ws2, 'Estado Operacional',          OPERATIONAL_STATUS_LABELS[record?.operational_status ?? 'sin_iniciar'], COLS2);
  infoRow(ws2, 'Avance de Montaje',           `${Math.round(progress)}%`,                    COLS2);
  infoRow(ws2, 'Etapas Completadas',          `${completedSteps} de ${stepsData.length}`,    COLS2);
  infoRow(ws2, 'Última Actualización',        record ? new Date(record.last_updated).toLocaleString('es-CO') : '—', COLS2);
  infoRow(ws2, 'Actualizado por',             record?.updated_by || '—',                     COLS2);
  infoRow(ws2, 'Fecha de Generación',         now,                                            COLS2);

  // Actividades de montaje en ws2
  if (activities.length > 0) {
    sectionHdr(ws2, 'Registro de Actividades de Montaje', C.sgsOrange, COLS2);
    ws2.addRow([]);
    let rn2 = ws2.rowCount;
    ['#', 'TIPO', 'DESCRIPCIÓN', 'RESPONSABLE', 'FECHA', 'ESTADO'].forEach((h, i) => {
      ws2.getCell(`${numToCol(i + 1)}${rn2}`).value = h;
      apply(ws2.getCell(`${numToCol(i + 1)}${rn2}`), hdr(C.sgsOrange, C.white, 9));
    });
    ws2.getRow(rn2).height = 18;
    activities.forEach((act, idx) => {
      ws2.addRow([]);
      rn2 = ws2.rowCount;
      const row = [idx + 1, ACTIVITY_TYPE_LABELS[act.type], act.description, act.responsible, act.date, ACTIVITY_STATUS_LABELS[act.status]];
      row.forEach((v, ci) => {
        ws2.getCell(`${numToCol(ci + 1)}${rn2}`).value = v as string | number;
        apply(ws2.getCell(`${numToCol(ci + 1)}${rn2}`), dat(idx % 2 === 0 ? C.lightGray : C.white, C.black, 9));
      });
      ws2.getRow(rn2).height = 20;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HOJA 3: PLAN DE MONTAJE
  // ══════════════════════════════════════════════════════════════
  const ws3 = wb.addWorksheet('PLAN DE MONTAJE', { views: [{ showGridLines: false }] });
  ws3.columns = [
    { width: 5 }, { width: 28 }, { width: 52 }, { width: 8 }, { width: 14 },
    { width: 16 }, { width: 12 }, { width: 22 }, { width: 22 },
  ];
  const COLS3 = 9;

  addDocHeader(ws3,
    `PLAN DETALLADO DE MONTAJE — ${equipment.tag}`,
    `${equipment.name}  |  IOM: ${equipment.iomManual || 'MIL24.001-IC-10-001'}  |  ${equipment.procedureRef || 'PRO-0038-ME'}`,
    COLS3,
  );

  sectionHdr(ws3, `PLAN DE MONTAJE — ${equipment.tag}  ·  Avance: ${Math.round(progress)}%  ·  ${completedSteps}/${stepsData.length} etapas completadas`, C.sgsOrange, COLS3);

  // Progress bar row
  ws3.addRow([]);
  let rn3 = ws3.rowCount;
  ws3.getRow(rn3).height = 16;
  for (let c = 1; c <= COLS3; c++) {
    const filled = c <= Math.round((progress / 100) * COLS3);
    apply(ws3.getCell(`${numToCol(c)}${rn3}`), {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: filled ? C.sgsOrange : 'FF1E2A3A' } },
      border: brd('FF333333'),
    });
  }
  ws3.getCell(`A${rn3}`).value = `${Math.round(progress)}%`;
  apply(ws3.getCell(`A${rn3}`), { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sgsOrange } }, alignment: { horizontal: 'left', vertical: 'middle' } });

  ws3.addRow([]);
  rn3 = ws3.rowCount;
  const stepColHdrs = ['N°', 'TÍTULO DE ETAPA', 'DESCRIPCIÓN TÉCNICA', 'PESO %', 'ESTADO', 'RESPONSABLE', 'F. INICIO', 'F. COMPLETADO', 'OBSERVACIONES'];
  stepColHdrs.forEach((h, i) => {
    ws3.getCell(`${numToCol(i + 1)}${rn3}`).value = h;
    apply(ws3.getCell(`${numToCol(i + 1)}${rn3}`), hdr(C.sgsOrange, C.white, 9));
  });
  ws3.getRow(rn3).height = 22;

  stepsData.forEach((step, idx) => {
    ws3.addRow([]);
    rn3 = ws3.rowCount;
    const sfColor = stepStatusFill(step.status);
    const isAlt   = idx % 2 === 0;
    const row = [
      step.step_number,
      step.title,
      step.description,
      `${step.weight_pct}%`,
      ASSEMBLY_STEP_STATUS_LABELS[step.status] || step.status,
      (step as any).responsible || '—',
      (step as any).start_date || '—',
      (step as any).completion_date || '—',
      (step as any).observations || '',
    ];
    row.forEach((v, ci) => {
      const cell = ws3.getCell(`${numToCol(ci + 1)}${rn3}`);
      cell.value = v as string | number;
      if (ci === 4) {
        apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: sfColor } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: brd('FFD0D0D0') });
      } else {
        apply(cell, dat(isAlt ? C.lightGray : C.white, C.black, 9, ci === 0 ? 'center' : ci === 3 ? 'center' : 'left'));
      }
    });
    ws3.getRow(rn3).height = 40;
  });

  // Resumen por etapa
  ws3.addRow([]);
  sectionHdr(ws3, 'Resumen de Referencias — IOM Manual y Procedimiento', C.gray, COLS3);
  ws3.addRow([]);
  rn3 = ws3.rowCount;
  ['N°', 'ETAPA', 'REF. IOM MANUAL', 'REF. PROCEDIMIENTO PRO-0038'].forEach((h, i) => {
    ws3.getCell(`${numToCol(i + 1)}${rn3}`).value = h;
    apply(ws3.getCell(`${numToCol(i + 1)}${rn3}`), hdr(C.gray, C.white, 9));
  });
  ws3.getRow(rn3).height = 18;
  stepsData.forEach((step, idx) => {
    ws3.addRow([]);
    rn3 = ws3.rowCount;
    [step.step_number, step.title, (step as any).iom_ref || '—', (step as any).proc_ref || '—'].forEach((v, ci) => {
      ws3.getCell(`${numToCol(ci + 1)}${rn3}`).value = v as string | number;
      apply(ws3.getCell(`${numToCol(ci + 1)}${rn3}`), dat(idx % 2 === 0 ? C.lightGray : C.white, C.black, 9));
    });
    ws3.getRow(rn3).height = 18;
  });

  // ══════════════════════════════════════════════════════════════
  // HOJA 4: PENDIENTES CONSTRUCTIVOS
  // ══════════════════════════════════════════════════════════════
  const ws4 = wb.addWorksheet('PENDIENTES', { views: [{ showGridLines: false }] });
  ws4.columns = [
    { width: 6 }, { width: 8 }, { width: 40 }, { width: 18 }, { width: 8 },
    { width: 16 }, { width: 12 }, { width: 14 }, { width: 28 },
  ];
  const COLS4 = 9;

  addDocHeader(ws4,
    `REGISTRO DE PENDIENTES CONSTRUCTIVOS — ${equipment.tag}`,
    `Punch List / Snag List  |  ${equipment.name}  |  ${now}`,
    COLS4,
  );

  // KPI bar
  const pOpen    = punchList.filter(p => p.status === 'abierto').length;
  const pGestion = punchList.filter(p => p.status === 'en_gestion').length;
  const pCerrado = punchList.filter(p => p.status === 'cerrado').length;
  const pA       = punchList.filter(p => p.priority === 'A').length;
  const pB       = punchList.filter(p => p.priority === 'B').length;
  const pC       = punchList.filter(p => p.priority === 'C').length;

  sectionHdr(ws4, `RESUMEN: Total ${punchList.length} ítem(s)  ·  Abiertos: ${pOpen}  ·  En Gestión: ${pGestion}  ·  Cerrados: ${pCerrado}  ·  Prioridad A: ${pA}  ·  B: ${pB}  ·  C: ${pC}`, C.red, COLS4);

  ws4.addRow([]);
  let rn4 = ws4.rowCount;
  const punchHdrs = ['#', 'ID', 'DESCRIPCIÓN', 'DISCIPLINA', 'PRIO.', 'RESPONSABLE', 'F. LÍMITE', 'ESTADO', 'ACCIÓN CORRECTIVA'];
  punchHdrs.forEach((h, i) => {
    ws4.getCell(`${numToCol(i + 1)}${rn4}`).value = h;
    apply(ws4.getCell(`${numToCol(i + 1)}${rn4}`), hdr(C.red, C.white, 9));
  });
  ws4.getRow(rn4).height = 22;

  if (punchList.length === 0) {
    ws4.addRow([]);
    rn4 = ws4.rowCount;
    merge(ws4, `A${rn4}`, `${numToCol(COLS4)}${rn4}`);
    ws4.getCell(`A${rn4}`).value = 'Sin asuntos pendientes registrados para este equipo.';
    apply(ws4.getCell(`A${rn4}`), dat(C.lightGray, C.gray, 10, 'center'));
    ws4.getRow(rn4).height = 22;
  } else {
    punchList.forEach((item, idx) => {
      ws4.addRow([]);
      rn4 = ws4.rowCount;
      const pfColor  = punchPriorityFill(item.priority);
      const sfColor4 = punchStatusFill(item.status);
      const isAlt    = idx % 2 === 0;
      const row = [
        idx + 1,
        item.item_number || `PEND-${String(idx + 1).padStart(3, '0')}`,
        item.description,
        PUNCH_DISCIPLINE_LABELS[item.discipline] || item.discipline,
        item.priority,
        item.responsible || '—',
        item.due_date || '—',
        PUNCH_STATUS_LABELS[item.status] || item.status,
        item.corrective_action || '—',
      ];
      row.forEach((v, ci) => {
        const cell = ws4.getCell(`${numToCol(ci + 1)}${rn4}`);
        cell.value = v as string | number;
        if (ci === 4) {
          apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: pfColor } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: brd('FFD0D0D0') });
        } else if (ci === 7) {
          apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: sfColor4 } }, alignment: { horizontal: 'center', vertical: 'middle' }, border: brd('FFD0D0D0') });
        } else {
          apply(cell, dat(isAlt ? C.lightGray : C.white, C.black, 9));
        }
      });
      ws4.getRow(rn4).height = 30;
    });
  }

  // ══════════════════════════════════════════════════════════════
  // HOJA 5: HALLAZGOS NC
  // ══════════════════════════════════════════════════════════════
  const ws5 = wb.addWorksheet('HALLAZGOS NC', { views: [{ showGridLines: false }] });
  ws5.columns = [
    { width: 14 }, { width: 10 }, { width: 28 }, { width: 40 }, { width: 10 },
    { width: 12 }, { width: 16 }, { width: 12 }, { width: 30 },
  ];
  const COLS5 = 9;

  addDocHeader(ws5,
    `HALLAZGOS DE NO CONFORMIDAD (NC) — ${equipment.tag}`,
    `${equipment.name}  |  Código Proyecto: MIL24.001  |  ${now}`,
    COLS5,
  );

  const openNcsCount   = equipNcs.filter(n => n.status === 'abierto').length;
  const critNcsCount   = equipNcs.filter(n => n.severity === 'crítica').length;

  sectionHdr(ws5, `RESUMEN: Total ${equipNcs.length} NC(s)  ·  Abiertas: ${openNcsCount}  ·  Críticas: ${critNcsCount}  ·  En Proceso: ${equipNcs.filter(n => n.status === 'en_proceso').length}  ·  Cerradas: ${equipNcs.filter(n => n.status === 'cerrado').length}`, C.red, COLS5);

  ws5.addRow([]);
  let rn5 = ws5.rowCount;
  const ncHdrs5 = ['NC-ID', 'SEVERIDAD', 'TÍTULO', 'DESCRIPCIÓN', 'ORIGEN', 'ESTADO', 'REPORTADO POR', 'F. CREACIÓN', 'PLAN DE ACCIÓN'];
  ncHdrs5.forEach((h, i) => {
    ws5.getCell(`${numToCol(i + 1)}${rn5}`).value = h;
    apply(ws5.getCell(`${numToCol(i + 1)}${rn5}`), hdr(C.red, C.white, 9));
  });
  ws5.getRow(rn5).height = 22;

  if (equipNcs.length === 0) {
    ws5.addRow([]);
    rn5 = ws5.rowCount;
    merge(ws5, `A${rn5}`, `${numToCol(COLS5)}${rn5}`);
    ws5.getCell(`A${rn5}`).value = 'Sin hallazgos NC registrados para este equipo.';
    apply(ws5.getCell(`A${rn5}`), dat(C.lightGray, C.gray, 10, 'center'));
    ws5.getRow(rn5).height = 22;
  } else {
    equipNcs.forEach((nc, idx) => {
      ws5.addRow([]);
      rn5 = ws5.rowCount;
      const sevColor  = severityFill(nc.severity);
      const statColor = ncStatusFill(nc.status);
      const isAlt     = idx % 2 === 0;
      const row = [
        nc.nc_id,
        NC_SEVERITY_LABELS[nc.severity],
        nc.title,
        nc.description,
        NC_ORIGIN_LABELS[nc.origin],
        NC_STATUS_LABELS[nc.status],
        nc.reported_by,
        new Date(nc.creation_date).toLocaleDateString('es-CO'),
        nc.correction_plan || nc.observations || '—',
      ];
      row.forEach((v, ci) => {
        const cell = ws5.getCell(`${numToCol(ci + 1)}${rn5}`);
        cell.value = v;
        if (ci === 1) {
          apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: sevColor } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: brd('FFD0D0D0') });
        } else if (ci === 5) {
          apply(cell, { font: { name: 'Calibri', size: 9, bold: true, color: { argb: C.white } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: statColor } }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: brd('FFD0D0D0') });
        } else {
          apply(cell, dat(isAlt ? C.lightGray : C.white, C.black, 9));
        }
      });
      ws5.getRow(rn5).height = 35;
    });
  }

  // ── Pie de firma (todas las hojas) ──────────────────────────────────────
  [ws2, ws3, ws4, ws5].forEach(ws => {
    ws.addRow([]); ws.addRow([]);
    const fr = ws.rowCount;
    const last = numToCol(ws.columns.length);
    merge(ws, `A${fr}`, `${last}${fr}`);
    ws.getCell(`A${fr}`).value = `Documento generado automáticamente — ${now}  |  ${PROF_NAME}  |  ${PROF_ROLE}  |  ${CERT_ISO}`;
    apply(ws.getCell(`A${fr}`), { font: { italic: true, name: 'Calibri', size: 8, color: { argb: C.gray } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: C.lightGray } }, alignment: { horizontal: 'center', vertical: 'middle' } });
    ws.getRow(fr).height = 14;
  });

  // ── Workbook properties ────────────────────────────────────────────────
  wb.views = [{ x: 0, y: 0, width: 20000, height: 16000, firstSheet: 0, activeTab: 0, visibility: 'visible' }];

  // ── Save ─────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fname  = `HV_${equipment.tag}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, fname);
}
