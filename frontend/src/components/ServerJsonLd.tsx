import { buildPageJsonLd } from "@/lib/jsonLdPage";

/** JSON-LD στο server HTML (ορατό σε crawlers χωρίς JS). */
export default function ServerJsonLd({ path }: { path: string }) {
  const data = buildPageJsonLd(path);
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {json}
    </script>
  );
}
