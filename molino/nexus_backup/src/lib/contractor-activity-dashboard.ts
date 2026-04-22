import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ContractorDashboardReportLike {
  id: string;
  metadata?: { date?: string; frente?: string; consecutiveId?: string; status?: string };
  activities?: string;
  contractors?: { name?: string; personnel?: number; breakdown?: { mecanicos?: number; soldadores?: number; auxiliares?: number; armadores?: number } }[];
  /** New per-contractor sections format */
  contractor_sections?: Record<string, {
    activities?: string;
    personnel?: { mecanicos?: number; soldadores?: number; auxiliares?: number; armadores?: number; inspectoresHSE?: number };
    equipment?:  { grua?: number; generador?: number; andamios?: number; camionGrua?: number; torreGrua?: number };
    lostHours?:  { malClima?: number; parosHSE?: number; fallasTecnicas?: number };
  }>;
}

export interface ContractorReportRow {
  contractor: string;
  reportId: string;
  consecutiveId: string;
  dateIso: string;
  dateMs: number;
  frente: string;
  personnel: number;
  activities: string;
}

/** Una fila por (informe × contratista con nombre). Las actividades son las del folio completo. */
export function flattenContractorReportRows(
  reports: ContractorDashboardReportLike[]
): ContractorReportRow[] {
  const rows: ContractorReportRow[] = [];
  for (const r of reports) {
    const list = (r.contractors ?? []).filter((c) => (c.name ?? '').trim().length > 0);
    for (const c of list) {
      const dateIso = r.metadata?.date ?? '';
      const d = new Date(dateIso);
      const dateMs = Number.isNaN(d.getTime()) ? 0 : d.getTime();
      rows.push({
        contractor: (c.name ?? '').trim(),
        reportId: r.id,
        consecutiveId: r.metadata?.consecutiveId ?? '—',
        dateIso,
        dateMs,
        frente: r.metadata?.frente ?? '—',
        personnel: Math.max(0, Number(c.personnel) || 0),
        activities: (r.activities ?? '').trim(),
      });
    }
  }
  rows.sort((a, b) => a.dateMs - b.dateMs);
  return rows;
}

export function distinctContractors(rows: ContractorReportRow[]): string[] {
  const s = new Set(rows.map((r) => r.contractor));
  return [...s].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function monthKeyFromMs(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabelFromMs(ms: number): string {
  if (!ms) return '';
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(new Date(ms));
}

export interface MonthlyContractorStat {
  key: string;
  label: string;
  reportCount: number;
  sumPersonnel: number;
  avgPersonnel: number;
}

export function monthlyStatsForContractor(
  rows: ContractorReportRow[],
  contractor: string
): MonthlyContractorStat[] {
  const filtered = rows.filter((r) => r.contractor === contractor && r.dateMs > 0);
  const map = new Map<string, { count: number; sumPers: number; sampleMs: number }>();

  for (const r of filtered) {
    const key = monthKeyFromMs(r.dateMs);
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { count: 1, sumPers: r.personnel, sampleMs: r.dateMs });
    } else {
      prev.count += 1;
      prev.sumPers += r.personnel;
    }
  }

  const out: MonthlyContractorStat[] = [];
  for (const [key, v] of map) {
    out.push({
      key,
      label: monthLabelFromMs(v.sampleMs),
      reportCount: v.count,
      sumPersonnel: v.sumPers,
      avgPersonnel: Math.round((v.sumPers / v.count) * 10) / 10,
    });
  }
  out.sort((a, b) => a.key.localeCompare(b.key));
  return out;
}

/** Top contratistas por número de vínculos a folios */
export function topContractorsByVolume(rows: ContractorReportRow[], limit = 15) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.contractor, (map.get(r.contractor) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, folios: count }));
}

export interface ContractorSummaryRow {
  contractor: string;
  firstDateMs: number;
  lastDateMs: number;
  reportLinks: number;
  sumPersonnel: number;
  avgPersonnel: number;
}

