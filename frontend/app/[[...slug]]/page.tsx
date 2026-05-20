import SpaRoot from "@/components/SpaRoot";
import spaPaths from "@/generated/spa-static-paths.json";

type SpaPathParams = { slug: string[] };

/**
 * Catch-all για React Router: κάθε path σερβίρει το SPA shell (static export).
 * Τα paths ανανεώνονται στο `npm run build` μέσω scripts/generate-sitemap.mjs.
 */
export function generateStaticParams(): SpaPathParams[] {
  return spaPaths as SpaPathParams[];
}

export default function SpaCatchAllPage() {
  return <SpaRoot />;
}
