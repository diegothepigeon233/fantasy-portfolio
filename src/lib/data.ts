import path from 'node:path';
import ExcelJS from 'exceljs';

/**
 * The workbook is read once, at build time, straight off disk. Update the file,
 * commit, push — Vercel rebuilds and the new numbers are live. No network calls,
 * no API keys, and `git log` doubles as the history of every change you make.
 */
const WORKBOOK_PATH = path.join(process.cwd(), 'data', 'fantasy-portfolio.xlsx');

/** One row of the `leagues` sheet — metadata about each competition you play. */
export type League = {
  slug: string;
  name: string;
  /** Homepage grouping, e.g. "Soccer Official". Free text — add new ones in the sheet. */
  category: string;
  sport: string;
  accent: string;
  blurb: string;
};

/** One row of the `seasons` sheet — your result in one league, one season. */
export type Season = {
  league: string;
  season: string;
  teamName: string;
  points: number | null;
  overallRank: number | null;
  totalPlayers: number | null;
  /** As typed in the sheet, e.g. "6%". Blank if not recorded. */
  pctFinish: string;
  /** Numeric form of the above, for sorting. Lower is better. */
  pctValue: number | null;
  miniLeague: string;
  miniLeagueRank: number | null;
  miniLeagueSize: number | null;
  result: string;
  highlight: boolean;
  notes: string;
};

/** One row of the `private-mini-leagues` sheet — a private league with friends. */
export type MiniLeague = {
  league: string;
  season: string;
  host: string;
  format: string;
  teamName: string;
  result: string;
};

/** Cells can hold strings, numbers, formulas or rich text — flatten them all. */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    // Formula cells expose the cached result; rich text is an array of runs.
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((r) => r.text).join('').trim();
    if ('text' in value) return String(value.text).trim();
  }
  return String(value).trim();
}

/** Blank cells become null rather than 0, so they render as "—" not "0". */
function num(value: string): number | null {
  const cleaned = value.replace(/[,%\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function bool(value: string): boolean {
  return ['true', 'yes', 'y', '1', 'x'].includes(value.toLowerCase());
}

/**
 * Reads one worksheet into plain objects keyed by its header row.
 * Headers are lowercased and trimmed, so "Overall Rank" matches `overall_rank`
 * only if you write it that way — keep the headers exactly as the README lists.
 */
async function readSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  requiredHeader: string,
): Promise<Record<string, string>[]> {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) {
    const found = workbook.worksheets.map((w) => w.name).join(', ');
    throw new Error(
      `No sheet named "${name}" in data/fantasy-portfolio.xlsx (found: ${found}). ` +
        `Sheet names are case-sensitive.`,
    );
  }

  const headers = (sheet.getRow(1).values as ExcelJS.CellValue[])
    .slice(1)
    .map((h) => cellText(h).toLowerCase());

  if (!headers.includes(requiredHeader)) {
    throw new Error(
      `Sheet "${name}" is missing the required "${requiredHeader}" column ` +
        `(row 1 has: ${headers.filter(Boolean).join(', ') || 'nothing'}).`,
    );
  }

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const record: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      const cell = row.getCell(i + 1);
      // Typing "6%" into Excel stores the number 0.06 with a percent format.
      // Read the format so it comes back as "6%" and not "0.06".
      if (typeof cell.value === 'number' && String(cell.numFmt ?? '').includes('%')) {
        record[header] = `${Number((cell.value * 100).toFixed(4))}%`;
      } else {
        record[header] = cellText(cell.value);
      }
    });
    rows.push(record);
  });

  return rows;
}

async function openWorkbook(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.readFile(WORKBOOK_PATH);
  } catch (e) {
    throw new Error(
      `Couldn't read data/fantasy-portfolio.xlsx. ` +
        `Make sure the file exists and isn't currently open in Excel. (${
          e instanceof Error ? e.message : String(e)
        })`,
    );
  }
  return workbook;
}

export async function getLeagues(): Promise<League[]> {
  const rows = await readSheet(await openWorkbook(), 'leagues', 'slug');
  return rows
    .filter((r) => r.slug !== '')
    .map((r) => ({
      slug: r.slug.toLowerCase(),
      name: r.name ?? '',
      category: r.category || 'Others',
      sport: r.sport ?? '',
      accent: r.accent || '#38bdf8',
      blurb: r.blurb ?? '',
    }));
}