export function summarizeAllContractors(rows: ContractorReportRow[]): ContractorSummaryRow[] {
  const map = new Map<
    string,
    { min: number; max: number; n: number; sumP: number }
  >();

  for (const r of rows) {
    if (!r.dateMs) continue;
    const prev = map.get(r.contractor);
    if (!prev) {
      map.set(r.contractor, {
        min: r.dateMs,
        max: r.dateMs,
        n: 1,
        sumP: r.personnel,
      });
    } else {
      prev.min = Math.min(prev.min, r.dateMs);
      prev.max = Math.max(prev.max, r.dateMs);
      prev.n += 1;
      prev.sumP += r.personnel;
    }
  }

  const out: ContractorSummaryRow[] = [];
  for (const [contractor, v] of map) {
    out.push({
      contractor,
      firstDateMs: v.min,
      lastDateMs: v.max,
      reportLinks: v.n,
      sumPersonnel: v.sumP,
      avgPersonnel: Math.round((v.sumP / v.n) * 10) / 10,
    });
  }
  return out.sort((a, b) => a.contractor.localeCompare(b.contractor, 'es', { sensitivity: 'base' }));
}

// ─── Especialidades por folio ─────────────────────────────────────────────────
export interface SpecialtyByFolio {
  label: string;        // "Folio #42 · 10 Abr"
  mecanicos:      number;
  soldadores:     number;
  auxiliares:     number;
  armadores:      number;
  inspectoresHSE: number;
  total:          number;
}

export function specialtyByFolio(
  reports: ContractorDashboardReportLike[],
  contractor: string,
): SpecialtyByFolio[] {
  const out: SpecialtyByFolio[] = [];
  const sorted = [...reports].sort((a, b) => {
    const da = new Date(a.metadata?.date ?? '').getTime();
    const db = new Date(b.metadata?.date ?? '').getTime();
    return da - db;
  });
  for (const r of sorted) {
    const sec = r.contractor_sections?.[contractor];
    const leg = r.contractors?.find(c => (c.name ?? '').trim() === contractor);
    if (!sec && !leg) continue;

    const date = r.metadata?.date ?? '';
    const d = date ? new Date(date) : null;
    const shortDate = d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      : '—';
    const folio = r.metadata?.consecutiveId ?? '—';
    const label = `#${folio}\n${shortDate}`;

    const mec  = sec?.personnel?.mecanicos      ?? leg?.breakdown?.mecanicos      ?? 0;
    const sold = sec?.personnel?.soldadores     ?? leg?.breakdown?.soldadores     ?? 0;
    const aux  = sec?.personnel?.auxiliares     ?? leg?.breakdown?.auxiliares     ?? 0;
    const arm  = sec?.personnel?.armadores      ?? leg?.breakdown?.armadores      ?? 0;
    const hse  = sec?.personnel?.inspectoresHSE ?? 0;
    const total = mec + sold + aux + arm + hse || (leg?.personnel ?? 0);

    out.push({ label, mecanicos: mec, soldadores: sold, auxiliares: aux, armadores: arm, inspectoresHSE: hse, total });
  }
  return out;
}

// ─── Distribución porcentual de especialidades ────────────────────────────────
export interface SpecialtyShare {
  name:  string;
  value: number;
  pct:   number;
  color: string;
}

const SPECIALTY_COLORS: Record<string, string> = {
  'Mecánicos':      '#1565C0',
  'Soldadores':     '#D32F2F',
  'Auxiliares':     '#00695C',
  'Armadores':      '#FFA000',
  'Insp. HSE':      '#6A1B9A',
};

export function specialtyShareForContractor(
  reports: ContractorDashboardReportLike[],
  contractor: string,
): SpecialtyShare[] {
  let mec=0, sold=0, aux=0, arm=0, hse=0;
  for (const r of reports) {
    const sec = r.contractor_sections?.[contractor];
    const leg = r.contractors?.find(c => (c.name ?? '').trim() === contractor);
    if (!sec && !leg) continue;
    mec  += sec?.personnel?.mecanicos      ?? leg?.breakdown?.mecanicos      ?? 0;
    sold += sec?.personnel?.soldadores     ?? leg?.breakdown?.soldadores     ?? 0;
    aux  += sec?.personnel?.auxiliares     ?? leg?.breakdown?.auxiliares     ?? 0;
    arm  += sec?.personnel?.armadores      ?? leg?.breakdown?.armadores      ?? 0;
    hse  += sec?.personnel?.inspectoresHSE ?? 0;
  }
  const tot = mec + sold + aux + arm + hse;
  if (tot === 0) return [];
  return [
    { name: 'Mecánicos',  value: mec,  pct: Math.round(mec/tot*100),  color: SPECIALTY_COLORS['Mecánicos'] },
    { name: 'Soldadores', value: sold, pct: Math.round(sold/tot*100), color: SPECIALTY_COLORS['Soldadores'] },
    { name: 'Auxiliares', value: aux,  pct: Math.round(aux/tot*100),  color: SPECIALTY_COLORS['Auxiliares'] },
    { name: 'Armadores',  value: arm,  pct: Math.round(arm/tot*100),  color: SPECIALTY_COLORS['Armadores'] },
    { name: 'Insp. HSE',  value: hse,  pct: Math.round(hse/tot*100),  color: SPECIALTY_COLORS['Insp. HSE'] },
  ].filter(s => s.value > 0);
}

