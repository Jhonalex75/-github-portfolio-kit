import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/** Subconjunto de reporte diario necesario para estadísticas de personal */
export interface PersonnelReportLike {
  id?: string;
  metadata?: { date?: string; frente?: string; consecutiveId?: string };
  recursos_frente?: { type?: string; count?: number }[];
  contractors?: { name?: string; personnel?: number }[];
}

export interface MonthlyPersonnelRow {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  reportCount: number;
  avgDirect: number;
  avgContractors: number;
  avgTotal: number;
  maxTotal: number;
  sumDirect: number;
  sumContractors: number;
  sumTotal: number;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d);
}

function totalsForReport(r: PersonnelReportLike): { direct: number; contractors: number; total: number } {
  const direct = (r.recursos_frente ?? []).reduce((s, x) => s + (Number(x.count) || 0), 0);
  const contractors = (r.contractors ?? []).reduce((s, c) => s + (Number(c.personnel) || 0), 0);
  return { direct, contractors, total: direct + contractors };
}

/**
 * Agrupa informes por mes calendario y calcula promedios y máximos de personal
 * (directo por recursos de frente + personal por contratista).
 */
export function aggregatePersonnelByMonth(reports: PersonnelReportLike[]): MonthlyPersonnelRow[] {
  type Acc = {
    sumDirect: number;
    sumContractors: number;
    sumTotal: number;
    maxTotal: number;
    count: number;
    sample: Date;
  };
  const map = new Map<string, Acc>();

  for (const r of reports) {
    const raw = r.metadata?.date;
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;

    const key = monthKey(d);
    const { direct, contractors, total } = totalsForReport(r);

    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        sumDirect: direct,
        sumContractors: contractors,
        sumTotal: total,
        maxTotal: total,
        count: 1,
        sample: d,
      });
    } else {
      prev.sumDirect += direct;
      prev.sumContractors += contractors;
      prev.sumTotal += total;
      prev.maxTotal = Math.max(prev.maxTotal, total);
      prev.count += 1;
    }
  }

  const rows: MonthlyPersonnelRow[] = [];
  for (const [key, acc] of map) {
    const n = acc.count;
    rows.push({
      key,
      label: monthLabel(acc.sample),
      year: acc.sample.getFullYear(),
      monthIndex: acc.sample.getMonth(),
      reportCount: n,
      avgDirect: Math.round((acc.sumDirect / n) * 10) / 10,
      avgContractors: Math.round((acc.sumContractors / n) * 10) / 10,
      avgTotal: Math.round((acc.sumTotal / n) * 10) / 10,
      maxTotal: acc.maxTotal,
      sumDirect: acc.sumDirect,
      sumContractors: acc.sumContractors,
      sumTotal: acc.sumTotal,
    });
  }

  rows.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex));
  return rows;
}

/** Filas para Recharts (promedios redondeados para visualización) */
export function toChartData(rows: MonthlyPersonnelRow[]) {
  return rows.map((r) => ({
    mes: r.label,
    key: r.key,
    Directo: Math.round(r.avgDirect * 10) / 10,
    Contratistas: Math.round(r.avgContractors * 10) / 10,
    Total: Math.round(r.avgTotal * 10) / 10,
    informes: r.reportCount,
    maximo: r.maxTotal,
  }));
}

const C = {
  headerBg: 'FF0D47A1',
  headerFg: 'FFFFFFFF',
  altRow: 'FFF5F5F5',
  white: 'FFFFFFFF',
  black: 'FF000000',
};

function thin(argb: string): Partial<ExcelJS.Border> {
  return { style: 'thin', color: { argb } };
}

export async function exportPersonnelByMonthExcel(
  reports: PersonnelReportLike[],
  monthlyRows: MonthlyPersonnelRow[],
  projectLabel = 'default-nexus-project'
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Nexus — Reportes diarios';
  wb.created = new Date();
  wb.subject = 'Histograma de personal por mes';

  const ws1 = wb.addWorksheet('Resumen_mensual', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws1.mergeCells('A1:H1');
  ws1.getCell('A1').value = 'Personal por mes — informes diarios (promedios por folio)';
  ws1.getCell('A1').font = { bold: true, size: 14, name: 'Calibri' };
  ws1.getCell('A2').value = `Proyecto: ${projectLabel} · Generado: ${new Date().toLocaleString('es-CO')}`;
  ws1.getCell('A2').font = { italic: true, size: 10, name: 'Calibri', color: { argb: 'FF666666' } };

  const headers = [
    'Mes (clave)',
    'Etiqueta',
    'N° informes',
    'Prom. personal directo',
    'Prom. contratistas',
    'Prom. total',
    'Máx. total (un folio)',
    'Suma total (todos los folios)',
  ];
  const hr = ws1.addRow(headers);
  hr.font = { bold: true, color: { argb: C.headerFg }, name: 'Calibri', size: 10 };
  hr.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    cell.border = { top: thin('FF333333'), bottom: thin('FF333333'), left: thin('FF333333'), right: thin('FF333333') };
  });

  monthlyRows.forEach((row, i) => {
    const r = ws1.addRow([
      row.key,
      row.label,
      row.reportCount,
      row.avgDirect,
      row.avgContractors,
      row.avgTotal,
      row.maxTotal,
      row.sumTotal,
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
    r.getCell(3).numFmt = '0';
    r.getCell(4).numFmt = '0.0';
    r.getCell(5).numFmt = '0.0';
    r.getCell(6).numFmt = '0.0';
    r.getCell(7).numFmt = '0';
    r.getCell(8).numFmt = '0';
  });

  ws1.columns = [
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 22 },
    { width: 28 },
  ];

  const ws2 = wb.addWorksheet('Detalle_informes', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  const dh = ws2.addRow([
    'Mes',
    'Folio',
    'Fecha informe',
    'Frente',
    'Personal directo',
    'Contratistas',
    'Total',
  ]);
  dh.font = { bold: true, color: { argb: C.headerFg }, name: 'Calibri', size: 10 };
  dh.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
    cell.border = { top: thin('FF333333'), bottom: thin('FF333333'), left: thin('FF333333'), right: thin('FF333333') };
  });

  const sortedReports = [...reports].filter((r) => r.metadata?.date).sort((a, b) => {
    const ta = new Date(a.metadata!.date!).getTime();
    const tb = new Date(b.metadata!.date!).getTime();
    return ta - tb;
  });

  sortedReports.forEach((r, i) => {
    const d = new Date(r.metadata!.date!);
    const { direct, contractors, total } = totalsForReport(r);
    const row = ws2.addRow([
      monthKey(d),
      r.metadata?.consecutiveId ?? r.id ?? '—',
      d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }),
      r.metadata?.frente ?? '—',
      direct,
      contractors,
      total,
    ]);
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } };
      });
    }
    row.eachCell((cell) => {
      cell.border = {
        top: thin('FFCCCCCC'),
        bottom: thin('FFCCCCCC'),
        left: thin('FFCCCCCC'),
        right: thin('FFCCCCCC'),
      };
      cell.font = { name: 'Calibri', size: 10 };
    });
    row.getCell(5).numFmt = '0';
    row.getCell(6).numFmt = '0';
    row.getCell(7).numFmt = '0';
  });

  ws2.columns = [{ width: 12 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 18 }, { width: 14 }, { width: 10 }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `Nexus_personal_por_mes_${projectLabel}_${stamp}.xlsx`);
}
