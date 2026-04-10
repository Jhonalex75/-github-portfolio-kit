/**
 * monthly-resources-stats.ts
 * Aggregation functions for the monthly resources dashboard:
 * personnel breakdown by specialty, equipment, lost hours, and activities.
 */

// ─── Shared helpers ───────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(d: Date): string {
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d);
}

function parseDate(raw?: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyReportLike {
  id?: string;
  metadata?: { date?: string; frente?: string; consecutiveId?: string };
  recursos_frente?: { type?: string; count?: number }[];
  activities?: string;
  contractors?: {
    name?: string;
    personnel?: number;
    breakdown?: {
      mecanicos?: number;
      soldadores?: number;
      auxiliares?: number;
      armadores?: number;
    };
    equipment?: {
      grua?: number;
      generador?: number;
      andamios?: number;
      camionGrua?: number;
      torreGrua?: number;
      equipoEspecial?: string;
    };
    lostHours?: {
      malClima?: number;
      parosHSE?: number;
      fallasTecnicas?: number;
    };
  }[];
}

// ── 1. Personnel breakdown by specialty ──────────────────────────────────────

export interface PersonnelBreakdownRow {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  reportCount: number;
  mecanicos: number;
  soldadores: number;
  auxiliares: number;
  armadores: number;
  directo: number;    // recursos_frente directos (no-contractors)
  total: number;
}

export function aggregatePersonnelBreakdownByMonth(
  reports: MonthlyReportLike[]
): PersonnelBreakdownRow[] {
  type Acc = {
    mec: number; sold: number; aux: number; arm: number; dir: number;
    count: number; sample: Date;
  };
  const map = new Map<string, Acc>();

  for (const r of reports) {
    const d = parseDate(r.metadata?.date);
    if (!d) continue;
    const key = monthKey(d);

    let mec = 0, sold = 0, aux = 0, arm = 0;
    for (const c of r.contractors ?? []) {
      mec  += c.breakdown?.mecanicos  ?? 0;
      sold += c.breakdown?.soldadores ?? 0;
      aux  += c.breakdown?.auxiliares ?? 0;
      arm  += c.breakdown?.armadores  ?? 0;
    }
    const dir = (r.recursos_frente ?? []).reduce((s, x) => s + (Number(x.count) || 0), 0);

    const prev = map.get(key);
    if (!prev) {
      map.set(key, { mec, sold, aux, arm, dir, count: 1, sample: d });
    } else {
      prev.mec  += mec;  prev.sold += sold;
      prev.aux  += aux;  prev.arm  += arm;
      prev.dir  += dir;  prev.count++;
    }
  }

  const rows: PersonnelBreakdownRow[] = [];
  for (const [key, a] of map) {
    rows.push({
      key,
      label: monthLabel(a.sample),
      year: a.sample.getFullYear(),
      monthIndex: a.sample.getMonth(),
      reportCount: a.count,
      mecanicos:  a.mec,
      soldadores: a.sold,
      auxiliares: a.aux,
      armadores:  a.arm,
      directo:    a.dir,
      total: a.mec + a.sold + a.aux + a.arm + a.dir,
    });
  }
  rows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex);
  return rows;
}

// ── 2. Equipment by month ─────────────────────────────────────────────────────

export interface EquipmentMonthRow {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  reportCount: number;
  grua: number;
  generador: number;
  andamios: number;
  camionGrua: number;
  torreGrua: number;
}

export function aggregateEquipmentByMonth(
  reports: MonthlyReportLike[]
): EquipmentMonthRow[] {
  type Acc = {
    grua: number; gen: number; and: number; cg: number; tg: number;
    count: number; sample: Date;
  };
  const map = new Map<string, Acc>();

  for (const r of reports) {
    const d = parseDate(r.metadata?.date);
    if (!d) continue;
    const key = monthKey(d);

    let grua = 0, gen = 0, and = 0, cg = 0, tg = 0;
    for (const c of r.contractors ?? []) {
      grua += c.equipment?.grua       ?? 0;
      gen  += c.equipment?.generador  ?? 0;
      and  += c.equipment?.andamios   ?? 0;
      cg   += c.equipment?.camionGrua ?? 0;
      tg   += c.equipment?.torreGrua  ?? 0;
    }

    const prev = map.get(key);
    if (!prev) {
      map.set(key, { grua, gen, and, cg, tg, count: 1, sample: d });
    } else {
      prev.grua += grua; prev.gen  += gen;
      prev.and  += and;  prev.cg   += cg;
      prev.tg   += tg;   prev.count++;
    }
  }

  const rows: EquipmentMonthRow[] = [];
  for (const [key, a] of map) {
    rows.push({
      key,
      label: monthLabel(a.sample),
      year: a.sample.getFullYear(),
      monthIndex: a.sample.getMonth(),
      reportCount: a.count,
      grua:      a.grua,
      generador: a.gen,
      andamios:  a.and,
      camionGrua: a.cg,
      torreGrua:  a.tg,
    });
  }
  rows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex);
  return rows;
}

