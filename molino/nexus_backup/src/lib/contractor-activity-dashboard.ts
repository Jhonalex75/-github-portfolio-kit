import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface ContractorDashboardReportLike {
  id: string;
  metadata?: { date?: string; frente?: string; consecutiveId?: string; status?: string };
  activities?: string;
  contractors?: { name?: string; personnel?: number }[];
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
