import type { Gender, PersonNode } from "@/lib/shajara";

const ymd = (d: string) => d.replace(/-/g, "");

/** Days until the next birthday (0 = today); null when no valid date. */
export function daysUntilBirthday(birthDate: string, today = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(base.getFullYear(), +m[2] - 1, +m[3]);
  if (next < base) next = new Date(base.getFullYear() + 1, +m[2] - 1, +m[3]);
  return Math.round((next.getTime() - base.getTime()) / 86400000);
}

function nextDay(d: string) {
  const [y, mo, da] = d.split("-").map(Number);
  const n = new Date(Date.UTC(y, mo - 1, da + 1));
  return n.toISOString().slice(0, 10);
}

/** Yearly recurring all-day birthday events for living people. */
export function buildBirthdayIcs(nodes: PersonNode[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Shajara//Birthdays//EN"];
  for (const n of nodes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.birthDate) || n.deathDate) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${n.id}@shajara`,
      `DTSTART;VALUE=DATE:${ymd(n.birthDate)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(n.birthDate))}`,
      "RRULE:FREQ=YEARLY",
      `SUMMARY:🎂 ${n.fullName.replace(/[,;\\]/g, " ")}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function googleCalendarUrl(n: PersonNode): string {
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `🎂 ${n.fullName}`,
    dates: `${ymd(n.birthDate)}/${ymd(nextDay(n.birthDate))}`,
    recur: "RRULE:FREQ=YEARLY",
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

/** Minimal CSV parser supporting quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export interface ImportRow {
  fullName: string;
  gender: Gender;
  birthDate: string;
  deathDate?: string;
  parentName?: string;
  spouseName?: string;
}

export const CSV_TEMPLATE =
  "Full Name,Gender,Birth Date,Death Date,Parent Name,Spouse Name\nOlim Karimov,male,1970-02-14,,,Nodira Karimova\nNodira Karimova,female,1973-08-30,,,\nSardor Karimov,male,2000-05-01,,Olim Karimov,\n";

export function rowsToPeople(rows: string[][]): ImportRow[] {
  if (!rows.length) return [];
  const h = rows[0].map((x) => x.trim().toLowerCase());
  const col = (...names: string[]) => h.findIndex((x) => names.some((n) => x.includes(n)));
  const iName = col("name", "ism", "имя");
  const iGender = col("gender", "jins", "пол");
  const iBirth = col("birth", "tug", "рожд");
  const iDeath = col("death", "vafot", "смерт");
  const iParent = col("parent", "ota", "родит");
  const iSpouse = col("spouse", "turmush", "супруг");
  if (iName < 0) return [];
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  return rows.slice(1).flatMap((r) => {
    const fullName = get(r, iName);
    if (!fullName) return [];
    const g = get(r, iGender).toLowerCase();
    return [{
      fullName,
      gender: /^(f|female|ayol|ж|жен)/.test(g) ? "female" : "male",
      birthDate: get(r, iBirth),
      deathDate: get(r, iDeath) || undefined,
      parentName: get(r, iParent) || undefined,
      spouseName: get(r, iSpouse) || undefined,
    } satisfies ImportRow];
  });
}

/** Converts a Google Sheets share link to its CSV export URL. */
export function sheetCsvUrl(link: string): string | null {
  const m = /docs\.google\.com\/spreadsheets\/d\/([\w-]+)/.exec(link);
  if (!m) return null;
  const gid = /gid=(\d+)/.exec(link)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}