/**
 * Groups leagues for the homepage. Section order follows the order categories
 * first appear in the sheet, so you reorder the page by reordering rows —
 * no code change needed to add a category.
 */
export function groupByCategory(leagues: League[]): { category: string; leagues: League[] }[] {
  const groups = new Map<string, League[]>();
  for (const league of leagues) {
    const existing = groups.get(league.category);
    if (existing) existing.push(league);
    else groups.set(league.category, [league]);
  }
  return [...groups].map(([category, leagues]) => ({ category, leagues }));
}

export async function getSeasons(): Promise<Season[]> {
  const rows = await readSheet(await openWorkbook(), 'seasons', 'league');
  return rows
    .filter((r) => r.league !== '')
    .map((r) => ({
      league: r.league.toLowerCase(),
      season: r.season ?? '',
      teamName: r.team_name ?? '',
      points: num(r.points ?? ''),
      overallRank: num(r.overall_rank ?? ''),
      totalPlayers: num(r.total_players ?? ''),
      pctFinish: r.pct_finish ?? '',
      pctValue: num(r.pct_finish ?? ''),
      miniLeague: r.mini_league ?? '',
      miniLeagueRank: num(r.mini_league_rank ?? ''),
      miniLeagueSize: num(r.mini_league_size ?? ''),
      result: r.result ?? '',
      highlight: bool(r.highlight ?? ''),
      notes: r.notes ?? '',
    }))
    // Newest season first.
    .sort((a, b) => b.season.localeCompare(a.season));
}

/**
 * Private leagues with friends. This sheet is optional — if it isn't in the
 * workbook the site just renders without those sections rather than failing.
 */
export async function getMiniLeagues(): Promise<MiniLeague[]> {
  const workbook = await openWorkbook();
  if (!workbook.getWorksheet('private-mini-leagues')) return [];

  const rows = await readSheet(workbook, 'private-mini-leagues', 'league');
  return rows
    .filter((r) => r.league !== '')
    .map((r) => ({
      league: r.league.toLowerCase(),
      season: r.season ?? '',
      host: r.mini_league_host ?? '',
      format: r.mini_league_format ?? '',
      teamName: r.team_name ?? '',
      result: r.mini_league_result ?? '',
    }));
}

/** Groups a league's mini-leagues by season, newest first. */
export function miniLeaguesBySeason(rows: MiniLeague[]): { season: string; entries: MiniLeague[] }[] {
  const groups = new Map<string, MiniLeague[]>();
  for (const row of rows) {
    const existing = groups.get(row.season);
    if (existing) existing.push(row);
    else groups.set(row.season, [row]);
  }
  return [...groups]
    .map(([season, entries]) => ({ season, entries }))
    .sort((a, b) => b.season.localeCompare(a.season));
}

/**
 * "Top 6%". Prefers the `pct_finish` column you fill in by hand; falls back to
 * computing it from overall_rank / total_players if you record those instead.
 */
export function percentile(s: Season): string | null {
  if (s.pctFinish) {
    return s.pctFinish.includes('%') ? `Top ${s.pctFinish}` : `Top ${s.pctFinish}%`;
  }
  if (!s.overallRank || !s.totalPlayers) return null;
  const pct = (s.overallRank / s.totalPlayers) * 100;
  if (pct < 0.1) return 'Top 0.1%';
  return `Top ${pct < 1 ? pct.toFixed(1) : Math.ceil(pct)}%`;
}

/** The season you finished highest in, by percentile. Null if none are ranked. */
export function bestSeason(rows: Season[]): Season | null {
  const scored = rows
    .map((s) => ({
      s,
      pct:
        s.pctValue ??
        (s.overallRank && s.totalPlayers ? (s.overallRank / s.totalPlayers) * 100 : null),
    }))
    .filter((x): x is { s: Season; pct: number } => x.pct !== null);

  if (scored.length === 0) return null;
  return scored.reduce((a, b) => (b.pct < a.pct ? b : a)).s;
}

/** 1234567 -> "1,234,567" */
export function commas(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-GB');
}