// ── 3. Lost hours by month ────────────────────────────────────────────────────

export interface LostHoursMonthRow {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  reportCount: number;
  malClima: number;
  parosHSE: number;
  fallasTecnicas: number;
  total: number;
}

export function aggregateLostHoursByMonth(
  reports: MonthlyReportLike[]
): LostHoursMonthRow[] {
  type Acc = {
    clima: number; hse: number; tec: number;
    count: number; sample: Date;
  };
  const map = new Map<string, Acc>();

  for (const r of reports) {
    const d = parseDate(r.metadata?.date);
    if (!d) continue;
    const key = monthKey(d);

    let clima = 0, hse = 0, tec = 0;
    for (const c of r.contractors ?? []) {
      clima += c.lostHours?.malClima       ?? 0;
      hse   += c.lostHours?.parosHSE       ?? 0;
      tec   += c.lostHours?.fallasTecnicas ?? 0;
    }

    const prev = map.get(key);
    if (!prev) {
      map.set(key, { clima, hse, tec, count: 1, sample: d });
    } else {
      prev.clima += clima; prev.hse += hse;
      prev.tec   += tec;   prev.count++;
    }
  }

  const rows: LostHoursMonthRow[] = [];
  for (const [key, a] of map) {
    rows.push({
      key,
      label: monthLabel(a.sample),
      year: a.sample.getFullYear(),
      monthIndex: a.sample.getMonth(),
      reportCount: a.count,
      malClima:       a.clima,
      parosHSE:       a.hse,
      fallasTecnicas: a.tec,
      total: a.clima + a.hse + a.tec,
    });
  }
  rows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex);
  return rows;
}

// ── 4. Activities summary by month ────────────────────────────────────────────

/** Stopwords in Spanish to ignore in word frequency */
const STOPWORDS = new Set([
  'de','la','el','en','y','a','los','las','del','un','una','con','por','para',
  'al','se','es','su','que','lo','le','no','como','más','pero','sus','ya','o',
  'fue','si','desde','también','ha','han','sin','sobre','entre','cuando','muy',
  'hay','ser','son','está','todo','estos','puede','bien','hasta','así','cada',
  'parte','este','esta','estos','estas','fue','están','vez','días','día','trabajo',
  'trabajos','durante','tanto','otros','otras','equipo','equipos',
]);

export interface ActivitiesMonthRow {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  reportCount: number;
  snippets: { folio: string; frente: string; text: string }[];
  topWords: { word: string; count: number }[];
}

export function aggregateActivitiesByMonth(
  reports: MonthlyReportLike[]
): ActivitiesMonthRow[] {
  type Acc = {
    snippets: { folio: string; frente: string; text: string }[];
    wordMap: Map<string, number>;
    count: number;
    sample: Date;
  };
  const map = new Map<string, Acc>();

  for (const r of reports) {
    const d = parseDate(r.metadata?.date);
    if (!d) continue;
    const key = monthKey(d);
    const text = (r.activities ?? '').trim();
    const folio = r.metadata?.consecutiveId ?? r.id ?? '—';
    const frente = r.metadata?.frente ?? '—';

    const prev = map.get(key);
    const acc: Acc = prev ?? { snippets: [], wordMap: new Map(), count: 0, sample: d };
    if (!prev) map.set(key, acc);

    acc.count++;
    if (text) {
      acc.snippets.push({ folio, frente, text });
      // Count word frequency (min 4 chars, not stopword)
      const words = text.toLowerCase().replace(/[^a-záéíóúñü\s]/g, ' ').split(/\s+/);
      for (const w of words) {
        if (w.length >= 4 && !STOPWORDS.has(w)) {
          acc.wordMap.set(w, (acc.wordMap.get(w) ?? 0) + 1);
        }
      }
    }
  }

  const rows: ActivitiesMonthRow[] = [];
  for (const [key, a] of map) {
    const topWords = [...a.wordMap.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
    rows.push({
      key,
      label: monthLabel(a.sample),
      year: a.sample.getFullYear(),
      monthIndex: a.sample.getMonth(),
      reportCount: a.count,
      snippets: a.snippets,
      topWords,
    });
  }
  rows.sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex);
  return rows;
}
