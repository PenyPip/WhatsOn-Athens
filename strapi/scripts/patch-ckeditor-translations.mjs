/**
 * Διόρθωση dynamic import για ckeditor5 v43+ (translations path).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(
  __dirname,
  "../node_modules/@_sh/strapi-plugin-ckeditor/admin/src/Input/config/language.js",
);

if (!fs.existsSync(target)) {
  console.warn("[patch-ckeditor] Skip: plugin file not found");
  process.exit(0);
}

const before = fs.readFileSync(target, "utf8");
const after = before.replaceAll(
  "ckeditor5/translations/${language}.js",
  "ckeditor5/dist/translations/${language}.js",
);

if (before === after) {
  console.log("[patch-ckeditor] Already patched");
} else {
  fs.writeFileSync(target, after);
  console.log("[patch-ckeditor] Patched translation import path");
}
