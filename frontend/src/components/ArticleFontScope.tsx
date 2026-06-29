import { literata } from "@/lib/articleFont";

/** Φόρτωση Literata μόνο σε routes άρθρων. */
export default function ArticleFontScope({ children }: { children: React.ReactNode }) {
  return <div className={literata.variable}>{children}</div>;
}
