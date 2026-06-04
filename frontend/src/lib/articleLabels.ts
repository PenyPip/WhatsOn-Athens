export const articleTypeLabels: Record<string, string> = {
  kritiki_parastasis: "Κριτική θεάτρου",
  kritiki_tainias: "Κριτική ταινίας",
  sigkrisi: "Σύγκριση",
  giati_na_deis: "Γιατί να δεις",
  politistiko_keimeno: "Πολιτιστικό",
};

export function formatArticleDate(value: string): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "Χωρίς ημερομηνία";
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
}

/** Για editorial header (π.χ. «3 ΙΟΥΝΙΟΥ 2026»). */
export function formatArticleDateUppercase(value: string): string {
  return formatArticleDate(value).toLocaleUpperCase("el-GR");
}

export function articleTypeLabelUppercase(articleType: string): string {
  return (articleTypeLabels[articleType] ?? "Άρθρο").toLocaleUpperCase("el-GR");
}

/** Εκτίμηση χρόνου ανάγνωσης από HTML ή κείμενο. */
export function estimateReadingMinutes(raw: string): number {
  const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 200));
}
