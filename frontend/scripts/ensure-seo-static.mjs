/**
 * Μετά το next export: βεβαιώνεται ότι robots.txt και sitemap.xml υπάρχουν στο out/.
 */
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const OUT = join(ROOT, "out");
const REQUIRED = ["robots.txt", "sitemap.xml"];

for (const name of REQUIRED) {
  const outPath = join(OUT, name);
  const publicPath = join(PUBLIC, name);

  if (!existsSync(outPath) && existsSync(publicPath)) {
    copyFileSync(publicPath, outPath);
    console.log(`[ensure-seo-static] copied public/${name} → out/${name}`);
  }

  if (!existsSync(outPath)) {
    console.error(`[ensure-seo-static] FAIL — missing out/${name} (τρέξε generate-sitemap πριν το build)`);
    process.exit(1);
  }
}

const robots = readFileSync(join(OUT, "robots.txt"), "utf8");
if (!/User-agent:/i.test(robots)) {
  console.error("[ensure-seo-static] FAIL — invalid robots.txt");
  process.exit(1);
}
if (!/Sitemap:\s*https?:\/\//i.test(robots)) {
  console.error("[ensure-seo-static] FAIL — robots.txt χωρίς Sitemap URL");
  process.exit(1);
}

const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
if (!/<urlset[\s>]/i.test(sitemap)) {
  console.error("[ensure-seo-static] FAIL — invalid sitemap.xml");
  process.exit(1);
}

console.log("[ensure-seo-static] OK — robots.txt + sitemap.xml στο out/");
