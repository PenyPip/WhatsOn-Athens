/** Ίδια ανάγνωση με το Strapi (`theaterSeason.js`): «2ος χρόνος» δεν είναι μέρος του τίτλου. */

const SEASON_PHRASE =
  "((?:\\d{1,2})\\s*(?:[οΟόΌ][ςΣ]|[ηήΗΉ])\\s*[χΧ]ρ[οόΟΌoO]\\s*ν(?:[οόΟΌoO][ςΣ]|[ιίΙΊ][αάΑΆ])(?:\\s+[πΠ]αραστ[αάΑΆ]σεων)?|(?:ΣΤ|Στ|στ|[ΑΒΓΔΕαβγδε])\\s*['΄´’]\\s*[χΧ]ρ[οόΟΌoO]\\s*ν(?:[οόΟΌoO][ςΣ]|[ιίΙΊ][αάΑΆ])(?:\\s+[πΠ]αραστ[αάΑΆ]σεων)?)";

const TRAILING = new RegExp(`(?:\\s*[-–—·•|,]\\s*|\\s+)\\(?\\s*${SEASON_PHRASE}\\s*\\)?\\s*$`, "u");
const LEADING = new RegExp(`^\\(?\\s*${SEASON_PHRASE}\\s*\\)?\\s*(?:[-–—·•|,]\\s*|\\s+)`, "u");
const PAREN = new RegExp(`\\(\\s*${SEASON_PHRASE}\\s*\\)`, "u");

const LETTER_YEAR: Record<string, number> = { Α: 1, Β: 2, Γ: 3, Δ: 4, Ε: 5, ΣΤ: 6 };

export function normalizeTheaterSeasonYear(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isInteger(n) || n < 2 || n > 30) return null;
  return n;
}

function seasonYearFromPhrase(phrase: string): number | null {
  const text = phrase.replace(/\s+/g, " ").trim();
  const num = text.match(/^(\d{1,2})/u);
  if (num) return normalizeTheaterSeasonYear(Number(num[1]));
  const letter = text.match(/^(ΣΤ|Στ|στ|[ΑΒΓΔΕαβγδε])/u);
  if (!letter) return null;
  const key = letter[1].toLocaleUpperCase("el").normalize("NFC");
  return normalizeTheaterSeasonYear(LETTER_YEAR[key] ?? null);
}

function cleanupTitle(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[-–—·•|,]+|[-–—·•|,]+$/g, "")
    .replace(/^\(+|\)+$/g, "")
    .trim();
}

export function splitTheaterSeasonTitle(raw: string | null | undefined): { title: string; seasonYear: number | null } {
  const title = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!title) return { title: "", seasonYear: null };

  for (const re of [TRAILING, LEADING, PAREN]) {
    const match = title.match(re);
    if (!match) continue;
    const seasonYear = seasonYearFromPhrase(match[1] ?? "");
    if (!seasonYear) continue;
    const next = cleanupTitle(title.replace(match[0], " "));
    if (next.length < 2) continue;
    return { title: next, seasonYear };
  }

  return { title, seasonYear: null };
}

/** Πάντα «2ος χρόνος», «3ος χρόνος» — ίδιο κείμενο σε κάθε επιφάνεια. */
export function formatTheaterSeasonYear(value: unknown): string {
  const year = normalizeTheaterSeasonYear(value);
  return year ? `${year}ος χρόνος` : "";
}

export function theaterShowTitleParts(show: { title?: string | null; seasonYear?: number | null }): {
  title: string;
  seasonYear: number | null;
  seasonLabel: string;
} {
  const peeled = splitTheaterSeasonTitle(show.title);
  const seasonYear = normalizeTheaterSeasonYear(show.seasonYear) ?? peeled.seasonYear;
  const title = peeled.title || String(show.title ?? "").trim();
  return { title, seasonYear, seasonLabel: formatTheaterSeasonYear(seasonYear) };
}