// ─── Frecuencia de actividades por categoría (NLP) ───────────────────────────
export interface ActivityFreqItem {
  category: string;
  icon:     string;
  count:    number;         // folios donde aparece
  pct:      number;         // % sobre total folios del contratista
  color:    string;
}

const ACT_CATS_DASH = [
  { id:'montaje',    label:'Montaje Mecánico',       icon:'⚙️', color:'#1565C0', kw:['montaj','instala','posicion','alinea','ensambla','fija','coloca','ubica','perno','platina','viga','estructura'] },
  { id:'soldadura',  label:'Soldadura',               icon:'🔥', color:'#D32F2F', kw:['soldad','soldar','pase','raiz','relleno','electrodo','mig','tig','smaw','fcaw','metraj','bisel','junta','arco'] },
  { id:'izaje',      label:'Izaje & Rigging',         icon:'🪝', color:'#6A1B9A', kw:['izaje','izar','grua','eslinga','señalero','maniobra','izado','levantam','aparejo'] },
  { id:'inspeccion', label:'Inspección / QC',         icon:'🔍', color:'#00695C', kw:['inspecc','verific','control','ensayo','end','dimensional','medic','toleranc','calibr','liberac','certifi'] },
  { id:'preparacion',label:'Preparación',             icon:'🔧', color:'#827717', kw:['limpiez','granallado','prepara','superficie','desoxid','lijad','pulid','sandblast','pintad'] },
  { id:'civil',      label:'Obra Civil',              icon:'🏗️', color:'#37474F', kw:['concret','hormig','nivelac','excavac','rellen','compacta','fundam','anclaje','mortero'] },
  { id:'hse',        label:'HSE & Permisos',          icon:'🛡️', color:'#E65100', kw:['permiso','charla','ats','pets','epp','seguridad','hse','capacitac','riesgo','peligro','incidente'] },
  { id:'logistica',  label:'Logística & Acopio',      icon:'📦', color:'#4527A0', kw:['traslado','acopio','bodega','despacho','recepcion','almacenam','transporte','suministro'] },
  { id:'topografia', label:'Topografía / Layout',     icon:'📐', color:'#2E7D32', kw:['replanteo','trazado','cotas','ejes','topograf','alineamiento','coordenad'] },
];

export function activityFrequency(
  rows: ContractorReportRow[],
  contractor: string,
  allReports: ContractorDashboardReportLike[],
): ActivityFreqItem[] {
  const filtered = rows.filter(r => r.contractor === contractor);
  const total = filtered.length || 1;

  // Merge activities from row + contractor_sections
  const texts = filtered.map(r => {
    const rep = allReports.find(d => d.id === r.reportId);
    const secAct = rep?.contractor_sections?.[contractor]?.activities ?? '';
    return ((secAct || r.activities) ?? '').toLowerCase();
  });

  return ACT_CATS_DASH.map(cat => {
    const count = texts.filter(t => cat.kw.some(kw => t.includes(kw))).length;
    return { category: cat.label, icon: cat.icon, count, pct: Math.round(count/total*100), color: cat.color };
  }).filter(c => c.count > 0).sort((a,b) => b.count - a.count);
}

const C = {
  headerBg: 'FF1565C0',
  headerFg: 'FFFFFFFF',
  altRow: 'FFF5F5F5',
  black: 'FF000000',
};

function thin(argb: string): Partial<ExcelJS.Border> {
  return { style: 'thin', color: { argb } };
}

