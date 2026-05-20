import type { Metadata } from "next";
import SpaRoot from "@/components/SpaRoot";
import ServerJsonLd from "@/components/ServerJsonLd";
import StaticCrawlShell from "@/components/StaticCrawlShell";
import { buildMetadataForPath } from "@/lib/pageMetadataServer";

export const metadata: Metadata = buildMetadataForPath("/");

/** Αρχική — React Router SPA shell + server SEO. */
export default function Home() {
  return (
    <>
      <ServerJsonLd path="/" />
      <StaticCrawlShell path="/" />
      <SpaRoot />
    </>
  );
}