export async function exportContractorDashboardExcel(
  rows: ContractorReportRow[],
  summaries: ContractorSummaryRow[],
  options?: { filterContractor?: string; projectId?: string }
): Promise<void> {
  const { filterContractor, projectId = 'default-nexus-project' } = options ?? {};
  const detailRows = filterContractor
    ? rows.filter((r) => r.contractor === filterContractor)
    : rows;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nexus — Dashboard contratistas';
  wb.created = new Date();
  wb.subject = 'Actividades por contratista';

  const ws0 = wb.addWorksheet('Resumen_contratistas', { views: [{ state: 'frozen', ySplit: 3 }] });
  ws0.mergeCells('A1:G1');
  ws0.getCell('A1').value = 'Resumen — actividades en informes diarios (por contratista)';
  ws0.getCell('A1').font = { bold: true, size: 13, name: 'Calibri' };
  ws0.getCell('A2').value = `Proyecto: ${projectId} · ${filterContractor ? `Filtrado: ${filterContractor}` : 'Todos los contratistas'} · ${new Date().toLocaleString('es-CO')}`;
  ws0.getCell('A2').font = { italic: true, size: 10, name: 'Calibri', color: { argb: 'FF666666' } };

  const h0 = ws0.addRow([
    'Contratista',
    'Primer informe',
    'Último informe',
    'Días cubiertos (aprox.)',
    '# Vínculos folio',
    'Suma personal reportado',
    'Prom. personal / folio',
  ]);
  h0.font = { bold: true, color: { argb: C.headerFg }, name: 'Calibri', size: 10 };
  h0.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    cell.border = { top: thin('FF333333'), bottom: thin('FF333333'), left: thin('FF333333'), right: thin('FF333333') };
  });

  const sumSource = filterContractor
    ? summaries.filter((s) => s.contractor === filterContractor)
    : summaries;

  sumSource.forEach((s, i) => {
    const days = Math.max(
      0,
      Math.ceil((s.lastDateMs - s.firstDateMs) / (86400000)) + 1
    );
    const r = ws0.addRow([
      s.contractor,
      s.firstDateMs ? new Date(s.firstDateMs).toLocaleDateString('es-CO') : '—',
      s.lastDateMs ? new Date(s.lastDateMs).toLocaleDateString('es-CO') : '—',
      days,
      s.reportLinks,
      s.sumPersonnel,
      s.avgPersonnel,
    ]);
    if (i % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
      });
    }
    r.eachCell((cell) => {
      cell.border = {
        top: thin('FFCCCCCC'),
        bottom: thin('FFCCCCCC'),
        left: thin('FFCCCCCC'),
        right: thin('FFCCCCCC'),
      };
      cell.font = { name: 'Calibri', size: 10, color: { argb: C.black } };
    });
    r.getCell(4).numFmt = '0';
    r.getCell(5).numFmt = '0';
    r.getCell(6).numFmt = '0';
    r.getCell(7).numFmt = '0.0';
  });
  ws0.columns = [{ width: 28 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 22 }, { width: 18 }];

  const ws1 = wb.addWorksheet('Detalle_folios', { views: [{ state: 'frozen', ySplit: 1 }] });
  const h1 = ws1.addRow([
    'Contratista',
    'Folio',
    'Fecha informe',
    'Frente',
    'Personal',
    'Actividades (texto del folio)',
  ]);
  h1.font = { bold: true, color: { argb: C.headerFg }, name: 'Calibri', size: 10 };
  h1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    cell.border = { top: thin('FF333333'), bottom: thin('FF333333'), left: thin('FF333333'), right: thin('FF333333') };
  });

  detailRows.forEach((row, i) => {
    const r = ws1.addRow([
      row.contractor,
      row.consecutiveId,
      row.dateIso ? new Date(row.dateIso).toLocaleString('es-CO') : '—',
      row.frente,
      row.personnel,
      row.activities,
    ]);
    if (i % 2 === 0) {
      r.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
      });
    }
    r.eachCell((cell) => {
      cell.border = {
        top: thin('FFCCCCCC'),
        bottom: thin('FFCCCCCC'),
        left: thin('FFCCCCCC'),
        right: thin('FFCCCCCC'),
      };
      cell.font = { name: 'Calibri', size: 10 };
    });
    r.getCell(5).numFmt = '0';
    r.getCell(6).alignment = { wrapText: true, vertical: 'top' };
  });
  ws1.columns = [{ width: 24 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 10 }, { width: 70 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = filterContractor
    ? `_${filterContractor.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)}`
    : '_todos';
  saveAs(blob, `Nexus_dashboard_contratistas${suffix}_${projectId}_${stamp}.xlsx`);
}
